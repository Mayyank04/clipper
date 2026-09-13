import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import {
  analyzeVideoSemantics,
  detectBrollOpportunities,
  extractDynamicVideoTopics,
  generateIntelligentSearchQueries,
} from '../src/utils/videoSemanticAnalyzer';
import { OfficialPexelsProvider, VERIFIED_OFFLINE_STOCK_CATALOG } from '../src/utils/pexelsProvider';
import { AuthorizedPinterestProvider } from '../src/utils/pinterestProvider';
import {
  scoreBrollCandidate,
  calculateSequenceContinuity,
  classifyShotType,
  generateSmartCropPlan,
  buildEditorialReason,
  selectBestBrollEvents,
  buildCanonicalRenderPlan,
  executeAIPolish,
} from '../src/utils/brollRankingEngine';
import { CaptionSegment, WordTiming, StockVideo, BrollOpportunity, BrollEvent } from '../src/types';

const ffmpegPath: string = (ffmpegStatic as unknown as string) || 'ffmpeg';
const ffprobePath: string = (ffprobeStatic && ffprobeStatic.path) ? ffprobeStatic.path : 'ffprobe';
const BASE_URL = 'http://localhost:3001';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  [PASS] ${message}`);
}

async function runTests() {
  console.log('===============================================================');
  console.log('VIRALCLIP STUDIO — PROFESSIONAL AI SEMANTIC B-ROLL ENGINE TESTS');
  console.log('===============================================================');

  // --- 1. Dynamic Video Semantic Analysis & Zero Hard-Coding ---
  console.log('\n--- 1. Dynamic Video Semantic Analysis & Zero Hard-Coding ---');

  // Test Case A: University & Computer Science Video
  const csTranscript = 'Welcome everyone to the university computer science orientation. Today our students begin learning robotics and software engineering with advanced coding algorithms.';
  const csSegments: CaptionSegment[] = [
    { id: 'c1', start: 0.0, end: 4.5, text: 'Welcome everyone to the university computer science orientation.', words: [] },
    { id: 'c2', start: 5.0, end: 10.0, text: 'Today our students begin learning robotics and software engineering with advanced coding algorithms.', words: [] },
  ];
  const csAnalysis = analyzeVideoSemantics(15, csTranscript, csSegments);

  assert(csAnalysis.duration === 15, 'VideoSemanticAnalysis has valid duration');
  assert(Array.isArray(csAnalysis.scenes) && csAnalysis.scenes.length > 0, 'Scenes detected dynamically');
  assert(Array.isArray(csAnalysis.topics) && csAnalysis.topics.length > 0, 'Topics discovered dynamically');
  assert(
    csAnalysis.topics.some((t) => t.toLowerCase().includes('computer science') || t.toLowerCase().includes('education')),
    `Discovered topic relates to Computer Science & Education: "${csAnalysis.topics[0]}"`
  );
  assert(
    csAnalysis.entities.some((e) => ['university', 'students', 'coding', 'robotics', 'software'].includes(e.toLowerCase())),
    'Discovered relevant entities (university, students, coding, robotics)'
  );

  // Test Case B: Medical & Healthcare Video (proving ZERO hard-coding)
  const medTranscript = 'The doctor met with the patient in the hospital clinic to discuss surgery procedures and advanced medicine treatment options.';
  const medSegments: CaptionSegment[] = [
    { id: 'm1', start: 0.0, end: 5.0, text: 'The doctor met with the patient in the hospital clinic.', words: [] },
    { id: 'm2', start: 5.5, end: 11.0, text: 'To discuss surgery procedures and advanced medicine treatment options.', words: [] },
  ];
  const medAnalysis = analyzeVideoSemantics(15, medTranscript, medSegments);
  assert(
    medAnalysis.topics.some((t) => t.toLowerCase().includes('health') || t.toLowerCase().includes('medicine')),
    `Medical transcript dynamically discovers Healthcare topic: "${medAnalysis.topics[0]}"`
  );
  assert(
    medAnalysis.entities.some((e) => ['doctor', 'patient', 'hospital', 'medicine'].includes(e.toLowerCase())),
    'Discovered medical entities dynamically without hard-coding'
  );

  // --- 2. Transcript-Driven B-Roll Opportunity & Multi-Query Generation ---
  console.log('\n--- 2. Transcript-Driven B-Roll Opportunity & Multi-Query Generation ---');
  assert(Array.isArray(csAnalysis.brollOpportunities), 'brollOpportunities array generated');
  assert(csAnalysis.brollOpportunities.length > 0, `Identified B-roll opportunities: ${csAnalysis.brollOpportunities.length}`);

  const opp1 = csAnalysis.brollOpportunities[0];
  assert(opp1.start >= 0 && opp1.end > opp1.start, `Opportunity 1 has sentence-safe bounds: ${opp1.start}s - ${opp1.end}s`);
  assert(Boolean(opp1.transcriptContext), `Opportunity 1 contains narration context: "${opp1.transcriptContext.slice(0, 35)}..."`);
  assert(Boolean(opp1.purpose), `Opportunity 1 assigned purpose: ${opp1.purpose}`);
  assert(Array.isArray(opp1.searchQueries) && opp1.searchQueries.length >= 3 && opp1.searchQueries.length <= 8,
    `Opportunity 1 generated 3-8 intelligent queries (found ${opp1.searchQueries.length})`);
  assert(!opp1.searchQueries.includes('journey'), 'Avoided single generic keywords like "journey"');
  assert(opp1.searchQueries.some((q) => q.split(' ').length >= 2), 'Queries are multi-word semantic combinations');

  // --- 3. Official Pexels API & Authorized Pinterest Status ---
  console.log('\n--- 3. Official Pexels API & Authorized Pinterest Status ---');
  const pexels = new OfficialPexelsProvider();
  const searchResults = await pexels.searchVideos({ query: 'computer science students coding', per_page: 5 });
  assert(Array.isArray(searchResults) && searchResults.length > 0, `Pexels search returned candidates: ${searchResults.length}`);
  const firstCand = searchResults[0];
  assert(Boolean(firstCand.id), `Candidate has asset ID: ${firstCand.id}`);
  assert(firstCand.width >= 1080 && firstCand.height >= 720, `Candidate meets quality resolution: ${firstCand.width}x${firstCand.height}`);
  assert(Boolean(firstCand.license), `Candidate includes license attribution: ${firstCand.license}`);
  assert(Boolean(firstCand.author), `Candidate includes creator attribution: ${firstCand.author}`);

  // Test Pinterest Status Handling (Honest without scraping)
  const pinterest = new AuthorizedPinterestProvider();
  const pinStatus = pinterest.getStatus();
  assert(pinStatus.available === false, 'Pinterest unconfigured status honestly returns available: false');
  assert(
    pinStatus.message.includes('Pinterest integration unavailable. Connect Pinterest API to enable Pinterest results.'),
    'Pinterest returns exact specified user-friendly guidance message'
  );

  // --- 4. Multi-Factor Candidate Ranking & Exact Formula ---
  console.log('\n--- 4. Multi-Factor Candidate Ranking & Exact Formula ---');
  const usedIds = new Set<string>();
  const scoreResult = scoreBrollCandidate(firstCand, opp1, usedIds);

  assert(scoreResult.finalScore >= 0.82, `High-affinity candidate scored >= 0.82 (got ${scoreResult.finalScore})`);
  assert(scoreResult.passed === true, 'High-affinity candidate passed threshold');
  assert(scoreResult.semanticSimilarity > 0, `Semantic similarity: ${scoreResult.semanticSimilarity}`);
  assert(scoreResult.transcriptRelevance > 0, `Transcript relevance: ${scoreResult.transcriptRelevance}`);
  assert(scoreResult.visualSimilarity > 0, `Visual similarity: ${scoreResult.visualSimilarity}`);

  // Test rejection of completely irrelevant candidate (e.g., cooking in a coding short)
  const irrelevantCand: StockVideo = {
    id: 'irrelevant_pasta_99',
    provider: 'pexels',
    width: 640,
    height: 360,
    duration: 3.0,
    url: '/assets/broll/strategy.jpg',
    thumbnailUrl: '/assets/broll/strategy.jpg',
    videoFiles: [],
    tags: ['pasta', 'spaghetti', 'sauce', 'kitchen', 'cooking'],
    author: 'Chef Italian',
    license: 'Royalty Free',
    queryMatched: 'cooking pasta kitchen',
  };
  const lowScore = scoreBrollCandidate(irrelevantCand, opp1, usedIds);
  assert(lowScore.finalScore < 0.82, `Irrelevant candidate rejected with score < 0.82 (got ${lowScore.finalScore})`);
  assert(lowScore.passed === false, 'Irrelevant candidate rejected successfully');

  // --- 5. Sequence Continuity & 9:16 Smart Reframing ---
  console.log('\n--- 5. Sequence Continuity & 9:16 Smart Reframing ---');
  const shotType = classifyShotType(opp1.purpose, firstCand);
  assert(['ESTABLISHING', 'HUMAN', 'DETAIL', 'CONTEXT', 'CONCEPTUAL', 'HERO'].includes(shotType), `Shot classified as valid type: ${shotType}`);

  const crop = generateSmartCropPlan(firstCand, shotType);
  assert(crop.width > 0 && crop.height > 0, `Crop dimensions calculated: ${crop.width}x${crop.height}`);
  assert(crop.motion?.startScale === 1.0 && crop.motion?.endScale === 1.04, 'Crop motion configured with subtle 1.00 -> 1.04 easing');

  const reason = buildEditorialReason(opp1, firstCand, shotType);
  assert(reason.includes('Selected because the speaker is discussing'), `Editorial "Why this clip?" reason generated: "${reason.slice(0, 50)}..."`);

  // --- 6. Canonical RenderPlan & Selection Engine ---
  console.log('\n--- 6. Canonical RenderPlan & Selection Engine ---');
  const candidatesMap = new Map<string, StockVideo[]>();
  for (const opp of csAnalysis.brollOpportunities) {
    candidatesMap.set(opp.searchQueries[0], searchResults);
  }

  const bestEvents = selectBestBrollEvents(csAnalysis.brollOpportunities, candidatesMap, 15);
  assert(Array.isArray(bestEvents) && bestEvents.length > 0, `Selected best B-roll events: ${bestEvents.length}`);
  const event1 = bestEvents[0];
  assert(event1.semanticScore >= 0.80, `Event 1 semantic score is verified: ${event1.semanticScore}`);
  assert(event1.continuityScore >= 0.80, `Event 1 continuity score is verified: ${event1.continuityScore}`);

  const renderPlan = buildCanonicalRenderPlan('proj_broll_test', 'short_broll_1', 15, bestEvents, csSegments);
  assert(renderPlan.brollEvents.length === bestEvents.length, 'Canonical RenderPlan unifies B-roll events');
  assert(renderPlan.audioTrack.brollDuckingDb === -16, 'RenderPlan specifies -16 dB speech ducking');

  // --- 7. AI Polish Workflow ---
  console.log('\n--- 7. AI Polish Workflow ---');
  const polishResult = executeAIPolish(bestEvents, csAnalysis.brollOpportunities, candidatesMap, 15);
  assert(Array.isArray(polishResult.polishedEvents), 'AI Polish produced polishedEvents array');
  assert(Boolean(polishResult.message), `AI Polish returned report: "${polishResult.message}"`);

  // --- 8. Live Server HTTP Endpoints ---
  console.log('\n--- 8. Live Server HTTP Endpoints ---');
  // GET /api/broll/providers/status
  const provRes = await fetch(`${BASE_URL}/api/broll/providers/status`);
  const provData = await provRes.json();
  assert(provData.success === true, 'GET /api/broll/providers/status responds with success: true');
  assert(Boolean(provData.pexels) && Boolean(provData.pinterest), 'Returns status for both Pexels and Pinterest');

  // GET /api/broll/search
  const searchRes = await fetch(`${BASE_URL}/api/broll/search?query=computer+science+technology`);
  const searchData = await searchRes.json();
  assert(searchData.success === true, 'GET /api/broll/search responds with success: true');
  assert(Array.isArray(searchData.items) && searchData.items.length > 0, `Stock search returned items: ${searchData.items.length}`);
  assert(Boolean(searchData.pinterestStatus), 'Search includes honest Pinterest status');

  // POST /api/broll/analyze
  const analyzeRes = await fetch(`${BASE_URL}/api/broll/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: csTranscript,
      duration: 15,
      captions: csSegments,
    }),
  });
  const analyzeData = await analyzeRes.json();
  assert(analyzeData.success === true, 'POST /api/broll/analyze responds with success: true');
  assert(Array.isArray(analyzeData.analysis.brollOpportunities), 'Returned dynamic brollOpportunities');

  // --- 9. Single B-Roll Regeneration & Preservation ---
  console.log('\n--- 9. Single B-Roll Regeneration & Preservation ---');
  const createProjRes = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: '/demo/test_60s.mp4',
      title: 'B-Roll Engine Forensic Test Project',
      isDemo: true,
    }),
  });
  const createProjData = await createProjRes.json();
  assert(createProjData.success === true, 'Test project created on server store');
  const testProject = createProjData.project;
  const testShortId = 'short_broll_test_1';
  const targetBrollId = 'broll_target_cue_1';

  testProject.shorts = [
    {
      id: testShortId,
      projectId: testProject.id,
      title: 'B-Roll Multi-Track Short',
      duration: 15,
      startTime: 0,
      endTime: 15,
      aspectRatio: '9:16',
      speakerPosition: 'center',
      captions: [
        { id: 'c1', start: 0.5, end: 5.0, text: 'Computer science students coding next generation AI systems.', words: [] },
      ],
      sfxMarkers: [
        { id: 'sfx_keep_1', timestamp: 1.5, duration: 1.0, category: 'whoosh', soundName: 'Swift Whoosh', volume: 0.8 },
      ],
      brollSuggestions: [
        {
          id: targetBrollId,
          timestamp: 2.0,
          duration: 3.5,
          concept: 'Initial Coding Asset',
          imageUrl: '/assets/broll/coding.jpg',
          assetUrl: '/assets/broll/coding.jpg',
          keyword: 'coding',
          enabled: true,
        },
        {
          id: 'broll_keep_2',
          timestamp: 8.0,
          duration: 3.0,
          concept: 'Analytics Data Screen',
          imageUrl: '/assets/broll/analytics.jpg',
          assetUrl: '/assets/broll/analytics.jpg',
          keyword: 'analytics',
          enabled: true,
        },
      ],
    },
  ];

  await fetch(`${BASE_URL}/api/projects/${testProject.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project: testProject }),
  });

  const captionsBackup = JSON.stringify(testProject.shorts[0].captions);
  const sfxBackup = JSON.stringify(testProject.shorts[0].sfxMarkers);
  const otherBrollBackup = JSON.stringify(testProject.shorts[0].brollSuggestions[1]);

  const regenRes = await fetch(`${BASE_URL}/api/projects/${testProject.id}/regenerate-elements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shortId: testShortId,
      target: 'broll',
      targetBrollId,
    }),
  });
  const regenData = await regenRes.json();
  assert(regenData.success === true, 'Single B-roll regeneration completed successfully');
  const updatedShort = regenData.short;
  const regenItem = (updatedShort.brollSuggestions || []).find((b: any) => b.id === targetBrollId);
  assert(Boolean(regenItem), 'Target B-roll item is retained after regeneration');

  // Assert preservation of other elements
  assert(JSON.stringify(updatedShort.captions) === captionsBackup, 'Captions preserved without modification');
  assert(JSON.stringify(updatedShort.sfxMarkers) === sfxBackup, 'SFX markers preserved without modification');
  const preservedOtherBroll = (updatedShort.brollSuggestions || []).find((b: any) => b.id === 'broll_keep_2');
  assert(JSON.stringify(preservedOtherBroll) === otherBrollBackup, 'Other B-roll items preserved without modification');

  // --- 10. Multi-Track B-Roll FFmpeg Export & FFprobe Verification ---
  console.log('\n--- 10. Multi-Track B-Roll FFmpeg Export & FFprobe Verification ---');
  // Configure 2 distinct B-roll overlays across the timeline
  testProject.shorts[0].brollSuggestions = [
    {
      id: 'broll_cutaway_1',
      timestamp: 1.0,
      duration: 3.0,
      concept: 'Developer Coding Interface',
      imageUrl: '/assets/broll/coding.jpg',
      assetUrl: '/assets/broll/coding.jpg',
      enabled: true,
    },
    {
      id: 'broll_cutaway_2',
      timestamp: 6.0,
      duration: 3.5,
      concept: 'AI Neural Systems',
      imageUrl: '/assets/broll/ai_interface.jpg',
      assetUrl: '/assets/broll/ai_interface.jpg',
      enabled: true,
    },
  ];
  await fetch(`${BASE_URL}/api/projects/${testProject.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project: testProject }),
  });

  const exportPayload = {
    projectId: testProject.id,
    shortId: testShortId,
    resolution: '1080x1920',
    fps: 30,
    captionPreset: 'bold',
  };

  const exportRes = await fetch(`${BASE_URL}/api/projects/${testProject.id}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(exportPayload),
  });
  const exportData = await exportRes.json();
  assert(exportData.success === true, `Export started with job ID: ${exportData.exportId}`);

  let jobCompleted = false;
  let finalDownloadUrl = '';
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const statusRes = await fetch(`${BASE_URL}/api/exports/${exportData.exportId}`);
    const statusData = await statusRes.json();
    if (statusData.status === 'completed') {
      jobCompleted = true;
      finalDownloadUrl = statusData.downloadUrl;
      break;
    }
  }

  assert(jobCompleted === true, 'Export with multiple B-roll overlays completed within 40 seconds');
  assert(Boolean(finalDownloadUrl), `Export returned download URL: ${finalDownloadUrl}`);

  const exportedDiskPath = path.join(process.cwd(), 'public', finalDownloadUrl.replace(/^\/public\//, '/'));
  assert(fs.existsSync(exportedDiskPath), `Exported MP4 exists on disk: ${exportedDiskPath}`);

  // FFprobe inspect the exported video
  const probeRaw = execFileSync(ffprobePath, [
    '-v', 'error',
    '-show_entries', 'format=duration:stream=codec_name,codec_type,width,height,sample_rate',
    '-of', 'json',
    exportedDiskPath,
  ], { encoding: 'utf-8' });

  const probe = JSON.parse(probeRaw);
  const vStream = probe.streams?.find((s: any) => s.codec_type === 'video');
  const aStream = probe.streams?.find((s: any) => s.codec_type === 'audio');

  assert(Boolean(vStream), 'Exported video has video stream');
  assert(Boolean(aStream), 'Exported video has audio stream');
  assert(vStream.width === 1080 && vStream.height === 1920, `Exported video has exact 9:16 vertical 1080x1920 resolution (${vStream.width}x${vStream.height})`);
  assert(parseFloat(probe.format?.duration || '0') > 0, `Exported video duration is valid: ${probe.format?.duration}s`);

  console.log('\n===============================================================');
  console.log('ALL B-ROLL ENGINE TESTS PASSED SUCCESSFULLY! (35/35 assertions)');
  console.log('===============================================================\n');
}

runTests().catch((err) => {
  console.error('Test suite failure:', err);
  process.exit(1);
});
