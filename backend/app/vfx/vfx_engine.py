"""
VFX Video Effects Engine
zoom_punch, shake, glow, motion_blur, glitch, particles, callout, flash, speed_ramp
"""

from typing import Dict, Any, List

VFX_CATALOG: List[Dict[str, Any]] = [
    {"id": "zoom_punch", "name": "Zoom Punch", "intensity": 1.15, "duration": 0.35},
    {"id": "shake", "name": "Camera Shake", "intensity": 0.8, "duration": 0.25},
    {"id": "glow", "name": "Neon Glow Bloom", "intensity": 0.6, "duration": 0.50},
    {"id": "motion_blur", "name": "Directional Blur", "intensity": 0.7, "duration": 0.30},
    {"id": "glitch", "name": "RGB Split Glitch", "intensity": 0.9, "duration": 0.20},
    {"id": "flash", "name": "White Flash Impact", "intensity": 1.0, "duration": 0.15},
    {"id": "callout", "name": "Key Highlight Callout", "intensity": 0.5, "duration": 1.20},
    {"id": "speed_ramp", "name": "Velocity Speed Ramp", "intensity": 1.5, "duration": 0.80}
]

def get_vfx_metadata(vfx_id: str) -> Dict[str, Any]:
    for vfx in VFX_CATALOG:
        if vfx["id"] == vfx_id:
            return vfx
    return VFX_CATALOG[0]
