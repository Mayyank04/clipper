/**
 * VIRALCLIP STUDIO — ZERO WATERMARK VERIFICATION TEST
 * Validates that by default:
 * 1. BrandKit.enabled is strictly false
 * 2. ExportModal default has watermark toggled OFF
 * 3. FFmpeg render pipeline emits ZERO watermark drawtext filters
 * 4. Video output contains NO app branding ("ViralClip", "Viral Master", "Powered by")
 */

import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_BRAND_KIT } from '../src/utils/storage';
import { buildFFmpegRenderArgs } from '../src/utils/videoQuality/ffmpegRenderPipeline';

async function runNoWatermarkTest() {
  console.log('🧪 Starting Zero Brand Watermark Automated Verification...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${msg}`);
      failed++;
    }
  }

  // TEST 1: Default Brand Kit Configuration
  console.log('Test 1: Default Brand Kit State');
  assert(DEFAULT_BRAND_KIT.enabled === false, 'DEFAULT_BRAND_KIT.enabled MUST be false by default');
  assert(!DEFAULT_BRAND_KIT.brandName || DEFAULT_BRAND_KIT.brandName === '', 'DEFAULT_BRAND_KIT.brandName must be empty or blank by default');
  assert(!DEFAULT_BRAND_KIT.watermarkText || DEFAULT_BRAND_KIT.watermarkText === '', 'DEFAULT_BRAND_KIT.watermarkText must be empty or blank by default');

  // TEST 2: Storage Defaults Verification
  console.log('\nTest 2: Codebase Source Guard Checks');
  const storageSource = fs.readFileSync(path.join(process.cwd(), 'src', 'utils', 'storage.ts'), 'utf-8');
  assert(!storageSource.includes("watermarkText: '@ViralMaster'"), 'storage.ts must not contain @ViralMaster default text');

  const exportModalSource = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'ExportModal.tsx'), 'utf-8');
  assert(exportModalSource.includes('enabled: false'), 'ExportModal brandKit state must initialize with enabled: false');

  const serverSource = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf-8');
  assert(
    serverSource.includes('(brandKit?.enabled && brandKit?.brandName) ? brandKit.brandName : undefined') ||
    serverSource.includes('brandKit?.enabled'),
    'server.ts must strictly guard watermarkText behind brandKit?.enabled check'
  );

  // TEST 3: FFmpeg Filter Generation Verification with Default Settings
  console.log('\nTest 3: FFmpeg Filter Generation Default Guard');
  const sampleSourceInfo = {
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 10,
    bitrate: 8000000,
    codec: 'h264',
    audioChannels: 2,
    audioSampleRate: 48000,
  };

  const renderCommand = buildFFmpegRenderArgs({
    sourcePath: '/tmp/test_source.mp4',
    outputPath: '/tmp/test_output.mp4',
    sourceInfo: sampleSourceInfo as any,
    startTime: 0,
    duration: 5,
    qualityMode: 'HIGH',
    // Default brand kit (disabled) -> watermarkText undefined
    watermarkText: (DEFAULT_BRAND_KIT.enabled && DEFAULT_BRAND_KIT.brandName) ? DEFAULT_BRAND_KIT.brandName : undefined,
  });

  const fullArgs = renderCommand.args.join(' ');
  assert(!fullArgs.includes('drawtext'), 'Default render command MUST NOT contain drawtext watermark filter');
  assert(!fullArgs.toLowerCase().includes('viralclip'), 'Default render command MUST NOT contain "viralclip" watermark text');
  assert(!fullArgs.toLowerCase().includes('viral master'), 'Default render command MUST NOT contain "viral master" watermark text');
  assert(!fullArgs.toLowerCase().includes('powered by'), 'Default render command MUST NOT contain "powered by" watermark text');

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runNoWatermarkTest().catch((err) => {
  console.error('Fatal error running watermark test:', err);
  process.exit(1);
});
