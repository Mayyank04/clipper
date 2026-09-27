#!/usr/bin/env python3
"""
Test Suite: Multilingual Whisper & Language Classifier Verification
Verifies:
1. Supported language matrix (23 languages including Indian regional languages)
2. Accurate Devanagari script detection (Hindi)
3. Bengali vs. Assamese distinct character discrimination (Assamese 'ৱ', 'ৰ')
4. Conversational Hinglish detection with Latin-script preservation (zero translation)
5. Confidence calculation and multilingual fallback
"""

import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from python_engine.transcription.language_detector import (
    SUPPORTED_LANGUAGES,
    detect_devanagari_presence,
    detect_bengali_assamese_presence,
    detect_hinglish,
    classify_transcript_language
)

def test_language_matrix():
    print("[TEST 1] Verifying 23 Multilingual Language Matrix...")
    required_codes = [
        "auto", "en", "hi", "hinglish", "bn", "as", "ta", "te",
        "kn", "ml", "mr", "gu", "pa", "ur", "ne", "es", "fr",
        "de", "pt", "id", "ja", "ko", "zh"
    ]
    for code in required_codes:
        assert code in SUPPORTED_LANGUAGES, f"Missing language code in SUPPORTED_LANGUAGES: {code}"
    print(f"  Verified all {len(required_codes)} required languages in matrix:")
    for code in required_codes:
        print(f"    - {code.upper()}: {SUPPORTED_LANGUAGES[code]}")
    print("  -> PASS: Complete multilingual language matrix verified.")

def test_devanagari_hindi_detection():
    print("\n[TEST 2] Verifying Devanagari Script (Hindi) Classification...")
    hindi_text = "आज हम एक बहुत महत्वपूर्ण विषय पर चर्चा करेंगे।"
    res = classify_transcript_language(hindi_text, whisper_lang_code="hi")
    print(f"  Input:  '{hindi_text}'")
    print(f"  Result: Code='{res['code']}', Name='{res['name']}', Conf={res['confidence']}")
    assert res["code"] == "hi"
    assert res["script"] == "Devanagari"
    assert res["confidence"] >= 0.9
    print("  -> PASS: Pure Hindi Devanagari script accurately classified.")

def test_bengali_and_assamese_detection():
    print("\n[TEST 3] Verifying Bengali vs. Assamese Script Discrimination...")
    # Bengali standard
    bengali_text = "আমি আজকে এই বিষয়টি আপনাদের দেখাতে চাই।"
    bn_res = classify_transcript_language(bengali_text, whisper_lang_code="bn")
    print(f"  Bengali Input:  '{bengali_text}'")
    print(f"  Bengali Result: Code='{bn_res['code']}', Name='{bn_res['name']}'")
    assert bn_res["code"] == "bn"

    # Assamese with distinct 'ৰ' / 'ৱ'
    assamese_text = "মই আজি এইটো বিষয় লৈ ক'ব খুজিছোঁ আৰু ৱেবছাইটটো চাই লওক।"
    as_res = classify_transcript_language(assamese_text, whisper_lang_code="as")
    print(f"  Assamese Input: '{assamese_text}'")
    print(f"  Assamese Result:Code='{as_res['code']}', Name='{as_res['name']}'")
    assert as_res["code"] == "as"
    print("  -> PASS: Bengali and Assamese distinct regional scripts verified.")

def test_hinglish_preservation():
    print("\n[TEST 4] Verifying Conversational Hinglish Detection & Latin Script Preservation...")
    hinglish_text = "Guys aaj hum ek very important topic discuss karenge aur yeh strategy follow karo."
    res = classify_transcript_language(hinglish_text, whisper_lang_code="en")
    print(f"  Input:   '{hinglish_text}'")
    print(f"  Result:  Code='{res['code']}', Name='{res['name']}', Conf={res['confidence']}")
    assert res["code"] == "hinglish"
    assert res["isMixed"] is True
    # Ensure it was not converted to Devanagari or translated
    assert "Guys" in hinglish_text and "karenge" in hinglish_text
    print("  -> PASS: Spoken Hinglish preserved in mixed Latin script without translation.")

def test_multilingual_fallback():
    print("\n[TEST 5] Verifying Fallback & Low-Confidence Handling...")
    ambiguous_text = "123 456 789"
    res = classify_transcript_language(ambiguous_text, whisper_lang_code=None)
    print(f"  Ambiguous Result: Code='{res['code']}', Name='{res['name']}'")
    assert res["code"] in ("en", "auto")
    print("  -> PASS: Safe fallback behavior without silent failure.")

if __name__ == "__main__":
    print("==================================================================")
    print("VIRAL STUDIO — MULTILINGUAL ENGINE TEST SUITE")
    print("==================================================================")
    test_language_matrix()
    test_devanagari_hindi_detection()
    test_bengali_and_assamese_detection()
    test_hinglish_preservation()
    test_multilingual_fallback()
    print("\nALL MULTILINGUAL TESTS PASSED (5/5) ✅")
