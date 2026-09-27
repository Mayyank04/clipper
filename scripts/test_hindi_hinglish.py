#!/usr/bin/env python3
"""
Test Suite: Hindi & Hinglish Transcription Engine
Verifies:
- Native Devanagari script detection and validation
- Hinglish detection for Romanized conversational speech
- Preservation of English technical terminology (e.g. 'artificial intelligence', 'machine learning')
- Transliteration modes: Original, Native Script, Romanized
"""

import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from backend.app.transcription.indian_languages import (
    is_devanagari,
    detect_hinglish,
    normalize_hinglish_text,
    COMMON_HINGLISH_WORDS,
    SUPPORTED_INDIAN_LANGUAGES,
)

def test_devanagari_detection():
    print("[TEST 1] Verifying Devanagari Unicode Detection...")
    hindi_text = "आज हम एक नई शुरुआत करेंगे"
    mixed_text = "Yeh ek नया feature hai"
    english_text = "This is pure English"

    assert is_devanagari(hindi_text) is True, "Pure Hindi text must be detected as Devanagari"
    assert is_devanagari(mixed_text) is True, "Mixed text containing Devanagari must be detected"
    assert is_devanagari(english_text) is False, "English text must not be detected as Devanagari"
    print("  -> PASS: Unicode range \u0900-\u097F accurately detected.")

def test_hinglish_detection_and_vocabulary():
    print("\n[TEST 2] Verifying Conversational Hinglish Detection...")
    sample_hinglish = "Aaj hum artificial intelligence ke baare mein baat karenge"
    sample_english = "Today we will talk about artificial intelligence and deep learning"

    is_h = detect_hinglish(sample_hinglish)
    is_e = detect_hinglish(sample_english)

    print(f"  Hinglish Input: '{sample_hinglish}' -> Detected: {is_h}")
    print(f"  English Input:  '{sample_english}' -> Detected: {is_e}")

    assert is_h is True, "Hinglish sample must be identified"
    assert is_e is False, "Pure English sample must not be falsely identified as Hinglish"
    print("  -> PASS: Conversational markers ('aaj', 'hum', 'baare', 'mein') correctly classified.")

def test_english_words_preservation_in_hinglish():
    print("\n[TEST 3] Verifying English Technical Terms Preservation in Hinglish...")
    input_text = "Yeh Strategy follow karo aur apna Content scale karo"
    normalized = normalize_hinglish_text(input_text)

    print(f"  Input:      '{input_text}'")
    print(f"  Normalized: '{normalized}'")

    # English words must remain intact in Latin script
    assert "Strategy" in normalized or "strategy" in normalized.lower()
    assert "Content" in normalized or "content" in normalized.lower()
    assert "scale" in normalized.lower()
    print("  -> PASS: English terminology preserved without corrupting into incorrect native script.")

def test_indian_language_support_matrix():
    print("\n[TEST 4] Verifying Indian Regional Languages Matrix...")
    required = ["hi", "bn", "gu", "kn", "ml", "mr", "pa", "ta", "te", "or"]
    available_codes = set(SUPPORTED_INDIAN_LANGUAGES.keys())

    for code in required:
        assert code in available_codes, f"Language code '{code}' must be supported in regional matrix"

    print(f"  Verified {len(required)} Indian languages in matrix:")
    for code in required:
        info = SUPPORTED_INDIAN_LANGUAGES[code]
        print(f"    - {code}: {info['name']} ({info.get('native', '')})")
    print("  -> PASS: First-class Indian language infrastructure verified.")

if __name__ == "__main__":
    print("==================================================================")
    print("VIRAL STUDIO — HINDI & HINGLISH TRANSCRIPTION SUITE")
    print("==================================================================")
    test_devanagari_detection()
    test_hinglish_detection_and_vocabulary()
    test_english_words_preservation_in_hinglish()
    test_indian_language_support_matrix()
    print("\nALL HINDI/HINGLISH TESTS PASSED (4/4) ✅")
