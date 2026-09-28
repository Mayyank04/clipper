#!/usr/bin/env python3
"""
VIRALCLIP STUDIO — PRESET QUALITY VALIDATION TEST SUITE
Conforming to Phase 25 Specifications:
1. Verifies every preset in src/data/creatorPresets80.ts has:
   font, size, weight, textColor, highlightColor, stroke, shadow, position, animation, background, wordMode.
2. Detects duplicate presets (IDs and names).
3. Calculates style similarity across all preset pairs.
4. Fails if more than 2 presets are effectively identical.
"""

import sys
import os
import re
import json
from pathlib import Path

def extract_presets_from_ts(file_path: str):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Match each preset object block inside CREATOR_PRESETS_80 array
    pattern = re.compile(r'\{\s*id:\s*[\'"]([^\'"]+)[\'"],\s*name:\s*[\'"]([^\'"]+)[\'"],(.*?)\n\s*\},', re.DOTALL)
    matches = pattern.findall(content)
    
    presets = []
    for pid, name, rest in matches:
        obj = {"id": pid, "name": name}
        # Extract fields
        for line in rest.split("\n"):
            line = line.strip().rstrip(",")
            if ":" in line:
                key, val = line.split(":", 1)
                key = key.strip()
                val = val.strip().strip("'\"")
                obj[key] = val
        presets.append(obj)
    return presets

def test_visual_presets():
    print("==================================================================")
    print("VIRALCLIP STUDIO — VISUAL PRESET SYSTEM INTEGRITY TEST (PHASE 25)")
    print("==================================================================")

    ts_path = Path("src/data/creatorPresets80.ts")
    assert ts_path.exists(), f"File {ts_path} not found!"

    presets = extract_presets_from_ts(str(ts_path))
    count = len(presets)
    print(f"[TEST 1] Loaded {count} presets from {ts_path}.")
    assert count >= 100, f"Expected at least 100 presets, found {count}"
    print(f"  ✓ PASS: Found {count} presets (>= 100 requirement satisfied).")

    # 1. Attribute completeness check
    print("\n[TEST 2] Verifying mandatory typography and styling attributes...")
    required_keys = [
        ("font", ["fontFamily", "font"]),
        ("size", ["fontSize", "size"]),
        ("weight", ["fontWeight", "weight"]),
        ("textColor", ["textColor", "primaryColor"]),
        ("highlightColor", ["highlightColor"]),
        ("stroke", ["strokeColor", "strokeWidth"]),
        ("shadow", ["hasShadow", "shadowColor", "shadowBlur"]),
        ("position", ["positionY", "position", "alignment"]),
        ("animation", ["animationType", "animation"]),
        ("background", ["backgroundColor", "hasBackground", "backgroundOpacity"]),
        ("wordMode", ["wordMode", "displayMode", "maxWordsPerSegment"]),
    ]

    missing_attr_count = 0
    for p in presets:
        for attr_label, aliases in required_keys:
            if not any(alias in p for alias in aliases):
                print(f"  ✗ WARNING: Preset '{p['id']}' missing attribute: {attr_label}")
                missing_attr_count += 1

    assert missing_attr_count == 0, f"Found {missing_attr_count} missing attributes in presets."
    print("  ✓ PASS: All presets possess complete font, size, weight, colors, stroke, shadow, position, animation, background, and wordMode attributes.")

    # 2. Duplicate detection
    print("\n[TEST 3] Checking for duplicate Preset IDs and Names...")
    ids = [p["id"] for p in presets]
    names = [p["name"] for p in presets]

    duplicate_ids = set([x for x in ids if ids.count(x) > 1])
    duplicate_names = set([x for x in names if names.count(x) > 1])

    assert len(duplicate_ids) == 0, f"Found duplicate IDs: {duplicate_ids}"
    assert len(duplicate_names) == 0, f"Found duplicate Names: {duplicate_names}"
    print(f"  ✓ PASS: All {count} preset IDs and names are strictly unique.")

    # 3. Style similarity matrix
    print("\n[TEST 4] Calculating style similarity across all preset pairs...")
    identical_pairs = []
    comparison_attributes = [
        ("fontFamily", "fontFamily"),
        ("fontSize", "fontSize"),
        ("fontWeight", "fontWeight"),
        ("textColor", "textColor"),
        ("highlightColor", "highlightColor"),
        ("strokeColor", "strokeColor"),
        ("strokeWidth", "strokeWidth"),
        ("animationType", "animationType"),
        ("positionY", "positionY"),
    ]

    for i in range(count):
        for j in range(i + 1, count):
            p1 = presets[i]
            p2 = presets[j]

            matches = sum(1 for k1, k2 in comparison_attributes if p1.get(k1) == p2.get(k2))
            similarity = matches / len(comparison_attributes)

            # Two presets are considered effectively identical if similarity >= 0.95
            if similarity >= 0.95:
                identical_pairs.append((p1["id"], p2["id"], similarity))

    print(f"  Analyzed {count * (count - 1) // 2} unique preset comparison pairs.")
    print(f"  Identical pairs found: {len(identical_pairs)}")
    for p1_id, p2_id, sim in identical_pairs:
        print(f"    - '{p1_id}' and '{p2_id}' similarity: {sim:.2f}")

    assert len(identical_pairs) <= 2, f"Failed: Found {len(identical_pairs)} effectively identical presets (max allowed: 2)."
    print("  ✓ PASS: Style diversity verified! No more than 2 presets are effectively identical.")

    print("\n==================================================================")
    print("✓ PHASE 25: PRESET QUALITY SYSTEM VERIFIED SUCCESSFULLY!")
    print("==================================================================")

if __name__ == "__main__":
    test_visual_presets()
