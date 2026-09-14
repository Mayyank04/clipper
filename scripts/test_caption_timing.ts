/**
 * VIRALCLIP STUDIO — TEST SUITE: CAPTION TIMING & SPEECH-HOLD ENGINE
 * Part E, F, G, S, T, W, AR, AS Certification:
 * 1. Exact word derivation (start = words[0].start, end = words[last].end)
 * 2. Gap-bridging speech hold across micro-pauses (Netflix/BBC standard)
 * 3. Final-second caption hold preventing sudden dead-air visual drops
 * 4. Forensic seeking at 5s, 12s, 27s, 41s, 58s
 * 5. Speech coverage calculation (>= 95% target)
 * 6. Auto-Fix Captions engine
 * 7. Active word scale calibration (1.00 -> 1.06)
 */

import {
  CaptionWord,
  CaptionSegment,
  groupWordsIntoCaptionSegments,
  getCaptionStateAtTime,
  getActiveCaptionWord,
  autoFixCaptions,
  calculateCaptionCoverage,
  detectSemanticWordEmphasis,
} from '../src/utils/captionEngine';

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

async function runCaptionTimingTests() {
  console.log('================================================================');
  console.log('VIRALCLIP STUDIO — TEST: CAPTION TIMING & SPEECH-HOLD FORENSICS');
  console.log('================================================================\n');

  // TEST 1: Real Word-Level Derivation
  console.log('--- 1. Word-Level Timing Derivation ---');
  const sampleWords: CaptionWord[] = [
    { word: 'THE', start: 1.20, end: 1.45, confidence: 0.98 },
    { word: 'BIGGEST', start: 1.48, end: 1.95, confidence: 0.99 },
    { word: 'MISTAKE', start: 1.98, end: 2.50, confidence: 0.97 },
    { word: 'CREATORS', start: 2.65, end: 3.10, confidence: 0.96 },
    { word: 'MAKE', start: 3.12, end: 3.45, confidence: 0.99 },
    { word: 'EVERY', start: 3.48, end: 3.75, confidence: 0.95 },
    { word: 'DAY', start: 3.78, end: 4.15, confidence: 0.98 },
  ];

  const grouped = groupWordsIntoCaptionSegments(sampleWords, { wordsPerGroup: 3 });
  assert(grouped.length >= 2, 'Beat Segmentation Count', `Created ${grouped.length} visual speech beats`);

  for (let i = 0; i < grouped.length; i++) {
    const seg = grouped[i];
    const expectedStart = seg.words[0].start;
    const expectedEnd = seg.words[seg.words.length - 1].end;
    assert(
      Math.abs(seg.start - expectedStart) < 0.001,
      `Beat ${i + 1} Start Derivation`,
      `Caption start (${seg.start}s) equals first word start (${expectedStart}s)`
    );
    assert(
      Math.abs(seg.end - expectedEnd) < 0.001,
      `Beat ${i + 1} End Derivation`,
      `Caption end (${seg.end}s) equals last word end (${expectedEnd}s)`
    );
  }

  // TEST 2: Gap-Bridging Speech Hold (Micro-Pause Stability)
  console.log('\n--- 2. Gap-Bridging Speech Hold ---');
  // In sampleWords, Beat 1 ends at 2.50s, Beat 2 starts at 2.65s (150ms inter-beat pause).
  // Without speech hold: t=2.58s returns undefined (screen blinks black).
  // With speech hold enabled: t=2.58s retains Beat 1 visible in its spoken state.
  const withoutHold = getCaptionStateAtTime(grouped, 2.58, { enableSpeechHold: false } as any);
  assert(withoutHold.activeCaption === undefined, 'Strict Interval Math', 'Without hold, 2.58s is outside [1.20 - 2.50] and returns undefined');

  const withHold = getCaptionStateAtTime(grouped, 2.58, {
    enableSpeechHold: true,
    holdThresholdSeconds: 0.28,
  } as any);
  assert(
    withHold.activeCaption !== undefined && withHold.activeCaption.id === grouped[0].id,
    'Speech Hold Gap-Bridging',
    'During 150ms pause (t=2.58s), speech-hold retains beat visible'
  );
  assert(
    withHold.highlightState.pastWordIndices.length === grouped[0].words.length,
    'Held Caption Past Words Marked',
    `All ${grouped[0].words.length} words marked spoken during hold window`
  );

  // TEST 3: Final-Second Caption Hold
  console.log('\n--- 3. Final-Second Caption Hold ---');
  // Last word ends at 4.15s. At t=4.40s (250ms after speech ends), final caption should hold
  const finalHold = getCaptionStateAtTime(grouped, 4.40, {
    enableSpeechHold: true,
    finalHoldSeconds: 0.8,
  } as any);
  assert(
    finalHold.activeCaption !== undefined && finalHold.activeCaption.id === grouped[grouped.length - 1].id,
    'Final Punchline Hold',
    'Final caption remains visible 250ms after speech concludes'
  );

  // But after final hold expires (e.g. at 5.5s), caption is cleanly removed
  const pastFinalHold = getCaptionStateAtTime(grouped, 5.5, {
    enableSpeechHold: true,
    finalHoldSeconds: 0.8,
  } as any);
  assert(pastFinalHold.activeCaption === undefined, 'Final Hold Expiry', 'Caption disappears cleanly after hold window');

  // TEST 4: Forensic Seeking Across Timestamps (Part AS)
  console.log('\n--- 4. Forensic Seeking Across Timeline ---');
  // Create a 60-second test caption timeline
  const timelineWords: CaptionWord[] = [];
  for (let s = 1; s <= 58; s += 2) {
    timelineWords.push({ word: `SEC_${s}`, start: s, end: s + 0.8, confidence: 0.98 });
    timelineWords.push({ word: `PUNCH_${s}`, start: s + 0.85, end: s + 1.5, confidence: 0.99 });
  }
  const longCaps = groupWordsIntoCaptionSegments(timelineWords, { wordsPerGroup: 2 });

  const seekTimes = [5.2, 12.4, 27.3, 41.1, 57.5];
  for (const t of seekTimes) {
    const state = getCaptionStateAtTime(longCaps, t, { enableSpeechHold: true } as any);
    const expectedCap = longCaps.find((c) => (t >= c.start && t <= c.end) || (t > c.end && t - c.end <= 0.28));
    assert(
      state.activeCaption?.id === expectedCap?.id,
      `Seek Forensic t=${t}s`,
      `Resolved to caption ID ${state.activeCaption?.id} (range [${state.activeCaption?.start} - ${state.activeCaption?.end}])`
    );
  }

  // TEST 5: Speech Coverage Metric Calculation (Part F)
  console.log('\n--- 5. Speech Coverage Calculation ---');
  const speechDur = sampleWords.reduce((sum, w) => sum + (w.end - w.start), 0);
  const coverage = calculateCaptionCoverage(grouped, 5.0, speechDur);
  assert(coverage.coveragePercent >= 95, 'Caption Speech Coverage', `Coverage: ${coverage.coveragePercent}% (target >= 95%)`);
  assert(coverage.totalWords === sampleWords.length, 'Coverage Word Count', `Total words counted: ${coverage.totalWords}`);

  // TEST 6: Auto-Fix Captions Engine (Part W)
  console.log('\n--- 6. Auto-Fix Captions Engine ---');
  const damagedCaptions: CaptionSegment[] = [
    { id: 'c1', start: 1.0, end: 6.0, text: 'Runaway huge caption that spans five seconds without rhythm', words: [] },
  ];
  const fixedResult = autoFixCaptions(damagedCaptions, 6.0);
  assert(fixedResult.fixedCaptions.length >= 2, 'Auto-Fix Beat Segmentation', `Split runaway caption into ${fixedResult.fixedCaptions.length} tight beats`);
  assert(fixedResult.speechCoveragePercent >= 90, 'Auto-Fix Speech Coverage', `Reported: "${fixedResult.message}"`);

  // TEST 7: Active Word Scale Calibration (Part S)
  console.log('\n--- 7. Active Word Scale Calibration ---');
  const word = sampleWords[1]; // BIGGEST: 1.48s to 1.95s (dur = 0.47s, mid = 1.715s)
  const atStart = getActiveCaptionWord(sampleWords, 1.48);
  const atMid = getActiveCaptionWord(sampleWords, 1.715);
  const atEnd = getActiveCaptionWord(sampleWords, 1.95);

  assert(Math.abs(atStart.scale - 1.00) < 0.02, 'Scale at Start', `Scale at t=1.48s: ${atStart.scale}`);
  assert(atMid.scale >= 1.05 && atMid.scale <= 1.08, 'Scale at Midpoint (1.05 - 1.08)', `Scale at midpoint: ${atMid.scale}`);
  assert(Math.abs(atEnd.scale - 1.00) < 0.02, 'Scale at End', `Scale at t=1.95s: ${atEnd.scale}`);

  // Summary
  const allPassed = results.every((r) => r.passed);
  console.log('\n================================================================');
  console.log(`CAPTION TIMING RESULT: ${allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'}`);
  console.log(`Passed: ${results.filter((r) => r.passed).length} / ${results.length}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runCaptionTimingTests().catch((err) => {
  console.error('Caption timing test error:', err);
  process.exit(1);
});
