/**
 * VIRALCLIP STUDIO — RENDER ASSET PREPARER & ISOLATION
 * Prepares, downloads, caches, and validates all media assets before FFmpeg execution.
 * Creates an isolated temp workspace at /tmp/viralclip/<jobId>/ and generates SHA-256 RenderPlan hash.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { execFile } from 'child_process';
import ffprobeStatic from 'ffprobe-static';
import { probeSourceMedia } from './sourceQualityAnalyzer';
import { formatAssSubtitle } from '../subtitleFormatter';
import { SourceMediaQualityInfo } from './types';
import { resolveMediaFilesystemPath } from '../mediaStorage';

const ffprobePath = ffprobeStatic?.path || 'ffprobe';

export interface PreparedRenderAssets {
  jobDir: string;
  sourceLocalPath: string;
  sourceInfo: SourceMediaQualityInfo;
  validatedBrolls: Array<{
    path: string;
    start: number;
    duration: number;
    isPIP?: boolean;
    assetType?: 'video' | 'image';
    opacity?: number;
    position?: string;
  }>;
  validatedSfx: Array<{
    path: string;
    delayMs: number;
    volume: number;
    fadeIn?: number;
    fadeOut?: number;
  }>;
  validatedVoiceovers: Array<{
    path: string;
    delayMs: number;
    volume: number;
  }>;
  subtitleAssPath?: string;
  renderPlanHash: string;
  filtergraphTxtPath: string;
  progressLogPath: string;
  outputPath: string;
  framesDir: string;
  planJsonPath: string;
}

/**
 * Downloads a remote URL to a local destination file with timeout & error handling
 */
export async function downloadFile(url: string, destPath: string, timeoutMs: number = 25000): Promise<string> {
  // If destination exists with non-zero size, reuse
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1024) {
    return destPath;
  }

  const client = url.startsWith('https') ? https : http;
  const tempDest = `${destPath}.tmp_${Date.now()}`;

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(tempDest);
    const request = client.get(url, { timeout: timeoutMs }, (response) => {
      // Handle redirects
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        try { fs.unlinkSync(tempDest); } catch {}
        return downloadFile(response.headers.location, destPath, timeoutMs).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(tempDest); } catch {}
        return reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          try {
            fs.renameSync(tempDest, destPath);
            resolve(destPath);
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    request.on('error', (err) => {
      file.close();
      try { fs.unlinkSync(tempDest); } catch {}
      reject(err);
    });

    request.on('timeout', () => {
      request.destroy();
      file.close();
      try { fs.unlinkSync(tempDest); } catch {}
      reject(new Error(`Timeout downloading ${url} after ${timeoutMs}ms`));
    });
  });
}

/**
 * Validates a video or image file with FFprobe to ensure playability and dimensions
 */
export async function probeAndValidateAsset(filePath: string): Promise<{ valid: boolean; width?: number; height?: number; duration?: number; isVideo: boolean }> {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    return { valid: false, isVideo: false };
  }

  return new Promise((resolve) => {
    execFile(
      ffprobePath,
      ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', filePath],
      (err, stdout) => {
        if (err || !stdout) {
          return resolve({ valid: false, isVideo: false });
        }
        try {
          const data = JSON.parse(stdout);
          const vStream = (data.streams || []).find((s: any) => s.codec_type === 'video');
          if (!vStream) {
            const aStream = (data.streams || []).find((s: any) => s.codec_type === 'audio');
            return resolve({
              valid: !!aStream,
              duration: Number(data.format?.duration) || 0,
              isVideo: false,
            });
          }

          const width = Number(vStream.width) || 0;
          const height = Number(vStream.height) || 0;
          const duration = Number(data.format?.duration) || Number(vStream.duration) || 0;

          resolve({
            valid: width > 0 && height > 0,
            width,
            height,
            duration,
            isVideo: true,
          });
        } catch {
          resolve({ valid: false, isVideo: false });
        }
      }
    );
  });
}

/**
 * Prepares the isolated workspace and all assets for a RenderJob.
 * Follows Requirement 12, 13, 14, 22.
 */
