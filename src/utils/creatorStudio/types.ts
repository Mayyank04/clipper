/**
 * VIRALCLIP STUDIO — PRO CREATOR EDITING SYSTEM
 * Core Type Definitions & Architectural Interfaces
 */

export type CreatorStyleId =
  | 'reference_mix' // Recommended Default: Ref 1 Energy + Ref 2 Cinematic Typography
  | 'viral_creator' // Reference 1: High Energy, Punch Zooms, Fast Cuts
  | 'cinematic'     // Reference 2: Cinematic Social, Semantic Emphasis, Film Contrast
  | 'meme'          // High-density SFX, Fast zooms, reaction cards
  | 'podcast'       // Clean subtle captions, low B-roll, voice-forward
  | 'documentary'   // Sophisticated lower-thirds, slow pushes, ambient soundscapes
  | 'educational'   // Structured phrase breaks, concept diagrams, clean contrast
  | 'news'          // Broadcast lower thirds, ticker punch, formal tone
  | 'gaming'        // High-octane kinetic text, impact hits, particle flashes
  | 'comedy'        // Comedic timing punches, sound stingers, reaction pans
  | 'storytelling'  // Emotional pacing, warm lighting, tension risers
  | 'luxury'        // Elegant serif/sans, muted tones, smooth 60fps pushes
  | 'minimal'       // Understated monochrome, micro-animations, quiet audio
  | 'high_energy'   // Rapid 1.5s visual beat switches, bold colors, whooshes
  | 'dark_cinematic'// Crushed blacks, neon accents, sub-bass rumbles
  | 'social_pro';   // Balanced TikTok/Reels optimized defaults

export type ColorTreatmentId = 'cinematic_red' | 'creator_vibrant' | 'natural_pro' | 'clean_monochrome' | 'warm_vintage';

export interface ReferenceStyleProfile {
  id: CreatorStyleId;
  name: string;
  tagline: string;
  isRecommendedDefault?: boolean;
  captionStyle: {
    fontFamily: string;
    fontWeight: number | string;
    fontSize: number;
    lineSpacing: number;
    uppercase: boolean;
    positionY: number; // 0-100%
    primaryColor: string;
    secondaryColor?: string;
    strokeColor: string;
    strokeWidth: number;
    shadowColor: string;
    shadowBlur: number;
    highlightColors: {
      primary: string;   // e.g. Electric Yellow #FACC15 or Intense Red #EF4444
      secondary: string; // e.g. Lime #4ADE80 or Warm Orange #F97316
      accent: string;    // e.g. Sky Blue #38BDF8
    };
    highlightRules: {
      numbersAndMoney: boolean;
      namesAndEntities: boolean;
      strongVerbs: boolean;
      hookWords: boolean;
      emotionWords: boolean;
      maxHighlightsPerPhrase: number;
    };
    animationStyle: 'subtle_scale' | 'pop' | 'fade' | 'karaoke' | 'kinetic_reveal';
    activeWordScale: number; // 1.05 - 1.10
  };
  pacing: {
    cutFrequencySeconds: number; // e.g. 2.5s
    zoomFrequencySeconds: number;
    brollCoveragePercent: number; // 20 - 40%
    sfxDensityPer10Sec: number; // 1 - 4
  };
  audio: {
    musicStyle: 'cinematic' | 'upbeat_creator' | 'lofi' | 'dramatic' | 'ambient' | 'comedy';
    musicDuckingDb: number; // e.g. -14dB
    sfxVolumeDb: number;    // e.g. -14dB
    voicePriority: boolean;
  };
  visuals: {
    transitionStyle: 'hard_cut' | 'quick_zoom' | 'subtle_push' | 'smooth_fade';
    vfxStyle: 'punch_in' | 'micro_zoom' | 'camera_push' | 'reaction_punch' | 'speed_ramp';
    colorTreatment: ColorTreatmentId;
    visualIntensity: 'high' | 'medium' | 'subtle';
  };
}

export interface EmphasisDecision {
  wordId: string;
  wordIndex: number;
  text: string;
  reason: 'number' | 'currency' | 'hook' | 'emotion' | 'name' | 'strong_verb' | 'cta' | 'technical';
  confidence: number;
  color: string;
}

