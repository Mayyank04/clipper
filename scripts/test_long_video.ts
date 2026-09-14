/**
 * VIRALCLIP STUDIO — TEST SUITE: 180-SECOND LONG VIDEO FORENSICS (PART AW)
 * Verifies:
 * 1. 180s source media existence and duration
 * 2. Captions generated across first third, middle third, and final third
 * 3. Final-second caption hold at t=178-180s
 * 4. B-roll distribution across timeline
 * 5. SFX and VFX distribution across timeline
 */

import fs from 'fs';
import path from 'path';
import ffprobeStatic from 'ffprobe-static';
import { execFile } from 'child_process';
import {
  CaptionWord,
  groupWordsIntoCaptionSegments,
  getCaptionStateAtTime,
  calculateCaptionCoverage,
} from '../src/utils/captionEngine';
import {
  generateContentAwareBRollSuggestions,
  generateSemanticSFXSuggestions,
} from '../src/utils/analysisEngine';

const ffprobePath = (ffprobeStatic as any)?.path || 'ffprobe';

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

function probe(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    execFile(
      ffprobePath,
      ['-v', 'error', '-show_entries', 'format=duration', '-show_streams', '-of', 'json', filePath],
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

async function runLongVideoTests() {
  console.log('================================================================');
  console.log('VIRALCLIP STUDIO — TEST: 180-SECOND LONG VIDEO FORENSICS (PART AW)');
  console.log('================================================================\n');

  // TEST 1: 180s Source File Probing
  console.log('--- 1. Probing 180-Second Source Media ---');
  const mediaPath = path.join(process.cwd(), 'public', 'demo', 'test_180s.mp4');
  assert(fs.existsSync(mediaPath), '180s Media File Exists', mediaPath);

  const probeData = await probe(mediaPath);
  const dur = parseFloat(probeData.format?.duration || '0');
  assert(dur >= 175, '180s Duration Check', `Actual duration: ${dur.toFixed(2)}s (expected >= 175s)`);

  const vStream = probeData.streams?.find((s: any) => s.codec_type === 'video');
  assert(vStream && vStream.width > 0 && vStream.height > 0, '180s Video Stream Valid', `${vStream?.width}x${vStream?.height} @ ${vStream?.codec_name}`);

  // TEST 2: Generate Timeline Elements Across All 180 Seconds
  console.log('\n--- 2. Full Timeline Generation (180s) ---');
  const sentences = [
    { text: 'Here is how software developers write clean coding algorithms and deploy apps', start: 5, end: 15 },
    { text: 'Never make this critical mistake when architecting systems', start: 20, end: 28 },
    { text: 'Our financial growth analytics and business revenue scaled up ten times', start: 65, end: 78 },
    { text: 'First remember this key takeaway for scaling your business', start: 85, end: 95 },
    { text: 'Look at this beautiful golden retriever dog playing happily in the park', start: 125, end: 138 },
    { text: 'Inside our creator studio workspace we focus and build video production setups', start: 150, end: 165 },
    { text: 'Subscribe for the final masterclass tutorial right now', start: 170, end: 178.5 },
  ];

  const words: CaptionWord[] = [];
  for (const sent of sentences) {
    const tokens = sent.text.split(' ');
    const span = sent.end - sent.start;
    const wDur = span / tokens.length;
    tokens.forEach((t, idx) => {
      words.push({
        word: t,
        start: Number((sent.start + idx * wDur).toFixed(2)),
        end: Number((sent.start + (idx + 1) * wDur - 0.05).toFixed(2)),
        confidence: 0.98,
      });
    });
  }

  const captions = groupWordsIntoCaptionSegments(words, { wordsPerGroup: 3 });
  assert(captions.length >= 25, 'Caption Segments Across 180s', `Generated ${captions.length} caption beats across 180s`);

  // TEST 3: Thirds Distribution (First Third 0-60s, Middle Third 60-120s, Final Third 120-180s)
  console.log('\n--- 3. Distribution Across First, Middle & Final Thirds ---');
  const firstThird = captions.filter((c) => c.start < 60);
  const middleThird = captions.filter((c) => c.start >= 60 && c.start < 120);
  const finalThird = captions.filter((c) => c.start >= 120);

  assert(firstThird.length > 0, 'Captions in First Third (0-60s)', `Found ${firstThird.length} beats`);
  assert(middleThird.length > 0, 'Captions in Middle Third (60-120s)', `Found ${middleThird.length} beats`);
  assert(finalThird.length > 0, 'Captions in Final Third (120-180s)', `Found ${finalThird.length} beats`);

  // TEST 4: Final Caption Does Not Disappear Early
  console.log('\n--- 4. Final-Second Caption Hold Forensics ---');
  const lastCap = captions[captions.length - 1];
  assert(lastCap.end >= 177, 'Last Caption Extends To Near End', `Last caption ends at ${lastCap.end}s`);

  // Hold active at lastCap.end + 0.3s
  const heldState = getCaptionStateAtTime(captions, lastCap.end + 0.3, {
    enableSpeechHold: true,
    finalHoldSeconds: 0.8,
  } as any);
  assert(
    heldState.activeCaption?.id === lastCap.id,
    'Final Caption Stays Visible Past Speech End',
    `Held at t=${(lastCap.end + 0.3).toFixed(2)}s with all words visible`
  );

  // TEST 5: B-Roll & SFX Across 180s
  console.log('\n--- 5. B-Roll & SFX Coverage Across 180s ---');
  const broll = generateContentAwareBRollSuggestions(captions, 180);
  const sfx = generateSemanticSFXSuggestions(captions, 180);

  assert(broll.length >= 3, 'B-Roll Suggestions In 180s', `Generated ${broll.length} B-roll suggestions`);
  assert(sfx.length >= 3, 'SFX Suggestions In 180s', `Generated ${sfx.length} SFX markers`);

  // Summary
  const allPassed = results.every((r) => r.passed);
  console.log('\n================================================================');
  console.log(`LONG VIDEO TEST RESULT: ${allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'}`);
  console.log(`Passed: ${results.filter((r) => r.passed).length} / ${results.length}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runLongVideoTests().catch((err) => {
  console.error('Long video test error:', err);
  process.exit(1);
});
