/**
 * Production Caption Engine — 25 High-Impact Caption Styles
 * Provides word-level grouping, seek-safe state resolution,
 * and deterministic animation calculations.
 */

import { CaptionCustomization, CaptionSegment, CaptionStyleId, WordTiming } from '../types';

export interface CaptionStyleDefinition {
  id: CaptionStyleId;
  name: string;
  desc: string;
  category: 'viral' | 'cinematic' | 'podcast' | 'creative' | 'high_energy';
  config: CaptionCustomization;
}

export const CAPTION_STYLES_REGISTRY: CaptionStyleDefinition[] = [
  {
    id: 'clean',
    name: 'Clean Subtitle',
    desc: 'Understated crisp typography with dark translucent backing',
    category: 'podcast',
    config: {
      style: 'clean',
      preset: 'clean',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 22,
      fontWeight: 600,
      primaryColor: '#ffffff',
      highlightColor: '#38bdf8',
      strokeColor: 'transparent',
      strokeWidth: 0,
      hasShadow: false,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backgroundOpacity: 0.65,
      positionY: 82,
      wordsPerLine: 5,
      wordsPerGroup: 5,
      maxLines: 2,
      alignment: 'center',
      animationType: 'fade',
      uppercase: false,
    },
  },
  {
    id: 'minimal',
    name: 'Minimal Sans',
    desc: 'Ultra-clean modern sans with subtle reading indicator',
    category: 'podcast',
    config: {
      style: 'minimal',
      preset: 'minimal',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: 21,
      fontWeight: 500,
      primaryColor: '#e2e8f0',
      highlightColor: '#ffffff',
      strokeColor: 'transparent',
      strokeWidth: 0,
      hasShadow: false,
      positionY: 80,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'fade',
      uppercase: false,
    },
  },
  {
    id: 'bold',
    name: 'Bold Impact',
    desc: 'Heavyweight black outlined capitals designed to command attention',
    category: 'viral',
    config: {
      style: 'bold',
      preset: 'bold',
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: 32,
      fontWeight: 900,
      primaryColor: '#ffffff',
      highlightColor: '#facc15',
      strokeColor: '#000000',
      strokeWidth: 3.5,
      hasShadow: true,
      shadowColor: 'rgba(0, 0, 0, 0.9)',
      positionY: 72,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'pop',
      uppercase: true,
    },
  },
  {
    id: 'viral',
    name: 'Viral Keyword',
    desc: 'Punchy words with alternating bright yellow keyword pop',
    category: 'viral',
    config: {
      style: 'viral',
      preset: 'viral',
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: 30,
      fontWeight: 900,
      primaryColor: '#ffffff',
      highlightColor: '#facc15',
      strokeColor: '#000000',
      strokeWidth: 3,
      hasShadow: true,
      positionY: 70,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'pop',
      uppercase: true,
    },
  },
  {
    id: 'tiktok',
    name: 'TikTok Pop',
    desc: 'Classic TikTok short-form aesthetic with red & yellow accent punches',
    category: 'viral',
    config: {
      style: 'tiktok',
      preset: 'tiktok',
      fontFamily: 'Proxima Nova, Montserrat, Arial Black, sans-serif',
      fontSize: 28,
      fontWeight: 800,
      primaryColor: '#ffffff',
      highlightColor: '#fe2c55',
      strokeColor: '#000000',
      strokeWidth: 2.8,
      hasShadow: true,
      positionY: 68,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'bounce',
      uppercase: true,
    },
  },
  {
    id: 'youtube',
    name: 'YouTube Shorts Classic',
    desc: 'Clean bold subtitle with iconic YouTube red keyword emphasis',
    category: 'viral',
    config: {
      style: 'youtube',
      preset: 'youtube',
      fontFamily: 'Roboto, Arial Black, sans-serif',
      fontSize: 29,
      fontWeight: 800,
      primaryColor: '#ffffff',
      highlightColor: '#ff0000',
      strokeColor: '#000000',
      strokeWidth: 3,
      hasShadow: true,
      positionY: 74,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'scale',
      uppercase: true,
    },
  },
  {
    id: 'podcast',
    name: 'Podcast Conversational',
    desc: 'Two-tone dialogue styling with past words dimmed and current speech lit',
    category: 'podcast',
    config: {
      style: 'podcast',
      preset: 'podcast',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: 24,
      fontWeight: 700,
      primaryColor: '#94a3b8',
      highlightColor: '#38bdf8',
      strokeColor: '#000000',
      strokeWidth: 1.5,
      hasShadow: true,
      positionY: 76,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'highlight',
      uppercase: false,
    },
  },
  {
    id: 'karaoke',
    name: 'Karaoke Flow',
    desc: 'Word-by-word synchronized fluid gradient reveal',
    category: 'high_energy',
    config: {
      style: 'karaoke',
      preset: 'karaoke',
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 28,
      fontWeight: 800,
      primaryColor: '#64748b',
      highlightColor: '#22c55e',
      strokeColor: '#0f172a',
      strokeWidth: 2,
      hasShadow: true,
      positionY: 72,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'karaoke',
      uppercase: true,
    },
  },
  {
    id: 'word_highlight',
    name: 'Word Highlight Box',
    desc: 'Highlighter pill sliding behind current active word',
    category: 'viral',
    config: {
      style: 'word_highlight',
      preset: 'word_highlight',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: 26,
      fontWeight: 800,
      primaryColor: '#ffffff',
      highlightColor: '#0a0a0a',
      strokeColor: 'transparent',
      strokeWidth: 0,
      hasShadow: false,
      backgroundColor: '#facc15',
      backgroundOpacity: 1.0,
      positionY: 72,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'highlight',
      uppercase: true,
    },
  },
  {
    id: 'pop',
    name: 'Elastic Pop',
    desc: 'Spring-loaded word bounce with vivid multi-color accents',
    category: 'high_energy',
    config: {
      style: 'pop',
      preset: 'pop',
      fontFamily: 'Arial Black, sans-serif',
      fontSize: 30,
      fontWeight: 900,
      primaryColor: '#ffffff',
      highlightColor: '#ec4899',
      strokeColor: '#000000',
      strokeWidth: 2.8,
      hasShadow: true,
      positionY: 70,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'pop',
      uppercase: true,
    },
  },
  {
    id: 'bounce',
    name: 'Dynamic Bounce',
    desc: 'Upbeat vertical bounce on every active spoken word',
    category: 'high_energy',
    config: {
      style: 'bounce',
      preset: 'bounce',
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 30,
      fontWeight: 900,
      primaryColor: '#ffffff',
      highlightColor: '#06b6d4',
      strokeColor: '#000000',
      strokeWidth: 2.5,
      hasShadow: true,
      positionY: 70,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'bounce',
      uppercase: true,
    },
  },
  {
    id: 'typewriter',
    name: 'Terminal Typewriter',
    desc: 'Monospace code font with dynamic cursor reveal',
    category: 'creative',
    config: {
      style: 'typewriter',
      preset: 'typewriter',
      fontFamily: 'Courier New, monospace',
      fontSize: 23,
      fontWeight: 700,
      primaryColor: '#34d399',
      highlightColor: '#a7f3d0',
      strokeColor: '#064e3b',
      strokeWidth: 1.2,
      hasShadow: true,
      positionY: 75,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'typewriter',
      uppercase: false,
    },
  },
  {
    id: 'neon',
    name: 'Cyberpunk Neon',
    desc: 'Vibrant glowing cyan and magenta text with multi-layered neon radiance',
    category: 'creative',
    config: {
      style: 'neon',
      preset: 'neon',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: 29,
      fontWeight: 800,
      primaryColor: '#38bdf8',
      highlightColor: '#f43f5e',
      strokeColor: '#0284c7',
      strokeWidth: 2,
      hasShadow: true,
      shadowColor: 'rgba(56, 189, 248, 0.8)',
      positionY: 72,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'pop',
      uppercase: true,
    },
  },
  {
    id: 'glitch',
    name: 'Digital Glitch',
    desc: 'Edgy RGB split aberration with chromatic burst on emphasis',
    category: 'creative',
    config: {
      style: 'glitch',
      preset: 'glitch',
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: 30,
      fontWeight: 900,
      primaryColor: '#f8fafc',
      highlightColor: '#ef4444',
      strokeColor: '#0284c7',
      strokeWidth: 2.2,
      hasShadow: true,
      shadowColor: 'rgba(239, 68, 68, 0.7)',
      positionY: 70,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'glitch',
      uppercase: true,
    },
  },
  {
    id: 'cinematic',
    name: 'Cinematic Editorial',
    desc: 'Spaced serif display with warm golden glow and letter-spacing',
    category: 'cinematic',
    config: {
      style: 'cinematic',
      preset: 'cinematic',
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: 24,
      fontWeight: 700,
      primaryColor: '#fef3c7',
      highlightColor: '#f59e0b',
      strokeColor: '#000000',
      strokeWidth: 1.8,
      hasShadow: true,
      positionY: 78,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      letterSpacing: 2,
      animationType: 'fade',
      uppercase: true,
    },
  },
  {
    id: 'news',
    name: 'Breaking News',
    desc: 'Bold lower-third broadcast ticker bar with high legibility',
    category: 'podcast',
    config: {
      style: 'news',
      preset: 'news',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: 23,
      fontWeight: 800,
      primaryColor: '#ffffff',
      highlightColor: '#ef4444',
      strokeColor: '#000000',
      strokeWidth: 1.5,
      hasShadow: false,
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      backgroundOpacity: 0.92,
      positionY: 82,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'fade',
      uppercase: true,
    },
  },
  {
    id: 'documentary',
    name: 'Documentary Storyteller',
    desc: 'Elegant muted sans with gentle word reveals and high contrast',
    category: 'cinematic',
    config: {
      style: 'documentary',
      preset: 'documentary',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 22,
      fontWeight: 600,
      primaryColor: '#e2e8f0',
      highlightColor: '#fbbf24',
      strokeColor: '#000000',
      strokeWidth: 1.5,
      hasShadow: true,
      positionY: 80,
      wordsPerLine: 5,
      wordsPerGroup: 5,
      maxLines: 2,
      alignment: 'center',
      animationType: 'fade',
      uppercase: false,
    },
  },
  {
    id: 'gaming',
    name: 'Gaming Hyper',
    desc: 'Bold slanted futuristic esports style with electric lime punches',
    category: 'high_energy',
    config: {
      style: 'gaming',
      preset: 'gaming',
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: 32,
      fontWeight: 900,
      primaryColor: '#f1f5f9',
      highlightColor: '#84cc16',
      strokeColor: '#0f172a',
      strokeWidth: 3.5,
      hasShadow: true,
      positionY: 68,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'scale',
      uppercase: true,
    },
  },
  {
    id: 'mrbeast',
    name: 'MrBeast Energetic',
    desc: 'Iconic oversized font with bright neon green/yellow keyword punches',
    category: 'viral',
    config: {
      style: 'mrbeast',
      preset: 'mrbeast',
      fontFamily: 'Komika Axis, Arial Black, Impact, sans-serif',
      fontSize: 34,
      fontWeight: 900,
      primaryColor: '#ffffff',
      highlightColor: '#a3e635',
      strokeColor: '#000000',
      strokeWidth: 4,
      hasShadow: true,
      shadowColor: 'rgba(0, 0, 0, 0.95)',
      positionY: 70,
      wordsPerLine: 2,
      wordsPerGroup: 2,
      maxLines: 2,
      alignment: 'center',
      animationType: 'pop',
      uppercase: true,
    },
  },
  {
    id: 'creator',
    name: 'Creator Studio',
    desc: 'Modern aesthetic favored by top tech & lifestyle creators',
    category: 'creative',
    config: {
      style: 'creator',
      preset: 'creator',
      fontFamily: 'Plus Jakarta Sans, Montserrat, sans-serif',
      fontSize: 27,
      fontWeight: 800,
      primaryColor: '#ffffff',
      highlightColor: '#818cf8',
      strokeColor: '#0f172a',
      strokeWidth: 2.2,
      hasShadow: true,
      positionY: 72,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'bounce',
      uppercase: false,
    },
  },
  {
    id: 'elegant',
    name: 'Serif Elegance',
    desc: 'Refined editorial typography with soft ivory tones',
    category: 'cinematic',
    config: {
      style: 'elegant',
      preset: 'elegant',
      fontFamily: 'Playfair Display, Georgia, serif',
      fontSize: 25,
      fontWeight: 600,
      primaryColor: '#f8fafc',
      highlightColor: '#d97706',
      strokeColor: '#000000',
      strokeWidth: 1.2,
      hasShadow: true,
      positionY: 78,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      letterSpacing: 1.5,
      animationType: 'fade',
      uppercase: false,
    },
  },
  {
    id: 'comic',
    name: 'Comic Pop Art',
    desc: 'Bold cartoon speech bubble feeling with intense black outline',
    category: 'creative',
    config: {
      style: 'comic',
      preset: 'comic',
      fontFamily: 'Impact, Comic Sans MS, sans-serif',
      fontSize: 31,
      fontWeight: 900,
      primaryColor: '#fef08a',
      highlightColor: '#f43f5e',
      strokeColor: '#000000',
      strokeWidth: 3.8,
      hasShadow: true,
      positionY: 70,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'pop',
      uppercase: true,
    },
  },
  {
    id: 'highlight_box',
    name: 'Solid Marker Box',
    desc: 'Highlighter box firmly highlighting the currently spoken words',
    category: 'viral',
    config: {
      style: 'highlight_box',
      preset: 'highlight_box',
      fontFamily: 'Plus Jakarta Sans, Arial Black, sans-serif',
      fontSize: 27,
      fontWeight: 800,
      primaryColor: '#ffffff',
      highlightColor: '#0f172a',
      strokeColor: 'transparent',
      strokeWidth: 0,
      hasShadow: false,
      backgroundColor: '#3b82f6',
      backgroundOpacity: 0.95,
      positionY: 74,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'highlight',
      uppercase: true,
    },
  },
  {
    id: 'gradient',
    name: 'Sunset Gradient',
    desc: 'Lush gradient text transition with warm orange-pink hues',
    category: 'creative',
    config: {
      style: 'gradient',
      preset: 'gradient',
      fontFamily: 'Montserrat, Arial Black, sans-serif',
      fontSize: 29,
      fontWeight: 800,
      primaryColor: '#f97316',
      highlightColor: '#ec4899',
      strokeColor: '#000000',
      strokeWidth: 2.2,
      hasShadow: true,
      positionY: 72,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'scale',
      uppercase: true,
    },
  },
  {
    id: 'dynamic',
    name: 'Dynamic Kinetic',
    desc: 'Context-reactive colors and scale shifts adjusting to speech energy',
    category: 'high_energy',
    config: {
      style: 'dynamic',
      preset: 'dynamic',
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: 30,
      fontWeight: 900,
      primaryColor: '#f1f5f9',
      highlightColor: '#f59e0b',
      strokeColor: '#0f172a',
      strokeWidth: 3,
      hasShadow: true,
      positionY: 70,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'pop',
      uppercase: true,
    },
  },
];

