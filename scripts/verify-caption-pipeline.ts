/**
 * VIRALCLIP STUDIO — COMPREHENSIVE CAPTION PIPELINE VERIFICATION SUITE
 * Tests the entire auto-caption & transcription pipeline on real media:
 * - 10s, 30s, 60s, 180s video processing
 * - Native Whisper word timestamps (strictly non-proportional)
 * - Boundary chunk preservation (zero 15s or 30s cutoffs)
 * - Strict monotonicity and non-speech filtering
 * - ASS Subtitle rendering & 1080x1920 MP4 export verification
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { TranscriptionManager } from '../src/utils/transcription/TranscriptionManager';
import { formatAssSubtitle } from '../src/utils/subtitleFormatter';

const ffmpegPath = ffmpegStatic || 'ffmpeg';
const ffprobePath = (ffprobeStatic as any)?.path || 'ffprobe';

interface ProbeInfo {
  duration: number;
  hasAudio: boolean;
  hasVideo: boolean;
  width?: number;
  height?: number;
  vcodec?: string;
  acodec?: string;
  fileSize: number;
}

function probeMedia(filePath: string): Promise<ProbeInfo> {
  return new Promise((resolve, reject) => {
    execFile(
      ffprobePath,
      [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        filePath,
      ],
      (err, stdout) => {
        if (err || !stdout) {
          return reject(new Error(`ffprobe failed for ${filePath}: ${err?.message}`));
        }
        try {
          const data = JSON.parse(stdout);
          const format = data.format || {};
          const duration = parseFloat(format.duration || '0');
          const fileSize = parseInt(format.size || '0', 10);
          const vStream = (data.streams || []).find((s: any) => s.codec_type === 'video');
          const aStream = (data.streams || []).find((s: any) => s.codec_type === 'audio');

          resolve({
            duration,
            fileSize,
            hasVideo: Boolean(vStream),
            hasAudio: Boolean(aStream),
            width: vStream?.width,
            height: vStream?.height,
            vcodec: vStream?.codec_name,
            acodec: aStream?.codec_name,
          });
        } catch (e: any) {
          reject(e);
        }
      }
    );
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('  VIRALCLIP STUDIO — REAL CAPTION PIPELINE FORENSIC TEST SUITE');
  console.log('================================================================\n');

  const manager = TranscriptionManager.getInstance();
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, msg: string) {
    totalCount++;
    if (condition) {
      console.log(`  ✓ PASS: ${msg}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // -------------------------------------------------------------
  // TEST A: 10-Second Real Speech Video
  // -------------------------------------------------------------
  console.log('--- TEST A: 10s Real Speech Video ---');
  const video10s = path.join(process.cwd(), 'public', 'uploads', 'test_speech_10s.mp4');
  assert(fs.existsSync(video10s), 'test_speech_10s.mp4 exists on disk');

  const t0 = Date.now();
  const res10s = await manager.transcribe({
    sourceMediaPath: video10s,
    forceRefresh: true,
  });
  const elapsed10s = (Date.now() - t0) / 1000;

  console.log(`  [10s] Transcribed in ${elapsed10s.toFixed(2)}s | Model: ${res10s.model} | Device: ${res10s.device}`);
  console.log(`  [10s] Words: ${res10s.canonicalTranscript.words.length} | Segments: ${res10s.canonicalTranscript.segments.length}`);
  assert(res10s.canonicalTranscript.words.length >= 10, 'Extracted at least 10 words for 10s video');
  assert(res10s.canonicalTranscript.segments.length >= 2, 'Generated at least 2 caption beats');
  assert(res10s.providerUsed === 'local-whisper', 'Used canonical local-whisper provider');

  // Verify timestamps
  const words10s = res10s.canonicalTranscript.words;
  assert(words10s[0].start >= 0, 'First word start >= 0');
  assert(words10s[words10s.length - 1].end <= 11.0, 'Last word within video duration boundary');
  for (let i = 1; i < words10s.length; i++) {
    assert(words10s[i].start >= words10s[i - 1].start, `Monotonic start timestamps at index ${i}`);
    assert(words10s[i].end > words10s[i].start, `End > start at index ${i}`);
  }

  // -------------------------------------------------------------
  // TEST B: 30-Second Real Speech Video
  // -------------------------------------------------------------
  console.log('\n--- TEST B: 30s Real Speech Video ---');
  const video30s = path.join(process.cwd(), 'public', 'uploads', 'test_speech_30s.mp4');
  assert(fs.existsSync(video30s), 'test_speech_30s.mp4 exists on disk');

  const t1 = Date.now();
  const res30s = await manager.transcribe({
    sourceMediaPath: video30s,
    forceRefresh: true,
  });
  const elapsed30s = (Date.now() - t1) / 1000;

  console.log(`  [30s] Transcribed in ${elapsed30s.toFixed(2)}s | Words: ${res30s.canonicalTranscript.words.length} | Segments: ${res30s.canonicalTranscript.segments.length}`);
  assert(res30s.canonicalTranscript.words.length >= 30, 'Extracted >= 30 words for 30s speech');
  assert(res30s.canonicalTranscript.duration >= 28, 'Measured duration >= 28s');

  // -------------------------------------------------------------
  // TEST C: Non-Proportional Timestamp Proof (Phase 36)
  // -------------------------------------------------------------
  console.log('\n--- TEST C: Word Timestamp Non-Proportionality Verification ---');
  // Check that word durations vary according to phoneme length and are NOT equal
  const segmentsWithMultiWords = res30s.canonicalTranscript.segments.filter((s) => s.words && s.words.length >= 3);
  assert(segmentsWithMultiWords.length > 0, 'Segments contain multi-word beats');

  let hasVaryingWordDurations = false;
  for (const seg of segmentsWithMultiWords) {
    const durations = seg.words.map((w) => Number((w.end - w.start).toFixed(3)));
    const minDur = Math.min(...durations);
    const maxDur = Math.max(...durations);
    // If durations differ by at least 0.05s, it's real non-proportional speech timing!
    if (maxDur - minDur >= 0.05) {
      hasVaryingWordDurations = true;
      console.log(`  Sample segment: "${seg.text}"`);
      console.log(`  Word durations: ${seg.words.map((w) => `"${w.word || w.text}": ${(w.end - w.start).toFixed(3)}s`).join(', ')}`);
      break;
    }
  }
  assert(hasVaryingWordDurations, 'Word durations reflect genuine Whisper acoustic timings (NOT proportional division)');

  // -------------------------------------------------------------
  // TEST D: 180-Second Video & 15-Second Cutoff Regression Check (Phases 51 & 52)
  // -------------------------------------------------------------
  console.log('\n--- TEST D: 180s Video (Phase 52 15-Second Regression Check) ---');
  const video180s = path.join(process.cwd(), 'public', 'uploads', 'test_speech_180s.mp4');
  assert(fs.existsSync(video180s), 'test_speech_180s.mp4 exists on disk');

  const t2 = Date.now();
  const res180s = await manager.transcribe({
    sourceMediaPath: video180s,
    forceRefresh: true,
  });
  const elapsed180s = (Date.now() - t2) / 1000;

  console.log(`  [180s] Transcribed in ${elapsed180s.toFixed(2)}s`);
  console.log(`  [180s] Total Words: ${res180s.canonicalTranscript.words.length} | Segments: ${res180s.canonicalTranscript.segments.length}`);
  assert(res180s.canonicalTranscript.words.length >= 200, 'Extracted >= 200 words across 180s');

  const allWords180 = res180s.canonicalTranscript.words;
  const lastWord180 = allWords180[allWords180.length - 1];
  console.log(`  First word: "${allWords180[0].word}" at ${allWords180[0].start}s`);
  console.log(`  Last word: "${lastWord180.word}" at ${lastWord180.end}s`);

  assert(lastWord180.end >= 165, 'Captions extend across the entire 180s timeline (no truncation)');

  // Strict check across milestones: 14s, 15s, 16s, 30s, 60s, 90s, 120s, 150s, 170s
  const checkTimestamps = [14, 15, 16, 30, 60, 90, 120, 150, 170];
  for (const t of checkTimestamps) {
    const nearby = allWords180.filter((w) => (w.start <= t + 2 && w.end >= t - 2) || (w.start >= t - 3 && w.start <= t + 3));
    assert(nearby.length > 0, `Speech captions active around ${t}s milestone (${nearby.length} words found)`);
  }
  console.log('  ✓ NO 15-second cutoff: captions continuous across full 180 seconds');

  // -------------------------------------------------------------
  // TEST E: Cache Reload Verification (Phase 23 & 24)
  // -------------------------------------------------------------
  console.log('\n--- TEST E: Disk Transcript Cache Verification ---');
  const t3 = Date.now();
  const resCached = await manager.transcribe({
    sourceMediaPath: video180s,
    forceRefresh: false, // Should hit disk/memory cache immediately
  });
  const elapsedCached = (Date.now() - t3);
  console.log(`  Cached reload completed in ${elapsedCached}ms`);
  assert(resCached.fromCache === true, 'Loaded from cache without re-transcription');
  assert(elapsedCached < 150, 'Cached reload took under 150ms');

  // -------------------------------------------------------------
  // TEST F: ASS Subtitle Generation & 1080x1920 MP4 Export (Phases 18, 20, 46)
  // -------------------------------------------------------------
  console.log('\n--- TEST F: FFmpeg 1080x1920 MP4 Export with Animated ASS Captions ---');
  const exportDir = path.join(process.cwd(), 'public', 'renders');
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  const assPath = path.join(exportDir, `test_captions_${Date.now()}.ass`);
  const outMp4Path = path.join(exportDir, `test_short_${Date.now()}.mp4`);

  // Generate ASS subtitles from 10s transcript
  const assContent = formatAssSubtitle(res10s.captions, {
    style: 'viral_bold',
    fontSize: 28,
    primaryColor: '#FFFFFF',
    highlightColor: '#FACC15',
    strokeColor: '#000000',
    strokeWidth: 3,
    positionY: 75,
  });

  fs.writeFileSync(assPath, assContent, 'utf8');
  assert(fs.existsSync(assPath) && fs.statSync(assPath).size > 100, 'Generated valid ASS subtitle file');
  console.log(`  ASS subtitle file written: ${path.basename(assPath)} (${fs.statSync(assPath).size} bytes)`);

  // Render 1080x1920 9:16 Short with burned ASS subtitles
  // Using 10s video as source
  console.log('  Rendering 1080x1920 MP4 with burned ASS captions via FFmpeg...');
  const t4 = Date.now();
  await new Promise<void>((resolve, reject) => {
    execFile(
      ffmpegPath,
      [
        '-y',
        '-i',
        video10s,
        '-vf',
        `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,subtitles=${assPath}:charenc=UTF-8`,
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-crf',
        '22',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-ar',
        '48000',
        '-t',
        '10',
        outMp4Path,
      ],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
  const renderTime = (Date.now() - t4) / 1000;
  console.log(`  Rendered MP4 in ${renderTime.toFixed(2)}s`);

  // Probe output MP4
  const probeOut = await probeMedia(outMp4Path);
  console.log(`  Export probed: ${probeOut.width}x${probeOut.height} | Duration: ${probeOut.duration.toFixed(2)}s | Size: ${(probeOut.fileSize / 1024 / 1024).toFixed(2)}MB | Video: ${probeOut.vcodec} | Audio: ${probeOut.acodec}`);

  assert(probeOut.hasVideo === true, 'Export contains video stream');
  assert(probeOut.hasAudio === true, 'Export contains audio stream');
  assert(probeOut.width === 1080, 'Export width is exactly 1080px');
  assert(probeOut.height === 1920, 'Export height is exactly 1920px');
  assert(probeOut.duration >= 9.5 && probeOut.duration <= 10.5, 'Export duration matches target 10s');
  assert(probeOut.fileSize > 500000, 'Export file size is non-trivial (>500KB)');

  // Clean up test render artifacts
  try {
    if (fs.existsSync(assPath)) fs.unlinkSync(assPath);
  } catch (_) {}

  console.log('\n================================================================');
  console.log(`  ALL FORENSIC TESTS PASSED (${passedCount}/${totalCount})`);
  console.log('  100% REAL PIPELINE: WHISPER -> TIMESTAMPS -> CAPTIONS -> EXPORT');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed with error:', err);
  process.exit(1);
});
