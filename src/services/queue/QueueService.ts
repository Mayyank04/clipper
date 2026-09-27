/**
 * VIRALCLIP STUDIO — DURABLE JOB QUEUE & REAL-TIME SSE BROADCASTER
 * Integrates Redis + BullMQ with retry policies, exponential backoff,
 * database persistence via PostgresDatabase, and Server-Sent Events (SSE) broadcasting.
 */

import EventEmitter from 'events';
import { Response } from 'express';
import { Queue, QueueEvents, Job as BullJob } from 'bullmq';
import IORedis from 'ioredis';
import { PostgresDatabase } from '../database/PostgresDatabase';

export type JobType =
  | 'media-ingestion'
  | 'transcription'
  | 'short-generation'
  | 'render'
  | 'youtube-download';

export type JobStage =
  | 'QUEUED'
  | 'STARTING'
  | 'DOWNLOADING'
  | 'PROBING'
  | 'EXTRACTING_AUDIO'
  | 'TRANSCRIBING'
  | 'GENERATING_CAPTIONS'
  | 'ANALYZING_MOMENTS'
  | 'PREPARING_BROLL'
  | 'PREPARING_AUDIO'
  | 'RENDERING'
  | 'UPLOADING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface PersistentJobData<TPayload = any> {
  id: string;
  projectId?: string;
  mediaId?: string;
  type: JobType;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0 to 100
  stage: JobStage;
  message: string;
  etaSeconds?: number;
  speed?: string;
  error?: string;
  errorCode?: string;
  workerId?: string;
  payload: TPayload;
  result?: any;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export class QueueService extends EventEmitter {
  private static instance: QueueService | null = null;
  private redisConnection: IORedis | null = null;
  private isRedisConnected: boolean = false;
  private queues: Map<JobType, Queue> = new Map();
  private sseClients: Map<string, Set<Response>> = new Map();
  private db: PostgresDatabase;

  // In-memory fallback queue for local development without Redis
  private inMemoryQueue: Map<string, PersistentJobData> = new Map();

  constructor() {
    super();
    this.setMaxListeners(200);
    this.db = PostgresDatabase.getInstance();

    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redisConnection = new IORedis(redisUrl, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          retryStrategy: (times) => Math.min(times * 200, 2000),
        });

        this.redisConnection.on('connect', () => {
          this.isRedisConnected = true;
          console.log('[QueueService] Connected to Redis. Initializing BullMQ queues...');
          this.initBullQueues();
        });

        this.redisConnection.on('error', (err) => {
          this.isRedisConnected = false;
          console.warn(`[QueueService] Redis connection error: ${err.message}. Operating with local queue.`);
        });
      } catch (err: any) {
        console.warn(`[QueueService] Failed to initialize Redis: ${err.message}.`);
      }
    } else {
      console.log('[QueueService] No REDIS_URL configured. Operating in local in-process queue mode.');
    }
  }

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  private initBullQueues(): void {
    if (!this.redisConnection) return;

    const queueTypes: JobType[] = [
      'media-ingestion',
      'transcription',
      'short-generation',
      'render',
      'youtube-download',
    ];

    queueTypes.forEach((type) => {
      const q = new Queue(type, {
        connection: this.redisConnection!,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: { age: 86400, count: 500 },
          removeOnFail: { age: 86400 * 7, count: 1000 },
        },
      });
      this.queues.set(type, q);
    });
  }

  public isRedisActive(): boolean {
    return this.isRedisConnected;
  }

  /**
   * Enqueue a job into durable Redis queue or in-memory queue.
   */
  public async addJob<T = any>(
    type: JobType,
    payload: T,
    options?: {
      jobId?: string;
      projectId?: string;
      mediaId?: string;
      initialMessage?: string;
    }
  ): Promise<PersistentJobData<T>> {
    const id = options?.jobId || `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const jobData: PersistentJobData<T> = {
      id,
      projectId: options?.projectId,
      mediaId: options?.mediaId,
      type,
      status: 'queued',
      progress: 0,
      stage: 'QUEUED',
      message: options?.initialMessage || `Job ${type} enqueued for processing`,
      payload,
      createdAt: now,
    };

    // 1. Persist to DB immediately
    await this.db.saveJob(jobData);
    this.inMemoryQueue.set(id, jobData);

    // 2. Enqueue to BullMQ if Redis is active
    const q = this.queues.get(type);
    if (q && this.isRedisConnected) {
      await q.add(type, jobData, { jobId: id });
    }

    // 3. Broadcast initial status
    this.broadcastJobUpdate(jobData);

    return jobData;
  }

  /**
   * Retrieve job state from DB or memory.
   */
  public async getJob(jobId: string): Promise<PersistentJobData | null> {
    const fromMem = this.inMemoryQueue.get(jobId);
    if (fromMem && fromMem.status === 'processing') {
      return fromMem;
    }

    const fromDb = await this.db.getJob(jobId);
    if (fromDb) {
      this.inMemoryQueue.set(jobId, fromDb);
      return fromDb;
    }

    return fromMem || null;
  }

  /**
   * Update progress, stage, message, and persist.
   */
  public async updateJobProgress(
    jobId: string,
    progress: number,
    stage?: JobStage,
    message?: string,
    extra?: Partial<PersistentJobData>
  ): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;

    job.progress = Math.min(100, Math.max(0, Math.round(progress)));
    if (stage) job.stage = stage;
    if (message) job.message = message;
    if (extra?.etaSeconds !== undefined) job.etaSeconds = extra.etaSeconds;
    if (extra?.speed) job.speed = extra.speed;
    if (extra?.result) job.result = extra.result;

    if (job.status === 'queued' && progress > 0) {
      job.status = 'processing';
      job.startedAt = job.startedAt || new Date().toISOString();
    }

    if (progress >= 100 || stage === 'COMPLETED') {
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
    }

    this.inMemoryQueue.set(jobId, job);
    await this.db.saveJob(job);
    this.broadcastJobUpdate(job);
  }

  /**
   * Mark a job as failed with actionable error codes.
   */
  public async failJob(jobId: string, errorCode: string, errorMessage: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;

    job.status = 'failed';
    job.stage = 'FAILED';
    job.errorCode = errorCode;
    job.error = errorMessage;
    job.message = errorMessage;
    job.completedAt = new Date().toISOString();

    this.inMemoryQueue.set(jobId, job);
    await this.db.saveJob(job);
    this.broadcastJobUpdate(job);
  }

  /**
   * Cancel an active or queued job.
   */
  public async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
    if (!job) return false;

    job.status = 'cancelled';
    job.stage = 'CANCELLED';
    job.message = 'Job was cancelled by user';
    job.completedAt = new Date().toISOString();

    this.inMemoryQueue.set(jobId, job);
    await this.db.saveJob(job);
    this.broadcastJobUpdate(job);
    this.emit(`cancelled:${jobId}`);

    return true;
  }

  // ============================================================================
  // SERVER-SENT EVENTS (SSE) MANAGEMENT
  // ============================================================================

  public addSSEClient(jobId: string, res: Response): void {
    if (!this.sseClients.has(jobId)) {
      this.sseClients.set(jobId, new Set());
    }
    this.sseClients.get(jobId)!.add(res);

    // Send immediate snapshot
    this.getJob(jobId).then((job) => {
      if (job) {
        res.write(`data: ${JSON.stringify(job)}\n\n`);
      }
    });

    res.on('close', () => {
      const clients = this.sseClients.get(jobId);
      if (clients) {
        clients.delete(res);
        if (clients.size === 0) {
          this.sseClients.delete(jobId);
        }
      }
    });
  }

  public broadcastJobUpdate(job: PersistentJobData): void {
    this.emit('job:update', job);
    this.emit(`job:${job.id}`, job);

    const clients = this.sseClients.get(job.id);
    if (clients && clients.size > 0) {
      const payload = `data: ${JSON.stringify(job)}\n\n`;
      clients.forEach((res) => {
        try {
          res.write(payload);
        } catch {
          clients.delete(res);
        }
      });
    }
  }

  public getHealth(): {
    status: string;
    engine: string;
    activeQueues: string[];
    isRedisConnected: boolean;
  } {
    return {
      status: this.isRedisConnected ? 'healthy' : 'local-in-process',
      engine: this.isRedisConnected ? 'Redis+BullMQ' : 'InProcessQueue',
      activeQueues: Array.from(this.queues.keys()),
      isRedisConnected: this.isRedisConnected,
    };
  }
}
