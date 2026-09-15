/**
 * VIRALCLIP STUDIO — STORAGE TYPES
 * Interface and models for MediaStorage abstraction (Local / ObjectStorage).
 */

export interface UploadResult {
  uploadUrl: string;
  mediaId: string;
  key: string;
  fields?: Record<string, string>;
  publicUrl?: string;
}

export interface StoredMediaMetadata {
  id: string;
  originalFilename: string;
  storedFilename: string;
  filesystemPath?: string;
  publicUrl: string;
  mimeType: string;
  size: number;
  createdAt: string;
  sha256?: string;
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

export interface IMediaStorage {
  /**
   * Create an upload intent/slot and return an upload URL (presigned PUT or multipart endpoint).
   */
  createUpload(filename: string, mimeType: string): Promise<UploadResult>;

  /**
   * Get direct upload URL for an existing media ID.
   */
  getUploadUrl(mediaId: string): Promise<string>;

  /**
   * Get public or presigned read URL for an existing media ID.
   */
  getReadUrl(mediaId: string): Promise<string>;

  /**
   * Check if media item exists in storage.
   */
  exists(mediaId: string): Promise<boolean>;

  /**
   * Delete a media item and all associated artifacts.
   */
  delete(mediaId: string): Promise<void>;

  /**
   * Retrieve validated media metadata.
   */
  getMetadata(mediaId: string): Promise<StoredMediaMetadata | null>;
}
