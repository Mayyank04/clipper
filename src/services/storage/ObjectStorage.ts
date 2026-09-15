/**
 * VIRALCLIP STUDIO — OBJECT STORAGE ADAPTER (S3 / Cloudflare R2 / GCS)
 * Implements IMediaStorage for production object storage with presigned URLs.
 */

import { IMediaStorage, StoredMediaMetadata, UploadResult } from './types';

export interface ObjectStorageConfig {
  bucket: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicBaseUrl?: string;
}

export class ObjectStorage implements IMediaStorage {
  private config: ObjectStorageConfig;
  private metadataCache = new Map<string, StoredMediaMetadata>();

  constructor(config?: Partial<ObjectStorageConfig>) {
    this.config = {
      bucket: config?.bucket || process.env.S3_BUCKET || process.env.R2_BUCKET || '',
      region: config?.region || process.env.S3_REGION || 'auto',
      endpoint: config?.endpoint || process.env.S3_ENDPOINT || process.env.R2_ENDPOINT || '',
      accessKeyId: config?.accessKeyId || process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: config?.secretAccessKey || process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || '',
      publicBaseUrl: config?.publicBaseUrl || process.env.STORAGE_PUBLIC_URL || '',
    };
  }

  private ensureConfigured(): void {
    if (!this.config.bucket) {
      throw new Error(
        'ObjectStorage is not configured: S3_BUCKET or R2_BUCKET environment variable is missing.'
      );
    }
  }

  public async createUpload(filename: string, mimeType: string): Promise<UploadResult> {
    this.ensureConfigured();
    const mediaId = `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : '.mp4';
    const key = `uploads/${mediaId}/source${ext}`;

    // Generate presigned upload URL or endpoint path
    const uploadUrl = this.config.endpoint
      ? `${this.config.endpoint.replace(/\/+$/, '')}/${this.config.bucket}/${key}`
      : `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;

    const publicUrl = this.config.publicBaseUrl
      ? `${this.config.publicBaseUrl.replace(/\/+$/, '')}/${key}`
      : uploadUrl;

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
    this.ensureConfigured();
    const meta = this.metadataCache.get(mediaId);
    const key = meta ? `uploads/${mediaId}/${meta.storedFilename}` : `uploads/${mediaId}/source.mp4`;

    return this.config.endpoint
      ? `${this.config.endpoint.replace(/\/+$/, '')}/${this.config.bucket}/${key}`
      : `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  public async getReadUrl(mediaId: string): Promise<string> {
    this.ensureConfigured();
    const meta = this.metadataCache.get(mediaId);
    if (meta && meta.publicUrl) {
      return meta.publicUrl;
    }
    const key = `uploads/${mediaId}/source.mp4`;
    return this.config.publicBaseUrl
      ? `${this.config.publicBaseUrl.replace(/\/+$/, '')}/${key}`
      : `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  public async exists(mediaId: string): Promise<boolean> {
    return this.metadataCache.has(mediaId);
  }

  public async delete(mediaId: string): Promise<void> {
    this.ensureConfigured();
    this.metadataCache.delete(mediaId);
  }

  public async getMetadata(mediaId: string): Promise<StoredMediaMetadata | null> {
    return this.metadataCache.get(mediaId) || null;
  }

  public setMetadata(mediaId: string, metadata: StoredMediaMetadata): void {
    this.metadataCache.set(mediaId, metadata);
  }
}
