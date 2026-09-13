/**
 * VIRALCLIP STUDIO — TEST 4: MEDIA QUALITY & FFMPEG RENDERING SUITE
 * Verifies single-pass Lanczos scaling, CRF 16 encoding profile,
 * BT.709 limited color tagging, AAC 48kHz audio, and verifies rendered MP4 with FFprobe.
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import {
  buildQualityProfile,
  buildFFmpegRenderArgs,
} from '../src/utils/videoQuality/ffmpegRenderPipeline';
import { probeSourceMedia } from '../src/utils/videoQuality/sourceQualityAnalyzer';

const ffmpegPath = ffmpegStatic || 'ffmpeg';
const ffprobePath = ffprobeStatic?.path || 'ffprobe';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details: string) {
  results.push({ name, passed: condition, details });
  const status = condition ? '✓ PASS' : '✗ FAIL';
  console.log(`${status} | ${name}: ${details}`);
}

function probeOutput(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    execFile(
      ffprobePath,
      ['-v', 'quiet', '-print_format', 'json', '-show_streams', '-show_format', filePath],
      (err, stdout) => {
        if (err) return reject(err);
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

async function runMediaQualityTests() {
  console.log('================================================================');
  console.log('VIRALCLIP STUDIO — TEST 4: MEDIA QUALITY & FFMPEG RENDERING');
  console.log('================================================================\n');

  // Test source: existing sample video
  const sampleMedia = path.join(process.cwd(), 'public/uploads/yt_jNQXAC9IVRw_1789218491395.mp4');
  assert(fs.existsSync(sampleMedia), 'Sample Source Exists', sampleMedia);

  const sourceInfo = await probeSourceMedia(sampleMedia);
  assert(sourceInfo.sourceWidth > 0, 'Source Probed Successfully', `${sourceInfo.sourceWidth}x${sourceInfo.sourceHeight}`);

  // Test 1: Quality Profile Generation
  const highProfile = buildQualityProfile('HIGH', sourceInfo);
  assert(highProfile.crf <= 18, 'CRF High Quality Setting', `CRF: ${highProfile.crf} (target <= 18)`);
  assert(highProfile.scalingFilter.includes('lanczos'), 'Lanczos Scaling Filter', `Filter: ${highProfile.scalingFilter}`);
  assert(highProfile.colorSpace === 'bt709', 'BT.709 Color Space', `Color space: ${highProfile.colorSpace}`);
  assert(highProfile.audioSampleRate === 48000, 'Audio 48kHz Standard', `Sample rate: ${highProfile.audioSampleRate} Hz`);

  // Test 2: Argument Construction for Single-Stage Pipeline
  const outputDir = path.join(process.cwd(), 'public/exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const testOutputPath = path.join(outputDir, 'test_media_quality_export.mp4');
  if (fs.existsSync(testOutputPath)) {
    fs.unlinkSync(testOutputPath);
  }

  const { args, profile } = buildFFmpegRenderArgs({
    sourcePath: sampleMedia,
    outputPath: testOutputPath,
    sourceInfo,
    startTime: 0,
    duration: 3.0,
    qualityMode: 'HIGH',
    speakerPosition: 'center',
    colorTreatment: 'cinematic_red',
    brollList: [
      {
        path: path.join(process.cwd(), 'public/assets/broll/coding_broll.mp4'),
        start: 1.0,
        duration: 1.5,
        isPIP: false,
        assetType: 'video',
      },
    ],
  });

  const argsString = args.join(' ');
  assert(argsString.includes('flags=lanczos'), 'Lanczos In Filtergraph', 'flags=lanczos present in filter complex');
  assert(argsString.includes('colorspace=bt709') || argsString.includes('color_primaries=bt709') || argsString.includes('setparams=color_primaries=bt709'), 'BT.709 Color Tagging in Filtergraph', 'BT.709 color normalization present');
  assert(argsString.includes('-crf 16') || argsString.includes('-crf 18') || argsString.includes('-crf 15'), 'CRF Flag In Arguments', `CRF profile: ${profile.crf}`);

  // Test 3: Actual FFmpeg Execution
  console.log('Rendering 3-second test clip with Lanczos 9:16 pipeline...');
  await new Promise<void>((resolve, reject) => {
    execFile(ffmpegPath, args, (err, _stdout, stderr) => {
      if (err) {
        console.error('FFmpeg render error:', stderr);
        return reject(err);
      }
      resolve();
    });
  });

  assert(fs.existsSync(testOutputPath), 'Rendered MP4 Exists', `Created: ${testOutputPath}`);
  const outStats = fs.statSync(testOutputPath);
  assert(outStats.size > 10000, 'Non-Trivial MP4 File Size', `${(outStats.size / 1024).toFixed(1)} KB`);

  // Test 4: Post-Render FFprobe Inspection
  const outProbe = await probeOutput(testOutputPath);
  const outVStream = outProbe.streams?.find((s: any) => s.codec_type === 'video');
  const outAStream = outProbe.streams?.find((s: any) => s.codec_type === 'audio');

  assert(
    outVStream && outVStream.width === 1080 && outVStream.height === 1920,
    'Rendered Video Dimensions 1080x1920',
    `Resolution: ${outVStream?.width}x${outVStream?.height}`
  );
  assert(
    outVStream && outVStream.codec_name === 'h264',
    'H.264 Video Codec',
    `Codec: ${outVStream?.codec_name}`
  );
  assert(
    outAStream && (outAStream.sample_rate === '48000' || outAStream.sample_rate === 48000),
    'Audio 48000 Hz Sample Rate',
    `Sample rate: ${outAStream?.sample_rate} Hz`
  );

  // Summary
  const allPassed = results.every((r) => r.passed);
  console.log('\n================================================================');
  console.log(`TEST 4 RESULT: ${allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'}`);
  console.log(`Passed: ${results.filter((r) => r.passed).length} / ${results.length}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runMediaQualityTests().catch((err) => {
  console.error('Media quality test failure:', err);
  process.exit(1);
});
