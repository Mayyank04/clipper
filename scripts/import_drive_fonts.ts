/**
 * VIRALCLIP STUDIO — GOOGLE DRIVE FONT IMPORTER
 * Downloads, unpacks, validates, hashes, and registers the user's actual font packs
 * from the provided Drive folders into public/assets/fonts and src/data/fontRegistry.ts
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';

const FONTS_DIR = path.join(process.cwd(), 'public', 'assets', 'fonts');
const SRC_FONTS_DIR = path.join(process.cwd(), 'src', 'fonts');
const REGISTRY_PATH = path.join(process.cwd(), 'src', 'data', 'fontRegistry.ts');
const CSS_PATH = path.join(SRC_FONTS_DIR, 'fonts.css');
const TMP_DIR = path.join('/tmp', 'viralclip_font_import');

[FONTS_DIR, SRC_FONTS_DIR, TMP_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

interface DriveFontItem {
  id: string;
  name: string;
  category: 'REFERENCE' | 'VIRAL' | 'CONDENSED' | 'BOLD' | 'CINEMATIC' | 'EDITORIAL' | 'MEME' | 'COMEDY' | 'CLEAN' | 'HANDWRITTEN' | 'DISPLAY' | 'MINIMAL';
  style: 'display' | 'condensed' | 'sans' | 'serif' | 'handwritten' | 'rounded' | 'comic' | 'editorial' | 'mono';
}

// User-provided font assets from Folder 1 & Folder 2
const FONT_TARGETS: DriveFontItem[] = [
  // Folder 2 Top Creators Fonts
  { id: '1sQ9aSylBiKPwusYz8in7oAtr94Hgvvnb', name: 'lemon_milk.zip', category: 'REFERENCE', style: 'display' },
  { id: '1vNYMuwHLdVGnLTOoHBHPHJypLb__xo3J', name: 'american-captain.zip', category: 'CONDENSED', style: 'condensed' },
  { id: '1EV7sTfPP7u6EeXsAiIR2Ga1kMVNhIOfH', name: 'coolvetica.zip', category: 'VIRAL', style: 'sans' },
  { id: '1ntk6CRxBpuzqsoLZZwSNE7yNAWxLZ3VR', name: 'couture.zip', category: 'EDITORIAL', style: 'editorial' },
  { id: '19OookRCMdilYtfwMmRVlu8JhLJAJNE_U', name: 'komika-axis.zip', category: 'MEME', style: 'comic' },
  { id: '1dzWuhM6RtBnSd2LUC6wZJNIySuU16FYb', name: 'cloister_black.zip', category: 'CINEMATIC', style: 'display' },
  { id: '1QwqwUZuykBp_otP03tYwqSQ4XSgq0aZ8', name: 'god-of-thunder-font.zip', category: 'BOLD', style: 'display' },
  { id: '1tCniAE_gIr8QR0k8gZ3oGAez5ZKuDy8U', name: 'the_amazing_spider_man.zip', category: 'BOLD', style: 'display' },
  { id: '1yAbcqMNhV9sUWklbZIDqATRqRCYyOXhX', name: 'union_college.zip', category: 'BOLD', style: 'sans' },
  { id: '1nks69FYwkt7uWnhwZUdRa1MeQM6w1v3f', name: 'morris_roman.zip', category: 'EDITORIAL', style: 'serif' },

  // Folder 1 Top Fonts
  { id: '1pXgooUBA3SWJ22SMVkIepkSqiYKgMMFd', name: 'batman_forever.zip', category: 'CINEMATIC', style: 'display' },
  { id: '1WwPlHBUBuZozM9Cro7R3I7P9qaPneChJ', name: 'stranger-things-font.zip', category: 'CINEMATIC', style: 'serif' },
  { id: '1TrlRAZ7CUvD-cjRFIwPXfsZltI1l6uXZ', name: 'dragonforce.zip', category: 'DISPLAY', style: 'display' },
  { id: '18waaFfjDDckrkSSYtSgeBNbPD6B33Vj9', name: 'another_danger.zip', category: 'VIRAL', style: 'display' },
  { id: '1s4E8kOw57jTC3QcDnsvsfZvwb1DxunH4', name: 'good_vibes.zip', category: 'HANDWRITTEN', style: 'handwritten' },
  { id: '1OKgHObFGj8uuv5Gh0AJuj8zB7Peu9tsM', name: 'porky_bold.zip', category: 'COMEDY', style: 'rounded' },
  { id: '1yYk-uYBzaNcEXSwpxLt3_-dU-ccihyJD', name: 'starborn.zip', category: 'COMEDY', style: 'rounded' },
  { id: '1Qa4qU6KEjMR37AbGAna8-aODhr8U8SDt', name: 'true_crimes.zip', category: 'CINEMATIC', style: 'editorial' },
  { id: '1XOCCQQgny4eflrVUjLAyBfCnfohG_aN5', name: 'square_game.zip', category: 'MINIMAL', style: 'sans' },
];

function downloadDriveFile(id: string, destPath: string): Promise<string> {
  const url = `https://drive.google.com/uc?export=download&id=${id}`;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (redirectRes) => {
          const file = fs.createWriteStream(destPath);
          redirectRes.pipe(file);
          file.on('finish', () => file.close(() => resolve(destPath)));
        }).on('error', reject);
      } else if (res.statusCode === 200) {
        const file = fs.createWriteStream(destPath);
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(destPath)));
      } else {
        reject(new Error(`Failed to download Drive ID ${id}: HTTP ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

function calculateSha256(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export interface ImportedFontMetadata {
  id: string;
  family: string;
  displayName: string;
  fileName: string;
  localPath: string;
  webUrl: string;
  weight: number;
  isItalic: boolean;
  style: string;
  category: string;
  sha256: string;
}

async function main() {
  console.log('🚀 Starting Google Drive Font Library Import...');
  const importedFonts: ImportedFontMetadata[] = [];
  const processedHashes = new Set<string>();

  for (const item of FONT_TARGETS) {
    const zipPath = path.join(TMP_DIR, item.name);
    console.log(`\n📥 Downloading: ${item.name} (${item.id})...`);
    try {
      await downloadDriveFile(item.id, zipPath);
      const stat = fs.statSync(zipPath);
      if (stat.size < 1000) {
        console.warn(`  ⚠️ Downloaded file too small (${stat.size} bytes), skipping`);
        continue;
      }

      // Unpack zip
      const extractDir = path.join(TMP_DIR, `unpacked_${path.basename(item.name, '.zip')}`);
      if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir, { recursive: true });
      execSync(`unzip -o -q "${zipPath}" -d "${extractDir}"`);

      // Find all .otf / .ttf files recursively
      const findFonts = (dir: string): string[] => {
        let results: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            results = results.concat(findFonts(fullPath));
          } else if (/\.(otf|ttf)$/i.test(entry.name) && !entry.name.startsWith('._')) {
            results.push(fullPath);
          }
        }
        return results;
      };

      const fontFiles = findFonts(extractDir);
      console.log(`  ✓ Found ${fontFiles.length} font files in archive`);

      for (const fPath of fontFiles) {
        const fName = path.basename(fPath);
        const hash = calculateSha256(fPath);

        // Deduplicate using SHA-256
        if (processedHashes.has(hash)) {
          console.log(`  ↪ Duplicate font ${fName} (${hash.slice(0, 8)}), skipping.`);
          continue;
        }
        processedHashes.add(hash);

        // Copy font file to public assets directory
        const destPublicPath = path.join(FONTS_DIR, fName);
        fs.copyFileSync(fPath, destPublicPath);

        // Parse family and weight from filename heuristics
        const lower = fName.toLowerCase();
        let weight = 400;
        if (lower.includes('black') || lower.includes('heavy')) weight = 900;
        else if (lower.includes('extrabold') || lower.includes('ultra')) weight = 800;
        else if (lower.includes('bold')) weight = 700;
        else if (lower.includes('semibold') || lower.includes('demi')) weight = 600;
        else if (lower.includes('medium')) weight = 500;
        else if (lower.includes('light')) weight = 300;
        else if (lower.includes('thin')) weight = 100;
        else weight = 700; // Display fonts default to bold

        const isItalic = lower.includes('italic') || lower.includes('oblique');

        // Extract base family display name
        let family = fName
          .replace(/\.(otf|ttf)$/i, '')
          .replace(/[-_](regular|bold|italic|medium|light|black|semibold|bolditalic|lightitalic|mediumitalic)/gi, '')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .trim();

        if (/lemonmilk/i.test(fName)) family = 'Lemon Milk';
        else if (/americancaptain/i.test(fName) || /american-captain/i.test(fName)) family = 'American Captain';
        else if (/coolvetica/i.test(fName)) family = 'Coolvetica';
        else if (/couture/i.test(fName)) family = 'Couture';
        else if (/komika/i.test(fName)) family = 'Komika Axis';
        else if (/batman/i.test(fName)) family = 'Batman Forever';
        else if (/stranger/i.test(fName)) family = 'Stranger Things';
        else if (/dragonforce/i.test(fName)) family = 'Dragonforce';
        else if (/another_danger/i.test(fName)) family = 'Another Danger';
        else if (/good_vibes/i.test(fName)) family = 'Good Vibes';
        else if (/porky/i.test(fName)) family = 'Porky';
        else if (/starborn/i.test(fName)) family = 'Starborn';
        else if (/true_crimes/i.test(fName)) family = 'True Crimes';

        const fontId = `${family.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${weight}${isItalic ? '_italic' : ''}`;

        importedFonts.push({
          id: fontId,
          family,
          displayName: `${family} ${weight >= 800 ? 'Black' : weight >= 700 ? 'Bold' : weight >= 500 ? 'Medium' : 'Regular'}${isItalic ? ' Italic' : ''}`,
          fileName: fName,
          localPath: destPublicPath,
          webUrl: `/assets/fonts/${fName}`,
          weight,
          isItalic,
          style: item.style,
          category: item.category,
          sha256: hash,
        });

        console.log(`  ✓ Loaded: ${family} (Weight: ${weight}, Hash: ${hash.slice(0, 10)}...)`);
      }
    } catch (err) {
      console.error(`  ❌ Failed processing ${item.name}:`, err);
    }
  }

  // 1. Generate @font-face CSS
  console.log(`\nGenerating @font-face CSS (${CSS_PATH})...`);
  let cssContent = `/**
 * VIRALCLIP STUDIO — REAL USER FONT LIBRARY
 * Auto-generated @font-face declarations for live preview & canvas parity.
 */
