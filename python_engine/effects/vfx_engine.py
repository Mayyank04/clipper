"""
VIRALCLIP STUDIO — VFX FILTER ENGINE
Generates FFmpeg filter complex expressions for camera punches, glows, shakes, flashes, and glitches.
"""

from typing import Dict, Any, List

def build_vfx_filter_chain(vfx_segments: List[Dict[str, Any]]) -> str:
    """
    Transforms timeline VFX markers into synchronized FFmpeg filter directives.
    """
    if not vfx_segments:
        return ""

    filters = []
    for item in vfx_segments:
        vtype = item.get("type", "").lower()
        start = float(item.get("start", 0.0))
        end = float(item.get("end", start + 1.0))
        intensity = float(item.get("intensity", 5.0))

        enable_expr = f"between(t,{start:.3f},{end:.3f})"

        if vtype == "zoom_punch":
            zoom_amt = 1.0 + (intensity * 0.02)
            filters.append(f"scale=1080*{zoom_amt}:1920*{zoom_amt}:enable='{enable_expr}',crop=1080:1920:enable='{enable_expr}'")
        elif vtype == "flash":
            filters.append(f"eq=brightness=0.3:enable='{enable_expr}'")
        elif vtype == "glow":
            filters.append(f"gblur=sigma={int(intensity)}:enable='{enable_expr}'")
        elif vtype == "vignette":
            filters.append(f"vignette=PI/4:enable='{enable_expr}'")
        elif vtype == "shake":
            shift = int(intensity * 2)
            filters.append(f"crop=1080:1920:{shift}*sin(t*50):enable='{enable_expr}'")

    return ",".join(filters)