// Map backward compatibility aliases
const ALIAS_MAP: Record<string, CaptionStyleId> = {
  viral_bold: 'bold',
  hormozi: 'mrbeast',
  kinetic: 'dynamic',
  clean_subtitle: 'clean',
  dynamic_ai: 'dynamic',
  highlight: 'word_highlight',
  professional: 'clean',
};

/**
 * Gets styling attributes for a specific caption style preset
 */
export function getCaptionStylePreset(styleId: CaptionStyleId): CaptionCustomization {
  const canonicalId = ALIAS_MAP[styleId] || styleId;
  const match = CAPTION_STYLES_REGISTRY.find((s) => s.id === canonicalId) || CAPTION_STYLES_REGISTRY[0];
  return {
    ...match.config,
    animation: (match.config.animation || match.config.animationType) as any,
    animationType: match.config.animationType || match.config.animation,
    style: styleId,
    preset: styleId,
  };
}

export interface CaptionStateAtTime {
  activeCaption?: CaptionSegment;
  activeCaptionIndex: number;
  activeWordIndex: number;
  activeWord?: WordTiming;
  animationProgress: number; // 0.0 to 1.0 within current active word
  isWordSpoken: boolean;
  highlightState: {
    pastWordIndices: number[];
    activeWordIndex: number;
    upcomingWordIndices: number[];
  };
  revealedCharacterCount?: number;
}

