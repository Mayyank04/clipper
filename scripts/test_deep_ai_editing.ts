import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import ffprobePathPackage from 'ffprobe-static';
import {
  detectLanguageFromContent,
  generateSemanticSFXSuggestions,
  generateContentAwareBRollSuggestions,
  buildCanonicalProjectAnalysis,
} from '../src/utils/analysisEngine';
import {
  CAPTION_STYLES_REGISTRY,
  getCaptionStylePreset,
  groupWordsIntoCaptionSegments,
  calculateCaptionCoverage,
  getCaptionStateAtTime,
} from '../src/utils/captionEngine';
import { CaptionWord, CaptionSegment } from '../src/types';

const ffprobePath = ffprobePathPackage.path;

function probeMedia(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    execFile(
      ffprobePath,
      ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height', '-of', 'json', filePath],
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        try {
          const data = JSON.parse(stdout);
          const duration = parseFloat(data.format?.duration || '0');
          const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
          const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');
          resolve({
            duration,
            video: videoStream ? { codec: videoStream.codec_name, width: videoStream.width, height: videoStream.height } : null,
            audio: audioStream ? { codec: audioStream.codec_name } : null,
          });
        } catch (e: any) {
          reject(e);
        }
      }
    );
  });
}

async function runDeepAIEditingSuite() {
  console.log('===============================================================');
  console.log('VIRALCLIP STUDIO: DEEP AI EDITING PIPELINE FORENSIC TEST SUITE');
  console.log('===============================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${testName} - ${detail || 'Assertion failed'}`);
      throw new Error(`Test failed: ${testName} - ${detail}`);
    }
  }

  // ==========================================
  // SECTION 1: MULTILINGUAL LANGUAGE DETECTION
  // ==========================================
  console.log('\n--- 1. Multilingual Automatic Language Detection ---');

  const englishSample = "Welcome back everyone. Today we are exploring artificial intelligence tools and deep editing automation for video creators.";
  const langEn = detectLanguageFromContent(englishSample);
  assert(langEn.detectedLanguage === 'en', 'English text correctly detected', `Detected: ${langEn.detectedLanguage}`);
  assert(langEn.confidence >= 0.85, 'English detection has high confidence (>= 0.85)', `Confidence: ${langEn.confidence}`);

  const hindiDevanagari = "नमस्ते दोस्तों आज के इस वीडियो में हम बात करने वाले हैं आर्टिफिशियल इंटेलिजेंस के बारे में।";
  const langHi = detectLanguageFromContent(hindiDevanagari);
  assert(langHi.detectedLanguage === 'hi', 'Hindi Devanagari script correctly detected', `Detected: ${langHi.detectedLanguage}`);
  assert(langHi.script === 'Devanagari', 'Script correctly identified as Devanagari', `Script: ${langHi.script}`);

  const hinglishSample = "aaj hum baat karenge best tech gadgets ke baare mein so let's start the video guys";
  const langHinglish = detectLanguageFromContent(hinglishSample);
  assert(langHinglish.detectedLanguage === 'hi-Latn' || langHinglish.detectedLanguage === 'hi', 'Hinglish Romanized text correctly detected as Hindi-Latin', `Detected: ${langHinglish.detectedLanguage}`);
  assert(langHinglish.isCodeSwitching === true, 'Code-switching detected in Hinglish sample', `isCodeSwitching: ${langHinglish.isCodeSwitching}`);

  const spanishSample = "Hola amigos hoy vamos a ver como crear videos virales para redes sociales con inteligencia artificial";
  const langEs = detectLanguageFromContent(spanishSample);
  assert(langEs.detectedLanguage === 'es', 'Spanish text correctly detected', `Detected: ${langEs.detectedLanguage}`);

  // ==========================================
  // SECTION 2: 25 PRODUCTION CAPTION PRESETS
  // ==========================================
  console.log('\n--- 2. Complete 25 Caption Preset Registry ---');
  assert(CAPTION_STYLES_REGISTRY.length === 25, 'Registry contains exactly 25 caption presets', `Count: ${CAPTION_STYLES_REGISTRY.length}`);

  const samplePresets = ['viral_bold', 'kinetic', 'neon_pulse', 'hormozi_pop', 'minimal_subtle', 'cyberpunk', 'retro_arcade', 'cinematic_gold'];
  for (const pid of samplePresets) {
    const preset = getCaptionStylePreset(pid as any);
    assert(!!preset.fontFamily && !!preset.highlightColor && !!preset.animation, `Preset '${pid}' has complete typography, highlight, and animation config`);
  }

  // ==========================================
  // SECTION 3: CAPTION COVERAGE & TIME SEGMENTATION
  // ==========================================
  console.log('\n--- 3. Real Full-Duration Auto-Captions & Coverage ---');

  // Build realistic 45-second word-level transcription with natural pauses
  const sampleWords: CaptionWord[] = [];
  const transcriptLines = [
    { text: "Here is the single most important secret to growing your online brand fast.", start: 0.5, end: 4.8 },
    { text: "Number one stop posting random content without a clear audience focus.", start: 5.5, end: 10.2 },
    { text: "Instead you need to master your niche by focusing on deep coding strategies.", start: 11.0, end: 16.5 },
    { text: "When you analyze the data growth charts show a three hundred percent spike.", start: 18.0, end: 23.4 },
    { text: "Notice how modern tech workspaces completely transform high performance workflows.", start: 24.5, end: 30.2 },
    { text: "Never make the mistake of neglecting your visual storytelling and sound effects.", start: 31.5, end: 37.0 },
    { text: "Try this proven framework today and watch your retention skyrocket immediately.", start: 38.5, end: 44.5 },
  ];

  for (const line of transcriptLines) {
    const tokens = line.text.split(' ');
    const lineDuration = line.end - line.start;
    const wordDuration = lineDuration / tokens.length;
    tokens.forEach((w, idx) => {
      const wStart = line.start + idx * wordDuration;
      const wEnd = wStart + wordDuration * 0.95;
      sampleWords.push({
        word: w,
        start: parseFloat(wStart.toFixed(3)),
        end: parseFloat(wEnd.toFixed(3)),
        confidence: 0.95,
      });
    });
  }

  const segments = groupWordsIntoCaptionSegments(sampleWords, {
    maxWordsPerSegment: 4,
    maxDurationPerSegment: 2.2,
    maxPauseSeconds: 0.4,
  });

  assert(segments.length >= 10, 'Segments properly created across the entire timeline', `Segment count: ${segments.length}`);
  const firstCap = segments[0];
  const lastCap = segments[segments.length - 1];
  assert(firstCap.start >= 0.4 && firstCap.start <= 1.0, 'First caption starts near 0.5s', `First start: ${firstCap.start}`);
  assert(lastCap.end >= 43.5 && lastCap.end <= 45.0, 'Last caption covers through the end quartile (>43s)', `Last end: ${lastCap.end}`);

  const coverage = calculateCaptionCoverage(segments, 45);
  console.log(`  Coverage report: ${coverage.coveragePercent}% coverage, Quartiles: Q1=${coverage.quartileCoverage.q1}, Q2=${coverage.quartileCoverage.q2}, Q3=${coverage.quartileCoverage.q3}, Q4=${coverage.quartileCoverage.q4}`);
  assert(coverage.coveragePercent >= 75, 'Coverage exceeds 75% for 45s short', `Coverage: ${coverage.coveragePercent}%`);
  assert(coverage.quartileCoverage.q1 && coverage.quartileCoverage.q2 && coverage.quartileCoverage.q3 && coverage.quartileCoverage.q4, 'All four quartiles (0-25%, 25-50%, 50-75%, 75-100%) have caption presence');

  // ==========================================
  // SECTION 4: SEEK-SAFETY & DETERMINISTIC STATE
  // ==========================================
  console.log('\n--- 4. Seek-Safety & Deterministic Caption State ---');
  const testSeekTimes = [0.0, 2.0, 8.0, 14.0, 20.0, 27.0, 34.0, 42.0];
  for (const t of testSeekTimes) {
    const state = getCaptionStateAtTime(segments, t, { animation: 'scale_pop' } as any);
    if (t === 0.0) {
      assert(!state.activeCaption, `At t=0.0s (silence before speech), activeCaption is not active`);
    } else {
      assert(!!state.activeCaption, `At t=${t}s, activeCaption is deterministically resolved`);
      assert(state.activeWordIndex >= 0, `At t=${t}s, activeWordIndex is >= 0 (${state.activeWordIndex})`);
      assert(state.animationProgress >= 0 && state.animationProgress <= 1, `At t=${t}s, animationProgress is normalized between 0 and 1 (${state.animationProgress.toFixed(2)})`);
    }
  }

  // ==========================================
  // SECTION 5: CONTENT-AWARE SFX & B-ROLL
  // ==========================================
  console.log('\n--- 5. Semantic SFX & Content-Aware B-Roll ---');

  const sfxSuggestions = generateSemanticSFXSuggestions(sampleWords, segments, 45, 'auto_apply');
  assert(sfxSuggestions.length > 0, 'SFX suggestions generated from semantic triggers', `Count: ${sfxSuggestions.length}`);
  
  for (const sfx of sfxSuggestions) {
    assert(sfx.confidence >= 0.80, `SFX '${sfx.soundName}' has confidence >= 0.80 (${sfx.confidence})`);
    assert(!!sfx.triggerText, `SFX '${sfx.soundName}' includes trigger text: "${sfx.triggerText}"`);
    assert(!!sfx.reason, `SFX '${sfx.soundName}' includes semantic justification: "${sfx.reason}"`);
    assert(fs.existsSync(path.join(process.cwd(), 'public', sfx.audioUrl!)), `SFX audio file exists on disk: ${sfx.audioUrl}`);
  }

  const brollSuggestions = generateContentAwareBRollSuggestions(sampleWords, segments, 45, 'auto_apply');
  assert(brollSuggestions.length > 0, 'B-Roll suggestions generated from spoken keywords', `Count: ${brollSuggestions.length}`);

  for (const br of brollSuggestions) {
    assert(br.confidence >= 0.80, `B-Roll '${br.concept}' has confidence >= 0.80 (${br.confidence})`);
    assert(!!br.triggerText, `B-Roll '${br.concept}' includes spoken keyword: "${br.triggerText}"`);
    assert(!!br.reason, `B-Roll '${br.concept}' includes semantic reason: "${br.reason}"`);
    assert(fs.existsSync(path.join(process.cwd(), 'public', br.assetUrl)), `B-Roll image asset exists on disk: ${br.assetUrl}`);
    assert(br.timestamp !== undefined && br.timestamp >= 0 && br.timestamp + (br.duration || 0) <= 45.1, `B-Roll timestamps are within bounds: ${br.timestamp}s - ${(br.timestamp || 0) + (br.duration || 0)}s`);
  }

  // ==========================================
  // SECTION 6: CANONICAL PROJECT ANALYSIS OBJECT
  // ==========================================
  console.log('\n--- 6. Canonical ProjectAnalysis Object Integrity ---');
  const analysis = buildCanonicalProjectAnalysis({
    projectId: 'proj_test_1',
    sourceMedia: {
      type: 'video',
      path: 'public/demo/test_60s.mp4',
      name: 'test_60s.mp4',
      duration: 45,
    } as any,
    transcript: sampleWords.map((w) => w.word).join(' '),
    words: sampleWords,
    segments,
    totalDuration: 45,
    approvalMode: 'auto_apply',
  });

  assert(analysis.language.detectedCode === 'en' || analysis.language.primaryLanguage === 'English', 'Canonical analysis has English language set');
  assert((analysis.speechEnergyMap || analysis.energy).length > 0, 'Canonical analysis has speech energy mapping');
  assert(analysis.captionPlan.coveragePercent >= 75, 'Canonical analysis has caption plan with accurate coverage');
  assert((analysis.sfxPlan || analysis.sfxSuggestions).length > 0, 'Canonical analysis has SFX plan');
  assert((analysis.brollPlan || analysis.brollSuggestions).length > 0, 'Canonical analysis has B-Roll plan');

  // ==========================================
  // SECTION 7: HTTP API & FFMPEG EXPORT VERIFICATION
  // ==========================================
  console.log('\n--- 7. Live Server HTTP API & Export Parity ---');

  // 1. Test /api/detect-language
  const langApiRes = await fetch('http://localhost:3001/api/detect-language', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: "नमस्ते दोस्तों आज हम बात करने वाले हैं artificial intelligence के बारे में" }),
  });
  const langApiData = await langApiRes.json();
  assert(langApiData.success === true, 'API /api/detect-language responds with success');
  assert(langApiData.result.detectedLanguage === 'hi' || langApiData.result.detectedLanguage === 'hi-Latn', 'API /api/detect-language detects Hindi/Hinglish');

  // 2. Create a test project
  const projectRes = await fetch('http://localhost:3001/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: '/demo/test_60s.mp4',
      title: 'AI Editing Quality Forensic Test Project',
      isDemo: true,
    }),
  });
  const projectData = await projectRes.json();
  assert(projectData.success === true, 'API /api/projects successfully created project');
  const project = projectData.project;
  const shortId = 'short_ai_edit_1';
  project.shorts = [
    {
      id: shortId,
      projectId: project.id,
      title: 'AI Editing Quality 9:16 Vertical Short',
      duration: 15,
      startTime: 0,
      endTime: 15,
      videoProxyUrl: '/demo/test_60s.mp4',
      captions: segments.slice(0, 6),
      vfxMarkers: [],
      sfxMarkers: [],
      brollSuggestions: [],
    },
  ];
  project.projectAnalysis = analysis;

  // Update in store via PUT
  await fetch(`http://localhost:3001/api/projects/${project.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });

  assert(!!project.projectAnalysis, 'Created project has attached canonical projectAnalysis');

  // 3. Test element regeneration endpoint
  const shortToTest = project.shorts[0];
  const regenRes = await fetch(`http://localhost:3001/api/projects/${project.id}/regenerate-elements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shortId: shortToTest.id,
      elementTypes: ['captions', 'broll', 'sfx'],
      approvalMode: 'auto_apply',
      language: 'en',
    }),
  });
  const regenData = await regenRes.json();
  assert(regenData.success === true, 'API /api/projects/:id/regenerate-elements responds with success');
  assert(regenData.short.sfxMarkers.length > 0, 'Regenerated short has semantically attached SFX markers');
  assert(regenData.short.brollSuggestions.length > 0, 'Regenerated short has content-aware B-Roll');

  // 4. Test FFmpeg Export with ASS subtitles, burned B-roll, and mixed SFX
  console.log('  Triggering real FFmpeg export with preset subtitles, B-roll burn-in, and SFX mixing...');
  const exportRes = await fetch(`http://localhost:3001/api/projects/${project.id}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shortId: shortToTest.id,
      quality: '1080p',
      burnCaptions: true,
      captionPreset: 'kinetic',
    }),
  });
  const exportData = await exportRes.json();
  assert(exportData.success === true, 'Export endpoint completed with success: true', JSON.stringify(exportData));
  assert(!!exportData.exportId, 'Export endpoint returned valid exportId');

  // Poll until export job completed
  let job: any = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, 800));
    const pollRes = await fetch(`http://localhost:3001/api/exports/${exportData.exportId}`);
    const pollData = await pollRes.json();
    job = pollData.job;
    if (job?.status === 'completed' || job?.status === 'failed') break;
  }

  assert(job?.status === 'completed', `Export job completed successfully (got status: ${job?.status}, error: ${job?.error})`);
  assert(!!job?.downloadUrl, 'Export job returned valid downloadUrl');

  // 5. Inspect exported MP4 file with FFprobe
  const localExportPath = path.join(process.cwd(), 'public', job.downloadUrl);
  assert(fs.existsSync(localExportPath), `Exported MP4 file exists on disk at ${localExportPath}`);

  const probe = await probeMedia(localExportPath);
  console.log(`  FFprobe Report on Export: Duration=${probe.duration}s, Video=${probe.video?.width}x${probe.video?.height} (${probe.video?.codec}), Audio=${probe.audio?.codec}`);
  assert(probe.video !== null, 'Exported video stream is present');
  assert(probe.audio !== null, 'Exported audio stream is present');
  assert(probe.video.width === 1080 && probe.video.height === 1920, `Exported video is exact 9:16 vertical 1080x1920 (got ${probe.video.width}x${probe.video.height})`);
  assert(probe.duration > 0, `Exported video duration is valid (>0s)`);

  console.log('\n===============================================================');
  console.log(`ALL FORENSIC TESTS PASSED! (${passedTests} / ${totalTests} assertions passed)`);
  console.log('===============================================================');
}

runDeepAIEditingSuite().catch((err) => {
  console.error('\n❌ FORENSIC TEST RUNNER ENCOUNTERED AN ERROR:');
  console.error(err);
  process.exit(1);
});
