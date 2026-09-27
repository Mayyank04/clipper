from __future__ import annotations
import os
import shutil
import platform
from pathlib import Path
from typing import Optional, Tuple
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent

def detect_device() -> tuple[str, str]:
    """
    Detect hardware acceleration capabilities:
    - CUDA GPU: device="cuda", compute_type="float16"
    - Apple Silicon (M1/M2/M3/M4): device="cpu", compute_type="int8" (or float32)
    - Standard CPU: device="cpu", compute_type="int8"
    """
    device = os.getenv("WHISPER_DEVICE")
    compute_type = os.getenv("WHISPER_COMPUTE_TYPE")

    if device and compute_type:
        return device, compute_type

    # Check CUDA
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda", compute_type or "float16"
    except ImportError:
        pass

    # Check Apple Silicon / Mac
    is_mac_arm = platform.system() == "Darwin" and platform.machine() == "arm64"
    if is_mac_arm:
        return "cpu", compute_type or "int8"

    return "cpu", compute_type or "int8"

def resolve_binary(binary_name: str, explicit_env: str | None = None) -> str:
    """Resolve binary from env var, system PATH, local bin/, or node_modules."""
    if explicit_env and os.path.exists(explicit_env):
        return explicit_env

    which_bin = shutil.which(binary_name)
    if which_bin:
        return which_bin

    local_bin = BASE_DIR / "bin" / binary_name
    if local_bin.exists():
        return str(local_bin)

    if binary_name == "ffmpeg":
        static_bin = BASE_DIR / "node_modules" / "ffmpeg-static" / "ffmpeg"
        if static_bin.exists():
            return str(static_bin)
    elif binary_name == "ffprobe":
        arm_bin = BASE_DIR / "node_modules" / "ffprobe-static" / "bin" / "darwin" / "arm64" / "ffprobe"
        if arm_bin.exists():
            return str(arm_bin)
        x64_bin = BASE_DIR / "node_modules" / "ffprobe-static" / "bin" / "darwin" / "x64" / "ffprobe"
        if x64_bin.exists():
            return str(x64_bin)

    return binary_name

device, compute_type = detect_device()

class Settings(BaseModel):
    PROJECT_NAME: str = "Viral Studio"
    VERSION: str = "1.0.0"
    API_PORT: int = int(os.getenv("PORT", os.getenv("FASTAPI_PORT", "8000")))
    BASE_DIR: Path = BASE_DIR
    
    # Database & Cache
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL")

    # Object Storage
    STORAGE_ENDPOINT: Optional[str] = os.getenv("STORAGE_ENDPOINT")
    STORAGE_REGION: str = os.getenv("STORAGE_REGION", "auto")
    STORAGE_BUCKET: str = os.getenv("STORAGE_BUCKET", "viralclip-media")
    STORAGE_ACCESS_KEY: Optional[str] = os.getenv("STORAGE_ACCESS_KEY")
    STORAGE_SECRET_KEY: Optional[str] = os.getenv("STORAGE_SECRET_KEY")
    STORAGE_FORCE_PATH_STYLE: bool = os.getenv("STORAGE_FORCE_PATH_STYLE", "true").lower() == "true"
    LOCAL_STORAGE_DIR: Path = BASE_DIR / "data" / "storage"

    # Media Binaries
    FFMPEG_PATH: str = resolve_binary("ffmpeg", os.getenv("FFMPEG_PATH"))
    FFPROBE_PATH: str = resolve_binary("ffprobe", os.getenv("FFPROBE_PATH"))
    YT_DLP_PATH: str = resolve_binary("yt-dlp", os.getenv("YT_DLP_PATH"))

    # Whisper Settings
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "base")
    WHISPER_DEVICE: str = device
    WHISPER_COMPUTE_TYPE: str = compute_type

    # Export & Brand Kit
    WATERMARK_ENABLED: bool = os.getenv("WATERMARK_ENABLED", "false").lower() == "true"
    WORKER_SECRET: str = os.getenv("WORKER_SECRET", "viralclip_worker_secret")

    # Paths
    TMP_DIR: Path = BASE_DIR / "data" / "tmp"
    ASSETS_DIR: Path = BASE_DIR / "public" / "assets"
    FONTS_DIR: Path = BASE_DIR / "public" / "assets" / "fonts"

settings = Settings()
settings.LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.TMP_DIR.mkdir(parents=True, exist_ok=True)