/**
 * Deterministic, seek-safe caption calculation for ANY timestamp.
 * Guaranteed to produce identical, accurate state without depending on previous playback frames.
 */
export function getCaptionStateAtTime(
  captions: CaptionSegment[] = [],
  currentTime: number,
  config?: CaptionCustomization
): CaptionStateAtTime {
  if (!Array.isArray(captions) || captions.length === 0) {
    return {
      activeCaption: undefined,
      activeCaptionIndex: -1,
      activeWordIndex: -1,
      activeWord: undefined,
      animationProgress: 0,
      isWordSpoken: false,
      highlightState: {
        pastWordIndices: [],
        activeWordIndex: -1,
        upcomingWordIndices: [],
      },
    };
  }

  const activeCaptionIndex = captions.findIndex(
    (c) => currentTime >= c.start - 0.05 && currentTime <= c.end + 0.05
  );

  if (activeCaptionIndex === -1) {
    return {
      activeCaption: undefined,
      activeCaptionIndex: -1,
      activeWordIndex: -1,
      activeWord: undefined,
      animationProgress: 0,
      isWordSpoken: false,
      highlightState: {
        pastWordIndices: [],
        activeWordIndex: -1,
        upcomingWordIndices: [],
      },
    };
  }

  const activeCaption = captions[activeCaptionIndex];
  const words = activeCaption.words || [];

  const activeWordIndex = words.findIndex(
    (w) => currentTime >= w.start - 0.02 && currentTime <= w.end + 0.02
  );

  const pastWordIndices: number[] = [];
  const upcomingWordIndices: number[] = [];

  words.forEach((w, idx) => {
    if (currentTime > w.end + 0.02) {
      pastWordIndices.push(idx);
    } else if (currentTime < w.start - 0.02) {
      upcomingWordIndices.push(idx);
    }
  });

  let animationProgress = 0;
  let activeWord: WordTiming | undefined;

  if (activeWordIndex !== -1) {
    activeWord = words[activeWordIndex];
    const duration = Math.max(0.05, activeWord.end - activeWord.start);
    animationProgress = Math.max(0, Math.min(1, (currentTime - activeWord.start) / duration));
  }

  // Typewriter character reveal calculation
  let revealedCharacterCount: number | undefined;
  if (config?.animationType === 'typewriter') {
    const fullText = activeCaption.text || words.map((w) => w.word).join(' ');
    const segDur = Math.max(0.1, activeCaption.end - activeCaption.start);
    const progress = Math.max(0, Math.min(1, (currentTime - activeCaption.start) / segDur));
    revealedCharacterCount = Math.floor(progress * fullText.length);
  }

  return {
    activeCaption,
    activeCaptionIndex,
    activeWordIndex,
    activeWord,
    animationProgress,
    isWordSpoken: activeWordIndex !== -1,
    highlightState: {
      pastWordIndices,
      activeWordIndex,
      upcomingWordIndices,
    },
    revealedCharacterCount,
  };
}

