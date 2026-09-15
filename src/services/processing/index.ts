/**
 * VIRALCLIP STUDIO — PROCESSING ADAPTER FACTORY
 * Selects LocalProcessingAdapter (development) or RemoteProcessingAdapter (production worker)
 * based on the PROCESSING_MODE environment variable.
 */

import { IProcessingAdapter } from './types';
import { LocalProcessingAdapter } from './LocalProcessingAdapter';
import { RemoteProcessingAdapter } from './RemoteProcessingAdapter';

export * from './types';
export * from './LocalProcessingAdapter';
export * from './RemoteProcessingAdapter';

let activeProcessingAdapter: IProcessingAdapter | null = null;

export function getProcessingAdapter(): IProcessingAdapter {
  if (activeProcessingAdapter) {
    return activeProcessingAdapter;
  }

  const mode = (process.env.PROCESSING_MODE || 'local').toLowerCase();

  if (mode === 'worker' || mode === 'remote') {
    activeProcessingAdapter = new RemoteProcessingAdapter();
    console.log('[Processing] Initialized RemoteProcessingAdapter (dispatch to WORKER_URL)');
  } else {
    activeProcessingAdapter = new LocalProcessingAdapter();
    console.log('[Processing] Initialized LocalProcessingAdapter (local FFmpeg / Whisper / yt-dlp)');
  }

  return activeProcessingAdapter;
}

export function setProcessingAdapter(adapter: IProcessingAdapter): void {
  activeProcessingAdapter = adapter;
}
