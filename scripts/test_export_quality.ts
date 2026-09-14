/**
 * VIRALCLIP STUDIO — TEST SUITE: EXPORT QUALITY & FORENSIC FRAMES (PART AH, BJ, AP)
 * Wrapper executing the export visual quality test suite.
 */

import { spawn } from 'child_process';
import path from 'path';

console.log('Running Export Quality & Forensic Frame Inspection (Part AH, BJ, AP)...');
const scriptPath = path.join(process.cwd(), 'scripts', 'test_export_visual_quality.ts');
const proc = spawn('npx', ['tsx', scriptPath], { stdio: 'inherit' });

proc.on('close', (code) => {
  if (code !== 0) {
    console.error(`Export quality test failed with code ${code}`);
    process.exit(code || 1);
  }
  console.log('Export Quality Verification Completed Successfully ✓');
  process.exit(0);
});
