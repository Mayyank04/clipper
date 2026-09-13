/**
 * VIRALCLIP STUDIO — PRODUCTION FFmpeg 9:16 RENDER PIPELINE
 * Single-stage Lanczos scaling, CRF-based H.264 encoding, BT.709 color management,
 * dynamic subject-aware 9:16 cropping, and professional audio normalization.
 */

import path from 'path';
import { ExportQualityMode, RenderQualityProfile, SourceMediaQualityInfo } from './types';
import { generateSmartCropPlan, getCropRectAtTime } from './smartCropEngine';
import { getColorGradingProfile } from '../creatorStudio/videoEffectsEngine';

export interface FFmpegRenderOptions {
  sourcePath: string;
  outputPath: string;
  sourceInfo: SourceMediaQualityInfo;
  startTime: number;
  duration: number;
  qualityMode?: ExportQualityMode;
  speakerPosition?: 'center' | 'left' | 'right' | 'auto_switch';
  subtitlePath?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  colorTreatment?: 'cinematic_red' | 'creator_vibrant' | 'natural_pro' | 'clean_monochrome' | 'warm_vintage';
  brollList?: { path: string; start: number; duration: number; isPIP?: boolean; assetType?: 'video' | 'image' }[];
  sfxList?: { path: string; delayMs: number; volume: number; fadeIn?: number; fadeOut?: number }[];
  voiceoverList?: { path: string; delayMs: number; volume: number }[];
  vfxItem?: { timestamp: number; duration: number; type: string };
  dynamicZooms?: { startTime: number; endTime: number; peakScale: number }[];
  imageOverlays?: { path: string; start: number; duration: number; position?: string; scale?: number }[];
  isAudioOnly?: boolean;
}

/**
 * Builds an optimal production RenderQualityProfile based on export mode and source diagnostics.
 * Section 9 & 10: Smart Source-Aware Render Profile.
 * - 640x360: upscale required, high-quality Lanczos, CRF 18-20 recommended
 * - 1080x1920: no upscale, preserve detail, CRF 16-19
 * - 4K source: high quality downscale, CRF 16-18
 * Section 19: FPS preservation (e.g. 29.97 preserved without forced 30/60 conversions)
 */
export function getRenderQualityProfile(
  sourceInfo: SourceMediaQualityInfo,
  targetFormat: string = '1080x1920',
  mode: ExportQualityMode = 'HIGH',
  requestedFPS?: number
): RenderQualityProfile {
  const isLowRes = sourceInfo.sourceWidth < 1280 || sourceInfo.sourceHeight < 720;
  const is4K = sourceInfo.sourceWidth >= 3840 || sourceInfo.sourceHeight >= 2160;

  let crf = 16;
  let encoderPreset = 'slow';

  switch (mode) {
    case 'FAST':
      crf = isLowRes ? 22 : 23;
      encoderPreset = 'veryfast';
      break;
    case 'BALANCED':
      crf = isLowRes ? 19 : 19;
      encoderPreset = 'medium';
      break;
    case 'MASTER':
      crf = isLowRes ? 16 : 14;
      encoderPreset = 'slower';
      break;
    case 'HIGH':
    default:
      // For low-resolution sources (e.g. 640x360), CRF 18 avoids bloated files while preserving upscale crispness
      crf = isLowRes ? 18 : is4K ? 16 : 16;
      encoderPreset = 'slow';
      break;
  }

  // Preserve native source FPS (e.g. 29.97, 23.98, 25, 30) unless user explicitly requested 60 FPS
  const targetFPS = requestedFPS && requestedFPS === 60
    ? 60
    : Number((sourceInfo.sourceFPS || 29.97).toFixed(2));

  // Determine subtle sharpening for low-res upscale
  const sharpening = isLowRes ? 'subtle' : (mode === 'MASTER' ? 'subtle' : 'off');

  const [tWidth, tHeight] = targetFormat === '1080x1920' ? [1080, 1920] : [1080, 1920];

  return {
    qualityMode: mode,
    targetResolution: { width: tWidth, height: tHeight },
    targetFPS,
    crf,
    encoderPreset,
    pixelFormat: 'yuv420p',
    colorPrimaries: 'bt709',
    colorTransfer: 'bt709',
    colorSpace: 'bt709',
    colorRange: 'tv',
    scalingFilter: 'lanczos+accurate_rnd+full_chroma_int+full_chroma_inp',
    sharpening,
    audioBitrate: '192k',
    audioSampleRate: 48000,
  };
}

