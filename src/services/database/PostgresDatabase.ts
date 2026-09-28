/**
 * VIRALCLIP STUDIO — POSTGRESQL PRODUCTION DATABASE CLIENT
 * Connects to PostgreSQL (Neon, Supabase, RDS, local) with connection pooling,
 * automatic schema bootstrapping, and seamless disk-journaled dev fallback.
 */

import fs from 'fs';
import path from 'path';
import { Pool, PoolConfig } from 'pg';
import {
  CaptionPresetSourceRecord,
  CaptionPresetRecord,
  CaptionFontRecord,
  CaptionImportJobRecord,
  CaptionImportErrorRecord,
  ProcessingJobRecord,
  ProcessingJobEventRecord,
} from '../../types';

export class PostgresDatabase {
  private static instance: PostgresDatabase | null = null;
  private pool: Pool | null = null;
  private isConnected: boolean = false;
  private initPromise: Promise<boolean> | null = null;

  // Local fallback storage paths
  private projectsDir: string;
  private jobsDir: string;
  private mediaDir: string;
  private presetSourcesDir: string;
  private presetsDir: string;
  private presetFontsDir: string;
  private importJobsDir: string;
  private importErrorsDir: string;
  private processingJobsDir: string;
  private processingJobEventsDir: string;

  constructor() {
    this.projectsDir = path.resolve(process.cwd(), '.projects');
    this.jobsDir = path.resolve(process.cwd(), 'data', 'jobs');
    this.mediaDir = path.resolve(process.cwd(), 'data', 'media');
    this.presetSourcesDir = path.resolve(process.cwd(), 'data', 'caption_sources');
    this.presetsDir = path.resolve(process.cwd(), 'data', 'caption_presets');
    this.presetFontsDir = path.resolve(process.cwd(), 'data', 'caption_fonts');
    this.importJobsDir = path.resolve(process.cwd(), 'data', 'caption_import_jobs');
    this.importErrorsDir = path.resolve(process.cwd(), 'data', 'caption_import_errors');
    this.processingJobsDir = path.resolve(process.cwd(), 'data', 'processing_jobs');
    this.processingJobEventsDir = path.resolve(process.cwd(), 'data', 'processing_job_events');

    [
      this.projectsDir,
      this.jobsDir,
      this.mediaDir,
      this.presetSourcesDir,
      this.presetsDir,
      this.presetFontsDir,
      this.importJobsDir,
      this.importErrorsDir,
      this.processingJobsDir,
      this.processingJobEventsDir,
    ].forEach((dir) => {
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

  // ============================================================================
  // CAPTION PRESET IMPORTER OPERATIONS (Phases 4, 5, 11, 14, 18, 19, 22)
  // ============================================================================

  private static readonly SEED_SOURCES: CaptionPresetSourceRecord[] = [
    {
      id: 'src_beginner',
      name: 'Beginner Texts',
      category: 'Beginner',
      provider: 'google_drive',
      sourceUrl: 'https://drive.google.com/drive/folders/1ABExOyiUzOAdIEzWhcLjGxSuBaIUJGhF',
      status: 'READY',
      metadata: { isSeed: true },
    },
    {
      id: 'src_intermediate',
      name: 'Intermediate Texts',
      category: 'Intermediate',
      provider: 'google_drive',
      sourceUrl: 'https://drive.google.com/drive/folders/1SjmV9Mwc1RJB-HR7aFWh_zyLB96S6uJc',
      status: 'READY',
      metadata: { isSeed: true },
    },
    {
      id: 'src_pro_3d',
      name: 'Pro + 3D Texts',
      category: 'Pro',
      provider: 'google_drive',
      sourceUrl: 'https://drive.google.com/drive/folders/1GJ0jZXJHoEHREM30vdV6jIylyH14f7wc',
      status: 'READY',
      metadata: { isSeed: true },
    },
    {
      id: 'src_preset_part_1',
      name: 'Preset Part 1',
      category: 'Preset Pack 1',
      provider: 'google_drive',
      sourceUrl: 'https://drive.google.com/file/d/1CeBQfh8i3_hGwNRzOw3wAlpEGfy4iHHN/view',
      status: 'READY',
      metadata: { isSeed: true },
    },
    {
      id: 'src_preset_part_2',
      name: 'Preset Part 2',
      category: 'Preset Pack 2',
      provider: 'google_drive',
      sourceUrl: 'https://drive.google.com/file/d/1AJMaGFjzP6PcaOa6hTqS_aVyzITvjYwZ/view',
      status: 'READY',
      metadata: { isSeed: true },
    },
    {
      id: 'src_preset_part_3',
      name: 'Preset Part 3',
      category: 'Preset Pack 3',
      provider: 'google_drive',
      sourceUrl: 'https://drive.google.com/file/d/1rtgNz4abtkJnFtxO4GtWiRtQNTnIR5UG/view',
      status: 'READY',
      metadata: { isSeed: true },
    },
  ];

  public async getPresetSources(): Promise<CaptionPresetSourceRecord[]> {
    if (await this.isPostgresActive()) {
      try {
        const res = await this.pool!.query('SELECT * FROM caption_preset_sources ORDER BY created_at ASC');
        if (res.rows.length === 0) {
          for (const s of PostgresDatabase.SEED_SOURCES) {
            await this.savePresetSource(s);
          }
          const seeded = await this.pool!.query('SELECT * FROM caption_preset_sources ORDER BY created_at ASC');
          return seeded.rows.map(this.mapDbSource);
        }
        return res.rows.map(this.mapDbSource);
      } catch (err) {
        console.warn('[PostgresDatabase] Error querying caption_preset_sources:', err);
      }
    }

    // Disk fallback
    try {
      const files = fs.readdirSync(this.presetSourcesDir).filter((f) => f.endsWith('.json'));
      if (files.length === 0) {
        for (const s of PostgresDatabase.SEED_SOURCES) {
          await this.savePresetSource(s);
        }
        return PostgresDatabase.SEED_SOURCES;
      }
      return files
        .map((f) => {
          try {
            return JSON.parse(fs.readFileSync(path.join(this.presetSourcesDir, f), 'utf8'));
          } catch {
            return null;
          }
        })
        .filter(Boolean) as CaptionPresetSourceRecord[];
    } catch {
      return PostgresDatabase.SEED_SOURCES;
    }
  }

  public async getPresetSource(id: string): Promise<CaptionPresetSourceRecord | null> {
    if (await this.isPostgresActive()) {
      try {
        const res = await this.pool!.query('SELECT * FROM caption_preset_sources WHERE id = $1', [id]);
        if (res.rows.length > 0) return this.mapDbSource(res.rows[0]);
      } catch (err) {
        console.warn(`[PostgresDatabase] Error getting preset source ${id}:`, err);
      }
    }
    const file = path.join(this.presetSourcesDir, `${id}.json`);
    if (fs.existsSync(file)) {
      try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        return null;
      }
    }
    return PostgresDatabase.SEED_SOURCES.find((s) => s.id === id) || null;
  }

  public async savePresetSource(source: CaptionPresetSourceRecord): Promise<void> {
    const s = {
      ...source,
      updatedAt: new Date().toISOString(),
      createdAt: source.createdAt || new Date().toISOString(),
    };

    if (await this.isPostgresActive()) {
      try {
        const q = `
          INSERT INTO caption_preset_sources (
            id, name, category, provider, source_url, source_id, last_scanned_at, last_synced_at, status, metadata, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            provider = EXCLUDED.provider,
            source_url = EXCLUDED.source_url,
            source_id = EXCLUDED.source_id,
            last_scanned_at = EXCLUDED.last_scanned_at,
            last_synced_at = EXCLUDED.last_synced_at,
            status = EXCLUDED.status,
            metadata = EXCLUDED.metadata,
            updated_at = CURRENT_TIMESTAMP;
        `;
        await this.pool!.query(q, [
          s.id,
          s.name,
          s.category,
          s.provider || 'google_drive',
          s.sourceUrl,
          s.sourceId || null,
          s.lastScannedAt ? new Date(s.lastScannedAt) : null,
          s.lastSyncedAt ? new Date(s.lastSyncedAt) : null,
          s.status || 'READY',
          JSON.stringify(s.metadata || {}),
        ]);
        return;
      } catch (err) {
        console.warn(`[PostgresDatabase] Failed to save preset source in Postgres:`, err);
      }
    }

    // Disk fallback
    try {
      fs.writeFileSync(path.join(this.presetSourcesDir, `${s.id}.json`), JSON.stringify(s, null, 2), 'utf8');
    } catch (err) {
      console.error(`[PostgresDatabase] Failed to save preset source on disk:`, err);
    }
  }

  public async deletePresetSource(id: string): Promise<void> {
    if (await this.isPostgresActive()) {
      try {
        await this.pool!.query('DELETE FROM caption_preset_sources WHERE id = $1', [id]);
      } catch (err) {
        console.warn(`[PostgresDatabase] Failed to delete preset source ${id}:`, err);
      }
    }
    const file = path.join(this.presetSourcesDir, `${id}.json`);
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch {}
    }
  }

  private mapDbSource(row: any): CaptionPresetSourceRecord {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      provider: row.provider,
      sourceUrl: row.source_url,
      sourceId: row.source_id,
      lastScannedAt: row.last_scanned_at ? new Date(row.last_scanned_at).toISOString() : undefined,
      lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at).toISOString() : undefined,
      status: row.status,
      metadata: row.metadata,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    };
  }

  // ============================================================================
  // PRESET STORAGE OPERATIONS
  // ============================================================================

  public async getCaptionPresets(category?: string): Promise<CaptionPresetRecord[]> {
    if (await this.isPostgresActive()) {
      try {
        let q = 'SELECT * FROM caption_presets';
        const params: any[] = [];
        if (category && category !== 'all') {
          q += ' WHERE LOWER(category) = LOWER($1)';
          params.push(category);
        }
        q += ' ORDER BY created_at DESC';
        const res = await this.pool!.query(q, params);
        return res.rows.map(this.mapDbPreset);
      } catch (err) {
        console.warn('[PostgresDatabase] Error querying caption_presets:', err);
      }
    }

    // Disk fallback
    try {
      const files = fs.readdirSync(this.presetsDir).filter((f) => f.endsWith('.json'));
      const list = files
        .map((f) => {
          try {
            return JSON.parse(fs.readFileSync(path.join(this.presetsDir, f), 'utf8'));
          } catch {
            return null;
          }
        })
        .filter(Boolean) as CaptionPresetRecord[];

      if (category && category !== 'all') {
        return list.filter((p) => (p.category || '').toLowerCase() === category.toLowerCase());
      }
      return list;
    } catch {
      return [];
    }
  }

  public async getCaptionPreset(id: string): Promise<CaptionPresetRecord | null> {
    if (await this.isPostgresActive()) {
      try {
        const res = await this.pool!.query('SELECT * FROM caption_presets WHERE id = $1', [id]);
        if (res.rows.length > 0) return this.mapDbPreset(res.rows[0]);
      } catch (err) {
        console.warn(`[PostgresDatabase] Error getting caption preset ${id}:`, err);
      }
    }
    const file = path.join(this.presetsDir, `${id}.json`);
    if (fs.existsSync(file)) {
      try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        return null;
      }
    }
    return null;
  }

  public async saveCaptionPreset(preset: CaptionPresetRecord): Promise<void> {
    const p = {
      ...preset,
      updatedAt: new Date().toISOString(),
      createdAt: preset.createdAt || new Date().toISOString(),
    };

    if (await this.isPostgresActive()) {
      try {
        const q = `
          INSERT INTO caption_presets (
            id, name, slug, category, preset_json, preview_url, source_id, source_file_id,
            source_file, source_type, source_checksum, is_3d, conversion_status,
            conversion_version, metadata, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            category = EXCLUDED.category,
            preset_json = EXCLUDED.preset_json,
            preview_url = EXCLUDED.preview_url,
            source_id = EXCLUDED.source_id,
            source_file_id = EXCLUDED.source_file_id,
            source_file = EXCLUDED.source_file,
            source_type = EXCLUDED.source_type,
            source_checksum = EXCLUDED.source_checksum,
            is_3d = EXCLUDED.is_3d,
            conversion_status = EXCLUDED.conversion_status,
            conversion_version = EXCLUDED.conversion_version,
            metadata = EXCLUDED.metadata,
            updated_at = CURRENT_TIMESTAMP;
        `;
        await this.pool!.query(q, [
          p.id,
          p.name,
          p.slug,
          p.category || 'imported',
          JSON.stringify(p.presetJson),
          p.previewUrl || null,
          p.sourceId || null,
          p.sourceFileId || null,
          p.sourceFile || null,
          p.sourceType || 'xml',
          p.sourceChecksum || null,
          Boolean(p.is3D),
          p.conversionStatus || 'FULL',
          p.conversionVersion || '1.0',
          JSON.stringify(p.metadata || {}),
        ]);
        return;
      } catch (err) {
        console.warn('[PostgresDatabase] Failed to save caption preset in Postgres:', err);
      }
    }

    // Disk fallback
    try {
      fs.writeFileSync(path.join(this.presetsDir, `${p.id}.json`), JSON.stringify(p, null, 2), 'utf8');
    } catch (err) {
      console.error('[PostgresDatabase] Failed to save caption preset on disk:', err);
    }
  }

  public async deleteCaptionPreset(id: string): Promise<void> {
    if (await this.isPostgresActive()) {
      try {
        await this.pool!.query('DELETE FROM caption_presets WHERE id = $1', [id]);
      } catch (err) {
        console.warn(`[PostgresDatabase] Failed to delete caption preset ${id}:`, err);
      }
    }
    const file = path.join(this.presetsDir, `${id}.json`);
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch {}
    }
  }

  private mapDbPreset(row: any): CaptionPresetRecord {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      category: row.category,
      presetJson: typeof row.preset_json === 'string' ? JSON.parse(row.preset_json) : row.preset_json,
      previewUrl: row.preview_url,
      sourceId: row.source_id,
      sourceFileId: row.source_file_id,
      sourceFile: row.source_file,
      sourceType: row.source_type,
      sourceChecksum: row.source_checksum,
      is3D: Boolean(row.is_3d),
      conversionStatus: row.conversion_status,
      conversionVersion: row.conversion_version,
      metadata: row.metadata,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    };
  }

  // ============================================================================
  // FONT STORAGE OPERATIONS
  // ============================================================================

  public async getCaptionFonts(): Promise<CaptionFontRecord[]> {
    if (await this.isPostgresActive()) {
      try {
        const res = await this.pool!.query('SELECT * FROM caption_fonts ORDER BY family ASC');
        return res.rows.map((row: any) => ({
          id: row.id,
          family: row.family,
          fileUrl: row.file_url,
          format: row.format,
          weight: row.weight,
          style: row.style,
          checksum: row.checksum,
          sourceId: row.source_id,
          licenseMetadata: row.license_metadata,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
        }));
      } catch (err) {
        console.warn('[PostgresDatabase] Error querying caption_fonts:', err);
      }
    }

    try {
      const files = fs.readdirSync(this.presetFontsDir).filter((f) => f.endsWith('.json'));
      return files
        .map((f) => {
          try {
            return JSON.parse(fs.readFileSync(path.join(this.presetFontsDir, f), 'utf8'));
          } catch {
            return null;
          }
        })
        .filter(Boolean) as CaptionFontRecord[];
    } catch {
      return [];
    }
  }

  public async saveCaptionFont(font: CaptionFontRecord): Promise<void> {
    if (await this.isPostgresActive()) {
      try {
        const q = `
          INSERT INTO caption_fonts (id, family, file_url, format, weight, style, checksum, source_id, license_metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            file_url = EXCLUDED.file_url,
            weight = EXCLUDED.weight,
            style = EXCLUDED.style,
            checksum = EXCLUDED.checksum,
            license_metadata = EXCLUDED.license_metadata;
        `;
        await this.pool!.query(q, [
          font.id,
          font.family,
          font.fileUrl,
          font.format || 'ttf',
          font.weight || 400,
          font.style || 'normal',
          font.checksum,
          font.sourceId || null,
          JSON.stringify(font.licenseMetadata || {}),
        ]);
        return;
      } catch (err) {
        console.warn('[PostgresDatabase] Failed to save caption font in Postgres:', err);
      }
    }

    try {
      fs.writeFileSync(path.join(this.presetFontsDir, `${font.id}.json`), JSON.stringify(font, null, 2), 'utf8');
    } catch (err) {
      console.error('[PostgresDatabase] Failed to save caption font on disk:', err);
    }
  }

  // ============================================================================
  // IMPORT JOBS OPERATIONS
  // ============================================================================

  public async getImportJobs(): Promise<CaptionImportJobRecord[]> {
    if (await this.isPostgresActive()) {
      try {
        const res = await this.pool!.query('SELECT * FROM caption_import_jobs ORDER BY created_at DESC LIMIT 50');
        return res.rows.map(this.mapDbJob);
      } catch (err) {
        console.warn('[PostgresDatabase] Error querying caption_import_jobs:', err);
      }
    }

    try {
      const files = fs.readdirSync(this.importJobsDir).filter((f) => f.endsWith('.json'));
      const list = files
        .map((f) => {
          try {
            return JSON.parse(fs.readFileSync(path.join(this.importJobsDir, f), 'utf8'));
          } catch {
            return null;
          }
        })
        .filter(Boolean) as CaptionImportJobRecord[];
      return list.sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
    } catch {
      return [];
    }
  }

  public async getImportJob(id: string): Promise<CaptionImportJobRecord | null> {
    if (await this.isPostgresActive()) {
      try {
        const res = await this.pool!.query('SELECT * FROM caption_import_jobs WHERE id = $1', [id]);
        if (res.rows.length > 0) return this.mapDbJob(res.rows[0]);
      } catch (err) {
        console.warn(`[PostgresDatabase] Error getting import job ${id}:`, err);
      }
    }

    const file = path.join(this.importJobsDir, `${id}.json`);
    if (fs.existsSync(file)) {
      try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        return null;
      }
    }
    return null;
  }

  public async saveImportJob(job: CaptionImportJobRecord): Promise<void> {
    if (await this.isPostgresActive()) {
      try {
        const q = `
          INSERT INTO caption_import_jobs (
            id, source_id, status, stage, current_file, total_files, processed_files,
            success_count, partial_count, failure_count, unsupported_count, started_at,
            completed_at, error, metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            stage = EXCLUDED.stage,
            current_file = EXCLUDED.current_file,
            total_files = EXCLUDED.total_files,
            processed_files = EXCLUDED.processed_files,
            success_count = EXCLUDED.success_count,
            partial_count = EXCLUDED.partial_count,
            failure_count = EXCLUDED.failure_count,
            unsupported_count = EXCLUDED.unsupported_count,
            completed_at = EXCLUDED.completed_at,
            error = EXCLUDED.error,
            metadata = EXCLUDED.metadata;
        `;
        await this.pool!.query(q, [
          job.id,
          job.sourceId || null,
          job.status,
          job.stage || 'QUEUED',
          job.currentFile || null,
          job.totalFiles || 0,
          job.processedFiles || 0,
          job.successCount || 0,
          job.partialCount || 0,
          job.failureCount || 0,
          job.unsupportedCount || 0,
          job.startedAt ? new Date(job.startedAt) : new Date(),
          job.completedAt ? new Date(job.completedAt) : null,
          job.error || null,
          JSON.stringify(job.metadata || {}),
        ]);
        return;
      } catch (err) {
        console.warn('[PostgresDatabase] Failed to save import job in Postgres:', err);
      }
    }

    try {
      fs.writeFileSync(path.join(this.importJobsDir, `${job.id}.json`), JSON.stringify(job, null, 2), 'utf8');
    } catch (err) {
      console.error('[PostgresDatabase] Failed to save import job on disk:', err);
    }
  }

  private mapDbJob(row: any): CaptionImportJobRecord {
    return {
      id: row.id,
      sourceId: row.source_id,
      status: row.status,
      stage: row.stage,
      currentFile: row.current_file,
      totalFiles: row.total_files,
      processedFiles: row.processed_files,
      successCount: row.success_count,
      partialCount: row.partial_count,
      failureCount: row.failure_count,
      unsupportedCount: row.unsupported_count,
      startedAt: row.started_at ? new Date(row.started_at).toISOString() : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
      error: row.error,
      metadata: row.metadata,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    };
  }

  public async getImportErrors(jobId: string): Promise<CaptionImportErrorRecord[]> {
    if (await this.isPostgresActive()) {
      try {
        const res = await this.pool!.query(
          'SELECT * FROM caption_import_errors WHERE job_id = $1 ORDER BY created_at ASC',
          [jobId]
        );
        return res.rows.map((row: any) => ({
          id: row.id,
          jobId: row.job_id,
          sourceFile: row.source_file,
          stage: row.stage,
          errorCode: row.error_code,
          message: row.message,
          details: row.details,
          suggestedAction: row.suggested_action,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
        }));
      } catch (err) {
        console.warn(`[PostgresDatabase] Error getting import errors for job ${jobId}:`, err);
      }
    }

    try {
      const errFile = path.join(this.importErrorsDir, `${jobId}.json`);
      if (fs.existsSync(errFile)) {
        return JSON.parse(fs.readFileSync(errFile, 'utf8'));
      }
    } catch {}
    return [];
  }

  public async saveImportError(error: CaptionImportErrorRecord): Promise<void> {
    if (await this.isPostgresActive()) {
      try {
        const q = `
          INSERT INTO caption_import_errors (id, job_id, source_file, stage, error_code, message, details, suggested_action)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING;
        `;
        await this.pool!.query(q, [
          error.id,
          error.jobId,
          error.sourceFile,
          error.stage,
          error.errorCode,
          error.message,
          JSON.stringify(error.details || {}),
          error.suggestedAction || null,
        ]);
        return;
      } catch (err) {
        console.warn('[PostgresDatabase] Failed to save import error in Postgres:', err);
      }
    }

    try {
      const errFile = path.join(this.importErrorsDir, `${error.jobId}.json`);
      let list: CaptionImportErrorRecord[] = [];
      if (fs.existsSync(errFile)) {
        list = JSON.parse(fs.readFileSync(errFile, 'utf8'));
      }
      list.push(error);
      fs.writeFileSync(errFile, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
      console.error('[PostgresDatabase] Failed to save import error on disk:', err);
    }
  }

  // ==============================================================================
  // UNIVERSAL PROCESSING JOBS & EVENTS (Requirement 5)
  // ==============================================================================

  public async saveProcessingJob(job: ProcessingJobRecord): Promise<void> {
    const now = new Date().toISOString();
    const createdAt = job.createdAt || now;

    if (await this.isPostgresActive()) {
      try {
        const q = `
          INSERT INTO processing_jobs (
            id, type, status, progress, stage, input, output, error, source_id, created_at, started_at, completed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            type = EXCLUDED.type,
            status = EXCLUDED.status,
            progress = EXCLUDED.progress,
            stage = EXCLUDED.stage,
            input = EXCLUDED.input,
            output = EXCLUDED.output,
            error = EXCLUDED.error,
            source_id = EXCLUDED.source_id,
            started_at = COALESCE(EXCLUDED.started_at, processing_jobs.started_at),
            completed_at = COALESCE(EXCLUDED.completed_at, processing_jobs.completed_at);
        `;
        await this.pool!.query(q, [
          job.id,
          job.type,
          job.status,
          job.progress || 0,
          job.stage || 'QUEUED',
          JSON.stringify(job.input || {}),
          JSON.stringify(job.output || {}),
          job.error || null,
          job.sourceId || null,
          createdAt,
          job.startedAt || null,
          job.completedAt || null,
        ]);
        return;
      } catch (err) {
        console.warn('[PostgresDatabase] Failed to save processing job in Postgres:', err);
      }
    }

    try {
      const file = path.join(this.processingJobsDir, `${job.id}.json`);
      fs.writeFileSync(file, JSON.stringify(job, null, 2), 'utf8');
    } catch (err) {
      console.error('[PostgresDatabase] Failed to save processing job on disk:', err);
    }
  }

  public async getProcessingJob(id: string): Promise<ProcessingJobRecord | null> {
    if (await this.isPostgresActive()) {
      try {
        const res = await this.pool!.query('SELECT * FROM processing_jobs WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            type: row.type,
            status: row.status,
            progress: row.progress,
            stage: row.stage,
            input: row.input,
            output: row.output,
            error: row.error,
            sourceId: row.source_id,
            createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
            startedAt: row.started_at ? new Date(row.started_at).toISOString() : undefined,
            completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
          };
        }
      } catch (err) {
        console.warn(`[PostgresDatabase] Error querying processing job ${id}:`, err);
      }
    }

    try {
      const file = path.join(this.processingJobsDir, `${id}.json`);
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      }
    } catch {}
    return null;
  }

  public async getProcessingJobs(filter?: { type?: string; status?: string; sourceId?: string }): Promise<ProcessingJobRecord[]> {
    if (await this.isPostgresActive()) {
      try {
        const conditions: string[] = [];
        const values: any[] = [];
        let idx = 1;

        if (filter?.type) {
          conditions.push(`type = $${idx++}`);
          values.push(filter.type);
        }
        if (filter?.status) {
          conditions.push(`status = $${idx++}`);
          values.push(filter.status);
        }
        if (filter?.sourceId) {
          conditions.push(`source_id = $${idx++}`);
          values.push(filter.sourceId);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const q = `SELECT * FROM processing_jobs ${whereClause} ORDER BY created_at DESC LIMIT 200`;
        const res = await this.pool!.query(q, values);

        return res.rows.map((row) => ({
          id: row.id,
          type: row.type,
          status: row.status,
          progress: row.progress,
          stage: row.stage,
          input: row.input,
          output: row.output,
          error: row.error,
          sourceId: row.source_id,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
          startedAt: row.started_at ? new Date(row.started_at).toISOString() : undefined,
          completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
        }));
      } catch (err) {
        console.warn('[PostgresDatabase] Error getting processing jobs:', err);
      }
    }

    try {
      if (fs.existsSync(this.processingJobsDir)) {
        const files = fs.readdirSync(this.processingJobsDir).filter((f) => f.endsWith('.json'));
        const list: ProcessingJobRecord[] = [];
        for (const file of files) {
          try {
            const j: ProcessingJobRecord = JSON.parse(fs.readFileSync(path.join(this.processingJobsDir, file), 'utf8'));
            if (filter?.type && j.type !== filter.type) continue;
            if (filter?.status && j.status !== filter.status) continue;
            if (filter?.sourceId && j.sourceId !== filter.sourceId) continue;
            list.push(j);
          } catch {}
        }
        return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      }
    } catch {}
    return [];
  }

  public async updateProcessingJobProgress(
    id: string,
    progress: number,
    stage?: string,
    output?: any,
    status?: string
  ): Promise<void> {
    const existing = await this.getProcessingJob(id);
    if (!existing) return;

    const updated: ProcessingJobRecord = {
      ...existing,
      progress: Math.min(100, Math.max(0, Math.round(progress))),
      stage: stage || existing.stage,
      output: output ? { ...existing.output, ...output } : existing.output,
      status: status || (progress >= 100 ? 'COMPLETED' : existing.status === 'QUEUED' ? 'PROCESSING' : existing.status),
      completedAt: progress >= 100 || status === 'COMPLETED' ? new Date().toISOString() : existing.completedAt,
      startedAt: existing.startedAt || new Date().toISOString(),
    };

    await this.saveProcessingJob(updated);
  }

  public async saveProcessingJobEvent(event: ProcessingJobEventRecord): Promise<void> {
    const now = new Date().toISOString();
    const createdAt = event.createdAt || now;

    if (await this.isPostgresActive()) {
      try {
        const q = `
          INSERT INTO processing_job_events (id, job_id, stage, progress, message, metadata, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING;
        `;
        await this.pool!.query(q, [
          event.id,
          event.jobId,
          event.stage,
          event.progress || 0,
          event.message || null,
          JSON.stringify(event.metadata || {}),
          createdAt,
        ]);
        return;
      } catch (err) {
        console.warn('[PostgresDatabase] Failed to save processing job event in Postgres:', err);
      }
    }

    try {
      const file = path.join(this.processingJobEventsDir, `${event.jobId}.json`);
      let list: ProcessingJobEventRecord[] = [];
      if (fs.existsSync(file)) {
        list = JSON.parse(fs.readFileSync(file, 'utf8'));
      }
      list.push({ ...event, createdAt });
      fs.writeFileSync(file, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
      console.error('[PostgresDatabase] Failed to save processing job event on disk:', err);
    }
  }

  public async getProcessingJobEvents(jobId: string): Promise<ProcessingJobEventRecord[]> {
    if (await this.isPostgresActive()) {
      try {
        const res = await this.pool!.query(
          'SELECT * FROM processing_job_events WHERE job_id = $1 ORDER BY created_at ASC',
          [jobId]
        );
        return res.rows.map((row) => ({
          id: row.id,
          jobId: row.job_id,
          stage: row.stage,
          progress: row.progress,
          message: row.message,
          metadata: row.metadata,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
        }));
      } catch (err) {
        console.warn(`[PostgresDatabase] Error getting events for job ${jobId}:`, err);
      }
    }

    try {
      const file = path.join(this.processingJobEventsDir, `${jobId}.json`);
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      }
    } catch {}
    return [];
  }
}

export const databaseService = PostgresDatabase.getInstance();
