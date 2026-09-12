import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import ffmpegPath from 'ffmpeg-static';
import ffprobePathPackage from 'ffprobe-static';
import {
  createEditorProject,
  splitEditorProject,
  deleteEditorClip,
  trimEditorProject,
  updateShortFromEditor,
} from '../src/utils/canonicalEditor';
import { ShortCandidate, VideoProject } from '../src/types';

const ffprobePath = ffprobePathPackage.path;

function probeMedia(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    execFile(
      ffprobePath,
      ['-v', 'error', '-show_entries', 'format=duration,size,bit_rate:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels', '-of', 'json', filePath],
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
            audio: audioStream ? { codec: audioStream.codec_name, sampleRate: audioStream.sample_rate } : null,
          });
        } catch (e: any) {
          reject(e);
        }
      }
    );
  });
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(ffmpegPath!, args, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve();
    });
  });
}

async function runTests() {
  console.log('=== VIRALCLIP STUDIO ENGINE VERIFICATION ===\n');

  // Test 1: Native FFprobe on test media
  console.log('1. Probing test media files:');
  const mediaFiles = [
    'public/demo/test_10s.mp3',
    'public/demo/test_60s.mp3',
    'public/demo/test_60s.mp4',
    'public/demo/test_180s.mp4',
  ];

  for (const relPath of mediaFiles) {
    const absPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(absPath)) {
      console.error(`❌ File not found: ${relPath}`);
      process.exit(1);
    }
    const info = await probeMedia(absPath);
    console.log(`  ✓ ${relPath}: duration=${info.duration.toFixed(2)}s | video=${info.video ? `${info.video.width}x${info.video.height} (${info.video.codec})` : 'none'} | audio=${info.audio ? `${info.audio.codec}` : 'none'}`);
  }

  // Test 2: Canonical Editor Project Operations
  console.log('\n2. Testing Canonical Editor Project:');
  const mockProject: VideoProject = {
    id: 'proj_test_1',
    youtubeUrl: 'https://youtube.com/watch?v=mock',
    originalTitle: 'Test 60s Video',
    channelName: 'Test Channel',
    originalDuration: 60,
    originalThumbnail: '',
    videoUrl: '/demo/test_60s.mp4',
    createdAt: new Date().toISOString(),
    status: 'ready',
    shorts: [],
  };

  const mockShort: ShortCandidate = {
    id: 'short_test_1',
    projectId: 'proj_test_1',
    title: 'Epic Highlight',
    description: 'A great clip',
    hashtags: ['#viral', '#shorts'],
    keywords: ['epic'],
    viralScore: {
      overall: 95,
      breakdown: { hook: 92, retention: 90, emotion: 94, value: 95, pacing: 90, shareability: 96, clarity: 92, contextCompleteness: 94 },
      summary: 'High potential viral clip',
    },
    duration: 30,
    startTime: 10,
    endTime: 40,
    topic: 'Tech',
    thumbnail: '',
    videoProxyUrl: '/demo/test_60s.mp4',
    hookText: 'You will not believe this!',
    hookCategory: 'shock',
    captions: [
      { id: 'c1', start: 2, end: 5, text: 'You will not believe this', words: [] },
      { id: 'c2', start: 12, end: 18, text: 'Look at how this works', words: [] },
      { id: 'c3', start: 22, end: 28, text: 'Subscribe for more updates', words: [] },
    ],
    sfxMarkers: [{ id: 's1', timestamp: 2, category: 'whoosh', soundName: 'Fast Whoosh', volume: 0.8 }],
    vfxMarkers: [{ id: 'v1', timestamp: 2, duration: 1.5, type: 'zoom_punch' }],
    brollSuggestions: [{ id: 'b1', timestamp: 15, duration: 3, concept: 'Code editor', imageUrl: 'https://example.com/broll.jpg', enabled: true }],
  };

  const editor = createEditorProject(mockProject, mockShort);
  console.log(`  ✓ Initialized EditorProject: sequence duration=${editor.sequence.duration}s, videoTracks=${editor.videoTracks.length}`);

  // Test Split
  const splitEditor = splitEditorProject(editor, 15);
  console.log(`  ✓ Split at 15s: videoTracks count=${splitEditor.videoTracks.length}`);
  if (splitEditor.videoTracks.length !== 2) {
    throw new Error('Split did not create 2 clips');
  }
  console.log(`    Clip 1: timelineStart=${splitEditor.videoTracks[0].timelineStart}s, timelineEnd=${splitEditor.videoTracks[0].timelineEnd}s, sourceStart=${splitEditor.videoTracks[0].sourceStart}s, sourceEnd=${splitEditor.videoTracks[0].sourceEnd}s`);
  console.log(`    Clip 2: timelineStart=${splitEditor.videoTracks[1].timelineStart}s, timelineEnd=${splitEditor.videoTracks[1].timelineEnd}s, sourceStart=${splitEditor.videoTracks[1].sourceStart}s, sourceEnd=${splitEditor.videoTracks[1].sourceEnd}s`);

  // Test Delete Clip
  const clip2Id = splitEditor.videoTracks[1].id;
  const deletedEditor = deleteEditorClip(splitEditor, clip2Id);
  console.log(`  ✓ Deleted Clip 2: remaining videoTracks=${deletedEditor.videoTracks.length}, new sequence duration=${deletedEditor.sequence.duration}s`);
  if (deletedEditor.sequence.duration !== 15) {
    throw new Error(`Expected sequence duration 15s after deleting Clip 2, got ${deletedEditor.sequence.duration}s`);
  }

  // Test Trim
  const trimmed = trimEditorProject(editor, 5, 25);
  console.log(`  ✓ Trimmed EditorProject (5s -> 25s): duration=${trimmed.sequence.duration}s, remaining captions=${trimmed.captionTrack.length}`);

  // Test 3: Real FFmpeg 9:16 Vertical Video Export
  console.log('\n3. Testing Real FFmpeg 9:16 Vertical Export:');
  const outDir = path.resolve(process.cwd(), 'scratch_test');
  fs.mkdirSync(outDir, { recursive: true });
  const outVideo = path.join(outDir, 'test_rendered_9x16.mp4');

  // Render a 5-second 9:16 vertical clip from test_60s.mp4
  const inputVideo = path.resolve(process.cwd(), 'public/demo/test_60s.mp4');
  console.log('  Rendering 9:16 vertical crop with FFmpeg...');
  await runFfmpeg([
    '-y',
    '-ss', '10',
    '-t', '5',
    '-i', inputVideo,
    '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-c:a', 'aac',
    '-b:a', '128k',
    outVideo,
  ]);

  const renderedInfo = await probeMedia(outVideo);
  console.log(`  ✓ Rendered video verified: ${renderedInfo.video.width}x${renderedInfo.video.height} (aspect: ${(renderedInfo.video.width / renderedInfo.video.height).toFixed(3)}), duration=${renderedInfo.duration.toFixed(2)}s`);
  if (renderedInfo.video.width !== 1080 || renderedInfo.video.height !== 1920) {
    throw new Error('Rendered video is not 1080x1920 9:16 vertical');
  }

  // Test 4: Real FFmpeg Audio-to-Video Waveform Export
  console.log('\n4. Testing Real FFmpeg Audio-to-Video Waveform Export:');
  const outAudioVideo = path.join(outDir, 'test_audio_rendered_9x16.mp4');
  const inputAudio = path.resolve(process.cwd(), 'public/demo/test_10s.mp3');

  console.log('  Rendering audio-to-video with reactive waveform...');
  await runFfmpeg([
    '-y',
    '-ss', '0',
    '-t', '4',
    '-i', inputAudio,
    '-filter_complex',
    '[0:a]showwaves=s=1080x360:mode=line:colors=0xfacc15[wave];color=c=0x0a0a0a:s=1080x1920:d=4[bg];[bg][wave]overlay=(W-w)/2:(H-h)/2[v]',
    '-map', '[v]',
    '-map', '0:a',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-c:a', 'aac',
    outAudioVideo,
  ]);

  const audioRenderedInfo = await probeMedia(outAudioVideo);
  console.log(`  ✓ Audio-to-video render verified: ${audioRenderedInfo.video.width}x${audioRenderedInfo.video.height}, duration=${audioRenderedInfo.duration.toFixed(2)}s, audio codec=${audioRenderedInfo.audio.codec}`);
  if (audioRenderedInfo.video.width !== 1080 || audioRenderedInfo.video.height !== 1920) {
    throw new Error('Audio render is not 1080x1920 9:16 vertical');
  }

  // Cleanup scratch directory
  fs.rmSync(outDir, { recursive: true, force: true });
  console.log('\n🎉 ALL ENGINE VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
