/**
 * VIRALCLIP STUDIO — PROCESSING WORKER TYPES
 * Authoritative worker abstraction decoupling media processing, preset importation,
 * transcription, and video composition from the web application host.
 */

import type {
  ProcessingJobType,
  UniversalJobStatus,
  ProcessingJobRecord,
  ProcessingJobEventRecord,
  CaptionImportJobRecord,
  ScanReport,
} from '../../types';

export type {
  ProcessingJobType,
  UniversalJobStatus,
  ProcessingJobRecord,
  ProcessingJobEventRecord,
  CaptionImportJobRecord,
  ScanReport,
};

export interface WorkerHealth {
  status: 'ready' | 'degraded' | 'unavailable';
  workerId: string;
  engine: string;
  isRemote: boolean;
  workerUrl?: string;
  ffmpeg: boolean;
  ffprobe: boolean;
  python: boolean;
  whisper: boolean;
  storage: boolean;
  database: boolean;
  details?: Record<string, any>;
}

export interface TranscribeJobInput {
  mediaUrl: string;
  language?: string;
  startTime?: number;
  duration?: number;
  title?: string;
  topic?: string;
  forceRefresh?: boolean;
}

export interface ImportPresetsJobInput {
  sourceId: string;
  sourceUrl: string;
  category?: string;
  provider?: string;
  batchSize?: number;
}

export interface ConvertPresetsJobInput {
  files?: string[];
  fileContent?: string;
  fileName?: string;
  category?: string;
  sourceId?: string;
}

export interface GeneratePreviewJobInput {
  presetJson: any;
  title?: string;
  category?: string;
}

export interface RenderVideoJobInput {
  renderPlan: any;
  projectId?: string;
  shortId?: string;
  options?: {
    qualityMode?: 'FAST' | 'BALANCED' | 'HIGH' | 'MASTER';
    resolution?: string;
    fps?: number;
  };
}

export interface GenerateShortsJobInput {
  projectId: string;
  transcript: any;
  targetCount?: number;
  minDuration?: number;
  maxDuration?: number;
}

export interface GenerateBrollJobInput {
  projectId: string;
  transcript: any;
  duration: number;
}

export interface GenerateSfxJobInput {
  projectId: string;
  captions: any[];
  duration: number;
}

export interface GenerateVfxJobInput {
  projectId: string;
  captions: any[];
  duration: number;
}

export interface IProcessingWorker {
  dispatchJob<TInput = any>(
    type: ProcessingJobType,
    input: TInput,
    options?: {
      jobId?: string;
      sourceId?: string;
      projectId?: string;
    }
  ): Promise<ProcessingJobRecord>;

  getJobStatus(jobId: string): Promise<ProcessingJobRecord | null>;
  cancelJob(jobId: string): Promise<boolean>;
  getHealth(): Promise<WorkerHealth>;
}
