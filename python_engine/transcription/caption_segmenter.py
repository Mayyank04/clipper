"""
VIRALCLIP STUDIO — SMART CAPTION SEGMENTATION & AI EMPHASIS ENGINE
Creates punchy creator caption beats (2-6 words) with natural boundaries.
Supports WORD, LINE, BLOCK, KARAOKE, and DYNAMIC modes with deterministic AI emphasis.
"""

import re
from typing import List, Dict, Any, Optional

EMPHASIS_KEYWORDS = {
    # Numbers, Money, Stats
    r'(\$|₹|€|£)\s?\d+(?:,\d+)*(?:\.\d+)?',
    r'\b\d+(?:,\d+)*(?:\.\d+)?%?',
    r'\b(million|billion|thousand|crore|lakh|k|hundred)\b',
    # Hooks & High Emotion
    r'\b(secret|mistake|insane|crazy|shocking|unbelievable|never|always|huge|truth|proven)\b',
    r'\b(free|money|growth|danger|warning|critical|hack|trick|cheat)\b',
    # Call to Actions
    r'\b(subscribe|follow|comment|share|click|save|download)\b'
}

def detect_word_emphasis(text: str) -> bool:
    """Detects if a word token qualifies for high-contrast AI emphasis."""
    clean = text.strip()
    for pattern in EMPHASIS_KEYWORDS:
        if re.search(pattern, clean, re.IGNORECASE):
            return True
    return False

def segment_into_beats(
    words: List[Dict[str, Any]],
    mode: str = "DYNAMIC",
    words_per_beat: int = 3
) -> List[Dict[str, Any]]:
    """
    Segments word stream into punchy social-media caption units.
    Respects punctuation, natural sentence boundaries, and acoustic pauses.
    """
    if not words:
        return []

    # Configure target words per unit based on mode
    if mode == "WORD":
        target_words = 1
    elif mode == "BLOCK":
        target_words = 8
    elif mode == "LINE":
        target_words = 5
    elif mode == "KARAOKE":
        target_words = 6
    else:  # DYNAMIC
        target_words = max(2, min(5, words_per_beat))

    beats = []
    current_words = []

    for i, w in enumerate(words):
        current_words.append(w)
        text = w.get("text", "")
        has_punctuation = bool(re.search(r'[.!?,;:]$', text))
        
        # Check acoustic pause to next word
        next_pause = 0.0
        if i + 1 < len(words):
            next_pause = words[i + 1]["start"] - w["end"]

        # Decision boundaries: punctuation, long pause (>0.4s), or reaching target size
        should_split = (
            len(current_words) >= target_words or
            has_punctuation or
            next_pause >= 0.45 or
            (len(current_words) >= 2 and next_pause >= 0.25)
        )

        if should_split or i == len(words) - 1:
            beat_text = " ".join([item["text"] for item in current_words])
            beat_start = current_words[0]["start"]
            beat_end = current_words[-1]["end"]

            # Tag emphasized words
            tagged_words = []
            for item in current_words:
                item_copy = dict(item)
                item_copy["isEmphasized"] = detect_word_emphasis(item["text"])
                tagged_words.append(item_copy)

            beats.append({
                "id": f"beat_{len(beats) + 1}",
                "text": beat_text,
                "start": round(beat_start, 3),
                "end": round(beat_end, 3),
                "words": tagged_words,
                "mode": mode,
                "confidence": 0.95
            })
            current_words = []

    return beats
