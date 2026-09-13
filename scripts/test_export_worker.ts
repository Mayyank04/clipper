/**
 * VIRALCLIP STUDIO — TEST SUITE 1: RENDER WORKER LIFECYCLE
 * Tests immediate job creation, non-blocking HTTP return, -progress pipe:1 streaming,
 * and completion across 10-second, 30-second, 60-second, and 180-second sources.
 */

import path from 'path';
import fs from 'fs';
import { renderWorker } from '../src/utils/videoQuality/renderWorker';
import { probeSourceMedia } from '../src/utils/videoQuality/sourceQualityAnalyzer';

async function runWorkerTest(sourcePath: string, testDuration: number, label: string) {
  console.log(`\n======================================================`);
  console.log(`[TEST] ${label} (${testDuration}s)`);
  console.log(`======================================================`);

  const startTime = Date.now();
  const rawPlan = {
    sourceUrl: sourcePath,
    startTime: 0,
    duration: testDuration,
    resolution: '1080x1920',
    qualityMode: 'HIGH',
    captions: [
      { id: 'c1', start: 0.5, end: Math.min(testDuration - 0.5, 4.0), text: `TESTING ${label.toUpperCase()}` },
    ],
  };

  // 1. Create Job immediately
  const job = renderWorker.createJob({
    projectId: 'test_project',
    rawRenderPlan: rawPlan,
    projectDir: process.cwd(),
  });

  const queueDuration = Date.now() - startTime;
  console.log(`✓ Job created immediately: ${job.id}`);
  console.log(`✓ Creation took ${queueDuration}ms (MUST be < 500ms, decoupled from render)`);
  if (queueDuration > 500) {
    throw new Error(`Job creation took ${queueDuration}ms, which blocked the request lifecycle!`);
  }

  // 2. Poll progress until complete or timeout
  let lastProgress = -1;
  let highestProgress = 0;
  const maxWaitMs = Math.max(120000, testDuration * 5000);
  const pollStart = Date.now();

  while (Date.now() - pollStart < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 400));
    const current = renderWorker.getJob(job.id);
    if (!current) throw new Error(`Job ${job.id} disappeared from worker!`);

    if (current.progress !== lastProgress) {
      lastProgress = current.progress;
      highestProgress = Math.max(highestProgress, current.progress);
      console.log(`  [Progress Update] ${current.progress}% | Stage: ${current.stage} | CurrentTime: ${current.currentTimeSec || 0}s`);
    }

    if (current.status === 'completed') {
      console.log(`✓ Job ${job.id} completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s!`);
      console.log(`✓ Output file: ${current.downloadUrl} (${current.fileSizeMb} MB)`);

      // Verify output file on disk
      const localExport = path.join(process.cwd(), 'public', current.downloadUrl!);
      if (!fs.existsSync(localExport) || fs.statSync(localExport).size === 0) {
        throw new Error(`Rendered file does not exist on disk: ${localExport}`);
      }

      // FFprobe output inspection
      const probe = await probeSourceMedia(localExport);
      console.log(`✓ Verified output: ${probe.sourceWidth}x${probe.sourceHeight}, ${probe.sourceFPS} FPS, Codec: ${probe.sourceCodec}`);
      if (probe.sourceWidth !== 1080 || probe.sourceHeight !== 1920) {
        throw new Error(`Target format error: expected 1080x1920, got ${probe.sourceWidth}x${probe.sourceHeight}`);
      }

      return {
        jobId: job.id,
        renderTimeSec: Number(((Date.now() - startTime) / 1000).toFixed(1)),
        probe,
        fileSizeMb: current.fileSizeMb,
      };
    }

    if (current.status === 'failed') {
      throw new Error(`RenderJob ${job.id} failed: ${current.error}`);
    }
    if (current.status === 'cancelled') {
      throw new Error(`RenderJob ${job.id} was cancelled unexpectedly`);
    }
  }

  throw new Error(`RenderJob ${job.id} timed out after ${maxWaitMs / 1000}s`);
}

async function main() {
  console.log('🚀 Starting Test Suite 1: Render Worker Lifecycle (10s, 30s, 60s, 180s)');

  // 1. 10-second source test
  await runWorkerTest('/demo/sample.mp4', 10, '10-Second Short');

  // 2. 30-second source test
  await runWorkerTest('/demo/sample.mp4', 30, '30-Second Short');

  // 3. 60-second source test
  await runWorkerTest('/demo/test_60s.mp4', 60, '60-Second Short');

  // 4. 180-second source test
  await runWorkerTest('/demo/test_180s.mp4', 180, '180-Second Long Short');

  console.log('\n======================================================');
  console.log('✅ TEST SUITE 1 PASSED: All 4 duration tiers completed and verified!');
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('\n❌ TEST SUITE 1 FAILED:', err);
  process.exit(1);
});
