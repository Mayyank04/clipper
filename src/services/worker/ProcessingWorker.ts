/**
 * VIRALCLIP STUDIO — UNIVERSAL PROCESSING WORKER SERVICE
 * Unified abstraction orchestrating media processing across local dev or cloud worker environments.
 * Deployable to Railway, Render, Fly.io, Modal, RunPod, AWS ECS, or dedicated VPS.
 */

import { PostgresDatabase } from '../database/PostgresDatabase';
import { StorageProvider } from '../storage/StorageProvider';
import { QueueService } from '../queue/QueueService';
import {
  IProcessingWorker,
  WorkerHealth,
  ProcessingJobType,
} from './types';
import { WorkerClient } from './workerClient';
import { ProcessingJobRecord, ProcessingJobEventRecord } from '../../types';

export class ProcessingWorker implements IProcessingWorker {
  private static instance: ProcessingWorker | null = null;
  private db: PostgresDatabase;
  private storage: StorageProvider;
  private queue: QueueService;
  private workerClient: WorkerClient;
  private workerId: string;

  constructor() {
    this.db = PostgresDatabase.getInstance();
    this.storage = StorageProvider.getInstance();
    this.queue = QueueService.getInstance();
    this.workerClient = new WorkerClient();
    this.workerId = `worker_${process.pid}_${Math.random().toString(36).slice(2, 7)}`;
  }

  public static getInstance(): ProcessingWorker {
    if (!ProcessingWorker.instance) {
      ProcessingWorker.instance = new ProcessingWorker();
    }
    return ProcessingWorker.instance;
  }

  public isRemoteWorkerConfigured(): boolean {
    return this.workerClient.isConfigured();
  }

  public getWorkerClient(): WorkerClient {
    return this.workerClient;
  }

  /**
   * Health status of processing subsystems.
   */
  public async getHealth(): Promise<WorkerHealth> {
    if (this.workerClient.isConfigured()) {
      return this.workerClient.getHealth();
    }

    const dbHealth = await this.db.getHealth();
    const isCloud = this.storage.isCloudStorage();

    return {
      status: 'ready',
      workerId: this.workerId,
      engine: 'ViralClip-LocalWorker',
      isRemote: false,
      ffmpeg: true,
      ffprobe: true,
      python: true,
      whisper: true,
      storage: isCloud,
      database: dbHealth.connected,
      details: {
        mode: 'in-process-local',
        storageEngine: isCloud ? 'S3/R2' : 'LocalStorage',
        databaseEngine: dbHealth.engine,
      },
    };
  }

  /**
   * Dispatch a universal processing job.
   * Immediately records the job in PostgreSQL and returns { id, status: 'QUEUED' }.
   */
  public async dispatchJob<TInput = any>(
    type: ProcessingJobType,
    input: TInput,
    options?: {
      jobId?: string;
      sourceId?: string;
      projectId?: string;
    }
  ): Promise<ProcessingJobRecord> {
    const jobId = options?.jobId || `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const jobRecord: ProcessingJobRecord = {
      id: jobId,
      type,
      status: 'QUEUED',
      progress: 0,
      stage: 'QUEUED',
      input: input || {},
      sourceId: options?.sourceId,
      createdAt: now,
    };

    // 1. Persist initial queued state to PostgreSQL
    await this.db.saveProcessingJob(jobRecord);
    await this.recordEvent(jobId, 'QUEUED', 0, `Job ${type} enqueued for processing`);

    // 2. Dispatch to remote worker or local runner
    if (this.workerClient.isConfigured()) {
      // Fire-and-forget remote worker dispatch (worker will update PostgreSQL)
      this.workerClient.dispatchJob(type, input, { jobId, sourceId: options?.sourceId }).catch(async (err) => {
        console.error(`[ProcessingWorker] Remote worker dispatch failed for ${jobId}:`, err);
        await this.db.updateProcessingJobProgress(jobId, 0, 'FAILED', { error: err.message }, 'FAILED');
      });
    } else {
      // If QueueService is connected to BullMQ, publish to queue
      this.queue.addJob(type as any, input, { jobId, projectId: options?.projectId }).catch((err) => {
        console.warn(`[ProcessingWorker] Queue add warning for ${jobId}:`, err);
      });
    }

    return jobRecord;
  }

  public async getJobStatus(jobId: string): Promise<ProcessingJobRecord | null> {
    const fromDb = await this.db.getProcessingJob(jobId);
    if (fromDb) return fromDb;

    if (this.workerClient.isConfigured()) {
      return this.workerClient.getJobStatus(jobId);
    }

    return null;
  }

  public async cancelJob(jobId: string): Promise<boolean> {
    await this.db.updateProcessingJobProgress(jobId, 0, 'CANCELLED', undefined, 'CANCELLED');
    await this.recordEvent(jobId, 'CANCELLED', 0, 'Job was cancelled');

    if (this.workerClient.isConfigured()) {
      return this.workerClient.cancelJob(jobId);
    }

    return this.queue.cancelJob(jobId);
  }

  private async recordEvent(jobId: string, stage: string, progress: number, message: string, metadata?: any): Promise<void> {
    const event: ProcessingJobEventRecord = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      jobId,
      stage,
      progress,
      message,
      metadata,
      createdAt: new Date().toISOString(),
    };
    await this.db.saveProcessingJobEvent(event);
  }
}

export const processingWorker = ProcessingWorker.getInstance();
