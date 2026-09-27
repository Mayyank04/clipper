"""
Media API Endpoints
"""

import os
import shutil
import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from typing import Optional

from ..config import settings
from ..schemas.media import UploadUrlRequest, UploadUrlResponse, CompleteMediaRequest, MediaItem
from ..services.storage import storage_service
from ..services.database import db_service

router = APIRouter(prefix="/api/media", tags=["media"])

@router.post("/upload-url", response_model=UploadUrlResponse)
async def create_upload_url(req: UploadUrlRequest):
    media_id = f"med_{int(time.time() * 1000)}"
    object_key = f"uploads/{media_id}/{req.filename}"
    upload_url = storage_service.get_signed_upload_url(object_key, req.contentType)

    return UploadUrlResponse(
        mediaId=media_id,
        objectKey=object_key,
        uploadUrl=upload_url
    )

@router.post("/{media_id}/complete")
async def complete_media_upload(media_id: str, req: CompleteMediaRequest):
    object_key = req.objectKey
    if not storage_service.exists(object_key):
        raise HTTPException(status_code=400, detail="Media file not found in storage")

    download_url = storage_service.get_signed_download_url(object_key)
    meta = req.metadata or {}

    media_record = {
        "id": media_id,
        "name": os.path.basename(object_key),
        "type": "video",
        "url": download_url,
        "objectKey": object_key,
        "duration": meta.get("duration", 0.0),
        "width": meta.get("width", 1080),
        "height": meta.get("height", 1920),
        "fps": meta.get("fps", 30.0),
        "size": meta.get("size", 0),
        "createdAt": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }
    db_service.save_media(media_record)
    return {"success": True, "media": media_record}

@router.post("/upload")
async def direct_media_upload(
    file: UploadFile = File(...),
    key: Optional[str] = Query(None)
):
    """Direct multipart file upload for local development or non-presigned fallback."""
    media_id = f"med_{int(time.time() * 1000)}"
    object_key = key or f"uploads/{media_id}/{file.filename}"

    temp_path = settings.TMP_DIR / f"{media_id}_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    storage_service.upload_file(str(temp_path), object_key, content_type=file.content_type)
    file_size = os.path.getsize(temp_path)
    os.remove(temp_path)

    media_record = {
        "id": media_id,
        "name": file.filename,
        "type": "video",
        "url": storage_service.get_signed_download_url(object_key),
        "objectKey": object_key,
        "duration": 0.0,
        "size": file_size,
        "createdAt": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }
    db_service.save_media(media_record)
    return {"success": True, "media": media_record}

@router.get("/{media_id}")
async def get_media(media_id: str):
    media = db_service.get_media(media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media record not found")
    return media

@router.delete("/{media_id}")
async def delete_media(media_id: str):
    media = db_service.get_media(media_id)
    if media and media.get("objectKey"):
        storage_service.delete(media["objectKey"])
    return {"success": True}
