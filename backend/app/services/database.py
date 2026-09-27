"""
Database Service with PostgreSQL and Disk-Journal Fallback
"""

import json
import os
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from ..config import settings

class DatabaseService:
    def __init__(self):
        self.db_url = settings.DATABASE_URL
        self._pool = None
        self.projects_dir = settings.BASE_DIR / ".projects"
        self.jobs_dir = settings.BASE_DIR / "data" / "jobs"
        self.media_dir = settings.BASE_DIR / "data" / "media_records"

        self.projects_dir.mkdir(parents=True, exist_ok=True)
        self.jobs_dir.mkdir(parents=True, exist_ok=True)
        self.media_dir.mkdir(parents=True, exist_ok=True)

        if self.db_url:
            try:
                import psycopg2
                from psycopg2 import pool
                self._pool = psycopg2.pool.SimpleConnectionPool(1, 10, self.db_url)
                print("[DatabaseService] Connected to PostgreSQL pool.")
            except Exception as e:
                print(f"[DatabaseService] PostgreSQL connection failed: {e}. Falling back to disk journal.")

    def is_remote(self) -> bool:
        return self._pool is not None

    def save_project(self, project: Dict[str, Any]):
        p_id = project["id"]
        now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        project.setdefault("createdAt", now)
        project["updatedAt"] = now

        if self._pool:
            conn = self._pool.getconn()
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO projects (id, user_id, name, source_media_id, duration, width, height, fps, status, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            duration = EXCLUDED.duration,
                            updated_at = NOW();
                    """, (p_id, project.get("userId", "default_user"), project.get("name", "Untitled"),
                          project.get("sourceMediaId"), project.get("duration", 0.0),
                          project.get("width", 1080), project.get("height", 1920),
                          project.get("fps", 30.0), project.get("status", "active")))
                conn.commit()
            finally:
                self._pool.putconn(conn)
        
        # Always persist to disk journal for local instant availability
        file_path = self.projects_dir / f"{p_id}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(project, f, indent=2)

    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        file_path = self.projects_dir / f"{project_id}.json"
        if file_path.exists():
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return None

    def list_projects(self) -> List[Dict[str, Any]]:
        projects = []
        for file in self.projects_dir.glob("*.json"):
            try:
                with open(file, "r", encoding="utf-8") as f:
                    projects.append(json.load(f))
            except Exception:
                continue
        projects.sort(key=lambda x: x.get("updatedAt", ""), reverse=True)
        return projects

    def delete_project(self, project_id: str):
        file_path = self.projects_dir / f"{project_id}.json"
        if file_path.exists():
            file_path.unlink()

    def save_media(self, media: Dict[str, Any]):
        m_id = media["id"]
        file_path = self.media_dir / f"{m_id}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(media, f, indent=2)

    def get_media(self, media_id: str) -> Optional[Dict[str, Any]]:
        file_path = self.media_dir / f"{media_id}.json"
        if file_path.exists():
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return None

    def save_job(self, job: Dict[str, Any]):
        j_id = job["id"]
        now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        job.setdefault("createdAt", now)
        job["updatedAt"] = now

        file_path = self.jobs_dir / f"{j_id}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(job, f, indent=2)

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        file_path = self.jobs_dir / f"{job_id}.json"
        if file_path.exists():
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return None

db_service = DatabaseService()