export async function prepareRenderAssets(
  jobId: string,
  rawRenderPlan: any,
  projectDir: string = process.cwd()
): Promise<PreparedRenderAssets> {
  const baseTmp = path.join('/tmp', 'viralclip', jobId);
  const brollDir = path.join(baseTmp, 'broll');
  const imagesDir = path.join(baseTmp, 'images');
  const sfxDir = path.join(baseTmp, 'sfx');
  const fontsDir = path.join(baseTmp, 'fonts');
  const framesDir = path.join(baseTmp, 'frames');

  [baseTmp, brollDir, imagesDir, sfxDir, fontsDir, framesDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // 1. Resolve Source Media
  let sourceLocalPath = '';
  const rawSourceUrl =
    rawRenderPlan.sourceUrl ||
    rawRenderPlan.videoUrl ||
    rawRenderPlan.videoProxyUrl ||
    rawRenderPlan.audioUrl ||
    '';

  if (rawSourceUrl.startsWith('http://') || rawSourceUrl.startsWith('https://')) {
    const ext = path.extname(rawSourceUrl.split('?')[0]) || '.mp4';
    const downloadedSource = path.join(baseTmp, `source${ext}`);
    sourceLocalPath = await downloadFile(rawSourceUrl, downloadedSource);
  } else {
    // Check media storage first (handles /media/media_.../source.mp4 and media IDs)
    const mediaResolved = resolveMediaFilesystemPath(rawSourceUrl);
    if (mediaResolved && fs.existsSync(mediaResolved)) {
      sourceLocalPath = mediaResolved;
    } else if (rawSourceUrl.startsWith('/uploads/')) {
      sourceLocalPath = path.join(projectDir, 'public', rawSourceUrl);
    } else if (rawSourceUrl.startsWith('/public/uploads/')) {
      sourceLocalPath = path.join(projectDir, rawSourceUrl);
    } else if (rawSourceUrl.startsWith('/demo/')) {
      sourceLocalPath = path.join(projectDir, 'public', rawSourceUrl);
    } else if (rawSourceUrl.startsWith('/public/demo/')) {
      sourceLocalPath = path.join(projectDir, rawSourceUrl);
    } else if (path.isAbsolute(rawSourceUrl) && fs.existsSync(rawSourceUrl)) {
      sourceLocalPath = rawSourceUrl;
    } else {
      // Check inside public folder
      const fallback = path.join(projectDir, 'public', rawSourceUrl.replace(/^\//, ''));
      if (fs.existsSync(fallback)) {
        sourceLocalPath = fallback;
      }
    }
  }

  if (!sourceLocalPath || !fs.existsSync(sourceLocalPath)) {
    throw new Error(`Source media not found or inaccessible at: "${rawSourceUrl}". Please verify the media path.`);
  }

  // Probe source media
  const sourceInfo = await probeSourceMedia(sourceLocalPath);

  // 2. Validate and download B-Roll assets
  const rawBrolls = Array.isArray(rawRenderPlan.brollList)
    ? rawRenderPlan.brollList
    : Array.isArray(rawRenderPlan.brollEvents)
    ? rawRenderPlan.brollEvents
    : [];

  const validatedBrolls: PreparedRenderAssets['validatedBrolls'] = [];

  for (let i = 0; i < rawBrolls.length; i++) {
    const item = rawBrolls[i];
    const assetUrl = item.path || item.asset?.url || item.url || item.assetUrl || '';
    if (!assetUrl) continue;

    let localBrollPath = '';
    const isRemote = assetUrl.startsWith('http://') || assetUrl.startsWith('https://');

    if (isRemote) {
      const ext = path.extname(assetUrl.split('?')[0]) || '.mp4';
      const dest = path.join(brollDir, `broll_${i}${ext}`);
      try {
        localBrollPath = await downloadFile(assetUrl, dest);
      } catch (dlErr) {
        console.warn(`[ASSET PREPARER] Failed to download B-roll #${i} (${assetUrl}), rejecting item.`, dlErr);
        continue; // Reject this B-roll event cleanly, do not replace with random media
      }
    } else {
      if (assetUrl.startsWith('/')) {
        const fullP = path.join(projectDir, 'public', assetUrl);
        localBrollPath = fs.existsSync(fullP) ? fullP : path.join(projectDir, assetUrl);
      } else {
        localBrollPath = path.isAbsolute(assetUrl) ? assetUrl : path.join(projectDir, assetUrl);
      }
    }

    // Verify local B-roll with ffprobe
    const probe = await probeAndValidateAsset(localBrollPath);
    if (probe.valid) {
      validatedBrolls.push({
        path: localBrollPath,
        start: Number(item.start) || 0,
        duration: Number(item.duration) || 3,
        isPIP: !!item.isPIP,
        assetType: item.assetType || (/\.(jpe?g|png|webp)$/i.test(localBrollPath) ? 'image' : 'video'),
        opacity: item.opacity ?? 1,
        position: item.position,
      });
    } else {
      console.warn(`[ASSET PREPARER] B-roll asset #${i} (${localBrollPath}) invalid or unplayable. Rejected.`);
    }
  }

  // 3. Validate and download SFX
  const rawSfx = Array.isArray(rawRenderPlan.sfxList)
    ? rawRenderPlan.sfxList
    : Array.isArray(rawRenderPlan.sfxEvents)
    ? rawRenderPlan.sfxEvents
    : Array.isArray(rawRenderPlan.sfxMarkers)
    ? rawRenderPlan.sfxMarkers
    : [];

  const validatedSfx: PreparedRenderAssets['validatedSfx'] = [];

  for (let i = 0; i < rawSfx.length; i++) {
    const sfx = rawSfx[i];
    const sfxUrl = sfx.path || sfx.asset?.url || sfx.url || sfx.audioUrl || (sfx.category ? `/assets/sfx/${sfx.category}.wav` : (sfx.type ? `/assets/sfx/${sfx.type}.wav` : ''));
    if (!sfxUrl) continue;

    let localSfxPath = '';
    if (sfxUrl.startsWith('http://') || sfxUrl.startsWith('https://')) {
      const ext = path.extname(sfxUrl.split('?')[0]) || '.mp3';
      const dest = path.join(sfxDir, `sfx_${i}${ext}`);
      try {
        localSfxPath = await downloadFile(sfxUrl, dest);
      } catch (sfxErr) {
        console.warn(`[ASSET PREPARER] SFX #${i} download failed (${sfxUrl}), skipping.`, sfxErr);
        continue;
      }
    } else {
      localSfxPath = path.isAbsolute(sfxUrl)
        ? sfxUrl
        : path.join(projectDir, sfxUrl.startsWith('/') ? `public${sfxUrl}` : sfxUrl);
    }

    if (fs.existsSync(localSfxPath) && fs.statSync(localSfxPath).size > 0) {
      validatedSfx.push({
        path: localSfxPath,
        delayMs: Number(sfx.delayMs ?? (sfx.timestamp ? sfx.timestamp * 1000 : 0)),
        volume: Number(sfx.volume ?? 0.6),
        fadeIn: sfx.fadeIn,
        fadeOut: sfx.fadeOut,
      });
    }
  }

  // 4. Validate Voiceovers if present
  const rawVo = Array.isArray(rawRenderPlan.voiceoverList) ? rawRenderPlan.voiceoverList : [];
  const validatedVoiceovers: PreparedRenderAssets['validatedVoiceovers'] = [];
  for (const vo of rawVo) {
    if (vo.path && fs.existsSync(vo.path)) {
      validatedVoiceovers.push({
        path: vo.path,
        delayMs: Number(vo.delayMs || 0),
        volume: Number(vo.volume ?? 1.0),
      });
    }
  }

  // 5. Generate ASS Subtitles file
  let subtitleAssPath: string | undefined = undefined;
  const captions = Array.isArray(rawRenderPlan.captions)
    ? rawRenderPlan.captions
    : Array.isArray(rawRenderPlan.captionEvents)
    ? rawRenderPlan.captionEvents
    : [];

  if (captions.length > 0) {
    const assContent = formatAssSubtitle(captions, rawRenderPlan.captionConfig);
    subtitleAssPath = path.join(baseTmp, 'captions.ass');
    fs.writeFileSync(subtitleAssPath, assContent, 'utf8');
  }

  // 6. Compute canonical SHA-256 RenderPlan hash
  const canonicalObject = {
    sourceUrl: rawSourceUrl,
    startTime: rawRenderPlan.startTime || 0,
    duration: rawRenderPlan.duration || sourceInfo.sourceDuration,
    captionsCount: captions.length,
    brollsCount: validatedBrolls.length,
    sfxCount: validatedSfx.length,
    qualityMode: rawRenderPlan.qualityMode || 'HIGH',
    colorTreatment: rawRenderPlan.colorTreatment || 'natural_pro',
  };
  const renderPlanHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalObject))
    .digest('hex');

  // 7. Write audit files
  const planJsonPath = path.join(baseTmp, 'render-plan.json');
  fs.writeFileSync(planJsonPath, JSON.stringify({ ...rawRenderPlan, renderPlanHash }, null, 2), 'utf8');

  const filtergraphTxtPath = path.join(baseTmp, 'filtergraph.txt');
  const progressLogPath = path.join(baseTmp, 'progress.log');
  const outputPath = path.join(baseTmp, 'output.mp4');

  return {
    jobDir: baseTmp,
    sourceLocalPath,
    sourceInfo,
    validatedBrolls,
    validatedSfx,
    validatedVoiceovers,
    subtitleAssPath,
    renderPlanHash,
    filtergraphTxtPath,
    progressLogPath,
    outputPath,
    framesDir,
    planJsonPath,
  };
}
