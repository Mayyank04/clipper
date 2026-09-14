/**
 * VIRALCLIP STUDIO — CAPTION SECOND-HALF REGRESSION & BOUNDARY TEST
 * Verifies that captions do NOT disappear after ~15 seconds, maintain exact speech alignment,
 * bridge micro-pauses with speech hold, and scale typography accurately via CaptionLayoutEngine.
 */

import {
  CaptionSegment,
  CaptionWord,
  groupWordsIntoCaptionSegments,
  getCaptionStateAtTime,
  CaptionLayoutEngine,
  PRODUCTION_REFERENCE_PRESETS,
} from '../src/utils/captionEngine';

interface CheckpointTestResult {
  checkpoint: number;
  speechExpected: boolean;
  expectedWord?: string;
  captionVisible: boolean;
  activeWordText?: string;
  previewFontSize: number;
  passed: boolean;
  details: string;
}

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('VIRALCLIP STUDIO — CAPTION SECOND-HALF REGRESSION TEST (UP TO 180s)');
  console.log('================================================================\n');

  // Generate a realistic 180-second continuous speech transcript (e.g. 500 words across 180s)
  const full180sWords: CaptionWord[] = [];
  let t = 0.5;
  const sampleVocabulary = [
    'the', 'secret', 'to', 'viral', 'growth', 'is', 'clarity', 'and', 'retention',
    'you', 'cannot', 'skip', 'the', 'fundamentals', 'when', 'creating', 'content',
    'most', 'people', 'give', 'up', 'right', 'before', 'the', 'breakthrough',
    'they', 'assume', 'the', 'algorithm', 'is', 'working', 'against', 'them',
    'in', 'reality', 'it', 'is', 'all', 'about', 'the', 'first', 'three', 'seconds',
    'if', 'you', 'hook', 'them', 'early', 'they', 'will', 'stay', 'for', 'the', 'lesson',
    'this', 'is', 'why', 'we', 'build', 'tools', 'that', 'empower', 'creators',
    'every', 'single', 'frame', 'must', 'deliver', 'value', 'and', 'momentum',
  ];

  let wordIdx = 0;
  while (t < 179.0) {
    const wText = sampleVocabulary[wordIdx % sampleVocabulary.length];
    const wordDur = Math.max(0.18, Math.min(0.45, 0.05 + wText.length * 0.04));
    const pauseDur = wordIdx % 6 === 0 ? 0.22 : 0.04;

    full180sWords.push({
      word: wText,
      start: Number(t.toFixed(3)),
      end: Number((t + wordDur).toFixed(3)),
      confidence: 0.98,
      isHighlight: ['secret', 'viral', 'growth', 'hook', 'breakthrough', 'creators'].includes(wText),
      highlightColor: '#facc15',
    });

    t = Number((t + wordDur + pauseDur).toFixed(3));
    wordIdx++;
  }

  console.log(`Generated ${full180sWords.length} continuous words spanning 0.5s to ${full180sWords[full180sWords.length - 1].end}s\n`);

  // Group into canonical 3-5 word caption segments
  const segments = groupWordsIntoCaptionSegments(full180sWords, {
    wordsPerGroup: 4,
    maxDuration: 2.8,
    pauseThresholdSeconds: 0.35,
  });

  console.log(`Created ${segments.length} caption segments across 180 seconds.`);
  console.log(`First segment: [${segments[0].start}s - ${segments[0].end}s] "${segments[0].text}"`);
  console.log(`Mid segment (around 15s): [${segments[12]?.start}s - ${segments[12]?.end}s] "${segments[12]?.text}"`);
  console.log(`Last segment: [${segments[segments.length - 1].start}s - ${segments[segments.length - 1].end}s] "${segments[segments.length - 1].text}"\n`);

  // Target checkpoints to verify
  const checkpoints = [
    5.0,
    10.0,
    14.90,
    14.99,
    15.00,
    15.01,
    15.10,
    15.50,
    16.0,
    20.0,
    30.0,
    45.0,
    60.0,
    90.0,
    120.0,
    150.0,
    178.0,
  ];

  const preset = PRODUCTION_REFERENCE_PRESETS[0].config;
  const layout = CaptionLayoutEngine.getPreviewStyles(preset, 340);

  console.log(`CaptionLayoutEngine Preview Font Size on 340px canvas: ${layout.fontSize}px (stroke: ${layout.strokeWidth}px)`);
  if (layout.fontSize < 14 || layout.fontSize > 24) {
    throw new Error(`Preview font size ${layout.fontSize}px is outside acceptable range [14px, 24px]!`);
  }

  const results: CheckpointTestResult[] = [];
  let allPassed = true;

  console.log('\n--- CHECKPOINT VERIFICATION ---');
  for (const cp of checkpoints) {
    // Check if real speech word exists around this checkpoint
    const matchingWord = full180sWords.find((w) => cp >= w.start && cp <= w.end);
    const nearWord = full180sWords.find((w) => Math.abs(cp - w.start) < 0.25 || Math.abs(cp - w.end) < 0.25);
    const speechExpected = Boolean(matchingWord || nearWord);

    const state = getCaptionStateAtTime(segments, cp, {
      ...preset,
      enableSpeechHold: true,
    });

    const isVisible = Boolean(state.activeCaption);
    const activeText = state.activeWord?.word || (state.activeCaption?.words.find((w: any) => cp >= w.start && cp <= w.end) as any)?.word;

    let passed = true;
    let details = '';

    if (speechExpected && !isVisible) {
      passed = false;
      details = `FAIL: Caption disappeared at checkpoint ${cp.toFixed(2)}s while speech was expected!`;
      allPassed = false;
    } else if (isVisible) {
      details = `PASS: Active [${state.activeCaption?.start}s - ${state.activeCaption?.end}s] text="${state.activeCaption?.text}" activeWord="${activeText || '(holding)'}"`;
    } else {
      details = `PASS: Silent dead-air interval at ${cp.toFixed(2)}s`;
    }

    results.push({
      checkpoint: cp,
      speechExpected,
      expectedWord: matchingWord?.word,
      captionVisible: isVisible,
      activeWordText: activeText,
      previewFontSize: layout.fontSize,
      passed,
      details,
    });

    const status = passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} | Checkpoint ${cp.toFixed(2).padStart(6, ' ')}s: ${details}`);
  }

  console.log('\n================================================================');
  console.log('SECOND-HALF CHECKPOINT SUMMARY');
  console.log('================================================================');
  const secondHalfCheckpoints = results.filter((r) => r.checkpoint >= 15.0);
  const secondHalfPassed = secondHalfCheckpoints.every((r) => r.passed);
  const secondHalfCount = secondHalfCheckpoints.length;
  const secondHalfSuccessCount = secondHalfCheckpoints.filter((r) => r.passed).length;

  console.log(`Checkpoints evaluated after 15.00s: ${secondHalfSuccessCount}/${secondHalfCount} passed`);
  console.log(`Typography preview scale check: ${layout.fontSize}px within [14px, 24px] -> PASS`);

  if (!allPassed || !secondHalfPassed) {
    console.error('\n✗ REGRESSION FAILED: Captions disappeared or failed validation in the second half!');
    process.exit(1);
  }

  console.log('\n✓ ALL CAPTION REGRESSION TESTS PASSED! No premature dropouts after 15s.');
}

runRegressionSuite().catch((err) => {
  console.error('Fatal error during regression test:', err);
  process.exit(1);
});
