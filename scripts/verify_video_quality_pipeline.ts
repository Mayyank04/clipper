/**
 * VIRALCLIP STUDIO — VIDEO QUALITY & 9:16 RENDERING PIPELINE VERIFICATION
 * Automated forensic verification of FFprobe source inspection, sourceQualityScore,
 * single-stage Lanczos scaling, BT.709 color management, CRF encoding, and frame sharpness.
 */

import fs from 'fs';
import path from 'path';
import { execFile, execSync } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { probeSourceMedia, calculateSourceQualityScore, computeFrameSharpness } from '../src/utils/videoQuality/sourceQualityAnalyzer';
import { generateSmartCropPlan, getCropRectAtTime } from '../src/utils/videoQuality/smartCropEngine';
import { buildQualityProfile, buildFFmpegRenderArgs } from '../src/utils/videoQuality/ffmpegRenderPipeline';

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

async function runVerification() {
  console.log('================================================================');
  console.log('VIRALCLIP STUDIO — VIDEO QUALITY & 9:16 RENDERING OVERHAUL QA');
  console.log('================================================================\n');

  // Test Media 1: Low-res source (320x240 "Me at the zoo")
  const lowResMedia = path.join(process.cwd(), 'public/uploads/yt_jNQXAC9IVRw_1789218491395.mp4');
  if (!fs.existsSync(lowResMedia)) {
    throw new Error(`Test media not found at: ${lowResMedia}`);
  }

  // 1. Probing source media metadata via FFprobe
  const sourceInfo = await probeSourceMedia(lowResMedia);
  assert(
    sourceInfo.sourceWidth === 320 && sourceInfo.sourceHeight === 240,
    'FFprobe Resolution Detection',
    `Detected ${sourceInfo.sourceWidth}×${sourceInfo.sourceHeight} (expected 320×240)`
  );
  assert(
    sourceInfo.sourceFPS === 15,
    'FFprobe FPS Detection',
    `Detected ${sourceInfo.sourceFPS} FPS (expected 15)`
  );
  assert(
    sourceInfo.sourceCodec === 'h264',
    'FFprobe Codec Detection',
    `Detected ${sourceInfo.sourceCodec} (expected h264)`
  );
  assert(
    sourceInfo.sourceColorRange === 'tv',
    'FFprobe Color Range Detection',
    `Detected range: ${sourceInfo.sourceColorRange}`
  );

  // 2. Source Quality Scoring
  const sourceScore = calculateSourceQualityScore(sourceInfo);
  assert(
    sourceScore.isLowResolution === true,
    'Source Quality Low-Res Flag',
    `isLowResolution = ${sourceScore.isLowResolution} (rating: ${sourceScore.rating})`
  );
  assert(
    typeof sourceScore.warningMessage === 'string' && sourceScore.warningMessage.includes('320×240'),
    'Honest Source Quality Warning',
    `Warning: "${sourceScore.warningMessage}"`
  );

  // 3. Smart 9:16 Subject-Aware CropPlan
  const cropPlan = generateSmartCropPlan({
    sourceWidth: sourceInfo.sourceWidth,
    sourceHeight: sourceInfo.sourceHeight,
    duration: 18,
    speakerPosition: 'center',
    smoothingWindowSeconds: 0.5,
  });
  assert(
    cropPlan.points.length > 0,
    'Smart CropPlan Points Generated',
    `Generated ${cropPlan.points.length} crop trajectory keyframes`
  );
  const midPoint = getCropRectAtTime(cropPlan, 9);
  const expectedCropWidth = Math.round((240 * 9) / 16); // 135
  assert(
    midPoint.width === expectedCropWidth && midPoint.height === 240,
    '9:16 Aspect Ratio Crop Dimensions',
    `Crop rect: ${midPoint.width}×${midPoint.height} (Aspect ratio: ${(midPoint.width / midPoint.height).toFixed(3)})`
  );
  assert(
    midPoint.x >= 0 && midPoint.x + midPoint.width <= sourceInfo.sourceWidth,
    'Crop Rect Clamping',
    `x=${midPoint.x}, right=${midPoint.x + midPoint.width} (within width ${sourceInfo.sourceWidth})`
  );

  // 4. Quality Profiles & CRF Configuration
  const highProfile = buildQualityProfile('HIGH', sourceInfo);
  assert(
    highProfile.crf === 16 && highProfile.encoderPreset === 'slow',
    'HIGH Mode Profile',
    `CRF=${highProfile.crf}, Preset=${highProfile.encoderPreset}`
  );
  const masterProfile = buildQualityProfile('MASTER', sourceInfo);
  assert(
    masterProfile.crf === 14 && masterProfile.encoderPreset === 'slower',
    'MASTER Mode Profile',
    `CRF=${masterProfile.crf}, Preset=${masterProfile.encoderPreset}`
  );
  assert(
    highProfile.scalingFilter.includes('lanczos'),
    'Lanczos Scaler Configured',
    `Filter flags: ${highProfile.scalingFilter}`
  );
  assert(
    highProfile.colorPrimaries === 'bt709' && highProfile.colorRange === 'tv',
    'BT.709 Color Management',
    `Primaries=${highProfile.colorPrimaries}, Matrix=${highProfile.colorSpace}, Range=${highProfile.colorRange}`
  );

  // 5. Test Real 1080x1920 Export with Lanczos & BT.709 Color Tags
  const testExportPath = path.join(process.cwd(), 'public/exports/test_video_quality_lanczos_18s.mp4');
  if (fs.existsSync(testExportPath)) fs.unlinkSync(testExportPath);

  // Temporary ASS file with active word highlighting
  const tempAss = path.join(process.cwd(), 'public/exports/temp_test_quality.ass');
  fs.writeFileSync(
    tempAss,
    `[Script Info]
Title: Quality Test
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,62,&H00FFFFFF,&H0015CCFA,&H00000000,&HA0000000,-1,0,0,0,100,100,0,0,1,4,3,2,40,40,280,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.50,0:00:03.00,Default,,0,0,0,,{\\c&H0015CCFA&\\b1}ELEPHANTS{\\c&H00FFFFFF&\\b0} ARE REALLY COOL
Dialogue: 0,0:00:03.00,0:00:06.00,Default,,0,0,0,,THEY HAVE {\\c&H0015CCFA&\\b1}REALLY LONG{\\c&H00FFFFFF&\\b0} TRUNKS
`,
    'utf8'
  );

  const { args: renderArgs } = buildFFmpegRenderArgs({
    sourcePath: lowResMedia,
    outputPath: testExportPath,
    sourceInfo,
    startTime: 0,
    duration: 18,
    qualityMode: 'HIGH',
    speakerPosition: 'center',
    subtitlePath: tempAss,
    watermarkText: '@ViralMaster',
    watermarkOpacity: 75,
  });

  console.log('\n[FFmpeg] Executing real 1080x1920 Lanczos render test...');
  await new Promise<void>((resolve, reject) => {
    execFile(ffmpegPath, renderArgs, (err, _stdout, stderr) => {
      if (err) {
        console.error('Render error:', stderr);
        return reject(err);
      }
      resolve();
    });
  });

  try { fs.unlinkSync(tempAss); } catch (_) {}

  assert(
    fs.existsSync(testExportPath) && fs.statSync(testExportPath).size > 0,
    'Exported Video Created',
    `File size: ${(fs.statSync(testExportPath).size / (1024 * 1024)).toFixed(2)} MB`
  );

  // 6. Inspect Exported Video via FFprobe
  const exportInfo = await probeSourceMedia(testExportPath);
  assert(
    exportInfo.sourceWidth === 1080 && exportInfo.sourceHeight === 1920,
    'Export Resolution 1080x1920',
    `Exported: ${exportInfo.sourceWidth}×${exportInfo.sourceHeight}`
  );
  assert(
    exportInfo.sourceColorSpace.includes('709') || exportInfo.sourceColorPrimaries.includes('709'),
    'BT.709 Color Tagged Output',
    `Export color space: ${exportInfo.sourceColorSpace}, primaries: ${exportInfo.sourceColorPrimaries}`
  );
  assert(
    exportInfo.sourceAudioSampleRate === 48000,
    'Audio Sample Rate 48kHz',
    `Audio sample rate: ${exportInfo.sourceAudioSampleRate} Hz`
  );

  // 7. Extract Frames at 10%, 50%, 90% and compute Sharpness
  const qaDir = path.join(process.cwd(), 'public/exports/qa_quality_frames');
  if (!fs.existsSync(qaDir)) fs.mkdirSync(qaDir, { recursive: true });

  const f10 = path.join(qaDir, 'frame_10.png');
  const f50 = path.join(qaDir, 'frame_50.png');
  const f90 = path.join(qaDir, 'frame_90.png');

  execSync(`${ffmpegPath} -y -ss 1.8 -i ${testExportPath} -vframes 1 ${f10}`);
  execSync(`${ffmpegPath} -y -ss 9.0 -i ${testExportPath} -vframes 1 ${f50}`);
  execSync(`${ffmpegPath} -y -ss 16.2 -i ${testExportPath} -vframes 1 ${f90}`);

  assert(
    fs.existsSync(f10) && fs.existsSync(f50) && fs.existsSync(f90),
    'QA Frames Extracted',
    'Extracted frames at 10%, 50%, 90%'
  );

  const sharpnessSource = await computeFrameSharpness(lowResMedia, 9.0);
  const sharpnessOutput = await computeFrameSharpness(testExportPath, 9.0);
  const degradation = Number((((sharpnessSource - sharpnessOutput) / sharpnessSource) * 100).toFixed(1));

  assert(
    sharpnessOutput > 50,
    'Output Frame Sharpness',
    `Source sharpness: ${sharpnessSource.toFixed(1)}, Output sharpness: ${sharpnessOutput.toFixed(1)} (Degradation: ${degradation}%)`
  );

  console.log('\n================================================================');
  console.log('QUALITY QA SUMMARY');
  console.log('================================================================');
  const allPassed = results.every((r) => r.passed);
  console.log(`TOTAL CHECKS: ${results.length} | PASSED: ${results.filter((r) => r.passed).length} | FAILED: ${results.filter((r) => !r.passed).length}`);
  console.log(`OVERALL STATUS: ${allPassed ? 'PRODUCTION READY' : 'FAILURES DETECTED'}\n`);

  if (!allPassed) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal error during quality verification:', err);
  process.exit(1);
});
