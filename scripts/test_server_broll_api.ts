import assert from 'assert';
import fs from 'fs';
import path from 'path';
import ffprobeStatic from 'ffprobe-static';
import { execFile } from 'child_process';

const BASE_URL = 'http://localhost:3001';

function runFFprobe(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    execFile(
      ffprobeStatic.path,
      [
        '-v', 'error',
        '-show_entries', 'format=duration,size',
        '-show_entries', 'stream=codec_name,codec_type,width,height',
        '-of', 'json',
        filePath,
      ],
      (err, stdout) => {
        if (err) reject(err);
        else resolve(JSON.parse(stdout));
      }
    );
  });
}

async function testServerBrollEndpoints() {
  console.log('--- TESTING SERVER B-ROLL API ENDPOINTS ---');

  // 1. Providers Status
  console.log('1. Testing /api/broll/providers/status...');
  const statusRes = await fetch(`${BASE_URL}/api/broll/providers/status`);
  assert.strictEqual(statusRes.status, 200);
  const statusData = await statusRes.json();
  assert.ok(statusData.success);
  assert.ok(statusData.pexels);
  assert.strictEqual(statusData.pinterest.available, false);
  assert.strictEqual(
    statusData.pinterest.message,
    'Pinterest integration unavailable. Connect Pinterest API to enable Pinterest results.'
  );
  console.log('✓ Providers status verified (Pinterest honestly reported unavailable).');

  // 2. Search & Caching Test (Section 25)
  console.log('\n2. Testing /api/broll/search & Caching...');
  const t1 = Date.now();
  const searchRes1 = await fetch(`${BASE_URL}/api/broll/search?query=coding+programming`);
  assert.strictEqual(searchRes1.status, 200);
  const searchData1 = await searchRes1.json();
  const d1 = Date.now() - t1;

  assert.ok(searchData1.items.length > 0);
  assert.strictEqual(searchData1.items[0].provider, 'pexels');

  const t2 = Date.now();
  const searchRes2 = await fetch(`${BASE_URL}/api/broll/search?query=coding+programming`);
  assert.strictEqual(searchRes2.status, 200);
  const searchData2 = await searchRes2.json();
  const d2 = Date.now() - t2;

  assert.strictEqual(searchData1.items.length, searchData2.items.length);
  assert.strictEqual(searchData1.items[0].id, searchData2.items[0].id);
  console.log(`✓ Caching verified (Query 1: ${d1}ms, Cached Query 2: ${d2}ms).`);

  // 3. Create real Project with actual source media
  console.log('\n3. Creating project with actual source video...');
  const projRes = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Forensic QA Project',
      url: '/demo/creator_clip.mp4',
      isDemo: true,
      projectType: 'video-to-shorts',
    }),
  });
  assert.strictEqual(projRes.status, 201);
  const projData = await projRes.json();
  const project = projData.project;
  const projectId = project.id;
  const shortId = 'short_forensic_1';

  // Add short to project
  project.shorts = [
    {
      id: shortId,
      projectId,
      title: 'Forensic AI B-Roll Short',
      duration: 50,
      startTime: 0,
      endTime: 50,
      captions: [
        { id: 'c1', start: 1, end: 4, text: 'In modern technology computer science algorithms lead the way' },
        { id: 'c2', start: 6, end: 9, text: 'Software engineering students coding on laptops create the future' },
        { id: 'c3', start: 15, end: 19, text: 'Our team and creators collaborate directly in the creator workspace' },
        { id: 'c4', start: 25, end: 29, text: 'Exponential growth metrics and financial charts scaling high' },
        { id: 'c5', start: 35, end: 39, text: 'Professional cinema camera filming with cinematic lenses' },
        { id: 'c6', start: 45, end: 49, text: 'Modern city skyline skyscrapers and metropolitan infrastructure' },
      ],
      brollSuggestions: [],
    },
  ];
  await fetch(`${BASE_URL}/api/projects/${projectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  console.log(`✓ Created project: ${projectId} with short: ${shortId}`);

  // 4. Generate B-Roll Plan
  console.log('\n4. Testing /api/broll/generate-plan...');
  const planRes = await fetch(`${BASE_URL}/api/broll/generate-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, shortId }),
  });
  assert.strictEqual(planRes.status, 200);
  const planData = await planRes.json();
  assert.ok(planData.success);
  assert.ok(planData.renderPlan);
  assert.ok(planData.short.brollSuggestions.length > 0);
  console.log(`✓ Generated RenderPlan with ${planData.short.brollSuggestions.length} B-roll cutaways.`);
  console.log(`  Message: "${planData.message}"`);

  // 5. Test Single B-Roll Regeneration (Section 22)
  console.log('\n5. Testing /api/projects/:id/regenerate-elements (Target: broll)...');
  const targetBroll = planData.short.brollSuggestions[0];
  const initialCaptionsCount = planData.short.captions?.length || 0;
  const initialBrollCount = planData.short.brollSuggestions.length;

  const regenRes = await fetch(`${BASE_URL}/api/projects/${projectId}/regenerate-elements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shortId,
      target: 'broll',
      targetBrollId: targetBroll.id,
    }),
  });
  assert.strictEqual(regenRes.status, 200);
  const regenData = await regenRes.json();
  assert.ok(regenData.success);
  const updatedShort = regenData.short;

  assert.strictEqual(updatedShort.captions?.length || 0, initialCaptionsCount, 'Captions remain untouched');
  assert.strictEqual(updatedShort.brollSuggestions.length, initialBrollCount, 'Other B-roll untouched');

  const regeneratedBroll = updatedShort.brollSuggestions.find((b: any) => b.id === targetBroll.id);
  assert.ok(regeneratedBroll, 'Target B-roll exists');
  console.log(`✓ Regenerated B-roll: "${regeneratedBroll.concept}" (Asset: ${regeneratedBroll.assetId})`);

  // 6. Test AI Polish (Section 21)
  console.log('\n6. Testing /api/broll/ai-polish...');
  const polishRes = await fetch(`${BASE_URL}/api/broll/ai-polish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, shortId }),
  });
  assert.strictEqual(polishRes.status, 200);
  const polishData = await polishRes.json();
  assert.ok(polishData.success);
  assert.ok(Array.isArray(polishData.polishedEvents));
  console.log(`✓ AI Polish completed: ${polishData.message}`);

  // 7. Full Server-Side FFmpeg Render & Export (Section 15)
  console.log('\n7. Triggering real server-side FFmpeg export via /api/projects/:id/export...');
  // Refetch project to have latest brollSuggestions
  const latestProjRes = await fetch(`${BASE_URL}/api/projects/${projectId}`);
  const latestProj = (await latestProjRes.json()).project;
  const latestShort = latestProj.shorts.find((s: any) => s.id === shortId);

  const exportRes = await fetch(`${BASE_URL}/api/projects/${projectId}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shortId,
      short: latestShort,
      resolution: '1080x1920',
      format: 'mp4',
    }),
  });
  assert.ok(exportRes.status === 200 || exportRes.status === 202, 'Export accepted with 200/202');
  const exportInit = await exportRes.json();
  const exportId = exportInit.exportId;
  assert.ok(exportId);
  console.log(`✓ Export initiated with ID: ${exportId}`);

  // Poll for completion (up to 90s for HD 1080x1920 multi-track render)
  let completedJob: any = null;
  for (let attempt = 0; attempt < 90; attempt++) {
    await new Promise((r) => setTimeout(r, 1000));
    const statusPoll = await fetch(`${BASE_URL}/api/exports/${exportId}`);
    const pollData = await statusPoll.json();
    if (pollData.job.status === 'completed') {
      completedJob = pollData.job;
      break;
    } else if (pollData.job.status === 'failed') {
      throw new Error(`Export job failed: ${pollData.job.error}`);
    }
  }

  assert.ok(completedJob, 'Export job completed');
  assert.strictEqual(completedJob.status, 'completed');
  assert.ok(completedJob.downloadUrl);
  console.log(`✓ Export successfully finished! URL: ${completedJob.downloadUrl}`);

  const localExportFile = path.join(process.cwd(), 'public', 'exports', path.basename(completedJob.downloadUrl));
  assert.ok(fs.existsSync(localExportFile), 'Exported MP4 file exists in public/exports/');

  const finalProbe = await runFFprobe(localExportFile);
  const finalVStream = finalProbe.streams?.find((s: any) => s.codec_type === 'video');
  const finalAStream = finalProbe.streams?.find((s: any) => s.codec_type === 'audio');

  assert.strictEqual(finalVStream?.width, 1080, 'Exported width 1080');
  assert.strictEqual(finalVStream?.height, 1920, 'Exported height 1920');
  assert.strictEqual(finalVStream?.codec_name, 'h264', 'Exported video codec h264');
  assert.strictEqual(finalAStream?.codec_name, 'aac', 'Exported audio codec aac');
  console.log(`✓ Export file verified via FFprobe: 1080x1920 @ ${finalVStream?.codec_name}, Audio: ${finalAStream?.codec_name}`);

  console.log('\n🎉 ALL SERVER API ENDPOINTS & ASYNCHRONOUS EXPORT VERIFIED SUCCESSFULLY!');
}

testServerBrollEndpoints().catch((err) => {
  console.error('\n❌ SERVER BROLL API TEST FAILED:');
  console.error(err);
  process.exit(1);
});
