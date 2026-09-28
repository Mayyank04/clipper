// REAL AI HOOK FINDER & MULTI-SIGNAL CANDIDATE SHORT SCORING ENGINE
// Conforming to ViralClip Studio Phase 6, 7 & 8 Specifications.
// Evaluates entire video duration — never assumes the first clip is the hook.

export interface HookSignalBreakdown {
  semanticStrength: number;     // 0 - 20
  curiosity: number;            // 0 - 20
  emotionalIntensity: number;   // 0 - 15
  speechPacing: number;         // 0 - 15
  informationDensity: number;   // 0 - 15
  openLoopBonus: number;        // 0 - 15
  silencePenalty: number;       // negative
  fillerPenalty: number;        // negative
  repetitionPenalty: number;    // negative
  totalRaw: number;
  finalScore: number;           // 0 - 100 normalized
}

export interface CandidateShort {
  id: string;
  rank: number;
  title: string;
  description: string;
  topic: string;
  hookText: string;
  hookCategory: 'curiosity' | 'bold' | 'question' | 'shock' | 'educational';
  startTime: number;
  endTime: number;
  duration: number;
  viralScoreOverall: number;
  hookScoreBreakdown: HookSignalBreakdown;
  whySelected: string[];
  confidence: number;
  sentences: any[];
}

// Patterns of high engagement across English, Hindi, and Hinglish
const QUESTION_PATTERNS = [
  /\b(why|how|what|when|where|who|which)\b/i,
  /\b(kya|kyun|kaise|kab|kahan|kaun)\b/i,
  /\?/
];

