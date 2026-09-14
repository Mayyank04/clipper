/**
 * VIRALCLIP STUDIO — TEST SUITE: SFX & 5-TRACK AUDIO MIXING (PART AA & AB)
 * Wrapper executing the full forensic SFX test suite.
 */

import { spawn } from 'child_process';
import path from 'path';

console.log('Running SFX & 5-Track Audio Verification (Part AA & AB)...');
const scriptPath = path.join(process.cwd(), 'scripts', 'test_sfx_system.ts');
const proc = spawn('npx', ['tsx', scriptPath], { stdio: 'inherit' });

proc.on('close', (code) => {
  if (code !== 0) {
    console.error(`SFX test failed with code ${code}`);
    process.exit(code || 1);
  }
  console.log('SFX & 5-Track Audio Verification Completed Successfully ✓');
  process.exit(0);
});
