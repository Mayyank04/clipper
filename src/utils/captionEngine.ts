/**
 * Real Caption Engine - 12 Distinctive Production Caption Styles
 * Inspiring Caption X & AutoCaption Workflows
 */

import { CaptionCustomization, CaptionSegment, CaptionStyleId, WordTiming } from '../types';

export interface CaptionStyleDefinition {
  id: CaptionStyleId;
  name: string;
  desc: string;
  category: 'viral' | 'cinematic' | 'podcast' | 'creative';
  config: Partial<CaptionCustomization>;
}

export const CAPTION_STYLES_REGISTRY: CaptionStyleDefinition[] = [
  {
    id: 'viral_bold',
    name: 'Viral Bold',
    desc: 'Punchy uppercase with heavy black stroke and bright yellow active punch',
    category: 'viral',
    config: {
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: 30,
      primaryColor: '#ffffff',
      highlightColor: '#facc15',
      strokeColor: '#000000',
      strokeWidth: 3,
      positionY: 72,
      uppercase: true,
      hasShadow: true,
      wordsPerLine: 3,
      animationType: 'pop',
    },
  },
  {
    id: 'hormozi',
    name: 'Hormozi Emphasis',
    desc: 'High-contrast capital words with alternating neon green & gold keyword scale-ups',
    category: 'viral',
    config: {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: 32,
      primaryColor: '#ffffff',
      highlightColor: '#22c55e',
      strokeColor: '#000000',
      strokeWidth: 3.5,
      positionY: 70,
      uppercase: true,
      hasShadow: true,
      wordsPerLine: 2,
      animationType: 'scale',
    },
  },
  {
    id: 'kinetic',
    name: 'Kinetic Word',
    desc: 'Rapid single-word pop in center screen with spring motion',
    category: 'creative',
    config: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: 36,
      primaryColor: '#f8fafc',
      highlightColor: '#38bdf8',
      strokeColor: '#0f172a',
      strokeWidth: 2,
      positionY: 50,
      uppercase: true,
      hasShadow: true,
      wordsPerLine: 1,
      animationType: 'bounce',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal Sans',
    desc: 'Clean, understated frosted pill background with subtle reading cues',
    category: 'podcast',
    config: {
      fontFamily: 'Plus Jakarta Sans, Inter, sans-serif',
      fontSize: 22,
      primaryColor: '#e2e8f0',
      highlightColor: '#ffffff',
      strokeColor: 'transparent',
      strokeWidth: 0,
      positionY: 80,
      uppercase: false,
      hasShadow: false,
      wordsPerLine: 5,
      animationType: 'fade',
    },
  },
  {
    id: 'cinematic',
    name: 'Cinematic Editorial',
    desc: 'Spaced serif display with warm gold typography and subtle vignette',
    category: 'cinematic',
    config: {
      fontFamily: 'Georgia, serif',
      fontSize: 24,
      primaryColor: '#fef3c7',
      highlightColor: '#f59e0b',
      strokeColor: '#000000',
      strokeWidth: 1.5,
      positionY: 78,
      uppercase: true,
      hasShadow: true,
      wordsPerLine: 4,
      animationType: 'fade',
    },
  },
  {
    id: 'podcast',
    name: 'Podcast Two-Tone',
    desc: 'Balanced conversational dialogue with high contrast & muted past words',
    category: 'podcast',
    config: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: 23,
      primaryColor: '#94a3b8',
      highlightColor: '#38bdf8',
      strokeColor: '#000000',
      strokeWidth: 1,
      positionY: 75,
      uppercase: false,
      hasShadow: true,
      wordsPerLine: 4,
      animationType: 'highlight',
    },
  },
  {
    id: 'neon',
    name: 'Cyberpunk Neon',
    desc: 'Vibrant glowing cyan and magenta text with multi-layered neon glow',
    category: 'creative',
    config: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: 28,
      primaryColor: '#38bdf8',
      highlightColor: '#f43f5e',
      strokeColor: '#0284c7',
      strokeWidth: 1.5,
      positionY: 72,
      uppercase: true,
      hasShadow: true,
      wordsPerLine: 3,
      animationType: 'pop',
    },
  },
  {
    id: 'typewriter',
    name: 'Terminal Typewriter',
    desc: 'Monospace code font with dynamic cursor reveal',
    category: 'creative',
    config: {
      fontFamily: 'Courier New, monospace',
      fontSize: 22,
      primaryColor: '#34d399',
      highlightColor: '#a7f3d0',
      strokeColor: '#064e3b',
      strokeWidth: 1,
      positionY: 76,
      uppercase: false,
      hasShadow: true,
      wordsPerLine: 4,
      animationType: 'fade',
    },
  },
  {
    id: 'pop',
    name: 'Elastic Pop',
    desc: 'Spring-loaded word bounce with vivid multi-color accents',
    category: 'viral',
    config: {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: 29,
      primaryColor: '#ffffff',
      highlightColor: '#ec4899',
      strokeColor: '#000000',
      strokeWidth: 2.5,
      positionY: 70,
      uppercase: true,
      hasShadow: true,
      wordsPerLine: 3,
      animationType: 'bounce',
    },
  },
  {
    id: 'highlight',
    name: 'Marker Highlighter',
    desc: 'Solid colored highlighter background box sliding behind spoken words',
    category: 'viral',
    config: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: 24,
      primaryColor: '#ffffff',
      highlightColor: '#0a0a0a',
      strokeColor: 'transparent',
      strokeWidth: 0,
      positionY: 74,
      uppercase: true,
      hasShadow: false,
      wordsPerLine: 4,
      animationType: 'highlight',
    },
  },
  {
    id: 'clean_subtitle',
    name: 'Classic Subtitle',
    desc: 'High-legibility TV subtitle in dark box',
    category: 'podcast',
    config: {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: 21,
      primaryColor: '#ffffff',
      highlightColor: '#fde047',
      strokeColor: '#000000',
      strokeWidth: 1,
      positionY: 82,
      uppercase: false,
      hasShadow: false,
      wordsPerLine: 5,
      animationType: 'fade',
    },
  },
  {
    id: 'dynamic_ai',
    name: 'Dynamic AI Mood',
    desc: 'Intelligent color shifts reacting to emotional emphasis in speech',
    category: 'viral',
    config: {
      fontFamily: 'Impact, sans-serif',
      fontSize: 28,
      primaryColor: '#f1f5f9',
      highlightColor: '#f59e0b',
      strokeColor: '#0f172a',
      strokeWidth: 2.5,
      positionY: 72,
      uppercase: true,
      hasShadow: true,
      wordsPerLine: 3,
      animationType: 'scale',
    },
  },
];

