"""
VIRALCLIP STUDIO — MULTILINGUAL & HINGLISH LANGUAGE DETECTOR
Analyzes acoustic speech segments and text tokens for robust language classification.
First-class support for English, Hindi, Hinglish, Bengali, Assamese, and 18+ global languages.
"""

import re
from typing import Dict, Any, Tuple, Optional, List

# Conversational Hinglish phonetic lexicon markers
HINGLISH_MARKERS = {
    'aaj', 'hum', 'aap', 'tum', 'karenge', 'karta', 'karega', 'baat', 'mein',
    'hai', 'hain', 'tha', 'thi', 'the', 'bhai', 'yaar', 'karo', 'dekh', 'dekho',
    'suno', 'ruk', 'matlab', 'accha', 'theek', 'pata', 'nahi', 'kuch', 'bohot',
    'zyada', 'sirf', 'lekin', 'kyun', 'kaise', 'kahan', 'kab', 'yeh', 'woh',
    'apna', 'apne', 'sabse', 'pehle', 'baad', 'andar', 'bahar', 'saath', 'wala'
}

# Supported Language Code to Human Name Mapping
SUPPORTED_LANGUAGES = {
    'auto': 'Auto Detect',
    'en': 'English',
    'hi': 'Hindi (हिन्दी)',
    'hinglish': 'Hinglish (Hindi in Latin Script)',
    'bn': 'Bengali (বাংলা)',
    'as': 'Assamese (অসমীয়া)',
    'ta': 'Tamil (தமிழ்)',
    'te': 'Telugu (తెలుగు)',
    'kn': 'Kannada (ಕನ್ನಡ)',
    'ml': 'Malayalam (മലയാളം)',
    'mr': 'Marathi (मराठी)',
    'gu': 'Gujarati (ગુજરાતી)',
    'pa': 'Punjabi (ਪੰਜਾਬੀ)',
    'ur': 'Urdu (اردو)',
    'ne': 'Nepali (नेपाली)',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'pt': 'Portuguese',
    'id': 'Indonesian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
}

def detect_devanagari_presence(text: str) -> bool:
    """Checks if text contains Devanagari script letters (excluding shared punctuation like danda U+0964)."""
    devanagari_letters = re.findall(r'[\u0904-\u093D\u0950-\u0963]', text)
    bengali_letters = re.findall(r'[\u0980-\u09FF]', text)
    return len(devanagari_letters) > 0 and len(devanagari_letters) >= len(bengali_letters)

def detect_bengali_assamese_presence(text: str) -> Tuple[bool, str]:
    """Checks if text contains Bengali/Assamese script characters (U+0980 to U+09FF)."""
    if re.search(r'[\u0980-\u09FF]', text):
        # Assamese has distinct characters: ৱ (w), ৰ (r)
        if re.search(r'[ৱৰ]', text):
            return True, 'as'
        return True, 'bn'
    return False, ''

def detect_hinglish(text: str) -> Tuple[bool, float]:
    """
    Detects if Latin-script text represents spoken Hinglish (mixed Hindi + English).
    Calculates proportion of Hinglish lexical markers against total words.
    """
    words = re.findall(r'[a-zA-Z]+', text.lower())
    if not words:
        return False, 0.0

    hinglish_matches = [w for w in words if w in HINGLISH_MARKERS]
    ratio = len(hinglish_matches) / max(1, len(words))

    # If at least 2 distinct markers or >= 12% of tokens are Hinglish markers
    distinct_matches = set(hinglish_matches)
    is_hinglish = len(distinct_matches) >= 2 or (len(words) >= 4 and ratio >= 0.12)
    confidence = min(0.98, max(0.5, ratio * 2.5 + (0.3 if len(distinct_matches) >= 3 else 0.1)))
    return is_hinglish, round(confidence, 2)

def classify_transcript_language(raw_text: str, whisper_lang_code: Optional[str] = None) -> Dict[str, Any]:
    """
    Determines final canonical language identity.
    Prevents converting Hinglish to pure Hindi, and ensures Bengali/Assamese are accurately tagged.
    """
    clean_text = raw_text.strip()
    
    # 1. Check Devanagari
    if detect_devanagari_presence(clean_text):
        return {
            "code": "hi",
            "name": "Hindi",
            "isMixed": False,
            "confidence": 0.96,
            "script": "Devanagari"
        }

    # 2. Check Bengali / Assamese
    is_bn_as, sub_code = detect_bengali_assamese_presence(clean_text)
    if is_bn_as:
        return {
            "code": sub_code,
            "name": "Assamese" if sub_code == 'as' else "Bengali",
            "isMixed": False,
            "confidence": 0.95,
            "script": "Bengali/Assamese"
        }

    # 3. Check Hinglish in Latin Script
    is_hinglish, hinglish_conf = detect_hinglish(clean_text)
    if is_hinglish:
        return {
            "code": "hinglish",
            "name": "Hinglish",
            "isMixed": True,
            "confidence": hinglish_conf,
            "script": "Latin"
        }

    # 4. Fallback to Whisper's detected code or English
    code = (whisper_lang_code or 'en').lower()
    if code in ('hi', 'hindi') and not detect_devanagari_presence(clean_text):
        # Whisper tagged 'hi' but text is written in Latin characters -> Hinglish!
        return {
            "code": "hinglish",
            "name": "Hinglish",
            "isMixed": True,
            "confidence": 0.90,
            "script": "Latin"
        }

    name = SUPPORTED_LANGUAGES.get(code, code.upper())
    return {
        "code": code,
        "name": name,
        "isMixed": False,
        "confidence": 0.92,
        "script": "Native"
    }
