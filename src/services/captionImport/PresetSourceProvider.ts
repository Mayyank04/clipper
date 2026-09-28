/**
 * VIRALCLIP STUDIO — PRESET SOURCE PROVIDER INTERFACE
 * Pluggable abstraction supporting Google Drive, Local Files, ZIPs, etc. (Phase 2)
 */

import { CaptionPresetSourceRecord, ScanReport } from '../../types';

export interface DownloadedItem {
  id: string;
  name: string;
  localPath: string;
  mimeType: string;
  sizeBytes: number;
}

export abstract class PresetSourceProvider {
  abstract readonly providerType: string;

  /**
   * Returns true if this provider is suited to handle the given URL or path.
   */
  abstract canHandle(urlOrPath: string): boolean;

  /**
   * Scans the source discovering files, folders, extensions, sizes, and compatibility.
   * Does NOT import anything. (Phase 6, 7)
   */
  abstract scan(source: CaptionPresetSourceRecord): Promise<ScanReport>;

  /**
   * Downloads a specific file or all files from the source to a local directory for conversion.
   */
  abstract download(
    source: CaptionPresetSourceRecord,
    tempDir: string,
    onProgress?: (current: number, total: number, fileName: string) => void
  ): Promise<DownloadedItem[]>;
}
