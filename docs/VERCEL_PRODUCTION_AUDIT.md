# VIRALCLIP STUDIO — VERCEL PRODUCTION & CLOUD ARCHITECTURE AUDIT

**Audit Date:** September 2026  
**Audited Subsystems:** Express API Server, Vite/React Frontend, Caption Engine, Caption Preset Importer, Python Engine, FFmpeg Render Pipeline, Local Whisper Engine, MediaStorage, PostgreSQL Database, Object Storage Provider, Queue Service.

---

## 1. Executive Summary

ViralClip Studio is a professional AI YouTube-to-Shorts editor featuring real-time preview, 68+ caption style presets, semantic B-roll placement, procedural and AI SFX, subtitle generation, and 1080x1920 video composition. The recent addition of the **Caption Preset Importer** provides multi-provider ingestion (Google Drive, ZIP archives, local XML/JSON presets, Alight Motion conversion, font registration, SVG previews).

To run reliably on **Vercel** in a production SaaS configuration, the monolithic local development architecture must be hardened. Long-running media operations (Whisper transcription, FFmpeg composition, bulk Google Drive downloads, and Python batch conversion) cannot run inside Vercel Serverless Functions due to strict execution time limits (10s–60s) and ephemeral read-only filesystems.

This document details the architectural boundaries, incompatibilities, required infrastructure, environment variables, security mitigations, and deployment plan.

---

## 2. What Currently Works

| Subsystem | Components | Current Capabilities |
| :--- | :--- | :--- |
| **Frontend UI** | React 19, Vite, Tailwind CSS 4, Framer Motion, Lucide icons | Complete Editor workspace, Timeline, 9:16 Preview, Caption Styles inspector, B-Roll inspector, SFX catalog, Presenter modal, Preset Importer UI. |
| **Caption Engine** | `captionEngine.ts`, `renderPlan.ts`, 68 Presets | Word-level timing, karaoke highlighting, ASS/SRT formatting, line breaking, bounding box calculation, dynamic animation specs. |
| **Preset Importer Core** | `python_engine/preset_importer/`, `converters/`, `fonts/` | XML/JSON detection, Alight Motion keyframe extraction, font family/format extraction, deduplication, SVG preview generation, SHA-256 fingerprinting. |
| **Database Layer** | `PostgresDatabase.ts`, `schema.sql` | PostgreSQL support for users, media, projects, transcripts, captions, render plans, jobs, exports, `caption_preset_sources`, `caption_presets`, `caption_fonts`, `caption_import_jobs`, `caption_import_errors`. |
| **Object Storage** | `StorageProvider.ts` | S3-compatible client (AWS S3, Cloudflare R2, Supabase) with presigned PUT upload URLs and signed GET download URLs, plus local filesystem fallback. |
| **Job Queue** | `QueueService.ts` | Redis + BullMQ integration with exponential backoff and Server-Sent Events (SSE) broadcasting, plus in-process memory fallback. |
| **AI Polish & Director** | `analysisEngine.ts`, `aiDirector.ts`, Gemini 2.5 Flash | Hook generation, auto-script structuring, semantic B-roll suggestions, SFX auto-placement. |

---

## 3. What Only Works Locally (Development Mode)

1. **Child Process Invocations:**
   - `child_process.spawn('python3', ...)` in `ImportJobManager.ts` and `main.py` assumes a local Python 3.10+ runtime and dependencies (`defusedxml`, `fonttools`, `whisper`, etc.).
   - `child_process.spawn(ffmpegPath, ...)` in `renderWorker.ts` and `worker.ts` assumes native local `ffmpeg` and `ffprobe` static binaries.
   - `yt-dlp` execution in `YouTubeDownloader.ts` depends on local Python or binary paths.
2. **Local Disk Paths & Ephemeral Storage:**
   - Uploads to `public/uploads/` and exports to `public/exports/`.
   - Imported fonts saved to `public/assets/fonts/` and preview SVGs saved to `public/assets/previews/`.
   - Temporary job workspaces created under `process.cwd()/temp/import_*`.
3. **In-Memory State Maps:**
   - In `server.ts`: `projectsStore` (Map), `exportJobs` (Map), `userSfxStore` (Map), `sfxFavoritesSet` (Set).
   - In `ImportJobManager.ts`: `activeJobs` (Map), `cancelledJobIds` (Set).
   - In `TranscriptionJobManager.ts`: `inMemoryJobs` (Map).
   - In `QueueService.ts`: `inMemoryQueue` (Map).
4. **Synchronous/In-Process Background Execution:**
   - Running background pipelines via `setImmediate()` or unawaited promises after responding to HTTP requests.

---

## 4. What Is Incompatible with Vercel Serverless

1. **Execution Timeouts:**
   - Vercel Hobby plan limit: **10 seconds** per function execution.
   - Vercel Pro/Enterprise plan limit: **15s default, maximum 60s (or 300s for specific Pro configurations)**.
   - Transcribing a 10-minute video or rendering a 1080x1920 60s short takes 30–120 seconds.
   - Downloading a 500-preset pack from Google Drive takes 30–90 seconds.
   - Attempting these inside Vercel functions results in `504 Gateway Timeout (FUNCTION_INVOCATION_TIMEOUT)`.
