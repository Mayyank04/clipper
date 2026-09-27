"""
Caption Hold System
Maintains separation between true speech acoustics and visual caption persistence:
- speechStart, speechEnd: Original audio timestamps (strictly untouched)
- displayStart, displayEnd: Visual hold-adjusted timestamps
- holdThreshold: 0.28s visual hold on gaps
- punchlineHold: 0.8s hold on the concluding phrase of a segment or video
"""

from typing import List, Optional
from ..schemas.transcription import TranscriptWord, TranscriptSegment

DEFAULT_HOLD_THRESHOLD = 0.28
DEFAULT_PUNCHLINE_HOLD = 0.80

def apply_caption_holds(
    segments: List[TranscriptSegment],
    hold_threshold: float = DEFAULT_HOLD_THRESHOLD,
    punchline_hold: float = DEFAULT_PUNCHLINE_HOLD,
    total_duration: Optional[float] = None,
    hold_duration_seconds: Optional[float] = None
) -> List[TranscriptSegment]:
    """
    Applies display hold windows across caption segments without mutating
    the original speechStart / speechEnd timestamps.
    """
    if hold_duration_seconds is not None:
        hold_threshold = hold_duration_seconds

    if not segments:
        return []

    result = []
    num_segs = len(segments)

    for i, seg in enumerate(segments):
        is_dict = isinstance(seg, dict)
        speech_start = float(seg["start"] if is_dict else seg.start)
        speech_end = float(seg["end"] if is_dict else seg.end)
        display_start = speech_start
        display_end = speech_end

        is_last = (i == num_segs - 1)

        if is_last:
            # Final punchline hold
            display_end = speech_end + punchline_hold
            if total_duration and display_end > total_duration:
                display_end = total_duration
        else:
            next_seg = segments[i + 1]
            next_start = float(next_seg["start"] if isinstance(next_seg, dict) else next_seg.start)
            gap = next_start - speech_end
            if gap > 0:
                # Add hold up to threshold, stopping before next speech begins
                added_hold = min(gap, hold_threshold)
                display_end = speech_end + added_hold

        if is_dict:
            updated_dict = dict(seg)
            updated_dict["displayStart"] = round(display_start, 3)
            updated_dict["displayEnd"] = round(display_end, 3)
            result.append(updated_dict)
        else:
            updated_seg = TranscriptSegment(
                id=seg.id,
                start=round(speech_start, 3),
                end=round(speech_end, 3),
                text=seg.text,
                words=seg.words,
                speaker=seg.speaker,
                language=seg.language,
                displayStart=round(display_start, 3),
                displayEnd=round(display_end, 3)
            )
            result.append(updated_seg)

    return result

apply_caption_visual_holds = apply_caption_holds

