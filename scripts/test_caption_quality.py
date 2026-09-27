#!/usr/bin/env python3
"""
Test Suite: Caption Quality & Hallucination Filter
Specifically tests:
- Purging decoder repeat loops (e.g. "They They They If" -> "They If")
- Preserving legitimate human repetitions (e.g. "no, no, no", "wait, wait")
- Filtering non-speech acoustic tokens ([music], [applause], ♪)
- Monotonic timestamp validation (start >= 0, end > start, start <= end)
- Clamping abnormal word durations (>3.0s)
"""

import sys
import os
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from backend.app.schemas.transcription import TranscriptWord
from backend.app.transcription.quality_analyzer import CaptionQualityAnalyzer

def test_they_they_they_if_regression():
    print("[TEST 1] Regressing 'They They They If' Decoder Loop...")
    raw = [
        TranscriptWord(text="They", start=0.10, end=0.35, confidence=0.72),
        TranscriptWord(text="They", start=0.36, end=0.60, confidence=0.70),
        TranscriptWord(text="They", start=0.61, end=0.85, confidence=0.68),
        TranscriptWord(text="If", start=0.90, end=1.20, confidence=0.94),
        TranscriptWord(text="you", start=1.22, end=1.45, confidence=0.95),
        TranscriptWord(text="want", start=1.46, end=1.70, confidence=0.96),
    ]

    result = CaptionQualityAnalyzer.analyze_and_clean(raw)
    cleaned = result["cleaned_words"]
    cleaned_text = " ".join(w.text for w in cleaned)

    print(f"  Input:   'They They They If you want'")
    print(f"  Output:  '{cleaned_text}'")
    print(f"  Score:   {result['quality_score']}/100")
    print(f"  Issues:  {result['issues']}")

    assert cleaned_text == "They If you want", f"Expected 'They If you want', got '{cleaned_text}'"
    assert result["repetition_count"] >= 2, "Decoder loop repetitions should be logged"
    print("  -> PASS: Repeated loop successfully collapsed to single word without UI hack.")

def test_legitimate_human_repetition():
    print("\n[TEST 2] Preserving Legitimate Speech Repetition ('no, no, no')...")
    raw = [
        TranscriptWord(text="I", start=0.10, end=0.30, confidence=0.95),
        TranscriptWord(text="said", start=0.32, end=0.55, confidence=0.96),
        TranscriptWord(text="no,", start=0.70, end=0.95, confidence=0.91),
        TranscriptWord(text="no,", start=1.15, end=1.40, confidence=0.92),  # 200ms natural pause
        TranscriptWord(text="no.", start=1.60, end=1.85, confidence=0.90),
    ]

    result = CaptionQualityAnalyzer.analyze_and_clean(raw, allow_legitimate_repetition=True)
    cleaned = result["cleaned_words"]
    cleaned_text = " ".join(w.text for w in cleaned)

    print(f"  Input:   'I said no, no, no.'")
    print(f"  Output:  '{cleaned_text}'")

    assert len(cleaned) == 5, f"Expected 5 words preserved, got {len(cleaned)}"
    assert "no," in cleaned[2].text and "no," in cleaned[3].text
    print("  -> PASS: Natural human hesitation / repetition correctly preserved.")

def test_filter_noise_and_music_tokens():
    print("\n[TEST 3] Filtering Non-Speech Acoustic Tokens...")
    raw = [
        TranscriptWord(text="[music]", start=0.00, end=1.20, confidence=0.50),
        TranscriptWord(text="♪", start=1.22, end=2.00, confidence=0.40),
        TranscriptWord(text="Welcome", start=2.10, end=2.50, confidence=0.96),
        TranscriptWord(text="to", start=2.52, end=2.65, confidence=0.97),
        TranscriptWord(text="Viral", start=2.68, end=3.10, confidence=0.98),
        TranscriptWord(text="Studio", start=3.12, end=3.60, confidence=0.99),
        TranscriptWord(text="[applause]", start=3.65, end=4.50, confidence=0.60),
    ]

    result = CaptionQualityAnalyzer.analyze_and_clean(raw, filter_noise=True)
    cleaned = result["cleaned_words"]
    cleaned_text = " ".join(w.text for w in cleaned)

    print(f"  Input:   '[music] ♪ Welcome to Viral Studio [applause]'")
    print(f"  Output:  '{cleaned_text}'")

    assert cleaned_text == "Welcome to Viral Studio", f"Expected 'Welcome to Viral Studio', got '{cleaned_text}'"
    assert result["hallucination_count"] >= 3
    print("  -> PASS: Non-speech bracketed tokens and musical symbols purged.")

def test_monotonic_timestamps_and_duration_clamp():
    print("\n[TEST 4] Validating Monotonic Timestamps & Anomaly Clamping...")
    raw = [
        TranscriptWord(text="First", start=0.50, end=0.90, confidence=0.95),
        TranscriptWord(text="Backward", start=0.40, end=0.80, confidence=0.90), # Non-monotonic start
        TranscriptWord(text="Stretched", start=0.95, end=6.50, confidence=0.85), # 5.55s giant duration
        TranscriptWord(text="Next", start=2.00, end=2.40, confidence=0.95),
    ]

    result = CaptionQualityAnalyzer.analyze_and_clean(raw, max_allowed_word_duration=2.5)
    cleaned = result["cleaned_words"]

    for i in range(len(cleaned) - 1):
        assert cleaned[i].start >= 0
        assert cleaned[i].end > cleaned[i].start
        assert cleaned[i+1].start >= cleaned[i].start, "Timestamps must be monotonically non-decreasing"
        assert cleaned[i].end - cleaned[i].start <= 2.5, "Excessive word duration must be clamped"

    print("  -> PASS: Monotonic ordering enforced and giant durations clamped.")

if __name__ == "__main__":
    print("==================================================================")
    print("VIRAL STUDIO — CAPTION QUALITY & HALLUCINATION SUITE")
    print("==================================================================")
    test_they_they_they_if_regression()
    test_legitimate_human_repetition()
    test_filter_noise_and_music_tokens()
    test_monotonic_timestamps_and_duration_clamp()
    print("\nALL CAPTION QUALITY TESTS PASSED (4/4) ✅")
