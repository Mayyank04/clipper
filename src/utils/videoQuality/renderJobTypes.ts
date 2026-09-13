/**
 * VIRALCLIP STUDIO — CANONICAL RENDER JOB TYPES
 * Definitive specifications for the asynchronous render-queue architecture.
 */

import { SourceMediaQualityInfo, RenderQualityProfile } from './types';

export type RenderJobStatus =
  | 'queued'
  | 'preparing'
  | 'rendering'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type RenderJobStage =
  | 'preparing'
  | 'analyzing'
  | 'building_filtergraph'
  | 'encoding'
  | 'audio'
  | 'verifying'
  | 'complete';

export interface RenderChecklist {
  captions: boolean;
  broll: boolean;
  sfx: boolean;
  vfx: boolean;
  audio: boolean;
}

export interface RenderJobForensics {
  width: number;
  height: number;
  codec: string;
  audioCodec: string;
  sampleRate: number;
  fps: number;
  bitrateKbps: number;
  framesExtracted: string[];
  brollRendered: number;
  captionsBurned: number;
  verifiedAt: number;
}

export interface RenderJob {
  id: string;
  projectId: string;
  shortId?: string;
  status: RenderJobStatus;
  progress: number; // 0 - 100
  stage: RenderJobStage;
  startedAt?: number;
  completedAt?: number;
  duration?: number; // Total short duration in seconds
  outputPath?: string;
  downloadUrl?: string;
  fileName?: string;
  fileSizeMb?: number;
  error?: string;
  ffmpegPid?: number;
  sourceQuality?: SourceMediaQualityInfo;
  renderProfile?: RenderQualityProfile;
  renderPlanHash?: string;
  currentTimeSec?: number;
  totalDurationSec?: number;
  checklist?: RenderChecklist;
  forensics?: RenderJobForensics;
}

export interface RenderPlanAsset {
  type: 'video' | 'image' | 'audio' | 'font';
  sourceUrl: string;
  localPath: string;
  validated: boolean;
  duration?: number;
  width?: number;
  height?: number;
}
