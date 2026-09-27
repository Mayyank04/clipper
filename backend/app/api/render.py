"""
Render & Export API
"""

import threading
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from ..schemas.render import RenderRequest, RenderJobResponse
from ..services.queue import queue_service
from ..services.database import db_service
from ..workers.worker import execute_render_job

router = APIRouter(prefix="/api/render", tags=["render"])

@router.post("", response_model=RenderJobResponse)
async def start_render_job(req: RenderRequest):
    project_id = req.projectId
    payload = {
        "projectId": project_id,
        "renderPlan": req.renderPlan,
        "options": req.options or {}
    }

    job = queue_service.enqueue_job("render", payload)

    # Launch render worker thread
    threading.Thread(target=execute_render_job, args=(job["id"], payload), daemon=True).start()

    return RenderJobResponse(
        jobId=job["id"],
        status="QUEUED",
        stage="QUEUED",
        message="Render job enqueued in media processor"
    )

@router.get("/{job_id}")
async def get_render_status(job_id: str):
    job = db_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Render job not found")
    return job

@router.post("/{job_id}/cancel")
async def cancel_render(job_id: str):
    job = db_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Render job not found")
    queue_service.update_job_progress(job_id, job.get("progress", 0), "CANCELLED", "Render cancelled by user", status="CANCELLED")
    return {"success": True, "status": "CANCELLED"}

@router.get("/{job_id}/events")
async def get_render_events(job_id: str):
    """Server-Sent Events (SSE) stream for real-time rendering progress."""
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
