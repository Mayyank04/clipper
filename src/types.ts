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
  | 'viral_bold'
  | 'hormozi'
  | 'kinetic'
  | 'minimal'
  | 'cinematic'
  | 'podcast'
  | 'neon'
  | 'typewriter'
  | 'pop'
  | 'highlight'
  | 'clean_subtitle'
  | 'dynamic_ai'
  // Backward compatibility aliases:
  | 'viral'
  | 'dynamic'
  | 'gaming'
  | 'professional';

export type CaptionStylePreset = CaptionStyleId;

export type EditingPersonality = 'clean' | 'creator' | 'viral' | 'cinematic';
export type EditingIntensity = 'subtle' | 'balanced' | 'dynamic' | 'viral';

export type HookCategory = 'curiosity' | 'bold' | 'question' | 'shock' | 'educational';

export type SFXCategory =
  | 'whoosh'
  | 'pop'
  | 'hit'
  | 'click'
  | 'impact'
  | 'rise'
  | 'riser'
  | 'drop'
  | 'glitch'
  | 'notification'
  | 'cinematic'
  | 'comedy'
  | 'chime';

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

export interface CaptionSegment {
  id: string;
  text: string;
  start: number; // in seconds relative to short clip start
  end: number;
  speaker?: string;
  words: WordTiming[];
}

export interface SFXMarker {
  id: string;
  timestamp: number; // relative to short clip start
  category: SFXCategory;
  soundName: string;
  volume: number; // 0 to 1
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
  audioUrl?: string; // direct audio source
  audioFilename?: string;
  sourceMedia?: SourceMedia;
  demoMode?: boolean;
  mediaUnavailable?: boolean;
  mediaFileName?: string;
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
  positionY: number; // percentage from top (e.g. 75%)
  primaryColor: string;
  highlightColor: string;
  strokeColor: string;
  strokeWidth: number;
  hasShadow: boolean;
  wordsPerLine: number;
  animationType?: 'pop' | 'fade' | 'bounce' | 'highlight' | 'scale';
  uppercase: boolean;
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

// Canonical Source Media object
export interface SourceMedia {
  id: string;
  type: 'video' | 'audio';
  path?: string;
  url: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  hasVideo: boolean;
  hasAudio: boolean;
  sourceType: 'youtube' | 'upload' | 'demo';
  name?: string;
  mimeType?: string;
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
}
