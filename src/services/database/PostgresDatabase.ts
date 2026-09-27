/**
 * VIRALCLIP STUDIO — POSTGRESQL PRODUCTION DATABASE CLIENT
 * Connects to PostgreSQL (Neon, Supabase, RDS, local) with connection pooling,
 * automatic schema bootstrapping, and seamless disk-journaled dev fallback.
 */

import fs from 'fs';
import path from 'path';
import { Pool, PoolConfig } from 'pg';

export class PostgresDatabase {
  private static instance: PostgresDatabase | null = null;
  private pool: Pool | null = null;
  private isConnected: boolean = false;
  private initPromise: Promise<boolean> | null = null;

  // Local fallback storage paths
  private projectsDir: string;
  private jobsDir: string;
  private mediaDir: string;

  constructor() {
    this.projectsDir = path.resolve(process.cwd(), '.projects');
    this.jobsDir = path.resolve(process.cwd(), 'data', 'jobs');
    this.mediaDir = path.resolve(process.cwd(), 'data', 'media');

    [this.projectsDir, this.jobsDir, this.mediaDir].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (connectionString) {
      const config: PoolConfig = {
        connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      };

      // SSL configuration for production cloud providers (Neon/Supabase)
      if (process.env.NODE_ENV === 'production' || connectionString.includes('sslmode=require')) {
        config.ssl = { rejectUnauthorized: false };
      }

      this.pool = new Pool(config);
      this.initPromise = this.initSchema();
    } else {
      console.log('[PostgresDatabase] No DATABASE_URL found. Operating in local disk-journaled mode.');
    }
  }

  public static getInstance(): PostgresDatabase {
    if (!PostgresDatabase.instance) {
      PostgresDatabase.instance = new PostgresDatabase();
    }
    return PostgresDatabase.instance;
  }

