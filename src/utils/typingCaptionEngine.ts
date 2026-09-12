/**
 * TypingCaptionEngine.ts
 *
 * Professional NLE Typing / Karaoke Animated Caption Engine.
 * Supports word-by-word reveal, character-by-character typing,
 * 15 distinctive typography styles, karaoke highlight modes,
 * AI word emphasis, and frame-accurate canvas/DOM rendering.
 */

import type { CSSProperties } from 'react';
import { CaptionSegment, WordTiming, AudioToVideoConfig, TypingStyleId } from '../types';

export interface RenderedWordState {
  word: string;
  revealedText: string;
  isFullyRevealed: boolean;
  isActive: boolean; // currently spoken
  isPast: boolean;   // already spoken
  isFuture: boolean; // not yet spoken
  isEmphasized: boolean;
  emphasisCategory?: string;
  scale: number;
  color: string;
  backgroundColor?: string;
  hasGlow: boolean;
  glowColor?: string;
  hasUnderline: boolean;
  opacity: number;
  cursor?: string;
}

export interface RenderedCaptionState {
  segment: CaptionSegment | null;
  renderedWords: RenderedWordState[];
  fullRevealedText: string;
  isTypingActive: boolean;
  cursorVisible: boolean;
  styleClasses: string;
  customStyle: CSSProperties;
  positionStyle: CSSProperties;
}

export interface TypingStyleDefinition {
  id: TypingStyleId;
  name: string;
  fontFamily: string;
  defaultFontSize: number;
  uppercase: boolean;
  letterSpacing: string;
  primaryColor: string;
  highlightColor: string;
  accentColor: string;
  glowColor?: string;
  hasCursor: boolean;
  cursorChar: string;
  lineHeight: number;
  textShadow?: string;
  backgroundPill?: boolean;
  pillColor?: string;
  boxBackground?: string;
  boxShadow?: string;
  border?: string;
}

