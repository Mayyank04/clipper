export type AspectRatio = '9:16' | '1:1' | '16:9' | '4:5';

export type ProjectType = 'video-editor' | 'audio-to-video';

export type TypingStyleId =
  | 'minimal_type'
  | 'karaoke'
  | 'word_pop'
  | 'typewriter'
  | 'neon_lyrics'
  | 'cinematic_lyrics'
  | 'glowing_words'
  | 'bold_center'
  | 'lower_third'
  | 'dynamic_highlight'
  | 'retro_terminal'
  | 'clean_white'
  | 'music_video'
  | 'emotional'
  | 'beat_sync';

export type VisualizerStyle = 'waveform' | 'bars' | 'circle' | 'spectrum' | 'pulse' | 'line' | 'none';

export type BackgroundType =
  | 'gradient'
  | 'animated_gradient'
  | 'blurred_image'
  | 'ai_generated'
  | 'image'
  | 'video'
  | 'particles'
  | 'abstract_motion'
  | 'solid'
  | 'dynamic_waveform';

export interface AudioToVideoConfig {
  typingStyle: TypingStyleId;
  typingMode: 'word_by_word' | 'char_by_char' | 'karaoke' | 'phrase' | 'sentence';
  typingSpeed: number; // 1-10 speed scale
  revealDuration: number; // seconds to type full phrase
  holdDuration: number; // seconds word remains highlighted
  captionPosition: 'center' | 'upper_center' | 'lower_center' | 'top' | 'bottom';
  captionPositionX: number; // 0-100% horizontal
  captionPositionY: number; // 0-100% vertical
  karaokeHighlightStyle: 'color' | 'scale' | 'glow' | 'underline' | 'pill' | 'gradient' | 'bounce';
  visualizerStyle: VisualizerStyle;
  visualizerOpacity: number; // 0-1
  visualizerPosition: 'bottom' | 'middle' | 'top' | 'center' | 'behind_caption';
  visualizerHeight: number; // in px
  visualizerSensitivity: number; // 0.5 - 2.0
  backgroundType: BackgroundType;
  backgroundUrl?: string;
  backgroundColor?: string;
  backgroundGradient?: [string, string, string?];
  backgroundBlur?: number;
  beatSyncMotion: boolean;
  beatEnergy?: number;
  detectedMood?: string;
  template?: string;
  audioUrl?: string;
}

export type CaptionStyleId =
  | 'clean'
  | 'minimal'
  | 'bold'
  | 'viral'
  | 'tiktok'
  | 'youtube'
  | 'podcast'
  | 'karaoke'
  | 'word_highlight'
  | 'pop'
  | 'bounce'
  | 'typewriter'
  | 'neon'
  | 'glitch'
  | 'cinematic'
  | 'news'
  | 'documentary'
  | 'gaming'
  | 'mrbeast'
  | 'creator'
  | 'elegant'
  | 'comic'
  | 'highlight_box'
  | 'gradient'
  | 'dynamic'
  | 'modern'
  | 'retro'
  | 'luxury'
  | 'energetic'
  | 'minimal_dark'
  | 'minimal_light'
  | 'big_word'
  | 'center_stage'
  | 'subtle'
  | 'high_contrast'
  // Production Reference Presets (Part 6):
  | 'reference_mix'
  | 'REFERENCE_MIX'
  | 'reference_typing'
  | 'REFERENCE_TYPING'
  | 'viral_bold'
  | 'VIRAL_BOLD'
  | 'cinematic_social'
  | 'CINEMATIC_SOCIAL'
  | 'creator_punch'
  | 'CREATOR_PUNCH'
  | 'meme_impact'
  | 'MEME_IMPACT'
  | 'podcast_pro'
  | 'PODCAST_PRO'
  | 'storytelling'
  | 'STORYTELLING'
  | 'dark_cinematic'
  | 'DARK_CINEMATIC'
  | 'clean_social'
  | 'CLEAN_SOCIAL'
  | 'news_pro'
  | 'NEWS_PRO'
  // Backward compatibility aliases:
  | 'hormozi'
  | 'kinetic'
  | 'clean_subtitle'
  | 'dynamic_ai'
  | 'highlight'
  | 'professional'
  | 'educational'
  | 'EDUCATIONAL'
  | 'comedy'
  | 'COMEDY'
  | 'beast_mode'
  | 'hormozi_stack'
  | 'ali_abdaal'
  | 'iman_gadzi'
  | 'punchline_pop'
  | 'standup_snappy'
  | 'quiet_luxury'
  | 'documentary_sub'
  | 'true_crime'
  | 'brainrot_turbo'
  | 'karaoke_party'
  | 'neon_karaoke'
  | 'midnight_cyber'
  | 'tokyo_neon'
  | 'minimal_studio'
  | 'swiss_modern'
  | 'desi_creator_bold'
  | 'hinglish_hype'
  | 'devanagari_clarity'
  | 'gym_mindset'
  | 'titan_discipline'
  | (string & {});

export type CaptionStylePreset = CaptionStyleId;

export type CaptionCategory =
  | 'viral'
  | 'creator'
  | 'minimal'
  | 'podcast'
  | 'gaming'
  | 'cinematic'
  | 'news'
  | 'educational'
  | 'social'
  | 'music'
  | 'creative'
  | 'high_energy'
  | 'comedy'
  | 'luxury'
  | 'documentary'
  | 'meme'
  | 'karaoke'
  | 'storytelling'
  | 'dark'
  | 'neon'
  | 'clean'
  | 'indian_creator'
  | 'hinglish'
  | 'hindi'
  | 'motivational'
  | (string & {});

export type ApprovalMode = 'auto_apply' | 'balanced' | 'suggest_only';

export type EditingPersonality = 'clean' | 'creator' | 'viral' | 'cinematic';
export type EditingIntensity = 'subtle' | 'balanced' | 'dynamic' | 'viral';

export type HookCategory = 'curiosity' | 'bold' | 'question' | 'shock' | 'educational';