export type SFXCategory =
  | 'whoosh'
  | 'impact'
  | 'hit'
  | 'riser'
  | 'drop'
  | 'pop'
  | 'click'
  | 'notification'
  | 'glitch'
  | 'bass_hit'
  | 'transition'
  | 'reveal'
  | 'record_scratch'
  | 'camera'
  | 'flash'
  | 'swipe'
  | 'typing'
  | 'heartbeat'
  | 'crowd'
  | 'laugh'
  | 'applause'
  | 'suspense'
  | 'comedy'
  | 'cinematic'
  | 'magic'
  | 'success'
  | 'failure'
  | 'alert';

export interface SoundDesignEvent {
  id: string;
  track: 'VOICE' | 'ORIGINAL' | 'MUSIC' | 'SFX' | 'AMBIENCE';
  category?: SFXCategory;
  assetPath: string;
  assetName: string;
  startTime: number;
  duration: number;
  volume: number; // 0.0 - 1.0
  duckingDb?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
  reason: string;
  confidence: number;
}

export interface SoundDesignTimeline {
  tracks: {
    voice: SoundDesignEvent[];
    original: SoundDesignEvent[];
    music: SoundDesignEvent[];
    sfx: SoundDesignEvent[];
    ambience: SoundDesignEvent[];
  };
  masterVolume: number;
  speechDuckingActive: boolean;
}

export interface ImageOverlayEvent {
  id: string;
  type: 'image_overlay' | 'meme_insert' | 'diagram' | 'reaction_icon';
  imageUrl: string;
  startTime: number;
  duration: number;
  position: 'center' | 'top_right' | 'lower_third' | 'pip_card';
  scale: number; // 0.5 - 1.2
  animation: 'pop_in' | 'slide_up' | 'fade';
  reason: string;
  confidence: number;
}

export interface ColorGradingProfile {
  id: ColorTreatmentId;
  name: string;
  description: string;
  contrast: number;    // 0.8 - 1.3 (1.0 default)
  saturation: number;  // 0.8 - 1.4 (1.0 default)
  brightness: number;  // -0.1 - +0.1 (0.0 default)
  gamma: number;       // 0.8 - 1.2 (1.0 default)
  temperatureK?: number; // e.g. 5600K or 6500K
  highlightsTint?: string; // hex or rgb
  shadowsTint?: string;
  ffmpegFilter: string;
  cssFilter: string;
}

export interface EditBeat {
  id: string;
  startTime: number;
  endTime: number;
  captionStyle: string;
  emphasisWords: EmphasisDecision[];
  broll?: {
    id: string;
    concept: string;
    query: string;
    assetUrl: string;
    provider: 'pixabay' | 'pinterest' | 'verified_catalog';
    isPIP?: boolean;
    transition: 'hard_cut' | 'quick_zoom' | 'subtle_push' | 'fade';
    attribution?: string;
  };
  sfx?: {
    id: string;
    name: string;
    category: SFXCategory;
    assetUrl: string;
    volume: number;
    reason: string;
  };
  vfx?: {
    type: 'punch_in' | 'micro_zoom' | 'reaction_punch' | 'speed_ramp' | 'flash' | 'none';
    intensity: number; // 1.0 - 1.15
    durationMs: number;
  };
  camera?: {
    framing: 'center' | 'speaker_tight' | 'wide' | 'push_in';
    zoom: number; // 1.0 - 1.08
  };
  imageOverlay?: ImageOverlayEvent;
  reason: string;
  confidence: number;
}

export interface AIEditPlanItem {
  id: string;
  category: 'captions' | 'broll' | 'sfx' | 'vfx' | 'pacing' | 'color' | 'audio_ducking';
  title: string;
  description: string;
  timestamp: number;
  duration?: number;
  impact: 'high' | 'medium' | 'subtle';
  selected: boolean;
  editBeat?: Partial<EditBeat>;
}

export interface AIEditPlan {
  projectId: string;
  recommendedStyle: CreatorStyleId;
  summary: string;
  estimatedQualityBoost: string;
  items: AIEditPlanItem[];
  generatedAt: number;
}

export interface AssetProvenance {
  id: string;
  source: 'pixabay' | 'pinterest' | 'verified_offline';
  providerName: string;
  license: string;
  url: string;
  assetType?: 'video' | 'image';
  author?: string;
  downloadedAt: number;
  hash: string;
  duration: number;
  resolution: { width: number; height: number };
  attributionRequired: boolean;
  attributionText: string;
}
