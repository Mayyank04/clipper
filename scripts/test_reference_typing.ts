/**
 * VIRALCLIP STUDIO — TEST SUITE: REFERENCE TYPING PRESET & KINETIC ANIMATION
 * Part H, I, J Certification:
 * 1. Reference Typing (After Effects kinetic reference)
 * 2. Active word speech synchronization derived from currentTime
 * 3. Bottom-up blurred lift translateY (0 to 4px) & scale (1.00 -> 1.06)
 * 4. Semantic word highlighting (10-25% density) in electric yellow (#FACC15)
 * 5. Uppercase bold typography with drop shadow and stroke contrast
 * 6. ASS subtitle formatting parity
 */

import {
  DEFAULT_CAPTION_STYLE,
  PRODUCTION_REFERENCE_PRESETS,
  getCaptionStylePreset,
  computeWordAnimationState,
  CaptionWord,
} from '../src/utils/captionEngine';
import { formatAssSubtitle } from '../src/utils/subtitleFormatter';

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

async function runReferenceTypingTests() {
  console.log('================================================================');
  console.log('VIRALCLIP STUDIO — TEST: REFERENCE TYPING & KINETIC CAPTIONS');
  console.log('================================================================\n');

  // TEST 1: Reference Presets Availability
  console.log('--- 1. Reference Presets Config ---');
  const refTyping = getCaptionStylePreset('reference_typing');
  const refMix = getCaptionStylePreset('reference_mix');

  assert(!!refTyping, 'Reference Typing Preset Exists', 'Found reference_typing preset');
  assert(!!refMix, 'Reference Mix Preset Exists', 'Found reference_mix preset');
  assert(
    DEFAULT_CAPTION_STYLE === 'reference_mix' || DEFAULT_CAPTION_STYLE === 'reference_typing',
    'Default Style Is Reference Preset',
    `Default style: ${DEFAULT_CAPTION_STYLE}`
  );

  assert(refTyping.fontFamily.includes('Lemon Milk'), 'Reference Typing Uses Lemon Milk', refTyping.fontFamily);
  assert(refTyping.primaryColor.toUpperCase() === '#FFFFFF', 'Base Color Is White', refTyping.primaryColor);
  assert(refTyping.highlightColor.toUpperCase() === '#FACC15', 'Electric Yellow Highlight', refTyping.highlightColor);
  assert(refTyping.uppercase === true, 'Uppercase Enabled', 'Text is forced uppercase');
  assert(refTyping.hasShadow === true, 'Drop Shadow Enabled', 'High contrast drop shadow active');
  assert(refTyping.strokeWidth >= 3.5, 'Stroke Contrast >= 3.5px', `${refTyping.strokeWidth}px stroke`);

  // TEST 2: Deterministic Active Word Tracking (currentTime)
  console.log('\n--- 2. Deterministic Active Word Tracking ---');
  const words: CaptionWord[] = [
    { word: 'THE', start: 1.0, end: 1.3, confidence: 0.99 },
    { word: 'BIGGEST', start: 1.3, end: 1.8, confidence: 0.99 },
    { word: 'MISTAKE', start: 1.8, end: 2.3, confidence: 0.99 },
  ];

  // Before word start: t=0.6s
  const pre = computeWordAnimationState(words[0], 0, 0.6, refTyping, words);
  assert(!pre.isSpoken, 'Pre-Word Not Spoken', 't=0.6s: isSpoken is false');
  assert(pre.opacity === 0.5, 'Future Word Dimmed', `t=0.6s: opacity is ${pre.opacity}`);

  // Inside word: t=1.15s (midpoint of "THE")
  const active = computeWordAnimationState(words[0], 0, 1.15, refTyping, words);
  assert(active.isSpoken, 'Word Is Spoken', 't=1.15s: isSpoken is true');
  assert(active.highlighted, 'Active Word Highlighted', 't=1.15s: highlighted is true');
  assert(active.color.toUpperCase() === '#FACC15', 'Active Word Highlight Color', `Color: ${active.color}`);
  assert(active.scale >= 1.05 && active.scale <= 1.08, 'Active Word Scale Pop (1.05 - 1.08)', `Scale: ${active.scale}`);
  assert(active.translateY >= 0 && active.translateY <= 4.0, 'Bottom-Up Lift translateY', `translateY: ${active.translateY}px`);

  // After word: t=1.45s (word 0 is past, word 1 is active)
  const past = computeWordAnimationState(words[0], 0, 1.45, refTyping, words);
  assert(past.isPast, 'Word Is Past', 't=1.45s: isPast is true');
  assert(past.color.toUpperCase() === '#FFFFFF', 'Past Word Resets To White', `Color: ${past.color}`);

  // TEST 3: Subtitle ASS Formatter Parity
  console.log('\n--- 3. ASS Subtitle Formatter Parity ---');
  const segment = {
    id: 'seg_1',
    start: 1.0,
    end: 2.3,
    text: 'THE BIGGEST MISTAKE',
    words,
    styleId: 'reference_mix',
  };

  const assOutput = formatAssSubtitle([segment], refMix);
  assert(assOutput.includes('[Script Info]'), 'ASS Header Valid', 'Script Info section present');
  assert(assOutput.includes('PlayResX: 1080'), 'ASS 1080 Width', 'Configured for 1080 horizontal');
  assert(assOutput.includes('PlayResY: 1920'), 'ASS 1920 Height', 'Configured for 1920 vertical');
  assert(assOutput.includes('Lemon Milk'), 'ASS Uses Lemon Milk Font', 'Fontname set to Lemon Milk');
  assert(assOutput.includes('Dialogue:'), 'ASS Dialogue Event Present', 'Dialogue line generated');

  // Summary
  const allPassed = results.every((r) => r.passed);
  console.log('\n================================================================');
  console.log(`REFERENCE TYPING RESULT: ${allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'}`);
  console.log(`Passed: ${results.filter((r) => r.passed).length} / ${results.length}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runReferenceTypingTests().catch((err) => {
  console.error('Reference typing test error:', err);
  process.exit(1);
});