export type SFXCategory =
  | 'impact'
  | 'whoosh'
  | 'hit'
  | 'swoosh'
  | 'transition'
  | 'riser'
  | 'drop'
  | 'boom'
  | 'click'
  | 'pop'
  | 'digital'
  | 'glitch'
  | 'ui'
  | 'chime'
  | 'notification'
  | 'laugh'
  | 'reaction'
  | 'tension'
  | 'dramatic'
  | 'comedy'
  | 'meme'
  | 'sports'
  | 'gaming'
  | 'cinematic'
  | 'success'
  | 'failure'
  | 'alert'
  | 'camera'
  | 'typewriter'
  | 'mouse'
  | 'keyboard'
  | 'record_scratch'
  | 'heartbeat'
  | 'bass'
  | 'sub_drop'
  | 'air'
  | 'foley'
  | 'nature'
  | 'ambient'
  | 'human'
  | 'animal'
  | 'vehicle'
  | 'mechanical'
  | 'footsteps'
  | 'applause'
  | 'crowd'
  | 'music'
  | 'horror'
  | 'suspense'
  | 'magic'
  | 'rise'
  | 'reveal'
  | 'sci-fi'
  | (string & {});

export type SFXApprovalMode = 'auto_apply' | 'balanced' | 'suggest_only';

export interface SFXAsset {
  id: string;
  name: string;
  file: string;
  duration: number;
  category: SFXCategory;
  tags: string[];
  description: string;
  source: 'bundled' | 'user_imported' | 'google_drive' | 'ai_generated';
  license: 'User-owned' | 'User-provided' | 'Licensed' | 'Generated' | 'Unknown' | 'Royalty-free';
  hash: string;
  waveform?: number[];
  loudness?: number;
  format?: string;
  sampleRate?: number;
  channels?: number;
  isFavorite?: boolean;
  recentlyUsed?: boolean;
}

export interface GeneratedSFXItem {
  id: string;
  prompt: string;
  style?: string;
  intensity?: 'low' | 'medium' | 'high';
  duration: number;
  format: string;
  url: string;
  waveform?: number[];
  createdAt: string;
  provider: string;
  status: 'generating' | 'ready' | 'failed';
  error?: string;
}

export type VFXType =
  | 'zoom_punch'
  | 'shake'
  | 'glow'
  | 'motion_blur'
  | 'particles'
  | 'callout'
  | 'progress_bar'
  | 'emoji'
  | 'glitch'
  | 'subtle_zoom_in'
  | 'subtle_zoom_out'
  | 'punch_zoom'
  | 'micro_zoom'
  | 'dynamic_push'
  | 'dynamic_pull'
  | 'beat_zoom'
  | 'meme_zoom'
  | 'screen_shake'
  | 'micro_shake'
  | 'impact_shake'
  | 'handheld'
  | 'bass_punch'
  | 'camera_punch'
  | 'digital_glitch'
  | 'rgb_split'
  | 'chromatic_aberration'
  | 'scanlines'
  | 'pixel_glitch'
  | 'vhs'
  | 'film_burn'
  | 'bloom'
  | 'neon_glow'
  | 'edge_glow'
  | 'flash'
  | 'white_flash'
  | 'black_flash'
  | 'lens_flash'
  | 'directional_blur'
  | 'radial_blur'
  | 'focus_rack'
  | 'bokeh_blur'
  | 'tilt_shift'
  | 'vignette'
  | 'color_punch'
  | 'contrast_punch'
  | 'film_grain'
  | 'light_leak'
  | 'cinematic_fade'
  | 'dramatic_fade'
  | 'sharpen_punch'
  | 'spark_burst'
  | 'highlight_pulse'
  | 'shockwave'
  | 'speed_lines'
  | 'fire_aura'
  | 'whip_pan'
  | 'spin_transition'
  | 'bounce'
  | 'elastic_pop'
  | 'speed_ramp'
  | 'freeze_frame'
  | 'reaction_zoom'
  | 'gaming_hit'
  | 'critical_hit'
  | 'combo_flash'
  | 'achievement_pop'
  | 'podcast_speaker_focus'
  | 'podcast_warmth'
  | 'social_hook_pulse'
  | 'social_cta_glow'
  | (string & {});

export type MusicCategory =
  | 'cinematic'
  | 'motivational'
  | 'corporate'
  | 'lofi'
  | 'energetic'
  | 'dramatic'
  | 'funny'
  | 'podcast'
  | 'technology';

export type SocialPreset = 'shorts' | 'reels' | 'tiktok' | 'linkedin' | 'instagram_post';
export type VideoResolution = '1080x1920' | '2160x3840' | '1080x1080' | '1920x1080';
export type FrameRate = 30 | 60;

export interface ViralScoreBreakdown {
  hook: number;
  retention: number;
  emotion: number;
  value: number;
  pacing: number;
  shareability: number;
  clarity: number;
  contextCompleteness: number;
}

export interface ViralScore {
  overall: number;
  breakdown: ViralScoreBreakdown;
  summary: string;
}

export interface WordTiming {
  id?: string;
  word: string;
  text?: string; // compatibility alias
  start: number; // in seconds relative to short clip start
  end: number;
  confidence?: number;
  isHighlight?: boolean;
  highlightColor?: string;
  scale?: number;
  emphasis?: 'none' | 'strong' | 'hero' | 'marker' | 'underline' | string;
  emphasisCategory?: 'emotion' | 'action' | 'surprise' | 'names' | 'numbers' | 'strong' | 'keyword' | 'none';
}

// Canonical Caption Timing Pipeline Types (Part 2)
export interface CaptionWord extends WordTiming {
  id?: string;
  text?: string;
  word: string;
  start: number;
  end: number;
  confidence?: number;
  isHighlight?: boolean;
  highlightColor?: string;
  scale?: number;
  emphasisCategory?: 'emotion' | 'action' | 'surprise' | 'names' | 'numbers' | 'strong' | 'keyword' | 'none';
}

export type CaptionPosition = 'center' | 'top' | 'bottom' | 'upper_center' | 'lower_center';
export type CaptionAnimation = 'reference_mix' | 'scale_subtle' | 'pop' | 'fade' | 'typewriter' | 'none';

export type CaptionEvent = {
  id: string;
  start: number;
  end: number;
  words: CaptionWord[];
  text: string;
  emphasisWordIds: string[];
  styleId: string;
  position: CaptionPosition;
  animation: CaptionAnimation;
};

