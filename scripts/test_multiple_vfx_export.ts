import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { buildFFmpegRenderArgs } from '../src/utils/videoQuality/ffmpegRenderPipeline';

async function testMultipleVfxExport() {
  console.log('=== FORENSIC TEST: MULTIPLE INDEPENDENT VFX EVENTS IN RENDERPLAN & EXPORT ===');

  const vfxList = [
    { timestamp: 5.0, duration: 1.0, type: 'glow' },
    { timestamp: 10.0, duration: 1.2, type: 'glitch' },
    { timestamp: 20.0, duration: 0.8, type: 'shake' },
  ];

  const sourceInfo = {
    duration: 30,
    sourceWidth: 1080,
    sourceHeight: 1920,
    sourceFPS: 30,
    sourceVideoCodec: 'h264',
    sourceAudioCodec: 'aac',
    aspectRatio: '9:16',
    estimatedBitrateMbps: 8,
  };

  const { args } = buildFFmpegRenderArgs({
    sourcePath: path.resolve('public/demo/test_180s.mp4'),
    outputPath: path.resolve('public/exports/test_vfx_multi_export.mp4'),
    sourceInfo: sourceInfo as any,
    startTime: 0,
    duration: 25,
    vfxList,
  });

  const filtergraphIndex = args.indexOf('-filter_complex');
  assert(filtergraphIndex !== -1, 'filter_complex argument must be present');
  const filtergraph = args[filtergraphIndex + 1];

  console.log('\n--- Inspecting Filtergraph for Independent VFX Events ---');

  // Check VFX 1 at 5s (glow)
  const hasGlow = filtergraph.includes("between(t,5,6)") && filtergraph.includes("brightness=0.15");
  console.log(`VFX 1 at 5s (glow): ${hasGlow ? '✓ FOUND' : '✗ MISSING'}`);
  assert(hasGlow, 'VFX event at 5s (glow) must be present in filtergraph');

  // Check VFX 2 at 10s (glitch)
  const hasGlitch = filtergraph.includes("between(t,10,11.2)") && filtergraph.includes("hue=h=90*sin");
  console.log(`VFX 2 at 10s (glitch): ${hasGlitch ? '✓ FOUND' : '✗ MISSING'}`);
  assert(hasGlitch, 'VFX event at 10s (glitch) must be present in filtergraph');

  // Check VFX 3 at 20s (shake)
  const hasShake = filtergraph.includes("between(t,20,20.8)") && filtergraph.includes("eq=contrast=1.2");
  console.log(`VFX 3 at 20s (shake): ${hasShake ? '✓ FOUND' : '✗ MISSING'}`);
  assert(hasShake, 'VFX event at 20s (shake) must be present in filtergraph');

  // Verify all 3 pads chain sequentially
  assert(filtergraph.includes('[vvfx_0]'), 'First VFX pad vvfx_0 must exist');
  assert(filtergraph.includes('[vvfx_1]'), 'Second VFX pad vvfx_1 must exist');
  assert(filtergraph.includes('[vvfx_2]'), 'Third VFX pad vvfx_2 must exist');

  console.log('\n✓ ALL 3 INDEPENDENT VFX EVENTS (5s, 10s, 20s) SUCCESSFULLY VERIFIED IN EXPORT FILTERGRAPH!');
}

testMultipleVfxExport().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
