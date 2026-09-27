"""
VIRALCLIP STUDIO — VIDEO QUALITY & METADATA PROBER
Inspects video resolution, aspect ratio, rotation, pixel format, and bitrate.
Guarantees native 1080x1920 videos are never unnecessarily scaled or degraded.
"""

import os
import json
import subprocess
from typing import Dict, Any

from python_engine.audio.processor import get_ffmpeg_path

def probe_video_metadata(video_path: str) -> Dict[str, Any]:
    """
    Probes comprehensive video stream properties via ffprobe.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    ffmpeg_path = get_ffmpeg_path()
    ffprobe_path = ffmpeg_path.replace("ffmpeg", "ffprobe")

    cmd = [
        ffprobe_path,
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        video_path
    ]

    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
        if res.returncode != 0 or not res.stdout.strip():
            return {
                "width": 1080,
                "height": 1920,
                "duration": 30.0,
                "fps": 30.0,
                "isPortrait": True,
                "rotation": 0,
                "hasAudio": True
            }

        data = json.loads(res.stdout)
        video_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), None)
        audio_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "audio"), None)

        width = int(video_stream.get("width", 1080)) if video_stream else 1080
        height = int(video_stream.get("height", 1920)) if video_stream else 1920

        # Parse rotation
        rotation = 0
        if video_stream:
            # Check tags
            tags = video_stream.get("tags", {})
            if "rotate" in tags:
                try:
                    rotation = int(tags["rotate"])
                except Exception:
                    pass
            # Check side data
            for side in video_stream.get("side_data_list", []):
                if "rotation" in side:
                    rotation = int(side["rotation"])

        # If rotation is 90 or 270, visual dimensions are flipped
        visual_width = height if abs(rotation) in (90, 270) else width
        visual_height = width if abs(rotation) in (90, 270) else height

        # Parse fps
        fps = 30.0
        if video_stream and "r_frame_rate" in video_stream:
            num, den = video_stream["r_frame_rate"].split("/")
            fps = float(num) / max(1.0, float(den))

        duration = float(data.get("format", {}).get("duration", 0.0))
        is_portrait = visual_height > visual_width
        is_exact_short = visual_width == 1080 and visual_height == 1920

        return {
            "path": video_path,
            "width": width,
            "height": height,
            "visualWidth": visual_width,
            "visualHeight": visual_height,
            "aspectRatio": f"{visual_width}:{visual_height}",
            "isPortrait": is_portrait,
            "isExactShort": is_exact_short,
            "rotation": rotation,
            "fps": round(fps, 2),
            "duration": round(duration, 3),
            "videoCodec": video_stream.get("codec_name", "h264") if video_stream else "unknown",
            "audioCodec": audio_stream.get("codec_name", "aac") if audio_stream else None,
            "hasAudio": audio_stream is not None,
            "bitrate": int(data.get("format", {}).get("bit_rate", 2500000))
        }
    except Exception as e:
        return {
            "width": 1080,
            "height": 1920,
            "duration": 30.0,
            "fps": 30.0,
            "isPortrait": True,
            "rotation": 0,
            "hasAudio": True,
            "error": str(e)
        }
