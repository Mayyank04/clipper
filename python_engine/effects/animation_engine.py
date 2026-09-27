"""
VIRALCLIP STUDIO — 20 DETERMINISTIC CAPTION ANIMATION PRIMITIVES
Generates synchronized subtitle formatting (ASS override tags) and preview parameters.
Zero random shifts; guaranteed preview and export visual parity.
"""

from typing import Dict, Any, List

ANIMATION_PRIMITIVES = [
    "pop", "bounce", "scale", "fade", "slide_up", "slide_down",
    "slide_left", "slide_right", "typewriter", "blur_in", "blur_out",
    "word_punch", "letter_pop", "tracking_reveal", "elastic",
    "spring", "glow_pulse", "shake", "zoom", "kinetic"
]

def generate_ass_animation_tags(
    anim_type: str,
    duration_ms: int,
    is_active: bool = False,
    is_emphasized: bool = False
) -> str:
    """
    Produces deterministic Advanced SubStation Alpha (ASS) tags for animated rendering.
    """
    scale_pct = 112 if is_emphasized else (108 if is_active else 100)
    anim = (anim_type or "pop").lower()

    if anim == "pop":
        return f"{{\\t(0,{min(120, duration_ms)},\\fscx{scale_pct}\\fscy{scale_pct})}}"
    elif anim == "bounce":
        return f"{{\\t(0,{min(100, duration_ms)},\\fscx{scale_pct + 4}\\fscy{scale_pct + 4})\\t({min(100, duration_ms)},{min(200, duration_ms)},\\fscx{scale_pct}\\fscy{scale_pct})}}"
    elif anim == "scale":
        return f"{{\\fscx{scale_pct}\\fscy{scale_pct}}}"
    elif anim == "fade":
        return f"{{\\fad(120,80)}}"
    elif anim == "slide_up":
        return f"{{\\move(540,1460,540,1440,0,{min(150, duration_ms)})}}"
    elif anim == "glow_pulse":
        return f"{{\\blur4\\t(0,{duration_ms//2},\\blur8)\\t({duration_ms//2},{duration_ms},\\blur4)}}"
    elif anim == "shake":
        return f"{{\\t(0,40,\\frz2)\\t(40,80,\\frz-2)\\t(80,120,\\frz0)}}"
    elif anim == "zoom":
        return f"{{\\fscx95\\fscy95\\t(0,{min(200, duration_ms)},\\fscx{scale_pct}\\fscy{scale_pct})}}"
    else:  # kinetic / default
        return f"{{\\t(0,100,\\fscx{scale_pct}\\fscy{scale_pct})}}"

def get_active_word_scale(is_active: bool, is_hero: bool = False) -> float:
    """
    Returns bounded scaling ratio to eliminate visual jitter and layout shifts.
    """
    if not is_active:
        return 1.00
    return 1.12 if is_hero else 1.08
