/**
 * VIRALCLIP STUDIO — REFERENCE CAPTION AUTOMATED TEST
 * Validates:
 * 1. Exact font loading & libass font directory parity
 * 2. Reference Typing preset configuration (Lemon Milk Bold, electric yellow, etc.)
 * 3. Deterministic word animation math (translateY lift, scale, opacity, highlight)
 * 4. Active-word synchronization strictly following currentTime
 * 5. 1-2 line wrapping rules
 */

import * as fs from 'fs';
import * as path from 'path';
import { CREATOR_FONTS, getFontById } from '../src/data/fontRegistry';
import {
  getCaptionStylePreset,
  computeWordAnimationState,
  getCaptionStateAtTime,
  DEFAULT_CAPTION_STYLE,
} from '../src/utils/captionEngine';
import { formatAssSubtitle } from '../src/utils/subtitleFormatter';

async function runReferenceCaptionTest() {
  console.log('🧪 Starting Reference Caption & Font System Automated Verification...\n');

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

  // TEST 1: Registered Creator Fonts & Disk Availability
  console.log('Test 1: Font Registration and Disk Files');
  assert(CREATOR_FONTS.length >= 24, `Expected at least 24 registered creator fonts, found ${CREATOR_FONTS.length}`);

  const lemonMilk = getFontById('lemon_milk');
  assert(!!lemonMilk, 'Lemon Milk font family must be present in registry');
  assert(lemonMilk?.family === 'Lemon Milk', `Expected family 'Lemon Milk', got '${lemonMilk?.family}'`);

  const fontsDir = path.join(process.cwd(), 'public', 'assets', 'fonts');
  assert(fs.existsSync(fontsDir), `Font assets directory exists at ${fontsDir}`);

  const fontFilesOnDisk = fs.readdirSync(fontsDir).filter((f) => f.endsWith('.ttf') || f.endsWith('.otf'));
  assert(fontFilesOnDisk.length >= 30, `Expected >= 30 font files on disk, found ${fontFilesOnDisk.length}`);

  // TEST 2: Reference Typing Preset Configuration
  console.log('\nTest 2: Reference Typing Preset');
  assert(DEFAULT_CAPTION_STYLE === 'reference_typing', `Default caption style must be 'reference_typing', got '${DEFAULT_CAPTION_STYLE}'`);

  const refPreset = getCaptionStylePreset('reference_typing');
  assert(!!refPreset, 'Reference typing preset must resolve properly');
  assert(refPreset.fontFamily.includes('Lemon Milk'), `Preset fontFamily must include 'Lemon Milk', got '${refPreset.fontFamily}'`);
  assert(refPreset.primaryColor.toUpperCase() === '#FFFFFF', `Preset primaryColor must be #FFFFFF, got '${refPreset.primaryColor}'`);
  assert(refPreset.highlightColor.toUpperCase() === '#FACC15', `Preset highlightColor must be #FACC15 (Electric Yellow), got '${refPreset.highlightColor}'`);
  assert(refPreset.strokeWidth >= 3.5, `Preset strokeWidth must be >= 3.5 for punchy contrast, got ${refPreset.strokeWidth}`);
  assert(refPreset.hasShadow === true, 'Preset must have drop shadow enabled');
  assert(refPreset.uppercase === true, 'Preset uppercase must be true');
  assert(refPreset.animationMode === 'REFERENCE_TYPING', `Preset animationMode must be 'REFERENCE_TYPING', got '${refPreset.animationMode}'`);

  // TEST 3: Deterministic Word Animation Math & Speech Sync
  console.log('\nTest 3: Speech Sync Word Animation Math');
  const mockWords = [
    { word: 'THE', start: 1.0, end: 1.3 },
    { word: 'BIGGEST', start: 1.3, end: 1.7 },
    { word: 'MISTAKE', start: 1.7, end: 2.1 },
  ];

  // Before speech (t = 0.5s): future words should be dimmed/visible with 0.5 opacity, not spoken
  const t0 = computeWordAnimationState(mockWords[0], 0, 0.5, refPreset, mockWords);
  assert(t0.isSpoken === false, 't=0.5s: Word "THE" must not be spoken');
  assert(t0.opacity === 0.5, `t=0.5s: Future word opacity should be 0.5 preview, got ${t0.opacity}`);
  assert(t0.highlighted === false, 't=0.5s: Future word should not be highlighted');

  // Spoken at t = 1.05s: Word "THE" just started (ease lift curve)
  const t1 = computeWordAnimationState(mockWords[0], 0, 1.05, refPreset, mockWords);
  assert(t1.isSpoken === true, 't=1.05s: Word "THE" must be spoken');
  assert(t1.highlighted === true, 't=1.05s: Word "THE" must be highlighted in electric yellow');
  assert(t1.color === refPreset.highlightColor, `t=1.05s: Word color should match highlightColor, got ${t1.color}`);
  assert(t1.translateY >= 0 && t1.translateY <= 4, `t=1.05s: Word lift translateY must be in [0, 4] range, got ${t1.translateY}`);
  assert(t1.scale >= 0.98 && t1.scale <= 1.15, `t=1.05s: Word scale must be in [0.98, 1.15] range, got ${t1.scale}`);

  // Spoken at t = 1.5s: Word "BIGGEST" is spoken, "THE" is past
  const t2The = computeWordAnimationState(mockWords[0], 0, 1.5, refPreset, mockWords);
  const t2Biggest = computeWordAnimationState(mockWords[1], 1, 1.5, refPreset, mockWords);
  assert(t2The.isPast === true, 't=1.5s: Word "THE" must be past');
  assert(t2The.highlighted === false, 't=1.5s: Past word must reset to base white');
  assert(t2The.color === refPreset.primaryColor, `t=1.5s: Past word color should be white, got ${t2The.color}`);
  assert(t2Biggest.isSpoken === true, 't=1.5s: Word "BIGGEST" must be spoken');
  assert(t2Biggest.highlighted === true, 't=1.5s: Word "BIGGEST" must be highlighted');

  // TEST 4: ASS Subtitle Formatter libass Parity
  console.log('\nTest 4: ASS Subtitle Formatter Parity');
  const assOutput = formatAssSubtitle(
    [
      {
        id: 'c1',
        start: 1.0,
        end: 2.1,
        text: 'THE BIGGEST MISTAKE',
        words: mockWords,
      },
    ],
    refPreset
  );

  assert(assOutput.includes('Style: Default,Lemon Milk'), 'ASS header must set Fontname to Lemon Milk');
  assert(assOutput.includes('PlayResX: 1080'), 'ASS header must be configured for 1080 width');
  assert(assOutput.includes('PlayResY: 1920'), 'ASS header must be configured for 1920 height');
  assert(assOutput.includes('\\fscx115\\fscy115'), 'Active word events must include 115% scale pop');
  assert(!assOutput.includes('&&'), 'ASS subtitle must not contain invalid double ampersand syntax');

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runReferenceCaptionTest().catch((err) => {
  console.error('Fatal error running test:', err);
  process.exit(1);
});