export const buildQualityProfile = (
  mode: ExportQualityMode = 'HIGH',
  sourceInfo: SourceMediaQualityInfo
): RenderQualityProfile => getRenderQualityProfile(sourceInfo, '1080x1920', mode);


/**
 * Generates the complete, authoritative FFmpeg argument array for a single-stage render
 */
export function buildFFmpegRenderArgs(options: FFmpegRenderOptions): { args: string[]; profile: RenderQualityProfile } {
  const {
    sourcePath,
    outputPath,
    sourceInfo,
    startTime,
    duration,
    qualityMode = 'HIGH',
    speakerPosition = 'center',
    subtitlePath,
    watermarkText,
    watermarkOpacity = 80,
    brollList = [],
    sfxList = [],
    voiceoverList = [],
    vfxItem,
    colorTreatment,
    imageOverlays = [],
    dynamicZooms = [],
    isAudioOnly = false,
  } = options;

  const profile = buildQualityProfile(qualityMode, sourceInfo);

  if (isAudioOnly) {
    // Audio-to-Video mode
    let filterChain = `[1:a]showwaves=s=960x240:mode=line:colors=0x38bdf8:rate=${profile.targetFPS}[vwave];[0:v][vwave]overlay=(W-w)/2:H*0.75-h/2[v1]`;
    let curVPad = '[v1]';

    if (subtitlePath) {
      filterChain += `;${curVPad}subtitles='${subtitlePath.replace(/'/g, "'\\''")}'[vsub]`;
      curVPad = '[vsub]';
    }

    if (watermarkText) {
      const cleanWatermark = watermarkText.replace(/'/g, '').replace(/:/g, '');
      const op = (watermarkOpacity / 100).toFixed(2);
      filterChain += `;${curVPad}drawtext=text='${cleanWatermark}':fontsize=32:fontcolor=white@${op}:x=w-text_w-48:y=60[vout]`;
      curVPad = '[vout]';
    }

    const args = [
      '-y',
      '-f', 'lavfi',
      '-i', `gradients=s=1080x1920:c0=0x0a0f1d:c1=0x1e1b4b:d=${duration}`,
      '-ss', String(startTime),
      '-t', String(duration),
      '-i', sourcePath,
      '-filter_complex', filterChain,
      '-map', curVPad,
      '-map', '1:a',
      '-c:v', 'libx264',
      '-preset', profile.encoderPreset,
      '-crf', String(profile.crf),
      '-pix_fmt', profile.pixelFormat,
      '-color_primaries', profile.colorPrimaries,
      '-color_trc', profile.colorTransfer,
      '-colorspace', profile.colorSpace,
      '-color_range', profile.colorRange,
      '-r', String(profile.targetFPS),
      '-c:a', 'aac',
      '-b:a', profile.audioBitrate,
      '-ar', String(profile.audioSampleRate),
      '-shortest',
      outputPath,
    ];

    return { args, profile };
  }

  // 1. Calculate Smart 9:16 Crop
  const cropPlan = generateSmartCropPlan({
    sourceWidth: sourceInfo.sourceWidth,
    sourceHeight: sourceInfo.sourceHeight,
    duration,
    speakerPosition,
  });

  // Center crop coordinates at median point
  const midCrop = getCropRectAtTime(cropPlan, duration / 2);

  // 2. Build Video Filtergraph with single-pass Lanczos scaler
  let baseFilters = `crop=${midCrop.width}:${midCrop.height}:${midCrop.x}:${midCrop.y},scale=1080:1920:force_original_aspect_ratio=decrease:flags=${profile.scalingFilter},pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black`;

  // Subtle unsharp filter for detail enhancement if indicated
  if (profile.sharpening === 'subtle') {
    baseFilters += `,unsharp=lx=5:ly=5:la=0.35:cx=5:cy=5:ca=0.0`;
  } else if (profile.sharpening === 'medium') {
    baseFilters += `,unsharp=lx=5:ly=5:la=0.6:cx=5:cy=5:ca=0.0`;
  }

  // Normalize color space to BT.709 limited range to avoid washed out colors
  baseFilters += `,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709,colorspace=all=bt709:range=tv`;

  const inputFiles: string[] = [
    '-ss', String(startTime),
    '-t', String(duration),
    '-i', sourcePath,
  ];

  let nextInputIndex = 1;
  let filterChain = `[0:v]${baseFilters}[v0]`;
  let curVPad = '[v0]';

  // 3. Color Grading Filter (Cinematic Red / Creator Vibrant / Natural Pro)
  if (colorTreatment) {
    const cgProfile = getColorGradingProfile(colorTreatment);
    filterChain += `;${curVPad}${cgProfile.ffmpegFilter}[v_cg]`;
    curVPad = '[v_cg]';
  }

  // 4. Multi-track B-Roll Cutaways (Full Cover or Picture-in-Picture PIP Card)
  for (let bIdx = 0; bIdx < brollList.length; bIdx++) {
    const bItem = brollList[bIdx];
    const bEnd = Math.min(duration, bItem.start + bItem.duration);
    const isImage = /\.(jpe?g|png|webp)$/i.test(bItem.path) || bItem.assetType === 'image';
    if (isImage) {
      inputFiles.push('-loop', '1', '-t', String(bItem.duration), '-i', bItem.path);
    } else {
      inputFiles.push('-stream_loop', '-1', '-ss', '0', '-t', String(bItem.duration), '-i', bItem.path);
    }

    if (bItem.isPIP) {
      // Picture-in-Picture card in top right (380x676 with dark stroke)
      filterChain += `;[${nextInputIndex}:v]scale=380:676:force_original_aspect_ratio=increase:flags=${profile.scalingFilter},crop=380:676,pad=384:680:2:2:white[vbroll_${bIdx}]`;
      filterChain += `;${curVPad}[vbroll_${bIdx}]overlay=W-w-36:120:enable='between(t,${bItem.start},${bEnd})'[vbrolled_${bIdx}]`;
    } else {
      // Full screen 9:16 cutaway
      filterChain += `;[${nextInputIndex}:v]scale=1080:1920:force_original_aspect_ratio=increase:flags=${profile.scalingFilter},crop=1080:1920[vbroll_${bIdx}]`;
      filterChain += `;${curVPad}[vbroll_${bIdx}]overlay=0:0:enable='between(t,${bItem.start},${bEnd})'[vbrolled_${bIdx}]`;
    }
    curVPad = `[vbrolled_${bIdx}]`;
    nextInputIndex++;
  }

  // 5. Image & Meme Overlays
  for (let imgIdx = 0; imgIdx < imageOverlays.length; imgIdx++) {
    const imgItem = imageOverlays[imgIdx];
    const imgEnd = Math.min(duration, imgItem.start + imgItem.duration);
    inputFiles.push('-i', imgItem.path);

    const targetW = Math.round(340 * (imgItem.scale || 1.0));
    const targetH = Math.round(340 * (imgItem.scale || 1.0));
    filterChain += `;[${nextInputIndex}:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease:flags=${profile.scalingFilter}[vimg_${imgIdx}]`;
    const posX = imgItem.position === 'center' ? '(W-w)/2' : 'W-w-36';
    const posY = imgItem.position === 'center' ? '(H-h)/2' : '140';
    filterChain += `;${curVPad}[vimg_${imgIdx}]overlay=${posX}:${posY}:enable='between(t,${imgItem.start},${imgEnd})'[vimged_${imgIdx}]`;
    curVPad = `[vimged_${imgIdx}]`;
    nextInputIndex++;
  }

  // 6. Subtle VFX if active
  if (vfxItem) {
    const vStart = Math.max(0, vfxItem.timestamp || 0);
    const vDur = Math.max(0.4, vfxItem.duration || 1.5);
    const vEnd = vStart + vDur;
    filterChain += `;${curVPad}eq=brightness=0.08:contrast=1.12:enable='between(t,${vStart},${vEnd})'[vvfx]`;
    curVPad = '[vvfx]';
  }

  // 7. Crisp Subtitle Burn-In with Exact User Font Directory Parity (Part 5 & 31)
  if (subtitlePath) {
    const fontsDir = path.join(process.cwd(), 'public', 'assets', 'fonts').replace(/\\/g, '/').replace(/:/g, '\\:');
    filterChain += `;${curVPad}subtitles='${subtitlePath.replace(/'/g, "'\\''")}':fontsdir='${fontsDir}'[vsub]`;
    curVPad = '[vsub]';
  }

  // 6. Watermark
  if (watermarkText) {
    const cleanWatermark = watermarkText.replace(/'/g, '').replace(/:/g, '');
    const op = (watermarkOpacity / 100).toFixed(2);
    filterChain += `;${curVPad}drawtext=text='${cleanWatermark}':fontsize=32:fontcolor=white@${op}:x=w-text_w-48:y=60[vout]`;
    curVPad = '[vout]';
  }

  // 7. Multi-track Audio Mixing (Voiceover + SFX + Speech Ducking)
  const hasSourceAudio = !!(sourceInfo.sourceAudioCodec && sourceInfo.sourceAudioCodec !== 'none');
  let curAPad = '0:a';

  if (voiceoverList.length > 0 || sfxList.length > 0) {
    const extraAudioPads: string[] = [];

    voiceoverList.forEach((vo, voIdx) => {
      inputFiles.push('-i', vo.path);
      const padName = `avoice${voIdx}`;
      filterChain += `;[${nextInputIndex}:a]adelay=${vo.delayMs}|${vo.delayMs},volume=${vo.volume}[${padName}]`;
      extraAudioPads.push(`[${padName}]`);
      nextInputIndex++;
    });

    sfxList.forEach((sfx, sIdx) => {
      inputFiles.push('-i', sfx.path);
      const padName = `asfx${sIdx}`;
      let filter = `adelay=${sfx.delayMs}|${sfx.delayMs},volume=${sfx.volume}`;
      if (sfx.fadeIn && sfx.fadeIn > 0) filter += `,afade=t=in:ss=0:d=${sfx.fadeIn}`;
      if (sfx.fadeOut && sfx.fadeOut > 0) filter += `,afade=t=out:st=1:d=${sfx.fadeOut}`;
      filterChain += `;[${nextInputIndex}:a]${filter}[${padName}]`;
      extraAudioPads.push(`[${padName}]`);
      nextInputIndex++;
    });

    if (hasSourceAudio) {
      const origAudioFilter = voiceoverList.length > 0 ? 'volume=0.30' : 'volume=1.0';
      filterChain += `;[0:a]${origAudioFilter}[a_orig_ducked]`;
      const totalInputs = extraAudioPads.length + 1;
      filterChain += `;[a_orig_ducked]${extraAudioPads.join('')}amix=inputs=${totalInputs}:duration=first:dropout_transition=2[aout]`;
    } else {
      filterChain += `;${extraAudioPads.join('')}amix=inputs=${extraAudioPads.length}:duration=first:dropout_transition=2[aout]`;
    }
    curAPad = '[aout]';
  } else if (hasSourceAudio) {
    curAPad = '0:a';
  } else {
    // Generate silent AAC track so shorts always have compliant audio
    filterChain += `;aevalsrc=0:d=${duration}:s=48000[asilent]`;
    curAPad = '[asilent]';
  }

  const args = [
    '-y',
    ...inputFiles,
    '-filter_complex', filterChain,
    '-map', curVPad,
    '-map', curAPad,
    '-c:v', 'libx264',
    '-preset', profile.encoderPreset,
    '-crf', String(profile.crf),
    '-pix_fmt', profile.pixelFormat,
    '-color_primaries', profile.colorPrimaries,
    '-color_trc', profile.colorTransfer,
    '-colorspace', profile.colorSpace,
    '-color_range', profile.colorRange,
    '-r', String(profile.targetFPS),
    '-c:a', 'aac',
    '-b:a', profile.audioBitrate,
    '-ar', String(profile.audioSampleRate),
    '-shortest',
    outputPath,
  ];

  return { args, profile };
}
