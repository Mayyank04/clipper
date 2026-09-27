"""
Caption Correction Engine
Performs post-ASR corrections without modifying underlying speech timestamps:
- Punctuation restoration
- Sentence capitalization
- Filler word detection and optional removal (e.g. 'um', 'uh', 'matlab', 'basically')
- Repetition detection (e.g. 'I think, I think that...')
- Hallucination and silence loop filtering
- Acoustic token filtering ([music], [applause], ♪, [cheering])
"""

import re
from typing import List
from ..schemas.transcription import TranscriptWord, TranscriptSegment

FILLER_WORDS = {
    "um", "uh", "uhh", "umm", "er", "ah", "ahh",
    "matlab", "basically", "you know", "like", "so yeah", "hmm"
}

NOISE_TOKENS = {
    "[music]", "[applause]", "[laughter]", "[cheering]",
    "[snicker]", "[cough]", "[throat-clearing]", "♪", "♫",
    "(music)", "(applause)", "(laughter)"
}

HALLUCINATION_PATTERNS = [
    r"(thank you for watching.*){2,}",
    r"(subscribe to my channel.*){2,}",
    r"(please like and subscribe.*){2,}",
    r"(\b\w+\b)( \1){3,}"  # Stutter/loop repetition >= 4 times
]

def filter_noise_and_hallucinations(words: List[TranscriptWord]) -> List[TranscriptWord]:
    """Filters out acoustic noise tokens and hallucinated repetitions from silence."""
    cleaned: List[TranscriptWord] = []
    for w in words:
        raw = w.text.strip().lower()
        if raw in NOISE_TOKENS:
            continue
        if any(raw.startswith(prefix) and raw.endswith(suffix) for prefix, suffix in [('[', ']'), ('(', ')'), ('♪', '♪')]):
            continue
        cleaned.append(w)

    # Check for runaway duplicate loops
    result: List[TranscriptWord] = []
    consecutive_dup_count = 0
    last_word_text = ""

    for w in cleaned:
        current_text = re.sub(r'[^\w]', '', w.text.lower())
        if current_text and current_text == last_word_text:
            consecutive_dup_count += 1
            if consecutive_dup_count >= 3:
                # Discard runaway hallucination loop
                continue
        else:
            consecutive_dup_count = 0
            last_word_text = current_text
        result.append(w)

    return result

def clean_fillers(words: List[TranscriptWord], remove: bool = False) -> List[TranscriptWord]:
    """Optionally flags or strips filler speech tokens."""
    if not remove:
        return words
    return [w for w in words if w.text.strip().lower() not in FILLER_WORDS]

def restore_punctuation_and_caps(words: List[TranscriptWord]) -> List[TranscriptWord]:
    """
    Ensures natural sentence capitalization and punctuation boundaries
    without mutating word timestamps.
    """
    if not words:
        return words

    new_words: List[TranscriptWord] = []
    capitalize_next = True

    for i, w in enumerate(words):
        text = w.text.strip()
        
        # Capitalize start of sentence
        if capitalize_next and text:
            text = text[0].upper() + text[1:]
            capitalize_next = False

        # If previous word had significant pause before this word (> 0.65s), add comma or period
        if i > 0:
            prev_word = new_words[-1]
            gap = w.start - prev_word.end
            if gap >= 0.75 and not prev_word.text.endswith(('.', '?', '!', '।')):
                prev_word.text += "."
                text = text[0].upper() + text[1:] if text else text
            elif gap >= 0.35 and not prev_word.text.endswith((',', '.', '?', '!', '।', ';')):
                prev_word.text += ","

        # Check if this word closes a sentence
        if text.endswith(('.', '?', '!', '।')):
            capitalize_next = True

        new_words.append(
            TranscriptWord(
                text=text,
                start=w.start,
                end=w.end,
                confidence=w.confidence,
                speechStart=w.speechStart or w.start,
                speechEnd=w.speechEnd or w.end
            )
        )

    # Ensure final word has terminal punctuation
    if new_words and not new_words[-1].text.endswith(('.', '?', '!', '।')):
        new_words[-1].text += "."

    return new_words

def apply_caption_corrections(
    words: List[TranscriptWord],
    apply_correction: bool = True,
    remove_fillers: bool = False,
    filter_noise: bool = True
) -> List[TranscriptWord]:
    """Master pipeline for post-ASR caption corrections."""
    if not apply_correction:
        return words

    processed = words
    if filter_noise:
        processed = filter_noise_and_hallucinations(processed)
    if remove_fillers:
        processed = clean_fillers(processed, remove=True)
    
    processed = restore_punctuation_and_caps(processed)
    return processed
