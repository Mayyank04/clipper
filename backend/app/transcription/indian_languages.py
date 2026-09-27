"""
Indian Language Support & Hinglish Processing
Handles:
- Native Indian script support (Hindi, Bengali, Gujarati, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil, Telugu)
- Mixed-language (Hinglish) detection & transliteration
- Preserving English words within Hinglish phrases
"""

import re
from typing import Dict, List, Tuple

SUPPORTED_INDIAN_LANGUAGES = {
    "hi": {"name": "Hindi", "script": "Devanagari", "native": "हिन्दी"},
    "bn": {"name": "Bengali", "script": "Bengali", "native": "বাংলা"},
    "gu": {"name": "Gujarati", "script": "Gujarati", "native": "ગુજરાતી"},
    "kn": {"name": "Kannada", "script": "Kannada", "native": "ಕನ್ನಡ"},
    "ml": {"name": "Malayalam", "script": "Malayalam", "native": "മലയാളം"},
    "mr": {"name": "Marathi", "script": "Devanagari", "native": "मराठी"},
    "or": {"name": "Odia", "script": "Odia", "native": "ଓଡ଼ିଆ"},
    "pa": {"name": "Punjabi", "script": "Gurmukhi", "native": "ਪੰਜਾਬੀ"},
    "ta": {"name": "Tamil", "script": "Tamil", "native": "தமிழ்"},
    "te": {"name": "Telugu", "script": "Telugu", "native": "తెలుగు"},
    "en": {"name": "English", "script": "Latin", "native": "English"},
    "hinglish": {"name": "Hinglish", "script": "Latin/Mixed", "native": "Hinglish"},
}

# Devanagari to Latin phonetic transliteration table for Romanized output
DEVANAGARI_VOWELS = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
    'ं': 'n', 'ः': 'h', 'ँ': 'n'
}

DEVANAGARI_MATRAS = {
    'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
    'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
    '्': '', 'ं': 'n', 'ँ': 'n'
}

DEVANAGARI_CONSONANTS = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
    'ष': 'sh', 'स': 's', 'ह': 'h', 'क्ष': 'ksh', 'त्र': 'tr', 'ज्ञ': 'gy'
}

COMMON_HINGLISH_WORDS = {
    "aaj": "आज", "hum": "हम", "baat": "बात", "karenge": "करेंगे",
    "ke": "के", "baare": "बारे", "mein": "में", "yeh": "यह", "woh": "वह",
    "kya": "क्या", "kyon": "क्यों", "kaise": "कैसे", "hain": "हैं", "hai": "है",
    "karna": "करना", "chahte": "चाहते", "sabse": "सबसे", "pehle": "पहले"
}

ENGLISH_TECHNICAL_TERMS = {
    "artificial intelligence", "machine learning", "deep learning", "neural network",
    "computer", "software", "hardware", "video", "audio", "camera", "internet",
    "youtube", "instagram", "tiktok", "reels", "shorts", "viral", "studio",
    "algorithm", "code", "python", "developer", "creator", "like", "subscribe",
    "comment", "share", "content", "podcast", "screen", "mobile", "phone"
}

def is_devanagari(text: str) -> bool:
    """Checks if text contains Devanagari unicode characters (0900-097F)."""
    return any(0x0900 <= ord(char) <= 0x097F for char in text)

def detect_hinglish(text: str) -> bool:
    """Detects whether text is a mix of Hindi phonetic words and English."""
    words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
    if not words:
        return False
    hinglish_count = sum(1 for w in words if w in COMMON_HINGLISH_WORDS)
    english_count = sum(1 for w in words if w in ENGLISH_TECHNICAL_TERMS)
    return hinglish_count >= 1 and (english_count >= 1 or len(words) >= 3)

def transliterate_devanagari_to_roman(devanagari_text: str) -> str:
    """
    Translates Devanagari text into natural Romanized Hindi (Hinglish),
    preserving any English words that are already in Latin script.
    """
    result = []
    i = 0
    chars = list(devanagari_text)
    n = len(chars)

    while i < n:
        char = chars[i]
        
        # Check vowels
        if char in DEVANAGARI_VOWELS:
            result.append(DEVANAGARI_VOWELS[char])
            i += 1
            continue
            
        # Check consonants
        if char in DEVANAGARI_CONSONANTS:
            base = DEVANAGARI_CONSONANTS[char]
            # Look ahead for matra or halant
            if i + 1 < n and chars[i + 1] in DEVANAGARI_MATRAS:
                matra = chars[i + 1]
                result.append(base + DEVANAGARI_MATRAS[matra])
                i += 2
                continue
            elif i + 1 < n and chars[i + 1] == '्': # Halant (half consonant)
                result.append(base)
                i += 2
                continue
            else:
                # In Hindi phonology, final consonants typically drop the schwa 'a'
                is_last_in_word = (i + 1 == n) or (chars[i + 1] in (' ', '\n', '\t', '.', ',', '?', '!'))
                if is_last_in_word:
                    result.append(base)
                else:
                    result.append(base + 'a')
                i += 1
                continue

        # Passthrough Latin / punctuation / whitespace
        result.append(char)
        i += 1

    romanized = "".join(result)
    # Clean up duplicate vowels / common phonetic standardizations
    romanized = re.sub(r'aah\b', 'a', romanized)
    return romanized

def normalize_hinglish_text(text: str) -> str:
    """
    Converts mixed Dev/Latin text into clean Romanized Hinglish,
    guaranteeing that pure English loanwords are preserved untouched.
    """
    tokens = text.split(" ")
    normalized_tokens = []
    for token in tokens:
        clean = token.strip(".,!?;:\"'")
        if is_devanagari(clean):
            converted = transliterate_devanagari_to_roman(clean)
            normalized_tokens.append(token.replace(clean, converted))
        else:
            # Leave Latin token intact
            normalized_tokens.append(token)
    return " ".join(normalized_tokens)
