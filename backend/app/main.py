"""
Viral Studio — FastAPI Application Server
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .api import (
    media_router,
    youtube_router,
    transcription_router,
    projects_router,
    render_router,
    health_router,
)

app = FastAPI(
    title="Viral Studio Production API",
    description="Professional AI captioning, media-processing and video creation backend",
    version=settings.VERSION
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(media_router)
app.include_router(youtube_router)
app.include_router(transcription_router)
app.include_router(projects_router)
app.include_router(render_router)
app.include_router(health_router)

# Mount local storage directory for preview in dev mode
if os.path.exists(settings.LOCAL_STORAGE_DIR):
    app.mount("/data/storage", StaticFiles(directory=str(settings.LOCAL_STORAGE_DIR)), name="storage")

@app.get("/")
async def root():
    return {
        "name": "Viral Studio Production API",
        "version": settings.VERSION,
        "status": "operational",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=settings.API_PORT, reload=True)
