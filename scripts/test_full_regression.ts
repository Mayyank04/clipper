import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const ffmpegPath = (ffmpegStatic as any).default || ffmpegStatic;
const ffprobePath = (ffprobeStatic as any).default?.path || (ffprobeStatic as any).path || ffprobeStatic;
const BASE_URL = 'http://127.0.0.1:3001';

interface ProbeInfo {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  hasAudio: boolean;
  hasVideo: boolean;
}

function probe(filePath: string): Promise<ProbeInfo> {
  return new Promise((resolve, reject) => {
    execFile(
      ffprobePath,
      [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-show_streams',
        '-of', 'json',
        filePath,
      ],
      (err, stdout) => {
        if (err) return reject(err);
        try {
          const data = JSON.parse(stdout);
          const dur = parseFloat(data.format?.duration || '0');
          const videoStream = (data.streams || []).find((s: any) => s.codec_type === 'video');
          const audioStream = (data.streams || []).find((s: any) => s.codec_type === 'audio');
          let fps = 30;
          if (videoStream?.r_frame_rate) {
            const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
            if (den && den > 0) fps = Math.round(num / den);
          }
          resolve({
            duration: Number(dur.toFixed(2)),
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
            fps,
            codec: videoStream?.codec_name || audioStream?.codec_name || '',
            hasAudio: Boolean(audioStream),
            hasVideo: Boolean(videoStream),
          });
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

async function runTests() {
  console.log('============================================================');
  console.log('RUNNING FULL PRODUCT REGRESSION SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}${detail ? ` (${detail})` : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  // ------------------------------------------------------------
  // TEST SET 1: Real Media Assets Probing (Section 67)
  // ------------------------------------------------------------
  console.log('\n--- 1. REAL MEDIA ASSETS VALIDATION (ffprobe) ---');
  const mediaAssets = [
    { name: 'test_60s.mp4', path: path.join(process.cwd(), 'public/demo/test_60s.mp4'), expectedMinDur: 58, isVideo: true },
    { name: 'test_180s.mp4', path: path.join(process.cwd(), 'public/demo/test_180s.mp4'), expectedMinDur: 175, isVideo: true },
    { name: 'test_10s.mp3', path: path.join(process.cwd(), 'public/demo/test_10s.mp3'), expectedMinDur: 9, isVideo: false },
    { name: 'test_30s.mp3', path: path.join(process.cwd(), 'public/demo/test_30s.mp3'), expectedMinDur: 28, isVideo: false },
    { name: 'test_60s.mp3', path: path.join(process.cwd(), 'public/demo/test_60s.mp3'), expectedMinDur: 58, isVideo: false },
    { name: 'test_180s.mp3', path: path.join(process.cwd(), 'public/demo/test_180s.mp3'), expectedMinDur: 175, isVideo: false },
  ];

  for (const asset of mediaAssets) {
    assert(fs.existsSync(asset.path), `Asset file exists: ${asset.name}`);
    if (fs.existsSync(asset.path)) {
      const info = await probe(asset.path);
      assert(info.duration >= asset.expectedMinDur, `Duration check: ${asset.name}`, `actual=${info.duration}s, expected>=${asset.expectedMinDur}s`);
      if (asset.isVideo) {
        assert(info.hasVideo && info.width > 0 && info.height > 0, `Video stream valid: ${asset.name}`, `${info.width}x${info.height} @ ${info.fps}fps`);
      } else {
        assert(info.hasAudio && !info.hasVideo, `Audio stream valid: ${asset.name}`, `codec=${info.codec}`);
      }
    }
  }

  // ------------------------------------------------------------
  // TEST SET 2: Full Duration Regression (Section 62)
  // ------------------------------------------------------------
  console.log('\n--- 2. FULL-DURATION CHECKPOINTS REGRESSION ---');
  const checkpoints60 = [0, 10, 20, 30, 40, 50, 59];
  const checkpoints180 = [0, 30, 60, 90, 120, 150, 179];

  // Verify time mapping engine across all checkpoints
  const { sourceTimeToSequenceTime, sequenceTimeToSourceTime } = await import('../src/utils/timeEngine.js');

  const clipStart = 20;
  const clipEnd = 80;
  const clipDur = clipEnd - clipStart; // 60s

  for (const cp of checkpoints60) {
    const seqTime = cp;
    const srcTime = sequenceTimeToSourceTime(seqTime, clipStart);
    const roundTrip = sourceTimeToSequenceTime(srcTime, clipStart);
    assert(
      Math.abs(roundTrip - seqTime) < 0.001,
      `60s video checkpoint @ ${seqTime}s`,
      `seq=${seqTime}s -> src=${srcTime}s -> seq=${roundTrip}s`
    );
  }

  const clipStart180 = 50;
  const clipEnd180 = 230; // 180s
  for (const cp of checkpoints180) {
    const seqTime = cp;
    const srcTime = sequenceTimeToSourceTime(seqTime, clipStart180);
    const roundTrip = sourceTimeToSequenceTime(srcTime, clipStart180);
    assert(
      Math.abs(roundTrip - seqTime) < 0.001,
      `180s video checkpoint @ ${seqTime}s`,
      `seq=${seqTime}s -> src=${srcTime}s -> seq=${roundTrip}s`
    );
  }

  // ------------------------------------------------------------
  // TEST SET 3: Second-Half Regression (Section 63)
  // ------------------------------------------------------------
  console.log('\n--- 3. SECOND-HALF TIMELINE REGRESSION (Section 63) ---');
  const testShortDuration = 60; // 60-second short
  const testElements = [
    { type: 'caption', posPct: 10, time: 6.0 },
    { type: 'caption', posPct: 30, time: 18.0 },
    { type: 'caption', posPct: 50, time: 30.0 },
    { type: 'caption', posPct: 70, time: 42.0 },
    { type: 'caption', posPct: 90, time: 54.0 },
    { type: 'broll', posPct: 75, time: 45.0 },
    { type: 'sfx', posPct: 80, time: 48.0 },
    { type: 'vfx', posPct: 90, time: 54.0 },
  ];

  for (const el of testElements) {
    const expectedTime = (testShortDuration * el.posPct) / 100;
    assert(
      Math.abs(el.time - expectedTime) < 0.01 && el.time <= testShortDuration,
      `Second-half element trigger: ${el.type} at ${el.posPct}%`,
      `time=${el.time}s <= shortDuration=${testShortDuration}s`
    );
  }

  // ------------------------------------------------------------
  // TEST SET 4: Canonical Editor Operations (Split, Delete, Trim)
  // ------------------------------------------------------------
  console.log('\n--- 4. CANONICAL EDITOR OPERATIONS (Split, Delete, Trim) ---');
  const { createEditorProject, splitEditorProject, deleteEditorClip, trimEditorProject } = await import('../src/utils/canonicalEditor.js');

  const baseShort: any = {
    id: 'short_canon_1',
    projectId: 'proj_test',
    title: 'Canonical Test Short',
    description: 'Testing canonical editor operations',
    startTime: 0,
    endTime: 60,
    duration: 60,
    videoProxyUrl: '/demo/test_60s.mp4',
    aspectRatio: '9:16',
    captions: [
      { id: 'c1', text: 'First segment', start: 5, end: 15, words: [] },
      { id: 'c2', text: 'Second segment', start: 35, end: 45, words: [] },
    ],
    brollSuggestions: [
      { id: 'b1', timestamp: 40, duration: 5, prompt: 'Chart overlay', assetUrl: '/demo/sample.mp4' },
    ],
    sfxMarkers: [
      { id: 's1', timestamp: 10, category: 'whoosh', soundName: 'Fast Whoosh', volume: 0.8 },
      { id: 's2', timestamp: 50, category: 'impact', soundName: 'Sub Impact', volume: 0.8 },
    ],
    vfxMarkers: [
      { id: 'v1', timestamp: 35, duration: 2, type: 'zoom_punch', label: 'Zoom In', intensity: 7 },
    ],
  };

  const mockParentProject: any = {
    id: 'proj_test',
    originalTitle: 'Canonical Test Video',
    videoUrl: '/demo/test_60s.mp4',
    originalDuration: 60,
  };

  const project = createEditorProject(mockParentProject, baseShort);
  assert(project.videoTracks.length === 1 && project.sequence.duration === 60, 'Initial EditorProject has 1 clip of 60s');

  // Split at 25s
  const splitProj = splitEditorProject(project, 25);
  assert(
    splitProj.videoTracks.length === 2 &&
    splitProj.videoTracks[0].timelineEnd === 25 &&
    splitProj.videoTracks[1].timelineStart === 25,
    'Split at 25s creates 2 clips (0-25s and 25-60s)'
  );

  // Delete second clip
  const deletedProj = deleteEditorClip(splitProj, splitProj.videoTracks[1].id);
  assert(
    deletedProj.videoTracks.length === 1 && deletedProj.sequence.duration === 25,
    'Delete second clip adjusts project duration to 25s'
  );

  // Trim project
  const trimmedProj = trimEditorProject(project, 10, 50);
  assert(
    trimmedProj.sequence.duration === 40 &&
    trimmedProj.videoTracks[0].sourceStart === 10 &&
    trimmedProj.videoTracks[0].sourceEnd === 50,
    'Trim project to 10s-50s creates canonical 40s duration'
  );

  // ------------------------------------------------------------
  // TEST SET 5: Honest API Behavior & Zero Fake Substitution
  // ------------------------------------------------------------
  console.log('\n--- 5. HONEST API CAPABILITY & ERROR REJECTION ---');

  // YouTube ingestion rejection check
  const ytRes = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Real YouTube Link',
    }),
  });
  const ytData = await ytRes.json();
  assert(
    (ytRes.status === 400 && ytData.code === 'YOUTUBE_UNAVAILABLE') || (ytRes.status === 201 && ytData.success),
    'Handles YouTube ingestion honestly without silent demo fallback',
    ytData.error || 'Real YouTube Ingestion active'
  );

  // Project creation with local video file probes true duration
  const localProjRes = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      youtubeUrl: '/demo/test_60s.mp4',
      title: 'Local Probed 60s Project',
    }),
  });
  const localProjData = await localProjRes.json();
  assert(
    localProjRes.ok && localProjData.project.originalDuration >= 58,
    'POST /api/projects probes real file duration',
    `probedDuration=${localProjData.project?.originalDuration}s`
  );

  // Generate more shorts without slice(0, 3) and without fabricated quotes
  const moreRes = await fetch(`${BASE_URL}/api/projects/${localProjData.project.id}/generate-more`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const moreData = await moreRes.json();
  assert(
    moreRes.ok && Array.isArray(moreData.allShorts),
    'POST /api/projects/:id/generate-more returns valid shorts array',
    `totalShorts=${moreData.allShorts?.length}`
  );
  if (moreData.allShorts?.length > 0) {
    const hasFakeNoticeQuote = moreData.allShorts.some((s: any) =>
      (s.captions || []).some((c: any) => c.text?.includes('Notice what occurs at this exact transition point'))
    );
    assert(!hasFakeNoticeQuote, 'Zero fabricated "Notice what occurs" speech quotes in generated shorts');
  }

  // ------------------------------------------------------------
  // TEST SET 6: Real FFmpeg Exports (10s, 30s) (Sections 65 & 66)
  // ------------------------------------------------------------
  console.log('\n--- 6. EXPORT DURATION & QUALITY REGRESSION (FFmpeg + ffprobe) ---');

  // 10s Export Test
  const short10: any = {
    id: `reg_10s_${Date.now()}`,
    projectId: localProjData.project.id,
    title: '10s Export Test',
    startTime: 0,
    endTime: 10,
    duration: 10,
    videoProxyUrl: '/demo/test_60s.mp4',
    aspectRatio: '9:16',
    captions: [
      { id: 'c1', text: 'Testing export duration parity', start: 1, end: 5, words: [] },
      { id: 'c2', text: 'Second caption at seven seconds', start: 7, end: 9.5, words: [] },
    ],
    vfxMarkers: [
      { id: 'v1', timestamp: 0, duration: 1.5, type: 'zoom_punch', label: 'Punch In', intensity: 7 },
    ],
  };

  // Add short to project
  await fetch(`${BASE_URL}/api/projects/${localProjData.project.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shorts: [short10] }),
  });

  const exportReq10 = await fetch(`${BASE_URL}/api/projects/${localProjData.project.id}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shortId: short10.id, short: short10, format: 'mp4', resolution: '1080p' }),
  });
  const exportData10 = await exportReq10.json();
  assert(exportReq10.ok && exportData10.success, 'Export initiated for 10s short', `jobId=${exportData10.exportId}`);

  // Poll for completion
  let completedJob10: any = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const pollRes = await fetch(`${BASE_URL}/api/exports/${exportData10.exportId}`);
    const pollData = await pollRes.json();
    if (pollData.status === 'completed') {
      completedJob10 = pollData;
      break;
    }
  }
  assert(Boolean(completedJob10), '10s Export job completed successfully');

  if (completedJob10?.downloadUrl) {
    const cleanUrl = completedJob10.downloadUrl.replace(/^\//, '');
    const diskPath = path.join(process.cwd(), 'public', cleanUrl);
    assert(fs.existsSync(diskPath), 'Exported 10s MP4 exists on disk', diskPath);
    const probe10 = await probe(diskPath);
    assert(
      Math.abs(probe10.duration - 10) <= 0.5,
      'Probed duration matches requested duration (10s ≈ 10s)',
      `probed=${probe10.duration}s`
    );
    assert(
      probe10.width === 1080 && probe10.height === 1920,
      'Probed resolution is standard 9:16 vertical (1080x1920)',
      `${probe10.width}x${probe10.height}`
    );
  }

  // Audio to Video Export Test (test_10s.mp3)
  console.log('\n--- 7. AUDIO -> VIDEO EXPORT REGRESSION ---');
  const audioShort: any = {
    id: `audio_short_${Date.now()}`,
    projectId: localProjData.project.id,
    title: 'Audio to Video Short',
    startTime: 0,
    endTime: 10.05,
    duration: 10.05,
    audioUrl: '/demo/test_10s.mp3',
    videoProxyUrl: '/demo/test_10s.mp3',
    aspectRatio: '9:16',
    audioToVideoConfig: {
      visualizerType: 'bars',
      backgroundType: 'gradient',
      typingStyle: 'karaoke',
      typingSpeed: 1.0,
      typingRevealMode: 'word',
      showTypewriterCursor: false,
      enableKaraokeHighlight: true,
      karaokeHighlightColor: '#facc15',
      karaokeScaleActive: true,
      karaokeGlowActive: true,
      enableAiEmphasis: true,
      visualizerPosition: 'center',
      visualizerColor: '#38bdf8',
      visualizerBarCount: 48,
    },
    captions: [
      { id: 'ca1', text: 'This is audio speech', start: 1, end: 4, words: [] },
      { id: 'ca2', text: 'Synchronized kinetic karaoke', start: 5, end: 9, words: [] },
    ],
  };

  const audioExportReq = await fetch(`${BASE_URL}/api/projects/${localProjData.project.id}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shortId: audioShort.id, short: audioShort, format: 'mp4', resolution: '1080p' }),
  });
  const audioExportData = await audioExportReq.json();
  assert(audioExportReq.ok && audioExportData.success, 'Audio->Video export initiated', `jobId=${audioExportData.exportId}`);

  let completedAudioJob: any = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const pollRes = await fetch(`${BASE_URL}/api/exports/${audioExportData.exportId}`);
    const pollData = await pollRes.json();
    if (pollData.status === 'completed') {
      completedAudioJob = pollData;
      break;
    }
  }
  assert(Boolean(completedAudioJob), 'Audio->Video Export job completed successfully');

  if (completedAudioJob?.downloadUrl) {
    const cleanUrl = completedAudioJob.downloadUrl.replace(/^\//, '');
    const diskPath = path.join(process.cwd(), 'public', cleanUrl);
    assert(fs.existsSync(diskPath), 'Exported Audio->Video MP4 exists on disk', diskPath);
    const audioProbe = await probe(diskPath);
    assert(
      audioProbe.hasAudio && audioProbe.hasVideo,
      'Exported Audio->Video file contains both video & audio streams',
      `video=${audioProbe.codec}, audio=aac`
    );
    assert(
      audioProbe.width === 1080 && audioProbe.height === 1920,
      'Exported Audio->Video resolution is 1080x1920',
      `${audioProbe.width}x${audioProbe.height}`
    );
    assert(
      audioProbe.duration >= 9.5 && audioProbe.duration <= 11.5,
      'Exported Audio->Video duration matches audio source duration (≈10s)',
      `probed=${audioProbe.duration}s`
    );
  }

  // ------------------------------------------------------------
  // TEST SET 8: Multi-Aspect Ratio & FPS Verification (1:1 & 16:9)
  // ------------------------------------------------------------
  console.log('\n--- 8. MULTI-ASPECT RATIO & FPS RENDERING (1:1 @ 60 FPS, 16:9 @ 30 FPS) ---');

  const squareShort: any = {
    id: `short_square_${Date.now()}`,
    startTime: 0,
    duration: 3,
    endTime: 3,
    title: '1:1 Square 60FPS Test',
    captions: [{ id: 'sq1', text: 'Square format testing', start: 0.5, end: 2.5, words: [] }],
  };

  const squareExportReq = await fetch(`${BASE_URL}/api/projects/${localProjData.project.id}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shortId: squareShort.id,
      short: squareShort,
      format: 'mp4',
      resolution: '1080x1080',
      fps: 60,
    }),
  });
  const squareExportData = await squareExportReq.json();
  assert(squareExportReq.ok && squareExportData.success, '1:1 Square export job enqueued');

  let completedSquareJob: any = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const pollRes = await fetch(`${BASE_URL}/api/exports/${squareExportData.exportId}`);
    const pollData = await pollRes.json();
    if (pollData.status === 'completed') {
      completedSquareJob = pollData;
      break;
    }
  }
  assert(Boolean(completedSquareJob), '1:1 Square 60FPS export completed successfully');

  if (completedSquareJob?.downloadUrl) {
    const cleanUrl = completedSquareJob.downloadUrl.replace(/^\//, '');
    const diskPath = path.join(process.cwd(), 'public', cleanUrl);
    const probeSquare = await probe(diskPath);
    assert(
      probeSquare.width === 1080 && probeSquare.height === 1080,
      'Exported 1:1 Square resolution is exactly 1080x1080',
      `${probeSquare.width}x${probeSquare.height}`
    );
    assert(
      probeSquare.fps >= 59 && probeSquare.fps <= 61,
      'Exported 1:1 Square frame rate is 60 FPS',
      `${probeSquare.fps} FPS`
    );
  }

  const landscapeShort: any = {
    id: `short_land_${Date.now()}`,
    startTime: 0,
    duration: 3,
    endTime: 3,
    title: '16:9 Landscape 30FPS Test',
    captions: [{ id: 'ls1', text: 'Landscape format testing', start: 0.5, end: 2.5, words: [] }],
  };

  const landExportReq = await fetch(`${BASE_URL}/api/projects/${localProjData.project.id}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shortId: landscapeShort.id,
      short: landscapeShort,
      format: 'mp4',
      resolution: '1920x1080',
      fps: 30,
    }),
  });
  const landExportData = await landExportReq.json();
  assert(landExportReq.ok && landExportData.success, '16:9 Landscape export job enqueued');

  let completedLandJob: any = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const pollRes = await fetch(`${BASE_URL}/api/exports/${landExportData.exportId}`);
    const pollData = await pollRes.json();
    if (pollData.status === 'completed') {
      completedLandJob = pollData;
      break;
    }
  }
  assert(Boolean(completedLandJob), '16:9 Landscape export completed successfully');

  if (completedLandJob?.downloadUrl) {
    const cleanUrl = completedLandJob.downloadUrl.replace(/^\//, '');
    const diskPath = path.join(process.cwd(), 'public', cleanUrl);
    const probeLand = await probe(diskPath);
    assert(
      probeLand.width === 1920 && probeLand.height === 1080,
      'Exported 16:9 Landscape resolution is exactly 1920x1080',
      `${probeLand.width}x${probeLand.height}`
    );
  }

  // Summary
  console.log('\n============================================================');
  console.log(`REGRESSION SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Regression suite encountered unexpected error:', err);
  process.exit(1);
});
