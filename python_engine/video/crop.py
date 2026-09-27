"""
VIRALCLIP STUDIO — SMART 9:16 CROP & FRAMING ENGINE
Calculates optimal portrait video composition using Lanczos high-quality scaling.
Respects rotation metadata and preserves native 1080x1920 footage without degradation.
"""

from typing import Dict, Any

def build_9_16_video_filter(meta: Dict[str, Any], crop_mode: str = "center") -> str:
    """
    Constructs FFmpeg video filter for 1080x1920 9:16 composition.
    Uses Lanczos scaling to preserve sharpness without distorting aspect ratios.
    """
    filters = []

    # 1. Normalize rotation if needed
    rot = meta.get("rotation", 0)
    if rot == 90:
        filters.append("transpose=1")
    elif rot == 180:
        filters.append("transpose=2,transpose=2")
    elif rot == 270 or rot == -90:
        filters.append("transpose=2")

    # 2. Check if already exact 1080x1920
    is_exact = meta.get("isExactShort", False)
    if is_exact and rot == 0:
        # Native 1080x1920 footage needs zero scaling/cropping!
        return ",".join(filters) if filters else "null"

    # 3. Lanczos scale to fill 1080x1920
    filters.append("scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos")

    # 4. Crop to exact 9:16 canvas
    mode = (crop_mode or "center").lower()
    if mode == "top":
        filters.append("crop=1080:1920:(in_w-1080)/2:0")
    else:  # "center" or "auto"
        filters.append("crop=1080:1920:(in_w-1080)/2:(in_h-1920)/2")

    return ",".join(filters)
