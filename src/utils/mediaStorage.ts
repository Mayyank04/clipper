/**
 * VIRALCLIP STUDIO — REAL MEDIA STORAGE LAYER (Parts 2, 3, 4, 5, 6, 7)
 * Authoritative manager for media files under MEDIA_ROOT.
 * Enforces absolute server-side paths, stream completion verification,
 * and eliminates path mismatches.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';
import { execFile } from 'child_process';
import ffprobeStatic from 'ffprobe-static';

const execFileAsync = promisify(execFile);
const ffprobePath = (ffprobeStatic as any).path || 'ffprobe';

export interface StoredMedia {
  id: string;
  originalFilename: string;
  storedFilename: string;
  filesystemPath: string;
  publicUrl: string;
  mimeType: string;
  size: number;
  createdAt: string;
  sha256: string;
  status: 'READY' | 'PROCESSING' | 'ERROR';
  duration: number;
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
  hasVideo: boolean;
  videoCodec?: string;
  audioCodec?: string;
  sampleRate?: number;
  channels?: number;
  error?: string;
}

export interface SourceMediaValidation {
  ok: boolean;
  code: string;
  message: string;
  path?: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  hasAudio?: boolean;
  hasVideo?: boolean;
}

// Global MEDIA_ROOT configuration (Part 5)
export const MEDIA_ROOT = process.env.MEDIA_ROOT
  ? path.resolve(process.env.MEDIA_ROOT)
  : path.resolve(process.cwd(), 'data', 'media');

export class MediaStorage {
  private static instance: MediaStorage | null = null;
  private mediaIndex = new Map<string, StoredMedia>();
  private metadataFile: string;

  public constructor(private rootDir: string = MEDIA_ROOT) {
    if (!fs.existsSync(this.rootDir)) {
      fs.mkdirSync(this.rootDir, { recursive: true });
    }

    // Verify write permissions on startup (Part 5)
    try {
      const testFile = path.join(this.rootDir, `.write_test_${Date.now()}`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log(`[MediaStorage] Initialized MEDIA_ROOT at: ${this.rootDir} (writable: true)`);
    } catch (err: any) {
      console.error(`[MediaStorage] FATAL: MEDIA_ROOT at ${this.rootDir} is NOT writable!`, err);
      throw new Error(`MEDIA_ROOT at ${this.rootDir} is not writable: ${err.message}`);
    }

    this.metadataFile = path.join(this.rootDir, 'media_index.json');
    this.loadIndex();
  }

  public static getInstance(): MediaStorage {
    if (!MediaStorage.instance) {
      MediaStorage.instance = new MediaStorage();
    }
    return MediaStorage.instance;
  }

  private loadIndex() {
    try {
      if (fs.existsSync(this.metadataFile)) {
        const content = fs.readFileSync(this.metadataFile, 'utf8');
        const items: StoredMedia[] = JSON.parse(content);
        for (const item of items) {
          if (fs.existsSync(item.filesystemPath)) {
            this.mediaIndex.set(item.id, item);
          }
        }
        console.log(`[MediaStorage] Loaded ${this.mediaIndex.size} verified media entries from index.`);
      }
    } catch (err) {
      console.warn('[MediaStorage] Failed to load media index, starting fresh:', err);
    }
  }

  private saveIndex() {
    try {
      const items = Array.from(this.mediaIndex.values());
      fs.writeFileSync(this.metadataFile, JSON.stringify(items, null, 2), 'utf8');
    } catch (err) {
      console.error('[MediaStorage] Failed to persist media index:', err);
    }
  }

  /**
   * Save a newly uploaded file from disk or buffer, verifies stream completion, size, and probes.
   * (Part 4: Upload Race Condition Fix)
   */
  public async saveUpload(
    tempFilePath: string,
    originalFilename: string,
    mimeType = 'video/mp4'
  ): Promise<StoredMedia> {
    const id = `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    console.log(`[MediaStorage:saveUpload] Starting for id=${id} from tempPath=${tempFilePath}`);

    // 1. Verify file exists on disk
    if (!fs.existsSync(tempFilePath)) {
      throw new Error(`Source upload temp file does not exist at: ${tempFilePath}`);
    }

    // 2. Verify file size > 0
    const stats = fs.statSync(tempFilePath);
    if (stats.size === 0) {
      throw new Error('Uploaded file is 0 bytes (empty upload)');
    }

    // 3. Create immutable media directory
    const mediaItemDir = path.join(this.rootDir, id);
    fs.mkdirSync(mediaItemDir, { recursive: true });

    const ext = path.extname(originalFilename) || '.mp4';
    const storedFilename = `source${ext}`;
    const destinationPath = path.join(mediaItemDir, storedFilename);

    // Copy into immutable storage location
    fs.copyFileSync(tempFilePath, destinationPath);

    // 4. Compute SHA-256
    const fileBuffer = fs.readFileSync(destinationPath);
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // 5. Run FFprobe to guarantee integrity
    const probe = await this.probeFile(destinationPath);
    if (probe.duration <= 0) {
      try { fs.rmSync(mediaItemDir, { recursive: true, force: true }); } catch {}
      throw new Error(`FFprobe failed to determine positive duration for uploaded media (${probe.duration}s)`);
    }

    const publicUrl = `/media/${id}/${storedFilename}`;
    const storedMedia: StoredMedia = {
      id,
      originalFilename,
      storedFilename,
      filesystemPath: destinationPath,
      publicUrl,
      mimeType,
      size: stats.size,
      createdAt: new Date().toISOString(),
      sha256,
      status: 'READY',
      duration: probe.duration,
      width: probe.width,
      height: probe.height,
      fps: probe.fps,
      hasAudio: probe.hasAudio,
      hasVideo: probe.hasVideo,
      videoCodec: probe.videoCodec,
      audioCodec: probe.audioCodec,
      sampleRate: probe.sampleRate,
      channels: probe.channels,
    };

    this.mediaIndex.set(id, storedMedia);
    this.saveIndex();

    console.log(`[MediaStorage:saveUpload] Successfully registered media ${id}: ${destinationPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB, ${probe.duration}s)`);
    return storedMedia;
  }

  /**
   * Register existing media (e.g. YouTube download) into the authoritative media storage.
   */
  public async registerMedia(
    filesystemPath: string,
    originalFilename: string,
    sourceId?: string
  ): Promise<StoredMedia> {
    const id = sourceId || `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const stats = fs.statSync(filesystemPath);
    const probe = await this.probeFile(filesystemPath);

    const mediaItemDir = path.join(this.rootDir, id);
    if (!fs.existsSync(mediaItemDir)) fs.mkdirSync(mediaItemDir, { recursive: true });

    const ext = path.extname(filesystemPath) || '.mp4';
    const storedFilename = `source${ext}`;
    const finalPath = path.join(mediaItemDir, storedFilename);

    if (filesystemPath !== finalPath) {
      fs.copyFileSync(filesystemPath, finalPath);
    }

    const sha256 = crypto.createHash('sha256').update(fs.readFileSync(finalPath)).digest('hex');
    const publicUrl = `/media/${id}/${storedFilename}`;

    const record: StoredMedia = {
      id,
      originalFilename,
      storedFilename,
      filesystemPath: finalPath,
      publicUrl,
      mimeType: probe.hasVideo ? 'video/mp4' : 'audio/mp3',
      size: stats.size,
      createdAt: new Date().toISOString(),
      sha256,
      status: 'READY',
      duration: probe.duration,
      width: probe.width,
      height: probe.height,
      fps: probe.fps,
      hasAudio: probe.hasAudio,
      hasVideo: probe.hasVideo,
      videoCodec: probe.videoCodec,
      audioCodec: probe.audioCodec,
      sampleRate: probe.sampleRate,
      channels: probe.channels,
    };

    this.mediaIndex.set(id, record);
    this.saveIndex();
    return record;
  }

  public getAll(): StoredMedia[] {
    return Array.from(this.mediaIndex.values());
  }

  public getMedia(id: string): StoredMedia | undefined {
    return this.mediaIndex.get(id);
  }

  public getFilesystemPath(id: string): string | undefined {
    const item = this.mediaIndex.get(id);
    return item ? item.filesystemPath : undefined;
  }

  public getPublicUrl(id: string): string | undefined {
    const item = this.mediaIndex.get(id);
    return item ? item.publicUrl : undefined;
  }

  public exists(id: string): boolean {
    const item = this.mediaIndex.get(id);
    return Boolean(item && fs.existsSync(item.filesystemPath));
  }

  public stat(id: string): fs.Stats | undefined {
    const item = this.mediaIndex.get(id);
    if (item && fs.existsSync(item.filesystemPath)) {
      return fs.statSync(item.filesystemPath);
    }
    return undefined;
  }

  public delete(id: string): boolean {
    const item = this.mediaIndex.get(id);
    if (!item) return false;
    try {
      const mediaItemDir = path.dirname(item.filesystemPath);
      if (fs.existsSync(mediaItemDir)) {
        fs.rmSync(mediaItemDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.error(`Failed to delete media files for ${id}:`, err);
    }
    this.mediaIndex.delete(id);
    this.saveIndex();
    return true;
  }

  private async probeFile(filePath: string) {
    try {
      const { stdout } = await execFileAsync(ffprobePath, [
        '-v', 'error',
        '-show_format',
        '-show_streams',
        '-print_format', 'json',
        filePath,
      ]);
      const data = JSON.parse(stdout);
      const vStream = data.streams?.find((s: any) => s.codec_type === 'video');
      const aStream = data.streams?.find((s: any) => s.codec_type === 'audio');

      let duration = parseFloat(data.format?.duration || '0');
      if (duration === 0 && vStream?.duration) {
        duration = parseFloat(vStream.duration);
      }
      if (duration === 0 && aStream?.duration) {
        duration = parseFloat(aStream.duration);
      }

      let fps = 30;
      if (vStream?.r_frame_rate) {
        const [num, den] = vStream.r_frame_rate.split('/').map(Number);
        if (num && den) fps = Math.round(num / den);
      }

      return {
        duration: Number(duration.toFixed(2)),
        width: vStream?.width || 0,
        height: vStream?.height || 0,
        fps,
        hasVideo: Boolean(vStream),
        hasAudio: Boolean(aStream),
        videoCodec: vStream?.codec_name,
        audioCodec: aStream?.codec_name,
        sampleRate: aStream?.sample_rate ? parseInt(aStream.sample_rate, 10) : undefined,
        channels: aStream?.channels,
      };
    } catch (err: any) {
      console.error(`FFprobe failed for ${filePath}:`, err);
      return {
        duration: 0,
        width: 0,
        height: 0,
        fps: 30,
        hasVideo: false,
        hasAudio: false,
      };
    }
  }
}

export const mediaStorage = MediaStorage.getInstance();

/**
 * Resolves any sourceMedia, ID, or legacy relative URL to an absolute filesystem path.
 * (Part 3: Absolute Paths Only On Server)
 */
export function resolveMediaFilesystemPath(sourceMediaOrId: any): string {
  if (!sourceMediaOrId) return '';

  // 1. If string ID or path
  if (typeof sourceMediaOrId === 'string') {
    const trimmed = sourceMediaOrId.trim();

    // Direct MediaStorage ID lookup
    const fromStorage = mediaStorage.getFilesystemPath(trimmed);
    if (fromStorage && fs.existsSync(fromStorage)) {
      return fromStorage;
    }

    // Absolute path already?
    if (path.isAbsolute(trimmed) && fs.existsSync(trimmed)) {
      return trimmed;
    }

    // Check MEDIA_ROOT url e.g. /media/media_123/source.mp4
    if (trimmed.startsWith('/media/')) {
      const rel = trimmed.replace(/^\/media\//, '');
      const candidate = path.join(MEDIA_ROOT, rel);
      if (fs.existsSync(candidate)) return candidate;
    }

    // Legacy public/uploads check
    if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
      const rel = trimmed.replace(/^\/?uploads\//, '');
      // Check in public/uploads first!
      const candidatePublic = path.join(process.cwd(), 'public', 'uploads', rel);
      if (fs.existsSync(candidatePublic)) return candidatePublic;
      // Check in MEDIA_ROOT
      const candidateMedia = path.join(MEDIA_ROOT, rel);
      if (fs.existsSync(candidateMedia)) return candidateMedia;
      // Check in cwd/uploads
      const candidateCwd = path.join(process.cwd(), 'uploads', rel);
      if (fs.existsSync(candidateCwd)) return candidateCwd;
    }

    // Demo assets
    if (trimmed.startsWith('/demo/') || trimmed.startsWith('demo/')) {
      const rel = trimmed.replace(/^\/?demo\//, '');
      const candidate = path.join(process.cwd(), 'public', 'demo', rel);
      if (fs.existsSync(candidate)) return candidate;
    }

    // Audio assets
    if (trimmed.startsWith('/audio/') || trimmed.startsWith('audio/')) {
      const rel = trimmed.replace(/^\/?audio\//, '');
      const candidate = path.join(process.cwd(), 'public', 'audio', rel);
      if (fs.existsSync(candidate)) return candidate;
    }

    // Public directory relative paths (e.g. /public/demo/test.mp4 or public/uploads/...)
    if (trimmed.startsWith('/public/') || trimmed.startsWith('public/')) {
      const rel = trimmed.replace(/^\/?public\//, '');
      const candidate = path.join(process.cwd(), 'public', rel);
      if (fs.existsSync(candidate)) return candidate;
    }

    // Generic public relative path
    const candidateGeneric = path.join(process.cwd(), 'public', trimmed.replace(/^\//, ''));
    if (fs.existsSync(candidateGeneric)) return candidateGeneric;

    return '';
  }

  // 2. Object with sourceMedia properties
  if (typeof sourceMediaOrId === 'object') {
    if (sourceMediaOrId.id) {
      const fromStorage = mediaStorage.getFilesystemPath(sourceMediaOrId.id);
      if (fromStorage && fs.existsSync(fromStorage)) return fromStorage;
    }

    if (sourceMediaOrId.filesystemPath && fs.existsSync(sourceMediaOrId.filesystemPath)) {
      return sourceMediaOrId.filesystemPath;
    }

    if (sourceMediaOrId.localPath && fs.existsSync(sourceMediaOrId.localPath)) {
      return sourceMediaOrId.localPath;
    }

    if (sourceMediaOrId.path && fs.existsSync(sourceMediaOrId.path)) {
      return sourceMediaOrId.path;
    }

    if (sourceMediaOrId.publicUrl) {
      const res = resolveMediaFilesystemPath(sourceMediaOrId.publicUrl);
      if (res && fs.existsSync(res)) return res;
    }

    if (sourceMediaOrId.url) {
      const res = resolveMediaFilesystemPath(sourceMediaOrId.url);
      if (res && fs.existsSync(res)) return res;
    }
  }

  return '';
}

/**
 * Validates a source media object or path comprehensively.
 * (Part 7: Source Media Validation)
 */
export async function validateSourceMedia(sourceMediaOrId: any): Promise<SourceMediaValidation> {
  const resolvedPath = resolveMediaFilesystemPath(sourceMediaOrId);

  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    return {
      ok: false,
      code: 'MEDIA_FILE_NOT_FOUND',
      message: 'Uploaded media file is not found on server disk. Please re-upload the video.',
    };
  }

  try {
    const stats = fs.statSync(resolvedPath);
    if (stats.size === 0) {
      return {
        ok: false,
        code: 'MEDIA_UPLOAD_INCOMPLETE',
        message: 'Source media file is empty (0 bytes). Upload was incomplete.',
        path: resolvedPath,
      };
    }

    const { stdout } = await execFileAsync(ffprobePath, [
      '-v', 'error',
      '-show_format',
      '-show_streams',
      '-print_format', 'json',
      resolvedPath,
    ]);
    const data = JSON.parse(stdout);
    const vStream = data.streams?.find((s: any) => s.codec_type === 'video');
    const aStream = data.streams?.find((s: any) => s.codec_type === 'audio');

    let duration = parseFloat(data.format?.duration || '0');
    if (duration === 0 && vStream?.duration) duration = parseFloat(vStream.duration);
    if (duration === 0 && aStream?.duration) duration = parseFloat(aStream.duration);

    if (duration <= 0) {
      return {
        ok: false,
        code: 'MEDIA_PROBE_FAILED',
        message: 'Could not determine media duration from file container.',
        path: resolvedPath,
      };
    }

    let fps = 30;
    if (vStream?.r_frame_rate) {
      const [num, den] = vStream.r_frame_rate.split('/').map(Number);
      if (num && den) fps = Math.round(num / den);
    }

    return {
      ok: true,
      code: 'VALID',
      message: 'Media verified successfully.',
      path: resolvedPath,
      duration: Number(duration.toFixed(2)),
      width: vStream?.width || 0,
      height: vStream?.height || 0,
      fps,
      hasAudio: Boolean(aStream),
      hasVideo: Boolean(vStream),
    };
  } catch (err: any) {
    return {
      ok: false,
      code: 'MEDIA_CORRUPT',
      message: `Failed to probe media file: ${err.message}`,
      path: resolvedPath,
    };
  }
}
