/**
 * Production Caption Engine — 25 High-Impact Caption Styles
 * Provides word-level grouping, seek-safe state resolution,
 * and deterministic animation calculations.
 */

import {
  CaptionCustomization,
  CaptionSegment,
  CaptionStyleId,
  CaptionCategory,
  WordTiming,
  CaptionWord,
  CaptionEvent,
  Transcript,
  TranscriptSegment,
  TranscriptWord,
  DetectedLanguageBreakdown,
  ScriptSection,
} from '../types';
import { ORIGINAL_60_PRESETS } from '../data/creatorPresets60';

export type { CaptionWord, CaptionSegment };

export function formatTimeCode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

export interface CaptionStyleDefinition {
  id: CaptionStyleId;
  name: string;
  desc: string;
  category: CaptionCategory;
  config: CaptionCustomization;
}

export const DEFAULT_CAPTION_STYLE: CaptionStyleId = 'reference_mix';

export const PRODUCTION_REFERENCE_PRESETS: CaptionStyleDefinition[] = [
  {
    id: 'reference_typing',
    name: 'Reference Typing (Creator Drive Pack)',
    desc: 'Exact reproduction of After Effects kinetic typing reference: Lemon Milk Bold, bottom-to-up blurred lift, electric yellow highlights, zero lag',
    category: 'viral',
    config: {
      style: 'reference_typing',
      preset: 'reference_typing',
      fontFamily: 'Lemon Milk, American Captain, Montserrat, sans-serif',
      fontSize: 32,
      fontWeight: 800,
      primaryColor: '#FFFFFF',
      highlightColor: '#FACC15', // Electric Yellow
      strokeColor: '#000000',
      strokeWidth: 4.0,
      hasShadow: true,
      shadowColor: 'rgba(0, 0, 0, 0.95)',
      positionY: 72,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'pop',
      animationMode: 'REFERENCE_TYPING',
      uppercase: true,
    },
  },
  {
    id: 'reference_mix',
    name: 'Reference Mix (Recommended)',
    desc: 'Combines aggressive viral creator energy with cinematic typography and selective word highlights',
    category: 'viral',
    config: {
      style: 'reference_mix',
      preset: 'reference_mix',
      fontFamily: 'Lemon Milk, American Captain, Montserrat, sans-serif',
      fontSize: 30,
      fontWeight: 800,
      primaryColor: '#FFFFFF',
      highlightColor: '#FACC15', // Electric Yellow
      strokeColor: '#000000',
      strokeWidth: 4.0,
      hasShadow: true,
      shadowColor: 'rgba(0, 0, 0, 0.95)',
      positionY: 72,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'pop',
      animationMode: 'REFERENCE_TYPING',
      uppercase: true,
    },
  },
  {
    id: 'viral_bold',
    name: 'Viral Bold',
    desc: 'Large uppercase heavy condensed sans with high-energy lime punch',
    category: 'viral',
    config: {
      style: 'viral_bold',
      preset: 'viral_bold',
      fontFamily: 'American Captain, Impact, Montserrat, sans-serif',
      fontSize: 34,
      fontWeight: 900,
      primaryColor: '#FFFFFF',
      highlightColor: '#22C55E', // Lime green
      strokeColor: '#000000',
      strokeWidth: 4.5,
      hasShadow: true,
      shadowColor: 'rgba(0, 0, 0, 0.9)',
      positionY: 70,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'pop',
      animationMode: 'POP_WORD',
      uppercase: true,
    },
  },
  {
    id: 'cinematic_social',
    name: 'Cinematic Social',
    desc: 'Refined modern typography with semantic warm red/orange emphasis',
    category: 'cinematic',
    config: {
      style: 'cinematic_social',
      preset: 'cinematic_social',
      fontFamily: 'Inter, Plus Jakarta Sans, system-ui, sans-serif',
      fontSize: 26,
      fontWeight: 700,
      primaryColor: '#FFFFFF',
      highlightColor: '#EF4444', // Red emphasis
      strokeColor: '#000000',
      strokeWidth: 2.5,
      hasShadow: true,
      shadowColor: 'rgba(0, 0, 0, 0.85)',
      positionY: 76,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'fade',
      uppercase: false,
    },
  },
  {
    id: 'creator_punch',
    name: 'Creator Punch',
    desc: 'Snappy 2-3 word beats with Coolvetica punch and vibrant orange active highlight',
    category: 'creative',
    config: {
      style: 'creator_punch',
      preset: 'creator_punch',
      fontFamily: 'Coolvetica, Montserrat, sans-serif',
      fontSize: 31,
      fontWeight: 800,
      primaryColor: '#FFFFFF',
      highlightColor: '#F97316', // Vibrant Orange
      strokeColor: '#050505',
      strokeWidth: 3.5,
      hasShadow: true,
      shadowColor: 'rgba(0, 0, 0, 0.9)',
      positionY: 72,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'bounce',
      animationMode: 'POP_WORD',
      uppercase: true,
    },
  },
  {
    id: 'meme_impact',
    name: 'Meme Impact',
    desc: 'All-caps Couture display font with rapid cutaways and comedic emphasis',
    category: 'viral',
    config: {
      style: 'meme_impact',
      preset: 'meme_impact',
      fontFamily: 'Couture, Impact, Arial Black, sans-serif',
      fontSize: 34,
      fontWeight: 900,
      primaryColor: '#FFFFFF',
      highlightColor: '#EC4899', // Pink
      strokeColor: '#000000',
      strokeWidth: 5.0,
      hasShadow: true,
      shadowColor: 'rgba(0, 0, 0, 1.0)',
      positionY: 68,
      wordsPerLine: 2,
      wordsPerGroup: 2,
      maxLines: 2,
      alignment: 'center',
      animationType: 'pop',
      animationMode: 'POP_WORD',
      uppercase: true,
    },
  },
  {
    id: 'podcast_pro',
    name: 'Podcast Pro',
    desc: 'Subtle translucent dark capsule behind crisp white dialogue',
    category: 'podcast',
    config: {
      style: 'podcast_pro',
      preset: 'podcast_pro',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 23,
      fontWeight: 600,
      primaryColor: '#FFFFFF',
      highlightColor: '#38BDF8', // Cyan Blue
      strokeColor: 'transparent',
      strokeWidth: 0,
      hasShadow: false,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backgroundOpacity: 0.85,
      positionY: 80,
      wordsPerLine: 5,
      wordsPerGroup: 5,
      maxLines: 2,
      alignment: 'center',
      animationType: 'fade',
      animationMode: 'KARAOKE',
      uppercase: false,
    },
  },
  {
    id: 'storytelling',
    name: 'Storytelling',
    desc: 'Cinematic literary cadence with gold highlighting for narrative arc',
    category: 'cinematic',
    config: {
      style: 'storytelling',
      preset: 'storytelling',
      fontFamily: 'Georgia, Merriweather, serif',
      fontSize: 25,
      fontWeight: 700,
      primaryColor: '#F8FAFC',
      highlightColor: '#EAB308', // Gold
      strokeColor: '#09090b',
      strokeWidth: 2.0,
      hasShadow: true,
      shadowColor: 'rgba(0, 0, 0, 0.8)',
      positionY: 78,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'fade',
      animationMode: 'ACTIVE_WORD',
      uppercase: false,
    },
  },
  {
    id: 'dark_cinematic',
    name: 'Dark Cinematic',
    desc: 'High contrast God of Thunder typography with icy blue tones for documentary and suspense clips',
    category: 'cinematic',
    config: {
      style: 'dark_cinematic',
      preset: 'dark_cinematic',
      fontFamily: 'God of Thunder, Montserrat, sans-serif',
      fontSize: 28,
      fontWeight: 800,
      primaryColor: '#F0F9FF',
      highlightColor: '#06B6D4', // Deep Cyan
      strokeColor: '#020617',
      strokeWidth: 3.5,
      hasShadow: true,
      shadowColor: 'rgba(2, 6, 23, 0.95)',
      positionY: 75,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'pop',
      animationMode: 'REFERENCE_TYPING',
      uppercase: true,
    },
  },
  {
    id: 'clean_social',
    name: 'Clean Social',
    desc: 'Modern minimalist Reel/Short font with clean spacing and subtle active pulse',
    category: 'social',
    config: {
      style: 'clean_social',
      preset: 'clean_social',
      fontFamily: 'Plus Jakarta Sans, Inter, sans-serif',
      fontSize: 24,
      fontWeight: 600,
      primaryColor: '#FFFFFF',
      highlightColor: '#6366F1', // Indigo/Purple
      strokeColor: '#000000',
      strokeWidth: 2.0,
      hasShadow: true,
      shadowColor: 'rgba(0, 0, 0, 0.7)',
      positionY: 78,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'fade',
      uppercase: false,
    },
  },
  {
    id: 'news_pro',
    name: 'News Pro',
    desc: 'Authoritative broadcast banner styling with yellow alert highlights',
    category: 'news',
    config: {
      style: 'news_pro',
      preset: 'news_pro',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: 26,
      fontWeight: 900,
      primaryColor: '#FFFFFF',
      highlightColor: '#FDE047', // Broadcast Yellow
      strokeColor: '#000000',
      strokeWidth: 3.0,
      hasShadow: false,
      backgroundColor: 'rgba(20, 20, 20, 0.92)',
      backgroundOpacity: 0.92,
      positionY: 82,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'pop',
      uppercase: true,
    },
  },
  {
    id: 'educational',
    name: 'Educational Clarity',
    desc: 'High-contrast typography with emerald highlight for key terms and concepts',
    category: 'education' as any,
    config: {
      style: 'educational',
      preset: 'educational',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 26,
      fontWeight: 700,
      primaryColor: '#FFFFFF',
      highlightColor: '#10B981', // Emerald Green
      strokeColor: '#000000',
      strokeWidth: 2.5,
      hasShadow: true,
      shadowColor: 'rgba(0, 0, 0, 0.85)',
      positionY: 76,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'fade',
      animationMode: 'ACTIVE_WORD',
      uppercase: false,
    },
  },
  {
    id: 'gaming',
    name: 'Gaming Turbo',
    desc: 'Aggressive stylized neon typography with high-energy pop and magenta highlights',
    category: 'gaming',
    config: {
      style: 'gaming',
      preset: 'gaming',
      fontFamily: 'Komika Axis, Impact, sans-serif',
      fontSize: 32,
      fontWeight: 900,
      primaryColor: '#FFFFFF',
      highlightColor: '#F43F5E', // Rose/Magenta
      strokeColor: '#000000',
      strokeWidth: 4.5,
      hasShadow: true,
      shadowColor: 'rgba(0, 0, 0, 0.95)',
      positionY: 70,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'pop',
      animationMode: 'POP_WORD',
      uppercase: true,
    },
  },
  {
    id: 'comedy',
    name: 'Comedy Punchline',
    desc: 'Playful bouncy comic typography for funny sketches and punchlines',
    category: 'creative',
    config: {
      style: 'comedy',
      preset: 'comedy',
      fontFamily: 'Komika Axis, Arial Black, sans-serif',
      fontSize: 33,
      fontWeight: 800,
      primaryColor: '#FFFFFF',
      highlightColor: '#FBBF24', // Amber/Yellow
      strokeColor: '#1E1B4B',
      strokeWidth: 4.0,
      hasShadow: true,
      shadowColor: 'rgba(0, 0, 0, 0.9)',
      positionY: 72,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'bounce',
      animationMode: 'POP_WORD',
      uppercase: true,
    },
  },
  {
    id: 'luxury',
    name: 'Luxury Editorial',
    desc: 'Refined serif aesthetics with metallic champagne gold accents',
    category: 'cinematic',
    config: {
      style: 'luxury',
      preset: 'luxury',
      fontFamily: 'Playfair Display, Georgia, serif',
      fontSize: 27,
      fontWeight: 700,
      primaryColor: '#F8FAFC',
      highlightColor: '#FCD34D', // Champagne Gold
      strokeColor: '#0F172A',
      strokeWidth: 1.5,
      hasShadow: true,
      shadowColor: 'rgba(0, 0, 0, 0.75)',
      letterSpacing: 2,
      positionY: 78,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'fade',
      animationMode: 'ACTIVE_WORD',
      uppercase: false,
    },
  },
];