export const TYPING_STYLES: Record<TypingStyleId, TypingStyleDefinition> = {
  minimal_type: {
    id: 'minimal_type',
    name: 'Minimal Type',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    defaultFontSize: 32,
    uppercase: false,
    letterSpacing: '0.02em',
    primaryColor: '#e2e8f0',
    highlightColor: '#38bdf8',
    accentColor: '#38bdf8',
    hasCursor: true,
    cursorChar: '|',
    lineHeight: 1.4,
  },
  karaoke: {
    id: 'karaoke',
    name: 'Karaoke',
    fontFamily: '"Cabinet Grotesk", sans-serif',
    defaultFontSize: 34,
    uppercase: true,
    letterSpacing: '0.05em',
    primaryColor: 'rgba(255, 255, 255, 0.45)',
    highlightColor: '#facc15',
    accentColor: '#fbbf24',
    hasCursor: false,
    cursorChar: '',
    lineHeight: 1.35,
    textShadow: '0 2px 8px rgba(0,0,0,0.8)',
  },
  word_pop: {
    id: 'word_pop',
    name: 'Word Pop',
    fontFamily: '"Cabinet Grotesk", sans-serif',
    defaultFontSize: 36,
    uppercase: true,
    letterSpacing: '0.04em',
    primaryColor: '#ffffff',
    highlightColor: '#22c55e',
    accentColor: '#10b981',
    hasCursor: false,
    cursorChar: '',
    lineHeight: 1.3,
    textShadow: '0 4px 12px rgba(0,0,0,0.85)',
  },
  typewriter: {
    id: 'typewriter',
    name: 'Typewriter',
    fontFamily: '"Space Grotesk", monospace',
    defaultFontSize: 30,
    uppercase: false,
    letterSpacing: '0.08em',
    primaryColor: '#f8fafc',
    highlightColor: '#fb923c',
    accentColor: '#f97316',
    hasCursor: true,
    cursorChar: '█',
    lineHeight: 1.5,
    textShadow: '0 0 6px rgba(251, 146, 60, 0.4)',
  },
  neon_lyrics: {
    id: 'neon_lyrics',
    name: 'Neon Lyrics',
    fontFamily: '"Bungee", cursive',
    defaultFontSize: 32,
    uppercase: true,
    letterSpacing: '0.06em',
    primaryColor: '#f43f5e',
    highlightColor: '#38bdf8',
    accentColor: '#a855f7',
    glowColor: '#38bdf8',
    hasCursor: false,
    cursorChar: '',
    lineHeight: 1.4,
    textShadow: '0 0 10px #38bdf8, 0 0 20px #38bdf8, 0 0 40px #0284c7',
  },
  cinematic_lyrics: {
    id: 'cinematic_lyrics',
    name: 'Cinematic Lyrics',
    fontFamily: '"Cinzel", serif',
    defaultFontSize: 30,
    uppercase: true,
    letterSpacing: '0.15em',
    primaryColor: '#fef08a',
    highlightColor: '#ffffff',
    accentColor: '#eab308',
    hasCursor: false,
    cursorChar: '',
    lineHeight: 1.5,
    textShadow: '0 2px 14px rgba(0,0,0,0.95)',
  },
  glowing_words: {
    id: 'glowing_words',
    name: 'Glowing Words',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    defaultFontSize: 34,
    uppercase: true,
    letterSpacing: '0.03em',
    primaryColor: '#94a3b8',
    highlightColor: '#ffffff',
    accentColor: '#ec4899',
    glowColor: '#ec4899',
    hasCursor: false,
    cursorChar: '',
    lineHeight: 1.35,
    textShadow: '0 0 12px #ec4899, 0 0 24px #be185d',
  },
  bold_center: {
    id: 'bold_center',
    name: 'Bold Center',
    fontFamily: '"Cabinet Grotesk", sans-serif',
    defaultFontSize: 40,
    uppercase: true,
    letterSpacing: '-0.02em',
    primaryColor: '#ffffff',
    highlightColor: '#facc15',
    accentColor: '#f59e0b',
    hasCursor: false,
    cursorChar: '',
    lineHeight: 1.25,
    textShadow: '0 4px 16px rgba(0,0,0,0.95)',
  },
  lower_third: {
    id: 'lower_third',
    name: 'Lower Third',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    defaultFontSize: 26,
    uppercase: false,
    letterSpacing: '0.01em',
    primaryColor: '#f8fafc',
    highlightColor: '#38bdf8',
    accentColor: '#0284c7',
    hasCursor: true,
    cursorChar: '_',
    lineHeight: 1.4,
    backgroundPill: true,
    pillColor: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
  },
  dynamic_highlight: {
    id: 'dynamic_highlight',
    name: 'Dynamic Highlight',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    defaultFontSize: 32,
    uppercase: false,
    letterSpacing: '0.02em',
    primaryColor: '#f1f5f9',
    highlightColor: '#0f172a',
    accentColor: '#facc15',
    hasCursor: false,
    cursorChar: '',
    lineHeight: 1.4,
    textShadow: '0 2px 8px rgba(0,0,0,0.7)',
  },
  retro_terminal: {
    id: 'retro_terminal',
    name: 'Retro Terminal',
    fontFamily: '"Space Grotesk", monospace',
    defaultFontSize: 28,
    uppercase: true,
    letterSpacing: '0.1em',
    primaryColor: '#4ade80',
    highlightColor: '#ffffff',
    accentColor: '#22c55e',
    glowColor: '#4ade80',
    hasCursor: true,
    cursorChar: '▋',
    lineHeight: 1.5,
    textShadow: '0 0 8px rgba(74, 222, 128, 0.8), 0 0 16px rgba(34, 197, 94, 0.5)',
  },
  clean_white: {
    id: 'clean_white',
    name: 'Clean White',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    defaultFontSize: 32,
    uppercase: false,
    letterSpacing: '0.01em',
    primaryColor: '#f8fafc',
    highlightColor: '#ffffff',
    accentColor: '#38bdf8',
    hasCursor: false,
    cursorChar: '',
    lineHeight: 1.4,
    textShadow: '0 2px 10px rgba(0,0,0,0.85)',
  },
  music_video: {
    id: 'music_video',
    name: 'Music Video',
    fontFamily: '"Cabinet Grotesk", sans-serif',
    defaultFontSize: 36,
    uppercase: true,
    letterSpacing: '0.06em',
    primaryColor: '#ffffff',
    highlightColor: '#f43f5e',
    accentColor: '#a855f7',
    hasCursor: false,
    cursorChar: '',
    lineHeight: 1.3,
    textShadow: '2px 2px 0px #f43f5e, -2px -2px 0px #38bdf8, 0 4px 12px rgba(0,0,0,0.9)',
  },
  emotional: {
    id: 'emotional',
    name: 'Emotional',
    fontFamily: '"Cinzel", serif',
    defaultFontSize: 32,
    uppercase: false,
    letterSpacing: '0.08em',
    primaryColor: '#e0e7ff',
    highlightColor: '#f472b6',
    accentColor: '#c084fc',
    hasCursor: false,
    cursorChar: '',
    lineHeight: 1.5,
    textShadow: '0 2px 16px rgba(0,0,0,0.9)',
  },
  beat_sync: {
    id: 'beat_sync',
    name: 'Beat Sync',
    fontFamily: '"Cabinet Grotesk", sans-serif',
    defaultFontSize: 36,
    uppercase: true,
    letterSpacing: '0.04em',
    primaryColor: '#ffffff',
    highlightColor: '#f59e0b',
    accentColor: '#ef4444',
    hasCursor: false,
    cursorChar: '',
    lineHeight: 1.3,
    textShadow: '0 0 14px rgba(245, 158, 11, 0.6), 0 4px 12px rgba(0,0,0,0.9)',
  },
};

