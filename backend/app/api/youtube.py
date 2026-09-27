"""
YouTube Ingestion API
"""

import threading
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from ..services.queue import queue_service
from ..workers.worker import execute_youtube_job

router = APIRouter(prefix="/api/youtube", tags=["youtube"])

class YouTubeImportRequest(BaseModel):
    url: str

@router.post("/import")
async def import_youtube_video(req: YouTubeImportRequest, bg: BackgroundTasks):
    if not req.url or "youtube.com" not in req.url and "youtu.be" not in req.url:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL provided")

    job = queue_service.enqueue_job("youtube_download", {"url": req.url})
    
    # Launch worker in background thread
    threading.Thread(target=execute_youtube_job, args=(job["id"], job["payload"]), daemon=True).start()

    return {
        "success": True,
        "jobId": job["id"],
        "status": "QUEUED",
        "message": f"Ingestion started for YouTube video: {req.url}"
    }
