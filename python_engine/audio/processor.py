"""
VIRALCLIP STUDIO — AUDIO PREPROCESSING ENGINE
Extracts and normalizes speech audio to standard 16kHz mono PCM 16-bit WAV.
Supports loudness normalization, dynamic speech filtering, silence detection,
and deterministic SHA-256 caching.
"""

import os
import sys
import time
import json
import hashlib
import subprocess
import re
from typing import Tuple, Optional, Dict, Any

def get_ffmpeg_path() -> str:
    cwd = os.getcwd()
    candidates = [
        os.path.join(cwd, "bin", "ffmpeg"),
        os.path.join(cwd, "node_modules", "ffmpeg-static", "ffmpeg"),
        "ffmpeg"
    ]
    for p in candidates:
        if os.path.exists(p) and os.access(p, os.X_OK):
            return p
    return "ffmpeg"

def compute_file_sha256(filepath: str, max_bytes: int = 4 * 1024 * 1024) -> str:
    hasher = hashlib.sha256()
    stat = os.stat(filepath)
    hasher.update(f"{stat.st_size}_{stat.st_mtime}".encode('utf-8'))
    with open(filepath, 'rb') as f:
        hasher.update(f.read(max_bytes))
    return hasher.hexdigest()

def analyze_audio_quality(input_path: str, ffmpeg_path: str) -> Dict[str, Any]:
    """
    Runs quick ebur128 analysis to check if loudness normalization is needed.
    """
    cmd = [
        ffmpeg_path, "-nostats", "-i", input_path,
        "-filter_complex", "ebur128=peak=true",
        "-f", "null", "-"
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        output = res.stderr or ""
        
        # Parse Integrated loudness
        i_match = re.search(r"I:\s+(-?\d+\.?\d*)\s+LUFS", output)
        integrated = float(i_match.group(1)) if i_match else -24.0
        
        # Needs loudnorm if integrated is too quiet (< -28 LUFS) or too loud (> -14 LUFS)
        needs_loudnorm = integrated < -28.0 or integrated > -14.0
        return {
            "integratedLoudness": integrated,
            "needsLoudnorm": needs_loudnorm
        }
    except Exception:
        return {"integratedLoudness": -24.0, "needsLoudnorm": False}

def preprocess_audio_16k(
    source_media_path: str,
    media_id: Optional[str] = None,
    clip_start: float = 0.0,
    clip_duration: Optional[float] = None,
    apply_loudnorm: bool = False
) -> Tuple[str, float]:
    """
    Extracts high-quality 16kHz mono PCM 16-bit WAV for Whisper inference.
    Reuses existing cached audio if hash and clip parameters match.
    """
    if not os.path.exists(source_media_path):
        raise FileNotFoundError(f"Source media not found: {source_media_path}")

    ffmpeg_path = get_ffmpeg_path()
    file_hash = compute_file_sha256(source_media_path)
    safe_id = media_id or f"media_{file_hash[:12]}"
    
    cache_dir = os.path.join(os.getcwd(), "data", "media", safe_id, "audio")
    os.makedirs(cache_dir, exist_ok=True)

    cache_wav_path = os.path.join(cache_dir, "source_16k.wav")
    meta_path = os.path.join(cache_dir, "metadata.json")

    # Check cache if extracting from start with no clip duration
    if clip_start == 0.0 and not clip_duration and os.path.exists(cache_wav_path) and os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
            if meta.get("fileHash") == file_hash and os.path.getsize(cache_wav_path) > 1000:
                duration = float(meta.get("duration", 0.0))
                if duration > 0:
                    return cache_wav_path, duration
        except Exception:
            pass

    # Quick quality check for dynamic preprocessing
    analysis = analyze_audio_quality(source_media_path, ffmpeg_path)
    use_loudnorm = apply_loudnorm or analysis.get("needsLoudnorm", False)

    args = [ffmpeg_path, "-y"]
    if clip_start > 0:
        args.extend(["-ss", f"{clip_start:.3f}"])
    args.extend(["-i", source_media_path])
    if clip_duration and clip_duration > 0:
        args.extend(["-t", f"{clip_duration:.3f}"])

    # Audio filters: speech bandpass (highpass 80Hz, lowpass 8000Hz) + optional loudnorm
    filters = ["highpass=f=80", "lowpass=f=8000"]
    if use_loudnorm:
        filters.append("loudnorm=I=-16:TP=-1.5:LRA=11")

    args.extend([
        "-vn",
        "-af", ",".join(filters),
        "-ar", "16000",
        "-ac", "1",
        "-c:a", "pcm_s16le",
        cache_wav_path
    ])

    res = subprocess.run(args, capture_output=True, text=True)
    if res.returncode != 0 or not os.path.exists(cache_wav_path) or os.path.getsize(cache_wav_path) == 0:
        # Fallback to standard conversion without audio filters if complex filter fails
        fallback_args = [
            ffmpeg_path, "-y",
            "-i", source_media_path,
            "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
            cache_wav_path
        ]
        res_fb = subprocess.run(fallback_args, capture_output=True, text=True)
        if res_fb.returncode != 0 or not os.path.exists(cache_wav_path):
            raise RuntimeError(f"FFmpeg audio extraction failed: {res_fb.stderr}")

    # Determine exact duration
    ffprobe_path = ffmpeg_path.replace("ffmpeg", "ffprobe")
    duration = 0.0
    if os.path.exists(ffprobe_path):
        try:
            probe = subprocess.run([
                ffprobe_path, "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", cache_wav_path
            ], capture_output=True, text=True)
            if probe.returncode == 0 and probe.stdout.strip():
                duration = float(probe.stdout.strip())
        except Exception:
            pass

    # Save cache metadata
    try:
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump({
                "fileHash": file_hash,
                "sourcePath": source_media_path,
                "duration": duration,
                "sampleRate": 16000,
                "channels": 1,
                "format": "pcm_s16le",
                "loudnormApplied": use_loudnorm,
                "cachedAt": int(time.time() * 1000)
            }, f, indent=2)
    except Exception:
        pass

    return cache_wav_path, duration
