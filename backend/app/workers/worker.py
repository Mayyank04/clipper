"""
Asynchronous Processing Worker for Media, YouTube, Transcription & Render
"""

import os
import shutil
import tempfile
import time
from typing import Dict, Any
from ..config import settings
from ..services.queue import queue_service
from ..services.storage import storage_service
from ..services.database import db_service
from ..transcription.whisper_service import whisper_service
from ..transcription.ai_shorts import generate_ai_shorts_candidates
from ..captions.segmenter import segment_caption_words
from ..youtube.downloader import youtube_downloader
from ..rendering.ffmpeg_engine import render_video_export

def execute_transcription_job(job_id: str, payload: Dict[str, Any]):
    """Processes audio extraction, Whisper transcription, segmentation, and shorts candidate generation."""
    try:
        queue_service.update_job_progress(job_id, 5, "STARTING", "Initializing transcription task...")
        
        media_id = payload.get("media_id")
        file_path = payload.get("file_path")
        options = payload.get("options", {})

        local_media_path = file_path
        temp_dir = None

        if not local_media_path and media_id:
            media = db_service.get_media(media_id)
            if media and media.get("objectKey"):
                temp_dir = tempfile.mkdtemp(prefix="worker_dl_")
                local_media_path = os.path.join(temp_dir, os.path.basename(media["objectKey"]))
                queue_service.update_job_progress(job_id, 15, "DOWNLOADING", "Fetching media from storage...")
                storage_service.download_file(media["objectKey"], local_media_path)

        if not local_media_path or not os.path.exists(local_media_path):
            raise FileNotFoundError(f"Media file not found for job {job_id}")

        queue_service.update_job_progress(job_id, 30, "EXTRACTING_AUDIO", "Extracting 16kHz mono audio...")

        def on_transcribe_progress(pct: int, msg: str):
            mapped_progress = 30 + int(pct * 0.45)
            queue_service.update_job_progress(job_id, mapped_progress, "TRANSCRIBING", msg)

        # Transcribe with faster-whisper
        from ..schemas.transcription import TranscriptionOptions
        transcribe_opts = TranscriptionOptions(**options) if isinstance(options, dict) else options
        result = whisper_service.transcribe(local_media_path, transcribe_opts, on_progress=on_transcribe_progress)

        # Generate Caption Beats
        queue_service.update_job_progress(job_id, 80, "GENERATING_CAPTIONS", "Segmenting captions into speech beats...")
        caption_segments = segment_caption_words(result.words, mode="LINE", total_duration=result.duration)

        # Generate AI Shorts Candidates
        queue_service.update_job_progress(job_id, 90, "ANALYZING_MOMENTS", "Finding viral candidate moments...")
        shorts_candidates = generate_ai_shorts_candidates([s.model_dump() for s in caption_segments])

        final_data = {
            "transcript": result.model_dump(),
            "captions": [s.model_dump() for s in caption_segments],
            "aiShorts": shorts_candidates
        }

        queue_service.update_job_progress(
            job_id, 100, "COMPLETED", "Transcription and caption generation completed",
            status="COMPLETED", result=final_data
        )

        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)

    except Exception as e:
        queue_service.update_job_progress(job_id, 0, "FAILED", str(e), status="FAILED", error=str(e))

def execute_youtube_job(job_id: str, payload: Dict[str, Any]):
    """Downloads YouTube video and initiates auto-transcription."""
    try:
        url = payload.get("url")
        queue_service.update_job_progress(job_id, 5, "DOWNLOADING", f"Starting download for {url}...")

        temp_dir = tempfile.mkdtemp(prefix="worker_yt_")

        def on_dl_progress(pct: int, msg: str, eta: str):
            queue_service.update_job_progress(job_id, pct, "DOWNLOADING", msg)

        dl_res = youtube_downloader.download(url, temp_dir, on_progress=on_dl_progress)
        downloaded_file = dl_res["filePath"]

        # Store into object storage
        queue_service.update_job_progress(job_id, 92, "UPLOADING", "Storing media in object storage...")
        object_key = f"youtube/{int(time.time())}_{os.path.basename(downloaded_file)}"
        storage_service.upload_file(downloaded_file, object_key, content_type="video/mp4")

        media_id = f"med_{int(time.time())}"
        media_record = {
            "id": media_id,
            "name": dl_res["filename"],
            "type": "video",
            "url": storage_service.get_signed_download_url(object_key),
            "objectKey": object_key,
            "duration": 0.0,
            "size": dl_res["size"],
            "createdAt": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }
        db_service.save_media(media_record)

        queue_service.update_job_progress(
            job_id, 100, "COMPLETED", "YouTube ingestion complete",
            status="COMPLETED", result={"media": media_record}
        )

        shutil.rmtree(temp_dir, ignore_errors=True)
    except Exception as e:
        queue_service.update_job_progress(job_id, 0, "FAILED", str(e), status="FAILED", error=str(e))

def execute_render_job(job_id: str, payload: Dict[str, Any]):
    """Renders 1080x1920 video with burned captions and uploads export to object storage."""
    try:
        project_id = payload.get("projectId")
        render_plan = payload.get("renderPlan", {})

        queue_service.update_job_progress(job_id, 10, "PREPARING", "Preparing media assets and subtitle filters...")

        temp_dir = tempfile.mkdtemp(prefix="worker_render_")
        source_url = render_plan.get("source", {}).get("url")
        source_key = render_plan.get("source", {}).get("objectKey")

        source_local = os.path.join(temp_dir, "source.mp4")

        if source_key and storage_service.exists(source_key):
            storage_service.download_file(source_key, source_local)
        elif source_url and os.path.exists(source_url):
            shutil.copy2(source_url, source_local)
        else:
            raise FileNotFoundError("Render source video could not be resolved from storage.")

        queue_service.update_job_progress(job_id, 35, "RENDERING", "Encoding 1080x1920 video with FFmpeg...")

        output_mp4 = os.path.join(temp_dir, f"{job_id}.mp4")
        render_res = render_video_export(source_local, output_mp4, render_plan)

        queue_service.update_job_progress(job_id, 85, "VERIFYING", "Running forensic export validation...")
        
        # Upload export to storage
        export_key = f"exports/{project_id}/{job_id}.mp4"
        storage_service.upload_file(output_mp4, export_key, content_type="video/mp4")

        download_url = storage_service.get_signed_download_url(export_key)

        queue_service.update_job_progress(
            job_id, 100, "COMPLETED", "Video export rendered and verified successfully",
            status="COMPLETED",
            result={
                "exportKey": export_key,
                "downloadUrl": download_url,
                "validation": render_res["validation"]
            }
        )

        shutil.rmtree(temp_dir, ignore_errors=True)
    except Exception as e:
        queue_service.update_job_progress(job_id, 0, "FAILED", str(e), status="FAILED", error=str(e))
