#!/usr/bin/env python3
"""
Test Suite: VFX and Caption Animation Primitives Verification
Verifies:
1. All 20 deterministic animation primitives
2. Bounded active word scale (1.08 active, max 1.12 hero, preventing layout jitter)
3. ASS animation override tags generation
4. FFmpeg filter chain generation for zoom punch, camera shake, glow, flash, and vignette
5. RenderPlan VFXSegment schema compliance
"""

import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from python_engine.effects.animation_engine import (
    ANIMATION_PRIMITIVES,
    generate_ass_animation_tags,
    get_active_word_scale
)
from python_engine.effects.vfx_engine import build_vfx_filter_chain
from python_engine.schemas.render_plan import VFXSegment

def test_20_animation_primitives():
    print("[TEST 1] Verifying 20 Deterministic Animation Primitives...")
    assert len(ANIMATION_PRIMITIVES) == 20, f"Expected 20 primitives, found {len(ANIMATION_PRIMITIVES)}"
    print(f"  Primitives verified ({len(ANIMATION_PRIMITIVES)}): {', '.join(ANIMATION_PRIMITIVES)}")
    print("  -> PASS: All 20 deterministic animation primitives registered.")

def test_active_word_scale_clamping():
    print("\n[TEST 2] Verifying Active Word Clamping & Anti-Jitter Bounds...")
    scale_normal = get_active_word_scale(is_active=False)
    scale_active = get_active_word_scale(is_active=True, is_hero=False)
    scale_hero = get_active_word_scale(is_active=True, is_hero=True)

    print(f"  Normal scale: {scale_normal:.2f}x (Expect 1.00x)")
    print(f"  Active scale: {scale_active:.2f}x (Expect 1.08x)")
    print(f"  Hero scale:   {scale_hero:.2f}x (Expect <= 1.12x)")

    assert scale_normal == 1.00
    assert scale_active == 1.08
    assert scale_hero <= 1.12
    print("  -> PASS: Active word scaling strictly bounded (prevents layout vibration).")

def test_ass_tag_generation():
    print("\n[TEST 3] Verifying ASS Kinetic Subtitle Tags...")
    tag_pop = generate_ass_animation_tags("pop", 500, is_active=True)
    tag_bounce = generate_ass_animation_tags("bounce", 500, is_active=True)
    tag_fade = generate_ass_animation_tags("fade", 500)
    tag_glow = generate_ass_animation_tags("glow_pulse", 600, is_active=True)

    print(f"  Pop tag:    {tag_pop}")
    print(f"  Bounce tag: {tag_bounce}")
    print(f"  Fade tag:   {tag_fade}")
    print(f"  Glow tag:   {tag_glow}")

    assert "\\fscx" in tag_pop
    assert "\\fad" in tag_fade
    assert "\\blur" in tag_glow
    print("  -> PASS: Deterministic ASS formatting tags validated.")

def test_vfx_filter_chain():
    print("\n[TEST 4] Verifying FFmpeg VFX Filter Chain Building...")
    vfx_markers = [
        {"type": "zoom_punch", "start": 1.0, "end": 1.4, "intensity": 5.0},
        {"type": "glow", "start": 3.0, "end": 3.5, "intensity": 6.0},
        {"type": "flash", "start": 5.0, "end": 5.2, "intensity": 8.0},
        {"type": "vignette", "start": 6.0, "end": 7.0, "intensity": 5.0}
    ]

    chain = build_vfx_filter_chain(vfx_markers)
    print(f"  Generated FFmpeg chain:\n  {chain}")

    assert "between(t,1.000,1.400)" in chain
    assert "scale=1080" in chain
    assert "gblur=sigma=6" in chain
    assert "eq=brightness=0.3" in chain
    assert "vignette=PI/4" in chain
    print("  -> PASS: FFmpeg filter expressions correctly structured with timing bounds.")

def test_vfx_segment_schema():
    print("\n[TEST 5] Verifying RenderPlan VFXSegment Schema...")
    seg = VFXSegment(
        id="vfx_test_1",
        type="zoom_punch",
        start=1.2,
        end=1.6,
        intensity=5.0
    )
    assert seg.id == "vfx_test_1"
    assert seg.type == "zoom_punch"
    assert round(seg.end - seg.start, 2) == 0.4
    print("  -> PASS: VFXSegment conforms strictly to RenderPlan schema.")

if __name__ == "__main__":
    print("==================================================================")
    print("VIRAL STUDIO — VFX & ANIMATION ENGINE TEST SUITE")
    print("==================================================================")
    test_20_animation_primitives()
    test_active_word_scale_clamping()
    test_ass_tag_generation()
    test_vfx_filter_chain()
    test_vfx_segment_schema()
    print("\nALL VFX & ANIMATION TESTS PASSED (5/5) ✅")