`;

  for (const f of importedFonts) {
    const format = f.fileName.endsWith('.otf') ? 'opentype' : 'truetype';
    cssContent += `
@font-face {
  font-family: '${f.family}';
  src: url('${f.webUrl}') format('${format}');
  font-weight: ${f.weight};
  font-style: ${f.isItalic ? 'italic' : 'normal'};
  font-display: swap;
}
`;
  }

  fs.writeFileSync(CSS_PATH, cssContent, 'utf8');
  console.log(`✓ Wrote ${importedFonts.length} @font-face rules to ${CSS_PATH}`);

  // Also write into public/assets/fonts/fonts.css so server can serve it directly
  fs.writeFileSync(path.join(FONTS_DIR, 'fonts.css'), cssContent, 'utf8');

  // 2. Generate canonical src/data/fontRegistry.ts
  console.log(`\nGenerating canonical font registry (${REGISTRY_PATH})...`);

  // Group by family
  const groupedByFamily: Record<string, ImportedFontMetadata[]> = {};
  for (const f of importedFonts) {
    if (!groupedByFamily[f.family]) groupedByFamily[f.family] = [];
    groupedByFamily[f.family].push(f);
  }

  const creatorFonts = Object.entries(groupedByFamily).map(([family, variants]) => {
    const id = family.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const first = variants[0];
    const weights = Array.from(new Set(variants.map((v) => v.weight))).sort((a, b) => a - b);

    const files: Record<string, string> = {};
    for (const v of variants) {
      if (v.isItalic) files.italic = v.webUrl;
      else if (v.weight === 900) files.black = v.webUrl;
      else if (v.weight === 800) files.extrabold = v.webUrl;
      else if (v.weight === 700) files.bold = v.webUrl;
      else if (v.weight === 600) files.semibold = v.webUrl;
      else if (v.weight === 500) files.medium = v.webUrl;
      else files.regular = v.webUrl;
    }

    return {
      id,
      family,
      displayName: family,
      files,
      weights,
      style: first.style,
      category: first.category,
      supportsUppercase: true,
      supportsLatin: true,
      licenseSource: 'User Google Drive Font Pack',
      sourceFile: first.fileName,
      sha256: first.sha256,
    };
  });

  const registryContent = `/**
 * VIRALCLIP STUDIO — CANONICAL CREATOR FONT REGISTRY
 * Authoritative font definitions backed by real imported TTF/OTF files with SHA-256 hashes.
 */

