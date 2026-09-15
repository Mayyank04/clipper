/**
 * VIRALCLIP STUDIO — PROCESSING SERVICE INTERFACES
 * Abstraction decoupling media processing (FFmpeg, Whisper, yt-dlp) from the web host.
 */

import { CaptionSegment, ShortCandidate } from '../../types';
import { RenderPlan } from '../../types';
import { SourceMediaQualityInfo } from '../../utils/videoQuality/types';

export interface TranscribeOptions {
  language?: string;
  forceRefresh?: boolean;
  onProgress?: (progress: number, stage: string) => void;
}

export interface TranscriptionServiceResult {
  text: string;
  language: string;
  duration: number;
  segments: CaptionSegment[];
  provider: string;
}

export interface ITranscriptionService {
  transcribe(mediaPathOrUrl: string, options?: TranscribeOptions): Promise<TranscriptionServiceResult>;
  getHealth(): Promise<{ status: string; engine: string; available: boolean }>;
}

export interface RenderOptions {
  resolution?: string;
  frameRate?: number;
  qualityMode?: 'FAST' | 'BALANCED' | 'HIGH' | 'MASTER';
  onProgress?: (progress: number, stage: string) => void;
}

export interface RenderServiceResult {
  jobId: string;
  outputPath?: string;
  downloadUrl?: string;
  fileName?: string;
  fileSizeMb?: number;
  duration?: number;
  status: 'completed' | 'failed' | 'cancelled';
  error?: string;
}

export interface IRenderService {
  render(renderPlan: RenderPlan, options?: RenderOptions): Promise<RenderServiceResult>;
  getJobStatus(jobId: string): Promise<RenderServiceResult>;
  cancelRender(jobId: string): Promise<void>;
}

export interface YoutubeDownloadOptions {
  onProgress?: (progress: number, stage: string) => void;
}

export interface YoutubeDownloadResult {
  success: boolean;
  filePath?: string;
  fileUrl?: string;
  title: string;
  duration: number;
  videoId: string;
  width?: number;
  height?: number;
  error?: string;
}

export interface IYoutubeService {
  download(url: string, destDir?: string, options?: YoutubeDownloadOptions): Promise<YoutubeDownloadResult>;
  getStatus(): { available: boolean; binary: string | null };
}

export interface IMediaInspectionService {
  inspect(filePathOrUrl: string): Promise<SourceMediaQualityInfo>;
}

export interface IProcessingAdapter {
  transcription: ITranscriptionService;
  render: IRenderService;
  youtube: IYoutubeService;
  inspection: IMediaInspectionService;
}