export type CaptionSegmentationMode = 'WORD' | 'LINE' | 'BEAT' | 'BLOCK' | 'AUTO';

export interface CaptionSegmentationOptions {
  mode?: CaptionSegmentationMode;
  wordsPerBeat?: number; // 2 | 3 | 4 | 5 | 6
  maxCharacters?: number; // 20 | 28 | 32 | 38 | 45
  readingSpeed?: 'slow' | 'balanced' | 'fast';
  sentenceAwareness?: boolean;
  punctuationAwareness?: boolean;
  pauseSensitivity?: 'low' | 'medium' | 'high';
  preserveHindiHinglish?: boolean;
}

export interface CaptionBeatWord extends WordTiming {
  id: string;
  word: string;
  start: number;
  end: number;
  confidence?: number;
  isEmphasis?: boolean;
  emphasisType?: 'number' | 'metric' | 'currency' | 'hook' | 'action' | 'name' | 'custom';
}

export interface CaptionBeat {
  id: string;
  start: number;
  end: number;
  text: string;
  words: CaptionBeatWord[];
  emphasisWords: string[];
  confidence: number;
  readingSpeed: number; // characters per second
  pauseBefore: number;
  pauseAfter: number;
  lineCount: number;
  semanticType: 'hook' | 'statement' | 'question' | 'punchline' | 'standard';
}

export interface CaptionSegment {
  id: string;
  text: string;
  start: number; // in seconds relative to short clip start
  end: number;
  speaker?: string;
  words: WordTiming[];
  language?: string;
  styleId?: string;
  position?: CaptionPosition;
  animation?: CaptionAnimation;
  displayStart?: number;
  displayEnd?: number;
  emphasisWords?: string[];
  confidence?: number;
  readingSpeed?: number;
  pauseBefore?: number;
  pauseAfter?: number;
  lineCount?: number;
  semanticType?: 'hook' | 'statement' | 'question' | 'punchline' | 'standard';
}

// Canonical Transcript Format (Section 2 & 5)
export type TranscriptWord = {
  id: string;
  text: string;
  word?: string; // compatibility alias
  start: number;
  end: number;
  confidence?: number;
  speaker?: string;
  language?: string;
  isHighlight?: boolean;
  highlightColor?: string;
  scale?: number;
};

export type TranscriptSegment = {
  id: string;
  start: number;
  end: number;
  text: string;
  words: TranscriptWord[];
  speaker?: string;
  language?: string;
  confidence?: number;
};

export interface DetectedLanguageBreakdown {
  language: string;
  percentage: number;
}

export type Transcript = {
  language: string;
  languageConfidence: number;
  detectedLanguages?: DetectedLanguageBreakdown[];
  isCodeSwitching?: boolean;
  duration: number;
  segments: TranscriptSegment[];
  words: TranscriptWord[];
  speechDuration?: number;
  speechCoverage?: number;
};

// Auto Script Story Structure (Section 14)
export type ScriptSectionType = 'hook' | 'context' | 'keypoint' | 'supporting' | 'payoff' | 'cta';

export interface ScriptSection {
  id: string;
  type: ScriptSectionType;
  title: string;
  text: string;
  start: number;
  end: number;
  keyTakeaway?: string;
}

export interface SFXMarker {
  id: string;
  timestamp: number; // relative to short clip start
  duration?: number;
  category: SFXCategory;
  soundName: string;
  volume: number; // 0 to 1
  reason?: string;
  triggerText?: string;
  confidence?: number;
  audioUrl?: string;
  assetId?: string;
  source?: 'library' | 'ai_generated' | 'user_imported';
  prompt?: string;
  fadeIn?: number;
  fadeOut?: number;
  duckingDb?: number;
}

export interface VFXMarker {
  id: string;
  timestamp: number; // relative to short clip start
  duration: number; // duration in seconds
  type: VFXType;
  label?: string;
  intensity?: number; // 1 to 10
  reason?: string;
  confidence?: number;
}

export interface BRollSuggestion {
  id: string;
  timestamp: number;
  duration: number;
  concept: string;
  imageUrl: string;
  videoUrl?: string;
  keyword?: string;
  enabled: boolean;
  reason?: string;
  triggerText?: string;
  confidence?: number;
  // Professional Semantic Engine metadata
  purpose?: BrollPurpose;
  shotType?: ShotType;
  topic?: string;
  searchQueries?: string[];
  semanticScore?: number;
  visualScore?: number;
  continuityScore?: number;
  crop?: CropPlan;
  source?: 'pexels' | 'pinterest' | 'uploaded';
  assetId?: string;
  assetUrl?: string;
  thumbnailUrl?: string;
  transcriptContext?: string;
  audioEnabled?: boolean;
  audioVolume?: number;
}

export interface HookOption {
  category: HookCategory;
  title: string;
  text: string;
}

