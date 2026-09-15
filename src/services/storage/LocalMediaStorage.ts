/**
 * VIRALCLIP STUDIO — LOCAL MEDIA STORAGE ADAPTER
 * Implements IMediaStorage for local filesystem development (data/media).
 */

import fs from 'fs';
import path from 'path';
import { IMediaStorage, StoredMediaMetadata, UploadResult } from './types';
import { MediaStorage, StoredMedia } from '../../utils/mediaStorage';

export class LocalMediaStorage implements IMediaStorage {
  private localDelegate: MediaStorage;

  constructor() {
    this.localDelegate = MediaStorage.getInstance();
  }

  public async createUpload(filename: string, mimeType: string): Promise<UploadResult> {
    const mediaId = `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const ext = path.extname(filename) || (mimeType.includes('audio') ? '.mp3' : '.mp4');
    const key = `${mediaId}/source${ext}`;

    return {
      mediaId,
      key,
      uploadUrl: `/api/upload?mediaId=${mediaId}`,
      publicUrl: `/media/${mediaId}/source${ext}`,
    };
  }

  public async getUploadUrl(mediaId: string): Promise<string> {
    return `/api/upload?mediaId=${mediaId}`;
  }

  public async getReadUrl(mediaId: string): Promise<string> {
    const media = this.localDelegate.getMedia(mediaId);
    if (media && media.publicUrl) {
      return media.publicUrl;
    }
    return `/media/${mediaId}/source.mp4`;
  }

  public async exists(mediaId: string): Promise<boolean> {
    const media = this.localDelegate.getMedia(mediaId);
    if (!media) return false;
    return fs.existsSync(media.filesystemPath);
  }

  public async delete(mediaId: string): Promise<void> {
    const media = this.localDelegate.getMedia(mediaId);
    if (media && media.filesystemPath) {
      const dir = path.dirname(media.filesystemPath);
      if (fs.existsSync(dir)) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
        } catch (e) {
          console.warn(`[LocalMediaStorage] Failed to delete dir ${dir}:`, e);
        }
      }
    }
    this.localDelegate.delete(mediaId);
  }

  public async getMetadata(mediaId: string): Promise<StoredMediaMetadata | null> {
    const media: StoredMedia | undefined = this.localDelegate.getMedia(mediaId);
    if (!media) return null;

    return {
      id: media.id,
      originalFilename: media.originalFilename,
      storedFilename: media.storedFilename,
      filesystemPath: media.filesystemPath,
      publicUrl: media.publicUrl,
      mimeType: media.mimeType,
      size: media.size,
      createdAt: media.createdAt,
      sha256: media.sha256,
      status: media.status,
      duration: media.duration,
      width: media.width,
      height: media.height,
      fps: media.fps,
      hasAudio: media.hasAudio,
      hasVideo: media.hasVideo,
      videoCodec: media.videoCodec,
      audioCodec: media.audioCodec,
      sampleRate: media.sampleRate,
      channels: media.channels,
      error: media.error,
    };
  }
}
