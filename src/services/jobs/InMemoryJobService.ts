/**
 * VIRALCLIP STUDIO — IN-MEMORY / DISK JOURNALED JOB SERVICE
 * Default IJobService implementation for development and serverless runtime.
 */

import fs from 'fs';
import path from 'path';
import { IJobService, JobRecord, CreateJobParams, JobFilter } from './types';

export class InMemoryJobService implements IJobService {
  private jobs = new Map<string, JobRecord>();
  private storageDir: string;

  constructor(storageDir?: string) {
    this.storageDir = storageDir || path.resolve(process.cwd(), 'data', 'jobs');
    this.initDiskStorage();
  }

  private initDiskStorage(): void {
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      } else {
        const files = fs.readdirSync(this.storageDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const content = fs.readFileSync(path.join(this.storageDir, file), 'utf8');
              const record: JobRecord = JSON.parse(content);
              if (record && record.id) {
                this.jobs.set(record.id, record);
              }
            } catch {}
          }
        }
      }
    } catch {
      // In serverless read-only environments, continue in-memory
    }
  }

  private persistJob(job: JobRecord): void {
    try {
      if (fs.existsSync(this.storageDir)) {
        const filePath = path.join(this.storageDir, `${job.id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(job, null, 2), 'utf8');
      }
    } catch {
      // Serverless fallback
    }
  }

  public async createJob<TPayload = any>(params: CreateJobParams<TPayload>): Promise<JobRecord> {
    const now = new Date().toISOString();
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const job: JobRecord = {
      id,
      type: params.type,
      status: 'queued',
      progress: 0,
      stage: params.initialStage || 'queued',
      message: params.initialMessage || 'Job queued for processing',
      projectId: params.projectId,
      mediaId: params.mediaId,
      payload: params.payload,
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(id, job);
    this.persistJob(job);
    return job;
  }

  public async getJob(jobId: string): Promise<JobRecord | null> {
    const job = this.jobs.get(jobId);
    return job ? { ...job } : null;
  }

  public async updateProgress(
    jobId: string,
    progress: number,
    stage?: string,
    message?: string
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.progress = Math.min(100, Math.max(0, Math.round(progress)));
    if (stage) job.stage = stage;
    if (message) job.message = message;
    if (job.status === 'queued' && progress > 0) {
      job.status = 'processing';
      job.startedAt = job.startedAt || new Date().toISOString();
    }
    job.updatedAt = new Date().toISOString();

    this.jobs.set(jobId, job);
    this.persistJob(job);
  }

  public async completeJob<TResult = any>(jobId: string, result: TResult): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const now = new Date().toISOString();
    job.status = 'completed';
    job.progress = 100;
    job.stage = 'complete';
    job.message = 'Processing completed successfully';
    job.result = result;
    job.updatedAt = now;
    job.completedAt = now;

    this.jobs.set(jobId, job);
    this.persistJob(job);
  }

  public async failJob(
    jobId: string,
    error: { code: string; message: string; details?: any }
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const now = new Date().toISOString();
    job.status = 'failed';
    job.stage = 'failed';
    job.message = error.message;
    job.error = error;
    job.updatedAt = now;
    job.completedAt = now;

    this.jobs.set(jobId, job);
    this.persistJob(job);
  }

  public async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const now = new Date().toISOString();
    job.status = 'cancelled';
    job.stage = 'cancelled';
    job.message = 'Job was cancelled by user';
    job.updatedAt = now;
    job.completedAt = now;

    this.jobs.set(jobId, job);
    this.persistJob(job);
  }

  public async listJobs(filter?: JobFilter): Promise<JobRecord[]> {
    let list = Array.from(this.jobs.values());

    if (filter) {
      if (filter.type) list = list.filter((j) => j.type === filter.type);
      if (filter.status) list = list.filter((j) => j.status === filter.status);
      if (filter.projectId) list = list.filter((j) => j.projectId === filter.projectId);
      if (filter.mediaId) list = list.filter((j) => j.mediaId === filter.mediaId);
      if (filter.limit && filter.limit > 0) list = list.slice(0, filter.limit);
    }

    return list.map((j) => ({ ...j }));
  }
}
