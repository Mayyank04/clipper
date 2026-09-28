"""
VIRALCLIP STUDIO — REAL AI HOOK FINDER & CANDIDATE SCORING ENGINE
Conforming to ViralClip Studio Phase 6, 7 & 8 Specifications.
Evaluates entire video duration — never assumes the first clip is the hook.
"""

import re
from typing import List, Dict, Any, Optional

QUESTION_PATTERNS = [
    re.compile(r'\b(why|how|what|when|where|who|which)\b', re.IGNORECASE),
    re.compile(r'\b(kya|kyun|kaise|kab|kahan|kaun)\b', re.IGNORECASE),
    re.compile(r'\?'),
]

CURIOSITY_PATTERNS = [
    re.compile(r'\b(you won\'t believe|nobody tells you|the biggest mistake|here\'s what|this changed|wait|look at this|the reason|what happened next|stop doing|the secret to|how i made|the truth about)\b', re.IGNORECASE),
    re.compile(r'\b(yeh mat karna|ye sach hai|kisi ne nahi bataya|asli sach|ek baat bataun|dhyan se suno|yeh galti|sabse bada)\b', re.IGNORECASE),
    re.compile(r'\b(never do this|if you think|don\'t make this|pay attention|3 things|top \d|rules of)\b', re.IGNORECASE),
]

HIGH_EMOTION_PATTERNS = [
    re.compile(r'\b(insane|crazy|massive|huge|shocking|destroyed|exploded|dangerous|worst|best|genius|secret|million|crore|billion)\b', re.IGNORECASE),
    re.compile(r'\b(bawal|khatarnak|zabardast|hosh udd|tabahi|dhamaal|shandar|gadbad)\b', re.IGNORECASE),
]

NUMBERS_AND_STATS = [
    re.compile(r'\b(\d+|10x|50%|100%|lakh|crore|k|million|dollar|rupee|rs|\$|₹)\b', re.IGNORECASE)
]

FILLER_WORDS = [
    re.compile(r'\b(um|uh|err|like|you know|i mean|sort of|kind of|matlab|samjhe|aisa|waisa)\b', re.IGNORECASE)
]

def evaluate_sentence_hook(text: str, words_per_sec: float) -> Dict[str, Any]:
    clean = text.strip()
    score = 30
    signals = []
    category = "bold"

    if any(p.search(clean) for p in QUESTION_PATTERNS):
        score += 22
        signals.append("Strong opening question hooks viewer curiosity")
        category = "question"

    if any(p.search(clean) for p in CURIOSITY_PATTERNS):
        score += 28
        signals.append("High-retention curiosity gap statement")
        category = "curiosity"

    if any(p.search(clean) for p in HIGH_EMOTION_PATTERNS):
        score += 20
        signals.append("High emotional vocabulary with strong conviction")
        if category != "curiosity":
            category = "shock"

    if any(p.search(clean) for p in NUMBERS_AND_STATS):
        score += 16
        signals.append("Specific metrics and empirical numbers trigger authority")
        if category == "bold":
            category = "educational"

    if 2.5 <= words_per_sec <= 4.5:
        score += 12
        signals.append(f"Fast punchy cadence ({words_per_sec:.1f} words/sec)")
    elif words_per_sec < 1.8:
        score -= 10

    word_count = len(clean.split())
    if 5 <= word_count <= 18:
        score += 8

    return {
        "score": min(100, max(10, score)),
        "signals": signals,
        "category": category,
    }

