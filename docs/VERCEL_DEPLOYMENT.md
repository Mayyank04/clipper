# VIRALCLIP STUDIO — VERCEL & PRODUCTION DEPLOYMENT GUIDE

**Author:** Video Systems & Cloud Architecture Engineering  
**Target Platform:** Vercel (Web / API) + External Processing Worker + PostgreSQL + Cloudflare R2 / AWS S3

---

## 1. Architecture Overview

```
                         VIRALCLIP STUDIO
                               |
                               v
                         VERCEL
                               |
              +----------------+----------------+
              |                                 |
              v                                 v
        React/Vite UI                    Vercel API
        Dashboard                       Auth
        Editor                          Projects
        Captions                        Presets
        Timeline                        Jobs
        Preset Library                  Metadata
              |                                 |
              +----------------+----------------+
                               |
                               v
                         PostgreSQL
                               |
                               v
                     Object Storage
                               |
              +----------------+----------------+
              |                                 |
              v                                 v
       Video / Audio Files              Preset Assets
       Uploaded Media                   Fonts
       Rendered Videos                  SVG previews
       Temporary Assets                 Thumbnails
                               |
                               v
                    EXTERNAL WORKER
                               |
              +----------------+----------------+
              |                |               |
            FFmpeg          Python           Whisper
              |                |               |
          Rendering       Conversion       Transcription
                               |
                               v
                         Job Updates
                               |
                               v
                            Vercel
```

---

## 2. PostgreSQL Setup

ViralClip Studio requires a production-grade PostgreSQL database with support for JSONB, composite indexes, and connection pooling.

### Recommended Providers:
- **Supabase** (Managed Postgres with connection pooling)
- **Neon** (Serverless autoscaling Postgres with connection pooling via PgBouncer)
- **AWS RDS** (Managed PostgreSQL 15+)

### Setup Steps:
1. Create a PostgreSQL 15+ database instance.
2. Retrieve the pooled connection URI (e.g., for Supabase: port 6543 for transaction mode, or port 5432 for session mode).
3. Append `?sslmode=require` to enforce TLS.
4. Execute `src/services/database/schema.sql` to initialize all tables:
   ```bash
   psql "$DATABASE_URL" -f src/services/database/schema.sql
   ```
5. Confirm tables exist:
   - `users`, `media`, `projects`, `transcripts`, `captions`, `render_plans`, `jobs`, `exports`
   - `caption_preset_sources`, `caption_presets`, `caption_fonts`, `caption_import_jobs`, `caption_import_errors`
   - `processing_jobs`, `processing_job_events`

---

## 3. Object Storage Setup (Cloudflare R2 / AWS S3)

Object storage is required to store:
- User uploaded videos and audio files
- Rendered 1080x1920 MP4 exports
- Extracted font binaries (`.ttf`, `.otf`, `.woff2`)
- Pre-rendered SVG preset card previews
- Video thumbnails

### Recommended: Cloudflare R2 (Zero Egress Fees)
1. In Cloudflare Dashboard, navigate to **R2** > **Create bucket** (e.g. `viralclip-assets`).
2. Generate an API Token with **Object Read & Write** permissions.
3. Note:
   - `STORAGE_ENDPOINT`: `https://<account_id>.r2.cloudflarestorage.com`
   - `STORAGE_BUCKET`: `viralclip-assets`
   - `STORAGE_ACCESS_KEY`: Access Key ID
   - `STORAGE_SECRET_KEY`: Secret Access Key
   - `STORAGE_PUBLIC_URL`: Custom domain (e.g. `https://assets.viralclip.studio`) or R2 public bucket URL.
4. Configure CORS on the bucket to allow browser uploads from your Vercel domain:
   ```json
   [
     {
       "AllowedOrigins": ["https://viralclip.studio", "http://localhost:3001"],
       "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag", "Content-Length"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

---

## 4. Dedicated Worker Deployment

Because Vercel Serverless Functions have a 10s–60s timeout and a read-only filesystem, heavy processing (FFmpeg composition, Whisper STT, Google Drive bulk batch conversion) runs on an external worker.

### Supported Worker Hosts:
- **Railway** (Recommended: 1-click Docker deployment)
- **Render** (Background Worker or Web Service)
- **Fly.io** (Fly machine with persistent volume)
- **Modal / RunPod** (GPU acceleration for Whisper)
- **AWS ECS / Dedicated VPS**

See [WORKER_DEPLOYMENT.md](file:///Users/mayankgautam/Desktop/viralclip-studio---ai-youtube-to-shorts/docs/WORKER_DEPLOYMENT.md) for full Docker and environment configuration.

---

## 5. Google Drive & OAuth Configuration

### Setup in Google Cloud Console:
1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project (e.g. `ViralClip Studio`).
3. Enable the **Google Drive API**.
4. Configure the **OAuth Consent Screen**:
   - User Type: External
   - Scopes: `https://www.googleapis.com/auth/drive.readonly`
