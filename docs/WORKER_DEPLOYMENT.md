# VIRALCLIP STUDIO — DEDICATED PROCESSING WORKER DEPLOYMENT

**Component:** Media & Preset Processing Worker  
**Supported Hosts:** Railway, Render, Fly.io, Modal, RunPod, AWS ECS, Dedicated Linux VPS

---

## 1. Role of the Worker

The dedicated worker isolates heavy, long-running operations from Vercel Serverless Functions:
1. **FFmpeg 1080x1920 Video Composition:** Complex multi-layer filters, ASS subtitle burn-in, audio ducking, B-roll crossfading.
2. **Local Whisper Speech-to-Text:** ONNX/PyTorch acoustic model inference with native word-level timestamps.
3. **Google Drive Batch Preset Ingestion:** Downloading, unzipping, parsing, converting, and validating packs of 100–5,000 presets in batches of 25.
4. **Font Registration & Preview Generation:** OpenType/TrueType binary inspection, SHA-256 fingerprinting, SVG preview card generation, and Object Storage uploading.
5. **yt-dlp Video Ingestion:** Downloading high-resolution streams directly to object storage.

---

## 2. Docker Container Configuration

Use `Dockerfile.worker` in the project root:

```dockerfile
FROM node:20-bookworm-slim

# Install system dependencies: FFmpeg, Python 3, fontconfig, and audio decoders
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    fontconfig \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Install Python requirements
COPY python_engine/requirements.txt ./python_engine/requirements.txt
RUN pip3 install --no-cache-dir -r python_engine/requirements.txt --break-system-packages

# Copy application source
COPY . .

# Environment Defaults
ENV NODE_ENV=production
ENV PORT=3002
ENV WORKER_PORT=3002

EXPOSE 3002

CMD ["node", "--loader", "tsx", "worker.ts"]
```

---

## 3. Worker Environment Variables

Configure these on your worker host (e.g., Railway or Render):

| Variable | Description | Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime mode | `production` |
| `WORKER_PORT` | Listening port | `3002` |
| `WORKER_SECRET` | Authentication token | Matches `WORKER_SECRET` in Vercel |
| `DATABASE_URL` | PostgreSQL connection string | Pooled database connection |
| `REDIS_URL` | Redis connection for BullMQ | Upstash / Redis Cloud connection |
| `STORAGE_ENDPOINT` | S3 / R2 endpoint | `https://<id>.r2.cloudflarestorage.com` |
| `STORAGE_BUCKET` | Target bucket | `viralclip-assets` |
| `STORAGE_ACCESS_KEY` | Storage Access Key | R2 / S3 access key |
| `STORAGE_SECRET_KEY` | Storage Secret Key | R2 / S3 secret key |
| `STORAGE_PUBLIC_URL` | CDN / public access URL | `https://assets.viralclip.studio` |
| `WHISPER_MODEL` | Whisper model size | `base` (or `small` on GPU instances) |

---

## 4. Host-Specific Deployment Guides

### Option A: Railway (Fastest Setup)
1. In Railway, click **New Project** > **Deploy from GitHub repo**.
2. Select the `viralclip-studio` repository.
3. In **Settings** > **Build**:
   - Set **Dockerfile Path** to `Dockerfile.worker`.
4. In **Variables**, add all worker environment variables.
5. In **Settings** > **Networking**, click **Generate Domain**.
6. Copy the generated domain (e.g. `https://worker-production.up.railway.app`) and set it as `WORKER_URL` in your Vercel project settings.

### Option B: Render
1. Create a **Web Service** connected to your repository.
2. Set **Runtime** to `Docker` and **Dockerfile Path** to `Dockerfile.worker`.
3. Set Instance Type to **Standard (2 GB RAM, 1 CPU)** or higher.
4. Set Environment Variables.
5. Set Health Check Path to `/api/health`.

### Option C: Fly.io
1. Install `flyctl`.
2. Launch machine:
   ```bash
   fly launch --dockerfile Dockerfile.worker
   fly scale memory 2048
   ```
3. Set secrets:
   ```bash
   fly secrets set WORKER_SECRET="your_secret" DATABASE_URL="your_db"
   ```

### Option D: Modal / RunPod (GPU Accelerated)
For ultra-fast Whisper transcription (10x faster than CPU):
- Mount GPU container with CUDA 12 support.
- Worker exposes the same REST endpoints (`/api/worker/transcribe`, `/api/worker/render`).
- Returns identical JSON structure conforming to `src/services/worker/types.ts`.

---

## 5. Batch Processing & Performance Guidelines (Requirement 10 & 25)

1. **Batch Size Tuning:**
   - The importer default batch size is **25 presets**.
   - Processing 25 presets takes ~3–8 seconds in Python, keeping memory usage below 300MB.
   - For large packs (1,000–5,000 presets), memory is reclaimed between batches.
2. **Font Registry Caching:**
   - Font binaries are checked against `caption_fonts` using SHA-256 before extraction.
   - Identical fonts shared across 500 presets are extracted and stored only once.
3. **SVG Preview Generation:**
   - Previews use lightweight vector SVGs generated synchronously in Python without needing headless browser instances.

---

## 6. Worker Health & Diagnostic Verification

Test the running worker endpoint:

```bash
curl -H "Authorization: Bearer $WORKER_SECRET" https://worker.viralclip.studio/api/health
```

Expected Response:
```json
{
  "status": "healthy",
  "workerId": "worker_1234_abc",
  "engine": "ViralClip-Worker-Engine",
  "ffmpeg": true,
  "ffprobe": true,
  "storage": "S3/R2",
  "database": "postgresql",
  "queue": "Redis+BullMQ"
}
```
