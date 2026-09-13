/**
 * VIRALCLIP STUDIO — REFERENCE STYLE ANALYZER
 * Analyzes reference editing styles, extracts their editorial language,
 * and builds reusable style profiles for Viral Bold, Cinematic Emphasis, and Reference Mix.
 */

import { ReferenceStyleProfile } from './types';

/**
 * REFERENCE STYLE A: VIRAL BOLD (High Energy Viral Creator)
 * Characteristics:
 * - UPPERCASE, large, heavy weight (800+)
 * - White primary text, strong dark outline (3-4px), soft drop shadow
 * - Lower-center/center placement (positionY: 76%)
 * - Selective word coloring (Electric Yellow #FACC15 / Bright Lime #4ADE80)
 * - Rapid visual pacing (cuts every 2.5s, punch zooms 1.08x on emotion peaks)
 * - Whoosh transitions on visual switches, impacts on punch words
 */
export const REFERENCE_STYLE_A: ReferenceStyleProfile = {
  id: 'viral_creator',
  name: 'Viral Creator (Reference A)',
  tagline: 'High-impact uppercase captions, rapid cuts, punch zooms, and snappy sound design',
  captionStyle: {
    fontFamily: 'Montserrat, Inter, system-ui, sans-serif',
    fontWeight: 900,
    fontSize: 28,
    lineSpacing: 1.25,
    uppercase: true,
    positionY: 76,
    primaryColor: '#FFFFFF',
    secondaryColor: '#E2E8F0',
    strokeColor: '#000000',
    strokeWidth: 4,
    shadowColor: 'rgba(0, 0, 0, 0.75)',
    shadowBlur: 10,
    highlightColors: {
      primary: '#FACC15',   // Electric Yellow
      secondary: '#4ADE80', // Bright Lime
      accent: '#38BDF8',    // Cyan Sky
    },
    highlightRules: {
      numbersAndMoney: true,
      namesAndEntities: true,
      strongVerbs: true,
      hookWords: true,
      emotionWords: true,
      maxHighlightsPerPhrase: 1, // Selective: never color every word!
    },
    animationStyle: 'pop',
    activeWordScale: 1.08, // Subtle 8% scale on active spoken word
  },
  pacing: {
    cutFrequencySeconds: 2.5,
    zoomFrequencySeconds: 4.0,
    brollCoveragePercent: 35,
    sfxDensityPer10Sec: 3.5,
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
};

/**
 * REFERENCE STYLE B: CINEMATIC EMPHASIS (Cinematic Social)
 * Characteristics:
 * - Clean cinematic typography (Inter, Manrope)
 * - White base with semantic red/orange/amber emphasis (#EF4444, #F97316)
 * - Subtle camera pushes (1.00x -> 1.04x) and deliberate documentary cuts
 * - Rich film contrast / Cinematic Red color treatment
 * - Tension risers, deep bass hits, and subtle atmosphere
 */
export const REFERENCE_STYLE_B: ReferenceStyleProfile = {
  id: 'cinematic',
  name: 'Cinematic Social (Reference B)',
  tagline: 'Refined typography, semantic warm red/orange emphasis, film color grading, and dramatic sound design',
  captionStyle: {
    fontFamily: 'Inter, Manrope, system-ui, sans-serif',
    fontWeight: 700,
    fontSize: 25,
    lineSpacing: 1.3,
    uppercase: false, // Mixed case or clean caps for cinematic maturity
    positionY: 78,
    primaryColor: '#F8FAFC',
    secondaryColor: '#CBD5E1',
    strokeColor: '#090A0F',
    strokeWidth: 2.5,
    shadowColor: 'rgba(0, 0, 0, 0.85)',
    shadowBlur: 14,
    highlightColors: {
      primary: '#EF4444',   // Cinematic Red
      secondary: '#F97316', // Vibrant Orange
      accent: '#FBBF24',    // Warm Amber
    },
    highlightRules: {
      numbersAndMoney: true,
      namesAndEntities: true,
      strongVerbs: false,
      hookWords: true,
      emotionWords: true,
      maxHighlightsPerPhrase: 1, // Only key semantic concepts
    },
    animationStyle: 'subtle_scale',
    activeWordScale: 1.05, // Restrained 5% scale
  },
  pacing: {
    cutFrequencySeconds: 3.8,
    zoomFrequencySeconds: 6.0,
    brollCoveragePercent: 28,
    sfxDensityPer10Sec: 1.8,
  },
  audio: {
    musicStyle: 'cinematic',
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
};

/**
 * REFERENCE MIX (Recommended Default)
 * Synthesizes Reference 1 Energy & Responsiveness with Reference 2 Cinematic Typography & Grading.
 */
export const REFERENCE_MIX: ReferenceStyleProfile = {
  id: 'reference_mix',
  name: 'Reference Mix (Recommended Default)',
  tagline: 'The ultimate creator blend: Ref 1 viral energy and punch zooms + Ref 2 cinematic typography and red color grade',
  isRecommendedDefault: true,
  captionStyle: {
    fontFamily: 'Poppins, Inter, system-ui, sans-serif',
    fontWeight: 800,
    fontSize: 27,
    lineSpacing: 1.25,
    uppercase: true,
    positionY: 77,
    primaryColor: '#FFFFFF',
    secondaryColor: '#E2E8F0',
    strokeColor: '#0A0A0A',
    strokeWidth: 3.5,
    shadowColor: 'rgba(0, 0, 0, 0.8)',
    shadowBlur: 12,
    highlightColors: {
      primary: '#FACC15',   // High-energy yellow
      secondary: '#EF4444', // Cinematic red
      accent: '#38BDF8',    // Cyan
    },
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
    cutFrequencySeconds: 2.8,
    zoomFrequencySeconds: 4.5,
    brollCoveragePercent: 32,
    sfxDensityPer10Sec: 2.6,
  },
  audio: {
    musicStyle: 'cinematic',
    musicDuckingDb: -15,
    sfxVolumeDb: -15,
    voicePriority: true,
  },
  visuals: {
    transitionStyle: 'hard_cut',
    vfxStyle: 'punch_in',
    colorTreatment: 'cinematic_red',
    visualIntensity: 'high',
  },
};
