import assert from 'assert';
import { getMediaStorage, LocalMediaStorage, ObjectStorage } from '../src/services/storage';
import { getJobService, InMemoryJobService } from '../src/services/jobs';
import { getProcessingAdapter, LocalProcessingAdapter, RemoteProcessingAdapter } from '../src/services/processing';
import { buildCanonicalRenderPlan, assertSerializableRenderPlan } from '../src/utils/brollRankingEngine';

async function testVercelArchitecture() {
  console.log('=== TESTING VERCEL + WORKER ARCHITECTURE ABSTRACTIONS ===\n');

  // 1. Storage Abstraction
  console.log('--- 1. Testing Storage Abstraction ---');
  const storage = getMediaStorage();
  assert(storage instanceof LocalMediaStorage, 'Default storage should be LocalMediaStorage');

  const uploadIntent = await storage.createUpload('test_clip.mp4', 'video/mp4');
  assert(uploadIntent.mediaId.startsWith('media_'), 'Media ID must be generated');
  assert(uploadIntent.uploadUrl.includes('/api/upload'), 'Local uploadUrl must point to /api/upload');
  assert(uploadIntent.key.includes('test_clip.mp4') || uploadIntent.key.includes('source.mp4'), 'Key must contain filename');

  const readUrl = await storage.getReadUrl(uploadIntent.mediaId);
  assert(readUrl.includes('/media/'), 'Read URL must be generated');
  console.log('✓ PASS: LocalMediaStorage createUpload & getReadUrl verified');

  // ObjectStorage
  const s3Storage = new ObjectStorage({
    bucket: 'test-bucket',
    region: 'us-east-1',
    endpoint: 'https://s3.amazonaws.com',
  });
  const s3Upload = await s3Storage.createUpload('remote.mp4', 'video/mp4');
  assert(s3Upload.uploadUrl.includes('test-bucket'), 'S3 uploadUrl must contain bucket');
  console.log('✓ PASS: ObjectStorage createUpload verified');

  // 2. Job Abstraction
  console.log('\n--- 2. Testing Job Service Abstraction ---');
  const jobService = getJobService();
  assert(jobService instanceof InMemoryJobService, 'Default JobService should be InMemoryJobService');

  const job = await jobService.createJob({
    type: 'render',
    projectId: 'proj_test',
    mediaId: uploadIntent.mediaId,
    payload: { resolution: '1080x1920', fps: 30 },
  });

  assert(job.id.startsWith('job_'), 'Job ID must be generated');
  assert(job.status === 'queued', 'Initial job status must be queued');
  assert(job.progress === 0, 'Initial progress must be 0');

  await jobService.updateProgress(job.id, 45, 'encoding', 'Rendering 45%');
  const updatedJob = await jobService.getJob(job.id);
  assert(updatedJob?.status === 'processing', 'Job status must transition to processing');
  assert(updatedJob?.progress === 45, 'Job progress must be 45');
  assert(updatedJob?.stage === 'encoding', 'Job stage must be encoding');

  await jobService.completeJob(job.id, { outputPath: '/exports/output.mp4', fileSizeMb: 4.5 });
  const completedJob = await jobService.getJob(job.id);
  assert(completedJob?.status === 'completed', 'Job status must be completed');
  assert(completedJob?.progress === 100, 'Completed job progress must be 100');
  assert(completedJob?.result?.fileSizeMb === 4.5, 'Completed job result must be preserved');

  const jobsList = await jobService.listJobs({ type: 'render' });
  assert(jobsList.some((j) => j.id === job.id), 'Job must be retrievable via listJobs');
  console.log('✓ PASS: JobService create, progress, complete & list verified');

  // 3. Processing Adapters
  console.log('\n--- 3. Testing Processing Adapters ---');
  const adapter = getProcessingAdapter();
  assert(adapter instanceof LocalProcessingAdapter, 'Default adapter should be LocalProcessingAdapter');
  assert(typeof adapter.transcription.transcribe === 'function', 'Transcription service must exist');
  assert(typeof adapter.render.render === 'function', 'Render service must exist');
  assert(typeof adapter.youtube.download === 'function', 'YouTube service must exist');
  assert(typeof adapter.inspection.inspect === 'function', 'Inspection service must exist');
  console.log('✓ PASS: LocalProcessingAdapter interfaces verified');

  const remoteAdapter = new RemoteProcessingAdapter({
    workerUrl: 'https://worker.viralclip.studio',
    workerSecret: 'test_secret_123',
  });
  assert(remoteAdapter.isConfigured(), 'RemoteProcessingAdapter must report configured');
  assert(remoteAdapter.youtube.getStatus().available === true, 'Remote YouTube status must reflect worker');
  console.log('✓ PASS: RemoteProcessingAdapter interfaces verified');

  // 4. RenderPlan Serializability
  console.log('\n--- 4. Testing Canonical RenderPlan Serializability ---');
  const plan = buildCanonicalRenderPlan(
    'proj_123',
    'short_456',
    30,
    [],
    [
      {
        id: 'c1',
        start: 0,
        end: 2,
        text: 'Hello world',
        words: [{ word: 'Hello', start: 0, end: 1 }, { word: 'world', start: 1, end: 2 }],
      },
    ],
    [{ id: 'sfx_1', assetId: 'sfx_pop', timestamp: 1.0, duration: 0.5, volume: 0.8, category: 'pop', soundName: 'Pop' }],
    [{ id: 'vfx_1', timestamp: 5.0, duration: 1.0, type: 'glow' }],
    {
      source: { url: '/media/source.mp4', mediaId: 'media_123' },
      clips: [{ id: 'clip_0', startTime: 0, endTime: 30 }],
      canvas: { width: 1080, height: 1920, aspectRatio: '9:16' },
      exportSettings: { resolution: '1080x1920', frameRate: 30, qualityMode: 'HIGH', format: 'mp4' },
    }
  );

  assertSerializableRenderPlan(plan);
  const json = JSON.stringify(plan);
  const parsed = JSON.parse(json);
  assert.deepStrictEqual(parsed.projectId, 'proj_123');
  assert.deepStrictEqual(parsed.source.url, '/media/source.mp4');
  assert.deepStrictEqual(parsed.clips[0].endTime, 30);
  assert.deepStrictEqual(parsed.canvas.aspectRatio, '9:16');
  assert.deepStrictEqual(parsed.exportSettings.resolution, '1080x1920');
  assert.deepStrictEqual(parsed.captions[0].words[1].word, 'world');
  assert.deepStrictEqual(parsed.vfxMarkers[0].type, 'glow');
  console.log('✓ PASS: Canonical RenderPlan is 100% JSON-serializable with all required fields');

  console.log('\n===============================================================');
  console.log('ALL ARCHITECTURE TESTS PASSED SUCCESSFULLY! ✓');
  console.log('===============================================================');
}

testVercelArchitecture().catch((err) => {
  console.error('Architecture test failed:', err);
  process.exit(1);
});
