/**
 * VIRALCLIP STUDIO — PRODUCTION HARDENING INTEGRATION TEST
 * Validates StorageProvider, PostgresDatabase, ProcessingWorker, and State Machine.
 */

import { StorageProvider } from '../src/services/storage/StorageProvider';
import { PostgresDatabase } from '../src/services/database/PostgresDatabase';
import { ProcessingWorker } from '../src/services/worker/ProcessingWorker';

async function runVerification() {
  console.log('===============================================================');
  console.log('VIRALCLIP STUDIO — PRODUCTION HARDENING INTEGRATION VERIFICATION');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // 1. STORAGE PROVIDER TESTS
  console.log('--- 1. Testing StorageProvider ---');
  const storage = StorageProvider.getInstance();
  const testKey = `test/test_object_${Date.now()}.txt`;
  const testPayload = 'ViralClip Studio Production Storage Verification';

  const uploadResult = await storage.upload(testKey, testPayload, 'text/plain');
  assert(Boolean(uploadResult), 'Upload returns valid URL');

  const exists = await storage.exists(testKey);
  assert(exists === true, 'Object exists check returns true');

  const downloaded = await storage.download(testKey);
  assert(downloaded.toString('utf8') === testPayload, 'Downloaded content matches uploaded payload');

  const signedUrl = await storage.getSignedUrl(testKey, 'get', 3600);
  assert(Boolean(signedUrl), 'getSignedUrl generates valid URL');

  await storage.delete(testKey);
  const existsAfterDelete = await storage.exists(testKey);
  assert(existsAfterDelete === false, 'Object successfully deleted');

  // 2. POSTGRES DATABASE JOBS & EVENTS
  console.log('\n--- 2. Testing PostgresDatabase (Jobs & Events) ---');
  const db = PostgresDatabase.getInstance();
  const jobId = `test_job_${Date.now()}`;

  await db.saveProcessingJob({
    id: jobId,
    type: 'IMPORT_PRESETS',
    status: 'QUEUED',
    progress: 0,
    stage: 'QUEUED',
    input: { sourceUrl: 'https://drive.google.com/drive/folders/sample', category: 'Testing' },
  });

  const retrievedJob = await db.getProcessingJob(jobId);
  assert(retrievedJob !== null, 'Job successfully retrieved from DB');
  assert(retrievedJob?.status === 'QUEUED', 'Job initial status is QUEUED');
  assert(retrievedJob?.type === 'IMPORT_PRESETS', 'Job type matches');

  // Progress update
  await db.updateProcessingJobProgress(jobId, 50, 'CONVERTING', { converted: 12 }, 'PROCESSING');
  const updatedJob = await db.getProcessingJob(jobId);
  assert(updatedJob?.progress === 50, 'Job progress updated to 50%');
  assert(updatedJob?.stage === 'CONVERTING', 'Job stage updated to CONVERTING');
  assert(updatedJob?.status === 'PROCESSING', 'Job status updated to PROCESSING');

  // Events logging
  await db.saveProcessingJobEvent({
    id: `evt_1_${Date.now()}`,
    jobId,
    stage: 'CONVERTING',
    progress: 50,
    message: 'Batch 1 completed',
  });

  const events = await db.getProcessingJobEvents(jobId);
  assert(events.length >= 1, 'Job events retrieved');
  assert(events[0].stage === 'CONVERTING', 'Event stage is CONVERTING');

  // Complete job
  await db.updateProcessingJobProgress(jobId, 100, 'COMPLETED', { totalImported: 25 }, 'COMPLETED');
  const completedJob = await db.getProcessingJob(jobId);
  assert(completedJob?.status === 'COMPLETED', 'Job completed status verified');
  assert(completedJob?.progress === 100, 'Job progress is 100%');

  // 3. PROCESSING WORKER ABSTRACTION
  console.log('\n--- 3. Testing ProcessingWorker Abstraction ---');
  const worker = ProcessingWorker.getInstance();
  const workerHealth = await worker.getHealth();
  assert(workerHealth.status === 'ready', 'Worker health reports ready');
  assert(Boolean(workerHealth.workerId), 'Worker has valid workerId');

  const dispatched = await worker.dispatchJob(
    'IMPORT_PRESETS',
    { sourceUrl: 'https://drive.google.com/drive/folders/test1234' },
    { sourceId: 'src_test_123' }
  );
  assert(Boolean(dispatched.id), 'Dispatched job returns unique ID');
  assert(dispatched.status === 'QUEUED', 'Dispatched job initial status is QUEUED');

  const statusFromWorker = await worker.getJobStatus(dispatched.id);
  assert(statusFromWorker !== null, 'Worker retrieves status for dispatched job');

  const cancelled = await worker.cancelJob(dispatched.id);
  assert(cancelled === true, 'Worker successfully cancels job');

  const cancelledJob = await worker.getJobStatus(dispatched.id);
  assert(cancelledJob?.status === 'CANCELLED', 'Cancelled job status reflects CANCELLED');

  console.log('\n===============================================================');
  console.log(`ALL TESTS PASSED: ${passed}/${total} assertions succeeded!`);
  console.log('===============================================================\n');
}

runVerification().catch((err) => {
  console.error('Integration verification failed:', err);
  process.exit(1);
});
