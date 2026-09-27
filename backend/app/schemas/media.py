from pydantic import BaseModel
from typing import Optional, Dict, Any

class UploadUrlRequest(BaseModel):
    filename: str
    contentType: str
    size: Optional[int] = None

class UploadUrlResponse(BaseModel):
    mediaId: str
    objectKey: str
    uploadUrl: str

class CompleteMediaRequest(BaseModel):
    objectKey: str
    metadata: Optional[Dict[str, Any]] = None

class MediaItem(BaseModel):
    id: str
    name: str
    type: str  # 'video' | 'audio'
    url: str
    objectKey: Optional[str] = None
    duration: float
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[float] = None
    codec: Optional[str] = None
    audioCodec: Optional[str] = None
    size: int
    createdAt: str
