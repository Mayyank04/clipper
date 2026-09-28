/**
 * VIRALCLIP STUDIO — REMOTE WORKER HTTP CLIENT
 * Secure REST client with Bearer auth, exponential backoff, and timeouts for external workers.
 */

import { WorkerHealth, ProcessingJobRecord } from './types';

export class WorkerClient {
  private baseUrl: string;
  private secret: string;

  constructor(baseUrl?: string, secret?: string) {
    this.baseUrl = (baseUrl || process.env.WORKER_URL || '').replace(/\/+$/, '');
    this.secret = secret || process.env.WORKER_SECRET || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.baseUrl);
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T = any>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: any;
      timeoutMs?: number;
      retries?: number;
    } = {}
  ): Promise<T> {
    if (!this.baseUrl) {
      throw new Error('Remote WORKER_URL is not configured');
    }

    const { method = 'GET', body, timeoutMs = 30000, retries = 2 } = options;
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.secret) {
      headers.Authorization = `Bearer ${this.secret}`;
    }

    let lastError: any = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Worker HTTP ${response.status}: ${errText || response.statusText}`);
        }

        return (await response.json()) as T;
      } catch (err: any) {
        lastError = err;
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 500;
          await new Promise((res) => setTimeout(res, delay));
        }
      }
    }

    throw lastError || new Error(`Failed to communicate with worker at ${url}`);
  }

  public async getHealth(): Promise<WorkerHealth> {
    try {
      const data = await this.request<any>('/api/health', { timeoutMs: 5000, retries: 1 });
      return {
        status: data.status === 'healthy' || data.status === 'ok' ? 'ready' : 'degraded',
        workerId: data.workerId || 'remote_worker',
        engine: data.engine || 'Remote-Worker',
        isRemote: true,
        workerUrl: this.baseUrl,
        ffmpeg: Boolean(data.ffmpeg),
        ffprobe: Boolean(data.ffprobe),
        python: Boolean(data.python ?? true),
        whisper: Boolean(data.whisper),
        storage: Boolean(data.storage),
        database: Boolean(data.database),
        details: data,
      };
    } catch (err: any) {
      return {
        status: 'unavailable',
        workerId: 'unreachable_worker',
        engine: 'Remote-Worker',
        isRemote: true,
        workerUrl: this.baseUrl,
        ffmpeg: false,
        ffprobe: false,
        python: false,
        whisper: false,
        storage: false,
        database: false,
        details: { error: err.message },
      };
    }
  }

  public async dispatchJob(type: string, input: any, options?: { jobId?: string; sourceId?: string }): Promise<ProcessingJobRecord> {
    return this.request<ProcessingJobRecord>('/api/worker/dispatch', {
      method: 'POST',
      body: {
        type,
        input,
        jobId: options?.jobId,
        sourceId: options?.sourceId,
      },
    });
  }

  public async getJobStatus(jobId: string): Promise<ProcessingJobRecord | null> {
    try {
      return await this.request<ProcessingJobRecord>(`/api/worker/jobs/${jobId}`);
    } catch {
      return null;
    }
  }

  public async cancelJob(jobId: string): Promise<boolean> {
    try {
      const res = await this.request<{ success: boolean }>(`/api/worker/jobs/${jobId}/cancel`, {
        method: 'POST',
      });
      return Boolean(res.success);
    } catch {
      return false;
    }
  }

  public async importPresets(data: any): Promise<any> {
    return this.request<any>('/api/worker/import-presets', {
      method: 'POST',
      body: data,
      timeoutMs: 120000, // 2 min per batch chunk
    });
  }

  public async convertPresets(data: any): Promise<any> {
    return this.request<any>('/api/worker/convert-presets', {
      method: 'POST',
      body: data,
    });
  }

  public async generatePreview(data: any): Promise<any> {
    return this.request<any>('/api/worker/generate-preview', {
      method: 'POST',
      body: data,
    });
  }

  public async transcribe(data: any): Promise<any> {
    return this.request<any>('/api/worker/transcribe', {
      method: 'POST',
      body: data,
      timeoutMs: 180000,
    });
  }

  public async render(data: any): Promise<any> {
    return this.request<any>('/api/worker/render', {
      method: 'POST',
      body: data,
      timeoutMs: 300000,
    });
  }
}
