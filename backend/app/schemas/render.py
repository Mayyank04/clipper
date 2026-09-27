from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class RenderRequest(BaseModel):
    projectId: str
    renderPlan: Dict[str, Any]
    options: Optional[Dict[str, Any]] = None

class RenderJobResponse(BaseModel):
    jobId: str
    status: str
    progress: int = 0
    stage: str = "QUEUED"
    message: str = "Render job created"
    exportId: Optional[str] = None
    downloadUrl: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    platform: str = "Viral Studio Python Engine"
    database: str
    storage: str
    queue: str
    worker: Dict[str, Any]
    ffmpeg: str
    ffprobe: str
    whisper: str
    ytDlp: str
    device: str
    compute_type: str