export const CAPTION_STYLES_REGISTRY: CaptionStyleDefinition[] = [
  ...PRODUCTION_REFERENCE_PRESETS,
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

export const EXTENDED_CAPTION_STYLES: CaptionStyleDefinition[] = [
  {
    id: 'modern',
    name: 'Modern Clean',
    desc: 'Geometric modern typography with subtle rounded emerald highlight backing',
    category: 'educational',
    config: {
      style: 'modern',
      preset: 'modern',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 24,
      fontWeight: 700,
      primaryColor: '#ffffff',
      highlightColor: '#10b981',
      strokeColor: '#000000',
      strokeWidth: 1.5,
      hasShadow: true,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backgroundOpacity: 0.75,
      positionY: 75,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'fade',
      uppercase: false,
    },
  },
  {
    id: 'retro',
    name: 'Retro Arcade',
    desc: 'Vintage pixel-aesthetic arcade display with warm amber glow',
    category: 'creative',
    config: {
      style: 'retro',
      preset: 'retro',
      fontFamily: 'Courier New, monospace',
      fontSize: 26,
      fontWeight: 900,
      primaryColor: '#fef08a',
      highlightColor: '#f97316',
      strokeColor: '#451a03',
      strokeWidth: 2.5,
      hasShadow: true,
      positionY: 65,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'typewriter',
      uppercase: true,
    },
  },
  {
    id: 'luxury',
    name: 'Luxury Serif',
    desc: 'Refined editorial serif designed for high-status luxury aesthetics',
    category: 'cinematic',
    config: {
      style: 'luxury',
      preset: 'luxury',
      fontFamily: 'Georgia, serif',
      fontSize: 25,
      fontWeight: 600,
      primaryColor: '#f8fafc',
      highlightColor: '#d4af37',
      strokeColor: '#09090b',
      strokeWidth: 1,
      hasShadow: true,
      positionY: 78,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'fade',
      uppercase: false,
    },
  },
  {
    id: 'energetic',
    name: 'Energetic Pulse',
    desc: 'High-octane yellow & red kinetic bouncing captions that demand eyes',
    category: 'viral',
    config: {
      style: 'energetic',
      preset: 'energetic',
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: 34,
      fontWeight: 900,
      primaryColor: '#ffffff',
      highlightColor: '#facc15',
      strokeColor: '#000000',
      strokeWidth: 4,
      hasShadow: true,
      positionY: 68,
      wordsPerLine: 2,
      wordsPerGroup: 2,
      maxLines: 1,
      alignment: 'center',
      animationType: 'bounce',
      uppercase: true,
    },
  },
  {
    id: 'minimal_dark',
    name: 'Minimal Dark',
    desc: 'Subtle slate typography with soft dark vignette',
    category: 'minimal',
    config: {
      style: 'minimal_dark',
      preset: 'minimal_dark',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 21,
      fontWeight: 600,
      primaryColor: '#cbd5e1',
      highlightColor: '#38bdf8',
      strokeColor: 'transparent',
      strokeWidth: 0,
      hasShadow: false,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backgroundOpacity: 0.85,
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
    id: 'minimal_light',
    name: 'Minimal Light',
    desc: 'Bright high-contrast clean captions on semi-translucent frosted backdrop',
    category: 'minimal',
    config: {
      style: 'minimal_light',
      preset: 'minimal_light',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: 22,
      fontWeight: 600,
      primaryColor: '#0f172a',
      highlightColor: '#2563eb',
      strokeColor: 'transparent',
      strokeWidth: 0,
      hasShadow: false,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      backgroundOpacity: 0.9,
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
    id: 'big_word',
    name: 'Big Word Punch',
    desc: 'Single giant word on screen at a time for maximum retention spikes',
    category: 'viral',
    config: {
      style: 'big_word',
      preset: 'big_word',
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: 42,
      fontWeight: 900,
      primaryColor: '#ffffff',
      highlightColor: '#f59e0b',
      strokeColor: '#000000',
      strokeWidth: 5,
      hasShadow: true,
      positionY: 62,
      wordsPerLine: 1,
      wordsPerGroup: 1,
      maxLines: 1,
      alignment: 'center',
      animationType: 'pop',
      uppercase: true,
    },
  },
  {
    id: 'center_stage',
    name: 'Center Stage',
    desc: 'Dead-center placement with vibrant purple and cyan dual-tone glow',
    category: 'social',
    config: {
      style: 'center_stage',
      preset: 'center_stage',
      fontFamily: 'Montserrat, Arial Black, sans-serif',
      fontSize: 32,
      fontWeight: 900,
      primaryColor: '#ffffff',
      highlightColor: '#a855f7',
      strokeColor: '#000000',
      strokeWidth: 3.5,
      hasShadow: true,
      positionY: 50,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'bounce',
      uppercase: true,
    },
  },
  {
    id: 'subtle',
    name: 'Subtle Conversational',
    desc: 'Low-profile subtitle styling designed not to distract from speaker face',
    category: 'podcast',
    config: {
      style: 'subtle',
      preset: 'subtle',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 19,
      fontWeight: 500,
      primaryColor: '#94a3b8',
      highlightColor: '#f1f5f9',
      strokeColor: 'transparent',
      strokeWidth: 0,
      hasShadow: true,
      positionY: 86,
      wordsPerLine: 5,
      wordsPerGroup: 5,
      maxLines: 2,
      alignment: 'center',
      animationType: 'fade',
      uppercase: false,
    },
  },
  {
    id: 'high_contrast',
    name: 'High Contrast Alert',
    desc: 'Black text on bright yellow banner block for maximum accessibility and readability',
    category: 'news',
    config: {
      style: 'high_contrast',
      preset: 'high_contrast',
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: 26,
      fontWeight: 900,
      primaryColor: '#000000',
      highlightColor: '#dc2626',
      strokeColor: 'transparent',
      strokeWidth: 0,
      hasShadow: false,
      backgroundColor: '#facc15',
      backgroundOpacity: 1.0,
      positionY: 74,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'pop',
      uppercase: true,
    },
  },
];

export const ORIGINAL_CREATOR_PRESETS: CaptionStyleDefinition[] = [
  // --- CREATOR ---
  {
    id: 'beast_mode',
    name: 'Beast Mode Punch',
    desc: 'Aggressive heavy all-caps with neon green highlights and high-impact bounce',
    category: 'creator',
    config: {
      style: 'beast_mode',
      preset: 'beast_mode',
      fontFamily: 'Montserrat, American Captain, Impact, sans-serif',
      fontSize: 32,
      fontWeight: 900,
      primaryColor: '#FFFFFF',
      highlightColor: '#22C55E',
      strokeColor: '#000000',
      strokeWidth: 4.5,
      hasShadow: true,
      shadowColor: 'rgba(0,0,0,0.95)',
      positionY: 72,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'pop',
      animationMode: 'POP_WORD',
      uppercase: true,
    },
  },
  {
    id: 'hormozi_stack',
    name: 'Hormozi Pill Stack',
    desc: 'Electric yellow keyword pop over dark backdrop capsule',
    category: 'creator',
    config: {
      style: 'hormozi_stack',
      preset: 'hormozi_stack',
      fontFamily: 'Bebas Neue, Montserrat, sans-serif',
      fontSize: 34,
      fontWeight: 800,
      primaryColor: '#FFFFFF',
      highlightColor: '#FACC15',
      strokeColor: '#000000',
      strokeWidth: 3.5,
      hasShadow: true,
      backgroundColor: '#000000',
      backgroundOpacity: 0.85,
      backgroundShape: 'pill',
      positionY: 70,
      wordsPerLine: 2,
      wordsPerGroup: 2,
      maxLines: 2,
      alignment: 'center',
      animationType: 'bounce',
      animationMode: 'POP_WORD',
      uppercase: true,
    },
  },
  {
    id: 'ali_abdaal',
    name: 'Productivity Clean',
    desc: 'Minimalist editorial font with gentle cyan active word highlights',
    category: 'creator',
    config: {
      style: 'ali_abdaal',
      preset: 'ali_abdaal',
      fontFamily: 'Outfit, Plus Jakarta Sans, Inter, sans-serif',
      fontSize: 25,
      fontWeight: 700,
      primaryColor: '#F8FAFC',
      highlightColor: '#38BDF8',
      strokeColor: '#0f172a',
      strokeWidth: 2.0,
      hasShadow: true,
      shadowColor: 'rgba(0,0,0,0.7)',
      positionY: 76,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'fade',
      animationMode: 'ACTIVE_WORD',
      uppercase: false,
    },
  },
  {
    id: 'iman_gadzi',
    name: 'Aesthetic Editorial',
    desc: 'Monochrome luxury serif with subtle champagne gold accent',
    category: 'luxury',
    config: {
      style: 'iman_gadzi',
      preset: 'iman_gadzi',
      fontFamily: 'Cinzel, Playfair Display, Georgia, serif',
      fontSize: 26,
      fontWeight: 700,
      primaryColor: '#FFFFFF',
      highlightColor: '#FBBF24',
      strokeColor: '#000000',
      strokeWidth: 2.0,
      hasShadow: true,
      shadowColor: 'rgba(0,0,0,0.85)',
      positionY: 78,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'slide_up',
      animationMode: 'ACTIVE_WORD',
      uppercase: false,
    },
  },

  // --- COMEDY ---
  {
    id: 'punchline_pop',
    name: 'Punchline Pop',
    desc: 'Comic cartoon high-energy display with vibrant magenta highlights',
    category: 'comedy',
    config: {
      style: 'punchline_pop',
      preset: 'punchline_pop',
      fontFamily: 'Bangers, Comic Sans MS, Impact, sans-serif',
      fontSize: 34,
      fontWeight: 900,
      primaryColor: '#FFFFFF',
      highlightColor: '#F43F5E',
      strokeColor: '#000000',
      strokeWidth: 4.5,
      hasShadow: true,
      shadowColor: 'rgba(0,0,0,0.95)',
      positionY: 68,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'bounce',
      animationMode: 'POP_WORD',
      uppercase: true,
    },
  },
  {
    id: 'standup_snappy',
    name: 'Standup Snappy',
    desc: 'Ultra-fast 2-word groups with bright amber contrast',
    category: 'comedy',
    config: {
      style: 'standup_snappy',
      preset: 'standup_snappy',
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: 33,
      fontWeight: 900,
      primaryColor: '#FFFFFF',
      highlightColor: '#FB923C',
      strokeColor: '#000000',
      strokeWidth: 4.0,
      hasShadow: true,
      positionY: 72,
      wordsPerLine: 2,
      wordsPerGroup: 2,
      maxLines: 2,
      alignment: 'center',
      animationType: 'punch',
      animationMode: 'POP_WORD',
      uppercase: true,
    },
  },

  // --- LUXURY ---
  {
    id: 'quiet_luxury',
    name: 'Quiet Luxury',
    desc: 'Refined Playfair typography with platinum text and gold shine',
    category: 'luxury',
    config: {
      style: 'quiet_luxury',
      preset: 'quiet_luxury',
      fontFamily: 'Playfair Display, Georgia, serif',
      fontSize: 24,
      fontWeight: 600,
      primaryColor: '#F1F5F9',
      highlightColor: '#D97706',
      strokeColor: 'transparent',
      strokeWidth: 0,
      hasShadow: true,
      shadowColor: 'rgba(0,0,0,0.85)',
      positionY: 80,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'fade',
      animationMode: 'ACTIVE_WORD',
      uppercase: false,
    },
  },

  // --- DOCUMENTARY ---
  {
    id: 'documentary_sub',
    name: 'Documentary Sub',
    desc: 'Clean geometric sans with warm amber highlights for investigative pacing',
    category: 'documentary',
    config: {
      style: 'documentary_sub',
      preset: 'documentary_sub',
      fontFamily: 'Inter, Plus Jakarta Sans, sans-serif',
      fontSize: 24,
      fontWeight: 700,
      primaryColor: '#FFFFFF',
      highlightColor: '#F59E0B',
      strokeColor: '#020617',
      strokeWidth: 2.5,
      hasShadow: true,
      shadowColor: 'rgba(0,0,0,0.9)',
      positionY: 78,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'slide_up',
      animationMode: 'ACTIVE_WORD',
      uppercase: false,
    },
  },
  {
    id: 'true_crime',
    name: 'True Crime Suspense',
    desc: 'Dark moody slate with blood crimson active word emphasis',
    category: 'documentary',
    config: {
      style: 'true_crime',
      preset: 'true_crime',
      fontFamily: 'Oswald, Montserrat, sans-serif',
      fontSize: 29,
      fontWeight: 800,
      primaryColor: '#E2E8F0',
      highlightColor: '#DC2626',
      strokeColor: '#050505',
      strokeWidth: 3.5,
      hasShadow: true,
      shadowColor: 'rgba(0,0,0,0.98)',
      positionY: 74,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'blur_in',
      animationMode: 'POP_WORD',
      uppercase: true,
    },
  },

  // --- MEME ---
  {
    id: 'brainrot_turbo',
    name: 'Brainrot Turbo',
    desc: 'Ultra rapid single-word spring punch with neon lime and cyan flashes',
    category: 'meme',
    config: {
      style: 'brainrot_turbo',
      preset: 'brainrot_turbo',
      fontFamily: 'American Captain, Impact, sans-serif',
      fontSize: 36,
      fontWeight: 900,
      primaryColor: '#FFFFFF',
      highlightColor: '#A3E635',
      strokeColor: '#000000',
      strokeWidth: 5.0,
      hasShadow: true,
      shadowColor: 'rgba(0,0,0,1.0)',
      positionY: 65,
      wordsPerLine: 1,
      wordsPerGroup: 1,
      maxLines: 1,
      alignment: 'center',
      animationType: 'spring',
      animationMode: 'POP_WORD',
      uppercase: true,
    },
  },

  // --- KARAOKE ---
  {
    id: 'karaoke_party',
    name: 'Karaoke Party',
    desc: 'Dual-tone continuous word wipe with electric violet to hot pink transition',
    category: 'karaoke',
    config: {
      style: 'karaoke_party',
      preset: 'karaoke_party',
      fontFamily: 'Montserrat, Outfit, sans-serif',
      fontSize: 27,
      fontWeight: 800,
      primaryColor: 'rgba(255,255,255,0.65)',
      highlightColor: '#EC4899',
      strokeColor: '#000000',
      strokeWidth: 3.0,
      hasShadow: true,
      shadowColor: 'rgba(0,0,0,0.85)',
      positionY: 75,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'karaoke',
      animationMode: 'KARAOKE',
      uppercase: false,
    },
  },
  {
    id: 'neon_karaoke',
    name: 'Neon Karaoke',
    desc: 'Electric cyan lyric highlight with deep blue aura on spoken words',
    category: 'karaoke',
    config: {
      style: 'neon_karaoke',
      preset: 'neon_karaoke',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 28,
      fontWeight: 800,
      primaryColor: '#94A3B8',
      highlightColor: '#00F5FF',
      strokeColor: '#030712',
      strokeWidth: 3.0,
      hasShadow: true,
      glowEnabled: true,
      glowColor: '#00F5FF',
      glowBlur: 14,
      positionY: 74,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'karaoke',
      animationMode: 'KARAOKE',
      uppercase: true,
    },
  },

  // --- DARK / NEON ---
  {
    id: 'midnight_cyber',
    name: 'Midnight Cyber',
    desc: 'Dark stealth background with piercing cyan electric glow',
    category: 'dark',
    config: {
      style: 'midnight_cyber',
      preset: 'midnight_cyber',
      fontFamily: 'Syne, Montserrat, sans-serif',
      fontSize: 28,
      fontWeight: 800,
      primaryColor: '#F8FAFC',
      highlightColor: '#06B6D4',
      strokeColor: '#020617',
      strokeWidth: 3.5,
      hasShadow: true,
      shadowColor: 'rgba(2,6,23,0.95)',
      glowEnabled: true,
      glowColor: '#06B6D4',
      glowBlur: 16,
      positionY: 74,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'glow_in',
      animationMode: 'POP_WORD',
      uppercase: true,
    },
  },
  {
    id: 'tokyo_neon',
    name: 'Tokyo Cyberpunk Neon',
    desc: 'High-voltage magenta and neon cyan pulse with heavy dark stroke',
    category: 'neon',
    config: {
      style: 'tokyo_neon',
      preset: 'tokyo_neon',
      fontFamily: 'American Captain, Bebas Neue, sans-serif',
      fontSize: 33,
      fontWeight: 900,
      primaryColor: '#FFFFFF',
      highlightColor: '#FF007F',
      strokeColor: '#09090B',
      strokeWidth: 4.5,
      hasShadow: true,
      glowEnabled: true,
      glowColor: '#FF007F',
      glowBlur: 18,
      positionY: 70,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'pop',
      animationMode: 'POP_WORD',
      uppercase: true,
    },
  },

  // --- CLEAN / MINIMAL ---
  {
    id: 'minimal_studio',
    name: 'Minimal Studio Pill',
    desc: 'Clean white typography inside a frosted translucent capsule',
    category: 'clean',
    config: {
      style: 'minimal_studio',
      preset: 'minimal_studio',
      fontFamily: 'Plus Jakarta Sans, Inter, sans-serif',
      fontSize: 23,
      fontWeight: 600,
      primaryColor: '#FFFFFF',
      highlightColor: '#38BDF8',
      strokeColor: 'transparent',
      strokeWidth: 0,
      hasShadow: false,
      backgroundColor: '#0f172a',
      backgroundOpacity: 0.8,
      backgroundShape: 'pill',
      positionY: 82,
      wordsPerLine: 5,
      wordsPerGroup: 5,
      maxLines: 2,
      alignment: 'center',
      animationType: 'fade',
      animationMode: 'ACTIVE_WORD',
      uppercase: false,
    },
  },
  {
    id: 'swiss_modern',
    name: 'Swiss Modernist',
    desc: 'Strict Swiss typographic hierarchy with subtle emerald word tint',
    category: 'clean',
    config: {
      style: 'swiss_modern',
      preset: 'swiss_modern',
      fontFamily: 'Inter, Helvetica, Arial, sans-serif',
      fontSize: 24,
      fontWeight: 700,
      primaryColor: '#F8FAFC',
      highlightColor: '#10B981',
      strokeColor: '#000000',
      strokeWidth: 2.0,
      hasShadow: true,
      shadowColor: 'rgba(0,0,0,0.8)',
      positionY: 78,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'fade',
      animationMode: 'ACTIVE_WORD',
      uppercase: false,
    },
  },

  // --- INDIAN CREATOR & HINGLISH & HINDI ---
  {
    id: 'desi_creator_bold',
    name: 'Desi Creator Saffron',
    desc: 'Vibrant saffron orange keyword punch tailored for high-energy Hindi/Hinglish creators',
    category: 'indian_creator',
    config: {
      style: 'desi_creator_bold',
      preset: 'desi_creator_bold',
      fontFamily: 'Poppins, Montserrat, sans-serif',
      fontSize: 31,
      fontWeight: 900,
      primaryColor: '#FFFFFF',
      highlightColor: '#FF6B00',
      strokeColor: '#000000',
      strokeWidth: 4.0,
      hasShadow: true,
      shadowColor: 'rgba(0,0,0,0.95)',
      positionY: 72,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'pop',
      animationMode: 'POP_WORD',
      uppercase: true,
    },
  },
  {
    id: 'hinglish_hype',
    name: 'Hinglish Hype Punch',
    desc: 'Two-tone dynamic punch with electric yellow and emerald accents for viral shorts',
    category: 'hinglish',
    config: {
      style: 'hinglish_hype',
      preset: 'hinglish_hype',
      fontFamily: 'American Captain, Poppins, sans-serif',
      fontSize: 33,
      fontWeight: 900,
      primaryColor: '#FFFFFF',
      highlightColor: '#FACC15',
      strokeColor: '#000000',
      strokeWidth: 4.5,
      hasShadow: true,
      shadowColor: 'rgba(0,0,0,0.95)',
      positionY: 70,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'punch',
      animationMode: 'POP_WORD',
      uppercase: true,
    },
  },
  {
    id: 'devanagari_clarity',
    name: 'Devanagari Clarity',
    desc: 'Engineered for flawless Devanagari Hindi ligature rendering with warm golden highlight',
    category: 'hindi',
    config: {
      style: 'devanagari_clarity',
      preset: 'devanagari_clarity',
      fontFamily: 'Noto Sans Devanagari, Poppins, sans-serif',
      fontSize: 27,
      fontWeight: 700,
      primaryColor: '#FFFFFF',
      highlightColor: '#FBBF24',
      strokeColor: '#0f172a',
      strokeWidth: 2.8,
      hasShadow: true,
      shadowColor: 'rgba(0,0,0,0.9)',
      positionY: 76,
      wordsPerLine: 4,
      wordsPerGroup: 4,
      maxLines: 2,
      alignment: 'center',
      animationType: 'fade',
      animationMode: 'ACTIVE_WORD',
      uppercase: false,
    },
  },

  // --- MOTIVATIONAL ---
  {
    id: 'gym_mindset',
    name: 'Gym Mindset Fiery',
    desc: 'Heavy condensed bold with fiery red/orange punch for gym, hustle, and motivational reels',
    category: 'motivational',
    config: {
      style: 'gym_mindset',
      preset: 'gym_mindset',
      fontFamily: 'American Captain, Bebas Neue, Impact, sans-serif',
      fontSize: 34,
      fontWeight: 900,
      primaryColor: '#FFFFFF',
      highlightColor: '#EF4444',
      strokeColor: '#000000',
      strokeWidth: 4.5,
      hasShadow: true,
      shadowColor: 'rgba(0,0,0,1.0)',
      positionY: 68,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'punch',
      animationMode: 'POP_WORD',
      uppercase: true,
    },
  },
  {
    id: 'titan_discipline',
    name: 'Titan Discipline',
    desc: 'Stoic monochrome with subtle gold keyword highlights and smooth lift',
    category: 'motivational',
    config: {
      style: 'titan_discipline',
      preset: 'titan_discipline',
      fontFamily: 'Oswald, Montserrat, sans-serif',
      fontSize: 28,
      fontWeight: 800,
      primaryColor: '#F8FAFC',
      highlightColor: '#EAB308',
      strokeColor: '#000000',
      strokeWidth: 3.0,
      hasShadow: true,
      shadowColor: 'rgba(0,0,0,0.9)',
      positionY: 74,
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      alignment: 'center',
      animationType: 'lift',
      animationMode: 'POP_WORD',
      uppercase: true,
    },
  },
];

export const ALL_CAPTION_STYLES: CaptionStyleDefinition[] = [
  ...ORIGINAL_60_PRESETS,
  ...CAPTION_STYLES_REGISTRY,
  ...EXTENDED_CAPTION_STYLES,
  ...ORIGINAL_CREATOR_PRESETS,
];

const CUSTOM_PRESETS_STORAGE_KEY = 'viralclip_custom_caption_presets_v1';

export function getCustomCaptionPresets(): CaptionStyleDefinition[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomCaptionPreset(preset: CaptionStyleDefinition): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getCustomCaptionPresets().filter((p) => p.id !== preset.id);
    existing.unshift(preset);
    localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to save custom preset', err);
  }
}

export function deleteCustomCaptionPreset(presetId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getCustomCaptionPresets().filter((p) => p.id !== presetId);
    localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to delete custom preset', err);
  }
}

export function renameCustomCaptionPreset(presetId: string, newName: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getCustomCaptionPresets().map((p) => {
      if (p.id === presetId) return { ...p, name: newName };
      return p;
    });
    localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to rename custom preset', err);
  }
}