/**
 * Gets styling attributes for a specific caption style preset
 */
export function getCaptionStylePreset(styleId: CaptionStyleId): CaptionCustomization {
  const match = CAPTION_STYLES_REGISTRY.find((s) => s.id === styleId);
  const base = match?.config || CAPTION_STYLES_REGISTRY[0].config;

  return {
    style: styleId,
    preset: styleId,
    fontFamily: base.fontFamily || 'Impact, sans-serif',
    fontSize: base.fontSize || 28,
    positionY: base.positionY !== undefined ? base.positionY : 72,
    primaryColor: base.primaryColor || '#ffffff',
    highlightColor: base.highlightColor || '#facc15',
    strokeColor: base.strokeColor || '#000000',
    strokeWidth: base.strokeWidth !== undefined ? base.strokeWidth : 3,
    hasShadow: base.hasShadow ?? true,
    wordsPerLine: base.wordsPerLine || 3,
    animationType: base.animationType || 'pop',
    uppercase: base.uppercase ?? true,
  };
}

/**
 * Renders active words for a caption segment according to current playback time
 */
export function getActiveCaptionSegment(
  captions: CaptionSegment[] = [],
  currentTime: number
): { segment: CaptionSegment | undefined; activeWordIndex: number } {
  const segment = captions.find((c) => currentTime >= c.start && currentTime <= c.end);
  if (!segment) return { segment: undefined, activeWordIndex: -1 };

  const activeWordIndex = (segment.words || []).findIndex(
    (w) => currentTime >= w.start && currentTime <= w.end
  );

  return { segment, activeWordIndex };
}
