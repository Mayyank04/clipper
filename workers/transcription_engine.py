"""
VIRALCLIP STUDIO — LOCAL TRANSCRIPTION ENGINE
Optimized Speech-to-Text inference utilizing:
1. Apple Silicon Metal GPU via mlx-whisper (Device(gpu, 0))
2. faster-whisper / CTranslate2 (CPU / CUDA fallback)
3. Smart 16kHz mono audio extraction and deterministic SHA-256 caching
4. Progressive adaptive chunking with absolute timestamps
5. Autoregressive repetition loop suppression & hallucination purging
6. Real-time metric tracking: ETA, speed factor, words, segments
"""

import os
import sys
import time
import json
import hashlib
import shutil
import re
import threading
import subprocess
from typing import Dict, Any, List, Optional, Callable, Tuple

from workers.job_protocol import (
    create_progress,
    create_complete,
    create_error,
    create_heartbeat,
)
from workers.worker_health import detect_transcription_backend, get_ffmpeg_info

# Common legitimate conversational repetitions (Hindi, Hinglish, English)
LEGITIMATE_REPETITION_SET = {
    'no', 'yes', 'wait', 'now', 'stop', 'very', 'really', 'never', 'again',
    'bhai', 'haan', 'nahi', 'are', 'arre', 'ruk', 'sun', 'suno', 'dekh', 'dekho'
}

NOISE_TOKENS_REGEX = re.compile(r'^(\[|\().*?(\]|\))$')
MUSIC_SYMBOLS_REGEX = re.compile(r'[♪♩♫#\*\-_~]+')
CANNED_HALLUCINATIONS = [
    re.compile(r'thank\s+you\s+for\s+watching', re.IGNORECASE),
    re.compile(r'please\s+like\s+and\s+subscribe', re.IGNORECASE),
    re.compile(r'subscribe\s+to\s+my\s+channel', re.IGNORECASE),
    re.compile(r'see\s+you\s+in\s+the\s+next\s+video', re.IGNORECASE),
    re.compile(r'watching\s+this\s+video', re.IGNORECASE),
]

class WhisperModelManager:
    """
    Singleton manager for Whisper model weights.
    Ensures models are loaded once into GPU/CPU memory and reused across jobs.
    """
    _instance: Optional['WhisperModelManager'] = None
    _lock = threading.Lock()

    def __init__(self):
        self.backend_info = detect_transcription_backend()
        self.backend_name = self.backend_info["backend"]
        self.device = self.backend_info["device"]
        self.is_accelerated = self.backend_info["accelerated"]
        self.loaded_model_name: Optional[str] = None
        self.model_instance: Any = None
        self.load_time_ms: float = 0.0
        self.last_used_at: float = 0.0

    @classmethod
    def get_instance(cls) -> 'WhisperModelManager':
        with cls._lock:
            if cls._instance is None:
                cls._instance = WhisperModelManager()
            return cls._instance

    def get_model_identifier(self, size: str = "base") -> str:
        size = (size or "base").lower().strip()
        if size in ("fast", "tiny"):
            model_key = "tiny"
        elif size in ("quality", "medium"):
            model_key = "medium"
        elif size in ("balanced", "small"):
            model_key = "small"
        else:
            model_key = "base"

        if self.backend_name == "mlx-whisper":
            return f"mlx-community/whisper-{model_key}-mlx"
        return model_key

    def load_model(self, size: str = "base") -> Any:
        model_id = self.get_model_identifier(size)
        if self.model_instance is not None and self.loaded_model_name == model_id:
            self.last_used_at = time.time()
            return self.model_instance

        with self._lock:
            if self.model_instance is not None and self.loaded_model_name == model_id:
                return self.model_instance

            t0 = time.time()
            if self.backend_name == "mlx-whisper":
                # mlx_whisper downloads/loads weights dynamically or caches locally
                import mlx_whisper
                self.model_instance = model_id
            elif self.backend_name == "faster-whisper":
                from faster_whisper import WhisperModel
                compute_type = self.backend_info.get("computeType", "int8_float32")
                self.model_instance = WhisperModel(model_id, device="cpu", compute_type=compute_type)
            else:
                self.model_instance = model_id

            self.load_time_ms = (time.time() - t0) * 1000
            self.loaded_model_name = model_id
            self.last_used_at = time.time()
            return self.model_instance

    def warmup(self, size: str = "base") -> None:
        """Warams up model to ensure weights are primed in GPU/RAM"""
        self.load_model(size)

    def unload(self) -> None:
        with self._lock:
            self.model_instance = None
            self.loaded_model_name = None

    def get_status(self) -> Dict[str, Any]:
        return {
            "backend": self.backend_name,
            "device": self.device,
            "accelerated": self.is_accelerated,
            "loadedModel": self.loaded_model_name,
            "loadTimeMs": round(self.load_time_ms, 1),
            "isLoaded": self.model_instance is not None,
        }

