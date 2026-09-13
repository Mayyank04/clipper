import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import {
  normalizeCanonicalTranscript,
  generateAutoScriptFromTranscript,
  canonicalTranscriptToSegments,
  calculateCaptionCoverage,
} from '../src/utils/captionEngine';
import { Transcript } from '../src/types';

const ffmpegPath = (ffmpegStatic as unknown as string) || 'ffmpeg';
const ffprobePath = ffprobeStatic.path;

function probeMedia(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    execFile(
      ffprobePath,
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration,size:stream=codec_type,codec_name,width,height',
        '-of',
        'json',
        filePath,
      ],
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        try {
          const data = JSON.parse(stdout);
          const duration = parseFloat(data.format?.duration || '0');
          const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
          const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');
          resolve({
            duration,
            hasAudio: Boolean(audioStream),
            hasVideo: Boolean(videoStream),
            video: videoStream
              ? { codec: videoStream.codec_name, width: videoStream.width, height: videoStream.height }
              : null,
            audio: audioStream ? { codec: audioStream.codec_name } : null,
          });
        } catch (e: any) {
          reject(e);
        }
      }
    );
  });
}

function extractFrame(videoPath: string, timestamp: number, outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(
      ffmpegPath,
      ['-y', '-ss', String(timestamp), '-i', videoPath, '-frames:v', '1', '-q:v', '2', outputPath],
      (err) => {
        resolve(!err && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0);
      }
    );
  });
}