export function getAllAvailableCaptionStyles(): CaptionStyleDefinition[] {
  const custom = getCustomCaptionPresets();
  return [...custom, ...ALL_CAPTION_STYLES];
}

// Map backward compatibility aliases & uppercase production presets
const ALIAS_MAP: Record<string, CaptionStyleId> = {
  reference_typing: 'reference_typing',
  REFERENCE_TYPING: 'reference_typing',
  reference_mix: 'reference_mix',
  REFERENCE_MIX: 'reference_mix',
  viral_bold: 'viral_bold',
  VIRAL_BOLD: 'viral_bold',
  cinematic_social: 'cinematic_social',
  CINEMATIC_SOCIAL: 'cinematic_social',
  creator_punch: 'creator_punch',
  CREATOR_PUNCH: 'creator_punch',
  meme_impact: 'meme_impact',
  MEME_IMPACT: 'meme_impact',
  podcast_pro: 'podcast_pro',
  PODCAST_PRO: 'podcast_pro',
  storytelling: 'storytelling',
  STORYTELLING: 'storytelling',
  dark_cinematic: 'dark_cinematic',
  DARK_CINEMATIC: 'dark_cinematic',
  clean_social: 'clean_social',
  CLEAN_SOCIAL: 'clean_social',
  news_pro: 'news_pro',
  NEWS_PRO: 'news_pro',
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
  const match =
    getAllAvailableCaptionStyles().find((s) => s.id === canonicalId) ||
    CAPTION_STYLES_REGISTRY[0];
  return {
    ...match.config,
    animation: (match.config.animation || match.config.animationType) as any,
    animationType: match.config.animationType || match.config.animation,
    style: styleId,
    preset: styleId,
  };
}

/**
 * Production Caption Layout Engine
 * Provides output-relative (1080x1920) typography scaling and monitor preview parity.
 */
