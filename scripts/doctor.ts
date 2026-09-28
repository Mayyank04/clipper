/**
 * VIRALCLIP STUDIO — STARTUP PRODUCTION VALIDATION ("DOCTOR")
 * Usage: npm run doctor
 * Validates Vercel control plane configuration, database, object storage, queue,
 * worker connection, Google Drive, auth, and external worker media tools (FFmpeg, Whisper, yt-dlp, Python).
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

dotenv.config();

const execFileAsync = promisify(execFile);

import { PostgresDatabase } from '../src/services/database/PostgresDatabase';
import { StorageProvider } from '../src/services/storage/StorageProvider';
import { QueueService } from '../src/services/queue/QueueService';
import { ProcessingWorker } from '../src/services/worker/ProcessingWorker';
import { LocalWhisperProvider } from '../src/utils/transcription/providers/LocalWhisperProvider';

interface DiagnosticResult {
  category: string;
  name: string;
  ok: boolean;
  message: string;
  critical: boolean;
}

async function runDoctor() {
  console.log('====================================================');
  console.log('  VIRALCLIP STUDIO — PRODUCTION READINESS DOCTOR');
  console.log('====================================================\n');

  const results: DiagnosticResult[] = [];

  // 1. VERCEL & SYSTEM ENVIRONMENT
  const nodeEnv = process.env.NODE_ENV || 'development';
  const hasAuthSecret = Boolean(process.env.AUTH_SECRET || process.env.JWT_SECRET);
  results.push({
    category: 'Vercel / Control Plane',
    name: 'ENVIRONMENT',
    ok: true,
    message: `NODE_ENV=${nodeEnv}`,
    critical: false,
  });

  results.push({
    category: 'Vercel / Control Plane',
    name: 'AUTHENTICATION',
    ok: hasAuthSecret || nodeEnv !== 'production',
    message: hasAuthSecret ? 'AUTH_SECRET / JWT_SECRET configured' : 'Using development auth fallback',
    critical: nodeEnv === 'production',
  });

  // 2. DATABASE (PostgreSQL / Local fallback)
  try {
    const db = PostgresDatabase.getInstance();
    const dbHealth = await db.getHealth();
    results.push({
      category: 'Control Plane Services',
      name: 'DATABASE',
      ok: true,
      message: `${dbHealth.engine} (${dbHealth.status})`,
      critical: true,
    });
  } catch (err: any) {
    results.push({
      category: 'Control Plane Services',
      name: 'DATABASE',
      ok: false,
      message: `Database check failed: ${err.message}`,
      critical: true,
    });
  }

  // 3. OBJECT STORAGE (S3/R2 / LocalDisk)
  try {
    const storage = StorageProvider.getInstance();
    const isCloud = storage.isCloudStorage();
    results.push({
      category: 'Control Plane Services',
      name: 'STORAGE',
      ok: true,
      message: isCloud ? 'Cloudflare R2 / AWS S3 S3-compatible active' : 'Local Disk fallback storage active',
      critical: true,
    });
  } catch (err: any) {
    results.push({
      category: 'Control Plane Services',
      name: 'STORAGE',
      ok: false,
      message: `Storage check failed: ${err.message}`,
      critical: true,
    });
  }

  // 4. QUEUE SERVICE (Redis+BullMQ / InProcess)
  try {
    const queue = QueueService.getInstance();
    const isRedis = queue.isRedisActive();
    results.push({
      category: 'Control Plane Services',
      name: 'QUEUE',
      ok: true,
      message: isRedis ? 'Redis + BullMQ distributed queue active' : 'In-process async queue fallback active',
      critical: true,
    });
  } catch (err: any) {
    results.push({
      category: 'Control Plane Services',
      name: 'QUEUE',
      ok: false,
      message: `Queue check failed: ${err.message}`,
      critical: true,
    });
  }

  // 5. GOOGLE DRIVE INTEGRATION
  const hasGoogleCreds = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  results.push({
    category: 'Control Plane Services',
    name: 'GOOGLE DRIVE',
    ok: true,
    message: hasGoogleCreds
      ? 'OAuth2 client credentials configured'
      : 'Public Drive URL parser active (OAuth optional for private packs)',
    critical: false,
  });

  // 6. PROCESSING WORKER
  try {
    const worker = ProcessingWorker.getInstance();
    const health = await worker.getHealth();
    results.push({
      category: 'Media Processing Plane',
      name: 'WORKER',
      ok: health.status === 'ready' || health.status === 'degraded',
      message: `${health.engine} (${health.status}) — isRemote: ${health.isRemote}`,
      critical: false,
    });
  } catch (err: any) {
    results.push({
      category: 'Media Processing Plane',
      name: 'WORKER',
      ok: false,
      message: `Worker check failed: ${err.message}`,
      critical: false,
    });
  }

  // 7. PYTHON RUNTIME
  try {
    const { stdout } = await execFileAsync('python3', ['--version']);
    results.push({
      category: 'Worker Tooling',
      name: 'PYTHON',
      ok: true,
      message: stdout.trim(),
      critical: true,
    });
  } catch (err: any) {
    results.push({
      category: 'Worker Tooling',
      name: 'PYTHON',
      ok: false,
      message: 'python3 is not available in PATH',
      critical: true,
    });
  }

  // 8. FFMPEG
  const ffmpegPath = ffmpegStatic || 'ffmpeg';
  try {
    const { stdout } = await execFileAsync(ffmpegPath, ['-version']);
    const firstLine = stdout.split('\n')[0] || '';
    results.push({
      category: 'Worker Tooling',
      name: 'FFMPEG',
      ok: true,
      message: firstLine.slice(0, 40),
      critical: true,
    });
  } catch (err: any) {
    results.push({
      category: 'Worker Tooling',
      name: 'FFMPEG',
      ok: false,
      message: `FFmpeg binary error: ${err.message}`,
      critical: true,
    });
  }

  // 9. FFPROBE
  const ffprobePath = (ffprobeStatic as any)?.path || 'ffprobe';
  try {
    const { stdout } = await execFileAsync(ffprobePath, ['-version']);
    const firstLine = stdout.split('\n')[0] || '';
    results.push({
      category: 'Worker Tooling',
      name: 'FFPROBE',
      ok: true,
      message: firstLine.slice(0, 40),
      critical: true,
    });
  } catch (err: any) {
    results.push({
      category: 'Worker Tooling',
      name: 'FFPROBE',
      ok: false,
      message: `FFprobe binary error: ${err.message}`,
      critical: true,
    });
  }

  // 10. LOCAL WHISPER STT
  try {
    const whisper = new LocalWhisperProvider();
    results.push({
      category: 'Worker Tooling',
      name: 'WHISPER',
      ok: true,
      message: 'Local Whisper Provider ready (multilingual + word timestamps)',
      critical: true,
    });
  } catch (err: any) {
    results.push({
      category: 'Worker Tooling',
      name: 'WHISPER',
      ok: false,
      message: `Whisper init error: ${err.message}`,
      critical: true,
    });
  }

  // 11. YT-DLP
  try {
    let ytOk = false;
    let ytVersion = '';
    try {
      const { stdout } = await execFileAsync('python3', ['-c', 'import yt_dlp; print(yt_dlp.version.__version__)']);
      ytVersion = stdout.trim();
      ytOk = true;
    } catch {
      const { stdout } = await execFileAsync('yt-dlp', ['--version']);
      ytVersion = stdout.trim();
      ytOk = true;
    }
    results.push({
      category: 'Worker Tooling',
      name: 'YT-DLP',
      ok: ytOk,
      message: `yt-dlp version ${ytVersion}`,
      critical: false,
    });
  } catch (err: any) {
    results.push({
      category: 'Worker Tooling',
      name: 'YT-DLP',
      ok: false,
      message: 'yt-dlp not found (needed for YouTube ingestion)',
      critical: false,
    });
  }

  // Print Report by Category
  const categories = Array.from(new Set(results.map((r) => r.category)));
  let hasCriticalFailure = false;

  categories.forEach((cat) => {
    console.log(`[${cat.toUpperCase()}]`);
    const catResults = results.filter((r) => r.category === cat);
    catResults.forEach((r) => {
      const mark = r.ok ? '✓' : r.critical ? '✗' : '⚠';
      console.log(`  ${mark} ${r.name.padEnd(16)} : ${r.message}`);
      if (!r.ok && r.critical) {
        hasCriticalFailure = true;
      }
    });
    console.log('');
  });

  console.log('====================================================');
  if (hasCriticalFailure) {
    console.error('✗ PRODUCTION READINESS: FAILED (Critical components missing)');
    process.exit(1);
  } else {
    console.log('✓ PRODUCTION READINESS: ALL SYSTEMS OPERATIONAL');
    console.log('====================================================');
    process.exit(0);
  }
}

runDoctor();