5. Create **OAuth 2.0 Client ID**:
   - Application type: Web application
   - Authorized redirect URI: `https://<your_domain>/api/auth/google/callback`
6. Save:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_DRIVE_API_KEY` (Optional, for public folder indexing)

> **Security Rule:** Never expose `GOOGLE_CLIENT_SECRET` or service account keys in frontend code or `NEXT_PUBLIC_*` variables.

---

## 6. Environment Variables Reference

Configure these in the Vercel Dashboard under **Project Settings** > **Environment Variables**:

| Variable | Description | Example / Note |
| :--- | :--- | :--- |
| `NODE_ENV` | Application environment | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `STORAGE_ENDPOINT` | S3 / R2 endpoint URL | `https://<id>.r2.cloudflarestorage.com` |
| `STORAGE_BUCKET` | Target bucket name | `viralclip-assets` |
| `STORAGE_ACCESS_KEY` | Storage Access Key ID | R2 / S3 access key |
| `STORAGE_SECRET_KEY` | Storage Secret Access Key | R2 / S3 secret key |
| `STORAGE_REGION` | S3 region | `auto` (for R2) or `us-east-1` |
| `STORAGE_PUBLIC_URL` | CDN / public access URL | `https://assets.viralclip.studio` |
| `WORKER_URL` | External processing worker URL | `https://worker.viralclip.studio` |
| `WORKER_SECRET` | Shared secret token | High-entropy random string |
| `REDIS_URL` | Upstash / Redis Cloud connection | `rediss://default:pass@host.upstash.io:6379` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `*.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`| Google OAuth Client Secret | Keep strictly server-side |
| `GOOGLE_REDIRECT_URI` | Google OAuth Redirect URI | `https://<domain>/api/auth/google/callback` |
| `GEMINI_API_KEY` | Google Gemini AI Studio API key | Used for AI Polish & Hook generation |
| `PEXELS_API_KEY` | Pexels stock video API key | Used for B-roll search |

---

## 7. Vercel Configuration (`vercel.json`)

The application is deployed to Vercel as a Vite SPA frontend with Serverless API route handling:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 8. Database Migrations & Verification

To verify database tables and connectivity from your terminal:
```bash
# Verify schema
npm run typecheck
npx tsx -e "
import { PostgresDatabase } from './src/services/database/PostgresDatabase';
const db = PostgresDatabase.getInstance();
db.getHealth().then(console.log);
"
```

---

## 9. Local Development Workflow

To develop and test locally:
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Start the local server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3001` in your browser.
4. When `WORKER_URL` and `DATABASE_URL` are not set, ViralClip Studio automatically runs in disk-journaled local mode with local storage in `data/storage/` and local job processing.

---

## 10. Production Acceptance & Verification Checklist

Before releasing to production users, verify:
- [ ] `GET /api/system/health` returns status `ok` and all subsystems report `ready`.
- [ ] In **Captions** > **Styles** > **Import Preset Pack**:
  - Scanning a Google Drive folder completes and discovers files without timeout.
  - Clicking **Import All** creates a queued job immediately.
  - Job state transitions through `SCANNING` -> `DISCOVERING` -> `DOWNLOADING` -> `ANALYZING` -> `CONVERTING` -> `VALIDATING` -> `REGISTERING_FONTS` -> `GENERATING_PREVIEWS` -> `IMPORTING` -> `COMPLETED`.
  - Fonts are saved with Object Storage URLs.
  - SVG preview cards load from Object Storage URLs.
  - Re-importing the same source returns `UNCHANGED` (idempotent deduplication).
- [ ] Exporting a short generates verified 1080x1920 MP4 using the identical `CaptionStyleDefinition`.
- [ ] Vercel build (`npm run build`, `npm run typecheck`, `npm run lint`) succeeds with zero errors.