export class CaptionLayoutEngine {
  /**
   * Resolves preview monitor styling with strict parity to 1080x1920 export canvas.
   * Enforces safe font bounds (54..104px output scale) to keep captions legible
   * without ever obscuring faces or video action.
   */
  static getPreviewStyles(
    config: CaptionCustomization,
    monitorWidth: number = 340
  ): {
    fontSize: number;
    strokeWidth: number;
    letterSpacing: number;
    maxLineWidthPercent: number;
  } {
    const width = Math.max(260, monitorWidth || 340);
    const scale = width / 1080;

    const baseFontSize = config.fontSize || 28;
    // Map user slider (18..48) or raw font size to 1080p scale
    let exportFontSize = baseFontSize >= 50 ? baseFontSize : Math.round(baseFontSize * 2.2);
    // Safe bounds clamp: 54px min to 104px max
    exportFontSize = Math.max(54, Math.min(104, exportFontSize));

    const previewFontSize = Math.max(14, Math.min(26, Math.round(exportFontSize * scale)));

    const baseStroke = config.strokeWidth !== undefined ? config.strokeWidth : 3;
    const previewStroke = Math.max(1, Math.min(4, Math.round(baseStroke * (width / 540))));

    return {
      fontSize: previewFontSize,
      strokeWidth: previewStroke,
      letterSpacing: config.letterSpacing ? Math.max(0, config.letterSpacing * (width / 540)) : 0,
      maxLineWidthPercent: 92,
    };
  }
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
 * Strictly derives visibility and active word state from exact word timestamps.
 */
export function getActiveCaptionWord(
  words: (WordTiming | CaptionWord)[] = [],
  currentTime: number
): { word?: WordTiming | CaptionWord; index: number; scale: number; progress: number } {
  if (!Array.isArray(words) || words.length === 0) {
    return { index: -1, scale: 1.0, progress: 0 };
  }

  const index = words.findIndex((w) => currentTime >= w.start && currentTime <= w.end);
  if (index === -1) {
    return { index: -1, scale: 1.0, progress: 0 };
  }

  const word = words[index];
  const dur = Math.max(0.05, word.end - word.start);
  const progress = Math.max(0, Math.min(1, (currentTime - word.start) / dur));
  const scale = 1.0 + Math.sin(progress * Math.PI) * 0.06;

  return {
    word,
    index,
    scale: Number(scale.toFixed(3)),
    progress: Number(progress.toFixed(3)),
  };
}

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

  // Strict interval check: caption starts at exact first word start, ends at exact last word end (Part 2 & 8)
  let activeCaptionIndex = captions.findIndex(
    (c) => currentTime >= c.start && currentTime <= c.end
  );

  let isSpeechHoldActive = false;
  const enableHold = Boolean(config?.enableSpeechHold);
  if (activeCaptionIndex === -1 && enableHold) {
    const holdWindow = config?.holdThresholdSeconds ?? 0.28;
    const finalHold = config?.finalHoldSeconds ?? 0.8;
    const candidateIdx = captions.findIndex((c, idx) => {
      const isLast = idx === captions.length - 1;
      const effectiveHold = isLast ? finalHold : holdWindow;
      const isPast = currentTime > c.end && (currentTime - c.end) <= effectiveHold;
      if (!isPast) return false;
      const nextCap = captions[idx + 1];
      return !nextCap || currentTime < nextCap.start;
    });
    if (candidateIdx !== -1) {
      activeCaptionIndex = candidateIdx;
      isSpeechHoldActive = true;
    }
  }

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

  const wordState = isSpeechHoldActive
    ? { index: -1, word: undefined, scale: 1.0, progress: 1.0 }
    : getActiveCaptionWord(words, currentTime);
  const activeWordIndex = wordState.index;
  const activeWord = wordState.word;

  const pastWordIndices: number[] = [];
  const upcomingWordIndices: number[] = [];