/**
 * Backward-compatible helper for legacy components
 */
export function getActiveCaptionSegment(
  captions: CaptionSegment[] = [],
  currentTime: number
): { segment: CaptionSegment | undefined; activeWordIndex: number } {
  const state = getCaptionStateAtTime(captions, currentTime);
  return { segment: state.activeCaption, activeWordIndex: state.activeWordIndex };
}

export interface CaptionGroupingOptions {
  wordsPerGroup?: number;
  maxWordsPerSegment?: number;
  maxCharacters?: number;
  maxDuration?: number;
  maxDurationPerSegment?: number;
  pauseThresholdSeconds?: number;
  maxPauseSeconds?: number;
}

/**
 * Intelligent word-level grouping:
 * Groups timestamped words into natural, readable subtitle phrases:
 * - Respects sentence punctuation (. ? !)
 * - Splits on natural speech pauses (> 0.35s silence)
 * - Restricts words per group (default 3-5) and line length
 * - NEVER splits in the middle of a word
 */
export function groupWordsIntoCaptionSegments(
  words: WordTiming[],
  options: CaptionGroupingOptions = {}
): CaptionSegment[] {
  if (!Array.isArray(words) || words.length === 0) return [];

  const targetWordsPerGroup = Math.max(1, options.wordsPerGroup || options.maxWordsPerSegment || 4);
  const maxCharacters = options.maxCharacters || 36;
  const maxDuration = options.maxDuration || options.maxDurationPerSegment || 3.8;
  const pauseThreshold = options.pauseThresholdSeconds || options.maxPauseSeconds || 0.35;

  const sortedWords = [...words].sort((a, b) => a.start - b.start);
  const segments: CaptionSegment[] = [];
  let currentWords: WordTiming[] = [];

  const flushSegment = () => {
    if (currentWords.length === 0) return;
    const start = currentWords[0].start;
    const end = currentWords[currentWords.length - 1].end;
    const text = currentWords.map((w) => w.word).join(' ');
    segments.push({
      id: `cap_seg_${segments.length + 1}`,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      text,
      words: currentWords.map((w) => ({
        word: w.word,
        start: Number(w.start.toFixed(3)),
        end: Number(w.end.toFixed(3)),
        confidence: w.confidence ?? 0.95,
        isHighlight: Boolean(w.isHighlight),
      })),
    });
    currentWords = [];
  };

  for (let i = 0; i < sortedWords.length; i++) {
    const currentWord = sortedWords[i];
    const prevWord = currentWords[currentWords.length - 1];

    if (prevWord) {
      const pause = currentWord.start - prevWord.end;
      const endsWithPunct = /[.?!]$/.test(prevWord.word);
      const curLength = currentWords.map((w) => w.word).join(' ').length;
      const exceedsDuration = currentWord.end - currentWords[0].start > maxDuration;

      if (
        pause > pauseThreshold ||
        endsWithPunct ||
        currentWords.length >= targetWordsPerGroup ||
        curLength + currentWord.word.length > maxCharacters ||
        exceedsDuration
      ) {
        flushSegment();
      }
    }

    currentWords.push(currentWord);
  }

  flushSegment();
  return segments;
}

