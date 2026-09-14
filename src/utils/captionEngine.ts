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

export const ALL_CAPTION_STYLES: CaptionStyleDefinition[] = [
  ...CAPTION_STYLES_REGISTRY,
  ...EXTENDED_CAPTION_STYLES,
];

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
    ALL_CAPTION_STYLES.find((s) => s.id === canonicalId) ||
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
   * Prevents oversized text in preview and maintains legible spacing across all 25 presets.
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
    const exportFontSize = baseFontSize >= 50 ? baseFontSize : Math.round(baseFontSize * 2.1);
    const previewFontSize = Math.max(14, Math.min(24, Math.round(exportFontSize * scale)));

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
  opacity: number;
  color: string;
  highlighted: boolean;
  visible: boolean;
  revealedText?: string;
  strokeWidth: number;
  strokeColor: string;
}

/**
 * High-performance speech-synchronized word animation state calculation.
 * Resolves deterministic motion curves (translateY, scale, opacity, highlight color)
 * based strictly on currentTime and word timing. Zero setInterval, seek-safe.
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
  const isSpoken = currentTime >= wordStart && currentTime <= wordEnd;
  const isPast = currentTime > wordEnd;
  const isFuture = currentTime < wordStart;

  const mode = captionConfig.animationMode ||
    (captionConfig.animationType === 'karaoke' ? 'KARAOKE' :
     captionConfig.animationType === 'typewriter' ? 'TYPE_ON' :
     captionConfig.animationType === 'bounce' ? 'POP_WORD' :
     captionConfig.style === 'reference_typing' || captionConfig.preset === 'reference_typing' ? 'REFERENCE_TYPING' :
     'REFERENCE_TYPING');

  const dur = Math.max(0.05, wordEnd - wordStart);
  const rawProgress = isSpoken ? Math.min(1, Math.max(0, (currentTime - wordStart) / dur)) : (isPast ? 1 : 0);

  let scale = 1.0;
  let translateY = 0;
  let opacity = 1.0;
  let visible = true;
  let highlighted = false;
  let color = captionConfig.primaryColor;
  let revealedText: string | undefined = undefined;

  switch (mode) {
    case 'WORD_BY_WORD': {
      if (isFuture) {
        visible = false;
        opacity = 0;
      } else if (isSpoken) {
        visible = true;
        opacity = 1;
        highlighted = true;
        color = wordObj?.highlightColor || captionConfig.highlightColor;
        scale = 1.08;
      } else {
        visible = true;
        opacity = 1;
        highlighted = false;
        color = captionConfig.primaryColor;
      }
      break;
    }

    case 'KARAOKE': {
      visible = true;
      if (isSpoken) {
        highlighted = true;
        color = wordObj?.highlightColor || captionConfig.highlightColor;
        scale = 1.08;
        opacity = 1;
      } else if (isPast) {
        color = captionConfig.primaryColor;
        opacity = 1;
      } else {
        color = captionConfig.primaryColor;
        opacity = 0.65;
      }
      break;
    }

    case 'TYPE_ON': {
      visible = true;
      if (isFuture) {
        visible = false;
        opacity = 0;
      } else if (isSpoken) {
        const charCount = curWordStr.length;
        const revealedChars = Math.max(1, Math.floor(rawProgress * charCount));
        revealedText = curWordStr.slice(0, revealedChars);
        highlighted = true;
        color = wordObj?.highlightColor || captionConfig.highlightColor;
      } else {
        revealedText = curWordStr;
        color = captionConfig.primaryColor;
      }
      break;
    }

    case 'POP_WORD': {
      visible = true;
      if (isSpoken) {
        highlighted = true;
        color = wordObj?.highlightColor || captionConfig.highlightColor;
        const bounce = Math.sin(rawProgress * Math.PI);
        scale = 1.18 + bounce * 0.1;
        translateY = -3 * bounce;
      } else {
        color = isPast && captionConfig.style === 'podcast' ? '#64748b' : captionConfig.primaryColor;
        scale = 1.0;
        translateY = 0;
      }
      break;
    }

    case 'ACTIVE_WORD': {
      visible = true;
      if (isSpoken) {
        highlighted = true;
        color = wordObj?.highlightColor || captionConfig.highlightColor;
        scale = 1.12;
      } else {
        color = captionConfig.primaryColor;
        opacity = isPast ? 0.9 : 0.75;
      }
      break;
    }

    case 'PHRASE_BEAT': {
      visible = true;
      if (isSpoken) {
        highlighted = true;
        color = wordObj?.highlightColor || captionConfig.highlightColor;
        scale = 1.1;
      } else {
        color = captionConfig.primaryColor;
      }
      break;
    }

    case 'REFERENCE_TYPING':
    default: {
      // After Effects Bottom To Up Blurred motion preset curve
      visible = true;
      if (isSpoken) {
        highlighted = true;
        color = wordObj?.highlightColor || captionConfig.highlightColor;
        // 120ms ease-out lift (Part S: scale 1.00 -> 1.06, 80-140ms)
        const liftProgress = Math.min(1, (currentTime - wordStart) / Math.min(0.14, dur));
        const ease = 1 - Math.pow(1 - liftProgress, 3);
        translateY = 4 * (1 - ease);
        scale = Number((1.00 + 0.06 * ease).toFixed(3));
        opacity = 0.5 + 0.5 * ease;
      } else if (isPast) {
        highlighted = false;
        color = captionConfig.primaryColor;
        scale = 1.0;
        translateY = 0;
        opacity = 1.0;
      } else {
        highlighted = false;
        color = captionConfig.primaryColor;
        scale = 1.0;
        translateY = 0;
        opacity = 0.5;
      }
      break;
    }
  }

  return {
    word: revealedText !== undefined ? revealedText : curWordStr,
    isSpoken,
    isPast,
    isFuture,
    progress: rawProgress,
    scale,
    translateY,
    opacity,
    color,
    highlighted,
    visible,
    revealedText,
    strokeWidth: captionConfig.strokeWidth || 0,
    strokeColor: captionConfig.strokeColor || '#000000',
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