/**
 * Default configuration for Audio to Video
 */
export const DEFAULT_AUDIO_VIDEO_CONFIG: AudioToVideoConfig = {
  typingStyle: 'karaoke',
  typingMode: 'karaoke',
  typingSpeed: 5,
  revealDuration: 0.35,
  holdDuration: 0.4,
  captionPosition: 'center',
  captionPositionX: 50,
  captionPositionY: 50,
  karaokeHighlightStyle: 'scale',
  visualizerStyle: 'bars',
  visualizerOpacity: 0.85,
  visualizerPosition: 'bottom',
  visualizerHeight: 80,
  visualizerSensitivity: 1.0,
  backgroundType: 'animated_gradient',
  backgroundColor: '#09090b',
  backgroundGradient: ['#0f172a', '#1e1b4b', '#020617'],
  beatSyncMotion: true,
  beatEnergy: 0.5,
  detectedMood: 'cinematic',
};

/**
 * Calculate the exact caption rendering state at any time `t` (seconds).
 * Deterministic and instantaneous: does not depend on past frames.
 */
export function getTypingCaptionState(
  captions: CaptionSegment[],
  currentTime: number,
  config: AudioToVideoConfig
): RenderedCaptionState {
  const activeSegment = captions.find(
    (c) => currentTime >= c.start && currentTime <= c.end + (config.holdDuration || 0.3)
  );

  const styleDef = TYPING_STYLES[config.typingStyle] || TYPING_STYLES.karaoke;

  // Compute CSS position
  let topPercent = config.captionPositionY ?? 50;
  if (config.captionPosition === 'top') topPercent = 20;
  else if (config.captionPosition === 'upper_center') topPercent = 35;
  else if (config.captionPosition === 'center') topPercent = 50;
  else if (config.captionPosition === 'lower_center') topPercent = 65;
  else if (config.captionPosition === 'bottom') topPercent = 80;

  const leftPercent = config.captionPositionX ?? 50;

  const positionStyle: CSSProperties = {
    position: 'absolute',
    top: `${topPercent}%`,
    left: `${leftPercent}%`,
    transform: 'translate(-50%, -50%)',
    width: '92%',
    maxWidth: '480px',
    textAlign: 'center',
    zIndex: 30,
    pointerEvents: 'none',
  };

  if (!activeSegment || !activeSegment.words || activeSegment.words.length === 0) {
    return {
      segment: null,
      renderedWords: [],
      fullRevealedText: '',
      isTypingActive: false,
      cursorVisible: false,
      styleClasses: '',
      customStyle: {},
      positionStyle,
    };
  }

  const words = activeSegment.words;
  const isKaraokeMode = config.typingMode === 'karaoke';
  const isCharByChar = config.typingMode === 'char_by_char';
  const isWordByWord = config.typingMode === 'word_by_word';
  const isPhraseMode = config.typingMode === 'phrase' || config.typingMode === 'sentence';

  // Blinking cursor state (500ms cycle)
  const cursorVisible = Math.floor(currentTime * 2) % 2 === 0;

  const renderedWords: RenderedWordState[] = [];
  let fullRevealedText = '';
  let isTypingActive = false;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const rawWord = w.word || (w as any).text || '';
    const wordStart = w.start;
    const wordEnd = w.end;
    const isActive = currentTime >= wordStart && currentTime < wordEnd;
    const isPast = currentTime >= wordEnd;
    const isFuture = currentTime < wordStart;

    if (isActive) isTypingActive = true;

    let revealedText = '';
    let isFullyRevealed = false;

    if (isKaraokeMode || isPhraseMode) {
      // In Karaoke and Phrase modes, the full word is visible
      revealedText = rawWord;
      isFullyRevealed = true;
    } else if (isWordByWord) {
      if (isPast || isActive) {
        revealedText = rawWord;
        isFullyRevealed = true;
      } else {
        revealedText = '';
        isFullyRevealed = false;
      }
    } else if (isCharByChar) {
      if (isPast) {
        revealedText = rawWord;
        isFullyRevealed = true;
      } else if (isActive) {
        // Interpolate character typing
        const wordDur = Math.max(0.05, wordEnd - wordStart);
        const progress = Math.min(1, Math.max(0, (currentTime - wordStart) / wordDur));
        const charCount = Math.floor(progress * (rawWord.length + 1));
        revealedText = rawWord.slice(0, Math.min(rawWord.length, charCount));
        isFullyRevealed = revealedText.length === rawWord.length;
      } else {
        revealedText = '';
        isFullyRevealed = false;
      }
    }

    if (revealedText) {
      fullRevealedText += (fullRevealedText ? ' ' : '') + revealedText;
    }

    // Determine scale and color
    let scale = 1.0;
    let color = styleDef.primaryColor;
    let backgroundColor: string | undefined;
    let hasGlow = false;
    let glowColor = styleDef.glowColor;
    let hasUnderline = false;
    let opacity = 1.0;

    // Karaoke dimming: inactive words are dimmed
    if (isKaraokeMode) {
      if (isActive) {
        color = w.highlightColor || styleDef.highlightColor;
        opacity = 1.0;

        switch (config.karaokeHighlightStyle) {
          case 'scale':
            scale = w.scale || 1.25;
            break;
          case 'glow':
            hasGlow = true;
            scale = 1.12;
            break;
          case 'underline':
            hasUnderline = true;
            break;
          case 'pill':
            backgroundColor = styleDef.accentColor || '#facc15';
            color = '#09090b';
            scale = 1.1;
            break;
          case 'bounce':
            scale = 1.3;
            break;
          case 'gradient':
            color = '#38bdf8';
            scale = 1.2;
            break;
          case 'color':
          default:
            scale = 1.15;
            break;
        }
      } else if (isPast) {
        color = 'rgba(255, 255, 255, 0.85)';
        opacity = 0.85;
      } else {
        // Future word
        color = styleDef.primaryColor;
        opacity = 0.4;
      }
    } else {
      // Non-karaoke styles
      if (isActive) {
        color = w.highlightColor || styleDef.highlightColor;
        scale = w.scale || (config.typingStyle === 'word_pop' ? 1.35 : 1.18);
        if (styleDef.glowColor || config.typingStyle === 'neon_lyrics' || config.typingStyle === 'glowing_words') {
          hasGlow = true;
        }
      } else if (isPast) {
        color = styleDef.primaryColor;
        scale = 1.0;
      }
    }

    // AI Word Emphasis override
    const isEmphasized = Boolean(w.isHighlight || (w.emphasisCategory && w.emphasisCategory !== 'none'));
    if (isEmphasized && (isActive || isPast)) {
      if (!isActive && isKaraokeMode) {
        color = w.highlightColor || styleDef.accentColor;
        opacity = 0.9;
      } else if (isActive) {
        scale = Math.max(scale, 1.28);
        hasGlow = true;
      }
    }

    renderedWords.push({
      word: rawWord,
      revealedText,
      isFullyRevealed,
      isActive,
      isPast,
      isFuture,
      isEmphasized,
      emphasisCategory: w.emphasisCategory,
      scale,
      color,
      backgroundColor,
      hasGlow,
      glowColor,
      hasUnderline,
      opacity,
      cursor: isActive && styleDef.hasCursor ? styleDef.cursorChar : undefined,
    });
  }

  return {
    segment: activeSegment,
    renderedWords,
    fullRevealedText,
    isTypingActive,
    cursorVisible,
    styleClasses: '',
    customStyle: {
      fontFamily: styleDef.fontFamily,
      letterSpacing: styleDef.letterSpacing,
      lineHeight: styleDef.lineHeight,
      textTransform: styleDef.uppercase ? 'uppercase' : 'none',
      textShadow: styleDef.textShadow,
      backgroundColor: styleDef.backgroundPill ? styleDef.pillColor : undefined,
      boxShadow: styleDef.boxShadow,
      border: styleDef.border,
      padding: styleDef.backgroundPill ? '10px 18px' : undefined,
      borderRadius: styleDef.backgroundPill ? '14px' : undefined,
    },
    positionStyle,
  };
}

