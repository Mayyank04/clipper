/**
 * VIRALCLIP STUDIO — LOCAL FILE / DIRECTORY PRESET SOURCE PROVIDER
 */

import fs from 'fs';
import path from 'path';
import { PresetSourceProvider, DownloadedItem } from './PresetSourceProvider';
import { CaptionPresetSourceRecord, ScanReport } from '../../types';

export class LocalFileProvider extends PresetSourceProvider {
  readonly providerType = 'local_file';

  canHandle(urlOrPath: string): boolean {
    if (!urlOrPath || typeof urlOrPath !== 'string') return false;
    return (
      urlOrPath.startsWith('/') ||
      urlOrPath.startsWith('./') ||
      urlOrPath.startsWith('../') ||
      fs.existsSync(urlOrPath)
    );
  }

  async scan(source: CaptionPresetSourceRecord): Promise<ScanReport> {
    const targetPath = path.resolve(source.sourceUrl);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Target path not found: ${source.sourceUrl}`);
    }

    const files = fs.statSync(targetPath).isDirectory()
      ? this.listDirRecursive(targetPath)
      : [targetPath];

    const categories: Record<string, number> = {
      XML: 0,
      JSON: 0,
      Fonts: 0,
      ZIP: 0,
      Images: 0,
      Videos: 0,
      Unknown: 0,
    };

    let supported = 0;
    let partial = 0;
    let unsupported = 0;

    const items = files.map((fp) => {
      const fn = path.basename(fp);
      const ext = path.extname(fp).toLowerCase();
      let detectedType = 'unknown';
      let comp: 'SUPPORTED' | 'PARTIAL' | 'UNSUPPORTED' = 'UNSUPPORTED';

      if (ext === '.xml') {
        detectedType = 'xml';
        comp = 'SUPPORTED';
        categories.XML++;
        supported++;
      } else if (ext === '.json') {
        detectedType = 'json';
        comp = 'SUPPORTED';
        categories.JSON++;
        supported++;
      } else if (['.ttf', '.otf', '.woff', '.woff2'].includes(ext)) {
        detectedType = 'font';
        comp = 'SUPPORTED';
        categories.Fonts++;
        supported++;
      } else {
        categories.Unknown++;
        unsupported++;
      }

      return {
        id: fn,
        name: fn,
        path: fp,
        mimeType: `application/${detectedType}`,
        sizeBytes: fs.statSync(fp).size,
        extension: ext,
        detectedType: detectedType as any,
        compatibility: comp,
      };
    });

    return {
      sourceId: source.id,
      sourceName: source.name,
      sourceUrl: source.sourceUrl,
      totalFiles: items.length,
      categories,
      supportedCount: supported,
      partiallySupportedCount: partial,
      unsupportedCount: unsupported,
      items,
      scannedAt: new Date().toISOString(),
    };
  }

  async download(
    source: CaptionPresetSourceRecord,
    tempDir: string,
    onProgress?: (current: number, total: number, fileName: string) => void
  ): Promise<DownloadedItem[]> {
    fs.mkdirSync(tempDir, { recursive: true });
    const targetPath = path.resolve(source.sourceUrl);
    const files = fs.statSync(targetPath).isDirectory()
      ? this.listDirRecursive(targetPath)
      : [targetPath];

    const downloaded: DownloadedItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const fp = files[i];
      const fn = path.basename(fp);
      onProgress?.(i + 1, files.length, fn);

      const dest = path.join(tempDir, fn);
      if (dest !== fp) {
        fs.copyFileSync(fp, dest);
      }
      downloaded.push({
        id: fn,
        name: fn,
        localPath: dest,
        mimeType: 'application/octet-stream',
        sizeBytes: fs.statSync(dest).size,
      });
    }

    return downloaded;
  }

  private listDirRecursive(dir: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file.startsWith('.')) continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(this.listDirRecursive(fullPath));
      } else {
        results.push(fullPath);
      }
    }
    return results;
  }
}
