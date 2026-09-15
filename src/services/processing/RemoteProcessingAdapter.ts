/**
 * VIRALCLIP STUDIO — REMOTE WORKER PROCESSING ADAPTER
 * Dispatches heavy tasks (FFmpeg, Whisper, yt-dlp) to a dedicated remote worker.
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
import { RenderPlan } from '../../types';
import { SourceMediaQualityInfo } from '../../utils/videoQuality/types';

export interface RemoteWorkerConfig {
  workerUrl: string;
  workerSecret: string;
  timeoutMs?: number;
}

export class RemoteProcessingAdapter implements IProcessingAdapter {
  private config: RemoteWorkerConfig;

  public transcription: ITranscriptionService;
  public render: IRenderService;
  public youtube: IYoutubeService;
  public inspection: IMediaInspectionService;

  constructor(config?: Partial<RemoteWorkerConfig>) {
    this.config = {
      workerUrl: config?.workerUrl || process.env.WORKER_URL || '',
      workerSecret: config?.workerSecret || process.env.WORKER_SECRET || '',
      timeoutMs: config?.timeoutMs || 300000,
    };

    this.transcription = new RemoteTranscriptionService(this.config);
    this.render = new RemoteRenderService(this.config);
    this.youtube = new RemoteYoutubeService(this.config);
    this.inspection = new RemoteMediaInspectionService(this.config);
  }

  public isConfigured(): boolean {
    return Boolean(this.config.workerUrl);
  }
}

class RemoteTranscriptionService implements ITranscriptionService {
  constructor(private config: RemoteWorkerConfig) {}

  private checkConfig(): void {
    if (!this.config.workerUrl) {
      throw new Error(
        'Remote processing worker is not configured: WORKER_URL environment variable is missing.'
      );
    }
  }

  public async transcribe(
    mediaPathOrUrl: string,
    options?: TranscribeOptions
  ): Promise<TranscriptionServiceResult> {
    this.checkConfig();
    const endpoint = `${this.config.workerUrl.replace(/\/+$/, '')}/api/worker/transcribe`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.workerSecret}`,
      },
      body: JSON.stringify({
        mediaPathOrUrl,
        language: options?.language,
        forceRefresh: options?.forceRefresh,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.message || `Remote worker transcription failed with HTTP ${res.status}`
      );
    }

    return res.json();
  }

  public async getHealth(): Promise<{ status: string; engine: string; available: boolean }> {
    if (!this.config.workerUrl) {
      return { status: 'unconfigured', engine: 'remote-worker', available: false };
    }
    try {
      const endpoint = `${this.config.workerUrl.replace(/\/+$/, '')}/api/health`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${this.config.workerSecret}` },
      });
      const data = await res.json();
      return {
        status: res.ok ? 'ready' : 'unhealthy',
        engine: data.engine || 'remote-worker',
        available: res.ok,
      };
    } catch {
      return { status: 'unreachable', engine: 'remote-worker', available: false };
    }
  }
}

class RemoteRenderService implements IRenderService {
  constructor(private config: RemoteWorkerConfig) {}

  private checkConfig(): void {
    if (!this.config.workerUrl) {
      throw new Error(
        'Remote processing worker is not configured: WORKER_URL environment variable is missing.'
      );
    }
  }

  public async render(
    renderPlan: RenderPlan,
    options?: RenderOptions
  ): Promise<RenderServiceResult> {
    this.checkConfig();
    const endpoint = `${this.config.workerUrl.replace(/\/+$/, '')}/api/worker/render`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.workerSecret}`,
      },
      body: JSON.stringify({
        jobId: `render_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        jobType: 'render',
        projectId: renderPlan.projectId,
        shortId: renderPlan.shortId,
        renderPlan,
        options,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Remote worker render failed with HTTP ${res.status}`);
    }

    return res.json();
  }

  public async getJobStatus(jobId: string): Promise<RenderServiceResult> {
    this.checkConfig();
    const endpoint = `${this.config.workerUrl.replace(/\/+$/, '')}/api/worker/render/${jobId}`;

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${this.config.workerSecret}` },
    });

    if (!res.ok) {
      return {
        jobId,
        status: 'failed',
        error: `Remote worker returned HTTP ${res.status}`,
      };
    }

    return res.json();
  }

  public async cancelRender(jobId: string): Promise<void> {
    this.checkConfig();
    const endpoint = `${this.config.workerUrl.replace(/\/+$/, '')}/api/worker/render/${jobId}/cancel`;
    await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.config.workerSecret}` },
    });
  }
}

class RemoteYoutubeService implements IYoutubeService {
  constructor(private config: RemoteWorkerConfig) {}

  private checkConfig(): void {
    if (!this.config.workerUrl) {
      throw new Error(
        'Remote processing worker is not configured: WORKER_URL environment variable is missing.'
      );
    }
  }

  public async download(
    url: string,
    destDir?: string,
    options?: YoutubeDownloadOptions
  ): Promise<YoutubeDownloadResult> {
    this.checkConfig();
    const endpoint = `${this.config.workerUrl.replace(/\/+$/, '')}/api/worker/youtube`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.workerSecret}`,
      },
      body: JSON.stringify({ url, destDir }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.message || `Remote worker YouTube download failed with HTTP ${res.status}`
      );
    }

    return res.json();
  }

  public getStatus(): { available: boolean; binary: string | null } {
    return {
      available: Boolean(this.config.workerUrl),
      binary: this.config.workerUrl ? 'remote-yt-dlp' : null,
    };
  }
}

class RemoteMediaInspectionService implements IMediaInspectionService {
  constructor(private config: RemoteWorkerConfig) {}

  public async inspect(filePathOrUrl: string): Promise<SourceMediaQualityInfo> {
    if (!this.config.workerUrl) {
      throw new Error(
        'Remote processing worker is not configured: WORKER_URL environment variable is missing.'
      );
    }

    const endpoint = `${this.config.workerUrl.replace(/\/+$/, '')}/api/worker/inspect?url=${encodeURIComponent(filePathOrUrl)}`;
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${this.config.workerSecret}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.message || `Remote worker media inspection failed with HTTP ${res.status}`
      );
    }

    return res.json();
  }
}
