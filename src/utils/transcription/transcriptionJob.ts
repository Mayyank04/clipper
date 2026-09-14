/**
 * VIRALCLIP STUDIO — TRANSCRIPTION JOB MANAGER
 * Dedicated state machine orchestrating audio transcription with:
 * - Active heartbeats (processedSeconds / totalSeconds)
 * - Provider timeout guards and fallbacks
 * - Word timestamp validation
 * - Dynamic stage and progress reporting
 */

import {
  TranscriptionJobStage,
  CanonicalTranscriptionErrorCode,
  TranscriptionError,
  ProviderHealth,
} from './types';
import { TranscriptionManager, ManagerTranscribeResult } from './TranscriptionManager';

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
  heartbeatAt: number;
  startedAt: number;
  updatedAt: number;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  providerUsed?: string;
  model?: string;
  device?: string;
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
  private readonly DEFAULT_JOB_TIMEOUT_MS = 300000; // 5 minutes max

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
      job.heartbeatAt = Date.now();
      onUpdate?.(job);
    };

    // Heartbeat ticker to ensure the UI receives continuous pulse even during heavy compute
    const heartbeatTimer = setInterval(() => {
      if (job.status !== 'running') {
        clearInterval(heartbeatTimer);
        return;
      }
      job.heartbeatAt = Date.now();
      const elapsedSec = (Date.now() - job.startedAt) / 1000;
      
      // Gradually increment processedSeconds estimate if in TRANSCRIBING stage
      if (job.stage === 'TRANSCRIBING' && job.processedSeconds < job.totalSeconds * 0.9) {
        job.processedSeconds = Math.min(job.totalSeconds * 0.9, Math.round(elapsedSec * 1.5));
      }
      notify();
    }, 2000);

    // Hard timeout guard
    const timeoutTimer = setTimeout(() => {
      if (job.status === 'running') {
        job.status = 'timeout';
        job.stage = 'FAILED';
        job.stageMessage = `Transcription timed out after ${this.DEFAULT_JOB_TIMEOUT_MS / 1000}s`;
        job.error = {
          code: 'TRANSCRIPTION_TIMEOUT',
          message: `Transcription timed out after ${this.DEFAULT_JOB_TIMEOUT_MS / 1000}s.`,
        };
        clearInterval(heartbeatTimer);
        notify();
      }
    }, this.DEFAULT_JOB_TIMEOUT_MS);

    try {
      job.stage = 'EXTRACTING_AUDIO';
      job.progressPercent = 15;
      job.stageMessage = 'Extracting and verifying audio stream...';
      notify();

      const manager = TranscriptionManager.getInstance();

      const result = await manager.transcribe({
        sourceMediaPath,
        startTime: 0,
        duration: totalDuration,
        language: language || 'auto',
        forceRefresh: options.forceRefresh,
        onProgress: (stage, message, percent) => {
          if (job.status === 'timeout') return;
          job.stage = stage;
          job.stageMessage = message;
          job.progressPercent = percent;

          if (stage === 'TRANSCRIBING') {
            job.processedSeconds = Math.max(job.processedSeconds, Math.round(job.totalSeconds * 0.5));
          } else if (stage === 'ALIGNING' || stage === 'BUILDING_CAPTIONS') {
            job.processedSeconds = job.totalSeconds;
          }

          notify();
        },
      });

      if (job.status === 'timeout') {
        throw new TranscriptionError('TRANSCRIPTION_TIMEOUT', 'Transcription exceeded execution deadline');
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
      if (job.status !== 'timeout') {
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
