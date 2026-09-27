"""
Caption Animation Presets Engine
50+ deterministic animation presets across:
WORD, LINE, CHARACTER, KINETIC, EMPHASIS

Parameters:
- duration (s)
- delay (s)
- easing (cubic-bezier / linear / ease-out)
- distance (px)
- scale (multiplier)
- blur (px)
- rotation (deg)
- opacity (0.0 - 1.0)
"""

from typing import Dict, Any, List

ANIMATION_PRESETS: List[Dict[str, Any]] = [
    # --- WORD LEVEL ANIMATIONS (1-10) ---
    {"id": "word_pop_subtle", "name": "Word Pop Subtle", "category": "WORD", "scale": 1.06, "duration": 0.16, "easing": "ease-out", "opacity": 1.0},
    {"id": "word_pop_spring", "name": "Word Pop Spring", "category": "WORD", "scale": 1.08, "duration": 0.22, "easing": "cubic-bezier(0.34, 1.56, 0.64, 1)", "opacity": 1.0},
    {"id": "word_bounce_up", "name": "Word Bounce Up", "category": "WORD", "distance": -12, "scale": 1.05, "duration": 0.20, "easing": "ease-out"},
    {"id": "word_punch_impact", "name": "Word Punch Impact", "category": "WORD", "scale": 1.08, "duration": 0.12, "easing": "cubic-bezier(0, 0, 0.2, 1)"},
    {"id": "word_fade_in", "name": "Word Fade In", "category": "WORD", "duration": 0.18, "opacity": 1.0, "easing": "linear"},
    {"id": "word_blur_reveal", "name": "Word Blur Reveal", "category": "WORD", "blur": 8, "duration": 0.24, "easing": "ease-out"},
    {"id": "word_scale_drop", "name": "Word Scale Drop", "category": "WORD", "scale": 1.15, "distance": -8, "duration": 0.18, "easing": "ease-out"},
    {"id": "word_slide_left", "name": "Word Slide Left", "category": "WORD", "distance": 18, "duration": 0.20, "easing": "cubic-bezier(0.16, 1, 0.3, 1)"},
    {"id": "word_slide_right", "name": "Word Slide Right", "category": "WORD", "distance": -18, "duration": 0.20, "easing": "cubic-bezier(0.16, 1, 0.3, 1)"},
    {"id": "word_glow_pulse", "name": "Word Glow Pulse", "category": "WORD", "duration": 0.22, "scale": 1.04, "easing": "ease-in-out"},

    # --- LINE LEVEL ANIMATIONS (11-20) ---
    {"id": "line_slide_up", "name": "Line Slide Up", "category": "LINE", "distance": 28, "duration": 0.28, "easing": "cubic-bezier(0.16, 1, 0.3, 1)"},
    {"id": "line_slide_down", "name": "Line Slide Down", "category": "LINE", "distance": -28, "duration": 0.28, "easing": "cubic-bezier(0.16, 1, 0.3, 1)"},
    {"id": "line_fade_smooth", "name": "Line Smooth Fade", "category": "LINE", "duration": 0.30, "opacity": 1.0, "easing": "ease-out"},
    {"id": "line_blur_in", "name": "Line Blur In", "category": "LINE", "blur": 12, "duration": 0.32, "easing": "ease-out"},
    {"id": "line_scale_reveal", "name": "Line Scale Reveal", "category": "LINE", "scale": 0.92, "duration": 0.25, "easing": "cubic-bezier(0.34, 1.56, 0.64, 1)"},
    {"id": "line_pop_center", "name": "Line Pop Center", "category": "LINE", "scale": 1.04, "duration": 0.22, "easing": "ease-out"},
    {"id": "line_stagger_up", "name": "Line Stagger Up", "category": "LINE", "distance": 20, "delay": 0.05, "duration": 0.24, "easing": "ease-out"},
    {"id": "line_roll_in", "name": "Line Roll In", "category": "LINE", "rotation": 6, "distance": 15, "duration": 0.28, "easing": "ease-out"},
    {"id": "line_wipe_left", "name": "Line Wipe Left", "category": "LINE", "duration": 0.25, "easing": "linear"},
    {"id": "line_wipe_right", "name": "Line Wipe Right", "category": "LINE", "duration": 0.25, "easing": "linear"},

    # --- CHARACTER LEVEL ANIMATIONS (21-30) ---
    {"id": "char_typewriter_classic", "name": "Typewriter Classic", "category": "CHARACTER", "delay": 0.035, "duration": 0.05, "easing": "step-end"},
    {"id": "char_typing_smooth", "name": "Typing Smooth", "category": "CHARACTER", "delay": 0.030, "duration": 0.08, "easing": "ease-out"},
    {"id": "char_fade_cascade", "name": "Character Fade Cascade", "category": "CHARACTER", "delay": 0.025, "duration": 0.12, "opacity": 1.0},
    {"id": "char_pop_letters", "name": "Letter Pop", "category": "CHARACTER", "scale": 1.15, "delay": 0.03, "duration": 0.10, "easing": "ease-out"},
    {"id": "char_bounce_letters", "name": "Letter Bounce", "category": "CHARACTER", "distance": -10, "delay": 0.03, "duration": 0.14, "easing": "cubic-bezier(0.34, 1.56, 0.64, 1)"},
    {"id": "char_blur_cascade", "name": "Character Blur Cascade", "category": "CHARACTER", "blur": 6, "delay": 0.02, "duration": 0.15, "easing": "ease-out"},
    {"id": "char_rotate_in", "name": "Character Rotate In", "category": "CHARACTER", "rotation": 15, "delay": 0.03, "duration": 0.12, "easing": "ease-out"},
    {"id": "char_drop_letters", "name": "Letter Drop", "category": "CHARACTER", "distance": -20, "delay": 0.025, "duration": 0.14, "easing": "ease-in"},
    {"id": "char_scale_up", "name": "Letter Scale Up", "category": "CHARACTER", "scale": 0.5, "delay": 0.02, "duration": 0.12, "easing": "ease-out"},
    {"id": "char_glitch_flicker", "name": "Character Flicker", "category": "CHARACTER", "delay": 0.02, "duration": 0.08, "opacity": 0.8},

    # --- KINETIC ANIMATIONS (31-40) ---
    {"id": "kinetic_karaoke_fill", "name": "Karaoke Sweep", "category": "KINETIC", "duration": 0.20, "easing": "linear"},
    {"id": "kinetic_highlight_sweep", "name": "Highlight Sweep", "category": "KINETIC", "duration": 0.24, "easing": "cubic-bezier(0.16, 1, 0.3, 1)"},
    {"id": "kinetic_spring_overshoot", "name": "Spring Overshoot", "category": "KINETIC", "scale": 1.10, "duration": 0.35, "easing": "cubic-bezier(0.175, 0.885, 0.32, 1.275)"},
    {"id": "kinetic_elastic_wobble", "name": "Elastic Wobble", "category": "KINETIC", "scale": 1.08, "duration": 0.40, "easing": "cubic-bezier(0.68, -0.55, 0.265, 1.55)"},
    {"id": "kinetic_shake_short", "name": "Punch Shake", "category": "KINETIC", "distance": 4, "duration": 0.15, "easing": "ease-in-out"},
    {"id": "kinetic_glitch_burst", "name": "Glitch Burst", "category": "KINETIC", "distance": 6, "duration": 0.14, "easing": "step-end"},
    {"id": "kinetic_wave_ripple", "name": "Wave Ripple", "category": "KINETIC", "distance": -8, "duration": 0.30, "easing": "ease-in-out"},
    {"id": "kinetic_pulse_thump", "name": "Pulse Thump", "category": "KINETIC", "scale": 1.07, "duration": 0.18, "easing": "ease-out"},
    {"id": "kinetic_tilt_snap", "name": "Tilt Snap", "category": "KINETIC", "rotation": -4, "duration": 0.18, "easing": "ease-out"},
    {"id": "kinetic_zoom_surge", "name": "Zoom Surge", "category": "KINETIC", "scale": 1.12, "duration": 0.25, "easing": "ease-out"},

    # --- EMPHASIS ANIMATIONS (41-52) ---
    {"id": "emphasis_color_flash", "name": "Color Flash", "category": "EMPHASIS", "duration": 0.16, "scale": 1.05},
    {"id": "emphasis_box_expand", "name": "Box Expansion", "category": "EMPHASIS", "scale": 1.04, "duration": 0.20, "easing": "ease-out"},
    {"id": "emphasis_underline_draw", "name": "Underline Draw", "category": "EMPHASIS", "duration": 0.22, "easing": "ease-out"},
    {"id": "emphasis_glow_bloom", "name": "Glow Bloom", "category": "EMPHASIS", "blur": 10, "duration": 0.25, "easing": "ease-out"},
    {"id": "emphasis_shadow_spread", "name": "Shadow Spread", "category": "EMPHASIS", "blur": 8, "duration": 0.20, "easing": "ease-out"},
    {"id": "emphasis_stamp_down", "name": "Stamp Down", "category": "EMPHASIS", "scale": 1.20, "distance": -10, "duration": 0.14, "easing": "ease-in"},
    {"id": "emphasis_heartbeat", "name": "Double Heartbeat", "category": "EMPHASIS", "scale": 1.06, "duration": 0.30, "easing": "ease-in-out"},
    {"id": "emphasis_spotlight", "name": "Spotlight Focus", "category": "EMPHASIS", "scale": 1.05, "duration": 0.24, "easing": "ease-out"},
    {"id": "emphasis_outline_pulse", "name": "Outline Pulse", "category": "EMPHASIS", "scale": 1.04, "duration": 0.18, "easing": "ease-out"},
    {"id": "emphasis_drift_up", "name": "Slow Drift Up", "category": "EMPHASIS", "distance": -6, "duration": 0.45, "easing": "ease-out"},
    {"id": "emphasis_snap_tight", "name": "Snap Tight", "category": "EMPHASIS", "scale": 1.03, "duration": 0.10, "easing": "linear"},
    {"id": "emphasis_flare_accent", "name": "Lens Flare Accent", "category": "EMPHASIS", "scale": 1.08, "duration": 0.22, "easing": "ease-out"}
]

def get_animation_preset(anim_id: str) -> Dict[str, Any]:
    """Finds an animation preset by ID or defaults to word_pop_subtle."""
    for anim in ANIMATION_PRESETS:
        if anim["id"] == anim_id:
            return anim
    return ANIMATION_PRESETS[0]
