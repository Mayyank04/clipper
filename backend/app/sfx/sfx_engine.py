"""
SFX Audio Engine
Manages sound effects:
impact, whoosh, hit, riser, pop, glitch, click, chime, bass, transition
"""

from typing import Dict, Any, List

SFX_CATALOG: List[Dict[str, Any]] = [
    {"id": "whoosh_fast", "name": "Fast Whoosh", "category": "whoosh", "duration": 0.45, "defaultVolume": 0.8},
    {"id": "impact_deep", "name": "Cinematic Thud", "category": "impact", "duration": 0.85, "defaultVolume": 0.9},
    {"id": "hit_punch", "name": "Punch Hit", "category": "hit", "duration": 0.35, "defaultVolume": 0.85},
    {"id": "pop_bubble", "name": "Pop Accent", "category": "pop", "duration": 0.25, "defaultVolume": 0.75},
    {"id": "riser_tension", "name": "Tension Riser", "category": "riser", "duration": 1.50, "defaultVolume": 0.7},
    {"id": "glitch_short", "name": "Digital Glitch", "category": "glitch", "duration": 0.40, "defaultVolume": 0.75},
    {"id": "click_mouse", "name": "Modern Snap", "category": "click", "duration": 0.15, "defaultVolume": 0.7},
    {"id": "chime_magic", "name": "Success Chime", "category": "chime", "duration": 0.60, "defaultVolume": 0.8},
    {"id": "bass_drop", "name": "Sub Bass Drop", "category": "bass", "duration": 1.20, "defaultVolume": 0.85},
    {"id": "transition_swoosh", "name": "Scene Swipe", "category": "transition", "duration": 0.55, "defaultVolume": 0.8}
]

def get_sfx_metadata(sfx_id: str) -> Dict[str, Any]:
    for sfx in SFX_CATALOG:
        if sfx["id"] == sfx_id:
            return sfx
    return SFX_CATALOG[0]
