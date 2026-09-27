"""
VIRALCLIP STUDIO — TRANSCRIPTION WORKER PROTOCOL
Structured IPC message schemas for Node <-> Python transcription worker.
All communication over stdin/stdout is newline-delimited JSON.
"""

from typing import Dict, Any, Optional, List
import json
import time

# Incoming command types (Node -> Python Worker)
CMD_INIT = "init"
CMD_TRANSCRIBE = "transcribe"
CMD_CANCEL = "cancel"
CMD_PING = "ping"
CMD_HEALTH = "health"
CMD_UNLOAD = "unload"

# Outgoing event types (Python Worker -> Node)
EVENT_HEARTBEAT = "heartbeat"
EVENT_PROGRESS = "progress"
EVENT_CHUNK = "chunk"
EVENT_STATUS = "status"
EVENT_COMPLETE = "complete"
EVENT_ERROR = "error"

def create_heartbeat(
    job_id: str,
    stage: str,
    progress: float,
    audio_processed: float,
    audio_total: float,
    elapsed: float,
    eta: float,
    words: int,
    segments: int,
    realtime_factor: float,
    backend: str,
    device: str,
    accelerated: bool,
    pid: int,
    memory_mb: float = 0.0,
) -> Dict[str, Any]:
    return {
        "type": EVENT_HEARTBEAT,
        "jobId": job_id,
        "stage": stage,
        "progress": round(progress, 2),
        "audioProcessed": round(audio_processed, 2),
        "audioTotal": round(audio_total, 2),
        "elapsed": round(elapsed, 1),
        "eta": round(max(0.0, eta), 1),
        "words": words,
        "segments": segments,
        "realtimeFactor": round(realtime_factor, 2),
        "backend": backend,
        "device": device,
        "accelerated": accelerated,
        "pid": pid,
        "memoryMb": round(memory_mb, 1),
        "workerAlive": True,
        "timestamp": int(time.time() * 1000),
    }

def create_progress(
    job_id: str,
    stage: str,
    audio_processed: float,
    audio_total: float,
    progress: float,
    words: int,
    segments: int,
    elapsed: float,
    eta: float,
    realtime_factor: float,
    chunk_index: Optional[int] = None,
    chunk_total: Optional[int] = None,
    chunk_start: Optional[float] = None,
    chunk_end: Optional[float] = None,
    message: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "type": EVENT_PROGRESS,
        "jobId": job_id,
        "stage": stage,
        "audioProcessed": round(audio_processed, 2),
        "audioTotal": round(audio_total, 2),
        "progress": round(progress, 2),
        "words": words,
        "segments": segments,
        "elapsed": round(elapsed, 1),
        "eta": round(max(0.0, eta), 1),
        "realtimeFactor": round(realtime_factor, 2),
        "chunkIndex": chunk_index,
        "chunkTotal": chunk_total,
        "chunkStart": round(chunk_start, 2) if chunk_start is not None else None,
        "chunkEnd": round(chunk_end, 2) if chunk_end is not None else None,
        "message": message or f"Transcribed {round(audio_processed, 1)}s of {round(audio_total, 1)}s",
        "timestamp": int(time.time() * 1000),
    }

def create_complete(
    job_id: str,
    transcript: Dict[str, Any],
    backend: str,
    device: str,
    model: str,
    duration: float,
    elapsed: float,
    realtime_factor: float,
    word_count: int,
    segment_count: int,
    detected_language: str,
    language_confidence: float = 0.95,
) -> Dict[str, Any]:
    return {
        "type": EVENT_COMPLETE,
        "jobId": job_id,
        "status": "completed",
        "transcript": transcript,
        "backend": backend,
        "device": device,
        "model": model,
        "duration": round(duration, 2),
        "elapsed": round(elapsed, 2),
        "realtimeFactor": round(realtime_factor, 2),
        "wordCount": word_count,
        "segmentCount": segment_count,
        "detectedLanguage": detected_language,
        "languageConfidence": language_confidence,
        "timestamp": int(time.time() * 1000),
    }

def create_error(
    job_id: Optional[str],
    code: str,
    message: str,
    recoverable: bool = True,
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    return {
        "type": EVENT_ERROR,
        "jobId": job_id or "",
        "status": "failed",
        "code": code,
        "message": message,
        "recoverable": recoverable,
        "details": details or {},
        "timestamp": int(time.time() * 1000),
    }

def create_status(
    status: str,
    backend: str,
    device: str,
    accelerated: bool,
    model: Optional[str] = None,
    pid: Optional[int] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    res = {
        "type": EVENT_STATUS,
        "status": status,
        "backend": backend,
        "device": device,
        "accelerated": accelerated,
        "model": model or "none",
        "pid": pid,
        "timestamp": int(time.time() * 1000),
    }
    if extra:
        res.update(extra)
    return res

def parse_line(line: str) -> Optional[Dict[str, Any]]:
    line = line.strip()
    if not line:
        return None
    try:
        return json.loads(line)
    except Exception:
        return None

def format_message(msg: Dict[str, Any]) -> str:
    return json.dumps(msg, ensure_ascii=False)