export interface VideoClip {
  id: string;
  sourceUrl: string;
  sourceStart: number;
  sourceEnd: number;
  timelineStart: number;
  timelineEnd: number;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ShortCandidate {
  id: string;
  projectId?: string;
  title: string;
  description: string;
  hashtags: string[];
  keywords: string[];
  viralScore: ViralScore;
  duration: number; // seconds
  startTime: number; // in original video
  endTime: number;
  topic: string;
  thumbnail: string;
  videoProxyUrl?: string;
  aspectRatio?: AspectRatio;
  hookText: string;
  hookCategory: HookCategory;
  availableHooks?: HookOption[];
  hookOptions?: HookOption[];
  captions: CaptionSegment[];
  sfxMarkers: SFXMarker[];
  vfxMarkers: VFXMarker[];
  brollSuggestions: BRollSuggestion[];
  speakerPosition?: 'center' | 'left' | 'right' | 'auto_switch';
  cuts?: number[];
  videoClips?: VideoClip[];
  whySelected?: string[];
  audioUrl?: string;
  audioToVideoConfig?: AudioToVideoConfig;
  sourceMedia?: SourceMedia;
  sourceStart?: number;
  sourceEnd?: number;
  mediaUnavailable?: boolean;
  mediaFileName?: string;
  editPlan?: {
    hookAngle: string;
    narrativeArc: string;
    pacingStrategy: string;
    captionStyle: string;
    brollCount: number;
    sfxCount: number;
    vfxCount: number;
  };
  language?: string | LanguageDetectionResult;
  detectedLanguage?: string;
  projectAnalysis?: ProjectAnalysis;
  transcript?: string;
  canonicalTranscript?: Transcript;
  scriptSections?: ScriptSection[];
  detectedLanguages?: DetectedLanguageBreakdown[];
  speechCoverage?: number;
  renderPlan?: RenderPlan;
  voiceoverEvents?: VoiceoverEvent[];
  presenterEvents?: PresenterEvent[];
  dubEvents?: DubEvent[];
  provenanceList?: AssetProvenance[];
  captionCustomization?: CaptionCustomization;
  captionConfig?: CaptionCustomization;
  sfxTrack?: any[];
  vfxTrack?: any[];
  isBookmarked?: boolean;
  alternateTitles?: string[];
}

export interface AnalysisStats {
  durationFormatted: string;
  totalDurationSeconds: number;
  topicsDetected: number;
  potentialMoments: number;
  highQualityMoments: number;
  generatedShortsCount: number;
}

export interface VideoProject {
  id: string;
  projectType?: ProjectType;
  youtubeUrl: string;
  videoId?: string;
  originalTitle: string;
  channelName: string;
  originalDuration: number;
  originalThumbnail: string;
  shorts: ShortCandidate[];
  analysisStats?: AnalysisStats;
  createdAt: string;
  status?: 'ready' | 'processing' | 'error';
  videoUrl?: string; // direct playable MP4 demo source
  audioUrl?: string;
  extractedAudioPath?: string;
  sourceMedia?: SourceMedia;
  demoMode?: boolean;
  editingPersonality?: EditingPersonality;
  language?: string | LanguageDetectionResult;
  projectAnalysis?: ProjectAnalysis;
  transcript?: any[];
}

export interface BrandKit {
  brandName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor: string;
  fontTitle?: string;
  fontBody?: string;
  fontFamily?: string;
  captionStylePreset?: CaptionStyleId;
  highlightColor?: string;
  strokeColor?: string;
  defaultPositionY?: number;
  defaultPreset?: string;
  watermarkText?: string;
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  watermarkOpacity: number;
  enabled: boolean;
}

export interface CaptionCustomization {
  style?: CaptionStyleId;
  preset?: CaptionStylePreset;
  fontFamily: string;
  fontSize: number; // in px
  fontWeight?: number | string;
  positionY: number; // percentage from top (e.g. 75%)
  primaryColor: string;
  highlightColor: string;
  strokeColor: string;
  strokeWidth: number;
  hasShadow: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffset?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  glowEnabled?: boolean;
  glowColor?: string;
  glowBlur?: number;
  glowIntensity?: number;
  backgroundColor?: string;
  backgroundOpacity?: number;
  backgroundShape?: 'none' | 'solid' | 'rounded' | 'pill' | 'box' | 'sharp' | 'highlight_bar' | 'marker' | 'gradient' | 'glass' | 'shadow_box';
  backgroundPadding?: number;
  backgroundRadius?: number;
  gradientEnabled?: boolean;
  gradientColors?: string[];
  gradientAngle?: number;
  rotation?: number;
  opacity?: number;
  wordsPerLine: number;
  wordsPerGroup?: number;
  maxLines?: number;
  maxCharacters?: number;
  alignment?: 'center' | 'left' | 'right';
  lineSpacing?: number;
  lineHeight?: number;
  letterSpacing?: number;
  animationType?:
    | 'pop'
    | 'fade'
    | 'bounce'
    | 'highlight'
    | 'scale'
    | 'karaoke'
    | 'typewriter'
    | 'glitch'
    | 'slide_up'
    | 'slide_down'
    | 'slide_left'
    | 'slide_right'
    | 'word_pop'
    | 'lift'
    | 'blur_in'
    | 'blur_out'
    | 'glow_in'
    | 'glow_pulse'
    | 'tracking_reveal'
    | 'word_punch'
    | 'letter_pop'
    | 'zoom'
    | 'kinetic'
    | 'marker'
    | 'underline'
    | 'spring'
    | 'punch'
    | 'shake'
    | 'elastic'
    | 'rotate'
    | 'overshoot'
    | 'subtle_wave'
    | 'none';
  animationMode?: CaptionAnimationMode;
  animation?: any;
  animationSpeed?: number;
  motionDuration?: number;
  motionDelay?: number;
  motionEasing?: string;
  motionIntensity?: 'subtle' | 'balanced' | 'energetic' | 'extreme';
  emphasisScale?: number;
  emphasisWeight?: number | string;
  emphasisMode?: 'normal' | 'highlight' | 'strong' | 'hero' | 'marker' | 'underline';
  safeAreaEnabled?: boolean;
  autoPositionMode?: 'safe_center' | 'bottom' | 'top' | 'face_avoid' | 'custom' | 'none';
  wordAnimation?: string;
  entryAnimation?: string;
  exitAnimation?: string;
  uppercase?: boolean;
  textColor?: string;
  wordsPerBeat?: number;
  activeWordAnimation?: string;
  entranceAnimation?: string;
  emphasisBehavior?: 'scale' | 'color' | 'glow' | 'bounce' | 'box' | 'underline' | 'none' | 'highlight';
  safeZone?: boolean;
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
  glow?: boolean;
  scale?: number;
  tracking?: number;
  shadow?: boolean;
  background?: string;
  hasBackground?: boolean;
  displayMode?: 'word' | 'line' | 'block' | string;
  wordMode?: 'word' | '2-word' | '3-word' | '4-word' | '5-word' | 'line' | 'block' | string;
  enableSpeechHold?: boolean;
  holdThresholdSeconds?: number;
  finalHoldSeconds?: number;
}

export type CaptionAnimationMode =
  | 'WORD_BY_WORD'
  | 'KARAOKE'
  | 'TYPE_ON'
  | 'POP_WORD'
  | 'ACTIVE_WORD'
  | 'PHRASE_BEAT'
  | 'REFERENCE_TYPING';

export interface LanguageDetectionResult {
  primaryLanguage: string;
  detectedCode: string;
  detectedLanguage?: string;
  secondaryLanguages: string[];
  isMixedLanguage: boolean;
  isCodeSwitching?: boolean;
  script?: string;
  confidence: number;
  segments?: { text: string; language: string; start: number; end: number }[];
}

export interface SFXSuggestion {
  id: string;
  type: SFXCategory;
  category?: SFXCategory;
  soundName?: string;
  start: number;
  end: number;
  timestamp?: number;
  duration?: number;
  triggerText: string;
  reason: string;
  confidence: number;
  intensity: number; // 1-10
  assetId?: string;
  audioUrl?: string;
}

export interface BrollSuggestion {
  id: string;
  start: number;
  end: number;
  timestamp?: number;
  duration?: number;
  query: string;
  concept?: string;
  triggerText: string;
  reason: string;
  confidence: number;
  assetType: 'image' | 'video';
  assetId?: string;
  assetUrl: string;
  imageUrl?: string;
  videoUrl?: string;
  enabled?: boolean;
  // Professional Semantic Engine metadata
  purpose?: BrollPurpose;
  shotType?: ShotType;
  topic?: string;
  searchQueries?: string[];
  semanticScore?: number;
  visualScore?: number;
  temporalScore?: number;
  continuityScore?: number;
  crop?: CropPlan;
  source?: 'pexels' | 'pinterest' | 'uploaded';
  thumbnailUrl?: string;
  transcriptContext?: string;
  audioEnabled?: boolean;
  audioVolume?: number;
  approved?: boolean;
}

export interface SilenceRange {
  start: number;
  end: number;
  duration: number;
}

export interface SpeechEnergySegment {
  start: number;
  end: number;
  energy: number; // 0 to 1
  isPeak: boolean;
}

export interface CaptionPlan {
  stylePreset: CaptionStyleId;
  customization: CaptionCustomization;
  segments: CaptionSegment[];
  totalWords: number;
  coveragePercent: number;
}

export interface ProjectAnalysis {
  id: string;
  projectId: string;
  sourceMedia: SourceMedia;
  language: LanguageDetectionResult;
  languageConfidence: number;
  transcript: string;
  segments: CaptionSegment[];
  words: WordTiming[];
  scenes: { start: number; end: number; description?: string; cameraMotion?: string }[];
  speakers: { id: string; name: string; timeRanges: { start: number; end: number }[] }[];
  topics: string[];
  entities: string[];
  keywords: string[];
  emotions: { emotion: string; start: number; end: number; intensity: number }[];
  energy: SpeechEnergySegment[];
  speechEnergyMap?: SpeechEnergySegment[];
  silenceRanges: SilenceRange[];
  sfxSuggestions: SFXSuggestion[];
  sfxPlan?: SFXSuggestion[];
  brollSuggestions: BrollSuggestion[];
  brollPlan?: BrollSuggestion[];
  captionPlan: CaptionPlan;
  shortCandidates: ShortCandidate[];
  approvalMode?: ApprovalMode;
  overallScore?: number;
  createdAt: number;
}

export interface SilencePacingSettings {
  removeSilence: boolean;
  silenceThresholdMs: number;
  removeFillerWords: boolean;
  pacingTightness: number; // 0 to 100
}

export interface BackgroundMusicSettings {
  enabled: boolean;
  category: MusicCategory;
  trackName: string;
  volume: number; // 0 to 100
  duckingAmount: number; // 0 to 100% duck when voice active
}

export interface ExportSettings {
  resolution: VideoResolution;
  fps: FrameRate;
  format: 'mp4';
  quality: 'standard' | 'high' | 'ultra';
  socialPreset: SocialPreset;
  includeWatermark: boolean;
  burnCaptions: boolean;
}

// Canonical Source Media object (Section 2 & 3)
export interface SourceMedia {
  id: string;
  type: 'video' | 'audio';
  kind?: 'video' | 'audio';
  sourceType: 'youtube' | 'upload' | 'demo';
  originalUrl?: string;
  localPath: string;
  publicUrl: string;
  filename?: string;
  mimeType?: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  videoCodec?: string;
  audioCodec?: string;
  sampleRate?: number;
  audioSampleRate?: number;
  channels?: number;
  hasVideo?: boolean;
  hasAudio?: boolean;
  fileSize?: number;
  sha256?: string;
  status: 'ready' | 'processing' | 'error';
  error?: string;
  // Compatibility aliases
  path?: string;
  url?: string;
  name?: string;
  audioAvailable?: boolean;
  videoElement?: HTMLVideoElement;
  audioElement?: HTMLAudioElement;
}

// Canonical B-roll Track Item
export interface BrollItem {
  id: string;
  assetUrl: string;
  timelineStart: number;
  timelineEnd: number;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  fit: 'cover' | 'contain';
  concept?: string;
  enabled?: boolean;
}

// Canonical SFX Track Item
export interface SfxItem {
  id: string;
  audioUrl: string;
  category: SFXCategory;
  soundName: string;
  start: number;
  end: number;
  volume: number;
  fadeIn?: number;
  fadeOut?: number;
}

// Canonical VFX Track Item
export interface VfxItem {
  id: string;
  type: VFXType;
  start: number;
  end: number;
  intensity: number;
  label?: string;
  parameters?: Record<string, unknown>;
}

// Canonical Audio / Music Track Item
export interface AudioClip {
  id: string;
  sourceUrl: string;
  timelineStart: number;
  timelineEnd: number;
  volume: number;
  muted: boolean;
  isVoiceTrack?: boolean;
}

export interface MusicItem {
  id: string;
  trackName: string;
  category: MusicCategory;
  timelineStart: number;
  timelineEnd: number;
  volume: number;
  duckingAmount: number;
}

export interface TransformKeyframe {
  time: number;
  scale: number;
  x: number;
  y: number;
  rotation: number;
  speakerTarget?: 'center' | 'left' | 'right';
}

export interface HistoryState {
  past: ShortCandidate[];
  future: ShortCandidate[];
}

export interface BackgroundTrackItem {
  type: BackgroundType | 'solid' | 'gradient' | 'animated_gradient' | 'particles' | 'abstract_motion' | 'dynamic_waveform' | 'image' | 'blurred_image' | 'video' | 'ai_generated';
  url?: string;
  color?: string;
  gradient?: [string, string, string?];
  blur?: number;
  opacity?: number;
}

export interface TransformState {
  scale: number;
  x: number;
  y: number;
  rotation: number;
  speakerPosition?: 'center' | 'left' | 'right' | 'auto_switch';
}

// Canonical EditorProject (Phase 2 Single Source of Truth)
export interface EditorProject {
  id: string;
  title: string;
  source: SourceMedia;
  sequence: {
    duration: number;
    fps: number;
    width: number;
    height: number;
    aspectRatio: AspectRatio;
  };
  videoTracks: VideoClip[];
  audioTracks: AudioClip[];
  captionTrack: CaptionSegment[];
  brollTrack: BrollItem[];
  sfxTrack: SfxItem[];
  vfxTrack: VfxItem[];
  musicTrack: MusicItem[];
  backgroundTrack?: BackgroundTrackItem;
  transforms: TransformKeyframe[];
  transformState?: TransformState;
  exportSettings?: ExportSettings;
  history?: HistoryState;
  projectAnalysis?: ProjectAnalysis;
  language?: string | LanguageDetectionResult;
  compositionV1?: CompositionV1;
}

// ============================================================================
// COMPOSITION V1 RUNTIME CONTRACT (Master Plan Section 6)
// ============================================================================

export interface RationalNumber {
  numerator: number;
  denominator: number;
}

export interface CompositionSegmentV1 {
  id: string;
  sourceAssetId: string;
  sourceInUs: number; // microseconds
  sourceOutUs: number; // microseconds
  timelineStartUs: number; // microseconds
  speed: RationalNumber; // e.g. { numerator: 1, denominator: 1 }
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  speakerPosition?: 'center' | 'left' | 'right' | 'split';
}

export interface CompositionCaptionWordV1 {
  word: string;
  startUs: number;
  endUs: number;
  originalStartUs?: number;
  originalEndUs?: number;
  confidence?: number;
}

export interface CompositionCaptionV1 {
  id: string;
  startUs: number;
  endUs: number;
  text: string;
  words: CompositionCaptionWordV1[];
  stylePresetId?: string;
  customization?: CaptionCustomization;
}

export interface CompositionAudioV1 {
  id: string;
  assetId: string;
  sourceInUs: number;
  sourceOutUs: number;
  timelineStartUs: number;
  gain: number;
  fadeInUs?: number;
  fadeOutUs?: number;
  duckingDb?: number;
}

export interface CompositionBrollV1 {
  id: string;
  assetId: string;
  sourceInUs: number;
  sourceOutUs: number;
  timelineStartUs: number;
  timelineEndUs: number;
  crop?: { x: number; y: number; width: number; height: number };
  opacity?: number;
}

export interface CompositionEffectV1 {
  id: string;
  effectType: string;
  timelineStartUs: number;
  timelineEndUs: number;
  intensity: number;
}

export interface CompositionBrandV1 {
  logoAssetId?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity?: number;
  scale?: number;
}

export interface CompositionOutputProfileV1 {
  width: number;
  height: number;
  fps: RationalNumber;
  aspectRatio: '9:16' | '1:1' | '16:9' | '4:5';
  qualityMode: 'MASTER' | 'HIGH' | 'BALANCED' | 'FAST';
}

export interface CompositionV1 {
  schemaVersion: 'v1';
  revisionId: string;
  projectId: string;
  workspaceId: string;
  clipId: string;
  sources: {
    assetId: string;
    url: string;
    contentHash?: string;
    durationUs: number;
    width: number;
    height: number;
    fps: RationalNumber;
    hasAudio: boolean;
    hasVideo: boolean;
  }[];
  output: CompositionOutputProfileV1;
  segments: CompositionSegmentV1[];
  captions: CompositionCaptionV1[];
  audio: CompositionAudioV1[];
  broll: CompositionBrollV1[];
  effects: CompositionEffectV1[];
  brand?: CompositionBrandV1;
  compositionHash: string;
  createdAt: string;
}

// ============================================================================
// PROFESSIONAL AI SEMANTIC B-ROLL ENGINE MODELS & INTERFACES
// ============================================================================

export type BrollPurpose =
  | 'context'
  | 'explanation'
  | 'visual_metaphor'
  | 'location'
  | 'technology'
  | 'people'
  | 'emotion'
  | 'object'
  | 'environment'
  | 'transition'
  | 'establishing'
  | 'detail'
  | 'emphasis';

export type ShotType =
  | 'ESTABLISHING'
  | 'HUMAN'
  | 'DETAIL'
  | 'CONTEXT'
  | 'CONCEPTUAL'
  | 'HERO';

export interface CropPlan {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'smart' | 'face-safe' | 'object-safe' | 'center';
  motion?: {
    startScale: number;
    endScale: number;
    easing: 'ease-in-out' | 'linear';
  };
}

export interface BrollOpportunity {
  start: number;
  end: number;
  transcriptContext: string;
  visualContext: string;
  topic: string;
  purpose: BrollPurpose;
  searchQueries: string[];
  confidence: number;
}

// Canonical B-Roll Asset & Event Architecture (Parts 14-20)
export type BrollAssetType = 'video' | 'image';
export type BrollProvider = 'pixabay' | 'pexels' | 'pinterest' | 'verified_catalog' | 'uploaded';

export type BrollAsset = {
  id: string;
  type: BrollAssetType;
  provider: BrollProvider;
  url: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  duration?: number;
  query: string;
  licenseInfo?: string;
};

export interface BrollEvent {
  id: string;
  start: number;
  end: number;
  source?: 'pexels' | 'pinterest' | 'uploaded' | 'pixabay' | 'verified_catalog';
  provider?: BrollProvider;
  assetId: string;
  assetType?: BrollAssetType;
  assetUrl: string;
  thumbnailUrl?: string;
  query: string;
  transcriptContext: string;
  reason: string;
  semanticScore: number;
  visualScore: number;
  temporalScore: number;
  continuityScore?: number;
  crop: CropPlan;
  opacity?: number;
  audioEnabled: boolean;
  audioVolume?: number;
  volume?: number;
  approved: boolean;
  isPIP?: boolean;
  transition?: 'hard_cut' | 'quick_zoom' | 'subtle_push' | 'fade';
  shotType?: ShotType;
  topic?: string;
  purpose?: BrollPurpose;
}

export interface PersonAnalysis {
  id: string;
  label?: string;
  position: 'center' | 'left' | 'right';
  screenShareRatio?: number;
  timeRanges: { start: number; end: number }[];
}

export interface EnergyPoint {
  time: number;
  energy: number; // 0 to 1
  isPeak: boolean;
}

export interface ImportantMoment {
  time: number;
  importance: number; // 0 to 1
  reason: string;
  type: 'hook' | 'keypoint' | 'contrast' | 'summary' | 'climax';
}

export interface AnimalEvent {
  type: 'animal';
  subject: string;
  start: number;
  end: number;
  confidence: number;
}

export interface VideoSemanticAnalysis {
  duration: number;
  language?: string;
  languagesDetected?: DetectedLanguageBreakdown[];
  scenes: { start: number; end: number; description?: string; cameraMotion?: string }[];
  sceneChanges?: number[];
  speakers?: string[];
  speakerChanges?: number[];
  transcript: string;
  words: (WordTiming | CaptionWord)[];
  sentences?: { text: string; start: number; end: number }[];
  topics: string[];
  entities: string[];
  locations: string[];
  people: PersonAnalysis[];
  animals?: AnimalEvent[];
  objects: string[];
  visualThemes: string[];
  emotionalTone: string[];
  energyCurve: EnergyPoint[];
  speechRate?: number;
  importantMoments: ImportantMoment[];
  hookMoments?: ImportantMoment[];
  punchlines?: ImportantMoment[];
  visualOpportunities?: BrollOpportunity[];
  brollOpportunities: BrollOpportunity[];
}

export interface StockMediaFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  fps: number;
  link: string;
}

