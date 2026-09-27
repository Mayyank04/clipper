/**
 * VIRALCLIP STUDIO — PRODUCTION ARCHITECTURE CERTIFICATION
 * Tests StorageProvider, PostgresDatabase, QueueService, CaptionEngine, and No-Watermark guarantees.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { StorageProvider } from '../src/services/storage/StorageProvider';
import { PostgresDatabase } from '../src/services/database/PostgresDatabase';
import { QueueService } from '../src/services/queue/QueueService';
import { groupWordsIntoCaptionSegments } from '../src/utils/captionEngine';
import { CREATOR_FONTS } from '../src/data/fontRegistry';
import { buildCanonicalRenderPlan, assertSerializableRenderPlan } from '../src/utils/brollRankingEngine';

async function runProductionArchitectureCertification() {
  console.log('================================================================');
  console.log('VIRALCLIP STUDIO — PRODUCTION ARCHITECTURE CERTIFICATION');
  console.log('================================================================\n');

  // ----------------------------------------------------------------------------
  // 1. STORAGE PROVIDER TESTS
  // ----------------------------------------------------------------------------
  console.log('--- 1. Testing StorageProvider (S3 / Cloudflare R2 Abstraction) ---');
  const storage = StorageProvider.getInstance();
  const testKey = `test_artifacts/cert_${Date.now()}.txt`;
  const testContent = Buffer.from('ViralClip Studio Production Verification Artifact');

  // Upload
  const publicUrl = await storage.upload(testKey, testContent, 'text/plain', { testRun: 'true' });
  assert(publicUrl, 'Storage upload must return public or direct URL');
  console.log(`✓ Upload successful: ${publicUrl}`);

  // Exists
  const exists = await storage.exists(testKey);
  assert.strictEqual(exists, true, 'Object must report exists = true');

  // Metadata
  const metadata = await storage.getObjectMetadata(testKey);
  assert(metadata, 'Object metadata must be retrievable');
  assert.strictEqual(metadata.size, testContent.length, 'Metadata size must match content length');
  console.log(`✓ Metadata verified: size=${metadata.size} bytes, type=${metadata.contentType}`);

  // Presigned URLs
  const uploadUrl = await storage.getSignedUploadUrl(`uploads/direct_test.mp4`, 'video/mp4', 1800);
  assert(uploadUrl, 'Signed upload URL must be generated');
  const downloadUrl = await storage.getSignedDownloadUrl(testKey, 1800);
  assert(downloadUrl, 'Signed download URL must be generated');
  console.log(`✓ Presigned URLs verified (Upload & Download)`);

  // Download
  const downloaded = await storage.download(testKey);
  assert.strictEqual(downloaded.toString(), testContent.toString(), 'Downloaded content must match uploaded content');
  console.log(`✓ Downloaded content integrity verified`);

  // Cleanup
  await storage.delete(testKey);
  const existsAfterDelete = await storage.exists(testKey);
  assert.strictEqual(existsAfterDelete, false, 'Object must not exist after delete');
  console.log(`✓ Object deletion verified`);

  // ----------------------------------------------------------------------------
  // 2. DATABASE PERSISTENCE TESTS
  // ----------------------------------------------------------------------------
  console.log('\n--- 2. Testing PostgresDatabase Service ---');
  const db = PostgresDatabase.getInstance();
  const health = await db.getHealth();
  console.log(`✓ Database engine: ${health.engine} (status: ${health.status})`);

  const testProjId = `cert_proj_${Date.now()}`;
  const testProject = {
    id: testProjId,
    title: 'Certification Reel',
    originalDuration: 42.5,
    aspectRatio: '9:16',
    status: 'READY',
    shorts: [{ id: 'short_01', title: 'Viral Hook', startTime: 0, endTime: 25 }],
  };

  await db.saveProject(testProject);
  const retrievedProject = await db.getProject(testProjId);
  assert(retrievedProject, 'Project must be retrievable after save');
  assert.strictEqual(retrievedProject.id, testProjId);
  assert.strictEqual(retrievedProject.title, 'Certification Reel');
  console.log(`✓ Project persistence verified: ${retrievedProject.title}`);

  // Media record persistence
  const testMediaId = `cert_media_${Date.now()}`;
  await db.saveMedia({
    id: testMediaId,
    originalFilename: 'sample.mp4',
    storedKey: `uploads/${testMediaId}/source.mp4`,
    duration: 42.5,
    width: 1080,
    height: 1920,
    fps: 30,
    hasAudio: true,
    hasVideo: true,
  });

  const retrievedMedia = await db.getMedia(testMediaId);
  assert(retrievedMedia, 'Media must be retrievable after save');
  assert.strictEqual(retrievedMedia.id, testMediaId);
  console.log(`✓ Media record persistence verified: ${retrievedMedia.storedKey}`);

  // Cleanup project
  await db.deleteProject(testProjId);
  const projectAfterDelete = await db.getProject(testProjId);
  assert.strictEqual(projectAfterDelete, null, 'Project must not exist after deletion');
  console.log(`✓ Project deletion verified`);

  // ----------------------------------------------------------------------------
  // 3. JOB QUEUE & REAL-TIME PROGRESS
  // ----------------------------------------------------------------------------
  console.log('\n--- 3. Testing QueueService (Redis / BullMQ / SSE) ---');
  const queue = QueueService.getInstance();
  const qHealth = queue.getHealth();
  console.log(`✓ Queue engine: ${qHealth.engine} (status: ${qHealth.status})`);

  const job = await queue.addJob('transcription', {
    mediaUrl: 'https://example.com/audio.wav',
    language: 'en',
  }, {
    projectId: 'cert_proj_queue',
    initialMessage: 'Queue certification test',
  });

  assert(job.id.startsWith('job_'), 'Job ID must be generated');
  assert.strictEqual(job.status, 'queued');
  console.log(`✓ Job enqueued: ID=${job.id}, Type=${job.type}`);

  await queue.updateJobProgress(job.id, 50, 'TRANSCRIBING', 'Transcribing audio 50%...');
  const updatedJob = await queue.getJob(job.id);
  assert(updatedJob, 'Job must be retrievable');
  assert.strictEqual(updatedJob.progress, 50);
  assert.strictEqual(updatedJob.stage, 'TRANSCRIBING');
  console.log(`✓ Job progress progression verified (50% - TRANSCRIBING)`);

  await queue.updateJobProgress(job.id, 100, 'COMPLETED', 'Transcription complete', {
    result: { wordCount: 120 },
  });
  const completedJob = await queue.getJob(job.id);
  assert.strictEqual(completedJob?.status, 'completed');
  assert.strictEqual(completedJob?.result?.wordCount, 120);
  console.log(`✓ Job completion verified`);

  // Cancellation test
  const cancelJob = await queue.addJob('render', { renderPlan: {} });
  const cancelled = await queue.cancelJob(cancelJob.id);
  assert.strictEqual(cancelled, true, 'Job must report cancelled = true');
  const cancelledData = await queue.getJob(cancelJob.id);
  assert.strictEqual(cancelledData?.status, 'cancelled');
  console.log(`✓ Job cancellation verified`);

  // ----------------------------------------------------------------------------
  // 4. CAPTION ENGINE & VISUAL HOLD THRESHOLDS
  // ----------------------------------------------------------------------------
  console.log('\n--- 4. Testing CaptionEngine & Word Beats ---');
  const sampleWords = [
    { word: 'Stop', start: 0.1, end: 0.4, confidence: 0.99 },
    { word: 'scrolling', start: 0.42, end: 0.85, confidence: 0.98 },
    { word: 'right', start: 0.88, end: 1.1, confidence: 0.97 },
    { word: 'now', start: 1.12, end: 1.4, confidence: 0.99 },
    { word: 'because', start: 1.8, end: 2.1, confidence: 0.95 }, // 0.4s pause here
    { word: 'this', start: 2.12, end: 2.3, confidence: 0.99 },
    { word: 'is', start: 2.32, end: 2.5, confidence: 0.98 },
    { word: 'important.', start: 2.52, end: 3.1, confidence: 0.99 },
  ];

  const segments = groupWordsIntoCaptionSegments(sampleWords, {
    wordsPerGroup: 4,
    pauseThresholdSeconds: 0.28, // 0.28s visual hold threshold
  });

  assert(segments.length >= 2, 'Segments should split cleanly across the pause');
  assert.strictEqual(segments[0].words[0].word, 'Stop');
  assert(segments[0].start >= 0.1);
  console.log(`✓ Caption segments produced: ${segments.length} segments with natural boundary handling`);

  // ----------------------------------------------------------------------------
  // 5. FONT REGISTRY VALIDATION
  // ----------------------------------------------------------------------------
  console.log('\n--- 5. Testing Font Registry Integrity ---');
  assert(CREATOR_FONTS.length >= 10, 'Font registry must contain production creator fonts');
  const publicFontsDir = path.resolve(process.cwd(), 'public', 'assets', 'fonts');

  let verifiedCount = 0;
  for (const font of CREATOR_FONTS) {
    if (font.files && font.files.bold) {
      const fileName = path.basename(font.files.bold);
      const filePath = path.join(publicFontsDir, fileName);
      if (fs.existsSync(filePath)) {
        verifiedCount++;
      }
    }
  }

  assert(verifiedCount > 0, 'Physical font files must exist in public/assets/fonts');
  console.log(`✓ Verified ${verifiedCount} physical creator font files on disk`);

  // ----------------------------------------------------------------------------
  // 6. WATERMARK GUARANTEE VERIFICATION
  // ----------------------------------------------------------------------------
  console.log('\n--- 6. Testing Watermark Flag Guarantee (Default Clean Exports) ---');
  const plan = buildCanonicalRenderPlan(
    'proj_cert',
    'short_cert',
    30,
    [],
    segments,
    [],
    [],
    {
      source: { url: '/media/source.mp4' },
      clips: [{ id: 'c0', startTime: 0, endTime: 30 }],
      canvas: { width: 1080, height: 1920, aspectRatio: '9:16' },
      exportSettings: { resolution: '1080x1920', frameRate: 30, qualityMode: 'HIGH', format: 'mp4' },
      brandKit: { enabled: false }, // Default: disabled
    }
  );

  assertSerializableRenderPlan(plan);
  const planJson = JSON.stringify(plan);
  assert(!planJson.includes('Viral Master'), 'Must not contain unauthorized watermark "Viral Master"');
  assert(!planJson.includes('Powered by'), 'Must not contain unauthorized watermark "Powered by"');
  assert(!planJson.includes('Trial Version'), 'Must not contain unauthorized watermark "Trial Version"');
  console.log(`✓ Clean export guarantee verified: zero unauthorized watermarks injected`);

  console.log('\n================================================================');
  console.log('ALL PRODUCTION ARCHITECTURE CERTIFICATION GATES PASSED! ✓');
  console.log('================================================================\n');
}

runProductionArchitectureCertification().catch((err) => {
  console.error('\n❌ Certification failed:', err);
  process.exit(1);
});
