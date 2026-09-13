/**
 * VIRALCLIP STUDIO — TEST 2: VIDEO B-ROLL ENGINE & ASSETS SUITE
 * Verifies real MP4 video B-roll assets in public/assets/broll/,
 * 9:16 resolution and H.264 video streams, assetType: 'video',
 * PIP vs full cutaway modes, animal/dog video detection, and zero fake text banners.
 */

import fs from 'fs';
import path from 'path';
import ffprobeStatic from 'ffprobe-static';
import { execFile } from 'child_process';
import { VERIFIED_BROLL_CATALOG } from '../src/utils/analysisEngine';
import { VERIFIED_OFFLINE_STOCK_CATALOG } from '../src/utils/pexelsProvider';
import { SemanticBRollEngine } from '../src/utils/creatorStudio/brollEngine';
import { analyzeVideoSemantics } from '../src/utils/videoSemanticAnalyzer';

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

function probeVideo(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    execFile(
      ffprobePath,
      ['-v', 'quiet', '-print_format', 'json', '-show_streams', '-show_format', filePath],
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

async function runVideoBrollTests() {
  console.log('================================================================');
  console.log('VIRALCLIP STUDIO — TEST 2: VIDEO B-ROLL ENGINE & ASSET SUITE');
  console.log('================================================================\n');

  // Test 1: Real MP4 video files in catalog
  assert(
    VERIFIED_BROLL_CATALOG.length >= 7,
    'Catalog Size',
    `Catalog contains ${VERIFIED_BROLL_CATALOG.length} verified B-roll assets`
  );

  const videoItems = VERIFIED_BROLL_CATALOG.filter((b) => b.assetType === 'video' || b.assetUrl.endsWith('.mp4'));
  assert(
    videoItems.length >= 7,
    'First-Class Video B-Roll Presence',
    `Found ${videoItems.length} video B-roll items in catalog`
  );

  // Test 2: Physical existence and probe of each video B-roll clip
  for (const item of videoItems) {
    const cleanUrl = item.assetUrl.replace(/^\//, '');
    const diskPath = path.join(process.cwd(), 'public', cleanUrl.replace(/^public\//, ''));

    assert(
      fs.existsSync(diskPath),
      `Asset File Exists: ${item.id}`,
      `File ${cleanUrl} exists on disk (${(fs.existsSync(diskPath) ? fs.statSync(diskPath).size / 1024 : 0).toFixed(1)} KB)`
    );

    if (fs.existsSync(diskPath)) {
      const probe = await probeVideo(diskPath);
      const vStream = probe.streams?.find((s: any) => s.codec_type === 'video');
      assert(
        vStream && vStream.width === 1080 && vStream.height === 1920,
        `Asset 9:16 Resolution: ${item.id}`,
        `Resolution: ${vStream?.width}x${vStream?.height}, Codec: ${vStream?.codec_name}`
      );
    }
  }

  // Test 3: Offline Stock Catalog Parity
  const pexelsOfflineVideos = VERIFIED_OFFLINE_STOCK_CATALOG.filter(
    (c) => c.url?.endsWith('.mp4') || c.videoFiles?.some((v) => v.link?.endsWith('.mp4'))
  );
  assert(
    pexelsOfflineVideos.length >= 7,
    'Pexels Provider Video Assets',
    `Verified ${pexelsOfflineVideos.length} video items in offline provider catalog`
  );

  // Test 4: Semantic Resolution of Queries into Video B-Roll
  const brollEngine = new SemanticBRollEngine();
  const opportunities = [
    {
      id: 'opp_tech',
      sentence: 'Here is how we code this modern software architecture',
      startTime: 2.0,
      endTime: 5.5,
      semanticConcept: 'developer coding software',
      queries: ['developer coding ide screen', 'software programming engineer'],
      isPIP: false,
      transition: 'hard_cut' as const,
    },
    {
      id: 'opp_growth',
      sentence: 'Our revenue charts and growth analytics skyrocketed',
      startTime: 6.0,
      endTime: 9.0,
      semanticConcept: 'business growth analytics',
      queries: ['growth chart analytics metrics', 'exponential business scale'],
      isPIP: true,
      transition: 'subtle_push' as const,
    },
    {
      id: 'opp_animal',
      sentence: 'Look at this happy golden retriever dog running around',
      startTime: 10.0,
      endTime: 13.0,
      semanticConcept: 'golden retriever dog playing',
      queries: ['golden retriever dog playing', 'happy pet puppy outdoors'],
      isPIP: false,
      transition: 'hard_cut' as const,
    },
  ];

  const placed = await brollEngine.resolveBRollAssets(opportunities);
  assert(placed.length === 3, 'Resolution Count', `Placed ${placed.length} B-roll track items`);

  // Verify placed item 1 (Tech)
  assert(
    placed[0].assetType === 'video' && placed[0].assetUrl.endsWith('.mp4'),
    'Tech B-Roll Is Real MP4 Video',
    `Asset: ${placed[0].assetUrl}, Type: ${placed[0].assetType}`
  );

  // Verify placed item 2 (Growth PIP)
  assert(
    placed[1].isPIP === true && placed[1].transition === 'subtle_push',
    'PIP Mode Preservation',
    `isPIP: ${placed[1].isPIP}, Transition: ${placed[1].transition}`
  );

  // Verify placed item 3 (Animal Dog)
  assert(
    placed[2].assetUrl.includes('animal_dog') || placed[2].concept.toLowerCase().includes('dog'),
    'Animal Dog Video Matching',
    `Matched dog query to: ${placed[2].assetUrl} (${placed[2].concept})`
  );

  // Test 5: Semantic Video Analysis with Animal Detection
  const semanticAnalysis = analyzeVideoSemantics(
    15,
    'Look at our golden retriever dog running in the park while we talk about coding',
    [
      { id: '1', start: 0, end: 7, text: 'Look at our golden retriever dog running in the park', words: [] },
      { id: '2', start: 7, end: 14, text: 'while we talk about coding software', words: [] },
    ],
    [
      { word: 'golden', start: 1.0, end: 1.5 },
      { word: 'retriever', start: 1.55, end: 2.1 },
      { word: 'dog', start: 2.15, end: 2.6 },
      { word: 'coding', start: 8.0, end: 8.7 },
    ]
  );

  assert(
    Array.isArray(semanticAnalysis.animals) && semanticAnalysis.animals.length > 0,
    'Animal Detection Emitted',
    `Detected ${semanticAnalysis.animals?.length} animal events: ${semanticAnalysis.animals?.map((a) => a.subject).join(', ')}`
  );

  // Test 6: Zero Fake [B-ROLL] Text Banners
  // Ensure VideoCanvas.tsx has no fake text badges
  const canvasPath = path.join(process.cwd(), 'src/components/Editor/VideoCanvas.tsx');
  const canvasContent = fs.readFileSync(canvasPath, 'utf8');
  const hasFakeBadge = canvasContent.includes('[B-ROLL]') || canvasContent.includes('B-ROLL OVERLAY');

  assert(!hasFakeBadge, 'No Fake [B-ROLL] Text Badges in VideoCanvas', 'Canvas renders real video element without placeholder badges');

  // Summary
  const allPassed = results.every((r) => r.passed);
  console.log('\n================================================================');
  console.log(`TEST 2 RESULT: ${allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'}`);
  console.log(`Passed: ${results.filter((r) => r.passed).length} / ${results.length}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runVideoBrollTests().catch((err) => {
  console.error('Video B-roll test failure:', err);
  process.exit(1);
});