export interface StockVideo {
  id: string;
  provider: 'pexels' | 'pinterest' | 'uploaded';
  width: number;
  height: number;
  duration: number;
  url: string;
  thumbnailUrl: string;
  videoFiles: StockMediaFile[];
  tags?: string[];
  author?: string;
  license?: string;
  queryMatched?: string;
}

export interface PexelsSearchParams {
  query: string;
  orientation?: 'portrait' | 'landscape' | 'square';
  size?: 'large' | 'medium' | 'small';
  page?: number;
  per_page?: number;
}

export interface PexelsProvider {
  searchVideos(params: PexelsSearchParams): Promise<StockVideo[]>;
}

export interface SequenceContinuityResult {
  score: number;
  previousShotMatch: number;
  nextShotMatch: number;
  colorConsistency: number;
  motionFlow: number;
  isAcceptable: boolean;
  critique?: string;
}

export interface BrollCandidateScore {
  semanticSimilarity: number;
  transcriptRelevance: number;
  visualSimilarity: number;
  topicMatch: number;
  emotionalMatch: number;
  orientationMatch: number;
  qualityScore: number;
  temporalFit: number;
  noveltyScore: number;
  finalScore: number;
  passed: boolean;
}

export type AssetProvenanceType =
  | 'USER_VIDEO'
  | 'PEXELS_VIDEO'
  | 'USER_SFX'
  | 'AI_SFX'
  | 'TTS_AUDIO'
  | 'VOICE_CLONE'
  | 'AI_PRESENTER'
  | 'DUBBED_VIDEO'
  | 'MUSIC'
  | 'BROLL';

