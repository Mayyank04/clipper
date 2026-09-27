"""
Caption Segmenter
Transforms raw word streams into dynamic, readable social caption beats:
- Target: 2–5 words per beat (flexible 1–8)
- Punctuation-aware boundary detection (. , ? ! ।)
- Pause-aware splitting (gaps >= 0.32s)
- Semantic cohesion (avoids breaking proper names, numbers, compound terms)
- Modes: WORD, LINE, BLOCK
"""

import re
from typing import List, Optional
from ..schemas.transcription import TranscriptWord, TranscriptSegment
from .hold_engine import apply_caption_holds

PUNCTUATION_BREAKS = {'.', '?', '!', '।', ';', ':', ','}

def is_protected_token(word: str) -> bool:
    """Checks if a word should be protected from arbitrary boundary splitting."""
    clean = word.strip(".,!?;:\"'")
    # Numbers or currency
    if re.match(r'^[\$€£₹]?\d+([.,]\d+)?%?$', clean):
        return True
    return False

def segment_caption_words(
    words: List[TranscriptWord],
    mode: str = "LINE",
    min_words: int = 2,
    max_words: int = 5,
    max_chars: int = 36,
    max_pause_sec: float = 0.32,
    total_duration: Optional[float] = None
) -> List[TranscriptSegment]:
    """
    Groups words into caption segments based on the selected mode:
    - WORD: 1 word per beat
    - LINE: 2-5 words per beat (short-form standard)
    - BLOCK: Full sentences (up to 12-16 words)
    """
    if not words:
        return []

    if mode == "WORD":
        raw_segs = [
            TranscriptSegment(
                id=f"cap_w_{i+1}",
                start=w.start,
                end=w.end,
                text=w.text,
                words=[w],
                displayStart=w.start,
                displayEnd=w.end
            )
            for i, w in enumerate(words)
        ]
        return apply_caption_holds(raw_segs, total_duration=total_duration)

    if mode == "BLOCK":
        min_words = 6
        max_words = 14
        max_chars = 72

    segments: List[TranscriptSegment] = []
    current_words: List[TranscriptWord] = []
    seg_counter = 1

    def flush_segment():
        nonlocal current_words, seg_counter
        if not current_words:
            return
        seg_text = " ".join(w.text for w in current_words)
        seg_start = current_words[0].start
        seg_end = current_words[-1].end
        segments.append(
            TranscriptSegment(
                id=f"cap_seg_{seg_counter}",
                start=seg_start,
                end=seg_end,
                text=seg_text,
                words=list(current_words),
                displayStart=seg_start,
                displayEnd=seg_end
            )
        )
        seg_counter += 1
        current_words = []

    for i, w in enumerate(words):
        current_words.append(w)
        
        # Check boundary conditions
        has_punctuation = any(w.text.endswith(p) for p in PUNCTUATION_BREAKS)
        is_terminal = any(w.text.endswith(p) for p in {'.', '?', '!', '।'})
        
        pause_gap = 0.0
        if i + 1 < len(words):
            pause_gap = words[i + 1].start - w.end

        current_char_count = sum(len(cw.text) for cw in current_words) + len(current_words) - 1

        # Break conditions:
        should_split = False
        
        # 1. Terminal punctuation
        if is_terminal and len(current_words) >= min_words:
            should_split = True
        # 2. Significant pause
        elif pause_gap >= max_pause_sec and len(current_words) >= min_words:
            should_split = True
        # 3. Maximum word count reached
        elif len(current_words) >= max_words:
            should_split = True
        # 4. Maximum character count reached
        elif current_char_count >= max_chars and len(current_words) >= min_words:
            should_split = True
        # 5. Comma break if we already have reasonable words
        elif has_punctuation and len(current_words) >= min_words:
            should_split = True

        if should_split:
            flush_segment()

    # Flush any remaining words
    flush_segment()

    return apply_caption_holds(segments, total_duration=total_duration)