/**
 * Calculates transcript and caption coverage metrics across full duration
 */
export function calculateCaptionCoverage(
  captions: CaptionSegment[],
  totalDuration: number
): {
  coveragePercent: number;
  totalWords: number;
  speechDuration: number;
  coveredQuartiles: [boolean, boolean, boolean, boolean];
  quartileCoverage: { q1: boolean; q2: boolean; q3: boolean; q4: boolean };
} {
  if (!captions || captions.length === 0 || totalDuration <= 0) {
    return {
      coveragePercent: 0,
      totalWords: 0,
      speechDuration: 0,
      coveredQuartiles: [false, false, false, false],
      quartileCoverage: { q1: false, q2: false, q3: false, q4: false },
    };
  }

  let totalWords = 0;
  let speechDuration = 0;
  const q1 = totalDuration * 0.25;
  const q2 = totalDuration * 0.5;
  const q3 = totalDuration * 0.75;

  let hasQ1 = false;
  let hasQ2 = false;
  let hasQ3 = false;
  let hasQ4 = false;

  for (const c of captions) {
    totalWords += (c.words || []).length || c.text.split(/\s+/).filter(Boolean).length;
    speechDuration += Math.max(0, c.end - c.start);

    if (c.start <= q1) hasQ1 = true;
    if (c.end >= q1 && c.start <= q2) hasQ2 = true;
    if (c.end >= q2 && c.start <= q3) hasQ3 = true;
    if (c.end >= q3) hasQ4 = true;
  }

  const coveragePercent = Math.min(100, Math.round((speechDuration / totalDuration) * 100));

  return {
    coveragePercent,
    totalWords,
    speechDuration: Number(speechDuration.toFixed(2)),
    coveredQuartiles: [hasQ1, hasQ2, hasQ3, hasQ4],
    quartileCoverage: { q1: hasQ1, q2: hasQ2, q3: hasQ3, q4: hasQ4 },
  };
}
