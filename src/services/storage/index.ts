/**
 * VIRALCLIP STUDIO — STORAGE SERVICE FACTORY
 * Dispatches to LocalMediaStorage or ObjectStorage based on STORAGE_DRIVER env.
 */

import { IMediaStorage } from './types';
import { LocalMediaStorage } from './LocalMediaStorage';
import { ObjectStorage } from './ObjectStorage';

export * from './types';
export * from './LocalMediaStorage';
export * from './ObjectStorage';

let activeStorage: IMediaStorage | null = null;

export function getMediaStorage(): IMediaStorage {
  if (activeStorage) {
    return activeStorage;
  }

  const driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();

  if (driver === 's3' || driver === 'r2' || driver === 'object') {
    activeStorage = new ObjectStorage();
    console.log(`[Storage] Initialized ObjectStorage driver (${driver.toUpperCase()})`);
  } else {
    activeStorage = new LocalMediaStorage();
    console.log('[Storage] Initialized LocalMediaStorage driver (data/media)');
  }

  return activeStorage;
}

export function setMediaStorage(storage: IMediaStorage): void {
  activeStorage = storage;
}