def score_short_candidate(
    clip_segs: List[Dict[str, Any]],
    clip_start: float,
    clip_end: float,
    total_duration: float
) -> Dict[str, Any]:
    duration = max(1.0, clip_end - clip_start)
    full_text = " ".join(s.get("text", "") for s in clip_segs).strip()
    hook_sentence = clip_segs[0].get("text", "") if clip_segs else ""

    total_words = 0
    filler_count = 0
    for s in clip_segs:
        words = s.get("words") or s.get("text", "").split()
        total_words += len(words)
        for w in words:
            w_text = w if isinstance(w, str) else (w.get("word") or w.get("text", ""))
            if any(p.search(w_text) for p in FILLER_WORDS):
                filler_count += 1

    words_per_sec = total_words / duration if duration > 0 else 0
    hook_eval = evaluate_sentence_hook(hook_sentence, words_per_sec)

    semantic_strength = min(20, round((hook_eval["score"] / 100.0) * 20))

    curiosity = 8
    if any(p.search(full_text) for p in CURIOSITY_PATTERNS):
        curiosity += 8
    if any(p.search(hook_sentence) for p in QUESTION_PATTERNS):
        curiosity += 4
    curiosity = min(20, curiosity)

    emotional_intensity = 6
    if any(p.search(full_text) for p in HIGH_EMOTION_PATTERNS):
        emotional_intensity += 7
    if "!" in full_text:
        emotional_intensity += 2
    emotional_intensity = min(15, emotional_intensity)

    if 2.6 <= words_per_sec <= 4.2:
        speech_pacing = 15
    elif 2.0 <= words_per_sec <= 4.8:
        speech_pacing = 12
    else:
        speech_pacing = 7

    information_density = 7
    if any(p.search(full_text) for p in NUMBERS_AND_STATS):
        information_density += 6
    if total_words > 40:
        information_density += 2
    information_density = min(15, information_density)

    open_loop_bonus = 5
    if any(p.search(hook_sentence) for p in QUESTION_PATTERNS):
        open_loop_bonus += 6
    if re.search(r'\b(next|step|result|finally|lastly)\b', full_text, re.IGNORECASE):
        open_loop_bonus += 4
    open_loop_bonus = min(15, open_loop_bonus)

    filler_ratio = filler_count / total_words if total_words > 0 else 0
    filler_penalty = round(filler_ratio * 25)

    word_tokens = [w.lower() for w in full_text.split() if len(w) > 3]
    unique_tokens = set(word_tokens)
    rep_rate = (len(word_tokens) - len(unique_tokens)) / len(word_tokens) if word_tokens else 0
    repetition_penalty = round(rep_rate * 15)

    duration_bonus = 5 if 20 <= duration <= 45 else (-6 if duration > 65 else 0)

    total_raw = (
        semantic_strength
        + curiosity
        + emotional_intensity
        + speech_pacing
        + information_density
        + open_loop_bonus
        + duration_bonus
        - filler_penalty
        - repetition_penalty
    )
    final_score = max(15, min(98, round(total_raw)))

    reasons = [
        f'Strong opening hook: "{hook_sentence[:50]}..."' if len(hook_sentence) > 50 else f'Strong opening hook: "{hook_sentence}"',
        *hook_eval["signals"],
        f"Optimal pacing of {words_per_sec:.1f} words/sec across {round(duration)}s",
    ]

    breakdown = {
        "semanticStrength": semantic_strength,
        "curiosity": curiosity,
        "emotionalIntensity": emotional_intensity,
        "speechPacing": speech_pacing,
        "informationDensity": information_density,
        "openLoopBonus": open_loop_bonus,
        "silencePenalty": 0,
        "fillerPenalty": filler_penalty,
        "repetitionPenalty": repetition_penalty,
        "totalRaw": total_raw,
        "finalScore": final_score,
    }

    return {
        "score": final_score,
        "breakdown": breakdown,
        "reasons": reasons,
        "category": hook_eval["category"],
    }

def find_top_hook_candidates(
    transcript_segments: List[Dict[str, Any]],
    total_duration: float,
    target_count: int = 3,
    min_duration: float = 18.0,
    max_duration: float = 55.0,
) -> List[Dict[str, Any]]:
    if not transcript_segments:
        return []

    scored_clips = []
    n = len(transcript_segments)

    for i in range(n):
        start_seg = transcript_segments[i]
        clip_start = start_seg.get("start", 0.0)

        current_segs = []
        for j in range(i, n):
            s = transcript_segments[j]
            current_segs.append(s)
            cur_dur = s.get("end", 0.0) - clip_start

            text = s.get("text", "").strip()
            has_sentence_end = bool(re.search(r'[.?!।]$', text)) or (j == n - 1)

            if cur_dur >= min_duration and (has_sentence_end or cur_dur >= max_duration - 5):
                if cur_dur <= max_duration:
                    eval_res = score_short_candidate(current_segs, clip_start, s.get("end", 0.0), total_duration)
                    hook_text = start_seg.get("text", "").strip()

                    scored_clips.append({
                        "id": f"short_cand_{i}_{j}",
                        "rank": 0,
                        "title": f"Viral Short #{len(scored_clips)+1} ({round(clip_start)}s - {round(s.get('end', 0.0))}s)",
                        "description": " ".join(cs.get("text", "") for cs in current_segs)[:140],
                        "topic": f"Key Highlight ({round(clip_start)}s)",
                        "hookText": hook_text[:57] + "..." if len(hook_text) > 60 else hook_text,
                        "hookCategory": eval_res["category"],
                        "startTime": round(clip_start, 2),
                        "endTime": round(s.get("end", 0.0), 2),
                        "duration": round(cur_dur, 2),
                        "viralScoreOverall": eval_res["score"],
                        "hookScoreBreakdown": eval_res["breakdown"],
                        "whySelected": eval_res["reasons"],
                        "confidence": round(eval_res["score"] / 100.0, 2),
                        "sentences": current_segs,
                    })
                break

    if not scored_clips:
        return []

    # Sort descending by score
    scored_clips.sort(key=lambda x: x["viralScoreOverall"], reverse=True)

    # Deduplicate / Non-maximum suppression across time
    selected = []
    for candidate in scored_clips:
        if len(selected) >= target_count:
            break
        overlapping = any(
            (min(ex["endTime"], candidate["endTime"]) - max(ex["startTime"], candidate["startTime"])) > 8.0
            for ex in selected
        )
        if not overlapping:
            candidate["rank"] = len(selected) + 1
            candidate["title"] = f"Viral Hook #{candidate['rank']} (Score: {candidate['viralScoreOverall']})"
            selected.append(candidate)

    if len(selected) < target_count:
        for candidate in scored_clips:
            if len(selected) >= target_count:
                break
            if not any(s["id"] == candidate["id"] for s in selected):
                candidate["rank"] = len(selected) + 1
                candidate["title"] = f"Viral Hook #{candidate['rank']} (Score: {candidate['viralScoreOverall']})"
                selected.append(candidate)

    return selected
