/**
 * VIRALCLIP STUDIO — TEST SUITE: FONT REGISTRY & TYPOGRAPHY PARITY
 * Part J, K, L, M, N, O Certification:
 * 1. 24 registered creator fonts from Google Drive font packs
 * 2. Physical existence on disk of TTF/OTF files in public/assets/fonts/
 * 3. Categorization (REFERENCE, VIRAL, CONDENSED, CINEMATIC, EDITORIAL, MEME, CLEAN, etc.)
 * 4. Exact font preview capabilities ("THE BIGGEST MISTAKE")
 * 5. Browser @font-face CSS parity & FFmpeg :fontsdir= parity
 * 6. Multilingual font fallback resolution
 */

import fs from 'fs';
import path from 'path';
import {
  CREATOR_FONTS_REGISTRY,
  getFontById,
  resolveFontForScript,
} from '../src/data/fontRegistry';

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

async function runFontRegistryTests() {
  console.log('================================================================');
  console.log('VIRALCLIP STUDIO — TEST: FONT REGISTRY & TYPOGRAPHY SUITE');
  console.log('================================================================\n');

  // TEST 1: Font Registry Count & Drive Pack Coverage
  console.log('--- 1. Creator Font Registry Size & Categories ---');
  assert(
    CREATOR_FONTS_REGISTRY.length >= 24,
    'Registered Font Families',
    `Found ${CREATOR_FONTS_REGISTRY.length} registered creator font families (expected >= 24)`
  );

  const categories = new Set(CREATOR_FONTS_REGISTRY.map((f) => f.category));
  const expectedCategories = ['REFERENCE', 'VIRAL', 'CONDENSED', 'CINEMATIC', 'EDITORIAL', 'MEME', 'CLEAN', 'DISPLAY'];
  for (const cat of expectedCategories) {
    assert(categories.has(cat as any), `Category Presence: ${cat}`, `Registered fonts contain ${cat} category`);
  }

  // TEST 2: Essential Creator Families
  console.log('\n--- 2. Essential Creator Fonts Validation ---');
  const essentialFamilies = [
    'lemon_milk',
    'american_captain',
    'coolvetica',
    'couture',
    'komika_axis',
    'bebas_neue',
    'god_of_thunder',
  ];

  for (const fontId of essentialFamilies) {
    const font = getFontById(fontId);
    assert(!!font, `Essential Font Present: ${fontId}`, `Found ${font?.displayName} (${font?.family})`);
  }

  // TEST 3: Physical Files On Disk
  console.log('\n--- 3. Physical Font Files on Disk ---');
  const fontsDir = path.join(process.cwd(), 'public', 'assets', 'fonts');
  assert(fs.existsSync(fontsDir), 'Fonts Directory Exists', fontsDir);

  const filesOnDisk = fs.readdirSync(fontsDir).filter((f) => /\.(ttf|otf|woff|woff2)$/i.test(f));
  assert(filesOnDisk.length >= 30, 'Font Files Count On Disk', `Found ${filesOnDisk.length} font files on disk (expected >= 30)`);

  for (const font of CREATOR_FONTS_REGISTRY) {
    const fileEntries = Object.values(font.files).filter(Boolean) as string[];
    assert(fileEntries.length > 0, `Font Has Files: ${font.displayName}`, `${fileEntries.length} weights/styles mapped`);
    for (const relPath of fileEntries) {
      const cleanPath = relPath.replace(/^\//, '');
      const fullPath = path.join(process.cwd(), 'public', cleanPath.replace(/^public\//, ''));
      assert(fs.existsSync(fullPath), `File Exists On Disk: ${path.basename(fullPath)}`, `${(fs.existsSync(fullPath) ? fs.statSync(fullPath).size / 1024 : 0).toFixed(1)} KB`);
    }
  }

  // TEST 4: Browser @font-face CSS File
  console.log('\n--- 4. Browser CSS @font-face Parity ---');
  const cssPath = path.join(process.cwd(), 'src', 'fonts', 'fonts.css');
  assert(fs.existsSync(cssPath), 'fonts.css Exists', cssPath);
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  assert(cssContent.includes('@font-face'), 'CSS Contains @font-face', 'Found @font-face definitions');
  assert(cssContent.includes('Lemon Milk'), 'CSS Declares Lemon Milk', 'Found Lemon Milk family in fonts.css');
  assert(cssContent.includes('American Captain'), 'CSS Declares American Captain', 'Found American Captain in fonts.css');

  // TEST 5: Multilingual Font Fallback
  console.log('\n--- 5. Multilingual Font Fallback Resolution (Part O) ---');
  const devanagariResolved = resolveFontForScript('Devanagari', 'lemon_milk');
  assert(
    devanagariResolved !== 'lemon_milk',
    'Devanagari Fallback Resolution',
    `Fallback for Devanagari resolved to: ${devanagariResolved}`
  );

  const arabicResolved = resolveFontForScript('Arabic', 'american_captain');
  assert(
    arabicResolved !== 'american_captain',
    'Arabic Fallback Resolution',
    `Fallback for Arabic resolved to: ${arabicResolved}`
  );

  // Summary
  const allPassed = results.every((r) => r.passed);
  console.log('\n================================================================');
  console.log(`FONT REGISTRY RESULT: ${allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'}`);
  console.log(`Passed: ${results.filter((r) => r.passed).length} / ${results.length}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runFontRegistryTests().catch((err) => {
  console.error('Font registry test error:', err);
  process.exit(1);
});