export interface CreatorFont {
  id: string;
  family: string;
  displayName: string;
  files: {
    regular?: string;
    medium?: string;
    semibold?: string;
    bold?: string;
    extrabold?: string;
    black?: string;
    italic?: string;
  };
  weights: number[];
  style:
    | 'display'
    | 'condensed'
    | 'sans'
    | 'serif'
    | 'handwritten'
    | 'rounded'
    | 'comic'
    | 'editorial'
    | 'mono';
  category:
    | 'REFERENCE'
    | 'VIRAL'
    | 'CONDENSED'
    | 'BOLD'
    | 'CINEMATIC'
    | 'EDITORIAL'
    | 'MEME'
    | 'COMEDY'
    | 'CLEAN'
    | 'HANDWRITTEN'
    | 'DISPLAY'
    | 'MINIMAL';
  supportsUppercase: boolean;
  supportsLatin?: boolean;
  supportsDevanagari?: boolean;
  supportsArabic?: boolean;
  licenseSource?: string;
  sourceFile?: string;
  sha256?: string;
}

export const CREATOR_FONTS: CreatorFont[] = ${JSON.stringify(creatorFonts, null, 2)};

export const FONT_CATEGORIES = [
  'REFERENCE',
  'VIRAL',
  'CONDENSED',
  'BOLD',
  'CINEMATIC',
  'EDITORIAL',
  'MEME',
  'COMEDY',
  'CLEAN',
  'HANDWRITTEN',
  'DISPLAY',
  'MINIMAL',
] as const;

export type FontCategory = typeof FONT_CATEGORIES[number];

export function getFontById(id: string): CreatorFont | undefined {
  return CREATOR_FONTS.find((f) => f.id === id || f.family.toLowerCase() === id.toLowerCase());
}

export function getFontsByCategory(category: FontCategory): CreatorFont[] {
  return CREATOR_FONTS.filter((f) => f.category === category);
}

export function getFontForStyle(style: string): CreatorFont {
  const match = CREATOR_FONTS.find((f) => f.style === style);
  return match || CREATOR_FONTS[0];
}
`;

  fs.writeFileSync(REGISTRY_PATH, registryContent, 'utf8');
  console.log(`✓ Registered ${creatorFonts.length} distinct creator font families in ${REGISTRY_PATH}`);
  console.log('✅ Google Drive Font Library Import Complete!');
}

main().catch(console.error);