/**
 * Render typing caption directly onto a Canvas 2D context for MP4 export.
 * Frame-accurate and identical to browser preview.
 */
export function drawTypingCaptionToCanvas(
  ctx: CanvasRenderingContext2D,
  captions: CaptionSegment[],
  currentTime: number,
  config: AudioToVideoConfig,
  canvasWidth: number,
  canvasHeight: number
): void {
  const state = getTypingCaptionState(captions, currentTime, config);
  if (!state.segment || state.renderedWords.length === 0) return;

  const styleDef = TYPING_STYLES[config.typingStyle] || TYPING_STYLES.karaoke;

  // Responsive scale factor (relative to 1080x1920 reference)
  const baseScale = Math.min(canvasWidth / 1080, canvasHeight / 1920);
  const fontSize = Math.round((styleDef.defaultFontSize || 34) * baseScale * 2.2);

  ctx.save();
  ctx.font = `${styleDef.uppercase ? '800' : '700'} ${fontSize}px ${styleDef.fontFamily || 'sans-serif'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Calculate coordinates
  let topPercent = config.captionPositionY ?? 50;
  if (config.captionPosition === 'top') topPercent = 20;
  else if (config.captionPosition === 'upper_center') topPercent = 35;
  else if (config.captionPosition === 'center') topPercent = 50;
  else if (config.captionPosition === 'lower_center') topPercent = 65;
  else if (config.captionPosition === 'bottom') topPercent = 80;

  const centerX = canvasWidth * ((config.captionPositionX ?? 50) / 100);
  const centerY = canvasHeight * (topPercent / 100);

  // Measure word widths to layout on a single or wrapped line
  const visibleWords = state.renderedWords.filter((w) => w.revealedText.length > 0);
  if (visibleWords.length === 0) {
    ctx.restore();
    return;
  }

  const spaceWidth = ctx.measureText(' ').width;
  const wordMetrics = visibleWords.map((w) => {
    const text = styleDef.uppercase ? w.revealedText.toUpperCase() : w.revealedText;
    const width = ctx.measureText(text).width * w.scale;
    return { text, width, state: w };
  });

  const totalWidth = wordMetrics.reduce((acc, m) => acc + m.width, 0) + (wordMetrics.length - 1) * spaceWidth;
  let currentX = centerX - totalWidth / 2;

  // Background pill if enabled
  if (styleDef.backgroundPill && styleDef.pillColor) {
    ctx.fillStyle = styleDef.pillColor;
    const paddingX = 24 * baseScale;
    const paddingY = 14 * baseScale;
    const pillH = fontSize + paddingY * 2;
    const pillW = totalWidth + paddingX * 2;
    const pillX = centerX - pillW / 2;
    const pillY = centerY - pillH / 2;

    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(pillX, pillY, pillW, pillH, 16 * baseScale) : ctx.rect(pillX, pillY, pillW, pillH);
    ctx.fill();

    if (styleDef.border) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2 * baseScale;
      ctx.stroke();
    }
  }

  // Draw each word
  for (const m of wordMetrics) {
    ctx.save();
    ctx.globalAlpha = m.state.opacity;

    // Word background pill (e.g. dynamic highlight)
    if (m.state.backgroundColor) {
      ctx.fillStyle = m.state.backgroundColor;
      const bgPadX = 8 * baseScale;
      const bgPadY = 4 * baseScale;
      const bgW = m.width + bgPadX * 2;
      const bgH = fontSize + bgPadY * 2;
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(currentX - bgPadX, centerY - bgH / 2, bgW, bgH, 8 * baseScale)
        : ctx.rect(currentX - bgPadX, centerY - bgH / 2, bgW, bgH);
      ctx.fill();
    }

    // Glow effects
    if (m.state.hasGlow) {
      ctx.shadowColor = m.state.glowColor || styleDef.accentColor || '#38bdf8';
      ctx.shadowBlur = 24 * baseScale;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 10 * baseScale;
      ctx.shadowOffsetY = 3 * baseScale;
    }

    ctx.fillStyle = m.state.color;
    const wordCenterX = currentX + m.width / 2;

    // Scale transform around word center
    if (m.state.scale !== 1.0) {
      ctx.translate(wordCenterX, centerY);
      ctx.scale(m.state.scale, m.state.scale);
      ctx.fillText(m.text, 0, 0);
    } else {
      ctx.fillText(m.text, wordCenterX, centerY);
    }

    // Underline if karaoke underline
    if (m.state.hasUnderline) {
      ctx.strokeStyle = m.state.color;
      ctx.lineWidth = 4 * baseScale;
      ctx.beginPath();
      ctx.moveTo(currentX, centerY + fontSize * 0.55);
      ctx.lineTo(currentX + m.width, centerY + fontSize * 0.55);
      ctx.stroke();
    }

    ctx.restore();
    currentX += m.width + spaceWidth;
  }

  ctx.restore();
}
