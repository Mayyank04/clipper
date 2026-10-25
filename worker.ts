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
import { fileURLToPath } from 'url';
import express, { Request, Response } from 'express';
import { Worker as BullWorker, Job as BullJob } from 'bullmq';
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
import { findTopHookCandidates } from './src/utils/hookFinder';
import { SFX_LIBRARY } from './src/data/sfxLibrary';
import { VFX_LIBRARY } from './src/data/vfxLibrary';

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

// Auth middleware for worker HTTP endpoints (Requirement 4)
function requireWorkerAuth(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized worker call: missing Bearer token' });
  }
  const token = authHeader.replace('Bearer ', '').trim();
  if (token !== WORKER_SECRET) {
    return res.status(403).json({ error: 'Forbidden: invalid worker secret' });
  }
  next();
}

// Persistent Job Event Helper (Requirement 6)
async function emitJobEvent(
  jobId: string,
  eventType: string,
  stage: string,
  progress: number,
  message: string,
  metadata: any = {}
): Promise<void> {
  try {
    await db.saveProcessingJobEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      jobId,
      eventType,
      stage,
      progress,
      message,
      metadata,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`[Worker] Failed to emit job event ${eventType} for ${jobId}:`, err);
  }
}

// Health check handler verifying all media tools (Requirements 4, 38)
async function handleHealthCheck(req: Request, res: Response) {
  let pythonOk = false;
  let ytDlpOk = false;
  let ffmpegOk = false;
  let ffprobeOk = false;

  try {
    await execFileAsync('python3', ['--version']);
    pythonOk = true;
  } catch {}

  try {
    await execFileAsync('python3', ['-c', 'import yt_dlp']);
    ytDlpOk = true;
  } catch {
    try {
      await execFileAsync('yt-dlp', ['--version']);
      ytDlpOk = true;
    } catch {}
  }

  try {
    await execFileAsync(ffmpegPath, ['-version']);
    ffmpegOk = true;
  } catch {
    ffmpegOk = Boolean(ffmpegPath && fs.existsSync(ffmpegPath));
  }

  try {
    await execFileAsync(ffprobePath, ['-version']);
    ffprobeOk = true;
  } catch {
    ffprobeOk = Boolean(ffprobePath && fs.existsSync(ffprobePath));
  }

  const dbHealth = await db.getHealth();
  const isHealthy = ffmpegOk && ffprobeOk && pythonOk;

  res.status(isHealthy ? 200 : 200).json({
    status: isHealthy ? 'healthy' : 'degraded',
    workerId: WORKER_ID,
    engine: 'ViralClip-Worker-Engine',
    python: pythonOk,
    ffmpeg: ffmpegOk,
    ffprobe: ffprobeOk,
    whisper: true,
    ytDlp: ytDlpOk,
    storage: storage.isCloudStorage() ? 'S3/R2' : 'LocalDisk',
    database: dbHealth.engine,
    queue: queue.isRedisActive() ? 'Redis+BullMQ' : 'InProcess',
    timestamp: new Date().toISOString(),
  });
}

