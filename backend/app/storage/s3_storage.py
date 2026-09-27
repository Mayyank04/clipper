"""
S3 / Cloudflare R2 / MinIO Storage Client with Local Fallback
"""

import os
import shutil
from pathlib import Path
from typing import Optional, Dict, Any
from ..config import settings

class StorageService:
    def __init__(self):
        self.endpoint = settings.STORAGE_ENDPOINT
        self.bucket = settings.STORAGE_BUCKET
        self.access_key = settings.STORAGE_ACCESS_KEY
        self.secret_key = settings.STORAGE_SECRET_KEY
        self.region = settings.STORAGE_REGION
        self.local_dir = settings.LOCAL_STORAGE_DIR
        self._s3_client = None

        if self.endpoint and self.access_key and self.secret_key:
            try:
                import boto3
                from botocore.client import Config
                self._s3_client = boto3.client(
                    's3',
                    endpoint_url=self.endpoint,
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region,
                    config=Config(signature_version='s3v4', s3={'addressing_style': 'path'})
                )
                print(f"[StorageService] Connected to remote S3: {self.endpoint} (bucket: {self.bucket})")
            except Exception as e:
                print(f"[StorageService] Failed to initialize S3 client: {e}. Falling back to disk.")

    def is_remote(self) -> bool:
        return self._s3_client is not None

    def get_signed_upload_url(self, key: str, content_type: str = "video/mp4", expires_in: int = 3600) -> str:
        if self._s3_client:
            return self._s3_client.generate_presigned_url(
                'put_object',
                Params={'Bucket': self.bucket, 'Key': key, 'ContentType': content_type},
                ExpiresIn=expires_in
            )
        # Local direct endpoint
        return f"/api/media/upload?key={key}"

    def get_signed_download_url(self, key: str, expires_in: int = 3600) -> str:
        if self._s3_client:
            return self._s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': key},
                ExpiresIn=expires_in
            )
        return f"/data/storage/{key}"

    def upload_file(self, local_path: str, key: str, content_type: Optional[str] = None):
        if self._s3_client:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            self._s3_client.upload_file(local_path, self.bucket, key, ExtraArgs=extra_args)
        else:
            dest = self.local_dir / key
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(local_path, dest)

    def download_file(self, key: str, local_target_path: str):
        if self._s3_client:
            self._s3_client.download_file(self.bucket, key, local_target_path)
        else:
            src = self.local_dir / key
            if not src.exists():
                raise FileNotFoundError(f"Storage object '{key}' not found on disk: {src}")
            Path(local_target_path).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, local_target_path)

    def exists(self, key: str) -> bool:
        if self._s3_client:
            try:
                self._s3_client.head_object(Bucket=self.bucket, Key=key)
                return True
            except Exception:
                return False
        return (self.local_dir / key).exists()

    def delete(self, key: str):
        if self._s3_client:
            try:
                self._s3_client.delete_object(Bucket=self.bucket, Key=key)
            except Exception:
                pass
        else:
            target = self.local_dir / key
            if target.exists():
                target.unlink()

storage_service = StorageService()