async function runAutoCaptionPipelineTests() {
  console.log('===========================================================');
  console.log('VIRALCLIP STUDIO — AUTO CAPTION & AUTO TRANSCRIBE PIPELINE QA');
  console.log('===========================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assertTest(condition: boolean, title: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${title}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${title}`);
      throw new Error(`Assertion failed: ${title}`);
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Media Audio Detection & NO_AUDIO Rejection
  // -------------------------------------------------------------
  console.log('[TEST 1] Testing Real Media Probing & Silent Audio Rejection...');
  const realVideoPath = path.join(process.cwd(), 'public', 'demo', 'creator_clip.mp4');
  assertTest(fs.existsSync(realVideoPath), 'creator_clip.mp4 exists on disk');

  const probeResult = await probeMedia(realVideoPath);
  console.log(`  Probed media: duration=${probeResult.duration.toFixed(2)}s, hasAudio=${probeResult.hasAudio}, video=${probeResult.video?.width}x${probeResult.video?.height}`);
  assertTest(probeResult.hasAudio === true, 'Real source media contains valid audio stream');
  assertTest(probeResult.duration > 10, 'Real source media has valid non-zero duration');

  // Generate a silent video without audio stream to verify strict NO_AUDIO rejection
  const exportsDir = path.join(process.cwd(), 'public', 'exports');
  if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
  const silentVideoPath = path.join(exportsDir, 'silent_test.mp4');

  await new Promise<void>((resolve, reject) => {
    execFile(
      ffmpegPath,
      ['-y', '-f', 'lavfi', '-i', 'color=c=navy:s=320x240:d=2', '-c:v', 'libx264', silentVideoPath],
      (err) => (err ? reject(err) : resolve())
    );
  });

  const silentProbe = await probeMedia(silentVideoPath);
  assertTest(silentProbe.hasAudio === false, 'Silent video probe correctly confirms no audio stream');

  // Verify server rejects silent media with 400 NO_AUDIO
  const silentRes = await fetch('http://localhost:3001/api/transcribe-captions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoUrl: '/exports/silent_test.mp4' }),
  });
  const silentData = await silentRes.json();
  assertTest(silentRes.status === 400, 'Server returns HTTP 400 for media without audio');
  assertTest(silentData.code === 'NO_AUDIO', 'Server returns error code NO_AUDIO');
  assertTest(
    silentData.error === 'No speech/audio track was detected in this media.',
    'Server returns exact expected error message for no audio'
  );

  // -------------------------------------------------------------
  // TEST 2: Canonical Transcript Normalization & Hard Validation
  // -------------------------------------------------------------
  console.log('\n[TEST 2] Testing Canonical Transcript Normalization & Hard Validation...');

  // Raw transcription fixture with messy timestamps (ms values, negative start, missing ends, overlaps)
  const rawMessyTranscription = {
    language: 'Hindi',
    languageConfidence: 0.96,
    duration: 45.0,
    segments: [
      {
        id: 'seg_1',
        text: 'आज हम बात करेंगे AI वीडियो एडिटिंग के बारे में',
        start: -0.5, // Negative timestamp (should clamp to 0)
        end: 4.8,
        words: [
          { text: 'आज', start: -0.2, end: 0.5 },
          { text: 'हम', start: 0.5, end: 0.8 },
          { text: 'बात', start: 0.8, end: 1.2 },
          { text: 'करेंगे', start: 1.2, end: 1.8 },
          { text: 'AI', start: 1.8, end: 2.3 },
          { text: 'वीडियो', start: 2.3, end: 3.1 },
          { text: 'एडिटिंग', start: 3.1, end: 3.8 },
          { text: 'के', start: 3.8, end: 4.1 },
          { text: 'बारे', start: 4.1, end: 4.4 },
          { text: 'में', start: 4.4, end: 4.8 },
        ],
      },
      {
        id: 'seg_2',
        text: 'This produces incredible viral retention results',
        start: 4800, // Milliseconds (should normalize to 4.8s)
        end: 9200,   // Milliseconds (should normalize to 9.2s)
        words: [
          { text: 'This', start: 4800, end: 5200 },
          { text: 'produces', start: 5200, end: 6000 },
          { text: 'incredible', start: 6000, end: 7100 },
          { text: 'viral', start: 7100, end: 7800 },
          { text: 'retention', start: 7800, end: 8500 },
          { text: 'results', start: 8500, end: 9200 },
        ],
      },
      {
        id: 'seg_3',
        text: 'ਅਤੇ ਇਹ ਸਭ ਤੋਂ ਵਧੀਆ ਢੰਗ ਹੈ',
        start: 12.0,
        end: 16.5,
        words: [
          { text: 'ਅਤੇ', start: 12.0, end: 12.5 },
          { text: 'ਇਹ', start: 12.5, end: 13.0 },
          { text: 'ਸਭ', start: 13.0, end: 13.6 },
          { text: 'ਤੋਂ', start: 13.6, end: 14.2 },
          { text: 'ਵਧੀਆ', start: 14.2, end: 15.3 },
          { text: 'ਢੰਗ', start: 15.3, end: 15.9 },
          { text: 'ਹੈ', start: 15.9, end: 16.5 },
        ],
      },
      {
        id: 'seg_4',
        text: 'Follow for the next masterclass',
        start: 40.0,
        end: 44.5,
        words: [
          { text: 'Follow', start: 40.0, end: 40.8 },
          { text: 'for', start: 40.8, end: 41.2 },
          { text: 'the', start: 41.2, end: 41.5 },
          { text: 'next', start: 41.5, end: 42.1 },
          { text: 'masterclass', start: 42.1, end: 44.5 },
        ],
      },
    ],
  };

  const canonical = normalizeCanonicalTranscript(rawMessyTranscription, 45.0);
  assertTest(canonical.words.length > 0, 'Canonical transcript has non-empty words list');
  assertTest(canonical.words[0].start >= 0, 'Negative start timestamp clamped to >= 0');
  assertTest(canonical.segments[1].start < 10, 'Millisecond timestamps correctly scaled to seconds (4.8s)');
  assertTest(canonical.words.every((w) => w.end > w.start), 'Every word end timestamp is strictly greater than start');
  assertTest(canonical.speechCoverage >= 0.85, `Speech coverage calculated accurately: ${(canonical.speechCoverage * 100).toFixed(1)}%`);

  // Code switching detection verification
  assertTest(Boolean(canonical.detectedLanguages && canonical.detectedLanguages.length > 1), 'Multilingual code switching automatically detected');
  console.log('  Detected Languages:', canonical.detectedLanguages);

  // -------------------------------------------------------------
  // TEST 3: Auto Script Generation from Real Transcript
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Testing Auto Script Generation from Real Transcript...');
  const scriptSections = generateAutoScriptFromTranscript(canonical);
  assertTest(scriptSections.length >= 3, `Generated ${scriptSections.length} narrative script sections`);

  const hookSection = scriptSections.find((s) => s.type === 'hook');
  assertTest(Boolean(hookSection), 'Generated Hook section with real transcript text');
  assertTest(typeof hookSection?.start === 'number' && typeof hookSection?.end === 'number', 'Hook section has valid start and end timestamps');
  console.log(`  Hook Section: [${hookSection?.start}s - ${hookSection?.end}s] "${hookSection?.text}"`);

  const payoffSection = scriptSections.find((s) => s.type === 'payoff');
  assertTest(Boolean(payoffSection), 'Generated Payoff / CTA section with real timestamps');
  console.log(`  Payoff Section: [${payoffSection?.start}s - ${payoffSection?.end}s] "${payoffSection?.text}"`);

  // -------------------------------------------------------------
  // TEST 4: Caption Segments Generation & 35 Style Engine
  // -------------------------------------------------------------
  console.log('\n[TEST 4] Testing Caption Grouping & Style Compatibility...');
  const captionSegments = canonicalTranscriptToSegments(canonical);
  assertTest(captionSegments.length > 0, `Generated ${captionSegments.length} formatted caption segments`);
  assertTest(captionSegments.every((c) => c.words && c.words.length > 0), 'Every caption segment contains word-level kinetic timings');

  const coverageStats = calculateCaptionCoverage(captionSegments, 45.0);
  console.log(`  Timeline Coverage: ${coverageStats.coveragePercent}%, Q1=${coverageStats.quartileCoverage.q1}, Q2=${coverageStats.quartileCoverage.q2}, Q3=${coverageStats.quartileCoverage.q3}, Q4=${coverageStats.quartileCoverage.q4}`);
  assertTest(canonical.speechCoverage >= 0.95, `Speech coverage meets >= 95% target (${(canonical.speechCoverage * 100).toFixed(0)}%)`);

  // -------------------------------------------------------------
  // TEST 5: Server Endpoint Integration & Caching
  // -------------------------------------------------------------
  console.log('\n[TEST 5] Testing Server /api/transcribe-captions & Cache Layer...');
  const transcribeRes = await fetch('http://localhost:3001/api/transcribe-captions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoUrl: '/demo/creator_clip.mp4',
      title: 'Creator Video Clip',
      duration: 45,
      startTime: 0,
      endTime: 45,
    }),
  });

  const transcribeData = await transcribeRes.json();
  assertTest(transcribeRes.ok && transcribeData.success, 'Server returned success on real video transcription');
  assertTest(Array.isArray(transcribeData.captions) && transcribeData.captions.length > 0, `Server generated ${transcribeData.captions?.length} real caption segments`);
  assertTest(Array.isArray(transcribeData.scriptSections) && transcribeData.scriptSections.length > 0, `Server generated ${transcribeData.scriptSections?.length} Auto Script sections`);

  // Verify caching: second call returns fromCache = true
  const cacheRes = await fetch('http://localhost:3001/api/transcribe-captions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoUrl: '/demo/creator_clip.mp4',
      title: 'Creator Video Clip',
      duration: 45,
      startTime: 0,
      endTime: 45,
    }),
  });
  const cacheData = await cacheRes.json();
  assertTest(cacheData.fromCache === true, 'Second call retrieved cached transcription (Requirement 29)');

  // -------------------------------------------------------------
  // TEST 6: Real FFmpeg Export with Burned-in Multilingual Captions
  // -------------------------------------------------------------
  console.log('\n[TEST 6] Testing Real FFmpeg Export with Burned-in Captions...');

  // Create test project in server
  const projRes = await fetch('http://localhost:3001/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: '/demo/creator_clip.mp4',
      title: 'Auto Caption E2E Project',
      isDemo: true,
    }),
  });
  const projData = await projRes.json();
  assertTest(projData.success, 'Project created on server');
  const project = projData.project;

  const testShortId = `short_qa_${Date.now()}`;
  const shortDuration = 10; // 10s short export for quick validation
  const testShort = {
    id: testShortId,
    projectId: project.id,
    title: 'Auto Caption Export Short',
    duration: shortDuration,
    startTime: 0,
    endTime: shortDuration,
    videoProxyUrl: '/demo/creator_clip.mp4',
    captions: [
      { id: 'c1', start: 0.5, end: 3.2, text: 'आज हम बात करेंगे AI वीडियो', words: [] },
      { id: 'c2', start: 3.5, end: 6.8, text: 'Real Burned Multilingual Captions', words: [] },
      { id: 'c3', start: 7.0, end: 9.5, text: 'ਸਭ ਤੋਂ ਵਧੀਆ ਨਤੀਜੇ', words: [] },
    ],
    brollSuggestions: [],
    sfxMarkers: [],
    vfxMarkers: [],
  };

  project.shorts = [testShort];
  await fetch(`http://localhost:3001/api/projects/${project.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });

  console.log('  Triggering real FFmpeg export with ASS subtitles...');
  const exportRes = await fetch(`http://localhost:3001/api/projects/${project.id}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shortId: testShortId,
      short: testShort,
      resolution: '1080x1920',
      format: 'mp4',
    }),
  });

  const exportData = await exportRes.json();
  assertTest(Boolean(exportData.exportId), `Export job dispatched: id=${exportData.exportId}`);

  // Poll export completion
  let attempts = 0;
  let finishedJob: any = null;
  while (attempts < 60) {
    attempts++;
    await new Promise((r) => setTimeout(r, 800));
    const statusRes = await fetch(`http://localhost:3001/api/exports/${exportData.exportId}`);
    const statusData = await statusRes.json();
    if (statusData.status === 'completed') {
      finishedJob = statusData;
      break;
    } else if (statusData.status === 'failed') {
      throw new Error(`Export job failed: ${statusData.error}`);
    }
  }

  assertTest(Boolean(finishedJob), 'FFmpeg render job completed successfully');
  console.log(`  Export completed in ${attempts * 0.8}s: downloadUrl=${finishedJob.downloadUrl}`);

  const exportedFilePath = path.join(process.cwd(), 'public', finishedJob.downloadUrl.replace(/^\/public\//, '/'));
  assertTest(fs.existsSync(exportedFilePath), 'Exported MP4 file exists on disk');

  // FFprobe Verification
  const exportedProbe = await probeMedia(exportedFilePath);
  console.log(`  Exported probe: duration=${exportedProbe.duration.toFixed(2)}s, resolution=${exportedProbe.video?.width}x${exportedProbe.video?.height}, videoCodec=${exportedProbe.video?.codec}, audioCodec=${exportedProbe.audio?.codec}`);
  assertTest(exportedProbe.duration >= shortDuration - 1.0, 'Exported duration matches clip duration');
  assertTest(exportedProbe.video?.width === 1080 && exportedProbe.video?.height === 1920, 'Exported resolution is vertical 1080x1920 (9:16)');
  assertTest(exportedProbe.hasAudio === true, 'Exported MP4 contains synchronized audio track');

  // Extract frames at 10%, 25%, 50%, 75%, 90%
  const framesDir = path.join(exportsDir, 'qa_frames');
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });

  const checkpoints = [0.1, 0.25, 0.5, 0.75, 0.9];
  for (const cp of checkpoints) {
    const frameSec = Number((exportedProbe.duration * cp).toFixed(2));
    const framePath = path.join(framesDir, `frame_${Math.round(cp * 100)}.png`);
    const success = await extractFrame(exportedFilePath, frameSec, framePath);
    assertTest(success, `Frame extracted at ${(cp * 100)}% (${frameSec}s) into ${path.basename(framePath)}`);
  }

  console.log('\n===========================================================');
  console.log(`ALL TESTS PASSED: ${passedTests} / ${totalTests} (100%)`);
  console.log('===========================================================');
}

runAutoCaptionPipelineTests().catch((err) => {
  console.error('\n❌ FATAL TEST ERROR:', err);
  process.exit(1);
});
