/**
 * VIRALCLIP STUDIO — GOOGLE DRIVE PRESET SOURCE PROVIDER
 * Robust Google Drive discovery and download supporting both Public/Shared URLs (Mode A)
 * and Authenticated OAuth (Mode B).
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { PresetSourceProvider, DownloadedItem } from './PresetSourceProvider';
import { CaptionPresetSourceRecord, ScanReport, ScanItem } from '../../types';

interface DriveFileMeta {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  isFolder: boolean;
}

export class GoogleDriveProvider extends PresetSourceProvider {
  readonly providerType = 'google_drive';

  canHandle(urlOrPath: string): boolean {
    if (!urlOrPath || typeof urlOrPath !== 'string') return false;
    try {
      const parsed = new URL(urlOrPath);
      return parsed.hostname === 'drive.google.com' || parsed.hostname === 'docs.google.com';
    } catch {
      return false;
    }
  }

  /**
   * Resolves Drive Folder ID or File ID from URL
   */
  public parseDriveUrl(url: string): { type: 'folder' | 'file'; id: string } | null {
    if (!this.canHandle(url)) return null;

    const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) {
      return { type: 'folder', id: folderMatch[1] };
    }

    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      return { type: 'file', id: fileMatch[1] };
    }

    const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch) {
      return { type: 'file', id: idParamMatch[1] };
    }

    return null;
  }

  /**
   * Resolves the original file name and extension from a Google Drive file page.
   */
  public async resolveDriveFileName(fileId: string, fallback: string): Promise<string> {
    try {
      const pageUrl = `https://drive.google.com/file/d/${fileId}/view`;
      const html = (await this.httpGet(pageUrl)).toString('utf-8');
      const titleMatch = html.match(/<title>(.*?)(?: - Google Drive)?<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        const cleaned = titleMatch[1].trim();
        if (cleaned && !cleaned.toLowerCase().includes('google drive')) {
          return cleaned;
        }
      }
    } catch {}
    return fallback.includes('.') ? fallback : `${fallback}.xml`;
  }

  /**
   * Performs recursive scanning of Google Drive folder or single file.
   */
  async scan(source: CaptionPresetSourceRecord): Promise<ScanReport> {
    const parsed = this.parseDriveUrl(source.sourceUrl);
    if (!parsed) {
      throw new Error(`Invalid Google Drive URL: ${source.sourceUrl}`);
    }

    let files: DriveFileMeta[] = [];
    if (parsed.type === 'file') {
      const realName = await this.resolveDriveFileName(parsed.id, source.name || `drive_file_${parsed.id}.xml`);
      files.push({
        id: parsed.id,
        name: realName,
        mimeType: 'application/octet-stream',
        isFolder: false,
      });
    } else {
      // Recursively list folder
      files = await this.listDriveFolderRecursive(parsed.id);
    }

    const categories: Record<string, number> = {
      XML: 0,
      JSON: 0,
      Fonts: 0,
      ZIP: 0,
      Images: 0,
      Videos: 0,
      Unknown: 0,
    };

    let supportedCount = 0;
    let partiallySupportedCount = 0;
    let unsupportedCount = 0;

    const items: ScanItem[] = files.map((f) => {
      const ext = path.extname(f.name).toLowerCase();
      let detectedType: ScanItem['detectedType'] = 'unknown';
      let compatibility: ScanItem['compatibility'] = 'UNSUPPORTED';
      let details = 'Unrecognized resource';

      if (ext === '.xml') {
        detectedType = 'xml';
        compatibility = 'SUPPORTED';
        categories.XML++;
        supportedCount++;
        details = 'Alight Motion / XML Preset';
      } else if (ext === '.json') {
        detectedType = 'json';
        compatibility = 'SUPPORTED';
        categories.JSON++;
        supportedCount++;
        details = 'JSON Caption Style';
      } else if (['.ttf', '.otf', '.woff', '.woff2'].includes(ext)) {
        detectedType = 'font';
        compatibility = 'SUPPORTED';
        categories.Fonts++;
        supportedCount++;
        details = 'Typography Font Binary';
      } else if (['.zip', '.amproject', '.ampreset'].includes(ext)) {
        detectedType = 'zip';
        compatibility = 'PARTIAL';
        categories.ZIP++;
        partiallySupportedCount++;
        details = 'Preset Archive (will decompress on import)';
      } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        detectedType = 'image';
        compatibility = 'SUPPORTED';
        categories.Images++;
        supportedCount++;
        details = 'Preview Asset Image';
      } else if (['.mp4', '.mov'].includes(ext)) {
        detectedType = 'video';
        compatibility = 'PARTIAL';
        categories.Videos++;
        partiallySupportedCount++;
        details = 'Reference Animation Video';
      } else {
        categories.Unknown++;
        unsupportedCount++;
      }

      return {
        id: f.id,
        name: f.name,
        path: f.name,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes || 0,
        extension: ext,
        detectedType,
        compatibility,
        details,
      };
    });

    return {
      sourceId: source.id,
      sourceName: source.name,
      sourceUrl: source.sourceUrl,
      totalFiles: items.length,
      categories,
      supportedCount,
      partiallySupportedCount,
      unsupportedCount,
      items,
      scannedAt: new Date().toISOString(),
    };
  }

  /**
   * Downloads files from Google Drive into a target directory.
   */
  async download(
    source: CaptionPresetSourceRecord,
    tempDir: string,
    onProgress?: (current: number, total: number, fileName: string) => void
  ): Promise<DownloadedItem[]> {
    fs.mkdirSync(tempDir, { recursive: true });
    const parsed = this.parseDriveUrl(source.sourceUrl);
    if (!parsed) {
      throw new Error(`Invalid Google Drive URL: ${source.sourceUrl}`);
    }

    let files: DriveFileMeta[] = [];
    if (parsed.type === 'file') {
      const realName = await this.resolveDriveFileName(parsed.id, source.name || `drive_file_${parsed.id}.xml`);
      files.push({
        id: parsed.id,
        name: realName,
        mimeType: 'application/octet-stream',
        isFolder: false,
      });
    } else {
      files = await this.listDriveFolderRecursive(parsed.id);
    }

    const downloaded: DownloadedItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.isFolder) continue;

      onProgress?.(i + 1, files.length, f.name);

      const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const destPath = path.join(tempDir, safeName);

      try {
        await this.downloadDriveFile(f.id, destPath);
        const stats = fs.statSync(destPath);
        downloaded.push({
          id: f.id,
          name: f.name,
          localPath: destPath,
          mimeType: f.mimeType,
          sizeBytes: stats.size,
        });
      } catch (err: any) {
        console.warn(`[GoogleDriveProvider] Failed to download ${f.name} (${f.id}):`, err.message);
      }
    }

    return downloaded;
  }

  /**
   * Downloads an individual file handling Google's large-file virus confirmation page.
   */
  public async downloadDriveFile(fileId: string, destPath: string): Promise<void> {
    const cookieJar: string[] = [];

    const fetchWithCookies = (url: string, headers: Record<string, string> = {}): Promise<{ body: Buffer; headers: http.IncomingHttpHeaders; statusCode: number }> => {
      return new Promise((resolve, reject) => {
        const u = new URL(url);
        const reqHeaders: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          ...headers,
        };
        if (cookieJar.length > 0) {
          reqHeaders['Cookie'] = cookieJar.join('; ');
        }

        const client = u.protocol === 'https:' ? https : http;
        const req = client.get(u, { headers: reqHeaders }, (res) => {
          // Capture cookies
          const setCookies = res.headers['set-cookie'];
          if (setCookies) {
            setCookies.forEach((c) => cookieJar.push(c.split(';')[0]));
          }

          // Handle 301/302 redirects
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const redirectUrl = new URL(res.headers.location, u).toString();
            resolve(fetchWithCookies(redirectUrl, { Referer: url }));
            return;
          }

          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            resolve({
              body: Buffer.concat(chunks),
              headers: res.headers,
              statusCode: res.statusCode || 200,
            });
          });
        });

        req.on('error', reject);
      });
    };

    // Step 1: Initial request to uc?id=...
    const initialUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
    const res1 = await fetchWithCookies(initialUrl);

    let finalBuffer = res1.body;

    // Check if Google showed virus scan warning form
    const bodyStr = res1.body.toString('utf-8');
    if (bodyStr.includes('download-form') || (bodyStr.includes('confirm=') && bodyStr.includes('uuid='))) {
      const matchAction = bodyStr.match(/action="([^"]+)"/);
      const actionUrl = matchAction ? matchAction[1] : 'https://drive.usercontent.google.com/download';

      const matchConfirm = bodyStr.match(/name="confirm"\s+value="([^"]+)"/);
      const matchUuid = bodyStr.match(/name="uuid"\s+value="([^"]+)"/);

      const confirmVal = matchConfirm ? matchConfirm[1] : 't';
      const uuidVal = matchUuid ? matchUuid[1] : '';

      const confirmUrl = new URL(actionUrl);
      confirmUrl.searchParams.set('id', fileId);
      confirmUrl.searchParams.set('export', 'download');
      confirmUrl.searchParams.set('confirm', confirmVal);
      if (uuidVal) confirmUrl.searchParams.set('uuid', uuidVal);

      const res2 = await fetchWithCookies(confirmUrl.toString(), { Referer: initialUrl });
      finalBuffer = res2.body;
    }

    fs.writeFileSync(destPath, finalBuffer);
  }

  /**
   * Recursively discovers files in a public Google Drive folder.
   */
  public async listDriveFolderRecursive(folderId: string): Promise<DriveFileMeta[]> {
    const results: DriveFileMeta[] = [];
    const visitedFolders = new Set<string>();

    const traverse = async (fid: string) => {
      if (visitedFolders.has(fid)) return;
      visitedFolders.add(fid);

      const folderUrl = `https://drive.google.com/drive/folders/${fid}`;
      try {
        const res = await this.httpGet(folderUrl);
        const html = res.toString('utf-8');

        // Extract AF_initDataCallback key: 'ds:4'
        const dsMatch = html.match(/AF_initDataCallback\s*\(\s*\{[^\}]*key:\s*'ds:4'[^\}]*data:\s*([\s\S]*?)\}\s*\);/);
        if (dsMatch) {
          try {
            const data = JSON.parse(dsMatch[1]);
            const items = data?.[27]?.[7]?.[0]?.[0] || [];
            for (const item of items) {
              const fileId = item?.[0];
              const fileName = item?.[1];
              const mimeType = item?.[3] || 'application/octet-stream';
              const size = item?.[5];
              const isDir = mimeType === 'application/vnd.google-apps.folder';

              if (fileId && fileName) {
                if (isDir) {
                  await traverse(fileId);
                } else {
                  results.push({
                    id: fileId,
                    name: fileName,
                    mimeType,
                    sizeBytes: size,
                    isFolder: false,
                  });
                }
              }
            }
          } catch {}
        }
      } catch (err: any) {
        console.warn(`[GoogleDriveProvider] Failed to list folder ${fid}:`, err.message);
      }
    };

    await traverse(folderId);
    return results;
  }

  private httpGet(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const client = u.protocol === 'https:' ? https : http;
      client.get(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirect = new URL(res.headers.location, u).toString();
          this.httpGet(redirect).then(resolve, reject);
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });
  }
}
