import { TranscriptionManager } from '../src/utils/transcription/TranscriptionManager';

async function main() {
  console.log('Testing TranscriptionManager & LocalWhisperProvider on real speech...');
  const manager = TranscriptionManager.getInstance();

  const health = await manager.getProvidersHealth();
  console.log('Provider Health:', JSON.stringify(health, null, 2));

  // 'Me at the zoo' 18s continuous speech
  const testAudio = 'public/uploads/yt_jNQXAC9IVRw_1789218491389.mp4';
  console.log(`Transcribing ${testAudio}...`);
  const result = await manager.transcribe({
    sourceMediaPath: testAudio,
    startTime: 0,
    duration: 18,
    language: 'auto',
    onProgress: (stage, msg, pct) => {
      console.log(`[Stage: ${stage}] ${msg} (${pct}%)`);
    },
  });

  console.log('\n--- Real Transcription Result ---');
  console.log('Provider Used:', result.providerUsed);
  console.log('Model:', result.model);
  console.log('Device:', result.device);
  console.log('Language:', result.language);
  console.log('Word Count:', result.canonicalTranscript.words.length);
  console.log('Captions Count:', result.captions.length);
  console.log('Speech Coverage:', result.speechCoverage);
  console.log('First 5 Words:', result.canonicalTranscript.words.slice(0, 5));
  console.log('First Caption:', result.captions[0]);
  console.log('Auto Script Sections Count:', result.scriptSections.length);
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
