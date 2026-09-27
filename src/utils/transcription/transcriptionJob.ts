/**
 * VIRALCLIP STUDIO — TRANSCRIPTION JOB MANAGER
 * Dedicated state machine orchestrating audio transcription with:
 * - Active 1-second heartbeats and real-time audio progress
 * - Truthful metrics: real audio processed (s), words, segments, realtime factor, ETA
 * - Dynamic stall detection (10s warning, 30s diagnostics, 60s unhealthy)
 * - Adaptive duration-aware timeouts (never hard-kills 8-10m videos prematurely)
 * - Graceful job cancellation via Python worker IPC
 */

import {
  TranscriptionJobStage,
  CanonicalTranscriptionErrorCode,
  TranscriptionError,
} from './types';
import { TranscriptionManager, ManagerTranscribeResult } from './TranscriptionManager';
import { PythonWhisperProvider } from './providers/PythonWhisperProvider';

export interface ActiveTranscriptionJob {
  id: string;
  sourceMediaId?: string;
  stage: TranscriptionJobStage;
  progressPercent: number;
  stageMessage: string;
  processedSeconds: number;
  totalSeconds: number;
  wordsGenerated: number;
  segmentsGenerated: number;
  realtimeSpeed?: number;
  etaSeconds?: number;
  backend?: string;
  device?: string;
  workerPid?: number;
  currentChunkIndex?: number;
  totalChunks?: number;
  stallWarning?: boolean;
  stallDiagnostic?: boolean;
  stallUnhealthy?: boolean;
  heartbeatAt: number;
  startedAt: number;
  updatedAt: number;
  status: 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';
  providerUsed?: string;
  model?: string;
  error?: {
    code: CanonicalTranscriptionErrorCode;
    message: string;
  };
  result?: ManagerTranscribeResult;
}

export interface RunTranscriptionOptions {
  jobId: string;
  sourceMediaPath: string;
  sourceMediaId?: string;
  totalDuration: number;
  language?: string;
  title?: string;
  topic?: string;
  forceRefresh?: boolean;
  onUpdate?: (job: ActiveTranscriptionJob) => void;
}

export class TranscriptionJobManager {
  private static instance: TranscriptionJobManager | null = null;
  private jobs = new Map<string, ActiveTranscriptionJob>();

  private constructor() {}

  public static getInstance(): TranscriptionJobManager {
    if (!TranscriptionJobManager.instance) {
      TranscriptionJobManager.instance = new TranscriptionJobManager();
    }
    return TranscriptionJobManager.instance;
  }

  public getJob(id: string): ActiveTranscriptionJob | undefined {
    return this.jobs.get(id);
  }

  public getAllJobs(): ActiveTranscriptionJob[] {
    return Array.from(this.jobs.values());
  }

  public cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    job.status = 'cancelled';
    job.stage = 'CANCELLED';
    job.stageMessage = 'Transcription cancelled by user.';
    job.updatedAt = Date.now();

