"""
Project Management API
"""

import time
from fastapi import APIRouter, HTTPException
from typing import List

from ..schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from ..services.database import db_service

router = APIRouter(prefix="/api/projects", tags=["projects"])

@router.post("", response_model=ProjectResponse)
async def create_project(req: ProjectCreate):
    p_id = f"proj_{int(time.time() * 1000)}"
    now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

    project_data = {
        "id": p_id,
        "userId": "default_user",
        "name": req.name,
        "sourceMediaId": req.sourceMediaId,
        "duration": req.duration,
        "width": req.width,
        "height": req.height,
        "fps": req.fps,
        "status": "active",
        "captions": [],
        "captionStyle": {},
        "renderPlan": None,
        "brollEvents": [],
        "sfxEvents": [],
        "vfxEvents": [],
        "selectedClip": None,
        "createdAt": now,
        "updatedAt": now
    }
    db_service.save_project(project_data)
    return project_data

@router.get("", response_model=List[ProjectResponse])
async def list_projects():
    return db_service.list_projects()

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    p = db_service.get_project(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p

@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, req: ProjectUpdate):
    p = db_service.get_project(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    update_dict = req.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        if v is not None:
            p[k] = v

    db_service.save_project(p)
    return p

@router.delete("/{project_id}")
async def delete_project(project_id: str):
    db_service.delete_project(project_id)
    return {"success": True}
