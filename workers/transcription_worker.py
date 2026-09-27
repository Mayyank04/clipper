"""
VIRALCLIP STUDIO — DEDICATED PYTHON TRANSCRIPTION WORKER
Standalone daemon process communicating structured JSON lines over stdin/stdout.
Handles heartbeats (1s), cancellation, health checks, and progressive transcription.
"""

import sys
import os
import time
import json
import signal
import threading
from typing import Optional, Dict, Any

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from workers.job_protocol import (
    CMD_INIT,
    CMD_TRANSCRIBE,
    CMD_CANCEL,
    CMD_PING,
    CMD_HEALTH,
    CMD_UNLOAD,
    EVENT_HEARTBEAT,
    EVENT_PROGRESS,
    EVENT_COMPLETE,
    EVENT_ERROR,
    EVENT_STATUS,
    create_heartbeat,
    create_error,
    create_complete,
    create_status,
    parse_line,
    format_message,
)
from workers.worker_health import get_worker_health, get_process_memory_mb
from workers.transcription_engine import (
    WhisperModelManager,
    extract_and_cache_audio,
    transcribe_audio_adaptive,
)

# Global worker state
active_job_id: Optional[str] = None
active_job_lock = threading.Lock()
cancel_event = threading.Event()
heartbeat_thread: Optional[threading.Thread] = None
is_running = True
last_progress_info: Dict[str, Any] = {}

def send_msg(msg: Dict[str, Any]) -> None:
    """Thread-safe, unbuffered emission of structured JSON line to stdout."""
    line = format_message(msg)
    sys.stdout.write(line + "\n")
    sys.stdout.flush()

def heartbeat_loop():
    """Background ticker emitting heartbeats every 1.0 second while active."""
    global is_running, active_job_id, last_progress_info
    while is_running:
        time.sleep(1.0)
        with active_job_lock:
            jid = active_job_id
            info = dict(last_progress_info)

        if jid:
            manager = WhisperModelManager.get_instance()
            elapsed = time.time() - info.get("startTime", time.time())
            audio_processed = info.get("audioProcessed", 0.0)
            audio_total = info.get("audioTotal", 1.0)
            rt_factor = (audio_processed / elapsed) if elapsed > 0 else 1.0
            rem = max(0.0, audio_total - audio_processed)
            eta = (rem / rt_factor) if rt_factor > 0 else 0.0
            progress_pct = min(100.0, (audio_processed / max(1.0, audio_total)) * 100.0)

            hb = create_heartbeat(
                job_id=jid,
                stage=info.get("stage", "transcription"),
                progress=progress_pct,
                audio_processed=audio_processed,
                audio_total=audio_total,
                elapsed=elapsed,
                eta=eta,
                words=info.get("words", 0),
                segments=info.get("segments", 0),
                realtime_factor=rt_factor,
                backend=manager.backend_name,
                device=manager.device,
                accelerated=manager.is_accelerated,
                pid=os.getpid(),
                memory_mb=get_process_memory_mb(),
            )
            send_msg(hb)

