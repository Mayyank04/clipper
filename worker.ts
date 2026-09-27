/**
 * VIRALCLIP STUDIO — DEDICATED MEDIA PROCESSING WORKER
 * Independent stateless worker service for heavy processing:
 * FFmpeg, FFprobe, Local Whisper (ONNX), yt-dlp, Caption generation, B-roll, SFX, and Rendering.
 * Communicates via BullMQ queue and secure HTTP endpoints.
 */

import fs from 'fs';
import path from 'path';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import express, { Request, Response } from 'express';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import dotenv from 'dotenv';

dotenv.config();

import { StorageProvider } from './src/services/storage/StorageProvider';
import { PostgresDatabase } from './src/services/database/PostgresDatabase';
import { QueueService, JobStage, PersistentJobData } from './src/services/queue/QueueService';
import { LocalWhisperProvider } from './src/utils/transcription/providers/LocalWhisperProvider';
import { probeSourceMedia } from './src/utils/videoQuality/sourceQualityAnalyzer';
import { prepareRenderAssets } from './src/utils/videoQuality/renderAssetPreparer';
import { buildFFmpegRenderArgs, getRenderQualityProfile } from './src/utils/videoQuality/ffmpegRenderPipeline';
import { groupWordsIntoCaptionSegments } from './src/utils/captionEngine';
import { YouTubeDownloader } from './src/utils/youtubeDownloader';

const execFileAsync = promisify(execFile);
const ffmpegPath = ffmpegStatic || 'ffmpeg';
const ffprobePath = (ffprobeStatic as any)?.path || 'ffprobe';

const WORKER_PORT = Number(process.env.WORKER_PORT || 3002);
const WORKER_SECRET = process.env.WORKER_SECRET || 'viralclip_worker_secret';
const WORKER_ID = `worker_${process.pid}_${Math.random().toString(36).slice(2, 7)}`;

const storage = StorageProvider.getInstance();
const db = PostgresDatabase.getInstance();
const queue = QueueService.getInstance();
const whisper = new LocalWhisperProvider();
const youtube = new YouTubeDownloader(ffmpegPath);

const app = express();
app.use(express.json({ limit: '50mb' }));

// Auth middleware for direct worker HTTP endpoints
function requireWorkerAuth(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized worker call' });
  }
  const token = authHeader.replace('Bearer ', '').trim();
  if (token !== WORKER_SECRET) {
    return res.status(403).json({ error: 'Forbidden: invalid worker secret' });
  }
  next();
}

// Global Worker Health
app.get('/api/health', async (req: Request, res: Response) => {
  const dbHealth = await db.getHealth();
  res.json({
    status: 'healthy',
    workerId: WORKER_ID,
    engine: 'ViralClip-Worker-Engine',
    ffmpeg: Boolean(ffmpegPath),
    ffprobe: Boolean(ffprobePath),
    storage: storage.isCloudStorage() ? 'S3/R2' : 'LocalDisk',
    database: dbHealth.engine,
    queue: queue.isRedisActive() ? 'Redis+BullMQ' : 'InProcess',
    timestamp: new Date().toISOString(),
  });
});

