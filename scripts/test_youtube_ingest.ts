import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3001';

function assert(condition: boolean, testName: string, detail?: any) {
  if (!condition) {
    console.error(`❌ FAIL: ${testName}`, detail !== undefined ? detail : '');
    process.exit(1);
  }
  console.log(`✅ PASS: ${testName}`, detail !== undefined ? `(${detail})` : '');
}

async function runYouTubeIngestTests() {
  console.log('================================================================');
  console.log('   VIRALCLIP STUDIO — REAL YOUTUBE INGESTION TEST SUITE        ');
  console.log('================================================================\n');

  // Test 1: URL Validation on Supported Formats
  console.log('--- 1. YOUTUBE URL VALIDATION ---');
  const validUrls = [
    'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    'https://youtu.be/jNQXAC9IVRw',
    'https://www.youtube.com/shorts/jNQXAC9IVRw',
    'https://www.youtube.com/watch?v=jNQXAC9IVRw&t=10s&feature=shared',
    'https://m.youtube.com/watch?v=jNQXAC9IVRw',
  ];

  for (const url of validUrls) {
    const res = await fetch(`${BASE_URL}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtubeUrl: url }),
    });
    const data = await res.json();
    assert(
      res.status === 202 && data.success && data.jobId,
      `URL format accepted: ${url}`,
      `jobId: ${data.jobId}`
    );
    // Cancel this test job so it does not compete
    await fetch(`${BASE_URL}/api/process/${data.jobId}/cancel`, { method: 'POST' });
  }

  // Test 2: Invalid URL Rejection
  const invalidUrls = [
    'https://example.com/not-youtube',
    'invalid-url-string',
    'https://youtube.com/user/channelonly',
  ];
  for (const badUrl of invalidUrls) {
    const res = await fetch(`${BASE_URL}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtubeUrl: badUrl }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.code === 'INVALID_URL',
      `Invalid URL rejected honestly: ${badUrl}`,
      data.error
    );
  }

  // Test 3: Real YouTube Download & Ingestion Pipeline (Me at the zoo)
  console.log('\n--- 2. REAL YOUTUBE INGESTION PIPELINE EXECUTION ---');
  const targetYtUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
  console.log(`Starting real download of: ${targetYtUrl}`);

  const startRes = await fetch(`${BASE_URL}/api/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtubeUrl: targetYtUrl, editingPersonality: 'viral' }),
  });
  const startData = await startRes.json();
  assert(startRes.status === 202 && startData.jobId, 'Ingestion job launched', startData.jobId);

  const jobId = startData.jobId;
  const projectId = startData.projectId;
  let finalProject: any = null;
  const observedStatuses = new Set<string>();

  const maxWaitMs = 120000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const pollRes = await fetch(`${BASE_URL}/api/process/${jobId}`);
    if (!pollRes.ok) {
      console.warn('Polling status warning:', pollRes.status);
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    const pollData = await pollRes.json();
    observedStatuses.add(pollData.status);
    console.log(`[Job ${jobId}] status=${pollData.status}, progress=${pollData.progress}%, stage="${pollData.currentStage}"`);

    if (pollData.status === 'completed') {
      finalProject = pollData.project;
      break;
    } else if (pollData.status === 'failed') {
      console.error('Job failed unexpectedly:', pollData.error);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 1200));
  }

  assert(Boolean(finalProject), 'Pipeline completed within timeout');
  console.log('Observed state machine steps:', Array.from(observedStatuses).join(' -> '));

  // Test 4: Verify Canonical Source Media Object
  console.log('\n--- 3. VERIFY CANONICAL SOURCE MEDIA ---');
  const sm = finalProject.sourceMedia;
  assert(Boolean(sm), 'canonical sourceMedia object attached to project');
  assert(sm.sourceType === 'youtube', 'sourceMedia.sourceType is "youtube"', sm.sourceType);
  assert(sm.hasVideo === true, 'sourceMedia hasVideo is true');
  assert(sm.hasAudio === true, 'sourceMedia hasAudio is true');
  assert(sm.duration > 15 && sm.duration < 25, 'sourceMedia duration probed accurately (~18.95s)', `${sm.duration}s`);
  assert(sm.width > 0 && sm.height > 0, 'sourceMedia width and height probed', `${sm.width}x${sm.height}`);
  assert(sm.fps > 0, 'sourceMedia fps probed', `${sm.fps}fps`);
  assert(Boolean(sm.path && fs.existsSync(sm.path)), 'Real downloaded file exists on disk', sm.path);
  assert(!sm.path.includes('sample.mp4') && !sm.path.includes('creator_clip.mp4'), 'Never substituted sample.mp4 or creator_clip.mp4');

  // Test 5: Verify Generated Shorts Within Source Boundaries
  console.log('\n--- 4. STRICT TIME BOUNDARIES ON GENERATED SHORTS ---');
  const shorts = finalProject.shorts || [];
  assert(shorts.length > 0, 'Generated valid Shorts dynamically from source', `count=${shorts.length}`);

  for (let i = 0; i < shorts.length; i++) {
    const s = shorts[i];
    const sStart = s.sourceStart !== undefined ? s.sourceStart : s.startTime;
    const sEnd = s.sourceEnd !== undefined ? s.sourceEnd : s.endTime;

    assert(sStart >= 0, `Short ${i + 1} start >= 0`, sStart);
    assert(sStart < sEnd, `Short ${i + 1} start < end`, `${sStart} < ${sEnd}`);
    assert(sEnd <= sm.duration + 0.1, `Short ${i + 1} end <= sourceMedia.duration (${sm.duration})`, sEnd);
    assert(Boolean(s.sourceMedia), `Short ${i + 1} references canonical sourceMedia`);
    assert(s.sourceMedia.duration === sm.duration, `Short ${i + 1} duration matches source duration`);
  }

  // Test 6: Unavailable YouTube Video Honest Rejection
  console.log('\n--- 5. UNAVAILABLE YOUTUBE VIDEO HONEST ERROR ---');
  const deadYtUrl = 'https://www.youtube.com/watch?v=00000000000';
  const deadRes = await fetch(`${BASE_URL}/api/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtubeUrl: deadYtUrl }),
  });
  const deadData = await deadRes.json();
  assert(deadRes.status === 202 && deadData.jobId, 'Job created for unavailable video test', deadData.jobId);

  let deadFailed = false;
  let deadErrorMsg = '';
  const deadStart = Date.now();

  while (Date.now() - deadStart < 30000) {
    const pRes = await fetch(`${BASE_URL}/api/process/${deadData.jobId}`);
    const pData = await pRes.json();
    if (pData.status === 'failed') {
      deadFailed = true;
      deadErrorMsg = pData.error || '';
      break;
    }
    await new Promise((r) => setTimeout(r, 800));
  }

  assert(deadFailed, 'Unavailable video correctly rejected with failed state');
  assert(
    deadErrorMsg.toLowerCase().includes('unavailable') || deadErrorMsg.toLowerCase().includes('failed') || deadErrorMsg.includes('Upload the video file instead'),
    'Honest error message provided without fake success or demo fallback',
    deadErrorMsg
  );

  console.log('\n================================================================');
  console.log('   ALL YOUTUBE INGESTION & BOUNDARY TESTS PASSED PERFECTLY!     ');
  console.log('================================================================\n');
}

runYouTubeIngestTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