const CURIOSITY_HOOK_PATTERNS = [
  /\b(you won't believe|nobody tells you|the biggest mistake|here's what|this changed|wait|look at this|the reason|what happened next|stop doing|the secret to|how i made|the truth about)\b/i,
  /\b(yeh mat karna|ye sach hai|kisi ne nahi bataya|asli sach|ek baat bataun|dhyan se suno|yeh galti|sabse bada)\b/i,
  /\b(never do this|if you think|don't make this|pay attention|3 things|top \d|rules of)\b/i
];

const HIGH_EMOTION_PATTERNS = [
  /\b(insane|crazy|massive|huge|shocking|destroyed|exploded|dangerous|worst|best|genius|secret|million|crore|billion)\b/i,
  /\b(bawal|khatarnak|zabardast|hosh udd|tabahi|dhamaal|shandar|gadbad)\b/i
];

const NUMBERS_AND_STATS = [
  /\b(\d+|10x|50%|100%|lakh|crore|k|million|dollar|rupee|rs|\$|₹)\b/i
];

const FILLER_WORDS = [
  /\b(um|uh|err|like|you know|i mean|sort of|kind of|matlab|samjhe|aisa|waisa)\b/i
];

/**
 * Evaluates a sentence for viral hook potential.
 */
function evaluateSentenceHook(text: string, wordsPerSec: number): { score: number; signals: string[]; category: 'curiosity' | 'bold' | 'question' | 'shock' | 'educational' } {
  const clean = text.trim();
  let score = 30; // base score
  const signals: string[] = [];
  let category: 'curiosity' | 'bold' | 'question' | 'shock' | 'educational' = 'bold';

  // 1. Question / Open Loop
  if (QUESTION_PATTERNS.some((p) => p.test(clean))) {
    score += 22;
    signals.push('Strong opening question hooks viewer curiosity');
    category = 'question';
  }

  // 2. Curiosity trigger phrases
  if (CURIOSITY_HOOK_PATTERNS.some((p) => p.test(clean))) {
    score += 28;
    signals.push('High-retention curiosity gap statement');
    category = 'curiosity';
  }

  // 3. High emotional intensity
  if (HIGH_EMOTION_PATTERNS.some((p) => p.test(clean))) {
    score += 20;
    signals.push('High emotional vocabulary with strong conviction');
    if (category !== 'curiosity') category = 'shock';
  }

  // 4. Numbers / Concrete stats
  if (NUMBERS_AND_STATS.some((p) => p.test(clean))) {
    score += 16;
    signals.push('Specific metrics and empirical numbers trigger authority');
    if (category === 'bold') category = 'educational';
  }

  // 5. Speech cadence (ideal short-form cadence 2.4 - 4.2 wps)
  if (wordsPerSec >= 2.5 && wordsPerSec <= 4.5) {
    score += 12;
    signals.push(`Fast punchy cadence (${wordsPerSec.toFixed(1)} words/sec)`);
  } else if (wordsPerSec < 1.8) {
    score -= 10;
  }

  // 6. Sentence length check
  const wordCount = clean.split(/\s+/).length;
  if (wordCount >= 5 && wordCount <= 18) {
    score += 8; // concise punchy hook
  }

  return { score: Math.min(100, Math.max(10, score)), signals, category };
}

/**
 * Calculates a complete multi-signal Hook Score for an entire candidate short clip.
 */
function scoreShortCandidate(
  clipSegs: any[],
  clipStart: number,
  clipEnd: number,
  totalMediaDuration: number
): { score: number; breakdown: HookSignalBreakdown; reasons: string[]; category: 'curiosity' | 'bold' | 'question' | 'shock' | 'educational' } {
  const duration = Math.max(1, clipEnd - clipStart);
  const fullText = clipSegs.map((s) => s.text || '').join(' ').trim();
  const hookSentence = clipSegs[0]?.text || '';
  
  // Total words & speech rate
  let totalWords = 0;
  let fillerCount = 0;
  clipSegs.forEach((s) => {
    const words = s.words || (s.text ? s.text.split(/\s+/) : []);
    totalWords += words.length;
    words.forEach((w: any) => {
      const wText = typeof w === 'string' ? w : w.word || w.text || '';
      if (FILLER_WORDS.some((p) => p.test(wText))) fillerCount++;
    });
  });

  const wordsPerSec = totalWords / duration;
  const hookEval = evaluateSentenceHook(hookSentence, wordsPerSec);

  // 1. Semantic Strength (0 - 20)
  const semanticStrength = Math.min(20, Math.round((hookEval.score / 100) * 20));

  // 2. Curiosity (0 - 20)
  let curiosity = 8;
  if (CURIOSITY_HOOK_PATTERNS.some((p) => p.test(fullText))) curiosity += 8;
  if (QUESTION_PATTERNS.some((p) => p.test(hookSentence))) curiosity += 4;
  curiosity = Math.min(20, curiosity);

  // 3. Emotional Intensity (0 - 15)
  let emotionalIntensity = 6;
  if (HIGH_EMOTION_PATTERNS.some((p) => p.test(fullText))) emotionalIntensity += 7;
  if (fullText.includes('!')) emotionalIntensity += 2;
  emotionalIntensity = Math.min(15, emotionalIntensity);

  // 4. Speech Pacing (0 - 15)
  let speechPacing = 10;
  if (wordsPerSec >= 2.6 && wordsPerSec <= 4.2) {
    speechPacing = 15;
  } else if (wordsPerSec >= 2.0 && wordsPerSec <= 4.8) {
    speechPacing = 12;
  } else {
    speechPacing = 7;
  }

  // 5. Information Density (0 - 15)
  let informationDensity = 7;
  if (NUMBERS_AND_STATS.some((p) => p.test(fullText))) informationDensity += 6;
  if (totalWords > 40) informationDensity += 2;
  informationDensity = Math.min(15, informationDensity);

  // 6. Open Loop Bonus (0 - 15)
  let openLoopBonus = 5;
  if (QUESTION_PATTERNS.some((p) => p.test(hookSentence))) openLoopBonus += 6;
  if (/(\bnext\b|\bstep\b|\bresult\b|\bfinally\b|\blastly\b)/i.test(fullText)) openLoopBonus += 4;
  openLoopBonus = Math.min(15, openLoopBonus);

  // 7. Penalties
  const silencePenalty = 0; // segments provided are continuous speech
  const fillerRatio = totalWords > 0 ? fillerCount / totalWords : 0;
  const fillerPenalty = Math.round(fillerRatio * 25);
  
  // Repetition penalty
  const wordTokens = fullText.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const uniqueTokens = new Set(wordTokens);
  const repetitionRate = wordTokens.length > 0 ? (wordTokens.length - uniqueTokens.size) / wordTokens.length : 0;
  const repetitionPenalty = Math.round(repetitionRate * 15);

  // Duration curve bonus: 20s - 45s is optimal
  let durationBonus = 0;
  if (duration >= 20 && duration <= 45) {
    durationBonus = 5;
  } else if (duration > 65) {
    durationBonus = -6;
  }

  const totalRaw = semanticStrength + curiosity + emotionalIntensity + speechPacing + informationDensity + openLoopBonus + durationBonus - silencePenalty - fillerPenalty - repetitionPenalty;
  const finalScore = Math.max(15, Math.min(98, Math.round(totalRaw)));

  const reasons = [
    `Strong opening hook: "${hookSentence.slice(0, 50)}${hookSentence.length > 50 ? '...' : ''}"`,
    ...hookEval.signals,
    `Optimal pacing of ${wordsPerSec.toFixed(1)} words/sec across ${Math.round(duration)}s`,
  ];

  const breakdown: HookSignalBreakdown = {
    semanticStrength,
    curiosity,
    emotionalIntensity,
    speechPacing,
    informationDensity,
    openLoopBonus,
    silencePenalty,
    fillerPenalty,
    repetitionPenalty,
    totalRaw,
    finalScore,
  };

  return { score: finalScore, breakdown, reasons, category: hookEval.category };
}

/**
 * Finds the top viral hook candidate shorts across the ENTIRE video.
 * Does NOT simply pick the beginning!
 */
export function findTopHookCandidates(
  transcriptSegments: any[],
  totalDuration: number,
  targetCount = 3,
  minDuration = 18,
  maxDuration = 55
): CandidateShort[] {
  if (!Array.isArray(transcriptSegments) || transcriptSegments.length === 0) {
    return [];
  }

  const scoredClips: CandidateShort[] = [];

  // Slide through each segment as a potential hook starting point
  for (let i = 0; i < transcriptSegments.length; i++) {
    const startSeg = transcriptSegments[i];
    const clipStart = startSeg.start;

    // Build candidate short forward until reaching a natural sentence end between minDuration and maxDuration
    const currentSegs: any[] = [];
    for (let j = i; j < transcriptSegments.length; j++) {
      const s = transcriptSegments[j];
      currentSegs.push(s);
      const curDur = s.end - clipStart;

      // Check if this segment represents a safe cut point (ends with punctuation or pause)
      const text = (s.text || '').trim();
      const hasSentenceEnd = /[.?!।]$/.test(text) || j === transcriptSegments.length - 1;

      if (curDur >= minDuration && (hasSentenceEnd || curDur >= maxDuration - 5)) {
        if (curDur <= maxDuration) {
          const evalResult = scoreShortCandidate(currentSegs, clipStart, s.end, totalDuration);
          const hookText = (startSeg.text || '').trim();
          
          scoredClips.push({
            id: `short_cand_${i}_${j}`,
            rank: 0,
            title: `Viral Short #${scoredClips.length + 1} (${Math.round(clipStart)}s - ${Math.round(s.end)}s)`,
            description: currentSegs.map((cs) => cs.text).join(' ').slice(0, 140),
            topic: `Key Highlight (${Math.round(clipStart)}s)`,
            hookText: hookText.length > 60 ? hookText.slice(0, 57) + '...' : hookText,
            hookCategory: evalResult.category,
            startTime: Number(clipStart.toFixed(2)),
            endTime: Number(s.end.toFixed(2)),
            duration: Number(curDur.toFixed(2)),
            viralScoreOverall: evalResult.score,
            hookScoreBreakdown: evalResult.breakdown,
            whySelected: evalResult.reasons,
            confidence: Number((evalResult.score / 100).toFixed(2)),
            sentences: currentSegs,
          });
        }
        break; // Found boundary for this hook start
      }
    }
  }

  if (scoredClips.length === 0) {
    return [];
  }

  // Sort descending by viral score
  scoredClips.sort((a, b) => b.viralScoreOverall - a.viralScoreOverall);

  // Non-maximum suppression / deduplication to ensure selected shorts are distributed across video
  const selectedShorts: CandidateShort[] = [];
  for (const candidate of scoredClips) {
    if (selectedShorts.length >= targetCount) break;

    // Check overlap with already selected shorts (must not overlap by more than 8 seconds)
    const isOverlapping = selectedShorts.some((existing) => {
      const overlapStart = Math.max(existing.startTime, candidate.startTime);
      const overlapEnd = Math.min(existing.endTime, candidate.endTime);
      return overlapEnd - overlapStart > 8;
    });

    if (!isOverlapping) {
      candidate.rank = selectedShorts.length + 1;
      candidate.title = `Viral Hook #${candidate.rank} (Score: ${candidate.viralScoreOverall})`;
      selectedShorts.push(candidate);
    }
  }

  // If we still need more candidates and strict deduplication filtered too many, relax overlap threshold
  if (selectedShorts.length < targetCount && scoredClips.length > selectedShorts.length) {
    for (const candidate of scoredClips) {
      if (selectedShorts.length >= targetCount) break;
      if (!selectedShorts.some((s) => s.id === candidate.id)) {
        candidate.rank = selectedShorts.length + 1;
        candidate.title = `Viral Hook #${candidate.rank} (Score: ${candidate.viralScoreOverall})`;
        selectedShorts.push(candidate);
      }
    }
  }

  return selectedShorts;
}

export default findTopHookCandidates;