2. **Read-Only Filesystem:**
   - The file system on AWS Lambda / Vercel is strictly read-only except for `/tmp` (500MB ephemeral limit).
   - Any attempt to write to `public/uploads`, `public/exports`, or `public/assets` throws `EROFS: read-only file system, mkdir '/var/task/public/exports'`.
3. **Stateless Lambdas & Concurrency:**
   - Serverless functions freeze CPU immediately after returning an HTTP response. Background tasks (`setImmediate`, detached promises) are paused or terminated.
   - In-memory state is not shared between lambdas or retained across cold starts.
4. **Binary & Bundle Size Limits:**
   - Vercel Serverless Function uncompressed size limit is **250 MB** (including `node_modules`).
   - Bundling FFmpeg (80MB), FFprobe (70MB), ONNX Runtime/Torch (300MB+), and Python libraries exceeds the serverless package limit.

---

## 5. What Must Move to External Infrastructure

| Responsibility | Vercel Serverless Role | External Infrastructure Role |
| :--- | :--- | :--- |
| **API & Routing** | Validate requests, authenticate users, create jobs in DB, return immediate status (`QUEUED`). | N/A |
| **Object Storage** | Issue presigned PUT URLs for browser direct uploads; issue signed GET URLs for downloads. | Cloudflare R2 / AWS S3 bucket stores videos, audio, fonts, thumbnails, and preview SVGs. |
| **Job Queue & State** | Insert jobs into PostgreSQL and/or publish to Redis BullMQ. | Redis / PostgreSQL stores job queues, transitions, and stage progress. |
| **Drive Ingestion** | Query Drive metadata, validate folder, enqueue `IMPORT_PRESETS` job. | External Worker downloads files, batches 25 at a time, converts presets, uploads to R2, updates DB. |
| **Transcription** | Enqueue `TRANSCRIBE` job. | External Worker runs Whisper on GPU/CPU, writes words to DB. |
| **Video Rendering** | Build & validate RenderPlan JSON, enqueue `RENDER_VIDEO` job. | External Worker runs FFmpeg 1080x1920 composition, uploads MP4 to R2, saves export record. |

---

## 6. Required Environment Variables

```env
# -----------------------------------------------------------------------------
# APPLICATION & HOSTING
# -----------------------------------------------------------------------------
NODE_ENV=production
PORT=3001
NEXT_PUBLIC_APP_URL=https://viralclip.studio

# -----------------------------------------------------------------------------
# DATABASE (PostgreSQL)
# -----------------------------------------------------------------------------
DATABASE_URL=postgresql://user:password@db.region.supabase.co:5432/postgres?sslmode=require
PGSSLMODE=require

# -----------------------------------------------------------------------------
# OBJECT STORAGE (Cloudflare R2 / AWS S3 / Supabase)
# -----------------------------------------------------------------------------
STORAGE_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
STORAGE_BUCKET=viralclip-assets
STORAGE_ACCESS_KEY=<r2_access_key_id>
STORAGE_SECRET_KEY=<r2_secret_access_key>
STORAGE_REGION=auto
STORAGE_PUBLIC_URL=https://assets.viralclip.studio
STORAGE_FORCE_PATH_STYLE=false

# -----------------------------------------------------------------------------
# DEDICATED PROCESSING WORKER
# -----------------------------------------------------------------------------
WORKER_URL=https://worker.viralclip.studio
WORKER_SECRET=<random_high_entropy_secret_token>

# -----------------------------------------------------------------------------
# DURABLE QUEUE (Redis / BullMQ)
# -----------------------------------------------------------------------------
REDIS_URL=rediss://default:<password>@<host>.upstash.io:6379

# -----------------------------------------------------------------------------
# GOOGLE DRIVE / OAUTH INTEGRATION
# -----------------------------------------------------------------------------
GOOGLE_CLIENT_ID=<google_oauth_client_id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<google_oauth_client_secret>
GOOGLE_REDIRECT_URI=https://viralclip.studio/api/auth/google/callback
GOOGLE_DRIVE_API_KEY=<google_drive_api_key_for_public_folders>

# -----------------------------------------------------------------------------
# AI & THIRD-PARTY SERVICES
# -----------------------------------------------------------------------------
GEMINI_API_KEY=<google_ai_studio_api_key>
PEXELS_API_KEY=<pexels_api_key>
HEYGEN_API_KEY=<heygen_api_key>
```

---

## 7. Required Deployment Services

1. **Vercel:**
   - Host React 19 / Vite SPA frontend.
   - Host lightweight API routes (`/api/*`) for auth, database queries, signed URLs, job status polling.
2. **Worker Host (Railway / Render / Fly.io / AWS ECS / Modal):**
   - Runs `worker.ts` and `python_engine/worker/service.py`.
   - Has installed: `ffmpeg`, `ffprobe`, `python3.10+`, `yt-dlp`, Whisper engine, fonts (`fontconfig`).
