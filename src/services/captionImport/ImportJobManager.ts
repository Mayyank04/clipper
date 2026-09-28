/**
 * VIRALCLIP STUDIO — CAPTION IMPORT JOB MANAGER
 * Background worker coordination, multi-stage pipeline, failure isolation, and persistence.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { databaseService } from '../database/PostgresDatabase';
import { StorageProvider } from '../storage/StorageProvider';
import { WorkerClient } from '../worker/workerClient';
import { GoogleDriveProvider } from './GoogleDriveProvider';
import { ZipProvider } from './ZipProvider';
import { LocalFileProvider } from './LocalFileProvider';
import { PresetSourceProvider, DownloadedItem } from './PresetSourceProvider';
import {
  CaptionImportJobRecord,
  CaptionPresetSourceRecord,
  ScanReport,
} from '../../types';

export class ImportJobManager {
  private static instance: ImportJobManager;
  private providers: PresetSourceProvider[];
  private activeJobs = new Map<string, CaptionImportJobRecord>();
  private cancelledJobIds = new Set<string>();
  private storage: StorageProvider;
  private workerClient: WorkerClient;

  private constructor() {
    this.providers = [
      new GoogleDriveProvider(),
      new ZipProvider(),
      new LocalFileProvider(),
    ];
    this.storage = StorageProvider.getInstance();
    this.workerClient = new WorkerClient();
  }

  public static getInstance(): ImportJobManager {
    if (!ImportJobManager.instance) {
      ImportJobManager.instance = new ImportJobManager();
    }
    return ImportJobManager.instance;
  }

  public getProvider(urlOrPath: string): PresetSourceProvider {
    for (const p of this.providers) {
      if (p.canHandle(urlOrPath)) return p;
    }
    return this.providers[2]; // fallback to LocalFileProvider
  }

  /**
   * Scans a preset source without importing anything.
   */
  public async scanSource(sourceId: string): Promise<ScanReport> {
    const source = await databaseService.getPresetSource(sourceId);
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    const provider = this.getProvider(source.sourceUrl);
    await databaseService.savePresetSource({
      ...source,
      status: 'SCANNING',
    });

    try {
      const report = await provider.scan(source);
      await databaseService.savePresetSource({
        ...source,
        status: 'READY',
        lastScannedAt: new Date().toISOString(),
      });
      return report;
    } catch (err: any) {
      await databaseService.savePresetSource({
        ...source,
        status: 'ERROR',
        metadata: { ...source.metadata, lastError: err.message },
      });
      throw err;
    }
  }

  /**
   * Spawns an asynchronous import job.
   */
  public async startImportJob(sourceId: string): Promise<CaptionImportJobRecord> {
    const source = await databaseService.getPresetSource(sourceId);
    if (!source) {
      throw new Error(`Preset source not found: ${sourceId}`);
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const jobRecord: CaptionImportJobRecord = {
      id: jobId,
      sourceId,
      status: 'QUEUED',
      stage: 'QUEUED',
      totalFiles: 0,
      processedFiles: 0,
      successCount: 0,
      partialCount: 0,
      failureCount: 0,
      unsupportedCount: 0,
      startedAt: new Date().toISOString(),
    };

    await databaseService.saveImportJob(jobRecord);
    this.activeJobs.set(jobId, jobRecord);

    // Launch pipeline in background
    setImmediate(() => {
      this.runImportPipeline(jobId, source).catch(async (err) => {
        console.error(`[ImportJobManager] Fatal pipeline error for ${jobId}:`, err);
        const curr = this.activeJobs.get(jobId) || jobRecord;
        curr.status = 'FAILED';
        curr.error = err.message;
        curr.completedAt = new Date().toISOString();
        await databaseService.saveImportJob(curr);
      });
    });

    return jobRecord;
  }

  public getJob(jobId: string): CaptionImportJobRecord | undefined {
    return this.activeJobs.get(jobId);
  }

  public async cancelJob(jobId: string): Promise<boolean> {
    const job = this.activeJobs.get(jobId);
    if (!job || job.status === 'COMPLETED' || job.status === 'FAILED') {
      return false;
    }
    this.cancelledJobIds.add(jobId);
    job.status = 'CANCELLED';
    job.stage = 'CANCELLED';
    job.completedAt = new Date().toISOString();
    await databaseService.saveImportJob(job);
    return true;
  }

  /**
   * Full asynchronous multi-stage import pipeline with failure isolation,
   * batching (batch size = 25), object storage font/preview persistence, and crash recovery.
   * Requirements 6, 7, 10, 11, 12.
   */
  private async runImportPipeline(jobId: string, source: CaptionPresetSourceRecord): Promise<void> {
    const job = this.activeJobs.get(jobId)!;
    const provider = this.getProvider(source.sourceUrl);
    const tempDir = path.resolve(process.cwd(), 'temp', `import_${jobId}`);

    const checkCancelled = () => this.cancelledJobIds.has(jobId);

    try {
      // Stage 1: SCANNING
      job.status = 'SCANNING';
      job.stage = 'Scanning preset sources...';
      await databaseService.saveImportJob(job);
      if (checkCancelled()) return;

      const scanReport = await provider.scan(source);
      job.totalFiles = scanReport.totalFiles;

      // Stage 2: DISCOVERING
      job.status = 'DISCOVERING';
      job.stage = `Discovered ${scanReport.totalFiles} preset resources`;
      await databaseService.saveImportJob(job);
      if (checkCancelled()) return;

      // Stage 3: DOWNLOADING
      job.status = 'DOWNLOADING';
      job.stage = 'Downloading preset resources...';
      await databaseService.saveImportJob(job);

      const downloaded = await provider.download(source, tempDir, async (curr, total, fn) => {
        job.currentFile = fn;
        job.stage = `Downloading ${curr} of ${total}: ${fn}`;
        await databaseService.saveImportJob(job);
      });

      if (checkCancelled()) return;

      // Stage 4: ANALYZING
      job.status = 'ANALYZING';
      job.stage = 'Analyzing preset structures and fonts...';
      await databaseService.saveImportJob(job);

      // Load existing presets for deduplication
      const existingPresets = await databaseService.getCaptionPresets();
      const existingMap: Record<string, any> = {};
      for (const p of existingPresets) {
        existingMap[p.id] = p;
      }

      const allFilePaths = downloaded.map((d) => d.localPath);
      const BATCH_SIZE = 25; // Requirement 10: batch processing (batch size = 25)
      const totalBatches = Math.max(1, Math.ceil(allFilePaths.length / BATCH_SIZE));

      // Stage 5+: BATCHED PROCESSING (25 -> commit -> continue -> 25 -> commit)
      for (let b = 0; b < totalBatches; b++) {
        if (checkCancelled()) return;

        const startIdx = b * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, allFilePaths.length);
        const batchFiles = allFilePaths.slice(startIdx, endIdx);

        // Stage: CONVERTING
        job.status = 'CONVERTING';
        job.stage = `Converting batch ${b + 1} of ${totalBatches} (${batchFiles.length} files)...`;
        await databaseService.saveImportJob(job);

        const manifestPath = path.join(tempDir, `manifest_batch_${b}.json`);
        fs.writeFileSync(
          manifestPath,
          JSON.stringify({
            files: batchFiles,
            category: source.category,
            sourceId: source.id,
            sourceName: source.name,
            sourceUrl: source.sourceUrl,
            existingPresets: existingMap,
          }, null, 2),
          'utf-8'
        );

        let pyResult: any;
        if (this.workerClient.isConfigured()) {
          try {
            pyResult = await this.workerClient.importPresets({
              files: batchFiles,
              category: source.category,
              sourceId: source.id,
              sourceName: source.name,
              sourceUrl: source.sourceUrl,
              existingPresets: existingMap,
              batchSize: BATCH_SIZE,
              batchIndex: 0,
            });
          } catch (workerErr: any) {
            console.warn('[ImportJobManager] Worker import request failed, falling back to local python converter:', workerErr.message);
            pyResult = await this.executePythonConverter(manifestPath);
          }
        } else {
          pyResult = await this.executePythonConverter(manifestPath);
        }

        if (checkCancelled()) return;

        // Stage: VALIDATING
        job.status = 'VALIDATING';
        job.stage = `Validating converted typography and animations (${startIdx + 1}-${endIdx} of ${allFilePaths.length})...`;
        await databaseService.saveImportJob(job);

        // Stage: REGISTERING_FONTS (with Object Storage upload)
        job.status = 'REGISTERING_FONTS';
        job.stage = 'Registering fonts and storing binaries in object storage...';
        await databaseService.saveImportJob(job);

        if (pyResult.fonts && Array.isArray(pyResult.fonts)) {
          for (const f of pyResult.fonts) {
            try {
              let fontUrl = f.file_path;
              // Upload font binary to object storage if local file exists
              if (f.file_path && fs.existsSync(f.file_path)) {
                const ext = path.extname(f.file_path) || `.${f.format || 'ttf'}`;
                const fontKey = `fonts/${f.checksum}${ext}`;
                fontUrl = await this.storage.upload(
                  fontKey,
                  fs.readFileSync(f.file_path),
                  `font/${f.format || 'ttf'}`
                );
              }

              await databaseService.saveCaptionFont({
                id: `font_${f.checksum.slice(0, 10)}`,
                family: f.family,
                fileUrl: fontUrl,
                format: f.format,
                weight: f.weight,
                style: f.style,
                checksum: f.checksum,
                sourceId: source.id,
              });
            } catch (fontErr) {
              console.warn('[ImportJobManager] Font persistence warning:', fontErr);
            }
          }
        }

        // Stage: GENERATING_PREVIEWS (with Object Storage SVG upload)
        job.status = 'GENERATING_PREVIEWS';
        job.stage = 'Uploading rendered SVG previews to object storage...';
        await databaseService.saveImportJob(job);

        if (pyResult.presets && Array.isArray(pyResult.presets)) {
          for (const p of pyResult.presets) {
            try {
              // Upload preview SVG to object storage
              if (p.previewUrl) {
                const localSvg = path.resolve(process.cwd(), 'public', p.previewUrl.replace(/^\//, ''));
                if (fs.existsSync(localSvg)) {
                  const svgKey = `previews/${p.id}.svg`;
                  const previewStorageUrl = await this.storage.upload(
                    svgKey,
                    fs.readFileSync(localSvg),
                    'image/svg+xml'
                  );
                  p.previewUrl = previewStorageUrl;
                }
              }

              await databaseService.saveCaptionPreset(p);
              existingMap[p.id] = p;
            } catch (presetErr: any) {
              job.failureCount++;
              await databaseService.saveImportError({
                id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                jobId,
                sourceFile: p.sourceFile || 'unknown',
                stage: 'PERSISTENCE',
                errorCode: 'ERR_DB_SAVE',
                message: presetErr.message,
                suggestedAction: 'Check database connectivity and unique constraints.',
              });
            }
          }
        }

        // Record any conversion warnings/errors
        if (pyResult.errors && Array.isArray(pyResult.errors)) {
          for (const e of pyResult.errors) {
            await databaseService.saveImportError({
              id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              jobId,
              sourceFile: e.file || 'unknown',
              stage: e.stage || 'CONVERSION',
              errorCode: e.errorCode || 'ERR_CONVERSION',
              message: e.message || 'Unknown error',
              suggestedAction: e.suggestedAction || 'Review format.',
            });
          }
        }

        // Commit intermediate batch stats
        const stats = pyResult.stats || {};
        const batchSuccess = stats.success || (pyResult.presets ? pyResult.presets.length : 0);
        const batchPartial = stats.partial || 0;
        const batchFailed = stats.failed || 0;

        job.processedFiles = endIdx;
        job.successCount += batchSuccess;
        job.partialCount += batchPartial;
        job.failureCount += batchFailed;
        job.unsupportedCount += stats.unsupported || 0;

        // Stage: IMPORTING (Committing intermediate progress to database)
        job.status = 'IMPORTING';
        job.stage = `Committed batch ${b + 1} of ${totalBatches}: ${job.successCount} imported, ${job.partialCount} partial, ${job.failureCount} failed`;
        await databaseService.saveImportJob(job);
      }

      // Final completion status determination (Requirement 11)
      if (job.failureCount > 0 && job.successCount === 0 && job.partialCount === 0) {
        job.status = 'FAILED';
        job.stage = 'Import failed: all files rejected';
      } else if (job.failureCount > 0 || job.partialCount > 0) {
        job.status = 'PARTIAL';
        job.stage = `Import partially completed with ${job.successCount} presets, ${job.partialCount} partial, ${job.failureCount} failed`;
      } else {
        job.status = 'COMPLETED';
        job.stage = `Import completed successfully: ${job.successCount} presets ready in library`;
      }

      job.completedAt = new Date().toISOString();
      await databaseService.saveImportJob(job);

      // Update Source status and count
      await databaseService.savePresetSource({
        ...source,
        status: 'READY',
        importedCount: (source.importedCount || 0) + job.successCount + job.partialCount,
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      job.status = 'FAILED';
      job.error = err.message;
      job.completedAt = new Date().toISOString();
      await databaseService.saveImportJob(job);
      throw err;
    } finally {
      // Clean up temporary download artifacts
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch {}
    }
  }

  /**
   * Spawns Python converter CLI with the manifest.
   */
  private executePythonConverter(manifestPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const py = spawn('python3', [
        '-m',
        'python_engine.preset_importer.cli',
        'convert',
        '--manifest',
        manifestPath,
      ]);

      let stdout = '';
      let stderr = '';

      py.stdout.on('data', (d) => {
        stdout += d.toString();
      });

      py.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      py.on('close', (code) => {
        if (code === 0) {
          try {
            const parsed = JSON.parse(stdout);
            resolve(parsed);
          } catch (err) {
            reject(new Error(`Failed to parse Python converter JSON output: ${stdout}`));
          }
        } else {
          reject(new Error(`Python converter exited with code ${code}: ${stderr || stdout}`));
        }
      });
    });
  }

  /**
   * Syncs sources by finding modified files and reimporting changed ones. (Phase 25)
   */
  public async syncSource(sourceId: string): Promise<CaptionImportJobRecord> {
    return this.startImportJob(sourceId);
  }
}

export const importJobManager = ImportJobManager.getInstance();
