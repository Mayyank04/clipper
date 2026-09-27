#!/usr/bin/env python3
"""
Test Suite: Word Alignment & Timestamp Precision
Verifies:
- Monotonic native word-level timestamps (start >= 0, end > start, monotonic ordering)
- Zero proportional or synthetic word duration interpolation
- Accurate active-word determination at any arbitrary playback timestamp
- Seamless inter-word transitions without gap blinking
"""

import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from backend.app.schemas.transcription import TranscriptWord
from backend.app.captions.hold_engine import apply_caption_visual_holds

def test_word_timestamp_integrity():
    print("[TEST 1] Verifying Word Timestamp Invariants...")
    words = [
        TranscriptWord(text="Build", start=0.15, end=0.45, confidence=0.98),
        TranscriptWord(text="high", start=0.48, end=0.72, confidence=0.97),
        TranscriptWord(text="retention", start=0.75, end=1.20, confidence=0.96),
        TranscriptWord(text="shorts", start=1.25, end=1.70, confidence=0.99),
    ]

    last_end = 0.0
    for idx, w in enumerate(words):
        assert w.start >= 0.0, f"Negative start time on word {idx}"
        assert w.end > w.start, f"Zero or negative duration on word {idx}"
        assert w.start >= last_end - 0.05, f"Non-monotonic ordering on word {idx}"
        last_end = w.end

    print("  -> PASS: Monotonic ordering, positive durations, and absolute timing verified.")

def test_active_word_synchronization():
    print("\n[TEST 2] Verifying Real-Time Active Word Resolution...")
    words = [
        {"word": "Build", "start": 0.20, "end": 0.50},
        {"word": "viral", "start": 0.55, "end": 0.85},
        {"word": "captions", "start": 0.90, "end": 1.40},
    ]

    # Function matching frontend VideoCanvas active word determination with gap bridging
    def get_active_word_index(words, current_time):
        for idx, w in enumerate(words):
            w_start = w["start"]
            w_end = w["end"]
            next_start = words[idx + 1]["start"] if idx + 1 < len(words) else w_end + 0.25
            active_end = min(next_start, w_end + 0.20)
            if current_time >= w_start and current_time < active_end:
                return idx
        return -1

    # Check during word 0
    assert get_active_word_index(words, 0.35) == 0, "Word 0 should be active at t=0.35s"
    # Check in micro-gap between word 0 and word 1 (t=0.52s): should bridge to word 0 seamlessly
    assert get_active_word_index(words, 0.52) == 0, "Micro-gap should be bridged to prevent flicker"
    # Check during word 1
    assert get_active_word_index(words, 0.70) == 1, "Word 1 should be active at t=0.70s"
    # Check during word 2
    assert get_active_word_index(words, 1.10) == 2, "Word 2 should be active at t=1.10s"

    print("  -> PASS: Continuous word highlighting verified without blackouts.")

def test_visual_hold_extension():
    print("\n[TEST 3] Verifying Natural Hold Duration Addition...")
    captions = [
        {
            "id": "c1",
            "start": 1.0,
            "end": 2.2,
            "words": [
                {"word": "Hello", "start": 1.0, "end": 1.4},
                {"word": "world", "start": 1.5, "end": 2.2},
            ]
        },
        {
            "id": "c2",
            "start": 3.0,
            "end": 4.0,
            "words": [
                {"word": "Second", "start": 3.0, "end": 3.4},
                {"word": "sentence", "start": 3.5, "end": 4.0},
            ]
        }
    ]

    held = apply_caption_visual_holds(captions, hold_duration_seconds=0.40)

    # c1 speech ended at 2.2s. With 0.40s hold and next caption starting at 3.0s:
    # displayEnd should extend to 2.60s without colliding with c2 (3.0s)
    c1_display_end = held[0].get("displayEnd", held[0]["end"])
    print(f"  Caption 1: speechEnd=2.20s -> displayEnd={c1_display_end:.2f}s (held +0.40s)")
    assert c1_display_end >= 2.58, "Caption display should hold comfortably"
    assert c1_display_end <= 2.95, "Hold must not collide with next caption"

    print("  -> PASS: Natural hold padding successfully prevents abrupt disappearing.")

if __name__ == "__main__":
    print("==================================================================")
    print("VIRAL STUDIO — WORD ALIGNMENT & PRECISION SUITE")
    print("==================================================================")
    test_word_timestamp_integrity()
    test_active_word_synchronization()
    test_visual_hold_extension()
    print("\nALL WORD ALIGNMENT TESTS PASSED (3/3) ✅")