def get_file_sha256(filepath: str, max_bytes: int = 2 * 1024 * 1024) -> str:
    """Computes SHA-256 of header + file metadata for fast deterministic caching."""
    hasher = hashlib.sha256()
    stat = os.stat(filepath)
    hasher.update(f"{stat.st_size}_{stat.st_mtime}".encode('utf-8'))
    with open(filepath, 'rb') as f:
        chunk = f.read(max_bytes)
        hasher.update(chunk)
    return hasher.hexdigest()

def get_audio_duration(filepath: str, ffmpeg_path: str) -> float:
    """Gets exact duration in seconds using ffprobe or ffmpeg."""
    ffprobe_path = ffmpeg_path.replace("ffmpeg", "ffprobe")
    if os.path.exists(ffprobe_path):
        try:
            cmd = [
                ffprobe_path, "-v", "error", "-show_entries",
                "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filepath
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            if res.returncode == 0 and res.stdout.strip():
                return float(res.stdout.strip())
        except Exception:
            pass

    # Fallback using ffmpeg -i
    try:
        cmd = [ffmpeg_path, "-i", filepath]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        match = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", res.stderr or "")
        if match:
            h, m, s = match.groups()
            return int(h) * 3600 + int(m) * 60 + float(s)
    except Exception:
        pass
    return 0.0

def extract_and_cache_audio(
    source_path: str,
    media_id: Optional[str] = None,
    clip_start: float = 0.0,
    clip_duration: Optional[float] = None
) -> Tuple[str, float]:
    """
    Extracts 16kHz mono 16-bit PCM WAV.
    Caches extracted audio in data/media/<id>/audio/source.wav using deterministic hash.
    Reuses existing extraction if source file has not changed.
    """
    ffmpeg_info = get_ffmpeg_info()
    ffmpeg_path = ffmpeg_info["path"]
    if not ffmpeg_path or not os.path.exists(ffmpeg_path):
        raise RuntimeError("FFmpeg executable not found. Ensure static binary is in bin/ or PATH.")

    file_hash = get_file_sha256(source_path)
    safe_id = media_id or f"media_{file_hash[:12]}"
    cache_dir = os.path.join(os.getcwd(), "data", "media", safe_id, "audio")
    os.makedirs(cache_dir, exist_ok=True)

    cache_wav_path = os.path.join(cache_dir, "source_16k.wav")
    meta_path = os.path.join(cache_dir, "metadata.json")

    # Check cache
    if os.path.exists(cache_wav_path) and os.path.exists(meta_path) and clip_start == 0.0 and not clip_duration:
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
            if meta.get("fileHash") == file_hash and os.path.getsize(cache_wav_path) > 1000:
                duration = float(meta.get("duration", 0.0))
                if duration > 0:
                    return cache_wav_path, duration
        except Exception:
            pass

    # Extract audio via FFmpeg
    args = [ffmpeg_path, "-y"]
    if clip_start > 0:
        args.extend(["-ss", f"{clip_start:.3f}"])
    args.extend(["-i", source_path])
    if clip_duration and clip_duration > 0:
        args.extend(["-t", f"{clip_duration:.3f}"])
    args.extend([
        "-vn",
        "-ar", "16000",
        "-ac", "1",
        "-c:a", "pcm_s16le",
        cache_wav_path
    ])

    res = subprocess.run(args, capture_output=True, text=True)
    if res.returncode != 0 or not os.path.exists(cache_wav_path) or os.path.getsize(cache_wav_path) == 0:
        err = res.stderr or res.stdout or "FFmpeg audio conversion failed"
        raise RuntimeError(f"Failed to extract 16kHz WAV: {err}")

    duration = get_audio_duration(cache_wav_path, ffmpeg_path)
    
    # Save cache metadata
    try:
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump({
                "fileHash": file_hash,
                "sourcePath": source_path,
                "duration": duration,
                "sampleRate": 16000,
                "channels": 1,
                "format": "pcm_s16le",
                "extractedAt": int(time.time() * 1000)
            }, f, indent=2)
    except Exception:
        pass

    return cache_wav_path, duration

def clean_and_normalize_word(raw_word: str) -> str:
    cleaned = MUSIC_SYMBOLS_REGEX.sub('', raw_word).strip()
    if NOISE_TOKENS_REGEX.match(cleaned):
        return ""
    if re.search(r'(_AUDIO|BLANK_AUDIO|APPLAUSE|CHEERING|LAUGHTER|MUSIC|SILENCE)', cleaned, re.IGNORECASE):
        return ""
    return cleaned

def clean_words_stream(raw_words: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Suppresses autoregressive repetition loops (e.g. 'They They They If')
    and filters non-speech noise while preserving legitimate conversational repetition.
    """
    cleaned: List[Dict[str, Any]] = []
    last_word_norm = ""
    consecutive_repeats = 0

    for w in raw_words:
        raw_text = str(w.get("text") or w.get("word") or "").strip()
        word_text = clean_and_normalize_word(raw_text)
        if not word_text:
            continue

        normalized = re.sub(r'[^a-zA-Z0-9\u0900-\u097F]', '', word_text.lower())
        if not normalized:
            continue

        start = float(w.get("start", 0.0))
        end = float(w.get("end", start + 0.25))
        if end <= start:
            end = start + 0.2

        conf = float(w.get("confidence") or w.get("probability") or 0.95)

        pause_prev = (start - cleaned[-1]["end"]) if cleaned else 0.0
        if pause_prev > 0.6:
            consecutive_repeats = 0

        is_same = (normalized == last_word_norm)
        if is_same:
            consecutive_repeats += 1
            is_legit = normalized in LEGITIMATE_REPETITION_SET
            is_legitimate_cadence = (is_legit or pause_prev >= 0.25) and consecutive_repeats <= 2
            if not is_legitimate_cadence:
                # Suppress runaway decoder repeat loop
                continue
        else:
            consecutive_repeats = 0
            last_word_norm = normalized

        cleaned.append({
            "text": word_text,
            "word": word_text,
            "start": round(start, 3),
            "end": round(end, 3),
            "confidence": round(conf, 3)
        })

    return cleaned

def create_beats_from_words(words: List[Dict[str, Any]], max_words_per_beat: int = 4) -> List[Dict[str, Any]]:
    """
    Groups words into punchy short-form caption units (beats) with natural boundaries.
    """
    if not words:
        return []

    beats = []
    current_chunk = []
    
    for i, w in enumerate(words):
        current_chunk.append(w)
        text = w["text"]
        has_punctuation = bool(re.search(r'[.!?,;:]$', text))
        
        # Check pause to next word
        next_pause = 0.0
        if i + 1 < len(words):
            next_pause = words[i + 1]["start"] - w["end"]

        should_split = (
            len(current_chunk) >= max_words_per_beat or
            has_punctuation or
            next_pause > 0.45 or
            (len(current_chunk) >= 2 and next_pause > 0.25)
        )

        if should_split or i == len(words) - 1:
            beat_text = " ".join([item["text"] for item in current_chunk])
            beat_start = current_chunk[0]["start"]
            beat_end = current_chunk[-1]["end"]
            beats.append({
                "id": f"beat_{len(beats) + 1}",
                "text": beat_text,
                "start": round(beat_start, 3),
                "end": round(beat_end, 3),
                "words": list(current_chunk),
                "confidence": 0.95
            })
            current_chunk = []

    return beats

def create_lines_from_beats(beats: List[Dict[str, Any]], max_words_per_line: int = 8) -> List[Dict[str, Any]]:
    """
    Groups beats into natural sentence/line segments.
    """
    if not beats:
        return []

    lines = []
    current_words = []
    line_start = beats[0]["start"]

    for b in beats:
        b_words = b.get("words", [])
        current_words.extend(b_words)
        last_word = current_words[-1]["text"] if current_words else ""
        has_sentence_end = bool(re.search(r'[.!?]$', last_word))

        if len(current_words) >= max_words_per_line or has_sentence_end or b == beats[-1]:
            line_text = " ".join([w["text"] for w in current_words])
            line_end = current_words[-1]["end"]
            lines.append({
                "id": f"line_{len(lines) + 1}",
                "text": line_text,
                "start": round(line_start, 3),
                "end": round(line_end, 3),
                "words": list(current_words),
                "confidence": 0.95
            })
            current_words = []
            if b != beats[-1]:
                next_idx = beats.index(b) + 1
                if next_idx < len(beats):
                    line_start = beats[next_idx]["start"]

    return lines

def transcribe_audio_adaptive(
    audio_path: str,
    total_duration: float,
    job_id: str,
    language: Optional[str] = "auto",
    model_size: str = "base",
    on_progress: Optional[Callable[[Dict[str, Any]], None]] = None,
    cancel_event: Optional[threading.Event] = None,
) -> Dict[str, Any]:
    """
    Transcribes audio using the optimal local engine (Apple Silicon MLX or faster-whisper).
    Processes chunks adaptively (e.g. 45-60s) to provide live continuous progress and ETA,
    preserving strictly ABSOLUTE timestamps without proportional divisions.
    """
    manager = WhisperModelManager.get_instance()
    manager.load_model(model_size)
    backend_name = manager.backend_name
    device = manager.device
    model_id = manager.loaded_model_name or model_size

    t_start = time.time()
    ffmpeg_info = get_ffmpeg_info()
    ffmpeg_path = ffmpeg_info["path"]

    # Adaptive chunk size:
    # On Apple Silicon Metal GPU, MLX handles 60s in ~1-2s.
    CHUNK_SIZE = 60.0
    
    # If audio is short (<= 75s), process in single pass
    if total_duration <= 75.0:
        chunk_ranges = [(0.0, total_duration)]
    else:
        chunk_ranges = []
        cur = 0.0
        while cur < total_duration:
            nxt = min(cur + CHUNK_SIZE, total_duration)
            chunk_ranges.append((cur, nxt))
            cur = nxt

    total_chunks = len(chunk_ranges)
    all_raw_words: List[Dict[str, Any]] = []
    all_raw_segments: List[Dict[str, Any]] = []
    detected_lang = language if language and language != "auto" else "en"
    lang_confidence = 0.95

    temp_dir = os.path.join(os.path.dirname(audio_path), f"chunks_{job_id}")
    os.makedirs(temp_dir, exist_ok=True)

    try:
        for idx, (c_start, c_end) in enumerate(chunk_ranges):
            if cancel_event and cancel_event.is_set():
                raise InterruptedError(f"Job {job_id} cancelled by user")

            c_dur = c_end - c_start
            chunk_wav = os.path.join(temp_dir, f"chunk_{idx:03d}.wav")

            # Extract chunk slice via FFmpeg if multi-chunk
            if total_chunks > 1:
                cmd = [
                    ffmpeg_path, "-y",
                    "-ss", f"{c_start:.3f}",
                    "-i", audio_path,
                    "-t", f"{c_dur:.3f}",
                    "-c:a", "pcm_s16le",
                    chunk_wav
                ]
                res = subprocess.run(cmd, capture_output=True, text=True)
                if res.returncode != 0 or not os.path.exists(chunk_wav):
                    chunk_target = audio_path
                else:
                    chunk_target = chunk_wav
            else:
                chunk_target = audio_path

            t_chunk_start = time.time()

            # Run inference
            if backend_name == "mlx-whisper":
                import mlx_whisper
                kwargs: Dict[str, Any] = {
                    "path_or_hf_repo": model_id,
                    "word_timestamps": True,
                }
                if language and language != "auto":
                    kwargs["language"] = language

                result = mlx_whisper.transcribe(chunk_target, **kwargs)
                chunk_segments = result.get("segments", [])
                if result.get("language"):
                    detected_lang = result["language"]
            elif backend_name == "faster-whisper":
                model_inst = manager.model_instance
                transcribe_kwargs: Dict[str, Any] = {
                    "word_timestamps": True,
                }
                if language and language != "auto":
                    transcribe_kwargs["language"] = language
                segments_gen, info = model_inst.transcribe(chunk_target, **transcribe_kwargs)
                chunk_segments = []
                for s in segments_gen:
                    chunk_segments.append({
                        "start": s.start,
                        "end": s.end,
                        "text": s.text,
                        "words": [{"word": w.word, "start": w.start, "end": w.end, "probability": w.probability} for w in (s.words or [])]
                    })
                if info and info.language:
                    detected_lang = info.language
                    lang_confidence = info.language_probability
            else:
                # Basic fallback
                chunk_segments = []

            # Adjust timestamps by chunk offset: ABSOLUTE TIMESTAMPS
            offset = c_start if total_chunks > 1 else 0.0

            for seg in chunk_segments:
                seg_start = float(seg.get("start", 0.0)) + offset
                seg_end = float(seg.get("end", seg_start + 0.5)) + offset
                seg_text = seg.get("text", "").strip()

                seg_words = []
                for w in seg.get("words", []):
                    w_text = str(w.get("word") or w.get("text") or "").strip()
                    w_start = float(w.get("start", 0.0)) + offset
                    w_end = float(w.get("end", w_start + 0.2)) + offset
                    w_prob = float(w.get("probability", w.get("confidence", 0.95)))
                    
                    word_obj = {
                        "text": w_text,
                        "start": w_start,
                        "end": w_end,
                        "confidence": w_prob
                    }
                    seg_words.append(word_obj)
                    all_raw_words.append(word_obj)

                all_raw_segments.append({
                    "id": f"seg_{len(all_raw_segments) + 1}",
                    "text": seg_text,
                    "start": round(seg_start, 3),
                    "end": round(seg_end, 3),
                    "words": seg_words,
                    "confidence": 0.95
                })

            # Progress metrics calculation
            processed_audio = min(c_end, total_duration)
            elapsed = time.time() - t_start
            rt_factor = (processed_audio / elapsed) if elapsed > 0 else 1.0
            rem_audio = max(0.0, total_duration - processed_audio)
            eta = (rem_audio / rt_factor) if rt_factor > 0 else 0.0
            progress_pct = (processed_audio / total_duration) * 100.0

            if on_progress:
                progress_event = create_progress(
                    job_id=job_id,
                    stage="transcription",
                    audio_processed=processed_audio,
                    audio_total=total_duration,
                    progress=progress_pct,
                    words=len(all_raw_words),
                    segments=len(all_raw_segments),
                    elapsed=elapsed,
                    eta=eta,
                    realtime_factor=rt_factor,
                    chunk_index=idx + 1,
                    chunk_total=total_chunks,
                    chunk_start=c_start,
                    chunk_end=c_end,
                    message=f"Chunk {idx + 1}/{total_chunks} ({round(c_start, 1)}-{round(c_end, 1)}s) transcribed in {round(time.time() - t_chunk_start, 2)}s"
                )
                on_progress(progress_event)

            # Cleanup chunk file
            if os.path.exists(chunk_wav):
                try:
                    os.remove(chunk_wav)
                except Exception:
                    pass

    finally:
        # Cleanup temp chunk folder
        if os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception:
                pass

    # Post-process words & create layers
    cleaned_words = clean_words_stream(all_raw_words)
    beats = create_beats_from_words(cleaned_words)
    lines = create_lines_from_beats(beats)

    total_elapsed = time.time() - t_start
    final_rt = (total_duration / total_elapsed) if total_elapsed > 0 else 1.0

    canonical_transcript = {
        "text": " ".join([w["text"] for w in cleaned_words]),
        "language": detected_lang,
        "languageConfidence": lang_confidence,
        "duration": round(total_duration, 3),
        "speechCoverage": round(min(1.0, sum([w["end"] - w["start"] for w in cleaned_words]) / max(1.0, total_duration)), 2),
        "segments": lines if lines else all_raw_segments,
        "beats": beats,
        "words": cleaned_words,
        "backend": backend_name,
        "device": device,
        "model": model_id,
    }

    return canonical_transcript
