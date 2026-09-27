from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class ProjectCreate(BaseModel):
    name: str = "Untitled Reel"
    sourceMediaId: Optional[str] = None
    duration: float = 0.0
    width: int = 1080
    height: int = 1920
    fps: float = 30.0

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    captions: Optional[List[Dict[str, Any]]] = None
    captionStyle: Optional[Dict[str, Any]] = None
    renderPlan: Optional[Dict[str, Any]] = None
    brollEvents: Optional[List[Dict[str, Any]]] = None
    sfxEvents: Optional[List[Dict[str, Any]]] = None
    vfxEvents: Optional[List[Dict[str, Any]]] = None
    selectedClip: Optional[Dict[str, Any]] = None
    duration: Optional[float] = None
    status: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    userId: str = "default_user"
    name: str
    sourceMediaId: Optional[str] = None
    duration: float
    width: int
    height: int
    fps: float
    status: str = "active"
    captions: Optional[List[Dict[str, Any]]] = None
    captionStyle: Optional[Dict[str, Any]] = None
    renderPlan: Optional[Dict[str, Any]] = None
    brollEvents: Optional[List[Dict[str, Any]]] = None
    sfxEvents: Optional[List[Dict[str, Any]]] = None
    vfxEvents: Optional[List[Dict[str, Any]]] = None
    selectedClip: Optional[Dict[str, Any]] = None
    createdAt: str
    updatedAt: str