    // Terminate worker child process
    PythonWhisperProvider.cancelJob(id);
    return true;
  }

  public registerJob(id: string, totalSeconds: number, sourceMediaId?: string): ActiveTranscriptionJob {
    const job: ActiveTranscriptionJob = {
      id,
      sourceMediaId,
      stage: 'QUEUED',
      progressPercent: 0,
      stageMessage: 'Transcription job queued...',
      processedSeconds: 0,
      totalSeconds: Math.max(1, totalSeconds || 30),
      wordsGenerated: 0,
      segmentsGenerated: 0,
      heartbeatAt: Date.now(),
      startedAt: Date.now(),
      updatedAt: Date.now(),
      status: 'running',
    };
    this.jobs.set(id, job);
    return job;
  }

  public updateHeartbeat(id: string, stage?: TranscriptionJobStage, message?: string, progress?: number): void {
    const job = this.jobs.get(id);
    if (!job) return;
    job.heartbeatAt = Date.now();
    job.updatedAt = Date.now();
    if (stage) job.stage = stage;
    if (message) job.stageMessage = message;
    if (typeof progress === 'number') job.progressPercent = Math.min(100, Math.max(0, progress));
  }

  /**
   * Runs the complete transcription pipeline with active heartbeats and timeouts.
   */
  public async executeJob(options: RunTranscriptionOptions): Promise<ManagerTranscribeResult> {
    const { jobId, sourceMediaPath, sourceMediaId, totalDuration, language, onUpdate } = options;
    const job = this.registerJob(jobId, totalDuration, sourceMediaId);

    const notify = () => {
      job.updatedAt = Date.now();
      onUpdate?.(job);
    };

    // Adaptive duration-aware timeout: at least 10 minutes (600s), plus 4x video duration
    const timeoutMs = Math.max(600000, Math.round(totalDuration * 4000));

    // Active heartbeat and stall-detection ticker (emits every 1 second)
    const heartbeatTimer = setInterval(() => {
      if (job.status !== 'running') {
        clearInterval(heartbeatTimer);
        return;
      }

      const now = Date.now();
      const heartbeatAge = now - job.heartbeatAt;

      // Stall detection:
      // > 10s: stallWarning
      // > 30s: stallDiagnostic
      // > 60s: stallUnhealthy
      if (heartbeatAge > 60000) {
        job.stallUnhealthy = true;
        job.stageMessage = 'Worker stalled (no heartbeat for >60s).';
      } else if (heartbeatAge > 30000) {
        job.stallDiagnostic = true;
        job.stageMessage = 'Whisper processing taking longer than expected...';
      } else if (heartbeatAge > 10000) {
        job.stallWarning = true;
      } else {
        job.stallWarning = false;
        job.stallDiagnostic = false;
        job.stallUnhealthy = false;
      }

      notify();
    }, 1000);

    // Hard timeout guard
    const timeoutTimer = setTimeout(() => {
      if (job.status === 'running') {
        job.status = 'timeout';
        job.stage = 'FAILED';
        job.stageMessage = `Transcription timed out after ${Math.round(timeoutMs / 1000)}s`;
        job.error = {
          code: 'TRANSCRIPTION_TIMEOUT',
          message: `Transcription timed out after ${Math.round(timeoutMs / 1000)}s.`,
        };
        PythonWhisperProvider.cancelJob(jobId);
        clearInterval(heartbeatTimer);
        notify();
      }
    }, timeoutMs);

    try {
      job.stage = 'EXTRACTING_AUDIO';
      job.progressPercent = 10;
      job.stageMessage = 'Extracting and verifying audio stream...';
      notify();

      const manager = TranscriptionManager.getInstance();

      const result = await manager.transcribe({
        jobId,
        sourceMediaPath,
        sourceMediaId,
        startTime: 0,
        duration: totalDuration,
        language: language || 'auto',
        forceRefresh: options.forceRefresh,
        onProgress: (stage, message, percent) => {
          if (job.status === 'timeout' || job.status === 'cancelled') return;
          job.stage = stage;
          job.stageMessage = message;
          job.progressPercent = percent;
          job.heartbeatAt = Date.now();
          notify();
        },
        onProgressEvent: (evt) => {
          if (job.status === 'timeout' || job.status === 'cancelled') return;
          job.heartbeatAt = Date.now();
          if (typeof evt.audioProcessed === 'number') {
            job.processedSeconds = evt.audioProcessed;
          }
          if (typeof evt.audioTotal === 'number' && evt.audioTotal > 0) {
            job.totalSeconds = evt.audioTotal;
          }
          if (typeof evt.words === 'number') job.wordsGenerated = evt.words;
          if (typeof evt.segments === 'number') job.segmentsGenerated = evt.segments;
          if (typeof evt.realtimeFactor === 'number') job.realtimeSpeed = evt.realtimeFactor;
          if (typeof evt.eta === 'number') job.etaSeconds = evt.eta;
          if (evt.backend) job.backend = evt.backend;
          if (evt.device) job.device = evt.device;
          if (evt.pid) job.workerPid = evt.pid;
          if (evt.chunkIndex && evt.chunkTotal) {
            job.currentChunkIndex = evt.chunkIndex;
            job.totalChunks = evt.chunkTotal;
          }
          if (evt.message) job.stageMessage = evt.message;
          if (typeof evt.progress === 'number') {
            job.progressPercent = Math.min(100, Math.max(0, evt.progress));
          }
          notify();
        },
      });

      if (job.status === 'timeout') {
        throw new TranscriptionError('TRANSCRIPTION_TIMEOUT', 'Transcription exceeded execution deadline');
      }
      if (job.status === 'cancelled') {
        throw new TranscriptionError('TRANSCRIPTION_FAILED', 'Transcription was cancelled by user');
      }

      // Successful completion
      job.status = 'completed';
      job.stage = 'COMPLETED';
      job.progressPercent = 100;
      job.processedSeconds = job.totalSeconds;
      job.stageMessage = `Transcription completed successfully (${result.canonicalTranscript.segments.length} segments)`;
      job.providerUsed = result.providerUsed;
      job.model = result.model;
      job.device = result.device;
      job.segmentsGenerated = result.canonicalTranscript.segments.length;
      job.wordsGenerated = result.canonicalTranscript.segments.reduce(
        (sum, seg) => sum + (seg.words ? seg.words.length : 0),
        0
      );
      job.result = result;
      notify();

      return result;
    } catch (err: any) {
      if (job.status !== 'timeout' && job.status !== 'cancelled') {
        job.status = 'failed';
        job.stage = 'FAILED';
        job.stageMessage = err?.message || 'Transcription failed';
        job.error = {
          code: err?.code || 'TRANSCRIPTION_FAILED',
          message: err?.message || String(err),
        };
        notify();
      }
      throw err;
    } finally {
      clearInterval(heartbeatTimer);
      clearTimeout(timeoutTimer);
    }
  }
}
