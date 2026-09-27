"""
Transcription API with Real-Time SSE Updates
"""

import threading
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from fastapi.responses import StreamingResponse

from ..schemas.transcription import TranscriptionRequest
from ..services.queue import queue_service
from ..services.database import db_service
from ..workers.worker import execute_transcription_job

router = APIRouter(prefix="/api/transcription", tags=["transcription"])

@router.post("")
async def create_transcription(req: TranscriptionRequest):
    payload = {
        "media_id": req.media_id,
        "media_url": req.media_url,
        "file_path": req.file_path,
        "options": req.options.model_dump() if req.options else {}
    }

    job = queue_service.enqueue_job("transcription", payload)

    # Launch background worker
    threading.Thread(target=execute_transcription_job, args=(job["id"], payload), daemon=True).start()

    return {
        "success": True,
        "jobId": job["id"],
        "status": "QUEUED",
        "message": "Transcription job enqueued"
    }

@router.get("/{job_id}")
async def get_transcription_status(job_id: str):
    job = db_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Transcription job {job_id} not found")
    return job

@router.post("/{job_id}/cancel")
async def cancel_transcription(job_id: str):
    job = db_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    queue_service.update_job_progress(job_id, job.get("progress", 0), "CANCELLED", "Job cancelled by user", status="CANCELLED")
    return {"success": True, "status": "CANCELLED"}

@router.get("/{job_id}/events")
async def get_transcription_events(job_id: str):
    """Server-Sent Events (SSE) endpoint streaming real-time transcription progress."""
    async def event_generator():
        async for msg in queue_service.subscribe_job_events(job_id):
            yield f"data: {msg['data']}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
