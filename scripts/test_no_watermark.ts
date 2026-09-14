/**
 * VIRALCLIP STUDIO — TEST SUITE: ZERO APP WATERMARK VERIFICATION
 * Part AN & AO Certification:
 * 1. Default Brand Kit MUST be disabled (enabled: false)
 * 2. Brand Name and Watermark text MUST be empty by default
 * 3. FFmpeg render command MUST NOT contain drawtext watermark filter
 * 4. Zero occurrences of "Viral Master", "ViralMaster", "ViralClip", "Powered by" in rendered video
 */

import fs from 'fs';
import path from 'path';
import { DEFAULT_BRAND_KIT } from '../src/utils/storage';
import { buildFFmpegRenderArgs } from '../src/utils/videoQuality/ffmpegRenderPipeline';

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

async function runNoWatermarkTests() {
  console.log('================================================================');
  console.log('VIRALCLIP STUDIO — TEST: ZERO APP WATERMARK AUDIT (PART AN & AO)');
  console.log('================================================================\n');

  // TEST 1: Default Brand Kit Configuration
  console.log('--- 1. Default Brand Kit Configuration ---');
  assert(DEFAULT_BRAND_KIT.enabled === false, 'Default Brand Kit Disabled', 'DEFAULT_BRAND_KIT.enabled === false');
  assert(DEFAULT_BRAND_KIT.brandName === '', 'Default Brand Name Empty', `brandName is "${DEFAULT_BRAND_KIT.brandName}"`);
  assert(DEFAULT_BRAND_KIT.watermarkText === '', 'Default Watermark Text Empty', `watermarkText is "${DEFAULT_BRAND_KIT.watermarkText}"`);

  // TEST 2: Codebase Source Guard Audit
  console.log('\n--- 2. Codebase Source Guard Audit ---');
  const storagePath = path.join(process.cwd(), 'src/utils/storage.ts');
  const storageContent = fs.readFileSync(storagePath, 'utf8');
  assert(!storageContent.includes("@ViralMaster"), 'storage.ts Clean of Default Branding', 'No @ViralMaster default string found');

  const exportModalPath = path.join(process.cwd(), 'src/components/ExportModal.tsx');
  const exportModalContent = fs.readFileSync(exportModalPath, 'utf8');
  assert(exportModalContent.includes('enabled: false'), 'ExportModal Defaults Watermark Off', 'Brand kit initialized with enabled: false');

  // TEST 3: FFmpeg Filtergraph Watermark Audit
  console.log('\n--- 3. FFmpeg Filtergraph Watermark Audit ---');
  const dummySourceInfo = {
    sourceWidth: 1280,
    sourceHeight: 720,
    sourceFPS: 30,
    sourceCodec: 'h264',
    sourceBitrate: 2000000,
    sourceVideoBitrate: 1800000,
    sourcePixelFormat: 'yuv420p',
    sourceColorSpace: 'bt709',
    sourceColorTransfer: 'bt709',
    sourceColorPrimaries: 'bt709',
    sourceColorRange: 'tv',
    sourceDuration: 10,
    sourceAudioCodec: 'aac',
    sourceAudioBitrate: 128000,
    sourceAudioSampleRate: 48000,
    sourceSharpnessScore: 85,
  };

  const { args } = buildFFmpegRenderArgs({
    sourcePath: '/dummy/test.mp4',
    outputPath: '/dummy/out.mp4',
    sourceInfo: dummySourceInfo,
    startTime: 0,
    duration: 10,
    watermarkText: undefined, // Default creator state
  });

  const fullCommand = args.join(' ');
  assert(!fullCommand.includes('drawtext'), 'No drawtext Filter by Default', 'Filtergraph has no drawtext filter');
  assert(!fullCommand.toLowerCase().includes('viralclip'), 'No ViralClip Text In Render', 'Filtergraph contains no viralclip text');
  assert(!fullCommand.toLowerCase().includes('viral master'), 'No Viral Master Text In Render', 'Filtergraph contains no viral master text');
  assert(!fullCommand.toLowerCase().includes('powered by'), 'No Powered by Text In Render', 'Filtergraph contains no powered by text');

  // Summary
  const allPassed = results.every((r) => r.passed);
  console.log('\n================================================================');
  console.log(`ZERO WATERMARK RESULT: ${allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'}`);
  console.log(`Passed: ${results.filter((r) => r.passed).length} / ${results.length}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runNoWatermarkTests().catch((err) => {
  console.error('No watermark test error:', err);
  process.exit(1);
});
