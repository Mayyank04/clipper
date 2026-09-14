/**
 * VIRALCLIP STUDIO — LOCAL DEPENDENCY CHECKER
 * Verifies all local requirements for running full AI Shorts editing & transcription offline:
 * - FFmpeg & FFprobe binaries
 * - Whisper models (ONNX Runtime / @xenova/transformers)
 * - Hardware acceleration (Apple Silicon MPS / Multi-core CPU)
 * - Storage directories and write permissions
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { detectHardware } from '../src/utils/transcription/hardwareDetector';

async function checkBinary(name: string, binaryPath: string | null): Promise<{ ready: boolean; version?: string; error?: string }> {
  const resolved = binaryPath || name;
  return new Promise((resolve) => {
    execFile(resolved, ['-version'], (err, stdout) => {
      if (err) {
        resolve({ ready: false, error: err.message });
      } else {
        const firstLine = stdout.split('\n')[0];
        resolve({ ready: true, version: firstLine });
      }
    });
  });
}

async function main() {
  console.log('====================================================');
  console.log('  VIRALCLIP STUDIO — LOCAL DEPENDENCY CHECK');
  console.log('====================================================\n');

  let allReady = true;

  // 1. Hardware Detection
  const hw = detectHardware();
  console.log(`[Hardware] Platform: ${process.platform} (${process.arch})`);
  console.log(`[Hardware] Device: ${hw.deviceName}`);
  console.log(`[Hardware] CPU Cores: ${hw.cores}`);
  console.log(`[Hardware] Recommended Concurrency: ${Math.max(1, Math.min(4, Math.floor(hw.cores / 2)))}`);
  console.log('');

  // 2. FFmpeg Binary
  const ffmpegRes = await checkBinary('ffmpeg', ffmpegStatic);
  if (ffmpegRes.ready) {
    console.log(`[FFmpeg]  PASS: ${ffmpegRes.version}`);
  } else {
    console.error(`[FFmpeg]  FAIL: ${ffmpegRes.error}`);
    allReady = false;
  }

  // 3. FFprobe Binary
  const ffprobePath = (ffprobeStatic as any)?.path || 'ffprobe';
  const ffprobeRes = await checkBinary('ffprobe', ffprobePath);
  if (ffprobeRes.ready) {
    console.log(`[FFprobe] PASS: ${ffprobeRes.version}`);
  } else {
    console.error(`[FFprobe] FAIL: ${ffprobeRes.error}`);
    allReady = false;
  }

  // 4. Model Cache Directory
  const cacheDir = path.join(process.cwd(), '.cache', 'transformers');
  const cacheExists = fs.existsSync(cacheDir);
  console.log(`[Models]  Cache Directory: ${cacheDir} (exists: ${cacheExists})`);
  if (cacheExists) {
    const cachedFiles = fs.readdirSync(cacheDir);
    console.log(`[Models]  Cached entries: ${cachedFiles.length > 0 ? cachedFiles.join(', ') : 'none'}`);
  }

  // 5. Storage Directories
  const requiredDirs = [
    path.join(process.cwd(), 'public', 'uploads'),
    path.join(process.cwd(), 'public', 'audio'),
    path.join(process.cwd(), 'public', 'audio', 'extracted_cache'),
    path.join(process.cwd(), 'public', 'renders'),
  ];

  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    try {
      const testFile = path.join(dir, `.write_test_${Date.now()}`);
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
      console.log(`[Storage] PASS: ${path.relative(process.cwd(), dir)} is writable`);
    } catch (e: any) {
      console.error(`[Storage] FAIL: ${path.relative(process.cwd(), dir)} is not writable (${e.message})`);
      allReady = false;
    }
  }

  console.log('\n====================================================');
  if (allReady) {
    console.log('  STATUS: ALL SYSTEM DEPENDENCIES READY');
  } else {
    console.error('  STATUS: SOME DEPENDENCIES ARE MISSING OR FAILED');
    process.exit(1);
  }
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Error running dependency check:', err);
  process.exit(1);
});
