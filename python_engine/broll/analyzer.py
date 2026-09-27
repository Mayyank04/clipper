"""
VIRALCLIP STUDIO — B-ROLL SEMANTIC ANALYZER & MATCHER
Analyzes transcript text for visual entities, topics, and actions.
Maps detected concepts to local B-roll assets in public/assets/broll/ or user uploads.
"""

import os
import re
from typing import List, Dict, Any, Optional

BROLL_KEYWORD_MAP = {
    "technology": ["coding_broll.mp4", "ai_interface_broll.mp4", "ai_interface.jpg"],
    "coding": ["coding_broll.mp4", "coding.jpg"],
    "ai": ["ai_interface_broll.mp4", "ai_interface.jpg"],
    "business": ["workspace_broll.mp4", "strategy.jpg", "workspace.jpg"],
    "money": ["analytics_growth_broll.mp4", "analytics.jpg"],
    "analytics": ["analytics_growth_broll.mp4", "analytics.jpg"],
    "growth": ["analytics_growth_broll.mp4", "analytics.jpg"],
    "city": ["city_skyline_broll.mp4", "city_skyline.jpg"],
    "travel": ["city_skyline_broll.mp4", "city_skyline.jpg"],
    "creator": ["creator_studio_broll.mp4", "camera.jpg"],
    "video": ["creator_studio_broll.mp4", "camera.jpg"],
    "animal": ["animal_dog_broll.mp4"],
    "pet": ["animal_dog_broll.mp4"],
    "workspace": ["workspace_broll.mp4", "workspace.jpg"],
}

def analyze_broll_opportunities(transcript_segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Scans transcript segments for strong visual keywords and timestamps.
    """
    suggestions = []
    cwd = os.getcwd()
    broll_root = os.path.join(cwd, "public", "assets", "broll")

    for seg in transcript_segments:
        text = seg.get("text", "").lower()
        seg_start = float(seg.get("start", 0.0))
        seg_end = float(seg.get("end", seg_start + 3.0))

        # Check keyword matches
        for kw, asset_candidates in BROLL_KEYWORD_MAP.items():
            if re.search(rf"\b{kw}\b", text):
                # Find matching existing asset
                chosen_asset = ""
                for candidate in asset_candidates:
                    p = os.path.join(broll_root, candidate)
                    if os.path.exists(p):
                        chosen_asset = f"/assets/broll/{candidate}"
                        break

                if chosen_asset:
                    suggestions.append({
                        "id": f"broll_{len(suggestions) + 1}",
                        "start": round(seg_start, 2),
                        "end": round(min(seg_start + 4.0, seg_end + 1.0), 2),
                        "keyword": kw.capitalize(),
                        "reason": f"Spoken context: \"{seg.get('text', '')[:40]}...\"",
                        "confidence": 0.92,
                        "assetPath": chosen_asset,
                        "placement": "fullscreen",
                        "transition": "fade",
                        "transitionDuration": 0.25
                    })
                break

    return suggestions
