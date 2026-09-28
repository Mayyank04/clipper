/**
 * VIRALCLIP STUDIO — ZIP PRESET SOURCE PROVIDER
 * Safe decompression protecting against Zip Bombs, Path Traversal (../../), and nested recursion. (Phases 27, 28)
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { PresetSourceProvider, DownloadedItem } from './PresetSourceProvider';
import { CaptionPresetSourceRecord, ScanReport } from '../../types';

export class ZipProvider extends PresetSourceProvider {
  readonly providerType = 'zip';

  canHandle(urlOrPath: string): boolean {
    if (!urlOrPath || typeof urlOrPath !== 'string') return false;
    const ext = path.extname(urlOrPath.toLowerCase());
    return ['.zip', '.amproject', '.ampreset'].includes(ext) || urlOrPath.endsWith('.zip');
  }

  async scan(source: CaptionPresetSourceRecord): Promise<ScanReport> {
    const filePath = source.sourceUrl;
    if (!fs.existsSync(filePath)) {
      throw new Error(`Archive file not found: ${filePath}`);
    }

    const tempScanDir = path.resolve(process.cwd(), 'temp', 'scan_zip_' + Date.now());
    await this.extractSafely(filePath, tempScanDir);

    const files = this.listDirRecursive(tempScanDir);
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

    // Cleanup temp scan directory
    try {
      fs.rmSync(tempScanDir, { recursive: true, force: true });
    } catch {}

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
    const archivePath = source.sourceUrl;
    await this.extractSafely(archivePath, tempDir);

    const files = this.listDirRecursive(tempDir);
    return files.map((fp, i) => {
      onProgress?.(i + 1, files.length, path.basename(fp));
      const stats = fs.statSync(fp);
      return {
        id: path.basename(fp),
        name: path.basename(fp),
        localPath: fp,
        mimeType: 'application/octet-stream',
        sizeBytes: stats.size,
      };
    });
  }

  /**
   * Safely unpacks a ZIP archive using a dedicated python script that enforces:
   * 1. No path traversal (no ../)
   * 2. Max 1,000 files
   * 3. Max 500MB uncompressed size
   */
  private extractSafely(archivePath: string, destDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.mkdirSync(destDir, { recursive: true });

      const pythonScript = `
import zipfile, os, sys

archive_path = sys.argv[1]
dest_dir = sys.argv[2]
max_files = 1000
max_uncompressed_bytes = 500 * 1024 * 1024
total_bytes = 0
total_files = 0

dest_canonical = os.path.realpath(dest_dir)

with zipfile.ZipFile(archive_path, 'r') as zf:
    for member in zf.infolist():
        target_path = os.path.realpath(os.path.join(dest_dir, member.filename))
        if not target_path.startswith(dest_canonical + os.sep) and target_path != dest_canonical:
            raise Exception(f"Path traversal detected in archive: {member.filename}")
        
        total_files += 1
        if total_files > max_files:
            raise Exception("Archive contains too many files (max 1000)")
        
        total_bytes += member.file_size
        if total_bytes > max_uncompressed_bytes:
            raise Exception("Decompressed size exceeds 500MB limit")

    zf.extractall(dest_dir)
print("OK")
`;

      const py = spawn('python3', ['-c', pythonScript, archivePath, destDir]);
      let stderr = '';

      py.stderr.on('data', (d) => { stderr += d.toString(); });
      py.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to safely extract ZIP: ${stderr}`));
        }
      });
    });
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
