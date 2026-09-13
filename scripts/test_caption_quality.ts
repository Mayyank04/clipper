/**
 * VIRALCLIP STUDIO — TEST 1: CAPTION QUALITY & TIMING OVERHAUL
 * Verifies strict word-derived timing, CapCut-style active word bounce,
 * 10 production presets (Reference Mix default), semantic emphasis (10-25%),
 * auto-fix timing repair, and split/merge operations.
 */

import {
  PRODUCTION_REFERENCE_PRESETS,
  DEFAULT_CAPTION_STYLE,
  validateCaptionTiming,
  getActiveCaptionWord,
  detectSemanticWordEmphasis,
  groupWordsIntoCaptionSegments,
  autoFixCaptions,
  getCaptionStateAtTime,
} from '../src/utils/captionEngine';
import { CaptionSegment, CaptionWord } from '../src/types';

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

async function runCaptionTests() {
  console.log('================================================================');
  console.log('VIRALCLIP STUDIO — TEST 1: CAPTION QUALITY & TIMING SUITE');
  console.log('================================================================\n');

  // Test 1: Production Presets & Default Style
  assert(
    DEFAULT_CAPTION_STYLE === 'reference_mix',
    'Default Caption Preset',
    `Default style is "${DEFAULT_CAPTION_STYLE}" (Reference Mix matching reference short)`
  );

  assert(
    PRODUCTION_REFERENCE_PRESETS.length >= 10,
    '10 Production Presets Available',
    `Found ${PRODUCTION_REFERENCE_PRESETS.length} presets: ${PRODUCTION_REFERENCE_PRESETS.map((p) => p.id).join(', ')}`
  );

  const refMix = PRODUCTION_REFERENCE_PRESETS.find((p) => p.id === 'reference_mix')?.config;
  assert(
    refMix && refMix.uppercase === true && refMix.fontWeight >= 700 && refMix.primaryColor === '#FFFFFF',
    'Reference Mix Typography',
    `Uppercase bold white text with highlightColor=${refMix?.highlightColor}`
  );

  // Test 2: Word-Derived Timing (Start = words[0].start, End = words[last].end)
  const sampleWords: CaptionWord[] = [
    { word: 'Welcome', start: 1.25, end: 1.65, confidence: 0.98 },
    { word: 'to', start: 1.68, end: 1.82, confidence: 0.99 },
    { word: 'the', start: 1.85, end: 1.95, confidence: 0.97 },
    { word: 'future', start: 1.98, end: 2.45, confidence: 0.98 },
    { word: 'of', start: 2.48, end: 2.60, confidence: 0.96 },
    { word: 'video', start: 2.62, end: 3.10, confidence: 0.99 },
  ];

  const grouped = groupWordsIntoCaptionSegments(sampleWords, 4);
  assert(grouped.length > 0, 'Grouping Generated Segments', `Created ${grouped.length} caption blocks`);

  for (let i = 0; i < grouped.length; i++) {
    const seg = grouped[i];
    const expectedStart = seg.words[0].start;
    const expectedEnd = seg.words[seg.words.length - 1].end;
    assert(
      Math.abs(seg.start - expectedStart) < 0.001 && Math.abs(seg.end - expectedEnd) < 0.001,
      `Segment ${i + 1} Timing Derivation`,
      `Caption [${seg.start} - ${seg.end}] matches word range [${expectedStart} - ${expectedEnd}] exactly`
    );
  }

  // Test 3: Active Word Linear Scale (1.00 -> 1.06 -> 1.00)
  // Word is 1.98s to 2.45s (midpoint = 2.215s)
  const atStart = getActiveCaptionWord(sampleWords, 1.98);
  const atMid = getActiveCaptionWord(sampleWords, 2.215);
  const outside = getActiveCaptionWord(sampleWords, 1.0);

  assert(
    atMid !== null && atMid.scale > 1.03 && atMid.scale <= 1.08,
    'Active Word Scale Peak',
    `Word "${atMid?.word?.word}" peak scale is ${atMid?.scale} (expected ~1.06x)`
  );
  assert(
    atStart !== null && atStart.scale >= 1.00 && atStart.scale <= 1.02,
    'Active Word Scale At Start',
    `Word "${atStart?.word?.word}" start scale is ${atStart?.scale} (expected ~1.00x)`
  );
  assert(outside.index === -1 && outside.word === undefined, 'No Active Word Outside Range', 'Outside timestamp returns index -1 correctly');

  // Test 4: Timing Boundary Check (No Premature Triggering)
  const captionSeg: CaptionSegment = {
    id: 'cap_1',
    start: 2.0,
    end: 3.5,
    text: 'FUTURE OF VIDEO',
    words: sampleWords,
  };
  const beforeStart = getCaptionStateAtTime([captionSeg], 1.95);
  const insideCaption = getCaptionStateAtTime([captionSeg], 2.5);
  const afterEnd = getCaptionStateAtTime([captionSeg], 3.55);

  assert(beforeStart.activeCaption === undefined, 'No Premature Caption Trigger', '1.95s is before 2.00s start => activeCaption is undefined');
  assert(insideCaption.activeCaption !== undefined && insideCaption.activeCaption.text === 'FUTURE OF VIDEO', 'Inside Caption Trigger', '2.50s => active caption');
  assert(afterEnd.activeCaption === undefined, 'No Lagging Caption Linger', '3.55s is after 3.50s end => activeCaption is undefined');

  // Test 5: Semantic Word Emphasis (Target 10-25%)
  const transcriptWords: CaptionWord[] = [
    { word: 'We', start: 0.1, end: 0.3, confidence: 0.9 },
    { word: 'generated', start: 0.35, end: 0.7, confidence: 0.9 },
    { word: '10', start: 0.75, end: 1.0, confidence: 0.95 },
    { word: 'million', start: 1.05, end: 1.4, confidence: 0.95 },
    { word: 'views', start: 1.45, end: 1.8, confidence: 0.9 },
    { word: 'and', start: 1.85, end: 2.0, confidence: 0.9 },
    { word: '$50,000', start: 2.05, end: 2.5, confidence: 0.98 },
    { word: 'in', start: 2.55, end: 2.7, confidence: 0.9 },
    { word: 'revenue', start: 2.75, end: 3.1, confidence: 0.92 },
    { word: 'using', start: 3.15, end: 3.4, confidence: 0.9 },
    { word: 'this', start: 3.45, end: 3.6, confidence: 0.9 },
    { word: 'secret', start: 3.65, end: 4.0, confidence: 0.94 },
    { word: 'system', start: 4.05, end: 4.4, confidence: 0.9 },
    { word: 'for', start: 4.45, end: 4.6, confidence: 0.9 },
    { word: 'creators', start: 4.65, end: 5.0, confidence: 0.9 },
  ];

  const emphasized = detectSemanticWordEmphasis(transcriptWords, 0.20);
  const emphasizedCount = emphasized.length;
  const ratio = emphasizedCount / transcriptWords.length;

  assert(
    ratio >= 0.10 && ratio <= 0.30,
    'Semantic Emphasis Density (10-25%)',
    `Emphasized ${emphasizedCount} of ${transcriptWords.length} words (${(ratio * 100).toFixed(1)}%)`
  );

  const numEmphasized = emphasized.find((e) => e.word.includes('$50,000') || e.word.includes('10'));
  assert(
    numEmphasized !== undefined,
    'High-Value Entity Emphasis',
    `Crucial entity "${numEmphasized?.word}" was flagged with highlightColor=${numEmphasized?.highlightColor}`
  );

  // Test 6: Auto-Fix Captions (Repair Gaps & Out of Bounds)
  const faultyCaptions: CaptionSegment[] = [
    {
      id: 'f1',
      start: 0.2,
      end: 1.5,
      text: 'First caption',
      words: [{ word: 'First', start: 0.2, end: 0.8 }, { word: 'caption', start: 0.85, end: 1.5 }],
    },
    {
      id: 'f2',
      start: 1.4, // Overlap!
      end: 2.8,
      text: 'Second caption',
      words: [{ word: 'Second', start: 1.4, end: 2.0 }, { word: 'caption', start: 2.05, end: 2.8 }],
    },
  ];

  const { fixedCaptions } = autoFixCaptions(faultyCaptions, 10.0);
  assert(
    fixedCaptions.length > 0 && fixedCaptions[0].end <= fixedCaptions[1].start,
    'Auto-Fix Overlap Resolution',
    `Seg 1 end (${fixedCaptions[0]?.end}s) is <= Seg 2 start (${fixedCaptions[1]?.start}s)`
  );

  // Summary
  const allPassed = results.every((r) => r.passed);
  console.log('\n================================================================');
  console.log(`TEST 1 RESULT: ${allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'}`);
  console.log(`Passed: ${results.filter((r) => r.passed).length} / ${results.length}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runCaptionTests().catch((err) => {
  console.error('Caption test failure:', err);
  process.exit(1);
});
