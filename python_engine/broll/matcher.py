"""
VIRALCLIP STUDIO — B-ROLL MATCHER & CATALOG
"""

import os
from typing import Dict, Any, List, Optional
from python_engine.broll.analyzer import analyze_broll_opportunities, BROLL_KEYWORD_MAP

def get_available_broll_library() -> List[Dict[str, Any]]:
    """Lists all available local B-roll video and image assets."""
    broll_root = os.path.join(os.getcwd(), "public", "assets", "broll")
    if not os.path.exists(broll_root):
        return []

    assets = []
    for f in sorted(os.listdir(broll_root)):
        if f.startswith('.'):
            continue
        ext = os.path.splitext(f)[1].lower()
        if ext in ('.mp4', '.mov', '.webm', '.jpg', '.jpeg', '.png', '.webp'):
            category = f.split('_')[0] if '_' in f else "general"
            assets.append({
                "filename": f,
                "path": f"/assets/broll/{f}",
                "fullPath": os.path.join(broll_root, f),
                "type": "video" if ext in ('.mp4', '.mov', '.webm') else "image",
                "category": category
            })
    return assets
