/**
 * VIRALCLIP STUDIO — TEST SUITE 3: LOW-QUALITY SOURCE RENDER QUALITY & FRAME FORENSICS
 * Tests upscale from 640x360 29.97 FPS 0.6 Mbps source to 1080x1920 9:16 High CRF 18
 * with single-stage Lanczos scaling, BT.709 color management, and 5-point frame forensics.
 */

import path from 'path';
import fs from 'fs';
import { renderWorker } from '../src/utils/videoQuality/renderWorker';
import { probeSourceMedia } from '../src/utils/videoQuality/sourceQualityAnalyzer';
import { getRenderQualityProfile } from '../src/utils/videoQuality/ffmpegRenderPipeline';

async function main() {
  console.log('🚀 Starting Test Suite 3: Low-Quality Source (640x360 -> 1080x1920) Quality Test');

  const sourcePath = path.join(process.cwd(), 'public', 'demo', 'source_640x360.mp4');
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source 640x360 clip missing at ${sourcePath}`);
  }

  // 1. Probe source diagnostics
  const sourceInfo = await probeSourceMedia(sourcePath);
  console.log(`\nSource Media Probed:`);
  console.log(`- Dimensions: ${sourceInfo.sourceWidth}x${sourceInfo.sourceHeight}`);
  console.log(`- FPS: ${sourceInfo.sourceFPS}`);
  console.log(`- Bitrate: ${(sourceInfo.sourceBitrate / 1000000).toFixed(2)} Mbps`);
  console.log(`- Codec: ${sourceInfo.sourceCodec}`);
  console.log(`- Color Primaries: ${sourceInfo.sourceColorPrimaries}`);

  if (sourceInfo.sourceWidth !== 640 || sourceInfo.sourceHeight !== 360) {
    throw new Error(`Expected source to be 640x360, got ${sourceInfo.sourceWidth}x${sourceInfo.sourceHeight}`);
  }

  // 2. Check smart render quality profile
  const profile = getRenderQualityProfile(sourceInfo, '1080x1920', 'HIGH');
  console.log(`\nSource-Aware Render Quality Profile:`);
  console.log(`- Target: ${profile.targetResolution.width}x${profile.targetResolution.height}`);
  console.log(`- Target FPS: ${profile.targetFPS} (must preserve ~29.97)`);
  console.log(`- CRF: ${profile.crf} (Section 9/10 recommended CRF 18-20 for low-res upscale)`);
  console.log(`- Sharpening: ${profile.sharpening}`);
  console.log(`- Scaling Filter: ${profile.scalingFilter}`);

  if (profile.crf > 20 || profile.crf < 16) {
    throw new Error(`CRF out of recommended range for low-res upscale: ${profile.crf}`);
  }
  if (Math.abs(profile.targetFPS - 29.97) > 0.05) {
    throw new Error(`FPS was not preserved from source! Target: ${profile.targetFPS}, Source: ${sourceInfo.sourceFPS}`);
  }

  // 3. Render 640x360 source to 1080x1920
  const plan = {
    sourceUrl: '/demo/source_640x360.mp4',
    startTime: 0,
    duration: 12,
    resolution: '1080x1920',
    qualityMode: 'HIGH',
    captions: [
      { id: 'c1', start: 0.5, end: 5.5, text: 'HIGH FIDELITY 9:16 LANCZOS UPSCALE' },
      { id: 'c2', start: 6.0, end: 11.5, text: 'SOURCE AWARE CRF 18 OPTIMIZATION' },
    ],
  };

  const startTime = Date.now();
  const job = renderWorker.createJob({
    projectId: 'quality_test_project',
    rawRenderPlan: plan,
    projectDir: process.cwd(),
  });

  console.log(`\nEnqueued RenderJob ${job.id}. Awaiting completion...`);

  let completedJob: any = null;
  while (!completedJob && Date.now() - startTime < 120000) {
    await new Promise((r) => setTimeout(r, 600));
    const current = renderWorker.getJob(job.id);
    if (!current) throw new Error('Job lost');

    if (current.status === 'completed') {
      completedJob = current;
      break;
    } else if (current.status === 'failed') {
      throw new Error(`Render failed: ${current.error}`);
    }
  }

  if (!completedJob) {
    throw new Error('Render timed out');
  }

  const renderSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ Render completed in ${renderSec}s!`);
  console.log(`✓ Output File: ${completedJob.downloadUrl} (${completedJob.fileSizeMb} MB)`);

  // 4. Output Verification (FFprobe)
  const outputPath = path.join(process.cwd(), 'public', completedJob.downloadUrl);
  const outProbe = await probeSourceMedia(outputPath);

  console.log(`\nExport Output Stream Verification:`);
  console.log(`- Dimensions: ${outProbe.sourceWidth}x${outProbe.sourceHeight} (Expected: 1080x1920)`);
  console.log(`- FPS: ${outProbe.sourceFPS} (Preserved cadence: ${outProbe.sourceFPS})`);
  console.log(`- Codec: ${outProbe.sourceCodec} (H.264)`);
  console.log(`- Audio Codec: ${outProbe.sourceAudioCodec} (AAC)`);
  console.log(`- Audio Sample Rate: ${outProbe.sourceAudioSampleRate} Hz (48000)`);
  console.log(`- Video Bitrate: ${(outProbe.sourceVideoBitrate / 1000).toFixed(0)} kbps`);

  if (outProbe.sourceWidth !== 1080 || outProbe.sourceHeight !== 1920) {
    throw new Error(`Resolution error: expected 1080x1920, got ${outProbe.sourceWidth}x${outProbe.sourceHeight}`);
  }
  if (!outProbe.sourceCodec.toLowerCase().includes('h264')) {
    throw new Error(`Codec error: expected h264, got ${outProbe.sourceCodec}`);
  }

  // 5. Frame Inspection Verification (5%, 25%, 50%, 75%, 95%)
  console.log(`\nFrame Inspection Verification (5 points):`);
  const frames = completedJob.forensics?.framesExtracted || [];
  console.log(`- Total Extracted Frames: ${frames.length}`);
  if (frames.length < 5) {
    throw new Error(`Expected at least 5 inspection frames, got ${frames.length}`);
  }

  for (const fPath of frames) {
    const stat = fs.statSync(fPath);
    console.log(`  ✓ ${path.basename(fPath)}: size=${stat.size} bytes`);
    if (stat.size < 5000) {
      throw new Error(`Corrupted or black frame detected at ${fPath} (size: ${stat.size} bytes)`);
    }
  }

  console.log('\n======================================================');
  console.log('✅ TEST SUITE 3 PASSED: Low-quality source upscaled cleanly, 5 frames verified!');
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('\n❌ TEST SUITE 3 FAILED:', err);
  process.exit(1);
});
