"""
YouTube Downloader using yt-dlp with real progress reporting
"""

import os
import re
import subprocess
import json
from typing import Optional, Callable, Dict, Any
from ..config import settings

class YouTubeDownloader:
    def __init__(self, yt_dlp_path: str = settings.YT_DLP_PATH):
        self.yt_dlp_path = yt_dlp_path

    def download(
        self,
        url: str,
        output_dir: str,
        on_progress: Optional[Callable[[int, str, Optional[str]], None]] = None
    ) -> Dict[str, Any]:
        """
        Executes yt-dlp, tracks real download percentages, and returns downloaded file info.
        """
        os.makedirs(output_dir, exist_ok=True)
        out_template = os.path.join(output_dir, "%(id)s.%(ext)s")

        cmd = [
            self.yt_dlp_path,
            "--no-playlist",
            "--newline",
            "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "--merge-output-format", "mp4",
            "-o", out_template,
            url
        ]

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        final_filepath = None
        error_message = None

        if process.stdout:
            for line in process.stdout:
                line_str = line.strip()
                # Track progress: [download]  42.5% of ~ 15.20MiB at  2.50MiB/s ETA 00:04
                match = re.search(r'\[download\]\s+([\d\.]+)%\s+of\s+([^\s]+)\s+at\s+([^\s]+)\s+ETA\s+([^\s]+)', line_str)
                if match and on_progress:
                    percent = int(float(match.group(1)))
                    speed = match.group(3)
                    eta = match.group(4)
                    on_progress(percent, f"Downloading: {percent}% at {speed}", eta)
                elif "[Merger]" in line_str and on_progress:
                    on_progress(95, "Merging video and audio streams...", None)
                elif "Destination:" in line_str:
                    parts = line_str.split("Destination:", 1)
                    if len(parts) > 1:
                        final_filepath = parts[1].strip()
                elif "has already been downloaded" in line_str:
                    parts = line_str.split("[download]", 1)
                    if len(parts) > 1:
                        final_filepath = parts[1].replace("has already been downloaded", "").strip()

        process.wait()

        if process.returncode != 0:
            # Map common yt-dlp error patterns
            if "is not a valid URL" in str(error_message):
                code = "INVALID_URL"
            elif "Private video" in str(error_message):
                code = "PRIVATE_VIDEO"
            elif "Sign in to confirm your age" in str(error_message):
                code = "AGE_RESTRICTED"
            else:
                code = "DOWNLOAD_FAILED"
            raise RuntimeError(f"{code}: Failed to download YouTube video from {url}")

        # Locate downloaded MP4 in output dir
        if not final_filepath or not os.path.exists(final_filepath):
            mp4s = [os.path.join(output_dir, f) for f in os.listdir(output_dir) if f.endswith(".mp4")]
            if mp4s:
                final_filepath = mp4s[0]

        if not final_filepath or not os.path.exists(final_filepath):
            raise FileNotFoundError("YouTube download completed but output file was not found on disk.")

        return {
            "filePath": final_filepath,
            "filename": os.path.basename(final_filepath),
            "size": os.path.getsize(final_filepath)
        }

youtube_downloader = YouTubeDownloader()
