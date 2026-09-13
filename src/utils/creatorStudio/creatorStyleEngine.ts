/**
 * VIRALCLIP STUDIO — CREATOR STYLE ENGINE
 * Manages 15 specialized creator styles + Reference Mix,
 * and provides intelligent AI Director style recommendation based on media analysis.
 */

import { CreatorStyleId, ReferenceStyleProfile } from './types';
import { REFERENCE_MIX, REFERENCE_STYLE_A, REFERENCE_STYLE_B } from './referenceStyleAnalyzer';

export const CREATOR_STYLES_REGISTRY: Record<CreatorStyleId, ReferenceStyleProfile> = {
  reference_mix: REFERENCE_MIX,
  viral_creator: REFERENCE_STYLE_A,
  cinematic: REFERENCE_STYLE_B,

  meme: {
    id: 'meme',
    name: 'Meme Fast',
    tagline: 'High-density sound effects, rapid punch cuts, impact text, and reaction zooms',
    captionStyle: {
      fontFamily: 'Montserrat, Arial Black, sans-serif',
      fontWeight: 900,
      fontSize: 29,
      lineSpacing: 1.2,
      uppercase: true,
      positionY: 74,
      primaryColor: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 4.5,
      shadowColor: 'rgba(0, 0, 0, 0.9)',
      shadowBlur: 8,
      highlightColors: { primary: '#22C55E', secondary: '#EAB308', accent: '#EC4899' },
      highlightRules: {
        numbersAndMoney: true,
        namesAndEntities: true,
        strongVerbs: true,
        hookWords: true,
        emotionWords: true,
        maxHighlightsPerPhrase: 2,
      },
      animationStyle: 'pop',
      activeWordScale: 1.10,
    },
    pacing: {
      cutFrequencySeconds: 1.8,
      zoomFrequencySeconds: 3.0,
      brollCoveragePercent: 40,
      sfxDensityPer10Sec: 4.0,
    },
    audio: {
      musicStyle: 'comedy',
      musicDuckingDb: -12,
      sfxVolumeDb: -10,
      voicePriority: true,
    },
    visuals: {
      transitionStyle: 'quick_zoom',
      vfxStyle: 'reaction_punch',
      colorTreatment: 'creator_vibrant',
      visualIntensity: 'high',
    },
  },

  podcast: {
    id: 'podcast',
    name: 'Podcast Pro',
    tagline: 'Clean conversational typography, gentle pacing, voice-forward audio mix',
    captionStyle: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 600,
      fontSize: 23,
      lineSpacing: 1.35,
      uppercase: false,
      positionY: 82,
      primaryColor: '#F1F5F9',
      strokeColor: '#0F172A',
      strokeWidth: 2,
      shadowColor: 'rgba(0, 0, 0, 0.6)',
      shadowBlur: 10,
      highlightColors: { primary: '#38BDF8', secondary: '#F59E0B', accent: '#A855F7' },
      highlightRules: {
        numbersAndMoney: true,
        namesAndEntities: true,
        strongVerbs: false,
        hookWords: true,
        emotionWords: false,
        maxHighlightsPerPhrase: 1,
      },
      animationStyle: 'fade',
      activeWordScale: 1.04,
    },
    pacing: {
      cutFrequencySeconds: 5.0,
      zoomFrequencySeconds: 8.0,
      brollCoveragePercent: 18,
      sfxDensityPer10Sec: 1.2,
    },
    audio: {
      musicStyle: 'lofi',
      musicDuckingDb: -18,
      sfxVolumeDb: -18,
      voicePriority: true,
    },
    visuals: {
      transitionStyle: 'subtle_push',
      vfxStyle: 'camera_push',
      colorTreatment: 'natural_pro',
      visualIntensity: 'subtle',
    },
  },

  documentary: {
    id: 'documentary',
    name: 'Documentary',
    tagline: 'Authoritative storytelling with elegant lower-thirds, slow pushes, and ambient cues',
    captionStyle: {
      fontFamily: 'Manrope, Inter, sans-serif',
      fontWeight: 600,
      fontSize: 24,
      lineSpacing: 1.3,
      uppercase: false,
      positionY: 80,
      primaryColor: '#E2E8F0',
      strokeColor: '#020617',
      strokeWidth: 2.2,
      shadowColor: 'rgba(0, 0, 0, 0.8)',
      shadowBlur: 14,
      highlightColors: { primary: '#E2E8F0', secondary: '#CBD5E1', accent: '#94A3B8' },
      highlightRules: {
        numbersAndMoney: true,
        namesAndEntities: true,
        strongVerbs: false,
        hookWords: false,
        emotionWords: false,
        maxHighlightsPerPhrase: 1,
      },
      animationStyle: 'fade',
      activeWordScale: 1.03,
    },
    pacing: {
      cutFrequencySeconds: 4.5,
      zoomFrequencySeconds: 7.0,
      brollCoveragePercent: 35,
      sfxDensityPer10Sec: 1.5,
    },
    audio: {
      musicStyle: 'ambient',
      musicDuckingDb: -16,
      sfxVolumeDb: -16,
      voicePriority: true,
    },
    visuals: {
      transitionStyle: 'subtle_push',
      vfxStyle: 'camera_push',
      colorTreatment: 'cinematic_red',
      visualIntensity: 'medium',
    },
  },

  educational: {
    id: 'educational',
    name: 'Educational Pro',
    tagline: 'High readability, structured line breaks, and clear concept diagrams',
    captionStyle: {
      fontFamily: 'Poppins, sans-serif',
      fontWeight: 700,
      fontSize: 26,
      lineSpacing: 1.3,
      uppercase: false,
      positionY: 78,
      primaryColor: '#FFFFFF',
      strokeColor: '#0F172A',
      strokeWidth: 3,
      shadowColor: 'rgba(0, 0, 0, 0.7)',
      shadowBlur: 10,
      highlightColors: { primary: '#38BDF8', secondary: '#FACC15', accent: '#4ADE80' },
      highlightRules: {
        numbersAndMoney: true,
        namesAndEntities: true,
        strongVerbs: true,
        hookWords: true,
        emotionWords: false,
        maxHighlightsPerPhrase: 1,
      },
      animationStyle: 'subtle_scale',
      activeWordScale: 1.06,
    },
    pacing: {
      cutFrequencySeconds: 3.5,
      zoomFrequencySeconds: 5.5,
      brollCoveragePercent: 30,
      sfxDensityPer10Sec: 2.0,
    },
    audio: {
      musicStyle: 'upbeat_creator',
      musicDuckingDb: -15,
      sfxVolumeDb: -15,
      voicePriority: true,
    },
    visuals: {
      transitionStyle: 'hard_cut',
      vfxStyle: 'micro_zoom',
      colorTreatment: 'natural_pro',
      visualIntensity: 'medium',
    },
  },

  news: {
    id: 'news',
    name: 'News & Media',
    tagline: 'Formal broadcast typography, authoritative lower banners, crisp audio cues',
    captionStyle: {
      fontFamily: 'Roboto, Arial, sans-serif',
      fontWeight: 800,
      fontSize: 25,
      lineSpacing: 1.25,
      uppercase: true,
      positionY: 82,
      primaryColor: '#FFFFFF',
      strokeColor: '#1E293B',
      strokeWidth: 3,
      shadowColor: 'rgba(0, 0, 0, 0.7)',
      shadowBlur: 8,
      highlightColors: { primary: '#EF4444', secondary: '#EAB308', accent: '#3B82F6' },
      highlightRules: {
        numbersAndMoney: true,
        namesAndEntities: true,
        strongVerbs: false,
        hookWords: true,
        emotionWords: false,
        maxHighlightsPerPhrase: 1,
      },
      animationStyle: 'fade',
      activeWordScale: 1.04,
    },
    pacing: {
      cutFrequencySeconds: 3.2,
      zoomFrequencySeconds: 6.0,
      brollCoveragePercent: 32,
      sfxDensityPer10Sec: 2.0,
    },
    audio: {
      musicStyle: 'dramatic',
      musicDuckingDb: -14,
      sfxVolumeDb: -14,
      voicePriority: true,
    },
    visuals: {
      transitionStyle: 'hard_cut',
      vfxStyle: 'camera_push',
      colorTreatment: 'natural_pro',
      visualIntensity: 'medium',
    },
  },

  gaming: {
    id: 'gaming',
    name: 'Gaming',
    tagline: 'Neon typography, intense camera shakes, impact hits, and high-frequency SFX',
    captionStyle: {
      fontFamily: 'Montserrat, sans-serif',
      fontWeight: 900,
      fontSize: 28,
      lineSpacing: 1.2,
      uppercase: true,
      positionY: 74,
      primaryColor: '#F8FAFC',
      strokeColor: '#000000',
      strokeWidth: 4,
      shadowColor: 'rgba(236, 72, 153, 0.6)',
      shadowBlur: 14,
      highlightColors: { primary: '#EC4899', secondary: '#8B5CF6', accent: '#06B6D4' },
      highlightRules: {
        numbersAndMoney: true,
        namesAndEntities: true,
        strongVerbs: true,
        hookWords: true,
        emotionWords: true,
        maxHighlightsPerPhrase: 2,
      },
      animationStyle: 'pop',
      activeWordScale: 1.10,
    },
    pacing: {
      cutFrequencySeconds: 1.9,
      zoomFrequencySeconds: 3.2,
      brollCoveragePercent: 38,
      sfxDensityPer10Sec: 3.8,
    },
    audio: {
      musicStyle: 'upbeat_creator',
      musicDuckingDb: -12,
      sfxVolumeDb: -10,
      voicePriority: true,
    },
    visuals: {
      transitionStyle: 'quick_zoom',
      vfxStyle: 'punch_in',
      colorTreatment: 'creator_vibrant',
      visualIntensity: 'high',
    },
  },

  comedy: {
    id: 'comedy',
    name: 'Comedy Clips',
    tagline: 'Playful punchlines, reaction pans, sound stingers, and punch zooms',
    captionStyle: {
      fontFamily: 'Poppins, Arial, sans-serif',
      fontWeight: 800,
      fontSize: 27,
      lineSpacing: 1.25,
      uppercase: false,
      positionY: 76,
      primaryColor: '#FFFFFF',
      strokeColor: '#18181B',
      strokeWidth: 3.5,
      shadowColor: 'rgba(0, 0, 0, 0.8)',
      shadowBlur: 10,
      highlightColors: { primary: '#FACC15', secondary: '#F97316', accent: '#22C55E' },
      highlightRules: {
        numbersAndMoney: true,
        namesAndEntities: true,
        strongVerbs: true,
        hookWords: true,
        emotionWords: true,
        maxHighlightsPerPhrase: 2,
      },
      animationStyle: 'pop',
      activeWordScale: 1.09,
    },
    pacing: {
      cutFrequencySeconds: 2.4,
      zoomFrequencySeconds: 3.8,
      brollCoveragePercent: 28,
      sfxDensityPer10Sec: 3.2,
    },
    audio: {
      musicStyle: 'comedy',
      musicDuckingDb: -13,
      sfxVolumeDb: -12,
      voicePriority: true,
    },
    visuals: {
      transitionStyle: 'quick_zoom',
      vfxStyle: 'reaction_punch',
      colorTreatment: 'creator_vibrant',
      visualIntensity: 'high',
    },
  },

  storytelling: {
    id: 'storytelling',
    name: 'Storytelling',
    tagline: 'Emotional narrative cadence, dramatic tension swells, and cinematic warmth',
    captionStyle: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 700,
      fontSize: 25,
      lineSpacing: 1.3,
      uppercase: false,
      positionY: 78,
      primaryColor: '#F8FAFC',
      strokeColor: '#090A0F',
      strokeWidth: 2.8,
      shadowColor: 'rgba(0, 0, 0, 0.85)',
      shadowBlur: 12,
      highlightColors: { primary: '#F97316', secondary: '#EF4444', accent: '#FBBF24' },
      highlightRules: {
        numbersAndMoney: true,
        namesAndEntities: true,
        strongVerbs: false,
        hookWords: true,
        emotionWords: true,
        maxHighlightsPerPhrase: 1,
      },
      animationStyle: 'subtle_scale',
      activeWordScale: 1.06,
    },
    pacing: {
      cutFrequencySeconds: 3.6,
      zoomFrequencySeconds: 5.8,
      brollCoveragePercent: 32,
      sfxDensityPer10Sec: 2.0,
    },
    audio: {
      musicStyle: 'dramatic',
      musicDuckingDb: -15,
      sfxVolumeDb: -15,
      voicePriority: true,
    },
    visuals: {
      transitionStyle: 'subtle_push',
      vfxStyle: 'camera_push',
      colorTreatment: 'cinematic_red',
      visualIntensity: 'medium',
    },
  },

  luxury: {
    id: 'luxury',
    name: 'Luxury & Lifestyle',
    tagline: 'Understated elegant typography, restrained palette, smooth 60fps moves',
    captionStyle: {
      fontFamily: 'Manrope, Inter, sans-serif',
      fontWeight: 500,
      fontSize: 23,
      lineSpacing: 1.4,
      uppercase: true,
      positionY: 82,
      primaryColor: '#F1F5F9',
      strokeColor: '#0A0A0A',
      strokeWidth: 1.5,
      shadowColor: 'rgba(0, 0, 0, 0.5)',
      shadowBlur: 8,
      highlightColors: { primary: '#D4AF37', secondary: '#CBD5E1', accent: '#E2E8F0' },
      highlightRules: {
        numbersAndMoney: true,
        namesAndEntities: false,
        strongVerbs: false,
        hookWords: false,
        emotionWords: false,
        maxHighlightsPerPhrase: 1,
      },
      animationStyle: 'fade',
      activeWordScale: 1.02,
    },
    pacing: {
      cutFrequencySeconds: 4.8,
      zoomFrequencySeconds: 8.0,
      brollCoveragePercent: 35,
      sfxDensityPer10Sec: 1.0,
    },
    audio: {
      musicStyle: 'ambient',
      musicDuckingDb: -18,
      sfxVolumeDb: -20,
      voicePriority: true,
    },
    visuals: {
      transitionStyle: 'subtle_push',
      vfxStyle: 'camera_push',
      colorTreatment: 'natural_pro',
      visualIntensity: 'subtle',
    },
  },

  minimal: {
    id: 'minimal',
    name: 'Minimal Clean',
    tagline: 'Zero distraction, ultra-clean sans typography, whisper-quiet sound mix',
    captionStyle: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 600,
      fontSize: 22,
      lineSpacing: 1.3,
      uppercase: false,
      positionY: 82,
      primaryColor: '#E2E8F0',
      strokeColor: 'transparent',
      strokeWidth: 0,
      shadowColor: 'rgba(0, 0, 0, 0.65)',
      shadowBlur: 8,
      highlightColors: { primary: '#FFFFFF', secondary: '#CBD5E1', accent: '#94A3B8' },
      highlightRules: {
        numbersAndMoney: false,
        namesAndEntities: false,
        strongVerbs: false,
        hookWords: false,
        emotionWords: false,
        maxHighlightsPerPhrase: 0,
      },
      animationStyle: 'fade',
      activeWordScale: 1.02,
    },
    pacing: {
      cutFrequencySeconds: 6.0,
      zoomFrequencySeconds: 10.0,
      brollCoveragePercent: 15,
      sfxDensityPer10Sec: 0.8,
    },
    audio: {
      musicStyle: 'lofi',
      musicDuckingDb: -20,
      sfxVolumeDb: -22,
      voicePriority: true,
    },
    visuals: {
      transitionStyle: 'smooth_fade',
      vfxStyle: 'camera_push',
      colorTreatment: 'natural_pro',
      visualIntensity: 'subtle',
    },
  },

  high_energy: {
    id: 'high_energy',
    name: 'High Energy Blitz',
    tagline: '1.5-second visual beat switches, bold colors, punchy whooshes and bass drops',
    captionStyle: {
      fontFamily: 'Montserrat, sans-serif',
      fontWeight: 900,
      fontSize: 29,
      lineSpacing: 1.2,
      uppercase: true,
      positionY: 74,
      primaryColor: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 4.5,
      shadowColor: 'rgba(0, 0, 0, 0.85)',
      shadowBlur: 10,
      highlightColors: { primary: '#FACC15', secondary: '#EF4444', accent: '#38BDF8' },
      highlightRules: {
        numbersAndMoney: true,
        namesAndEntities: true,
        strongVerbs: true,
        hookWords: true,
        emotionWords: true,
        maxHighlightsPerPhrase: 2,
      },
      animationStyle: 'pop',
      activeWordScale: 1.10,
    },
    pacing: {
      cutFrequencySeconds: 1.6,
      zoomFrequencySeconds: 2.8,
      brollCoveragePercent: 40,
      sfxDensityPer10Sec: 4.0,
    },
    audio: {
      musicStyle: 'upbeat_creator',
      musicDuckingDb: -12,
      sfxVolumeDb: -10,
      voicePriority: true,
    },
    visuals: {
      transitionStyle: 'hard_cut',
      vfxStyle: 'punch_in',
      colorTreatment: 'creator_vibrant',
      visualIntensity: 'high',
    },
  },

  dark_cinematic: {
    id: 'dark_cinematic',
    name: 'Dark Cinematic',
    tagline: 'Deep film shadows, warm orange accents, tension risers, and sub-bass thumps',
    captionStyle: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 700,
      fontSize: 25,
      lineSpacing: 1.3,
      uppercase: false,
      positionY: 78,
      primaryColor: '#F8FAFC',
      strokeColor: '#000000',
      strokeWidth: 3,
      shadowColor: 'rgba(0, 0, 0, 0.9)',
      shadowBlur: 15,
      highlightColors: { primary: '#F97316', secondary: '#EF4444', accent: '#EAB308' },
      highlightRules: {
        numbersAndMoney: true,
        namesAndEntities: true,
        strongVerbs: false,
        hookWords: true,
        emotionWords: true,
        maxHighlightsPerPhrase: 1,
      },
      animationStyle: 'subtle_scale',
      activeWordScale: 1.05,
    },
    pacing: {
      cutFrequencySeconds: 3.5,
      zoomFrequencySeconds: 5.5,
      brollCoveragePercent: 30,
      sfxDensityPer10Sec: 2.2,
    },
    audio: {
      musicStyle: 'cinematic',
      musicDuckingDb: -16,
      sfxVolumeDb: -14,
      voicePriority: true,
    },
    visuals: {
      transitionStyle: 'subtle_push',
      vfxStyle: 'punch_in',
      colorTreatment: 'cinematic_red',
      visualIntensity: 'medium',
    },
  },

  social_pro: {
    id: 'social_pro',
    name: 'Social Pro',
    tagline: 'Balanced, modern TikTok / Reels / Shorts layout with proven retention curve',
    captionStyle: {
      fontFamily: 'Poppins, Inter, sans-serif',
      fontWeight: 800,
      fontSize: 27,
      lineSpacing: 1.25,
      uppercase: true,
      positionY: 76,
      primaryColor: '#FFFFFF',
      strokeColor: '#0A0A0A',
      strokeWidth: 3.5,
      shadowColor: 'rgba(0, 0, 0, 0.75)',
      shadowBlur: 10,
      highlightColors: { primary: '#FACC15', secondary: '#38BDF8', accent: '#4ADE80' },
      highlightRules: {
        numbersAndMoney: true,
        namesAndEntities: true,
        strongVerbs: true,
        hookWords: true,
        emotionWords: true,
        maxHighlightsPerPhrase: 1,
      },
      animationStyle: 'subtle_scale',
      activeWordScale: 1.07,
    },
    pacing: {
      cutFrequencySeconds: 2.6,
      zoomFrequencySeconds: 4.2,
      brollCoveragePercent: 32,
      sfxDensityPer10Sec: 2.8,
    },
    audio: {
      musicStyle: 'upbeat_creator',
      musicDuckingDb: -14,
      sfxVolumeDb: -14,
      voicePriority: true,
    },
    visuals: {
      transitionStyle: 'hard_cut',
      vfxStyle: 'punch_in',
      colorTreatment: 'creator_vibrant',
      visualIntensity: 'high',
    },
  },
};

