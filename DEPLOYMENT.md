# VIRALCLIP STUDIO — PRODUCTION DEPLOYMENT GUIDE

This guide details how to deploy ViralClip Studio publicly using the production decoupled architecture:
- **Frontend / Orchestration API**: Vercel (or any Node.js container)
- **Database**: PostgreSQL (Neon, Supabase, AWS RDS, or Railway)
- **Object Storage**: S3-compatible (Cloudflare R2, AWS S3, Supabase Storage, MinIO)
- **Queue**: Redis (Upstash, AWS ElastiCache, or Redis Cloud)
- **Heavy Media Worker**: Dedicated Docker container (Railway, Render, Fly.io, AWS ECS, Google Cloud Run)

---

## Architecture Overview

```
                      VIRALCLIP STUDIO
                           USERS
                             │
                             ▼
                    ┌─────────────────┐
                    │     VERCEL      │
                    │ React / Vite UI │
                    │ Light API       │
                    │ Presigned URLs  │
                    │ Job Status/SSE  │
                    └────────┬────────┘
                             │
                      HTTPS / SSE
                             │
                 ┌───────────┴───────────┐
                 ▼                       ▼
          ┌──────────────┐        ┌──────────────┐
          │  PostgreSQL  │        │ S3 / R2 / S3 │
          │  (Neon / RDS)│        │ Storage      │
          │ Projects     │        │ Source Video │
          │ Jobs         │        │ Render Plans │
          │ Captions     │        │ Exports      │
          └──────────────┘        └──────┬───────┘
                                         │
                                         ▼
                             ┌─────────────────────┐
                             │  PROCESSING WORKER  │
                             │  (Docker on VPS)    │
                             │ FFmpeg / FFprobe    │
                             │ Whisper (Local)     │
                             │ yt-dlp              │
                             │ ASS Subtitle Render │
                             │ 1080x1920 Clean MP4 │
                             └─────────────────────┘
```

---

## 1. Object Storage Setup (Cloudflare R2 or AWS S3)

### Using Cloudflare R2 (Recommended - Zero Egress Fees)
1. Go to Cloudflare Dashboard → **R2 Object Storage** → Create bucket: `viralclip-media`.
2. Generate API Tokens: **Manage R2 API Tokens** → Create Token (Permission: Object Read & Write).
3. Copy:
   - Account ID
   - Access Key ID
   - Secret Access Key
4. Note your S3 Endpoint:
   `STORAGE_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   `STORAGE_BUCKET=viralclip-media`
   `STORAGE_REGION=auto`

### CORS Configuration
Add this CORS policy to your bucket:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 2. Database Setup (PostgreSQL)

Use **Neon Serverless Postgres**, **Supabase**, or **AWS RDS**:
1. Create a PostgreSQL 15+ database instance.
2. Get the connection string:
   `DATABASE_URL=postgres://user:password@host:5432/dbname?sslmode=require`
3. ViralClip Studio automatically executes `src/services/database/schema.sql` on startup to bootstrap all tables and indexes.

---

## 3. Queue Setup (Redis)

Use **Upstash Redis** or **Redis Cloud**:
1. Create a Redis database.
2. Copy the standard Redis URI:
   `REDIS_URL=rediss://default:password@endpoint.upstash.io:6379`

---

## 4. Dedicated Background Worker Deployment

Deploy `Dockerfile.worker` to a container platform (Railway, Render, Fly.io, or AWS ECS).

### Option A: Railway
1. Create a new project in Railway.
2. Select **Deploy from GitHub Repo**.
3. In service settings, set:
   - **Dockerfile Path**: `Dockerfile.worker`
4. Set Environment Variables:
   ```env
   NODE_ENV=production
   PORT=3002
   DATABASE_URL=postgresql://...
   REDIS_URL=rediss://...
   STORAGE_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
   STORAGE_REGION=auto
   STORAGE_BUCKET=viralclip-media
   STORAGE_ACCESS_KEY=...
   STORAGE_SECRET_KEY=...
   WORKER_SECRET=generate-a-strong-random-uuid
   FFMPEG_PATH=ffmpeg
   FFPROBE_PATH=ffprobe
   YT_DLP_PATH=yt-dlp
   WHISPER_MODEL=Xenova/whisper-tiny
   ```

### Option B: Docker / VPS (Ubuntu / Debian)
```bash
docker build -f Dockerfile.worker -t viralclip-worker .
docker run -d --name viralclip-worker \
  --restart unless-stopped \
  -p 3002:3002 \
  --env-file .env.production \
  viralclip-worker
```

---

## 5. Frontend & API Deployment (Vercel)

1. Connect your GitHub repository to Vercel.
2. Configure Project Settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Set Environment Variables in Vercel Dashboard:
   ```env
   NODE_ENV=production
   DATABASE_URL=postgresql://...
   REDIS_URL=rediss://...
   STORAGE_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
   STORAGE_REGION=auto
   STORAGE_BUCKET=viralclip-media
   STORAGE_ACCESS_KEY=...
   STORAGE_SECRET_KEY=...
   WORKER_URL=https://your-worker-service.railway.app
   WORKER_SECRET=generate-a-strong-random-uuid
   NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
   ```
4. Deploy!

---

## 6. Local Development Setup

You can develop completely locally without external cloud dependencies:

### Quickstart (In-Process Fallbacks)
```bash
npm install
npm run dev
```
- Storage defaults to `data/storage/` on disk.
- Database defaults to disk-journaled storage in `.projects/` and `data/jobs/`.
- Queue operates in-process with real event dispatching.

### Full Local Cloud Simulation (Docker Compose)
To run the full production stack locally:
```bash
docker compose up -d
```
Starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- MinIO (S3-compatible) on `localhost:9000` (Console on `localhost:9001`)
- Worker on `localhost:3002`
- Web Application on `localhost:3001`

---

## 7. Verification & Health Monitoring

Visit `/api/system/health` on your deployed domain to inspect real-time system status:
```json
{
  "status": "healthy",
  "database": "postgresql",
  "storage": "s3",
  "queue": "bullmq",
  "worker": {
    "status": "connected",
    "activeJobs": 0,
    "lastHeartbeat": "2026-09-27T12:00:00.000Z"
  },
  "ffmpeg": "available",
  "ffprobe": "available",
  "whisper": "available",
  "ytDlp": "available"
}
```
In the ViralClip Studio UI, click **Diagnostics** to view the live health status dashboard.