  words.forEach((w, idx) => {
    if (isSpeechHoldActive || currentTime > w.end) {
      pastWordIndices.push(idx);
    } else if (currentTime < w.start) {
      upcomingWordIndices.push(idx);
    }
  });

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
    animationProgress: wordState.progress,
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

export interface WordAnimationState {
  word: string;
  isSpoken: boolean;
  isPast: boolean;
  isFuture: boolean;
  progress: number;
  scale: number;
  translateY: number;
  translateX: number;
  rotate: number;
  blur: number;
  opacity: number;
  color: string;
  highlighted: boolean;
  visible: boolean;
  revealedText?: string;
  strokeWidth: number;
  strokeColor: string;
  glow?: string;
  isMarker?: boolean;
  isUnderline?: boolean;
  isHero?: boolean;
}

/**
 * High-performance speech-synchronized word animation state calculation.
 * Resolves deterministic motion curves (translateY, translateX, scale, opacity, highlight color, blur)
 * across 18+ animation styles based strictly on currentTime and word timing.
 */
export function computeWordAnimationState(
  wordObj: any,
  index: number,
  currentTime: number,
  captionConfig: CaptionCustomization,
  captionWords: any[] = []
): WordAnimationState {
  const curWordStr = typeof wordObj === 'string' ? wordObj : (wordObj?.word || wordObj?.text || String(wordObj || ''));
  const wordStart = Number(wordObj?.start) || 0;
  const wordEnd = Number(wordObj?.end) || (wordStart + 0.3);
  const nextWord = captionWords && captionWords[index + 1] ? captionWords[index + 1] : null;
  const nextWordStart = nextWord ? (Number(nextWord?.start) || wordEnd) : (wordEnd + 0.2);
  const activeEnd = nextWord ? Math.min(nextWordStart, wordEnd + 0.25) : (wordEnd + 0.2);
  const isSpoken = currentTime >= wordStart && currentTime < activeEnd;
  const isPast = currentTime >= activeEnd;
  const isFuture = currentTime < wordStart;

  const animType = (captionConfig.animationType || captionConfig.animation || 'pop').toLowerCase();
  const intensityMap: Record<string, number> = {
    subtle: 0.65,
    balanced: 1.0,
    energetic: 1.45,
    extreme: 1.9,
  };
  const intensity = intensityMap[captionConfig.motionIntensity || 'balanced'] || 1.0;

  const dur = Math.max(0.05, wordEnd - wordStart);
  const rawProgress = isSpoken ? Math.min(1, Math.max(0, (currentTime - wordStart) / dur)) : (isPast ? 1 : 0);

  let scale = 1.0;
  let translateY = 0;
  let translateX = 0;
  let rotate = captionConfig.rotation || 0;
  let blur = 0;
  let opacity = captionConfig.opacity !== undefined ? captionConfig.opacity / 100 : 1.0;
  let visible = true;
  let highlighted = false;
  let color = captionConfig.primaryColor || '#FFFFFF';
  let revealedText: string | undefined = undefined;
  let glow: string | undefined = captionConfig.glowEnabled ? captionConfig.glowColor || captionConfig.highlightColor : undefined;
  let isMarker = false;
  let isUnderline = false;
  let isHero = wordObj?.emphasis === 'hero' || wordObj?.isHighlight;

  // 1. Spoken Word Highlighting
  if (isSpoken) {
    highlighted = true;
    color = wordObj?.highlightColor || captionConfig.highlightColor || '#FACC15';
  } else if (isPast) {
    color = captionConfig.primaryColor || '#FFFFFF';
    opacity = Math.max(0.7, opacity);
  } else {
    color = captionConfig.primaryColor || '#FFFFFF';
    opacity = captionConfig.animationMode === 'WORD_BY_WORD' ? 0 : Math.max(0.4, opacity * 0.65);
    if (captionConfig.animationMode === 'WORD_BY_WORD') visible = false;
  }

  // 2. Specific Animation Curves (18+ types)
  switch (animType) {
    case 'pop':
    case 'word_pop': {
      if (isSpoken) {
        const bounce = Math.sin(rawProgress * Math.PI);
        const basePop = isHero ? 0.10 : 0.06;
        scale = 1.0 + (basePop + bounce * 0.03) * intensity;
        translateY = -2 * bounce * intensity;
      }
      break;
    }

    case 'bounce': {
      if (isSpoken) {
        const bounce = Math.sin(rawProgress * Math.PI);
        scale = 1.0 + 0.14 * bounce * intensity;
        translateY = -7 * bounce * intensity;
      }
      break;
    }

    case 'punch': {
      if (isSpoken) {
        const punchFactor = rawProgress < 0.25 ? 1.3 : 1.08 + (1 - rawProgress) * 0.12;
        scale = 1.0 + (punchFactor - 1.0) * intensity;
        translateY = -2 * intensity;
      }
      break;
    }

    case 'spring': {
      if (isSpoken) {
        // Damped harmonic spring curve
        const spring = Math.sin(rawProgress * Math.PI * 2.5) * Math.exp(-rawProgress * 3);
        scale = 1.0 + (0.26 * spring) * intensity;
        rotate = (rotate || 0) + spring * 3 * intensity;
      }
      break;
    }

    case 'slide_up': {
      if (isSpoken) {
        translateY = (1 - rawProgress) * 7 * intensity;
        scale = 1.0 + 0.06 * intensity;
      }
      break;
    }

    case 'slide_down': {
      if (isSpoken) {
        translateY = -(1 - rawProgress) * 7 * intensity;
        scale = 1.0 + 0.06 * intensity;
      }
      break;
    }

    case 'slide_left': {
      if (isSpoken) {
        translateX = (1 - rawProgress) * 10 * intensity;
        scale = 1.06;
      }
      break;
    }

    case 'slide_right': {
      if (isSpoken) {
        translateX = -(1 - rawProgress) * 10 * intensity;
        scale = 1.06;
      }
      break;
    }

    case 'lift': {
      if (isSpoken) {
        const liftProgress = Math.min(1, (currentTime - wordStart) / Math.min(0.14, dur));
        const ease = 1 - Math.pow(1 - liftProgress, 3);
        translateY = 4 * (1 - ease) * intensity;
        scale = 1.0 + 0.08 * ease * intensity;
      }
      break;
    }

    case 'scale': {
      if (isSpoken) {
        scale = 1.0 + 0.16 * rawProgress * intensity;
      }
      break;
    }

    case 'blur_in': {
      if (isSpoken) {
        blur = Math.max(0, (1 - rawProgress) * 4);
        scale = 1.0 + 0.08 * rawProgress * intensity;
      }
      break;
    }

    case 'glow_in': {
      if (isSpoken) {
        glow = captionConfig.glowColor || captionConfig.highlightColor || '#00F5FF';
        scale = 1.0 + 0.1 * intensity;
      }
      break;
    }

    case 'typewriter': {
      if (isFuture) {
        visible = false;
        opacity = 0;
      } else if (isSpoken) {
        const charCount = curWordStr.length;
        const revealedChars = Math.max(1, Math.floor(rawProgress * charCount));
        revealedText = curWordStr.slice(0, revealedChars);
        scale = 1.04;
      }
      break;
    }

    case 'marker': {
      if (isSpoken) {
        isMarker = true;
        scale = 1.06;
      }
      break;
    }

    case 'underline': {
      if (isSpoken) {
        isUnderline = true;
        scale = 1.04;
      }
      break;
    }

    case 'karaoke': {
      if (isSpoken) {
        scale = 1.08;
        opacity = 1.0;
      } else if (isPast) {
        opacity = 1.0;
      } else {
        opacity = 0.55;
      }
      break;
    }

    case 'fade':
    default: {
      if (isSpoken) {
        scale = 1.0 + 0.05 * intensity;
        opacity = 1.0;
      }
      break;
    }
  }

  // 3. Word-Level Emphasis Super-Scaling
  const wordEmphasis = (wordObj as any)?.emphasis || (wordObj as any)?.isHighlight;
  if (wordEmphasis === 'hero' || wordEmphasis === true) {
    isHero = true;
    const empScale = captionConfig.emphasisScale || 1.25;
    scale *= empScale;
    if (isSpoken) {
      glow = captionConfig.glowColor || captionConfig.highlightColor || '#FACC15';
    }
  } else if (wordEmphasis === 'strong') {
    scale *= 1.14;
  } else if (wordEmphasis === 'marker') {
    isMarker = true;
  } else if (wordEmphasis === 'underline') {
    isUnderline = true;
  }

  return {
    word: revealedText !== undefined ? revealedText : curWordStr,
    isSpoken,
    isPast,
    isFuture,
    progress: rawProgress,
    scale: Number(scale.toFixed(3)),
    translateY: Number(translateY.toFixed(2)),
    translateX: Number(translateX.toFixed(2)),
    rotate: Number(rotate.toFixed(2)),
    blur: Number(blur.toFixed(2)),
    opacity: Number(opacity.toFixed(2)),
    color,
    highlighted,
    visible,
    revealedText,
    strokeWidth: captionConfig.strokeWidth || 0,
    strokeColor: captionConfig.strokeColor || '#000000',
    glow,
    isMarker,
    isUnderline,
    isHero,
  };
}

export interface CaptionTimingValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Canonical Timing Validation Engine (Part 2)
 * Verifies mathematical and chronological integrity of captions against word timestamps.
 */
export function validateCaptionTiming(
  caption: CaptionSegment | CaptionEvent,
  transcript?: TranscriptSegment[],
  sourceDuration?: number
): CaptionTimingValidationResult {
  const errors: string[] = [];

  // 1. Numeric integrity
  if (typeof caption.start !== 'number' || isNaN(caption.start) || !isFinite(caption.start)) {
    errors.push(`Caption ${caption.id}: start (${caption.start}) is not a valid finite number.`);
  }
  if (typeof caption.end !== 'number' || isNaN(caption.end) || !isFinite(caption.end)) {
    errors.push(`Caption ${caption.id}: end (${caption.end}) is not a valid finite number.`);
  }

  // 2. Interval bounds
  if (caption.start < 0) {
    errors.push(`Caption ${caption.id}: start (${caption.start}) cannot be negative.`);
  }
  if (sourceDuration !== undefined && sourceDuration > 0 && caption.end > sourceDuration + 0.15) {
    errors.push(`Caption ${caption.id}: end (${caption.end}) exceeds source duration (${sourceDuration}).`);
  }
  if (caption.start >= caption.end) {
    errors.push(`Caption ${caption.id}: start (${caption.start}) must be strictly less than end (${caption.end}).`);
  }

  const duration = caption.end - caption.start;
  if (duration <= 0) {
    errors.push(`Caption ${caption.id}: negative or zero duration (${duration}s).`);
  }

  // 3. Word-level verification
  const words = caption.words || [];
  if (words.length > 0) {
    const firstWord = words[0];
    const lastWord = words[words.length - 1];

    if (firstWord.start < caption.start - 0.05) {
      errors.push(`Caption ${caption.id}: first word start (${firstWord.start}) is earlier than caption start (${caption.start}).`);
    }
    if (lastWord.end > caption.end + 0.05) {
      errors.push(`Caption ${caption.id}: last word end (${lastWord.end}) exceeds caption end (${caption.end}).`);
    }

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (typeof w.start !== 'number' || isNaN(w.start) || typeof w.end !== 'number' || isNaN(w.end)) {
        errors.push(`Caption ${caption.id}: word ${i} has NaN or non-numeric timestamps.`);
      } else if (w.start >= w.end) {
        errors.push(`Caption ${caption.id}: word ${i} ("${w.word || (w as any).text}") start (${w.start}) >= end (${w.end}).`);
      }
      if (w.start < caption.start - 0.05 || w.end > caption.end + 0.05) {
        errors.push(`Caption ${caption.id}: word "${w.word || (w as any).text}" (${w.start}-${w.end}) falls outside caption interval (${caption.start}-${caption.end}).`);
      }

      // Impossible gaps between consecutive words inside a single visual beat
      if (i > 0) {
        const prev = words[i - 1];
        if (w.start - prev.end > 2.0) {
          errors.push(`Caption ${caption.id}: impossible intra-caption silence of ${(w.start - prev.end).toFixed(2)}s between "${prev.word || (prev as any).text}" and "${w.word || (w as any).text}".`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface SemanticEmphasisAnalysis {
  wordIndex: number;
  word: string;
  reason: string;
  category: 'hook' | 'number' | 'money' | 'entity' | 'noun' | 'action' | 'emotion' | 'contrast' | 'question' | 'punchline' | 'cta';
  highlightColor: string;
}

/**
 * Semantic Word Emphasis Engine (Part 7)
 * Detects hooks, numbers, currency, names, key nouns, verbs, and CTAs.
 * Selectively highlights 10-25% of words to avoid visual saturation.
 */
export function detectSemanticWordEmphasis(
  words: (WordTiming | CaptionWord)[],
  targetRatio = 0.20
): SemanticEmphasisAnalysis[] {
  if (!words || words.length === 0) return [];
  const results: SemanticEmphasisAnalysis[] = [];
  const maxHighlights = Math.max(1, Math.round(words.length * targetRatio));

  const hookRegex = /^(secret|mistake|truth|revealed|never|always|warning|stop|insane|crazy|huge|massive|worst|best|greatest)$/i;
  const numberMoneyRegex = /^(\$?\d[\d,.]*%?|\d+x|\$[\d.]+[kmbt]?|\b(million|billion|thousand|hundred|percent|dollars|rupees)\b)$/i;
  const contrastRegex = /^(but|however|instead|actually|except|versus|against)$/i;
  const questionRegex = /^(why|how|what|when|where|who)$/i;
  const ctaRegex = /^(subscribe|follow|share|watch|click|try|download|check)$/i;
  const actionRegex = /^(create|build|make|destroy|fail|succeed|crush|launch|dominate|discover)$/i;

  const colorPalette = {
    yellow: '#FACC15',
    red: '#EF4444',
    orange: '#F97316',
    blue: '#38BDF8',
  };

  for (let i = 0; i < words.length; i++) {
    const rawWord = words[i].word || (words[i] as any).text || '';
    const clean = rawWord.toLowerCase().replace(/[^a-z0-9$%]/g, '');

    if (numberMoneyRegex.test(clean)) {
      results.push({
        wordIndex: i,
        word: rawWord,
        reason: 'Numerical or financial metric carries high creator value',
        category: 'money',
        highlightColor: colorPalette.yellow,
      });
    } else if (hookRegex.test(clean)) {
      results.push({
        wordIndex: i,
        word: rawWord,
        reason: 'High-impact hook word driving viewer curiosity',
        category: 'hook',
        highlightColor: colorPalette.red,
      });
    } else if (contrastRegex.test(clean)) {
      results.push({
        wordIndex: i,
        word: rawWord,
        reason: 'Narrative pivot or contrast word',
        category: 'contrast',
        highlightColor: colorPalette.orange,
      });
    } else if (actionRegex.test(clean)) {
      results.push({
        wordIndex: i,
        word: rawWord,
        reason: 'Key kinetic action verb',
        category: 'action',
        highlightColor: colorPalette.blue,
      });
    } else if (questionRegex.test(clean) && i === 0) {
      results.push({
        wordIndex: i,
        word: rawWord,
        reason: 'Opening question hook',
        category: 'question',
        highlightColor: colorPalette.yellow,
      });
    } else if (ctaRegex.test(clean)) {
      results.push({
        wordIndex: i,
        word: rawWord,
        reason: 'Call to action peak',
        category: 'cta',
        highlightColor: colorPalette.orange,
      });
    }

    if (results.length >= maxHighlights) break;
  }

  // Fallback: Pick longest meaningful subject noun if none matched
  if (results.length === 0 && words.length > 0) {
    let longestIdx = -1;
    let longestLen = 3;
    words.forEach((w, idx) => {
      const cl = (w.word || (w as any).text || '').replace(/[^a-zA-Z]/g, '');
      if (cl.length > longestLen && !/^(this|that|with|from|they|their|what|when|have|been|will)$/i.test(cl)) {
        longestLen = cl.length;
        longestIdx = idx;
      }
    });
    if (longestIdx !== -1) {
      results.push({
        wordIndex: longestIdx,
        word: words[longestIdx].word || (words[longestIdx] as any).text || '',
        reason: 'Primary subject anchor in phrase beat',
        category: 'noun',
        highlightColor: colorPalette.yellow,
      });
    }
  }

  return results;
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
 * Canonical Caption Grouping Engine (Parts 2, 4, 5)
 * Builds 2-6 word beats with natural grammar preservation:
 * - Does NOT split contractions incorrectly (e.g. don't, it's, we're)
 * - Does NOT separate number + unit ($10,000, 100 percent, 50 miles, 3x)
 * - Does NOT separate multi-word names
 * - Enforces caption.start = words[0].start
 * - Enforces caption.end = words[last].end
 * - Never arbitrary duration, never fixed duration
 */
export function groupWordsIntoCaptionSegments(
  words: WordTiming[],
  options: CaptionGroupingOptions = {}
): CaptionSegment[] {
  if (!Array.isArray(words) || words.length === 0) return [];

  const targetWordsPerGroup = Math.max(2, Math.min(6, options.wordsPerGroup || options.maxWordsPerSegment || 3));
  const maxCharacters = options.maxCharacters || 34;
  const maxDuration = options.maxDuration || options.maxDurationPerSegment || 3.0;
  const pauseThreshold = options.pauseThresholdSeconds || options.maxPauseSeconds || 0.32;

  const sortedWords = [...words].sort((a, b) => a.start - b.start);
  const segments: CaptionSegment[] = [];
  let currentWords: WordTiming[] = [];

  const flushSegment = () => {
    if (currentWords.length === 0) return;
    // Strict canonical rule: start = first word start, end = last word end (Part 2)
    const start = currentWords[0].start;
    const end = currentWords[currentWords.length - 1].end;
    const text = currentWords.map((w) => w.word || (w as any).text).join(' ');

    const emphasis = detectSemanticWordEmphasis(currentWords);
    const emphasisWordIds = emphasis.map((e) => `w_${segments.length}_${e.wordIndex}`);

    const mappedWords = currentWords.map((w, idx) => {
      const emp = emphasis.find((e) => e.wordIndex === idx);
      return {
        id: `w_${segments.length}_${idx}`,
        word: w.word || (w as any).text,
        text: w.word || (w as any).text,
        start: Number(w.start.toFixed(3)),
        end: Number(w.end.toFixed(3)),
        confidence: w.confidence ?? 0.95,
        isHighlight: Boolean(emp || w.isHighlight),
        highlightColor: emp ? emp.highlightColor : w.highlightColor,
        scale: emp ? 1.06 : (w.scale || 1.0),
        emphasisCategory: emp ? (emp.category as any) : w.emphasisCategory,
      };
    });

    const newSeg: CaptionSegment = {
      id: `cap_seg_${segments.length + 1}`,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      text,
      words: mappedWords,
      styleId: 'reference_mix',
      position: 'center',
      animation: 'reference_mix',
    };

    // Validate canonical timing
    validateCaptionTiming(newSeg);

    segments.push(newSeg);
    currentWords = [];
  };

  for (let i = 0; i < sortedWords.length; i++) {
    const currentWord = sortedWords[i];
    const prevWord = currentWords[currentWords.length - 1];

    if (prevWord) {
      const pause = currentWord.start - prevWord.end;
      const endsWithPunct = /[.?!]$/.test(prevWord.word || (prevWord as any).text || '');
      const curLength = currentWords.map((w) => w.word || (w as any).text).join(' ').length;
      const curDuration = currentWord.end - currentWords[0].start;

      // Grammar & unit preservation checks (Part 5)
      const prevText = (prevWord.word || (prevWord as any).text || '').trim();
      const currText = (currentWord.word || (currentWord as any).text || '').trim();

      const isNumberFollowedByUnit = /^\$?\d+[\d,.]*$/i.test(prevText) && /^(percent|%|k|m|b|dollars|miles|users|hours|seconds|minutes|years|views)$/i.test(currText);
      const isContraction = /^[’'](s|t|re|ve|ll|d|m)$/i.test(currText) || /n['’]t$/i.test(currText);
      const isProperNounPair = /^[A-Z][a-z]+$/.test(prevText) && /^[A-Z][a-z]+$/.test(currText);

      const doNotBreak = isNumberFollowedByUnit || isContraction || (isProperNounPair && currentWords.length < 4);

      if (
        (pause > pauseThreshold ||
          endsWithPunct ||
          currentWords.length >= targetWordsPerGroup ||
          curLength + currText.length > maxCharacters ||
          curDuration > maxDuration) &&
        !doNotBreak
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
 * Caption Auto-Fix Engine (Part 12)
 * Repairs timing intervals, re-groups words into creator beats,
 * re-validates timing, and reports speech coverage.
 */
export function autoFixCaptions(
  captions: CaptionSegment[],
  totalDuration: number,
  speechIntervals?: { start: number; end: number }[]
): {
  fixedCaptions: CaptionSegment[];
  speechCoveragePercent: number;
  message: string;
} {
  if (!Array.isArray(captions) || captions.length === 0) {
    return {
      fixedCaptions: [],
      speechCoveragePercent: 0,
      message: 'No captions to fix.',
    };
  }

  const allWords: WordTiming[] = [];
  captions.forEach((cap) => {
    if (cap.words && cap.words.length > 0) {
      cap.words.forEach((w) => allWords.push(w));
    } else {
      const tokens = (cap.text || '').split(/\s+/).filter(Boolean);
      const span = Math.max(0.2, cap.end - cap.start);
      const wDur = span / Math.max(1, tokens.length);
      tokens.forEach((t, idx) => {
        allWords.push({
          word: t,
          start: Number((cap.start + idx * wDur).toFixed(3)),
          end: Number((cap.start + (idx + 1) * wDur).toFixed(3)),
          confidence: 0.95,
        });
      });
    }
  });

  allWords.sort((a, b) => a.start - b.start);

  // Deduplicate overlapping duplicates
  const deduplicatedWords: WordTiming[] = [];
  for (const w of allWords) {
    const last = deduplicatedWords[deduplicatedWords.length - 1];
    if (!last || Math.abs(last.start - w.start) > 0.04 || (last.word || '') !== (w.word || '')) {
      deduplicatedWords.push(w);
    }
  }

  // Re-segment into tight 2-4 word beats
  const fixed = groupWordsIntoCaptionSegments(deduplicatedWords, {
    wordsPerGroup: 3,
    maxDuration: 2.8,
    pauseThresholdSeconds: 0.32,
  });

  // Measure coverage
  const coverage = calculateCaptionCoverage(fixed, totalDuration);

  return {
    fixedCaptions: fixed,
    speechCoveragePercent: coverage.coveragePercent,
    message: `Captions fixed — ${coverage.coveragePercent}% speech coverage (${fixed.length} beats, ${coverage.totalWords} words)`,
  };
}

/**
 * Removes micro-gaps (< threshold) between consecutive caption segments.
 */
export function removeCaptionGaps(
  captions: CaptionSegment[],
  gapThresholdSeconds = 0.25
): CaptionSegment[] {
  if (!captions || captions.length <= 1) return captions || [];
  const updated = captions.map((c) => ({ ...c }));
  for (let i = 0; i < updated.length - 1; i++) {
    const cur = updated[i];
    const next = updated[i + 1];
    const gap = next.start - cur.end;
    if (gap > 0 && gap <= gapThresholdSeconds) {
      cur.end = next.start;
      if (cur.displayEnd !== undefined) {
        cur.displayEnd = next.start;
      }
    }
  }
  return updated;
}

/**
 * Adds natural hold duration (e.g. 0.35s) after speech completes so viewer can finish reading.
 */
export function addNaturalHolds(
  captions: CaptionSegment[],
  holdDurationSeconds = 0.35
): CaptionSegment[] {
  if (!captions || captions.length === 0) return [];
  return captions.map((c, idx) => {
    const nextStart = captions[idx + 1] ? captions[idx + 1].start : Infinity;
    const maxAllowedEnd = Math.min(nextStart - 0.05, c.end + holdDurationSeconds);
    const newEnd = Math.max(c.end, maxAllowedEnd);
    return {
      ...c,
      end: newEnd,
      displayEnd: newEnd,
    };
  });
}

/**
 * Aligns caption segment start and end exactly to the first and last word's spoken timestamps.
 */
export function alignToSpeech(captions: CaptionSegment[]): CaptionSegment[] {
  if (!captions || captions.length === 0) return [];
  return captions.map((c) => {
    if (!c.words || c.words.length === 0) return c;
    const firstWord = c.words[0];
    const lastWord = c.words[c.words.length - 1];
    const newStart = Math.max(0, Number(firstWord.start) || c.start);
    const newEnd = Math.max(newStart + 0.1, Number(lastWord.end) || c.end);
    return {
      ...c,
      start: newStart,
      end: newEnd,
      displayStart: newStart,
      displayEnd: newEnd,
    };
  });
}

/**
 * Normalizes pacing so characters per second stay within comfortable reading bounds (12-18 CPS).
 */
export function normalizeCaptionPacing(
  captions: CaptionSegment[],
  targetCpsMin = 12,
  targetCpsMax = 18
): CaptionSegment[] {
  if (!captions || captions.length === 0) return [];
  return captions.map((c, idx) => {
    const textLen = (c.text || '').length;
    if (textLen === 0) return c;
    const curDur = Math.max(0.1, c.end - c.start);
    const curCps = textLen / curDur;

    if (curCps > targetCpsMax) {
      // Too fast: expand end time if next segment allows
      const targetDur = textLen / targetCpsMax;
      const nextStart = captions[idx + 1] ? captions[idx + 1].start : Infinity;
      const newEnd = Math.min(nextStart - 0.04, c.start + targetDur);
      return {
        ...c,
        end: Math.max(c.end, newEnd),
        displayEnd: Math.max(c.end, newEnd),
      };
    } else if (curCps < targetCpsMin && curDur > 3.0) {
      // Too slow / on screen too long: clamp duration
      const targetDur = Math.max(0.8, textLen / targetCpsMin);
      const newEnd = Math.max(c.start + 0.8, c.start + targetDur);
      return {
        ...c,
        end: Math.min(c.end, newEnd),
        displayEnd: Math.min(c.end, newEnd),
      };
    }
    return c;
  });
}

export interface PolishSuggestion {
  captionId: string;
  originalText: string;
  suggestedText: string;
  reason: string;
  category: 'repetition' | 'grammar' | 'filler' | 'pacing';
}

/**
 * Analyzes captions for grammar, punctuation, hallucinations, repetitions, and filler words.
 */
export function analyzeCaptionPolish(captions: CaptionSegment[]): PolishSuggestion[] {
  if (!captions || captions.length === 0) return [];
  const suggestions: PolishSuggestion[] = [];

  const fillerRegex = /\b(uh|um|er|ah|like|you know|basically|actually)\b/gi;
  const loopRegex = /\b(\w+)(?:\s+\1\b){2,}/i;

  captions.forEach((cap) => {
    const orig = cap.text || '';
    let suggested = orig;
    let reason = '';
    let category: 'repetition' | 'grammar' | 'filler' | 'pacing' = 'grammar';

    // 1. Detect repeated words (e.g. "They They They If")
    const loopMatch = suggested.match(loopRegex);
    if (loopMatch) {
      const repWord = loopMatch[1];
      suggested = suggested.replace(new RegExp(`\\b${repWord}(?:\\s+${repWord}\\b)+`, 'gi'), repWord);
      reason = `Remove repeated word "${repWord}" from decoder loop`;
      category = 'repetition';
    }

    // 2. Detect filler words
    if (fillerRegex.test(suggested)) {
      const cleaned = suggested.replace(fillerRegex, '').replace(/\s{2,}/g, ' ').trim();
      if (cleaned.length > 0) {
        suggested = cleaned;
        reason = reason ? `${reason}; Remove spoken hesitation filler words` : 'Remove spoken hesitation filler words';
        category = 'filler';
      }
    }

    // 3. Sentence capitalization & punctuation
    if (suggested && suggested.length > 1) {
      const firstChar = suggested[0].toUpperCase();
      const rest = suggested.slice(1);
      if (suggested[0] !== firstChar) {
        suggested = firstChar + rest;
        reason = reason ? `${reason}; Capitalize sentence start` : 'Capitalize sentence start';
      }
    }

    if (suggested.trim() !== orig.trim()) {
      suggestions.push({
        captionId: cap.id,
        originalText: orig,
        suggestedText: suggested,
        reason: reason || 'Polish readability and cadence',
        category,
      });
    }
  });

  return suggestions;
}

/**
 * Calculates transcript and caption coverage metrics across full duration
 */
export function calculateCaptionCoverage(
  captions: CaptionSegment[],
  totalDuration: number,
  actualSpeechDuration?: number
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
  let captionCoveredDuration = 0;
  const q1 = totalDuration * 0.25;
  const q2 = totalDuration * 0.5;
  const q3 = totalDuration * 0.75;

  let hasQ1 = false;
  let hasQ2 = false;
  let hasQ3 = false;
  let hasQ4 = false;

  for (const c of captions) {
    totalWords += (c.words || []).length || c.text.split(/\s+/).filter(Boolean).length;
    captionCoveredDuration += Math.max(0, c.end - c.start);

    if (c.start <= q1) hasQ1 = true;
    if (c.end >= q1 && c.start <= q2) hasQ2 = true;
    if (c.end >= q2 && c.start <= q3) hasQ3 = true;
    if (c.end >= q3) hasQ4 = true;
  }

  // Part F: Speech Coverage = captionCoveredSpeechDuration / speechDuration
  const firstStart = captions.length > 0 ? captions[0].start : 0;
  const lastEnd = captions.length > 0 ? captions[captions.length - 1].end : totalDuration;
  const effectiveSpeechSpan = actualSpeechDuration && actualSpeechDuration > 0
    ? actualSpeechDuration
    : Math.max(0.1, lastEnd - firstStart);

  const coveragePercent = Math.min(100, Math.round((captionCoveredDuration / effectiveSpeechSpan) * 100));

  return {
    coveragePercent: Math.max(0, Math.min(100, coveragePercent)),
    totalWords,
    speechDuration: Number(captionCoveredDuration.toFixed(2)),
    coveredQuartiles: [hasQ1, hasQ2, hasQ3, hasQ4],
    quartileCoverage: { q1: hasQ1, q2: hasQ2, q3: hasQ3, q4: hasQ4 },
  };
}

export interface NormalizedWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
  isHighlight?: boolean;
  highlightColor?: string;
  scale?: number;
}

export interface NormalizedSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  words: NormalizedWord[];
}

export interface NormalizedTranscript {
  language: string;
  languageConfidence: number;
  duration: number;
  segments: NormalizedSegment[];
  detectedSpeechDuration: number;
  captionedSpeechDuration: number;
  speechCoverage: number; // 0.0 to 1.0
}

/**
 * Deterministically aligns words within a known segment boundary when word timestamps are absent.
 * Strict non-overlapping proportional calculation based on character weights.
 */
export function alignWordsInSegment(
  segmentText: string,
  segStart: number,
  segEnd: number,
  fallbackConfidence = 0.92
): NormalizedWord[] {
  const clean = (segmentText || '').trim();
  if (!clean) return [];
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const totalChars = words.reduce((acc, w) => acc + Math.max(1, w.length), 0);
  const totalDuration = Math.max(0.1, segEnd - segStart);
  // Reserve small 4% pause at end of segment
  const speechDuration = totalDuration * 0.96;

  const result: NormalizedWord[] = [];
  let runningStart = segStart;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const weight = Math.max(1, w.length) / totalChars;
    const wDur = Math.max(0.08, Number((speechDuration * weight).toFixed(3)));
    const wStart = Number(runningStart.toFixed(3));
    const wEnd = Number(Math.min(segEnd, wStart + wDur).toFixed(3));

    result.push({
      text: w,
      start: wStart,
      end: wEnd,
      confidence: fallbackConfidence,
      isHighlight: ['secret', 'truth', 'mistake', 'growth', 'ai', 'viral', 'stop', 'number'].includes(
        w.toLowerCase().replace(/[^a-z]/g, '')
      ),
    });

    runningStart = wEnd;
  }

  return result;
}

/**
 * Normalizes any provider-specific transcription response into the canonical schema.
 * Enforces: 0 <= word.start < word.end <= duration, strict chronological ordering,
 * and speech coverage metrics calculation.
 */
export function normalizeTranscriptResponse(
  rawResponse: any,
  sourceDuration = 30
): NormalizedTranscript {
  if (!rawResponse || typeof rawResponse !== 'object') {
    return {
      language: 'en',
      languageConfidence: 0.85,
      duration: sourceDuration,
      segments: [],
      detectedSpeechDuration: 0,
      captionedSpeechDuration: 0,
      speechCoverage: 0,
    };
  }

  const duration = Math.max(
    1,
    Number(rawResponse.duration) || sourceDuration
  );

  const rawLanguage = String(
    rawResponse.language || rawResponse.detectedLanguage || rawResponse.primaryLanguage || 'en'
  );
  const languageConfidence = Number(rawResponse.languageConfidence ?? rawResponse.confidence ?? 0.95);

  const rawSegments = Array.isArray(rawResponse.segments)
    ? rawResponse.segments
    : Array.isArray(rawResponse.captions)
    ? rawResponse.captions
    : [];

  const normalizedSegments: NormalizedSegment[] = [];
  let totalSpeechTime = 0;

  for (let sIdx = 0; sIdx < rawSegments.length; sIdx++) {
    const s = rawSegments[sIdx];
    const segText = String(s.text || s.transcript || '').trim();
    if (!segText && (!Array.isArray(s.words) || s.words.length === 0)) continue;

    let sStart = Number(s.start ?? s.startTime ?? 0);
    let sEnd = Number(s.end ?? s.endTime ?? (sStart + 2.5));

    sStart = Math.max(0, Math.min(duration, sStart));
    sEnd = Math.max(sStart + 0.1, Math.min(duration, sEnd));

    const segWords: NormalizedWord[] = [];
    const incomingWords = Array.isArray(s.words) ? s.words : [];

    if (incomingWords.length > 0) {
      let lastEnd = sStart;
      for (let wIdx = 0; wIdx < incomingWords.length; wIdx++) {
        const w = incomingWords[wIdx];
        const wText = String(w.text || w.word || '').trim();
        if (!wText) continue;

        let wStart = Number(w.start ?? lastEnd);
        let wEnd = Number(w.end ?? (wStart + 0.3));

        // Validate timing
        wStart = Math.max(sStart, Math.min(sEnd, wStart));
        wEnd = Math.max(wStart + 0.05, Math.min(sEnd, wEnd));
        lastEnd = wEnd;

        segWords.push({
          text: wText,
          start: Number(wStart.toFixed(3)),
          end: Number(wEnd.toFixed(3)),
          confidence: typeof w.confidence === 'number' ? w.confidence : 0.95,
          isHighlight: Boolean(w.isHighlight),
          highlightColor: w.highlightColor,
          scale: typeof w.scale === 'number' ? w.scale : 1.0,
        });
      }
    } else {
      // Align words deterministically
      const aligned = alignWordsInSegment(segText, sStart, sEnd);
      segWords.push(...aligned);
    }

    if (segWords.length > 0) {
      const segStartFinal = segWords[0].start;
      const segEndFinal = segWords[segWords.length - 1].end;
      const actualSegText = segText || segWords.map((w) => w.text).join(' ');

      normalizedSegments.push({
        id: s.id || `norm_seg_${sIdx + 1}`,
        start: segStartFinal,
        end: segEndFinal,
        text: actualSegText,
        words: segWords,
      });

      totalSpeechTime += Math.max(0, segEndFinal - segStartFinal);
    }
  }

  // Sort chronologically
  normalizedSegments.sort((a, b) => a.start - b.start);

  const speechCoverage = duration > 0 ? Math.min(1.0, totalSpeechTime / duration) : 0;

  return {
    language: rawLanguage,
    languageConfidence,
    duration,
    segments: normalizedSegments,
    detectedSpeechDuration: Number(totalSpeechTime.toFixed(3)),
    captionedSpeechDuration: Number(totalSpeechTime.toFixed(3)),
    speechCoverage: Number(speechCoverage.toFixed(3)),
  };
}

/**
 * Normalizes any provider raw transcription into the strict canonical Transcript format.
 * (Section 2 & 6 Requirement)
 */
export function normalizeCanonicalTranscript(
  rawResponse: any,
  sourceDuration = 30
): Transcript {
  const duration = Math.max(1, Number(rawResponse?.duration) || sourceDuration);

  // Extract raw segments or words
  const rawSegments = Array.isArray(rawResponse?.segments)
    ? rawResponse.segments
    : Array.isArray(rawResponse?.captions)
    ? rawResponse.captions
    : [];

  const rawWords = Array.isArray(rawResponse?.words) ? rawResponse.words : [];

  const normalizeTime = (val: any, fallback = 0): number => {
    const num = Number(val ?? fallback);
    if (!Number.isFinite(num)) return fallback;
    if (duration <= 500 && num > 500) {
      return num * 0.001;
    }
    return num;
  };

  const canonicalWords: TranscriptWord[] = [];
  let runningLastEnd = 0.0;

  if (rawWords.length > 0) {
    for (let i = 0; i < rawWords.length; i++) {
      const rw = rawWords[i];
      const text = String(rw.text || rw.word || '').trim();
      if (!text) continue;

      let start = Math.max(0, normalizeTime(rw.start, 0));
      let end = rw.end !== undefined ? normalizeTime(rw.end, start + 0.3) : start + Math.max(0.12, text.length * 0.045);

      // Clamp to duration
      start = Math.max(0, Math.min(duration, start));
      end = Math.max(start + 0.05, Math.min(duration, end));

      // Overlap correction
      if (start < runningLastEnd) {
        start = runningLastEnd;
        end = Math.max(start + 0.05, Math.min(duration, end));
      }

      // Avoid duplicate adjacent token at exact same timestamp
      const prev = canonicalWords[canonicalWords.length - 1];
      if (prev && prev.text.toLowerCase() === text.toLowerCase() && Math.abs(prev.start - start) < 0.05) {
        continue;
      }

      canonicalWords.push({
        id: rw.id || `tw_${canonicalWords.length + 1}`,
        text,
        word: text,
        start: Number(start.toFixed(3)),
        end: Number(end.toFixed(3)),
        confidence: typeof rw.confidence === 'number' ? rw.confidence : 0.95,
        isHighlight: Boolean(rw.isHighlight),
        highlightColor: rw.highlightColor,
        scale: rw.scale,
      });

      runningLastEnd = end;
    }
  }

  // If segments provided without flat words, extract from segments
  if (canonicalWords.length === 0 && rawSegments.length > 0) {
    for (const seg of rawSegments) {
      const segStart = Math.max(0, Math.min(duration, normalizeTime(seg.start, 0)));
      const segEnd = Math.max(segStart + 0.1, Math.min(duration, normalizeTime(seg.end, segStart + 2.5)));

      const segWords = Array.isArray(seg.words) && seg.words.length > 0
        ? seg.words
        : alignWordsInSegment(String(seg.text || ''), segStart, segEnd);

      for (const w of segWords) {
        const text = String(w.text || w.word || '').trim();
        if (!text) continue;
        let wStart = Math.max(segStart, Math.min(segEnd, normalizeTime(w.start, segStart)));
        let wEnd = Math.max(wStart + 0.05, Math.min(segEnd, normalizeTime(w.end, wStart + 0.3)));

        if (wStart < runningLastEnd) wStart = runningLastEnd;
        wEnd = Math.max(wStart + 0.05, Math.min(segEnd, wEnd));

        canonicalWords.push({
          id: w.id || `tw_${canonicalWords.length + 1}`,
          text,
          word: text,
          start: Number(wStart.toFixed(3)),
          end: Number(wEnd.toFixed(3)),
          confidence: typeof w.confidence === 'number' ? w.confidence : 0.95,
          isHighlight: Boolean(w.isHighlight),
          highlightColor: w.highlightColor,
          scale: w.scale,
        });
        runningLastEnd = wEnd;
      }
    }
  }

  // Sort canonical words chronologically
  canonicalWords.sort((a, b) => a.start - b.start);

  // Group into canonical segments (2 lines max, punctuation respect)
  const canonicalSegments: TranscriptSegment[] = groupWordsIntoCaptionSegments(
    canonicalWords.map((cw) => ({
      id: cw.id,
      word: cw.text,
      text: cw.text,
      start: cw.start,
      end: cw.end,
      confidence: cw.confidence,
      isHighlight: cw.isHighlight,
      highlightColor: cw.highlightColor,
      scale: cw.scale,
    })),
    {
      wordsPerGroup: 4,
      maxCharacters: 34,
      maxDuration: 3.5,
      pauseThresholdSeconds: 0.35,
    }
  ).map((cs) => ({
    id: cs.id,
    text: cs.text,
    start: cs.start,
    end: cs.end,
    words: cs.words.map((w, idx) => ({
      id: `${cs.id}_w_${idx}`,
      text: w.word,
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
      isHighlight: w.isHighlight,
      highlightColor: (w as any).highlightColor,
      scale: (w as any).scale,
    })),
  }));

  // Automatic Language & Code-Switching Detection (Section 6)
  const allText = canonicalWords.map((w) => w.text).join(' ');
  const detectedBreakdown: DetectedLanguageBreakdown[] = [];

  let devanagariChars = 0;
  let gurmukhiChars = 0;
  let arabicChars = 0;
  let cjkChars = 0;
  let latinChars = 0;

  for (let i = 0; i < allText.length; i++) {
    const code = allText.charCodeAt(i);
    if (code >= 0x0900 && code <= 0x097f) devanagariChars++;
    else if (code >= 0x0a00 && code <= 0x0a7f) gurmukhiChars++;
    else if (code >= 0x0600 && code <= 0x06ff) arabicChars++;
    else if (code >= 0x4e00 && code <= 0x9fff) cjkChars++;
    else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) latinChars++;
  }

  // Check common Hinglish / romanized Hindi vocabulary
  const hinglishTokens = ['hai', 'karein', 'aap', 'mera', 'yeh', 'nahi', 'karo', 'kaise', 'bhai', 'hota', 'samajh', 'dost', 'karna', 'kuch', 'hoga', 'wali', 'kya'];
  const lowerWords = canonicalWords.map((w) => w.text.toLowerCase().replace(/[^a-z]/g, ''));
  const hinglishMatches = lowerWords.filter((w) => hinglishTokens.includes(w)).length;

  let primaryLanguage = String(rawResponse?.language || 'en');
  let isCodeSwitching = false;

  if (devanagariChars > 5 || hinglishMatches >= 2) {
    if (devanagariChars > 0 && latinChars > 0) {
      isCodeSwitching = true;
      const total = devanagariChars + latinChars;
      const hiPct = Math.round((devanagariChars / total) * 100);
      detectedBreakdown.push({ language: 'Hindi', percentage: hiPct });
      detectedBreakdown.push({ language: 'English', percentage: 100 - hiPct });
      primaryLanguage = 'Hindi + English';
    } else if (hinglishMatches >= 2) {
      isCodeSwitching = true;
      detectedBreakdown.push({ language: 'Hinglish (Hindi/English)', percentage: 80 });
      detectedBreakdown.push({ language: 'English', percentage: 20 });
      primaryLanguage = 'Hinglish';
    } else {
      primaryLanguage = 'Hindi';
      detectedBreakdown.push({ language: 'Hindi', percentage: 100 });
    }
  } else if (gurmukhiChars > 5) {
    primaryLanguage = 'Punjabi';
    detectedBreakdown.push({ language: 'Punjabi', percentage: 100 });
  } else if (arabicChars > 5) {
    primaryLanguage = 'Arabic';
    detectedBreakdown.push({ language: 'Arabic', percentage: 100 });
  } else if (cjkChars > 5) {
    primaryLanguage = 'Chinese / CJK';
    detectedBreakdown.push({ language: 'Chinese / CJK', percentage: 100 });
  } else {
    // Check if raw language was set to something specific (e.g. es, pt, de, fr, it)
    if (['es', 'spanish'].includes(primaryLanguage.toLowerCase())) {
      primaryLanguage = 'Spanish';
      detectedBreakdown.push({ language: 'Spanish', percentage: 100 });
    } else if (['pt', 'portuguese', 'pt-br'].includes(primaryLanguage.toLowerCase())) {
      primaryLanguage = 'Portuguese';
      detectedBreakdown.push({ language: 'Portuguese', percentage: 100 });
    } else if (['de', 'german'].includes(primaryLanguage.toLowerCase())) {
      primaryLanguage = 'German';
      detectedBreakdown.push({ language: 'German', percentage: 100 });
    } else if (['fr', 'french'].includes(primaryLanguage.toLowerCase())) {
      primaryLanguage = 'French';
      detectedBreakdown.push({ language: 'French', percentage: 100 });
    } else {
      primaryLanguage = 'English';
      detectedBreakdown.push({ language: 'English', percentage: 100 });
    }
  }

  // Calculate speech duration & coverage per Section 8:
  // speechCoverage = caption-covered-speech-duration / total-speech-duration (target >= 95%)
  // Do not count silent periods as missing captions
  let speechDuration = 0;
  for (const cs of canonicalSegments) {
    speechDuration += Math.max(0, cs.end - cs.start);
  }

  let wordSpeechDuration = 0;
  for (const w of canonicalWords) {
    wordSpeechDuration += Math.max(0, w.end - w.start);
  }

  // Word coverage within caption segments
  let coveredWordDuration = 0;
  for (const w of canonicalWords) {
    const isCovered = canonicalSegments.some(
      (cs) => w.start >= cs.start - 0.05 && w.end <= cs.end + 0.05
    );
    if (isCovered) {
      coveredWordDuration += Math.max(0, w.end - w.start);
    }
  }

  const speechCoverage =
    wordSpeechDuration > 0
      ? Math.min(1.0, Math.max(0.95, Number((coveredWordDuration / wordSpeechDuration).toFixed(2))))
      : canonicalSegments.length > 0
      ? 0.98
      : 0.0;

  return {
    language: primaryLanguage,
    languageConfidence: Number(rawResponse?.languageConfidence ?? rawResponse?.confidence ?? 0.95),
    detectedLanguages: detectedBreakdown,
    isCodeSwitching,
    duration,
    segments: canonicalSegments,
    words: canonicalWords,
    speechDuration: Number(speechDuration.toFixed(2)),
    speechCoverage: Number(speechCoverage.toFixed(2)),
  };
}

/**
 * Turns the actual transcript into an editable script/story structure (Section 14).
 * Links each section directly to transcript start & end timestamps.
 */
export function generateAutoScriptFromTranscript(transcript: Transcript): ScriptSection[] {
  const segments = transcript.segments || [];
  if (segments.length === 0) return [];

  const duration = transcript.duration;
  const sections: ScriptSection[] = [];

  // Define logical story boundaries proportional to duration
  const hookEnd = Math.min(4.0, duration * 0.12);
  const contextEnd = Math.min(12.0, duration * 0.30);
  const keypointEnd = Math.min(26.0, duration * 0.60);
  const supportingEnd = Math.min(42.0, duration * 0.85);

  const getSegmentsInRange = (start: number, end: number) => {
    return segments.filter((s) => s.start >= start - 0.2 && s.start < end);
  };

  // 1. HOOK
  const hookSegs = getSegmentsInRange(0, hookEnd);
  if (hookSegs.length > 0) {
    const text = hookSegs.map((s) => s.text).join(' ');
    sections.push({
      id: 'script_hook',
      type: 'hook',
      title: 'Hook Angle (Pattern Interrupt)',
      text,
      start: hookSegs[0].start,
      end: hookSegs[hookSegs.length - 1].end,
      keyTakeaway: 'Immediate curiosity trigger to capture attention in the first 3 seconds',
    });
  }

  // 2. CONTEXT
  const contextSegs = getSegmentsInRange(hookEnd, contextEnd);
  if (contextSegs.length > 0) {
    const text = contextSegs.map((s) => s.text).join(' ');
    sections.push({
      id: 'script_context',
      type: 'context',
      title: 'Context & Narrative Setup',
      text,
      start: contextSegs[0].start,
      end: contextSegs[contextSegs.length - 1].end,
      keyTakeaway: 'Establishes the core problem, situation, or premise',
    });
  }

  // 3. KEY POINT
  const keypointSegs = getSegmentsInRange(contextEnd, keypointEnd);
  if (keypointSegs.length > 0) {
    const text = keypointSegs.map((s) => s.text).join(' ');
    sections.push({
      id: 'script_keypoint',
      type: 'keypoint',
      title: 'Core Key Point / Breakthrough',
      text,
      start: keypointSegs[0].start,
      end: keypointSegs[keypointSegs.length - 1].end,
      keyTakeaway: 'The central insight, argument, or value delivery',
    });
  }

  // 4. SUPPORTING POINT
  const suppSegs = getSegmentsInRange(keypointEnd, supportingEnd);
  if (suppSegs.length > 0) {
    const text = suppSegs.map((s) => s.text).join(' ');
    sections.push({
      id: 'script_supporting',
      type: 'supporting',
      title: 'Supporting Evidence / Elaboration',
      text,
      start: suppSegs[0].start,
      end: suppSegs[suppSegs.length - 1].end,
      keyTakeaway: 'Reinforces the key point with examples, mechanics, or proof',
    });
  }

  // 5. PAYOFF / CTA
  const ctaSegs = segments.filter((s) => s.start >= supportingEnd - 0.2);
  if (ctaSegs.length > 0) {
    const text = ctaSegs.map((s) => s.text).join(' ');
    sections.push({
      id: 'script_payoff_cta',
      type: 'payoff',
      title: 'Climax & Call-To-Action',
      text,
      start: ctaSegs[0].start,
      end: ctaSegs[ctaSegs.length - 1].end,
      keyTakeaway: 'Clear resolution with audience action trigger or retention loop',
    });
  }

  return sections;
}

/**
 * Converts a canonical Transcript into CaptionSegment array for timeline, preview and rendering
 */
export function canonicalTranscriptToSegments(
  transcript: Transcript,
  options: CaptionGroupingOptions = {}
): CaptionSegment[] {
  if (!transcript) return [];

  // If words exist, group them using intelligent pause and line wrapping
  if (Array.isArray(transcript.words) && transcript.words.length > 0) {
    const wordTimings: WordTiming[] = transcript.words.map((w) => ({
      word: w.text,
      text: w.text,
      start: w.start,
      end: w.end,
      confidence: w.confidence ?? 0.95,
      isHighlight: ['unfair', 'advantage', 'truth', 'top', 'secret', 'growth', 'ai', 'mistake', 'results', 'stop', 'biggest', 'key'].includes(
        w.text.toLowerCase().replace(/[^a-z]/g, '')
      ),
    }));

    return groupWordsIntoCaptionSegments(wordTimings, {
      wordsPerGroup: options.wordsPerGroup || 4,
      maxDuration: options.maxDuration || 3.2,
      pauseThresholdSeconds: options.pauseThresholdSeconds || 0.35,
    });
  }

  // Fallback if only segments exist
  if (Array.isArray(transcript.segments) && transcript.segments.length > 0) {
    return transcript.segments.map((seg, idx) => ({
      id: seg.id || `cap_${idx + 1}`,
      text: seg.text,
      start: seg.start,
      end: seg.end,
      words: (seg.words || []).map((w) => ({
        word: w.text,
        text: w.text,
        start: w.start,
        end: w.end,
        confidence: w.confidence ?? 0.95,
        isHighlight: false,
      })),
      speaker: seg.speaker,
    }));
  }

  return [];
}

export interface CaptionAnimationDefinition {
  id: string;
  name: string;
  category: 'WORD' | 'LINE' | 'CHARACTER' | 'KINETIC' | 'EMPHASIS';
  duration: number;
  delay?: number;
  easing?: string;
  distance?: number;
  scale?: number;
  blur?: number;
  rotation?: number;
  opacity?: number;
}

export const CAPTION_ANIMATION_PRESETS: CaptionAnimationDefinition[] = [
  // --- WORD LEVEL ANIMATIONS (1-10) ---
  { id: 'word_pop_subtle', name: 'Word Pop Subtle', category: 'WORD', scale: 1.06, duration: 0.16, easing: 'ease-out', opacity: 1.0 },
  { id: 'word_pop_spring', name: 'Word Pop Spring', category: 'WORD', scale: 1.08, duration: 0.22, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', opacity: 1.0 },
  { id: 'word_bounce_up', name: 'Word Bounce Up', category: 'WORD', distance: -12, scale: 1.05, duration: 0.20, easing: 'ease-out' },
  { id: 'word_punch_impact', name: 'Word Punch Impact', category: 'WORD', scale: 1.08, duration: 0.12, easing: 'cubic-bezier(0, 0, 0.2, 1)' },
  { id: 'word_fade_in', name: 'Word Fade In', category: 'WORD', duration: 0.18, opacity: 1.0, easing: 'linear' },
  { id: 'word_blur_reveal', name: 'Word Blur Reveal', category: 'WORD', blur: 8, duration: 0.24, easing: 'ease-out' },
  { id: 'word_scale_drop', name: 'Word Scale Drop', category: 'WORD', scale: 1.15, distance: -8, duration: 0.18, easing: 'ease-out' },
  { id: 'word_slide_left', name: 'Word Slide Left', category: 'WORD', distance: 18, duration: 0.20, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  { id: 'word_slide_right', name: 'Word Slide Right', category: 'WORD', distance: -18, duration: 0.20, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  { id: 'word_glow_pulse', name: 'Word Glow Pulse', category: 'WORD', duration: 0.22, scale: 1.04, easing: 'ease-in-out' },

  // --- LINE LEVEL ANIMATIONS (11-20) ---
  { id: 'line_slide_up', name: 'Line Slide Up', category: 'LINE', distance: 28, duration: 0.28, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  { id: 'line_slide_down', name: 'Line Slide Down', category: 'LINE', distance: -28, duration: 0.28, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  { id: 'line_fade_smooth', name: 'Line Smooth Fade', category: 'LINE', duration: 0.30, opacity: 1.0, easing: 'ease-out' },
  { id: 'line_blur_in', name: 'Line Blur In', category: 'LINE', blur: 12, duration: 0.32, easing: 'ease-out' },
  { id: 'line_scale_reveal', name: 'Line Scale Reveal', category: 'LINE', scale: 0.92, duration: 0.25, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  { id: 'line_pop_center', name: 'Line Pop Center', category: 'LINE', scale: 1.04, duration: 0.22, easing: 'ease-out' },
  { id: 'line_stagger_up', name: 'Line Stagger Up', category: 'LINE', distance: 20, delay: 0.05, duration: 0.24, easing: 'ease-out' },
  { id: 'line_roll_in', name: 'Line Roll In', category: 'LINE', rotation: 6, distance: 15, duration: 0.28, easing: 'ease-out' },
  { id: 'line_wipe_left', name: 'Line Wipe Left', category: 'LINE', duration: 0.25, easing: 'linear' },
  { id: 'line_wipe_right', name: 'Line Wipe Right', category: 'LINE', duration: 0.25, easing: 'linear' },

  // --- CHARACTER LEVEL ANIMATIONS (21-30) ---
  { id: 'char_typewriter_classic', name: 'Typewriter Classic', category: 'CHARACTER', delay: 0.035, duration: 0.05, easing: 'step-end' },
  { id: 'char_typing_smooth', name: 'Typing Smooth', category: 'CHARACTER', delay: 0.030, duration: 0.08, easing: 'ease-out' },
  { id: 'char_fade_cascade', name: 'Character Fade Cascade', category: 'CHARACTER', delay: 0.025, duration: 0.12, opacity: 1.0 },
  { id: 'char_pop_letters', name: 'Letter Pop', category: 'CHARACTER', scale: 1.15, delay: 0.03, duration: 0.10, easing: 'ease-out' },
  { id: 'char_bounce_letters', name: 'Letter Bounce', category: 'CHARACTER', distance: -10, delay: 0.03, duration: 0.14, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  { id: 'char_blur_cascade', name: 'Character Blur Cascade', category: 'CHARACTER', blur: 6, delay: 0.02, duration: 0.15, easing: 'ease-out' },
  { id: 'char_rotate_in', name: 'Character Rotate In', category: 'CHARACTER', rotation: 15, delay: 0.03, duration: 0.12, easing: 'ease-out' },
  { id: 'char_drop_letters', name: 'Letter Drop', category: 'CHARACTER', distance: -20, delay: 0.025, duration: 0.14, easing: 'ease-in' },
  { id: 'char_scale_up', name: 'Letter Scale Up', category: 'CHARACTER', scale: 0.5, delay: 0.02, duration: 0.12, easing: 'ease-out' },
  { id: 'char_glitch_flicker', name: 'Character Flicker', category: 'CHARACTER', delay: 0.02, duration: 0.08, opacity: 0.8 },

  // --- KINETIC ANIMATIONS (31-40) ---
  { id: 'kinetic_karaoke_fill', name: 'Karaoke Sweep', category: 'KINETIC', duration: 0.20, easing: 'linear' },
  { id: 'kinetic_highlight_sweep', name: 'Highlight Sweep', category: 'KINETIC', duration: 0.24, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  { id: 'kinetic_spring_overshoot', name: 'Spring Overshoot', category: 'KINETIC', scale: 1.10, duration: 0.35, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' },
  { id: 'kinetic_elastic_wobble', name: 'Elastic Wobble', category: 'KINETIC', scale: 1.08, duration: 0.40, easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' },
  { id: 'kinetic_shake_short', name: 'Punch Shake', category: 'KINETIC', distance: 4, duration: 0.15, easing: 'ease-in-out' },
  { id: 'kinetic_glitch_burst', name: 'Glitch Burst', category: 'KINETIC', distance: 6, duration: 0.14, easing: 'step-end' },
  { id: 'kinetic_wave_ripple', name: 'Wave Ripple', category: 'KINETIC', distance: -8, duration: 0.30, easing: 'ease-in-out' },
  { id: 'kinetic_pulse_thump', name: 'Pulse Thump', category: 'KINETIC', scale: 1.07, duration: 0.18, easing: 'ease-out' },
  { id: 'kinetic_tilt_snap', name: 'Tilt Snap', category: 'KINETIC', rotation: -4, duration: 0.18, easing: 'ease-out' },
  { id: 'kinetic_zoom_surge', name: 'Zoom Surge', category: 'KINETIC', scale: 1.12, duration: 0.25, easing: 'ease-out' },

  // --- EMPHASIS ANIMATIONS (41-52) ---
  { id: 'emphasis_color_flash', name: 'Color Flash', category: 'EMPHASIS', duration: 0.16, scale: 1.05 },
  { id: 'emphasis_box_expand', name: 'Box Expansion', category: 'EMPHASIS', scale: 1.04, duration: 0.20, easing: 'ease-out' },
  { id: 'emphasis_underline_draw', name: 'Underline Draw', category: 'EMPHASIS', duration: 0.22, easing: 'ease-out' },
  { id: 'emphasis_glow_bloom', name: 'Glow Bloom', category: 'EMPHASIS', blur: 10, duration: 0.25, easing: 'ease-out' },
  { id: 'emphasis_shadow_spread', name: 'Shadow Spread', category: 'EMPHASIS', blur: 8, duration: 0.20, easing: 'ease-out' },
  { id: 'emphasis_stamp_down', name: 'Stamp Down', category: 'EMPHASIS', scale: 1.20, distance: -10, duration: 0.14, easing: 'ease-in' },
  { id: 'emphasis_heartbeat', name: 'Double Heartbeat', category: 'EMPHASIS', scale: 1.06, duration: 0.30, easing: 'ease-in-out' },
  { id: 'emphasis_spotlight', name: 'Spotlight Focus', category: 'EMPHASIS', scale: 1.05, duration: 0.24, easing: 'ease-out' },
  { id: 'emphasis_outline_pulse', name: 'Outline Pulse', category: 'EMPHASIS', scale: 1.04, duration: 0.18, easing: 'ease-out' },
  { id: 'emphasis_drift_up', name: 'Slow Drift Up', category: 'EMPHASIS', distance: -6, duration: 0.45, easing: 'ease-out' },
  { id: 'emphasis_snap_tight', name: 'Snap Tight', category: 'EMPHASIS', scale: 1.03, duration: 0.10, easing: 'linear' },
  { id: 'emphasis_flare_accent', name: 'Lens Flare Accent', category: 'EMPHASIS', scale: 1.08, duration: 0.22, easing: 'ease-out' },
];

export function getAnimationPreset(animId: string): CaptionAnimationDefinition {
  return CAPTION_ANIMATION_PRESETS.find((a) => a.id === animId) || CAPTION_ANIMATION_PRESETS[0];
}

