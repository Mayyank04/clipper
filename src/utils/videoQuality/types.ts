/**
 * VIRALCLIP STUDIO — VIDEO QUALITY & 9:16 RENDERING TYPES
 * Professional source-aware video processing, smart crop planning,
 * color management, and production export profiles.
 */

export type ExportQualityMode = 'FAST' | 'BALANCED' | 'HIGH' | 'MASTER';

export interface SourceMediaQualityInfo {
  sourceWidth: number;
  sourceHeight: number;
  sourceFPS: number;
  sourceCodec: string;
  sourceBitrate: number; // bps
  sourceVideoBitrate: number; // bps
  sourcePixelFormat: string;
  sourceColorSpace: string;
  sourceColorTransfer: string;
  sourceColorPrimaries: string;
  sourceColorRange: 'tv' | 'pc' | 'unknown';
  sourceDuration: number;
  sourceAudioCodec: string;
  sourceAudioBitrate: number;
  sourceAudioSampleRate: number;
  sourceSharpnessScore?: number; // Variance of Laplacian
}

export interface SourceQualityScore {
  overallScore: number; // 0 - 100
  resolutionScore: number; // 0 - 100
  bitrateScore: number; // 0 - 100
  compressionScore: number; // 0 - 100
  sharpnessScore: number; // 0 - 100
  rating: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT' | 'PRISTINE';
  isLowResolution: boolean;
  isHeavilyCompressed: boolean;
  warningMessage?: string;
  recommendation: string;
}

export interface CropPlanPoint {
  sourceTime: number; // seconds
  x: number; // pixel offset from left
  y: number; // pixel offset from top
  width: number; // crop width in source coordinates
  height: number; // crop height in source coordinates
  normalizedX: number; // 0.0 to 1.0
  normalizedY: number; // 0.0 to 1.0
  confidence: number;
  target: 'face' | 'speaker' | 'salient_object' | 'center';
  reason: string;
}

export interface CropPlan {
  sourceWidth: number;
  sourceHeight: number;
  targetAspect: '9:16';
  points: CropPlanPoint[];
  smoothingWindowSeconds: number;
}

export interface RenderQualityProfile {
  qualityMode: ExportQualityMode;
  targetResolution: { width: number; height: number };
  targetFPS: number;
  crf: number;
  encoderPreset: string;
  pixelFormat: string;
  colorPrimaries: string;
  colorTransfer: string;
  colorSpace: string;
  colorRange: string;
  scalingFilter: string;
  sharpening: 'off' | 'subtle' | 'medium';
  audioBitrate: string;
  audioSampleRate: number;
}

export interface QualityComparison {
  source: {
    resolution: string;
    codec: string;
    bitrate: string;
    fps: number;
    colorSpace: string;
    sharpness: number;
  };
  output: {
    resolution: string;
    codec: string;
    bitrate: string;
    fps: number;
    colorSpace: string;
    sharpness: number;
  };
  qualityDegradationPercent: number; // Negative means enhanced or preserved
  status: 'EXCELLENT_FIDELITY' | 'GOOD_FIDELITY' | 'ACCEPTABLE' | 'DEGRADATION_DETECTED';
}
