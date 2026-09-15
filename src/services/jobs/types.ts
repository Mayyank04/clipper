/**
 * VIRALCLIP STUDIO — JOB SERVICE TYPES
 * Unified job model across background workers and serverless orchestrators.
 */

export type JobType =
  | 'youtube_download'
  | 'transcription'
  | 'ai_shorts'
  | 'broll'
  | 'sfx'
  | 'render'
  | 'audio_to_video';

export type JobStatus =
  | 'queued'
  | 'preparing'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface JobRecord<TResult = any> {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number; // 0 - 100
  stage: string;
  message?: string;
  projectId?: string;
  mediaId?: string;
  payload?: any;
  result?: TResult;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface CreateJobParams<TPayload = any> {
  type: JobType;
  projectId?: string;
  mediaId?: string;
  payload?: TPayload;
  initialStage?: string;
  initialMessage?: string;
}

export interface JobFilter {
  type?: JobType;
  status?: JobStatus;
  projectId?: string;
  mediaId?: string;
  limit?: number;
}

export interface IJobService {
  createJob<TPayload = any>(params: CreateJobParams<TPayload>): Promise<JobRecord>;
  getJob(jobId: string): Promise<JobRecord | null>;
  updateProgress(jobId: string, progress: number, stage?: string, message?: string): Promise<void>;
  completeJob<TResult = any>(jobId: string, result: TResult): Promise<void>;
  failJob(jobId: string, error: { code: string; message: string; details?: any }): Promise<void>;
  cancelJob(jobId: string): Promise<void>;
  listJobs(filter?: JobFilter): Promise<JobRecord[]>;
}
