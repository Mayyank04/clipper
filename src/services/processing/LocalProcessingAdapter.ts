/**
 * VIRALCLIP STUDIO — LOCAL PROCESSING ADAPTER
 * Implements IProcessingAdapter using local FFmpeg, FFprobe, Whisper, and yt-dlp.
 */

import {
  IProcessingAdapter,
  ITranscriptionService,
  IRenderService,
  IYoutubeService,
  IMediaInspectionService,
  TranscribeOptions,
  TranscriptionServiceResult,
  RenderOptions,
  RenderServiceResult,
  YoutubeDownloadOptions,
  YoutubeDownloadResult,
} from './types';
import path from 'path';
import ffmpegStatic from 'ffmpeg-static';
import { RenderPlan } from '../../types';
import { SourceMediaQualityInfo } from '../../utils/videoQuality/types';
import { TranscriptionManager } from '../../utils/transcription/TranscriptionManager';
import { renderWorker } from '../../utils/videoQuality/renderWorker';
import { YouTubeDownloader, extractYouTubeId } from '../../utils/youtubeDownloader';
import { probeSourceMedia } from '../../utils/videoQuality/sourceQualityAnalyzer';

export class LocalTranscriptionService implements ITranscriptionService {
  public async transcribe(
    mediaPathOrUrl: string,
    options?: TranscribeOptions
  ): Promise<TranscriptionServiceResult> {
    const manager = TranscriptionManager.getInstance();
    const result = await manager.transcribe({
      sourceMediaPath: mediaPathOrUrl,
      language: options?.language,
      forceRefresh: options?.forceRefresh,
      onProgress: (stage, message, percent) => {
        options?.onProgress?.(percent, `${stage}: ${message}`);
      },
    });

    const text =
      result.canonicalTranscript.segments?.map((s) => s.text).join(' ') ||
      result.canonicalTranscript.words?.map((w) => w.word).join(' ') ||
      '';

    return {
      text,
      language: result.language,
      duration: result.canonicalTranscript.duration,
      segments: result.captions,
      provider: result.providerUsed,
    };
  }

  public async getHealth(): Promise<{ status: string; engine: string; available: boolean }> {
    const health = await TranscriptionManager.getInstance().getProvidersHealth();
    return {
      status: health.selected ? 'ready' : 'unavailable',
      engine: health.selected || 'none',
      available: !!health.selected,
    };
  }
}

export class LocalRenderService implements IRenderService {
  public async render(
    renderPlan: RenderPlan,
    options?: RenderOptions
  ): Promise<RenderServiceResult> {
    const job = renderWorker.createJob({
      projectId: renderPlan.projectId,
      shortId: renderPlan.shortId,
      rawRenderPlan: {
        ...renderPlan,
        resolution: options?.resolution || '1080x1920',
        frameRate: options?.frameRate || 30,
        qualityMode: options?.qualityMode || 'HIGH',
      },
      projectDir: process.cwd(),
    });

    return {
      jobId: job.id,
      status: 'completed', // Created and managed asynchronously by renderWorker
    };
  }

  public async getJobStatus(jobId: string): Promise<RenderServiceResult> {
    const job = renderWorker.getJob(jobId);
    if (!job) {
      return {
        jobId,
        status: 'failed',
        error: `Render job ${jobId} not found`,
      };
    }

    const statusMap: Record<string, 'completed' | 'failed' | 'cancelled'> = {
      completed: 'completed',
      failed: 'failed',
      cancelled: 'cancelled',
    };

    return {
      jobId: job.id,
      status: statusMap[job.status] || 'completed',
      outputPath: job.outputPath,
      downloadUrl: job.downloadUrl,
      fileName: job.fileName,
      fileSizeMb: job.fileSizeMb,
      duration: job.duration,
      error: job.error,
    };
  }

  public async cancelRender(jobId: string): Promise<void> {
    await renderWorker.cancelJob(jobId);
  }
}

export class LocalYoutubeService implements IYoutubeService {
  private downloader: YouTubeDownloader;

  constructor() {
    const ffmpegPath = (ffmpegStatic as any)?.path || (ffmpegStatic as any) || 'ffmpeg';
    this.downloader = new YouTubeDownloader(ffmpegPath);
  }

  public async download(
    url: string,
    destDir?: string,
    options?: YoutubeDownloadOptions
  ): Promise<YoutubeDownloadResult> {
    const targetDir = destDir || path.resolve(process.cwd(), 'data', 'media');
    const res = await this.downloader.downloadVideo(
      url,
      targetDir,
      {
        onLog: (msg) => {
          options?.onProgress?.(50, msg);
        },
      }
    );

    return {
      success: res.success,
      filePath: res.filePath,
      fileUrl: res.fileUrl,
      title: (res as any).title || res.sourceMedia?.originalUrl || 'YouTube Video',
      duration: res.duration || 0,
      videoId: res.sourceMedia?.sourceId || extractYouTubeId(url) || 'unknown',
      width: res.width,
      height: res.height,
      error: res.error,
    };
  }

  public getStatus(): { available: boolean; binary: string | null } {
    const status = this.downloader.getStatus();
    const adapter = this.downloader.getAdapter();
    return {
      available: status.available,
      binary: adapter.findBinary(),
    };
  }
}

export class LocalMediaInspectionService implements IMediaInspectionService {
  public async inspect(filePathOrUrl: string): Promise<SourceMediaQualityInfo> {
    return probeSourceMedia(filePathOrUrl);
  }
}

export class LocalProcessingAdapter implements IProcessingAdapter {
  public transcription: ITranscriptionService;
  public render: IRenderService;
  public youtube: IYoutubeService;
  public inspection: IMediaInspectionService;

  constructor() {
    this.transcription = new LocalTranscriptionService();
    this.render = new LocalRenderService();
    this.youtube = new LocalYoutubeService();
    this.inspection = new LocalMediaInspectionService();
  }
}