export interface AssetProvenance {
  id: string;
  type: AssetProvenanceType;
  provider: string;
  source: string;
  license: string;
  hash: string;
  duration: number;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface VoicePreset {
  id: string;
  name: string;
  provider: 'system' | 'omnivoice' | 'heygen';
  language: string;
  gender: 'male' | 'female' | 'neutral';
  previewUrl?: string;
  description?: string;
  styles?: string[];
}

export interface VoiceProfile {
  voiceId: string;
  name: string;
  provider: 'system' | 'omnivoice' | 'heygen';
  referenceAsset: string;
  language: string;
  consentStatus: boolean;
  createdAt: string;
}

export interface VoiceoverEvent {
  id: string;
  start: number;
  end: number;
  duration: number;
  text: string;
  sectionType: ScriptSectionType;
  audioUrl: string;
  voiceId: string;
  volume: number;
}

export interface DubEvent {
  id: string;
  start: number;
  end: number;
  originalText: string;
  translatedText: string;
  targetLanguage: string;
  audioUrl?: string;
  speaker?: string;
}

export interface PresenterEvent {
  id: string;
  start: number;
  end: number;
  avatarId: string;
  avatarName: string;
  videoUrl: string;
  scriptText: string;
  aspectRatio: AspectRatio;
  crop?: { x: number; y: number; width: number; height: number };
  approved: boolean;
}

export interface EditDecision {
  id: string;
  start: number;
  end: number;
  primaryTrack: 'presenter' | 'broll' | 'original';
  reason: string;
  confidence: number;
  captionAction?: string;
  brollId?: string;
  presenterId?: string;
}

export interface AIEditPlanItem {
  type: 'add_broll' | 'change_caption_style' | 'add_voiceover' | 'remove_silence' | 'translate' | 'add_presenter';
  description: string;
  details: Record<string, any>;
}

export interface AIEditPlan {
  id: string;
  userCommand: string;
  items: AIEditPlanItem[];
  summary: string;
  createdAt: string;
}

export interface RenderPlan {
  projectId: string;
  shortId: string;
  duration: number;
  source?: {
    mediaId?: string;
    url: string;
    originalFilename?: string;
    mimeType?: string;
  };
  clips?: Array<{
    id: string;
    startTime: number;
    endTime: number;
    label?: string;
  }>;
  brollEvents: BrollEvent[];
  captions: CaptionSegment[];
  sfxMarkers: SFXMarker[];
  vfxMarkers?: VFXMarker[];
  styles?: CaptionCustomization | Record<string, any>;
  animations?: {
    type?: string;
    preset?: string;
    mode?: string;
  };
  dynamicZooms?: Array<{
    startTime: number;
    endTime: number;
    peakScale: number;
  }>;
  zoom?: Array<{
    startTime: number;
    endTime: number;
    peakScale: number;
  }>;
  canvas?: {
    width: number;
    height: number;
    aspectRatio: string;
  };
  exportSettings?: {
    resolution: string;
    frameRate: number;
    qualityMode: 'FAST' | 'BALANCED' | 'HIGH' | 'MASTER';
    format: 'mp4' | 'mov' | 'webm';
  };
  brandKit?: BrandKit;
  voiceoverEvents?: VoiceoverEvent[];
  presenterEvents?: PresenterEvent[];
  dubEvents?: DubEvent[];
  editDecisions?: EditDecision[];
  assetProvenance?: AssetProvenance[];
  audioTrack: {
    originalVolume: number;
    brollDuckingDb: number;
    voiceoverVolume?: number;
  };
}

export interface HeyGenAvatar {
  avatarId: string;
  avatarName: string;
  previewImageUrl: string;
  previewVideoUrl?: string;
  gender: 'male' | 'female';
  category: string;
}

// ==============================================================================
// CAPTION PRESET IMPORTER TYPES (Phases 2, 4, 6, 7, 10, 18, 19, 22)
// ==============================================================================

export type PresetSourceProviderType = 'google_drive' | 'local_file' | 'zip' | (string & {});

export interface CaptionPresetSourceRecord {
  id: string;
  name: string;
  category: 'Beginner' | 'Intermediate' | 'Pro' | '3D' | 'Preset Pack 1' | 'Preset Pack 2' | 'Preset Pack 3' | 'Additional Pack' | 'Imported' | 'My Styles' | string;
  provider: PresetSourceProviderType;
  sourceUrl: string;
  sourceId?: string;
  lastScannedAt?: string;
  lastSyncedAt?: string;
  status: 'READY' | 'SCANNING' | 'IMPORTING' | 'ERROR' | 'UNAVAILABLE';
  importedCount?: number;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CaptionPresetRecord {
  id: string;
  name: string;
  slug: string;
  category: string;
  presetJson: any; // CaptionStyleDefinition
  previewUrl?: string;
  sourceId?: string;
  sourceFileId?: string;
  sourceFile?: string;
  sourceType?: string;
  sourceChecksum?: string;
  is3D?: boolean;
  conversionStatus: 'FULL' | 'PARTIAL' | 'UNSUPPORTED';
  conversionVersion: string;
  unsupportedReasons?: string[];
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CaptionFontRecord {
  id: string;
  family: string;
  fileUrl: string;
  format: 'ttf' | 'otf' | 'woff' | 'woff2' | string;
  weight: number;
  style: string;
  checksum: string;
  sourceId?: string;
  licenseMetadata?: Record<string, any>;
  createdAt?: string;
}

export interface CaptionImportJobRecord {
  id: string;
  sourceId?: string;
  status:
    | 'QUEUED'
    | 'SCANNING'
    | 'DISCOVERING'
    | 'DOWNLOADING'
    | 'ANALYZING'
    | 'CONVERTING'
    | 'VALIDATING'
    | 'REGISTERING_FONTS'
    | 'GENERATING_PREVIEWS'
    | 'IMPORTING'
    | 'COMPLETED'
    | 'PARTIAL'
    | 'FAILED'
    | 'CANCELLED';
  stage: string;
  currentFile?: string;
  totalFiles: number;
  processedFiles: number;
  successCount: number;
  partialCount: number;
  failureCount: number;
  unsupportedCount: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}

export interface CaptionImportErrorRecord {
  id: string;
  jobId: string;
  sourceFile: string;
  stage: string;
  errorCode: string;
  message: string;
  details?: any;
  suggestedAction?: string;
  createdAt?: string;
}

export interface ScanItem {
  id: string;
  name: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  extension: string;
  detectedType: 'xml' | 'json' | 'font' | 'zip' | 'image' | 'video' | 'unknown';
  compatibility: 'SUPPORTED' | 'PARTIAL' | 'UNSUPPORTED';
  details?: string;
}

export interface ScanReport {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  totalFiles: number;
  categories: Record<string, number>;
  supportedCount: number;
  partiallySupportedCount: number;
  unsupportedCount: number;
  items: ScanItem[];
  scannedAt: string;
}

// ==============================================================================
// UNIVERSAL PROCESSING JOB TYPES (Requirement 4 & 5)
// ==============================================================================

export type ProcessingJobType =
  | 'TRANSCRIBE'
  | 'ANALYZE_VIDEO'
  | 'GENERATE_SHORTS'
  | 'IMPORT_PRESETS'
  | 'CONVERT_PRESETS'
  | 'GENERATE_PREVIEW'
  | 'GENERATE_BROLL'
  | 'GENERATE_SFX'
  | 'GENERATE_VFX'
  | 'RENDER_VIDEO'
  | 'GENERATE_THUMBNAIL'
  | 'YOUTUBE_DOWNLOAD';

export type UniversalJobStatus =
  | 'QUEUED'
  | 'CLAIMED'
  | 'DOWNLOADING'
  | 'ANALYZING'
  | 'TRANSCRIBING'
  | 'GENERATING'
  | 'RENDERING'
  | 'UPLOADING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCEL_REQUESTED'
  | 'CANCELLED'
  // Caption import states for backwards compatibility:
  | 'SCANNING'
  | 'DISCOVERING'
  | 'CONVERTING'
  | 'VALIDATING'
  | 'REGISTERING_FONTS'
  | 'GENERATING_PREVIEWS'
  | 'IMPORTING'
  | 'PROCESSING'
  | 'PARTIAL';

export type ProcessingJobEventType =
  | 'job_created'
  | 'job_claimed'
  | 'download_started'
  | 'download_completed'
  | 'transcription_started'
  | 'transcription_completed'
  | 'caption_generation'
  | 'broll_generation'
  | 'sfx_generation'
  | 'vfx_generation'
  | 'render_started'
  | 'render_completed'
  | 'upload_started'
  | 'upload_completed'
  | 'job_failed';

export interface ProcessingJobRecord {
  id: string;
  type: ProcessingJobType | string;
  status: UniversalJobStatus | string;
  progress: number;
  stage: string;
  input?: any;
  output?: any;
  error?: string;
  sourceId?: string;
  retryCount?: number;
  retry_count?: number;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ProcessingJobEventRecord {
  id: string;
  jobId: string;
  eventType?: ProcessingJobEventType | string;
  stage: string;
  progress: number;
  message?: string;
  metadata?: any;
  createdAt?: string;
}



