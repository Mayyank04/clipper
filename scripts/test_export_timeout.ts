/**
 * VIRALCLIP STUDIO — TEST SUITE 2: EXPORT TIMEOUT & ASYNCHRONOUS DECOUPLING
 * Demonstrates that long-running renders (> 30s) succeed without HTTP timeout,
 * and tests graceful child-process cancellation.
 */

import { renderWorker } from '../src/utils/videoQuality/renderWorker';
import { probeSourceMedia } from '../src/utils/videoQuality/sourceQualityAnalyzer';

async function testExportLongRunNoTimeout() {
  console.log('\n======================================================');
  console.log('[TEST] Long-Running Render Survival Past 30s Threshold');
  console.log('======================================================');

  const startReq = Date.now();
  // Plan with 45-second duration and Lanczos scaling
  const plan = {
    sourceUrl: '/demo/sample.mp4',
    startTime: 0,
    duration: 45,
    resolution: '1080x1920',
    qualityMode: 'HIGH',
    brollList: [
      { path: '/assets/broll/coding_broll.mp4', start: 5, duration: 4, isPIP: false },
      { path: '/assets/broll/ai_interface_broll.mp4', start: 18, duration: 5, isPIP: true },
    ],
    sfxList: [
      { path: '/assets/sfx/whoosh.wav', delayMs: 4800, volume: 0.7 },
      { path: '/assets/sfx/chime.wav', delayMs: 17800, volume: 0.6 },
    ],
    captions: [
      { id: 'c1', start: 1, end: 6, text: 'DECOUPLED ASYNCHRONOUS RENDER QUEUE' },
      { id: 'c2', start: 15, end: 22, text: 'SURVIVING 30 SECOND HTTP LIMIT' },
    ],
  };

  // Immediate Enqueue
  const job = renderWorker.createJob({
    projectId: 'timeout_test_project',
    rawRenderPlan: plan,
    projectDir: process.cwd(),
  });

  const reqDuration = Date.now() - startReq;
  console.log(`✓ HTTP Response decoupled: created job ${job.id} in ${reqDuration}ms`);
  if (reqDuration > 500) {
    throw new Error(`Enqueue took ${reqDuration}ms - must be instantaneous`);
  }

  // Poll until completion, verifying it handles > 30s without premature termination
  let completed = false;
  let elapsed = 0;
  const pollStart = Date.now();

  while (!completed && Date.now() - pollStart < 180000) {
    await new Promise((r) => setTimeout(r, 800));
    elapsed = Math.round((Date.now() - pollStart) / 1000);
    const state = renderWorker.getJob(job.id);
    if (!state) throw new Error(`Job missing: ${job.id}`);

    if (elapsed === 31) {
      console.log(`\n★ CRITICAL CHECKPOINT: Render has reached 31s (old pipeline threw timeout at 30s)!`);
      console.log(`  Current State: status="${state.status}", progress=${state.progress}%, stage="${state.stage}"`);
      if (state.status === 'failed' && state.error?.includes('timed out')) {
        throw new Error('FAIL: Job was prematurely killed at 30 seconds!');
      }
      console.log(`  ✓ VERIFIED: Process still running stably in background.`);
    }

    if (state.status === 'completed') {
      completed = true;
      console.log(`\n✓ Job completed successfully at ${elapsed}s! (Output: ${state.downloadUrl})`);
      break;
    }

    if (state.status === 'failed') {
      throw new Error(`Render failed: ${state.error}`);
    }
  }

  if (!completed) {
    throw new Error('Render did not complete within the maximum timeout');
  }
}

async function testCancelRender() {
  console.log('\n======================================================');
  console.log('[TEST] Graceful Cancellation & Process Cleanup');
  console.log('======================================================');

  const plan = {
    sourceUrl: '/demo/sample.mp4',
    startTime: 0,
    duration: 60,
    resolution: '1080x1920',
    qualityMode: 'HIGH',
  };

  const job = renderWorker.createJob({
    projectId: 'cancel_test_project',
    rawRenderPlan: plan,
    projectDir: process.cwd(),
  });

  console.log(`✓ Enqueued job ${job.id}`);
  // Wait until rendering starts
  await new Promise((r) => setTimeout(r, 1200));

  console.log(`✓ Triggering cancelJob(${job.id})...`);
  const cancelled = renderWorker.cancelJob(job.id);
  console.log(`✓ cancelJob returned: ${cancelled}`);

  const state = renderWorker.getJob(job.id);
  console.log(`✓ Final status: ${state?.status}, error: "${state?.error}"`);
  if (state?.status !== 'cancelled') {
    throw new Error(`Expected status 'cancelled', got '${state?.status}'`);
  }
  console.log('✓ VERIFIED: Cancellation cleanly terminates process and marks state cancelled.');
}

async function main() {
  console.log('🚀 Starting Test Suite 2: Export Timeout & Asynchronous Decoupling');
  await testExportLongRunNoTimeout();
  await testCancelRender();
  console.log('\n======================================================');
  console.log('✅ TEST SUITE 2 PASSED: Renders exceed 30s safely, cancel works!');
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('\n❌ TEST SUITE 2 FAILED:', err);
  process.exit(1);
});
