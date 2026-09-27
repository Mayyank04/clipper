/**
 * VIRALCLIP STUDIO — OBJECT STORAGE ADAPTER (S3 / Cloudflare R2 / MinIO)
 * Implements IMediaStorage using the authoritative StorageProvider.
 */

import { IMediaStorage, StoredMediaMetadata, UploadResult } from './types';
import { StorageProvider } from './StorageProvider';

export class ObjectStorage implements IMediaStorage {
  private provider: StorageProvider;
  private metadataCache = new Map<string, StoredMediaMetadata>();

  constructor(config?: any) {
    this.provider = config ? new StorageProvider(config) : StorageProvider.getInstance();
  }

  public async createUpload(filename: string, mimeType: string): Promise<UploadResult> {
    const mediaId = `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : '.mp4';
    const key = `uploads/${mediaId}/source${ext}`;

    const uploadUrl = await this.provider.getSignedUploadUrl(key, mimeType, 3600);
    const publicUrl = this.provider.getPublicOrDirectUrl(key);

    const initialMetadata: StoredMediaMetadata = {
      id: mediaId,
      originalFilename: filename,
      storedFilename: `source${ext}`,
      publicUrl,
      mimeType,
      size: 0,
      createdAt: new Date().toISOString(),
      status: 'PROCESSING',
      duration: 0,
      width: 0,
      height: 0,
      fps: 0,
      hasAudio: false,
      hasVideo: true,
    };
    this.metadataCache.set(mediaId, initialMetadata);

    return {
      mediaId,
      key,
      uploadUrl,
      publicUrl,
    };
  }

  public async getUploadUrl(mediaId: string): Promise<string> {
    const meta = this.metadataCache.get(mediaId);
    const key = meta ? `uploads/${mediaId}/${meta.storedFilename}` : `uploads/${mediaId}/source.mp4`;
    return this.provider.getSignedUploadUrl(key, meta?.mimeType || 'video/mp4', 3600);
  }

  public async getReadUrl(mediaId: string): Promise<string> {
    const meta = this.metadataCache.get(mediaId);
    const key = meta ? `uploads/${mediaId}/${meta.storedFilename}` : `uploads/${mediaId}/source.mp4`;
    return this.provider.getSignedDownloadUrl(key, 3600);
  }

  public async exists(mediaId: string): Promise<boolean> {
    const meta = this.metadataCache.get(mediaId);
    if (!meta) return false;
    const key = `uploads/${mediaId}/${meta.storedFilename}`;
    return this.provider.exists(key);
  }

  public async delete(mediaId: string): Promise<void> {
    const meta = this.metadataCache.get(mediaId);
    if (meta) {
      const key = `uploads/${mediaId}/${meta.storedFilename}`;
      await this.provider.delete(key);
    }
    this.metadataCache.delete(mediaId);
  }

  public async getMetadata(mediaId: string): Promise<StoredMediaMetadata | null> {
    return this.metadataCache.get(mediaId) || null;
  }

  public setMetadata(mediaId: string, metadata: StoredMediaMetadata): void {
    this.metadataCache.set(mediaId, metadata);
  }

  public getProvider(): StorageProvider {
    return this.provider;
  }
}