/**
 * Returns the ReferenceStyleProfile for a given CreatorStyleId (defaults to reference_mix)
 */
export function getCreatorStyleProfile(styleId: CreatorStyleId = 'reference_mix'): ReferenceStyleProfile {
  return CREATOR_STYLES_REGISTRY[styleId] || CREATOR_STYLES_REGISTRY.reference_mix;
}

export interface MediaAnalysisContext {
  transcriptText?: string;
  wordsPerMinute?: number;
  durationSeconds?: number;
  detectedEmotion?: string;
  hasNumbersOrMoney?: boolean;
  topicCategory?: string;
  speakerCount?: number;
}

/**
 * AI Director Style Recommender:
 * Analyzes speech dynamics, vocabulary, topic, and pacing to choose the optimal style.
 */
export function recommendCreatorStyle(ctx: MediaAnalysisContext): {
  recommendedStyle: CreatorStyleId;
  confidence: number;
  reason: string;
} {
  const text = (ctx.transcriptText || '').toLowerCase();
  const wpm = ctx.wordsPerMinute || 150;

  // 1. High Energy / Viral detection
  if (wpm > 185 || text.includes('insane') || text.includes('secret') || text.includes('shocking')) {
    return {
      recommendedStyle: 'viral_creator',
      confidence: 0.92,
      reason: `High speaking pace (${wpm} WPM) and high-energy hook vocabulary detected. Viral Creator style with punch zooms recommended for maximum viewer retention.`,
    };
  }

  // 2. Meme / Comedy detection
  if (text.includes('funny') || text.includes('joke') || text.includes('lol') || ctx.detectedEmotion === 'humorous') {
    return {
      recommendedStyle: 'comedy',
      confidence: 0.88,
      reason: 'Humorous pacing and comedy phrasing detected. Comedy Clips style with playful punches recommended.',
    };
  }

  // 3. Educational / How-to
  if (text.includes('how to') || text.includes('tutorial') || text.includes('step 1') || text.includes('learn') || text.includes('explained')) {
    return {
      recommendedStyle: 'educational',
      confidence: 0.90,
      reason: 'Structured instructional speech detected. Educational Pro with high-readability phrasing and concept clarity recommended.',
    };
  }

  // 4. Documentary / Storytelling / Deep narrative
  if (text.includes('history') || text.includes('the story of') || text.includes('investigation') || wpm < 130) {
    return {
      recommendedStyle: 'cinematic',
      confidence: 0.89,
      reason: 'Measured narrative cadence and storytelling depth detected. Cinematic Social with film contrast and warm emphasis recommended.',
    };
  }

  // 5. Podcast / Interview
  if ((ctx.speakerCount && ctx.speakerCount > 1) || text.includes('welcome back to the podcast') || text.includes('episode')) {
    return {
      recommendedStyle: 'podcast',
      confidence: 0.91,
      reason: 'Conversational dialogue detected. Podcast Pro with clean subtitles and voice-forward mixing recommended.',
    };
  }

  // Default: REFERENCE MIX (Recommended Default)
  return {
    recommendedStyle: 'reference_mix',
    confidence: 0.95,
    reason: 'Standard social creator content detected. Reference Mix recommended (blends Reference 1 viral energy with Reference 2 cinematic typography and red color grading).',
  };
}
