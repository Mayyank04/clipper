import { execFile } from 'child_process';
import path from 'path';
import ffprobePathPackage from 'ffprobe-static';

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
          resolve({
            duration,
            video: videoStream ? { codec: videoStream.codec_name, width: videoStream.width, height: videoStream.height } : null,
          });
        } catch (e: any) {
          reject(e);
        }
      }
    );
  });
}

async function testServerExport() {
  console.log('--- Testing End-to-End Server Project Export via FFmpeg ---');

  // 1. Create project
  const createRes = await fetch('http://localhost:3001/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: '/demo/test_60s.mp4',
      title: 'E2E Test Project',
      isDemo: true,
    }),
  });

  const createData = await createRes.json();
  if (!createData.success) {
    throw new Error(`Failed to create project: ${JSON.stringify(createData)}`);
  }
  const project = createData.project;
  console.log(`✓ Project created: id=${project.id}, videoUrl=${project.videoUrl}`);

  // 2. Put short into project
  const shortId = 'short_e2e_1';
  project.shorts = [
    {
      id: shortId,
      projectId: project.id,
      title: 'Server FFmpeg Vertical Short',
      duration: 5,
      startTime: 5,
      endTime: 10,
      videoProxyUrl: '/demo/test_60s.mp4',
      captions: [
        { id: 'c1', start: 1, end: 4, text: 'Real Burned-in Subtitles', words: [] }
      ],
      vfxMarkers: [],
      sfxMarkers: [],
      brollSuggestions: [],
    }
  ];

  // Update project in server memory via PUT
  await fetch(`http://localhost:3001/api/projects/${project.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });

  // 3. Trigger server FFmpeg export
  console.log('✓ Triggering /api/projects/:id/export ...');
  const exportRes = await fetch(`http://localhost:3001/api/projects/${project.id}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shortId,
      short: project.shorts[0],
      resolution: '1080x1920',
      format: 'mp4',
    }),
  });

  const exportData = await exportRes.json();
  console.log(`✓ Export initiated: exportId=${exportData.exportId}`);

  // 4. Poll export status
  let attempts = 0;
  let job: any = null;
  while (attempts < 30) {
    attempts++;
    await new Promise((r) => setTimeout(r, 600));
    const pollRes = await fetch(`http://localhost:3001/api/exports/${exportData.exportId}`);
    const pollData = await pollRes.json();
    job = pollData.job;
    console.log(`  Polling attempt ${attempts}: status=${job?.status}, progress=${job?.progress}%`);
    if (job?.status === 'completed' || job?.status === 'failed') break;
  }

  if (!job || job.status !== 'completed') {
    throw new Error(`Export did not complete successfully: ${JSON.stringify(job)}`);
  }

  console.log(`✓ Export completed! Download URL: ${job.downloadUrl}`);

  // 5. Probe the exported file on disk
  const exportedFilePath = path.join(process.cwd(), 'public', job.downloadUrl.replace(/^\//, ''));
  const probeInfo = await probeMedia(exportedFilePath);
  console.log(`✓ Probed exported file: ${probeInfo.video.width}x${probeInfo.video.height} (aspect 9:16), duration=${probeInfo.duration.toFixed(2)}s`);

  if (probeInfo.video.width !== 1080 || probeInfo.video.height !== 1920) {
    throw new Error('Exported video dimensions are not 1080x1920');
  }

  console.log('\n🎉 End-to-end server FFmpeg export verified successfully!');
}

testServerExport().catch((err) => {
  console.error('Server export test failed:', err);
  process.exit(1);
});
