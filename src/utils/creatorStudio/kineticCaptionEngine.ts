/**
 * VIRALCLIP STUDIO — KINETIC CAPTION ENGINE
 * Professional kinetic captions with semantic word emphasis,
 * controlled word-by-word animation, semantic phrase line breaking,
 * safe zone positioning for 1080x1920, and dynamic scene variation.
 */

import { EmphasisDecision, ReferenceStyleProfile } from './types';
import { REFERENCE_MIX, REFERENCE_STYLE_A, REFERENCE_STYLE_B } from './referenceStyleAnalyzer';
import { WordTiming } from '../../types';

export interface KineticWord {
  id: string;
  word: string;
  start: number;
  end: number;
  emphasis?: EmphasisDecision;
  isEmphasized: boolean;
}

export interface KineticCaptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  words: KineticWord[];
  lines: string[];
  style: ReferenceStyleProfile['captionStyle'];
  positionY: number; // 0-100%
  sceneRole: 'hook' | 'body' | 'climax' | 'cta';
}

/**
 * Deterministic font stack definition for production rendering
 */
export const SUPPORTED_FONTS = [
  { id: 'inter', name: 'Inter', stack: 'Inter, system-ui, sans-serif' },
  { id: 'montserrat', name: 'Montserrat', stack: 'Montserrat, sans-serif' },
  { id: 'poppins', name: 'Poppins', stack: 'Poppins, sans-serif' },
  { id: 'manrope', name: 'Manrope', stack: 'Manrope, sans-serif' },
  { id: 'roboto', name: 'Roboto', stack: 'Roboto, Arial, sans-serif' },
  { id: 'arial', name: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
  { id: 'noto_sans', name: 'Noto Sans', stack: '"Noto Sans", sans-serif' },
  { id: 'noto_sans_devanagari', name: 'Noto Sans Devanagari', stack: '"Noto Sans Devanagari", sans-serif' },
  { id: 'noto_sans_gurmukhi', name: 'Noto Sans Gurmukhi', stack: '"Noto Sans Gurmukhi", sans-serif' },
  { id: 'noto_sans_arabic', name: 'Noto Sans Arabic', stack: '"Noto Sans Arabic", sans-serif' },
];

// Semantic dictionary patterns
const HOOK_WORDS = new Set([
  'secret', 'shocking', 'truth', 'exposed', 'never', 'always', 'stop', 'warning',
  'insane', 'crazy', 'biggest', 'worst', 'mistake', 'genius', 'unbelievable', 'urgent',
  'watch', 'listen', 'look', 'wait', 'remember', 'check', 'hack', 'trick'
]);

const STRONG_VERBS = new Set([
  'make', 'build', 'create', 'destroy', 'double', 'triple', 'scale', 'launch',
  'grow', 'win', 'lose', 'explode', 'crush', 'dominate', 'master', 'transform',
  'start', 'stop', 'quit', 'change', 'unlock', 'reveal', 'discover', 'learn'
]);

const EMOTION_WORDS = new Set([
  'love', 'hate', 'amazing', 'terrible', 'impossible', 'guaranteed', 'epic',
  'painful', 'scary', 'hilarious', 'brutal', 'powerful', 'gamechanger', 'mindblowing'
]);

const CTA_WORDS = new Set([
  'subscribe', 'follow', 'link', 'bio', 'comment', 'share', 'save', 'click', 'free', 'download'
]);

/**
 * Analyzes a word token and determines semantic emphasis
 */
export function analyzeSemanticWordEmphasis(
  word: string,
  index: number,
  highlightPalette: { primary: string; secondary: string; accent: string },
  allowEmphasis: boolean = true
): EmphasisDecision | undefined {
  if (!allowEmphasis) return undefined;

  const clean = word.toLowerCase().replace(/[^a-z0-9$%]/g, '');
  const rawClean = word.replace(/[^a-zA-Z0-9$%]/g, '');

  // 1. Currency & Money (Highest priority, e.g. "$10,000", "100k", "million", "billion")
  if (/^\$[\d,]+(\.\d+)?$/.test(rawClean) || clean.includes('$') || clean.endsWith('k') && /^\d+k$/.test(clean) || clean === 'million' || clean === 'billion') {
    return {
      wordId: `w_emp_${index}`,
      wordIndex: index,
      text: word,
      reason: 'currency',
      confidence: 0.98,
      color: highlightPalette.primary, // e.g. Yellow or Red
    };
  }

  // 2. Numbers (e.g. "10", "100%", "3", "first")
  if (/^\d+(\.\d+)?%?$/.test(rawClean) || clean === 'first' || clean === 'second' || clean === 'three') {
    return {
      wordId: `w_emp_${index}`,
      wordIndex: index,
      text: word,
      reason: 'number',
      confidence: 0.94,
      color: highlightPalette.primary,
    };
  }

  // 3. Hook words (e.g. "biggest", "mistake", "secret")
  if (HOOK_WORDS.has(clean)) {
    return {
      wordId: `w_emp_${index}`,
      wordIndex: index,
      text: word,
      reason: 'hook',
      confidence: 0.92,
      color: highlightPalette.secondary || highlightPalette.primary,
    };
  }

  // 4. CTA words (e.g. "subscribe", "bio")
  if (CTA_WORDS.has(clean)) {
    return {
      wordId: `w_emp_${index}`,
      wordIndex: index,
      text: word,
      reason: 'cta',
      confidence: 0.90,
      color: highlightPalette.accent,
    };
  }

  // 5. Emotion words
  if (EMOTION_WORDS.has(clean)) {
    return {
      wordId: `w_emp_${index}`,
      wordIndex: index,
      text: word,
      reason: 'emotion',
      confidence: 0.88,
      color: highlightPalette.secondary,
    };
  }

  // 6. Strong Verbs
  if (STRONG_VERBS.has(clean)) {
    return {
      wordId: `w_emp_${index}`,
      wordIndex: index,
      text: word,
      reason: 'strong_verb',
      confidence: 0.84,
      color: highlightPalette.accent,
    };
  }

  return undefined;
}

/**
 * Splits a list of kinetic words into semantic lines (max 2 lines, 3-7 words per visual beat)
 */
export function breakCaptionLines(words: KineticWord[], maxWordsPerLine = 4): string[] {
  if (words.length <= maxWordsPerLine) {
    return [words.map((w) => w.word).join(' ')];
  }

  // Natural break point: near the middle, preferring punctuation or conjunction boundaries
  const mid = Math.ceil(words.length / 2);
  let splitIndex = mid;

  for (let i = 1; i < words.length - 1; i++) {
    const w = words[i].word;
    if (w.endsWith(',') || w.endsWith(';') || w.endsWith('.')) {
      splitIndex = i + 1;
      break;
    }
  }

  const line1 = words.slice(0, splitIndex).map((w) => w.word).join(' ');
  const line2 = words.slice(splitIndex).map((w) => w.word).join(' ');
  return line2 ? [line1, line2] : [line1];
}

/**
 * Builds kinetic caption segments with semantic word emphasis and safe-zone positioning
 */
export function buildKineticCaptionSegments(
  wordTimings: WordTiming[],
  styleProfile: ReferenceStyleProfile = REFERENCE_MIX,
  totalDurationSeconds: number = 30
): KineticCaptionSegment[] {
  if (!wordTimings || wordTimings.length === 0) return [];

  const segments: KineticCaptionSegment[] = [];
  const wordsPerBeat = 4; // 3-6 words per visual beat
  let currentGroup: WordTiming[] = [];

  const flushGroup = (group: WordTiming[], groupIndex: number) => {
    if (group.length === 0) return;

    const start = group[0].start;
    const end = group[group.length - 1].end;

    // Determine narrative scene role based on timeline progression
    const progress = start / Math.max(1, totalDurationSeconds);
    let sceneRole: 'hook' | 'body' | 'climax' | 'cta' = 'body';
    if (progress < 0.15) sceneRole = 'hook';
    else if (progress > 0.85) sceneRole = 'cta';
    else if (progress > 0.65 && progress <= 0.85) sceneRole = 'climax';

    // Style variation per scene
    let activeStyle = { ...styleProfile.captionStyle };
    if (sceneRole === 'hook') {
      activeStyle = { ...REFERENCE_STYLE_A.captionStyle }; // Bold, punchy hook
    } else if (sceneRole === 'climax') {
      activeStyle = { ...REFERENCE_STYLE_B.captionStyle }; // Cinematic warmth & emphasis
    }

    // Process kinetic words & semantic emphasis
    let emphasizedCount = 0;
    const kineticWords: KineticWord[] = group.map((wt, idx) => {
      let emp: EmphasisDecision | undefined;
      if (emphasizedCount < activeStyle.highlightRules.maxHighlightsPerPhrase) {
        emp = analyzeSemanticWordEmphasis(wt.word, idx, activeStyle.highlightColors, true);
        if (emp) emphasizedCount++;
      }
      return {
        id: `kw_${groupIndex}_${idx}`,
        word: activeStyle.uppercase ? wt.word.toUpperCase() : wt.word,
        start: wt.start,
        end: wt.end,
        emphasis: emp,
        isEmphasized: !!emp,
      };
    });

    const lines = breakCaptionLines(kineticWords, 4);
    const fullText = kineticWords.map((w) => w.word).join(' ');

    // Safe zone vertical position (Default ~76-78% avoids mobile bottom UI and face center)
    const positionY = activeStyle.positionY || 77;

    segments.push({
      id: `kseg_${groupIndex}_${Math.round(start * 100)}`,
      start,
      end,
      text: fullText,
      words: kineticWords,
      lines,
      style: activeStyle,
      positionY,
      sceneRole,
    });
  };

  let groupCounter = 0;
  for (let i = 0; i < wordTimings.length; i++) {
    const wt = wordTimings[i];
    currentGroup.push(wt);

    const isPunctuationBreak = wt.word.endsWith('.') || wt.word.endsWith('?') || wt.word.endsWith('!');
    const isCommaBreak = wt.word.endsWith(',') && currentGroup.length >= 3;
    const isLengthBreak = currentGroup.length >= wordsPerBeat;

    if (isPunctuationBreak || isCommaBreak || isLengthBreak || i === wordTimings.length - 1) {
      flushGroup(currentGroup, groupCounter++);
      currentGroup = [];
    }
  }

  return segments;
}
