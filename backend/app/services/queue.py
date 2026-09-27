"""
Durable Queue Service with Real-Time SSE Broadcasting
"""

import asyncio
import json
import time
from typing import Dict, Any, List, Optional
from ..config import settings
from .database import db_service

# Listeners for SSE events: job_id -> list of asyncio.Queue
_SSE_LISTENERS: Dict[str, List[asyncio.Queue]] = {}

class QueueService:
    def __init__(self):
        self.redis_url = settings.REDIS_URL
        self._redis = None

        if self.redis_url:
            try:
                import redis
                self._redis = redis.from_url(self.redis_url)
                print("[QueueService] Connected to Redis queue.")
            except Exception as e:
                print(f"[QueueService] Redis connection failed: {e}. Falling back to in-process queue.")

    def is_remote(self) -> bool:
        return self._redis is not None

    def enqueue_job(self, job_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        job_id = f"job_{int(time.time() * 1000)}_{job_type[:4]}"
        job_record = {
            "id": job_id,
            "type": job_type,
            "status": "QUEUED",
            "progress": 0,
            "stage": "QUEUED",
            "message": "Job enqueued in background processor",
            "payload": payload,
            "createdAt": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            "startedAt": None,
            "completedAt": None,
            "error": None
        }
        db_service.save_job(job_record)
        return job_record

    def update_job_progress(
        self,
        job_id: str,
        progress: int,
        stage: str,
        message: str,
        status: str = "PROCESSING",
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ):
        job = db_service.get_job(job_id) or {"id": job_id}
        job["progress"] = progress
        job["stage"] = stage
        job["message"] = message
        job["status"] = status
        if result:
            job["result"] = result
        if error:
            job["error"] = error
            job["status"] = "FAILED"
        if status in ("COMPLETED", "FAILED", "CANCELLED"):
            job["completedAt"] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

        db_service.save_job(job)

        # Broadcast to active SSE listeners
        if job_id in _SSE_LISTENERS:
            event_data = {
                "id": job_id,
                "progress": progress,
                "stage": stage,
                "message": message,
                "status": job["status"],
                "error": error
            }
            for q in _SSE_LISTENERS[job_id]:
                try:
                    q.put_nowait(event_data)
                except Exception:
                    pass

    async def subscribe_job_events(self, job_id: str):
        """Async generator yielding Server-Sent Events."""
        queue = asyncio.Queue()
        if job_id not in _SSE_LISTENERS:
            _SSE_LISTENERS[job_id] = []
        _SSE_LISTENERS[job_id].append(queue)

        try:
            # Send initial state immediately
            job = db_service.get_job(job_id)
            if job:
                yield {
                    "event": "message",
                    "data": json.dumps({
                        "id": job_id,
                        "progress": job.get("progress", 0),
                        "stage": job.get("stage", "QUEUED"),
                        "message": job.get("message", ""),
                        "status": job.get("status", "QUEUED")
                    })
                }

            while True:
                data = await queue.get()
                yield {
                    "event": "message",
                    "data": json.dumps(data)
                }
                if data.get("status") in ("COMPLETED", "FAILED", "CANCELLED"):
                    break
        finally:
            if job_id in _SSE_LISTENERS and queue in _SSE_LISTENERS[job_id]:
                _SSE_LISTENERS[job_id].remove(queue)
                if not _SSE_LISTENERS[job_id]:
                    del _SSE_LISTENERS[job_id]

queue_service = QueueService()
