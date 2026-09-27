"""
VIRALCLIP STUDIO — TRANSCRIPTION WORKER HEALTH & HARDWARE DIAGNOSTICS
Accurately detects real compute capabilities (Apple Silicon Metal / MLX, faster-whisper, CPU).
Strictly ZERO fake MPS claims. Truthful reporting of execution provider, device, and memory.
"""

import sys
import os
import platform
import shutil
import subprocess
from typing import Dict, Any

def get_ffmpeg_info() -> Dict[str, Any]:
    # Look for ffmpeg in workspace bin, node_modules, or system PATH
    cwd = os.getcwd()
    candidates = [
        os.path.join(cwd, "bin", "ffmpeg"),
        os.path.join(cwd, "node_modules", "ffmpeg-static", "ffmpeg"),
        shutil.which("ffmpeg") or ""
    ]
    ffmpeg_path = next((p for p in candidates if p and os.path.exists(p) and os.access(p, os.X_OK)), "")
    
    version = "unknown"
    if ffmpeg_path:
        try:
            res = subprocess.run([ffmpeg_path, "-version"], capture_output=True, text=True, timeout=2)
            if res.returncode == 0 and res.stdout:
                version = res.stdout.split("\n")[0]
        except Exception:
            pass
            
    return {
        "available": bool(ffmpeg_path),
        "path": ffmpeg_path,
        "version": version
    }

def detect_transcription_backend() -> Dict[str, Any]:
    """
    Detects the optimal available local transcription backend in priority order:
    1. mlx-whisper on Apple Silicon Metal GPU (Device(gpu, 0))
    2. faster-whisper / CTranslate2 on CPU (or CUDA if present)
    3. CPU fallback
    """
    system_os = platform.system()
    machine = platform.machine().lower()
    is_apple_silicon = system_os == "Darwin" and machine in ("arm64", "aarch64")

    # 1. Probe MLX & Apple Silicon GPU
    mlx_available = False
    mlx_device_str = ""
    mlx_whisper_available = False
    
    try:
        import mlx.core as mx
        mlx_available = True
        dev = mx.default_device()
        mlx_device_str = str(dev)
        # Check if mlx-whisper package is installed
        import mlx_whisper
        mlx_whisper_available = True
    except Exception as e:
        mlx_whisper_available = False

    if is_apple_silicon and mlx_available and mlx_whisper_available and "gpu" in mlx_device_str.lower():
        return {
            "backend": "mlx-whisper",
            "device": "apple-silicon-metal",
            "accelerated": True,
            "details": f"MLX Metal GPU ({mlx_device_str})",
            "computeType": "float16",
            "defaultModel": "mlx-community/whisper-base-mlx",
            "status": "ready"
        }

    # 2. Probe faster-whisper (CTranslate2)
    faster_whisper_available = False
    try:
        import faster_whisper
        faster_whisper_available = True
    except Exception:
        faster_whisper_available = False

    if faster_whisper_available:
        return {
            "backend": "faster-whisper",
            "device": "cpu",
            "accelerated": False,
            "details": "CTranslate2 CPU (int8_float32)",
            "computeType": "int8_float32",
            "defaultModel": "base",
            "status": "ready"
        }

    # 3. Fallback
    return {
        "backend": "cpu",
        "device": "cpu",
        "accelerated": False,
        "details": "Python Standard Whisper / CPU",
        "computeType": "float32",
        "defaultModel": "base",
        "status": "degraded"
    }

def get_process_memory_mb() -> float:
    try:
        import resource
        # ru_maxrss is in bytes on macOS Darwin, kilobytes on Linux
        usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        if platform.system() == "Darwin":
            return usage / (1024.0 * 1024.0)
        else:
            return usage / 1024.0
    except Exception:
        return 0.0

def get_worker_health() -> Dict[str, Any]:
    backend_info = detect_transcription_backend()
    ffmpeg_info = get_ffmpeg_info()
    
    return {
        "status": "ok",
        "pid": os.getpid(),
        "platform": {
            "system": platform.system(),
            "machine": platform.machine(),
            "pythonVersion": platform.python_version(),
            "cpuCount": os.cpu_count() or 1
        },
        "transcription": backend_info,
        "ffmpeg": ffmpeg_info,
        "memoryMb": round(get_process_memory_mb(), 2)
    }

if __name__ == "__main__":
    import json
    print(json.dumps(get_worker_health(), indent=2))