  private async initSchema(): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const client = await this.pool.connect();
      try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, 'utf8');
          await client.query(sql);
          this.isConnected = true;
          console.log('[PostgresDatabase] Successfully connected and verified PostgreSQL schema.');
          return true;
        }
        await client.query('SELECT 1');
        this.isConnected = true;
        return true;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn(`[PostgresDatabase] PostgreSQL connection failed: ${err.message}. Falling back to disk storage.`);
      this.isConnected = false;
      return false;
    }
  }

  public async isPostgresActive(): Promise<boolean> {
    if (this.initPromise) {
      await this.initPromise;
    }
    return this.isConnected && Boolean(this.pool);
  }

  public async getHealth(): Promise<{ status: string; connected: boolean; engine: string }> {
    const active = await this.isPostgresActive();
    return {
      status: active ? 'healthy' : 'fallback-local',
      connected: active,
      engine: active ? 'PostgreSQL' : 'DiskJournal (Dev)',
    };
  }

  // ============================================================================
  // PROJECT OPERATIONS
  // ============================================================================

  public async getProject(id: string): Promise<any | null> {
    if (await this.isPostgresActive()) {
      try {
        const res = await this.pool!.query(
          'SELECT project_data FROM projects WHERE id = $1',
          [id]
        );
        if (res.rows.length > 0) {
          return res.rows[0].project_data;
        }
      } catch (err) {
        console.warn(`[PostgresDatabase] Error fetching project ${id} from DB, checking disk:`, err);
      }
    }

    // Disk fallback
    const filePath = path.join(this.projectsDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch {}
    }
    return null;
  }

  public async saveProject(project: any): Promise<void> {
    if (!project || !project.id) return;

    // Always persist to local disk for safety
    try {
      const filePath = path.join(this.projectsDir, `${project.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf8');
    } catch {}

    if (await this.isPostgresActive()) {
      try {
        const query = `
          INSERT INTO projects (
            id, user_id, name, source_media_id, original_url,
            duration, width, height, fps, aspect_ratio, status, project_data, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            source_media_id = EXCLUDED.source_media_id,
            duration = EXCLUDED.duration,
            width = EXCLUDED.width,
            height = EXCLUDED.height,
            fps = EXCLUDED.fps,
            aspect_ratio = EXCLUDED.aspect_ratio,
            status = EXCLUDED.status,
            project_data = EXCLUDED.project_data,
            updated_at = CURRENT_TIMESTAMP;
        `;
        const params = [
          project.id,
          project.userId || null,
          project.originalTitle || project.title || 'Untitled Project',
          project.sourceMediaId || null,
          project.youtubeUrl || project.videoUrl || null,
          project.originalDuration || project.duration || 0,
          project.originalWidth || project.width || 1080,
          project.originalHeight || project.height || 1920,
          project.originalFps || project.fps || 30.0,
          project.aspectRatio || '9:16',
          project.status || 'READY',
          JSON.stringify(project),
        ];
        await this.pool!.query(query, params);
      } catch (err) {
        console.error(`[PostgresDatabase] Failed to upsert project ${project.id} in DB:`, err);
      }
    }
  }

  public async listProjects(userId?: string): Promise<any[]> {
    if (await this.isPostgresActive()) {
      try {
        const query = userId
          ? 'SELECT project_data FROM projects WHERE user_id = $1 ORDER BY updated_at DESC'
          : 'SELECT project_data FROM projects ORDER BY updated_at DESC';
        const res = await this.pool!.query(query, userId ? [userId] : []);
        return res.rows.map((r) => r.project_data);
      } catch (err) {
        console.warn('[PostgresDatabase] Error listing projects from DB, falling back to disk:', err);
      }
    }

    // Disk fallback
    const projects: any[] = [];
    try {
      const files = fs.readdirSync(this.projectsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const content = fs.readFileSync(path.join(this.projectsDir, file), 'utf8');
            const parsed = JSON.parse(content);
            if (parsed && parsed.id) projects.push(parsed);
          } catch {}
        }
      }
    } catch {}
    return projects;
  }

  public async deleteProject(id: string): Promise<void> {
    const filePath = path.join(this.projectsDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }

    if (await this.isPostgresActive()) {
      try {
        await this.pool!.query('DELETE FROM projects WHERE id = $1', [id]);
      } catch (err) {
        console.error(`[PostgresDatabase] Failed to delete project ${id} from DB:`, err);
      }
    }
  }

  // ============================================================================
  // JOB OPERATIONS
  // ============================================================================

  public async saveJob(job: any): Promise<void> {
    if (!job || !job.id) return;

    // Disk sync
    try {
      const filePath = path.join(this.jobsDir, `${job.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(job, null, 2), 'utf8');
    } catch {}

    if (await this.isPostgresActive()) {
      try {
        const query = `
          INSERT INTO jobs (
            id, project_id, media_id, type, status, progress, stage, message,
            error_code, error_message, worker_id, payload, result, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            progress = EXCLUDED.progress,
            stage = EXCLUDED.stage,
            message = EXCLUDED.message,
            error_code = EXCLUDED.error_code,
            error_message = EXCLUDED.error_message,
            worker_id = EXCLUDED.worker_id,
            result = EXCLUDED.result,
            started_at = CASE WHEN jobs.started_at IS NULL AND EXCLUDED.progress > 0 THEN CURRENT_TIMESTAMP ELSE jobs.started_at END,
            completed_at = CASE WHEN EXCLUDED.status IN ('COMPLETED', 'FAILED', 'CANCELLED') THEN CURRENT_TIMESTAMP ELSE jobs.completed_at END;
        `;
        const params = [
          job.id,
          job.projectId || null,
          job.mediaId || null,
          job.type || 'generic',
          (job.status || 'QUEUED').toUpperCase(),
          job.progress || 0,
          job.stage || job.currentStage || 'QUEUED',
          job.message || null,
          job.errorCode || null,
          job.error || job.errorMessage || null,
          job.workerId || null,
          JSON.stringify(job.payload || {}),
          JSON.stringify(job.result || {}),
        ];
        await this.pool!.query(query, params);
      } catch (err) {
        console.error(`[PostgresDatabase] Failed to upsert job ${job.id}:`, err);
      }
    }
  }

  public async getJob(id: string): Promise<any | null> {
    if (await this.isPostgresActive()) {
      try {
        const res = await this.pool!.query('SELECT * FROM jobs WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            projectId: row.project_id,
            mediaId: row.media_id,
            type: row.type,
            status: (row.status || 'queued').toLowerCase(),
            progress: row.progress,
            stage: row.stage,
            message: row.message,
            error: row.error_message,
            errorCode: row.error_code,
            workerId: row.worker_id,
            payload: row.payload,
            result: row.result,
            createdAt: row.created_at,
            startedAt: row.started_at,
            completedAt: row.completed_at,
          };
        }
      } catch (err) {
        console.warn(`[PostgresDatabase] Error fetching job ${id} from DB:`, err);
      }
    }

    // Disk fallback
    const filePath = path.join(this.jobsDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch {}
    }
    return null;
  }

  public async updateJobProgress(
    id: string,
    progress: number,
    stage?: string,
    message?: string,
    status?: string
  ): Promise<void> {
    const existing = await this.getJob(id);
    if (!existing) return;

    existing.progress = Math.min(100, Math.max(0, Math.round(progress)));
    if (stage) existing.stage = stage;
    if (message) existing.message = message;
    if (status) existing.status = status;

    await this.saveJob(existing);
  }

  // ============================================================================
  // MEDIA OPERATIONS
  // ============================================================================

  public async saveMedia(media: any): Promise<void> {
    if (!media || !media.id) return;

    // Disk sync
    try {
      const filePath = path.join(this.mediaDir, `${media.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(media, null, 2), 'utf8');
    } catch {}

    if (await this.isPostgresActive()) {
      try {
        const query = `
          INSERT INTO media (
            id, user_id, original_filename, stored_key, public_url,
            mime_type, file_size_bytes, duration, width, height, fps,
            has_audio, has_video, video_codec, audio_codec, status, metadata, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            public_url = EXCLUDED.public_url,
            file_size_bytes = EXCLUDED.file_size_bytes,
            duration = EXCLUDED.duration,
            width = EXCLUDED.width,
            height = EXCLUDED.height,
            fps = EXCLUDED.fps,
            has_audio = EXCLUDED.has_audio,
            has_video = EXCLUDED.has_video,
            video_codec = EXCLUDED.video_codec,
            audio_codec = EXCLUDED.audio_codec,
            status = EXCLUDED.status,
            metadata = EXCLUDED.metadata;
        `;
        await this.pool!.query(query, [
          media.id,
          media.userId || null,
          media.originalFilename || `${media.id}.mp4`,
          media.stored_key || media.storedKey || `uploads/${media.id}/source.mp4`,
          media.publicUrl || null,
          media.mimeType || 'video/mp4',
          media.file_size_bytes || media.size || 0,
          media.duration || 0,
          media.width || 0,
          media.height || 0,
          media.fps || 0,
          media.has_audio ?? media.hasAudio ?? true,
          media.has_video ?? media.hasVideo ?? true,
          media.video_codec || media.videoCodec || null,
          media.audio_codec || media.audioCodec || null,
          media.status || 'READY',
          JSON.stringify(media.metadata || {}),
        ]);
      } catch (err) {
        console.error(`[PostgresDatabase] Failed to upsert media ${media.id}:`, err);
      }
    }
  }

  public async getMedia(id: string): Promise<any | null> {
    if (await this.isPostgresActive()) {
      try {
        const res = await this.pool!.query('SELECT * FROM media WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            userId: row.user_id,
            originalFilename: row.original_filename,
            storedKey: row.stored_key,
            publicUrl: row.public_url,
            mimeType: row.mime_type,
            size: Number(row.file_size_bytes),
            duration: Number(row.duration),
            width: row.width,
            height: row.height,
            fps: Number(row.fps),
            hasAudio: row.has_audio,
            hasVideo: row.has_video,
            videoCodec: row.video_codec,
            audioCodec: row.audio_codec,
            status: row.status,
            ...row.metadata,
          };
        }
      } catch (err) {
        console.warn(`[PostgresDatabase] Error getting media ${id}:`, err);
      }
    }

    const filePath = path.join(this.mediaDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch {}
    }
    return null;
  }

  // ============================================================================
  // EXPORT OPERATIONS
  // ============================================================================

  public async saveExport(exp: any): Promise<void> {
    if (!exp || !exp.id) return;
    if (await this.isPostgresActive()) {
      try {
        const query = `
          INSERT INTO exports (
            id, project_id, short_id, job_id, object_key, public_url,
            file_size, duration, resolution, fps, status, metadata, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            public_url = EXCLUDED.public_url,
            file_size = EXCLUDED.file_size,
            status = EXCLUDED.status,
            metadata = EXCLUDED.metadata;
        `;
        await this.pool!.query(query, [
          exp.id,
          exp.projectId || null,
          exp.shortId || null,
          exp.jobId || null,
          exp.objectKey || `exports/${exp.id}.mp4`,
          exp.publicUrl || exp.downloadUrl || null,
          exp.fileSize || 0,
          exp.duration || 0,
          exp.resolution || '1080x1920',
          exp.fps || 30.0,
          exp.status || 'COMPLETED',
          JSON.stringify(exp),
        ]);
      } catch (err) {
        console.error(`[PostgresDatabase] Failed to save export ${exp.id}:`, err);
      }
    }
  }

  public async getExport(id: string): Promise<any | null> {
    if (await this.isPostgresActive()) {
      try {
        const res = await this.pool!.query('SELECT * FROM exports WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            projectId: row.project_id,
            shortId: row.short_id,
            jobId: row.job_id,
            objectKey: row.object_key,
            downloadUrl: row.public_url,
            fileSize: row.file_size,
            duration: row.duration,
            resolution: row.resolution,
            fps: row.fps,
            status: row.status,
            ...row.metadata,
          };
        }
      } catch (err) {
        console.warn(`[PostgresDatabase] Error getting export ${id}:`, err);
      }
    }
    return null;
  }
}