// Helper: Ensure isolated temp job dir
function createJobWorkspace(jobId: string): string {
  const dir = path.resolve('/tmp', 'viralclip_worker', jobId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function cleanJobWorkspace(dir: string): void {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn(`[Worker] Failed to clean temp workspace ${dir}:`, err);
  }
}

// ============================================================================
// JOB PROCESSORS
// ============================================================================

/**
 * 1. PROCESS MEDIA INGESTION
 */
export async function processMediaJob(job: PersistentJobData): Promise<any> {
  const workspace = createJobWorkspace(job.id);
  try {
    await queue.updateJobProgress(job.id, 10, 'DOWNLOADING', 'Fetching source media from object storage...');
    const storedKey = job.payload.storedKey || job.payload.objectKey;
    const mediaId = job.mediaId || job.payload.mediaId;

    const localSource = path.join(workspace, 'source.mp4');
    await storage.download(storedKey, localSource);

    await queue.updateJobProgress(job.id, 40, 'PROBING', 'Running forensic FFprobe on uploaded media...');
    const sourceInfo = await probeSourceMedia(localSource);

    const hasAudio = Boolean(sourceInfo.sourceAudioCodec || sourceInfo.sourceAudioBitrate);
    const hasVideo = Boolean(sourceInfo.sourceWidth > 0 && sourceInfo.sourceHeight > 0);

    if (!hasVideo && !hasAudio) {
      throw new Error('Media file contains neither video nor audio stream');
    }

    await queue.updateJobProgress(job.id, 75, 'PROBING', 'Generating preview thumbnail...');
    const thumbPath = path.join(workspace, 'thumb.jpg');
    try {
      await execFileAsync(ffmpegPath, [
        '-y',
        '-ss',
        Math.min(1.0, Math.max(0.1, sourceInfo.sourceDuration / 4)).toFixed(2),
        '-i',
        localSource,
        '-vframes',
        '1',
        '-q:v',
        '3',
        thumbPath,
      ]);
    } catch {
      // Non-fatal if audio-only
    }

    let thumbUrl: string | undefined;
    if (fs.existsSync(thumbPath)) {
      const thumbKey = `thumbnails/${mediaId}/thumb.jpg`;
      thumbUrl = await storage.upload(thumbKey, fs.readFileSync(thumbPath), 'image/jpeg');
    }

    const result = {
      mediaId,
      duration: sourceInfo.sourceDuration,
      width: sourceInfo.sourceWidth,
      height: sourceInfo.sourceHeight,
      fps: sourceInfo.sourceFPS,
      hasAudio,
      hasVideo,
      videoCodec: sourceInfo.sourceCodec,
      audioCodec: sourceInfo.sourceAudioCodec,
      thumbnailUrl: thumbUrl,
    };

    await db.saveMedia({
      id: mediaId,
      stored_key: storedKey,
      file_size_bytes: fs.statSync(localSource).size,
      duration: sourceInfo.sourceDuration,
      width: sourceInfo.sourceWidth,
      height: sourceInfo.sourceHeight,
      fps: sourceInfo.sourceFPS,
      has_audio: hasAudio,
      has_video: hasVideo,
      video_codec: sourceInfo.sourceCodec,
      audio_codec: sourceInfo.sourceAudioCodec,
      status: 'READY',
      metadata: result,
    });

    await queue.updateJobProgress(job.id, 100, 'COMPLETED', 'Media ingestion and validation complete', { result });
    return result;
  } catch (err: any) {
    await queue.failJob(job.id, 'MEDIA_INVALID', err.message);
    throw err;
  } finally {
    cleanJobWorkspace(workspace);
  }
}

/**
 * 2. PROCESS YOUTUBE DOWNLOAD
 */
export async function processYouTubeJob(job: PersistentJobData): Promise<any> {
  const workspace = createJobWorkspace(job.id);
  try {
    const { url, title } = job.payload;
    await queue.updateJobProgress(job.id, 5, 'DOWNLOADING', 'Initializing yt-dlp stream pipeline...');

    const result = await youtube.downloadVideo(url, workspace, {
      onLog: (msg) => {
        const pctMatch = msg.match(/(\d+(?:\.\d+)?)%/);
        if (pctMatch) {
          const pct = Math.round(parseFloat(pctMatch[1]));
          queue.updateJobProgress(job.id, Math.round(5 + pct * 0.7), 'DOWNLOADING', `Downloading YouTube media... ${pct}%`);
        }
      },
    });

    if (!result.success || !result.filePath || !fs.existsSync(result.filePath)) {
      const errCode = result.classifiedError?.code || 'YOUTUBE_DOWNLOAD_FAILED';
      const errMsg = result.classifiedError?.userMessage || result.error || 'YouTube download failed';
      throw new Error(`[${errCode}] ${errMsg}`);
    }

    await queue.updateJobProgress(job.id, 80, 'PROBING', 'Analyzing downloaded stream metadata...');
    const sourceInfo = await probeSourceMedia(result.filePath);

    await queue.updateJobProgress(job.id, 88, 'UPLOADING', 'Uploading source to object storage...');
    const mediaId = `yt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const storedKey = `youtube/${mediaId}/source.mp4`;

    const publicUrl = await storage.upload(
      storedKey,
      fs.createReadStream(result.filePath) as any,
      'video/mp4'
    );

    const hasAudio = Boolean(sourceInfo.sourceAudioCodec || sourceInfo.sourceAudioBitrate);
    const hasVideo = Boolean(sourceInfo.sourceWidth > 0 && sourceInfo.sourceHeight > 0);

    const mediaRecord = {
      id: mediaId,
      originalFilename: `${title || 'YouTube Video'}.mp4`,
      stored_key: storedKey,
      publicUrl,
      duration: sourceInfo.sourceDuration,
      width: sourceInfo.sourceWidth,
      height: sourceInfo.sourceHeight,
      fps: sourceInfo.sourceFPS,
      hasAudio,
      hasVideo,
      videoCodec: sourceInfo.sourceCodec,
      audioCodec: sourceInfo.sourceAudioCodec,
    };

    await db.saveMedia(mediaRecord);

    const jobResult = {
      ...mediaRecord,
      sourceMediaId: mediaId,
      videoUrl: publicUrl,
    };

    await queue.updateJobProgress(job.id, 100, 'COMPLETED', 'YouTube import ready for editing', { result: jobResult });
    return jobResult;
  } catch (err: any) {
    await queue.failJob(job.id, 'YOUTUBE_DOWNLOAD_FAILED', err.message);
    throw err;
  } finally {
    cleanJobWorkspace(workspace);
  }
}

/**
 * 3. PROCESS TRANSCRIPTION & CAPTION BEAT GENERATION
 */
export async function processTranscriptionJob(job: PersistentJobData): Promise<any> {
  const workspace = createJobWorkspace(job.id);
  try {
    const { mediaUrl, language = 'auto' } = job.payload;
    await queue.updateJobProgress(job.id, 10, 'DOWNLOADING', 'Preparing media for Whisper transcription...');

    const localAudio = path.join(workspace, 'extracted_16k.wav');
    const localInput = path.join(workspace, 'input_media');

    if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
      await storage.download(mediaUrl, localInput);
    } else if (fs.existsSync(mediaUrl)) {
      fs.copyFileSync(mediaUrl, localInput);
    } else {
      await storage.download(mediaUrl, localInput);
    }

    await queue.updateJobProgress(job.id, 25, 'EXTRACTING_AUDIO', 'Extracting 16kHz mono PCM audio track...');
    await execFileAsync(ffmpegPath, [
      '-y',
      '-i',
      localInput,
      '-vn',
      '-acodec',
      'pcm_s16le',
      '-ar',
      '16000',
      '-ac',
      '1',
      localAudio,
    ]);

    await queue.updateJobProgress(job.id, 45, 'TRANSCRIBING', 'Running local Whisper speech-to-text inference...');

    const transcriptResult = await whisper.transcribe({
      audioPath: localAudio,
      language,
      wordTimestamps: true,
    });

    const rawTranscript = transcriptResult.transcript;
    const words = rawTranscript?.words || [];

    // Strictly validate native word timestamps
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (w.start < 0 || w.end <= w.start) {
        throw new Error(`Invalid non-monotonic Whisper timestamp detected at word "${w.text}"`);
      }
      if (i > 0 && w.start < words[i - 1].start) {
        throw new Error(`Monotonic timeline violation between "${words[i - 1].text}" and "${w.text}"`);
      }
    }

    await queue.updateJobProgress(job.id, 90, 'GENERATING_CAPTIONS', 'Computing caption beats & visual hold threshold...');

    const wordTimings = words.map((w) => ({
      word: w.text,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
    }));

    const segments = groupWordsIntoCaptionSegments(wordTimings, {
      wordsPerGroup: 3,
      maxCharacters: 34,
      maxDuration: 3.0,
      pauseThresholdSeconds: 0.32,
    });

    const finalResult = {
      transcript: words.map((w) => w.text).join(' '),
      language: transcriptResult.detectedLanguage,
      duration: transcriptResult.duration,
      words,
      segments,
    };

    await queue.updateJobProgress(job.id, 100, 'COMPLETED', 'Transcription complete with real word timestamps', {
      result: finalResult,
    });

    return finalResult;
  } catch (err: any) {
    await queue.failJob(job.id, 'TRANSCRIPTION_FAILED', err.message);
    throw err;
  } finally {
    cleanJobWorkspace(workspace);
  }
}

/**
 * 4. PROCESS CANONICAL RENDER PLAN
 */
export async function processRenderJob(job: PersistentJobData): Promise<any> {
  const workspace = createJobWorkspace(job.id);
  try {
    const { renderPlan, options } = job.payload;
    await queue.updateJobProgress(job.id, 5, 'PREPARING_BROLL', 'Validating RenderPlan assets and fonts...');

    const prepared = await prepareRenderAssets(
      job.id,
      renderPlan,
      workspace
    );

    const renderOpts = {
      sourcePath: prepared.sourceLocalPath,
      outputPath: prepared.outputPath,
      sourceInfo: prepared.sourceInfo,
      startTime: renderPlan.startTime || 0,
      duration: prepared.sourceInfo.sourceDuration,
      qualityMode: options?.qualityMode || 'HIGH',
      subtitlePath: prepared.subtitleAssPath,
      watermarkText: undefined, // Explicit clean unwatermarked export!
    };

    const { args: ffmpegArgs } = buildFFmpegRenderArgs(renderOpts);

    await queue.updateJobProgress(job.id, 15, 'RENDERING', 'Executing FFmpeg 1080x1920 vertical composition...');

    const child = spawn(ffmpegPath, ffmpegArgs);
    let lastProgress = 15;

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        const text = data.toString();
        const timeMatch = text.match(/out_time_us=(\d+)/);
        if (timeMatch && prepared.sourceInfo.sourceDuration > 0) {
          const currentSec = parseInt(timeMatch[1], 10) / 1000000;
          const pct = Math.min(92, Math.max(15, 15 + Math.round((currentSec / prepared.sourceInfo.sourceDuration) * 75)));
          if (pct > lastProgress) {
            lastProgress = pct;
            queue.updateJobProgress(job.id, pct, 'RENDERING', `Rendering 1080x1920 video... ${pct}%`);
          }
        }
      });
    }

    const exitCode = await new Promise<number>((resolve, reject) => {
      child.on('close', resolve);
      child.on('error', reject);
    });

    if (exitCode !== 0 || !fs.existsSync(prepared.outputPath)) {
      throw new Error(`FFmpeg exited with error code ${exitCode}`);
    }

    // Post-render forensic verification (verifyExport)
    await queue.updateJobProgress(job.id, 94, 'VERIFYING', 'Running forensic FFprobe on rendered MP4...');
    const verified = await probeSourceMedia(prepared.outputPath);

    if (verified.sourceWidth !== 1080 || verified.sourceHeight !== 1920) {
      throw new Error(`Output resolution mismatch: expected 1080x1920, got ${verified.sourceWidth}x${verified.sourceHeight}`);
    }
    const hasOutAudio = Boolean(verified.sourceAudioCodec || verified.sourceAudioBitrate);
    const hasOutVideo = Boolean(verified.sourceWidth > 0 && verified.sourceHeight > 0);
    if (!hasOutVideo || !hasOutAudio) {
      throw new Error('Render verification failed: output is missing video or audio stream');
    }

    // Upload rendered MP4 to Object Storage
    await queue.updateJobProgress(job.id, 97, 'UPLOADING', 'Uploading final video to object storage...');
    const exportKey = `exports/${job.projectId || 'studio'}/${job.id}.mp4`;
    const exportUrl = await storage.upload(
      exportKey,
      fs.createReadStream(prepared.outputPath) as any,
      'video/mp4'
    );

    const downloadUrl = await storage.getSignedDownloadUrl(exportKey, 86400 * 7);

    const exportRecord = {
      id: job.id,
      projectId: job.projectId,
      shortId: renderPlan.shortId,
      jobId: job.id,
      objectKey: exportKey,
      publicUrl: exportUrl,
      downloadUrl,
      fileSize: fs.statSync(prepared.outputPath).size,
      duration: verified.sourceDuration,
      resolution: '1080x1920',
      fps: verified.sourceFPS,
      status: 'COMPLETED',
    };

    await db.saveExport(exportRecord);

    await queue.updateJobProgress(job.id, 100, 'COMPLETED', 'Export complete and verified. Ready for download!', {
      result: exportRecord,
    });

    return exportRecord;
  } catch (err: any) {
    await queue.failJob(job.id, 'RENDER_FAILED', err.message);
    throw err;
  } finally {
    cleanJobWorkspace(workspace);
  }
}

// ============================================================================
// WORKER HTTP ENDPOINTS (FOR REMOTE ADAPTER COMMUNICATION)
// ============================================================================

app.post('/api/worker/transcribe', requireWorkerAuth, async (req: Request, res: Response) => {
  try {
    const job = await queue.addJob('transcription', req.body);
    const result = await processTranscriptionJob(job);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/worker/render', requireWorkerAuth, async (req: Request, res: Response) => {
  try {
    const job = await queue.addJob('render', req.body);
    const result = await processRenderJob(job);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/worker/youtube', requireWorkerAuth, async (req: Request, res: Response) => {
  try {
    const job = await queue.addJob('youtube-download', req.body);
    const result = await processYouTubeJob(job);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/worker/inspect', requireWorkerAuth, async (req: Request, res: Response) => {
  try {
    const { mediaPathOrUrl } = req.body;
    const probe = await probeSourceMedia(mediaPathOrUrl);
    res.json({ success: true, probe });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Worker Server
if (require.main === module) {
  app.listen(WORKER_PORT, '0.0.0.0', () => {
    console.log(`[ViralClip Worker] Dedicated media processing service listening on port ${WORKER_PORT}`);
    console.log(`[ViralClip Worker] Worker ID: ${WORKER_ID}`);
  });
}