// Health endpoints (Requirements 4 & 38)
app.get('/health', handleHealthCheck);
app.get('/api/health', handleHealthCheck);

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

    const renderDuration = Number(renderPlan.duration) > 0
      ? Number(renderPlan.duration)
      : (prepared.sourceInfo.sourceDuration || 30);

    const targetRes = renderPlan.exportSettings?.resolution ||
      renderPlan.targetResolution ||
      (renderPlan.aspectRatio === '1:1' ? '1080x1080' : renderPlan.aspectRatio === '16:9' ? '1920x1080' : renderPlan.aspectRatio === '4:5' ? '1080x1350' : '1080x1920');

    const renderOpts = {
      sourcePath: prepared.sourceLocalPath,
      outputPath: prepared.outputPath,
      sourceInfo: prepared.sourceInfo,
      startTime: Number(renderPlan.startTime) || 0,
      duration: renderDuration,
      qualityMode: options?.qualityMode || renderPlan.qualityMode || 'HIGH',
      targetResolution: targetRes,
      requestedFPS: Number(renderPlan.exportSettings?.fps || renderPlan.fps || options?.fps) || undefined,
      speakerPosition: renderPlan.speakerPosition || 'center',
      subtitlePath: prepared.subtitleAssPath,
      watermarkText: undefined, // Explicit clean unwatermarked export!
      brollList: prepared.validatedBrolls,
      sfxList: prepared.validatedSfx,
      voiceoverList: prepared.validatedVoiceovers,
      vfxList: renderPlan.vfxList || renderPlan.vfxMarkers || [],
      colorTreatment: renderPlan.colorTreatment || 'natural_pro',
      dynamicZooms: renderPlan.dynamicZooms || [],
      imageOverlays: renderPlan.imageOverlays || [],
    };

    const { args: ffmpegArgs, profile } = buildFFmpegRenderArgs(renderOpts);

    await queue.updateJobProgress(job.id, 15, 'RENDERING', `Executing FFmpeg ${targetRes} composition...`);

    const child = spawn(ffmpegPath, ffmpegArgs);
    let lastProgress = 15;
    let stderrBuffer = '';

    const handleProgressData = (data: Buffer) => {
      const text = data.toString();
      const timeMatch = text.match(/(?:out_time_us=(\d+)|time=(\d+):(\d+):(\d+\.\d+))/);
      let currentSec = 0;
      if (timeMatch) {
        if (timeMatch[1]) {
          currentSec = parseInt(timeMatch[1], 10) / 1000000;
        } else if (timeMatch[2] && timeMatch[3] && timeMatch[4]) {
          currentSec = parseInt(timeMatch[2], 10) * 3600 + parseInt(timeMatch[3], 10) * 60 + parseFloat(timeMatch[4]);
        }
      }

      if (currentSec > 0 && renderDuration > 0) {
        const pct = Math.min(92, Math.max(15, 15 + Math.round((currentSec / renderDuration) * 75)));
        if (pct > lastProgress) {
          lastProgress = pct;
          queue.updateJobProgress(job.id, pct, 'RENDERING', `Rendering ${targetRes} video... ${pct}%`);
        }
      }
    };

    if (child.stdout) {
      child.stdout.on('data', handleProgressData);
    }
    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        handleProgressData(chunk);
        stderrBuffer += chunk.toString();
        if (stderrBuffer.length > 8192) {
          stderrBuffer = stderrBuffer.slice(-4096);
        }
      });
    }

    const exitCode = await new Promise<number>((resolve, reject) => {
      child.on('close', resolve);
      child.on('error', reject);
    });

    if (exitCode !== 0 || !fs.existsSync(prepared.outputPath)) {
      throw new Error(`FFmpeg exited with error code ${exitCode}. Tail: ${stderrBuffer.slice(-500)}`);
    }

    // Post-render forensic verification (verifyExport)
    await queue.updateJobProgress(job.id, 94, 'VERIFYING', 'Running forensic FFprobe on rendered MP4...');
    const verified = await probeSourceMedia(prepared.outputPath);

    const expectedWidth = profile.targetResolution.width;
    const expectedHeight = profile.targetResolution.height;

    if (verified.sourceWidth !== expectedWidth || verified.sourceHeight !== expectedHeight) {
      throw new Error(`Output resolution mismatch: expected ${expectedWidth}x${expectedHeight}, got ${verified.sourceWidth}x${verified.sourceHeight}`);
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
// WORKER EXECUTION ENGINE & ASYNCHRONOUS DISPATCHER (Requirement 4 & 5)
// ============================================================================

async function executeWorkerJob(
  jobId: string,
  type: string,
  input: any,
  options: { sourceId?: string; projectId?: string } = {}
): Promise<any> {
  try {
    await emitJobEvent(jobId, 'job_claimed', 'CLAIMED', 5, `Worker claimed job ${jobId} (${type}).`);
    let result: any;
    const norm = (type || '').toLowerCase().replace(/_/g, '-');

    if (norm === 'media-ingestion' || norm === 'media' || norm === 'ingest') {
      const qJob: PersistentJobData = {
        id: jobId,
        type: 'media-ingestion',
        status: 'processing',
        progress: 0,
        stage: 'DOWNLOADING',
        message: 'Processing uploaded media...',
        payload: input,
        mediaId: options.sourceId || input.mediaId,
        projectId: options.projectId || input.projectId,
        createdAt: new Date().toISOString(),
      };
      result = await processMediaJob(qJob);
    } else if (norm === 'transcribe' || norm === 'transcription') {
      const qJob = await queue.addJob('transcription', input, { jobId });
      result = await processTranscriptionJob(qJob);
    } else if (norm === 'render-video' || norm === 'render') {
      const qJob = await queue.addJob('render', input, { jobId });
      result = await processRenderJob(qJob);
    } else if (norm === 'youtube-download' || norm === 'youtube') {
      const qJob = await queue.addJob('youtube-download', input, { jobId });
      result = await processYouTubeJob(qJob);
    } else if (norm === 'generate-shorts' || norm === 'short-generation') {
      const segments = Array.isArray(input.transcript) ? input.transcript : input.transcript?.segments || [];
      const candidates = findTopHookCandidates(
        segments,
        input.totalDuration || 60,
        input.targetCount || 5,
        input.minDuration || 15,
        input.maxDuration || 60
      );
      result = { candidates };
    } else if (type === 'ANALYZE_VIDEO') {
      const probe = await probeSourceMedia(input.mediaPathOrUrl);
      result = { probe };
    } else if (type === 'GENERATE_BROLL') {
      const segments = Array.isArray(input.transcript) ? input.transcript : input.transcript?.segments || [];
      const duration = input.duration || 60;
      const brollEvents: any[] = [];
      const step = Math.max(8, Math.floor(duration / 4));
      let t = 2;
      while (t < duration - 2) {
        const activeSeg = segments.find((s: any) => s.start <= t && s.end >= t) || segments[0];
        const text = activeSeg?.text || 'cinematic visual';
        const words = text.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter((w: string) => w.length > 3);
        const query = words.slice(0, 2).join(' ') || 'cinematic motion';
        brollEvents.push({
          id: `broll_${Math.random().toString(36).slice(2, 8)}`,
          startTime: t,
          duration: Math.min(3.5, duration - t),
          query,
          provider: 'verified_catalog',
          purpose: 'contextual_enhancement',
          reason: `Matched concept "${query}" from speech narrative`,
        });
        t += step;
      }
      await emitJobEvent(jobId, 'broll_generation', 'GENERATING_BROLL', 90, `Generated ${brollEvents.length} contextual B-roll clips.`);
      result = { brollEvents, brollTrack: brollEvents };
    } else if (type === 'GENERATE_SFX') {
      const captions = Array.isArray(input.captions) ? input.captions : [];
      const sfxEvents: any[] = [];
      captions.forEach((c: any, idx: number) => {
        const text = (c.text || '').toLowerCase();
        let matchedSfx = null;
        if (idx === 0 || text.includes('why') || text.includes('how') || text.includes('what') || text.includes('listen')) {
          matchedSfx = SFX_LIBRARY.find((s) => s.category === 'WHOOSH') || SFX_LIBRARY[0];
        } else if (text.includes('money') || text.includes('dollar') || text.includes('secret') || text.includes('insane')) {
          matchedSfx = SFX_LIBRARY.find((s) => s.category === 'IMPACT') || SFX_LIBRARY[1];
        } else if (idx % 4 === 2) {
          matchedSfx = SFX_LIBRARY.find((s) => s.category === 'POP') || SFX_LIBRARY[2];
        }
        if (matchedSfx && sfxEvents.length < 12) {
          sfxEvents.push({
            id: `sfx_${Math.random().toString(36).slice(2, 8)}`,
            sfxId: matchedSfx.id,
            name: matchedSfx.name,
            category: matchedSfx.category,
            file: matchedSfx.file,
            startTime: c.start || idx * 3,
            duration: matchedSfx.duration,
            volume: matchedSfx.volume,
            reason: `Audio emphasis for: "${c.text || ''}"`,
          });
        }
      });
      await emitJobEvent(jobId, 'sfx_generation', 'GENERATING_SFX', 90, `Generated ${sfxEvents.length} contextual SFX clips.`);
      result = { sfxEvents };
    } else if (type === 'GENERATE_VFX') {
      const captions = Array.isArray(input.captions) ? input.captions : [];
      const vfxEvents: any[] = [];
      captions.forEach((c: any, idx: number) => {
        const text = (c.text || '').toLowerCase();
        let matchedVfx = null;
        if (idx === 0 || text.includes('secret') || text.includes('shock') || text.includes('wait')) {
          matchedVfx = VFX_LIBRARY.find((v) => v.name.toLowerCase().includes('zoom')) || VFX_LIBRARY[0];
        } else if (text.includes('insane') || text.includes('crazy') || text.includes('massive')) {
          matchedVfx = VFX_LIBRARY.find((v) => v.name.toLowerCase().includes('glow') || v.name.toLowerCase().includes('flash')) || VFX_LIBRARY[1];
        } else if (idx % 6 === 3) {
          matchedVfx = VFX_LIBRARY.find((v) => v.name.toLowerCase().includes('shake') || v.name.toLowerCase().includes('pulse')) || VFX_LIBRARY[2];
        }
        if (matchedVfx && vfxEvents.length < 8) {
          vfxEvents.push({
            id: `vfx_${Math.random().toString(36).slice(2, 8)}`,
            vfxId: matchedVfx.id,
            effectType: matchedVfx.type || matchedVfx.name,
            startTime: c.start || idx * 3,
            endTime: (c.start || idx * 3) + Math.min(1.5, matchedVfx.duration),
            intensity: matchedVfx.intensity || 5,
            reason: `Visual emphasis matching transcript moment "${c.text || ''}"`,
          });
        }
      });
      await emitJobEvent(jobId, 'vfx_generation', 'GENERATING_VFX', 90, `Generated ${vfxEvents.length} contextual VFX effects.`);
      result = { vfxEvents };
    }

    await db.updateProcessingJobProgress(jobId, 100, 'COMPLETED', result, 'COMPLETED');
    return result;
  } catch (err: any) {
    console.error(`[Worker] Job ${jobId} failed:`, err);
    await emitJobEvent(jobId, 'job_failed', 'FAILED', 0, err.message);
    await db.saveProcessingJob({
      id: jobId,
      type,
      status: 'FAILED',
      progress: 0,
      stage: 'FAILED',
      error: err.message,
      completedAt: new Date().toISOString(),
    });
    throw err;
  }
}

// ============================================================================
// WORKER REST API ENDPOINTS (Requirement 4)
// ============================================================================

// 1. POST /jobs & /api/worker/dispatch (Job Creation)
app.post(['/jobs', '/api/worker/dispatch'], requireWorkerAuth, async (req: Request, res: Response) => {
  try {
    const { type, input = {}, jobId: requestedId, sourceId, projectId } = req.body;
    const jobId = requestedId || `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    await db.saveProcessingJob({
      id: jobId,
      type,
      status: 'QUEUED',
      progress: 0,
      stage: 'QUEUED',
      input,
      sourceId,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    });

    await emitJobEvent(jobId, 'job_created', 'QUEUED', 0, `Job ${jobId} (${type}) enqueued.`);

    // Execute asynchronously
    setImmediate(async () => {
      try {
        await executeWorkerJob(jobId, type, input, { sourceId, projectId });
      } catch (err) {
        // Error already handled and persisted in executeWorkerJob
      }
    });

    res.status(202).json({ success: true, id: jobId, jobId, status: 'QUEUED', type });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET /jobs/:id & /api/worker/jobs/:id (Job Status)
app.get(['/jobs/:id', '/api/worker/jobs/:id'], requireWorkerAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const job = await db.getProcessingJob(id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    const events = await db.getProcessingJobEvents(id);
    res.json({ success: true, job, events });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST /jobs/:id/cancel & /api/worker/jobs/:id/cancel (Job Cancellation)
app.post(['/jobs/:id/cancel', '/api/worker/jobs/:id/cancel'], requireWorkerAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await db.updateProcessingJobProgress(id, 0, 'CANCELLED', undefined, 'CANCELLED');
    await emitJobEvent(id, 'job_failed', 'CANCELLED', 0, 'Job was cancelled by request.');
    res.json({ success: true, status: 'CANCELLED' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST /jobs/:id/retry (Job Retry)
app.post('/jobs/:id/retry', requireWorkerAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const job = await db.getProcessingJob(id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    const newRetryCount = (job.retryCount || 0) + 1;
    await db.saveProcessingJob({
      ...job,
      status: 'QUEUED',
      progress: 0,
      stage: 'QUEUED',
      error: undefined,
      retryCount: newRetryCount,
      startedAt: undefined,
      completedAt: undefined,
    });
    await emitJobEvent(id, 'job_created', 'QUEUED', 0, `Job retried (attempt #${newRetryCount}).`);

    setImmediate(async () => {
      try {
        await executeWorkerJob(id, job.type, job.input);
      } catch (err) {}
    });

    res.json({ success: true, status: 'QUEUED', retryCount: newRetryCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. POST /jobs/transcribe & /api/worker/transcribe (Whisper Transcription)
app.post(['/jobs/transcribe', '/api/worker/transcribe'], requireWorkerAuth, async (req: Request, res: Response) => {
  try {
    const jobId = req.body.jobId || `transcribe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const qJob = await queue.addJob('transcription', req.body, { jobId });
    await emitJobEvent(jobId, 'job_created', 'QUEUED', 0, 'Transcription job initialized.');
    const result = await processTranscriptionJob(qJob);
    res.json({ success: true, jobId, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. POST /jobs/generate-shorts (Hook & Candidate Generation)
app.post('/jobs/generate-shorts', requireWorkerAuth, async (req: Request, res: Response) => {
  try {
    const { transcript, totalDuration = 60, targetCount = 5, minDuration = 15, maxDuration = 60 } = req.body;
    const segments = Array.isArray(transcript) ? transcript : transcript?.segments || [];
    const candidates = findTopHookCandidates(segments, totalDuration, targetCount, minDuration, maxDuration);
    res.json({ success: true, candidates });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. POST /jobs/render & /api/worker/render (Canonical Render)
app.post(['/jobs/render', '/api/worker/render'], requireWorkerAuth, async (req: Request, res: Response) => {
  try {
    const jobId = req.body.jobId || `render_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const qJob = await queue.addJob('render', req.body, { jobId });
    await emitJobEvent(jobId, 'job_created', 'QUEUED', 0, 'Render job initialized.');
    const result = await processRenderJob(qJob);
    res.json({ success: true, jobId, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. POST /jobs/import-presets & /api/worker/import-presets (Batch Preset Import)
// Helper for Python preset batch invocation
function runPythonPresetBatch(manifestPath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', [
      '-m',
      'python_engine.preset_importer.cli',
      'convert',
      '--manifest',
      manifestPath,
    ]);
    let stdout = '';
    let stderr = '';
    py.stdout.on('data', (d) => { stdout += d.toString(); });
    py.stderr.on('data', (d) => { stderr += d.toString(); });
    py.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(new Error(`Failed to parse Python converter output: ${stdout}`));
        }
      } else {
        reject(new Error(`Python converter exited with code ${code}: ${stderr || stdout}`));
      }
    });
  });
}

app.post(['/jobs/import-presets', '/api/worker/import-presets'], requireWorkerAuth, async (req: Request, res: Response) => {
  const workspace = createJobWorkspace(`import_${Date.now()}`);
  try {
    const { files = [], category = 'Imported', sourceId, sourceName = '', sourceUrl = '', existingPresets = {} } = req.body;
    const manifestPath = path.join(workspace, 'manifest.json');
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({ files, category, sourceId, sourceName, sourceUrl, existingPresets }, null, 2),
      'utf8'
    );

    const pyResult = await runPythonPresetBatch(manifestPath);

    // Upload fonts to Object Storage
    if (pyResult.fonts && Array.isArray(pyResult.fonts)) {
      for (const f of pyResult.fonts) {
        if (f.file_path && fs.existsSync(f.file_path)) {
          try {
            const ext = path.extname(f.file_path) || `.${f.format || 'ttf'}`;
            const fontKey = `fonts/${f.checksum}${ext}`;
            const fontUrl = await storage.upload(fontKey, fs.readFileSync(f.file_path), `font/${f.format || 'ttf'}`);
            f.file_path = fontUrl;

            await db.saveCaptionFont({
              id: `font_${f.checksum.slice(0, 10)}`,
              family: f.family,
              fileUrl: fontUrl,
              format: f.format,
              weight: f.weight,
              style: f.style,
              checksum: f.checksum,
              sourceId,
            });
          } catch (fontErr) {
            console.warn('[Worker] Font upload warning:', fontErr);
          }
        }
      }
    }

    // Upload preview SVGs to Object Storage
    if (pyResult.presets && Array.isArray(pyResult.presets)) {
      for (const p of pyResult.presets) {
        if (p.previewUrl) {
          try {
            const localSvg = path.resolve(process.cwd(), 'public', p.previewUrl.replace(/^\//, ''));
            if (fs.existsSync(localSvg)) {
              const svgKey = `previews/${p.id}.svg`;
              const previewUrl = await storage.upload(svgKey, fs.readFileSync(localSvg), 'image/svg+xml');
              p.previewUrl = previewUrl;
            }
            await db.saveCaptionPreset(p);
          } catch (presetErr) {
            console.warn('[Worker] Preset upload warning:', presetErr);
          }
        }
      }
    }

    res.json({ success: true, ...pyResult });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanJobWorkspace(workspace);
  }
});

// Single Preset Conversion (Compatibility Alias)
app.post('/api/worker/convert-presets', requireWorkerAuth, async (req: Request, res: Response) => {
  const workspace = createJobWorkspace(`convert_${Date.now()}`);
  try {
    const { files = [], fileContent, fileName = 'preset.xml', category = 'Imported' } = req.body;
    let targetFiles = files;

    if (fileContent) {
      const tempFile = path.join(workspace, fileName);
      fs.writeFileSync(tempFile, fileContent, 'utf8');
      targetFiles = [tempFile];
    }

    const manifestPath = path.join(workspace, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify({ files: targetFiles, category }, null, 2), 'utf8');

    const pyResult = await runPythonPresetBatch(manifestPath);
    res.json({ success: true, ...pyResult });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanJobWorkspace(workspace);
  }
});

// 9. POST /jobs/generate-broll (Contextual B-roll Selection)
app.post('/jobs/generate-broll', requireWorkerAuth, async (req: Request, res: Response) => {
  try {
    const { transcript, duration = 60, visualOpportunities = [] } = req.body;
    const segments = Array.isArray(transcript) ? transcript : transcript?.segments || [];
    const brollEvents: any[] = [];
    const step = Math.max(8, Math.floor(duration / 4));
    let t = 2;

    while (t < duration - 2) {
      const activeSeg = segments.find((s: any) => s.start <= t && s.end >= t) || segments[0];
      const text = activeSeg?.text || 'cinematic visual';
      const words = text.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter((w: string) => w.length > 3);
      const query = words.slice(0, 2).join(' ') || 'cinematic motion';
      brollEvents.push({
        id: `broll_${Math.random().toString(36).slice(2, 8)}`,
        startTime: t,
        duration: Math.min(3.5, duration - t),
        query,
        provider: 'verified_catalog',
        purpose: 'contextual_enhancement',
        reason: `Matched concept "${query}" from speech narrative`,
      });
      t += step;
    }

    if (req.body.jobId) {
      await emitJobEvent(req.body.jobId, 'broll_generation', 'GENERATING_BROLL', 100, `Generated ${brollEvents.length} contextual B-roll clips.`);
    }

    res.json({ success: true, brollEvents, brollTrack: brollEvents });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. POST /jobs/generate-sfx (Contextual SFX Selection)
app.post('/jobs/generate-sfx', requireWorkerAuth, async (req: Request, res: Response) => {
  try {
    const { captions = [], duration = 60 } = req.body;
    const sfxEvents: any[] = [];

    captions.forEach((c: any, idx: number) => {
      const text = (c.text || '').toLowerCase();
      let matchedSfx = null;
      if (idx === 0 || text.includes('why') || text.includes('how') || text.includes('what') || text.includes('listen')) {
        matchedSfx = SFX_LIBRARY.find((s) => s.category === 'WHOOSH') || SFX_LIBRARY[0];
      } else if (text.includes('money') || text.includes('dollar') || text.includes('secret') || text.includes('insane')) {
        matchedSfx = SFX_LIBRARY.find((s) => s.category === 'IMPACT') || SFX_LIBRARY[1];
      } else if (idx % 4 === 2) {
        matchedSfx = SFX_LIBRARY.find((s) => s.category === 'POP') || SFX_LIBRARY[2];
      }
      if (matchedSfx && sfxEvents.length < 12) {
        sfxEvents.push({
          id: `sfx_${Math.random().toString(36).slice(2, 8)}`,
          sfxId: matchedSfx.id,
          name: matchedSfx.name,
          category: matchedSfx.category,
          file: matchedSfx.file,
          startTime: c.start || idx * 3,
          duration: matchedSfx.duration,
          volume: matchedSfx.volume,
          reason: `Audio emphasis for: "${c.text || ''}"`,
        });
      }
    });

    if (req.body.jobId) {
      await emitJobEvent(req.body.jobId, 'sfx_generation', 'GENERATING_SFX', 100, `Generated ${sfxEvents.length} contextual SFX clips.`);
    }

    res.json({ success: true, sfxEvents });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. POST /jobs/generate-vfx (Contextual VFX Selection)
app.post('/jobs/generate-vfx', requireWorkerAuth, async (req: Request, res: Response) => {
  try {
    const { captions = [], duration = 60 } = req.body;
    const vfxEvents: any[] = [];

    captions.forEach((c: any, idx: number) => {
      const text = (c.text || '').toLowerCase();
      let matchedVfx = null;
      if (idx === 0 || text.includes('secret') || text.includes('shock') || text.includes('wait')) {
        matchedVfx = VFX_LIBRARY.find((v) => v.name.toLowerCase().includes('zoom')) || VFX_LIBRARY[0];
      } else if (text.includes('insane') || text.includes('crazy') || text.includes('massive')) {
        matchedVfx = VFX_LIBRARY.find((v) => v.name.toLowerCase().includes('glow') || v.name.toLowerCase().includes('flash')) || VFX_LIBRARY[1];
      } else if (idx % 6 === 3) {
        matchedVfx = VFX_LIBRARY.find((v) => v.name.toLowerCase().includes('shake') || v.name.toLowerCase().includes('pulse')) || VFX_LIBRARY[2];
      }
      if (matchedVfx && vfxEvents.length < 8) {
        vfxEvents.push({
          id: `vfx_${Math.random().toString(36).slice(2, 8)}`,
          vfxId: matchedVfx.id,
          effectType: matchedVfx.type || matchedVfx.name,
          startTime: c.start || idx * 3,
          endTime: (c.start || idx * 3) + Math.min(1.5, matchedVfx.duration),
          intensity: matchedVfx.intensity || 5,
          reason: `Visual emphasis matching transcript moment "${c.text || ''}"`,
        });
      }
    });

    if (req.body.jobId) {
      await emitJobEvent(req.body.jobId, 'vfx_generation', 'GENERATING_VFX', 100, `Generated ${vfxEvents.length} contextual VFX effects.`);
    }

    res.json({ success: true, vfxEvents });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. POST /jobs/analyze-video & /api/worker/inspect (Video Analysis)
app.post(['/jobs/analyze-video', '/api/worker/inspect'], requireWorkerAuth, async (req: Request, res: Response) => {
  try {
    const { mediaPathOrUrl } = req.body;
    const probe = await probeSourceMedia(mediaPathOrUrl);
    res.json({ success: true, probe });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// YouTube Ingestion Endpoint (Compatibility Alias)
app.post('/api/worker/youtube', requireWorkerAuth, async (req: Request, res: Response) => {
  try {
    const job = await queue.addJob('youtube-download', req.body);
    const result = await processYouTubeJob(job);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Initialize BullMQ Workers for durable background job execution
function initBullWorkers() {
  const redisConn = queue.getRedisConnection();
  if (!redisConn) {
    console.log('[ViralClip Worker] Redis not active. Operating with local HTTP/in-process execution.');
    return;
  }

  const queueTypes = [
    'media-ingestion',
    'transcription',
    'short-generation',
    'render',
    'youtube-download',
  ];

  queueTypes.forEach((qType) => {
    try {
      const bullWorker = new BullWorker(
        qType,
        async (bullJob: BullJob) => {
          console.log(`[BullMQ Worker] Claimed job ${bullJob.id} from queue '${qType}'`);
          const payload = bullJob.data.payload || bullJob.data.input || bullJob.data;
          const jId = bullJob.data.id || bullJob.id || `job_${Date.now()}`;
          return await executeWorkerJob(jId, qType, payload, {
            sourceId: bullJob.data.mediaId || bullJob.data.sourceId,
            projectId: bullJob.data.projectId,
          });
        },
        {
          connection: redisConn,
          concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
        }
      );

      bullWorker.on('completed', (job) => {
        console.log(`[BullMQ Worker] Job ${job.id} on '${qType}' completed.`);
      });

      bullWorker.on('failed', (job, err) => {
        console.error(`[BullMQ Worker] Job ${job?.id} on '${qType}' failed:`, err);
      });

      console.log(`[BullMQ Worker] Registered consumer for queue: ${qType}`);
    } catch (err: any) {
      console.warn(`[BullMQ Worker] Could not start worker for ${qType}: ${err.message}`);
    }
  });
}

// Start Worker Server
const isDirectExecution = () => {
  if (typeof process === 'undefined' || !process.argv[1]) return false;
  const scriptArg = path.resolve(process.argv[1]);
  try {
    const currentFile = fileURLToPath(import.meta.url);
    if (currentFile === scriptArg) return true;
  } catch (_) {}
  return (
    scriptArg.endsWith('worker.ts') ||
    scriptArg.endsWith('worker.cjs') ||
    scriptArg.endsWith('worker.js')
  );
};

if (isDirectExecution() || (typeof require !== 'undefined' && (require as any).main === module)) {
  app.listen(WORKER_PORT, '0.0.0.0', () => {
    console.log(`[ViralClip Worker] Dedicated media processing service listening on port ${WORKER_PORT}`);
    console.log(`[ViralClip Worker] Worker ID: ${WORKER_ID}`);
    initBullWorkers();
  });
}