3. **Database (PostgreSQL - Supabase / Neon / RDS):**
   - Persistent storage for users, projects, presets, fonts, jobs, and events.
4. **Object Storage (Cloudflare R2 / AWS S3):**
   - Storage for all media binaries: video uploads, rendered MP4s, font files (`.ttf`, `.otf`, `.woff2`), preview SVGs.
5. **Queue (Upstash Redis / Redis Cloud):**
   - Decoupled job scheduling and status broadcasting.

---

## 8. Required Database Migrations

Ensure `schema.sql` contains the new job orchestration tables:

1. **`processing_jobs` Table:**
   - `id VARCHAR(64) PRIMARY KEY`
   - `type VARCHAR(32) NOT NULL` (TRANSCRIBE, IMPORT_PRESETS, CONVERT_PRESETS, RENDER_VIDEO, etc.)
   - `status VARCHAR(32) NOT NULL DEFAULT 'QUEUED'`
   - `progress INT DEFAULT 0`
   - `stage VARCHAR(64) DEFAULT 'QUEUED'`
   - `input JSONB DEFAULT '{}'::jsonb`
   - `output JSONB DEFAULT '{}'::jsonb`
   - `error TEXT`
   - `source_id VARCHAR(64)`
   - `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
   - `started_at TIMESTAMP WITH TIME ZONE`
   - `completed_at TIMESTAMP WITH TIME ZONE`
   - **Indexes:** `idx_processing_jobs_status (status)`, `idx_processing_jobs_created_at (created_at DESC)`, `idx_processing_jobs_source_id (source_id)`.

2. **`processing_job_events` Table:**
   - `id VARCHAR(64) PRIMARY KEY`
   - `job_id VARCHAR(64) REFERENCES processing_jobs(id) ON DELETE CASCADE`
   - `stage VARCHAR(64) NOT NULL`
   - `progress INT DEFAULT 0`
   - `message TEXT`
   - `metadata JSONB DEFAULT '{}'::jsonb`
   - `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
   - **Index:** `idx_processing_job_events_job_id (job_id)`.

---

## 9. Security Risks & Mitigations

| Risk | Threat Vector | Mitigation in ViralClip Studio |
| :--- | :--- | :--- |
| **SSRF** | User submits private internal URLs to `/api/caption-import/sources/scan` or `/api/process`. | Strict domain allowlist (`drive.google.com`, `docs.google.com`, `youtube.com`, `youtu.be`). Private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`, `169.254.169.254`) blocked. |
| **ZIP Bomb** | Malicious nested or highly compressed ZIP uploads. | Limit maximum uncompressed size (250MB), maximum compression ratio (10:1), maximum file count (5,000 files), maximum nesting level (2). |
| **Path Traversal** | ZIP entries with `../../` or absolute file paths. | All ZIP extraction sanitizes paths; rejects entries resolving outside the sandbox directory. Symlinks strictly rejected. |
| **XXE Injection** | Malicious XML entity expansions in Alight Motion / Premiere XML presets. | Use `defusedxml` in Python and strict non-entity XML parsers. Disable external entity resolution (`resolve_entities=False`). |
| **Credential Leakage** | Client-side exposure of Google OAuth refresh tokens or cloud storage keys. | All Drive OAuth operations handled server-side. Google secrets, storage secret keys, and worker tokens never sent to the browser. |
| **Direct Binary Flooding** | User uploads 500MB video directly to Vercel Serverless Function, causing memory overflow. | Browser uploads directly to Object Storage via presigned S3 PUT URLs. Vercel function only processes metadata. |

---

## 10. Performance Bottlenecks & Optimizations

1. **Large Preset Packs (100–5000 presets):**
   - **Bottleneck:** Parsing all files in one huge memory array crashes Python/Node processes.
   - **Solution:** Stream-based batch processing with a batch size of 25. Each batch converts, validates, persists to DB, uploads assets to Object Storage, and commits progress.
2. **Font Binary Ingestion:**
   - **Bottleneck:** Base64-encoding fonts into JSON / DB slows down queries and memory.
   - **Solution:** Fonts are uploaded once to Object Storage key `fonts/<checksum>.<ext>`. The database only stores URL, family, weight, style, and SHA-256 checksum. Missing fonts fallback cleanly without breaking typography.
3. **SVG Preview Rendering:**
   - **Bottleneck:** Rendering SVGs on the fly in the browser causes DOM lag.
   - **Solution:** The worker pre-renders lightweight SVG previews using the identical `CaptionStyleDefinition` math used in the video editor canvas, uploading the SVG to `previews/<preset_id>.svg`.
4. **Idempotency & Deduplication:**
   - **Bottleneck:** Re-importing a Google Drive folder re-converts existing files.
   - **Solution:** SHA-256 fingerprinting on XML content and Google Drive file IDs. Already-imported files return `UNCHANGED` immediately without reprocessing.