def handle_transcribe(cmd: Dict[str, Any]):
    global active_job_id, cancel_event, last_progress_info

    job_id = cmd.get("jobId") or f"job_{int(time.time())}"
    source_media_path = cmd.get("sourceMediaPath") or cmd.get("audioPath")
    source_media_id = cmd.get("sourceMediaId")
    duration = float(cmd.get("duration") or 0.0)
    language = cmd.get("language") or "auto"
    model_size = cmd.get("model") or "base"

    if not source_media_path or not os.path.exists(source_media_path):
        send_msg(create_error(job_id, "NO_AUDIO", f"Source media file not found: {source_media_path}"))
        return

    with active_job_lock:
        active_job_id = job_id
        cancel_event.clear()
        last_progress_info = {
            "stage": "extracting_audio",
            "startTime": time.time(),
            "audioProcessed": 0.0,
            "audioTotal": duration or 1.0,
            "words": 0,
            "segments": 0,
        }

    try:
        t0 = time.time()
        # 1. Audio Extraction & Caching
        send_msg({
            "type": EVENT_PROGRESS,
            "jobId": job_id,
            "stage": "extracting_audio",
            "progress": 5.0,
            "message": "Extracting 16kHz mono audio...",
            "timestamp": int(time.time() * 1000)
        })

        wav_path, measured_dur = extract_and_cache_audio(
            source_path=source_media_path,
            media_id=source_media_id,
            clip_start=float(cmd.get("clipStart", 0.0)),
            clip_duration=float(cmd.get("duration", 0.0)) if cmd.get("duration") else None
        )
        total_duration = measured_dur if measured_dur > 0 else (duration if duration > 0 else 30.0)

        with active_job_lock:
            last_progress_info["audioTotal"] = total_duration
            last_progress_info["stage"] = "transcription"

        send_msg({
            "type": EVENT_PROGRESS,
            "jobId": job_id,
            "stage": "transcription",
            "progress": 10.0,
            "audioTotal": round(total_duration, 2),
            "message": f"Audio extracted ({round(total_duration, 1)}s). Initializing Whisper model...",
            "timestamp": int(time.time() * 1000)
        })

        # 2. Transcription with progressive callbacks
        def on_prog(progress_dict: Dict[str, Any]):
            with active_job_lock:
                last_progress_info["audioProcessed"] = progress_dict.get("audioProcessed", 0.0)
                last_progress_info["words"] = progress_dict.get("words", 0)
                last_progress_info["segments"] = progress_dict.get("segments", 0)
            send_msg(progress_dict)

        transcript_result = transcribe_audio_adaptive(
            audio_path=wav_path,
            total_duration=total_duration,
            job_id=job_id,
            language=language,
            model_size=model_size,
            on_progress=on_prog,
            cancel_event=cancel_event,
        )

        total_elapsed = time.time() - t0
        rt_factor = (total_duration / total_elapsed) if total_elapsed > 0 else 1.0

        complete_event = create_complete(
            job_id=job_id,
            transcript=transcript_result,
            backend=transcript_result.get("backend", "unknown"),
            device=transcript_result.get("device", "unknown"),
            model=transcript_result.get("model", model_size),
            duration=total_duration,
            elapsed=total_elapsed,
            realtime_factor=rt_factor,
            word_count=len(transcript_result.get("words", [])),
            segment_count=len(transcript_result.get("segments", [])),
            detected_language=transcript_result.get("language", "en"),
            language_confidence=float(transcript_result.get("languageConfidence", 0.95)),
        )
        send_msg(complete_event)

    except InterruptedError:
        send_msg(create_error(job_id, "CANCELLED", "Transcription cancelled by user", recoverable=False))
    except Exception as e:
        send_msg(create_error(job_id, "TRANSCRIPTION_FAILED", str(e), details={"type": type(e).__name__}))
    finally:
        with active_job_lock:
            active_job_id = None

def main():
    global is_running, cancel_event, heartbeat_thread

    def sig_handler(signum, frame):
        global is_running
        is_running = False
        cancel_event.set()
        sys.exit(0)

    signal.signal(signal.SIGINT, sig_handler)
    signal.signal(signal.SIGTERM, sig_handler)

    # Start background heartbeat daemon
    heartbeat_thread = threading.Thread(target=heartbeat_loop, daemon=True)
    heartbeat_thread.start()

    # Announce worker ready
    manager = WhisperModelManager.get_instance()
    send_msg(create_status(
        status="ready",
        backend=manager.backend_name,
        device=manager.device,
        accelerated=manager.is_accelerated,
        pid=os.getpid(),
    ))

    # Read stdin JSON commands
    for line in sys.stdin:
        if not line:
            break
        cmd = parse_line(line)
        if not cmd:
            continue

        cmd_type = cmd.get("type")

        if cmd_type == CMD_PING:
            send_msg({"type": "pong", "pid": os.getpid(), "timestamp": int(time.time() * 1000)})
        elif cmd_type == CMD_HEALTH:
            send_msg(get_worker_health())
        elif cmd_type == CMD_INIT:
            model_size = cmd.get("model", "base")
            manager.load_model(model_size)
            send_msg(create_status(
                status="ready",
                backend=manager.backend_name,
                device=manager.device,
                accelerated=manager.is_accelerated,
                model=manager.loaded_model_name,
                pid=os.getpid(),
            ))
        elif cmd_type == CMD_TRANSCRIBE:
            # Process transcription (runs in thread or synchronously in this process)
            threading.Thread(target=handle_transcribe, args=(cmd,), daemon=True).start()
        elif cmd_type == CMD_CANCEL:
            target_job = cmd.get("jobId")
            with active_job_lock:
                if not target_job or target_job == active_job_id:
                    cancel_event.set()
            send_msg({"type": "cancelled", "jobId": target_job, "timestamp": int(time.time() * 1000)})
        elif cmd_type == CMD_UNLOAD:
            manager.unload()
            send_msg(create_status(
                status="idle",
                backend=manager.backend_name,
                device=manager.device,
                accelerated=manager.is_accelerated,
                pid=os.getpid(),
            ))

if __name__ == "__main__":
    main()
