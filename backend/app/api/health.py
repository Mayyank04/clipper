"""
System Health & Diagnostics API
"""

import os
import shutil
import subprocess
import time
from fastapi import APIRouter
from ..config import settings
from ..services.database import db_service
from ..services.storage import storage_service
from ..services.queue import queue_service

router = APIRouter(prefix="/api", tags=["health"])

@router.get("/health")
async def get_system_health():
    # Check FFmpeg
    ffmpeg_ok = os.path.exists(settings.FFMPEG_PATH) or shutil.which("ffmpeg") is not None
    # Check FFprobe
    ffprobe_ok = os.path.exists(settings.FFPROBE_PATH) or shutil.which("ffprobe") is not None
    # Check yt-dlp
    yt_dlp_ok = os.path.exists(settings.YT_DLP_PATH) or shutil.which("yt-dlp") is not None

    return {
        "status": "healthy" if (ffmpeg_ok and ffprobe_ok) else "warning",
        "platform": "Viral Studio Production Engine (Python/FastAPI)",
        "database": "postgresql" if db_service.is_remote() else "fallback-disk-journal",
        "storage": "s3-compatible" if storage_service.is_remote() else "fallback-local-disk",
        "queue": "redis" if queue_service.is_remote() else "fallback-in-process",
        "worker": {
            "status": "active",
            "device": settings.WHISPER_DEVICE,
            "compute_type": settings.WHISPER_COMPUTE_TYPE,
            "lastHeartbeat": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        },
        "ffmpeg": "available" if ffmpeg_ok else "missing",
        "ffprobe": "available" if ffprobe_ok else "missing",
        "whisper": f"faster-whisper ({settings.WHISPER_MODEL})",
        "ytDlp": "available" if yt_dlp_ok else "missing",
        "paths": {
            "ffmpeg": settings.FFMPEG_PATH,
            "ffprobe": settings.FFPROBE_PATH,
            "ytDlp": settings.YT_DLP_PATH
        }
    }
