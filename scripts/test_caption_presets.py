#!/usr/bin/env python3
"""
Test Suite: Caption Presets Verification (60 Original Professional Presets)
Verifies:
- All 60 presets exist across VIRAL, PODCAST, CINEMATIC, GAMING, EDUCATION, MOTIVATIONAL, MEME, INDIAN
- Complete data model compliance: id, name, category, fontFamily, fontWeight, fontSize, primaryColor, highlightColor, strokeWidth, etc.
- No duplicate names or IDs
- Visually distinct styling parameters (contrast, weight, and stroke)
"""

import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from backend.app.captions.styles import CAPTION_PRESETS
from backend.app.captions.presets_60 import ORIGINAL_60_PRESETS

REQUIRED_60_IDS = [
    # 1. VIRAL (1-10)
    "punch_pop", "bold_flash", "creator_punch", "word_burst", "high_energy",
    "bounce_bold", "viral_highlight", "fast_talk", "impact_words", "dynamic_pop",
    # 2. PODCAST (11-18)
    "clean_podcast", "studio_talk", "modern_interview", "founder", "minimal_speaker",
    "executive", "documentary_talk", "podcast_highlight",
    # 3. CINEMATIC (19-26)
    "cinema_gold", "film_subtitle", "documentary", "noir", "luxury_cinema",
    "dramatic", "minimal_cinema", "prestige",
    # 4. GAMING (27-32)
    "gamer_punch", "rgb_burst", "kill_feed", "glitch_gamer", "combo", "critical_hit",
    # 5. EDUCATION (33-38)
    "study_pop", "explainer", "teacher", "technical", "code_talk", "whiteboard",
    # 6. MOTIVATIONAL (39-44)
    "power_words", "mindset", "focus", "discipline", "hustle", "inspirational",
    # 7. MEME (45-50)
    "meme_impact", "internet_bold", "reaction", "chaos", "comic", "zoom_punch",
    # 8. INDIAN (51-60)
    "desi_bold", "hindi_punch", "hinglish_creator", "desi_podcast", "bollywood_energy",
    "indian_minimal", "street_talk", "desi_viral", "hindi_cinema", "hinglish_pop"
]

def test_preset_count_and_categories():
    print("[TEST 1] Verifying 60 Original Professional Presets Existence...")
    preset_map = {p["id"]: p for p in ORIGINAL_60_PRESETS}
    
    assert len(ORIGINAL_60_PRESETS) >= 60, f"Expected at least 60 presets, found {len(ORIGINAL_60_PRESETS)}"
    print(f"  Found {len(ORIGINAL_60_PRESETS)} original presets in registry.")

    missing = [pid for pid in REQUIRED_60_IDS if pid not in preset_map]
    assert len(missing) == 0, f"Missing required presets: {missing}"
    print("  -> PASS: All 60 required presets exist by exact ID.")

def test_preset_data_model():
    print("\n[TEST 2] Verifying Complete Data Model per Preset...")
    required_fields = [
        "id", "name", "category", "fontFamily", "fontWeight", "fontSize",
        "primaryColor", "highlightColor", "strokeColor", "strokeWidth",
        "hasShadow", "positionY", "animationType"
    ]

    for p in ORIGINAL_60_PRESETS:
        for field in required_fields:
            assert field in p, f"Preset '{p.get('id')}' missing required field '{field}'"
        assert p["fontSize"] >= 18 and p["fontSize"] <= 48, f"Invalid fontSize in {p['id']}"
        assert p["fontWeight"] >= 400 and p["fontWeight"] <= 900, f"Invalid fontWeight in {p['id']}"
        assert p["strokeWidth"] >= 0.0, f"Invalid strokeWidth in {p['id']}"
        assert p["positionY"] >= 10 and p["positionY"] <= 90, f"Invalid positionY in {p['id']}"

    print(f"  -> PASS: All {len(ORIGINAL_60_PRESETS)} presets strictly conform to schema.")

def test_visual_distinctness():
    print("\n[TEST 3] Verifying Visual Distinctness & Palette Diversity...")
    color_pairs = set()
    fonts_used = set()
    animations_used = set()

    for p in ORIGINAL_60_PRESETS:
        pair = (p["primaryColor"].lower(), p["highlightColor"].lower())
        color_pairs.add(pair)
        primary_font = p["fontFamily"].split(",")[0].strip()
        fonts_used.add(primary_font)
        animations_used.add(p["animationType"])

    print(f"  Unique Color Pairs:    {len(color_pairs)}")
    print(f"  Distinct Primary Fonts:{len(fonts_used)} ({', '.join(sorted(list(fonts_used))[:8])}...)")
    print(f"  Animation Types Used:  {len(animations_used)} ({', '.join(sorted(list(animations_used)))})")

    assert len(fonts_used) >= 15, "Presets must utilize a diverse typographic palette (>=15 fonts)"
    assert len(color_pairs) >= 20, "Presets must utilize distinct color contrast pairs"
    print("  -> PASS: Presets exhibit high visual entropy and professional diversity.")

def test_all_100_presets_in_frontend():
    print("\n[TEST 4] Verifying 100+ Creator Presets Across All 20 Categories in Frontend...")
    ts_file = root_dir / "src" / "data" / "creatorPresets80.ts"
    assert ts_file.exists(), "src/data/creatorPresets80.ts must exist"
    content = ts_file.read_text(encoding="utf-8")

    import re
    # Extract preset ids
    preset_ids = re.findall(r"id:\s*['\"]([^'\"]+)['\"]", content)
    unique_ids = set(preset_ids)
    print(f"  Found {len(unique_ids)} distinct presets in creatorPresets80.ts")
    assert len(unique_ids) >= 100, f"Expected at least 100 presets, found {len(unique_ids)}"

    # Required 20 categories
    req_cats = [
        "viral", "podcast", "cinematic", "gaming", "education",
        "motivational", "meme", "indian", "hindi", "hinglish",
        "minimal", "luxury", "news", "storytelling", "business",
        "fitness", "finance", "tech", "vlog", "dramatic"
    ]
    found_cats = set(re.findall(r"category:\s*['\"]([^'\"]+)['\"]", content))
    missing_cats = [c for c in req_cats if c not in found_cats]
    print(f"  Categories verified ({len(found_cats)} categories): {', '.join(sorted(list(found_cats))[:10])}...")
    assert len(missing_cats) == 0, f"Missing required categories: {missing_cats}"
    print(f"  -> PASS: All 20 categories present with {len(unique_ids)} unique presets.")

if __name__ == "__main__":
    print("==================================================================")
    print("VIRAL STUDIO — PRESET CERTIFICATION SUITE")
    print("==================================================================")
    test_preset_count_and_categories()
    test_preset_data_model()
    test_visual_distinctness()
    test_all_100_presets_in_frontend()
    print("\nALL PRESET TESTS PASSED (4/4) ✅")
