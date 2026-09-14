export type AspectRatio = '9:16' | '1:1' | '16:9';

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
  | 'COMEDY';

export type CaptionStylePreset = CaptionStyleId;

export type CaptionCategory =
  | 'viral'
  | 'minimal'
  | 'podcast'
  | 'gaming'
  | 'cinematic'
  | 'news'
  | 'educational'
  | 'social'
  | 'music'
  | 'creative'
  | 'high_energy';

export type ApprovalMode = 'auto_apply' | 'balanced' | 'suggest_only';

export type EditingPersonality = 'clean' | 'creator' | 'viral' | 'cinematic';
export type EditingIntensity = 'subtle' | 'balanced' | 'dynamic' | 'viral';

export type HookCategory = 'curiosity' | 'bold' | 'question' | 'shock' | 'educational';

export type SFXCategory =
  | 'impact'
  | 'whoosh'
  | 'transition'
  | 'riser'
  | 'hit'
  | 'bass'
  | 'pop'
  | 'click'
  | 'ui'
  | 'notification'
  | 'cinematic'
  | 'comedy'
  | 'meme'
  | 'gaming'
  | 'nature'
  | 'ambient'
  | 'human'
  | 'animal'
  | 'vehicle'
  | 'mechanical'
  | 'footsteps'
  | 'applause'
  | 'laugh'
  | 'crowd'
  | 'music'
  | 'glitch'
  | 'digital'
  | 'horror'
  | 'suspense'
  | 'magic'
  | 'success'
  | 'failure'
  | 'alert'
  | 'rise'
  | 'drop'
  | 'chime'
  | 'reveal'
  | 'sci-fi';

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
  | 'glitch';

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
  sfxTrack?: any[];
  vfxTrack?: any[];
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
  backgroundColor?: string;
  backgroundOpacity?: number;
  wordsPerLine: number;
  wordsPerGroup?: number;
  maxLines?: number;
  maxCharacters?: number;
  alignment?: 'center' | 'left' | 'right';
  lineSpacing?: number;
  letterSpacing?: number;
  animationType?: 'pop' | 'fade' | 'bounce' | 'highlight' | 'scale' | 'karaoke' | 'typewriter' | 'glitch' | 'none';
  animationMode?: CaptionAnimationMode;
  animation?: any;
  animationSpeed?: number;
  wordAnimation?: string;
  entryAnimation?: string;
  exitAnimation?: string;
  uppercase: boolean;
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
  brollEvents: BrollEvent[];
  captions: CaptionSegment[];
  sfxMarkers: SFXMarker[];
  voiceoverEvents?: VoiceoverEvent[];
  presenterEvents?: PresenterEvent[];
  dubEvents?: DubEvent[];
  vfxMarkers?: VFXMarker[];
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


