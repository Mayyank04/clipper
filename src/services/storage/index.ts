/**
 * VIRALCLIP STUDIO — STORAGE SERVICE FACTORY
 */

import { IMediaStorage } from './types';
import { LocalMediaStorage } from './LocalMediaStorage';
import { ObjectStorage } from './ObjectStorage';
import { StorageProvider } from './StorageProvider';

let storageInstance: IMediaStorage | null = null;

export function getMediaStorage(): IMediaStorage {
  if (!storageInstance) {
    const hasS3Config = Boolean(
      process.env.STORAGE_BUCKET ||
      process.env.S3_BUCKET ||
      process.env.R2_BUCKET
    );

    if (hasS3Config || process.env.NODE_ENV === 'production') {
      storageInstance = new ObjectStorage();
    } else {
      storageInstance = new LocalMediaStorage();
    }
  }
  return storageInstance;
}

export { StorageProvider };
export * from './types';
export * from './StorageProvider';
export * from './LocalMediaStorage';
export * from './ObjectStorage';
