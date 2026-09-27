"""
B-Roll Semantic Matcher
Extracts key concepts from transcript segments and matches relevant B-roll visual clips.
Avoids repetitive / random clips by performing semantic query extraction and scoring.
"""

import re
from typing import List, Dict, Any, Optional, Tuple

CONCEPT_KEYWORDS = {
    "technology": ["ai", "artificial intelligence", "coding", "python", "developer", "computer", "algorithm", "software", "tech", "laptop"],
    "finance": ["money", "crypto", "bitcoin", "stocks", "wealth", "investing", "dollar", "profit", "business"],
    "lifestyle": ["coffee", "morning", "workout", "gym", "travel", "city", "street", "car", "sunset"],
    "growth": ["success", "motivation", "hard work", "goal", "focus", "discipline", "mindset", "reading"]
}

def extract_semantic_concepts(text: str) -> List[Tuple[str, str, float]]:
    """Extracts search query, concept category, and relevance score."""
    clean_text = text.lower()
    matches = []
    
    for category, keywords in CONCEPT_KEYWORDS.items():
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', clean_text):
                score = 0.85 if len(kw) > 4 else 0.72
                matches.append((kw, category, score))

    if not matches:
        # Fallback to key nouns
        words = [w for w in re.findall(r'\b[a-zA-Z]{4,}\b', clean_text) if w not in {"this", "that", "with", "have", "from", "they", "will"}]
        if words:
            return [(words[0], "general", 0.65)]
        return [("cinematic background", "abstract", 0.50)]

    matches.sort(key=lambda x: x[2], reverse=True)
    return matches

def generate_broll_candidates(segments: List[Dict[str, Any]], max_events: int = 5) -> List[Dict[str, Any]]:
    """Generates context-aware B-roll insertion points across the video."""
    candidates = []
    last_event_end = -10.0

    for seg in segments:
        start = float(seg.get("start", 0.0))
        end = float(seg.get("end", 0.0))
        text = str(seg.get("text", ""))

        # Don't place B-roll too close together (at least 4s gap)
        if start - last_event_end < 4.0:
            continue

        concepts = extract_semantic_concepts(text)
        if concepts and concepts[0][2] >= 0.70:
            best_query, category, score = concepts[0]
            event_duration = min(end - start, 3.5)
            if event_duration >= 1.5:
                candidates.append({
                    "id": f"broll_{int(start * 100)}",
                    "start": round(start, 2),
                    "end": round(start + event_duration, 2),
                    "query": best_query,
                    "concept": category,
                    "reason": f"Matched high-salience topic '{best_query}' in segment",
                    "score": round(score, 2),
                    "assetUrl": None
                })
                last_event_end = start + event_duration

        if len(candidates) >= max_events:
            break

    return candidates
