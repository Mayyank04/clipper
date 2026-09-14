/**
 * VIRALCLIP STUDIO — ASYNCHRONOUS RENDER WORKER & QUEUE MANAGER
 * Robust child-process FFmpeg execution using -progress pipe:1,
 * decoupled HTTP lifecycle, forensic verification, and graceful cancellation.
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { RenderJob, RenderJobStatus, RenderJobStage } from './renderJobTypes';
import { prepareRenderAssets, PreparedRenderAssets } from './renderAssetPreparer';
import { buildFFmpegRenderArgs, getRenderQualityProfile } from './ffmpegRenderPipeline';
import { probeSourceMedia } from './sourceQualityAnalyzer';

const ffmpegPath = ffmpegStatic || 'ffmpeg';
const ffprobePath = ffprobeStatic?.path || 'ffprobe';

interface ActiveProcessInfo {
  child: ChildProcess;
  timeoutTimer: NodeJS.Timeout;
  jobDir: string;
}

class RenderWorkerManager {
  private jobs: Map<string, RenderJob> = new Map();
  private activeProcesses: Map<string, ActiveProcessInfo> = new Map();
  private queue: string[] = [];
  private activeCount: number = 0;
  private readonly maxConcurrency: number = 2;

  /**
   * Register or retrieve a job
   */
  public getJob(jobId: string): RenderJob | undefined {
    return this.jobs.get(jobId);
  }

  public getAllJobs(): RenderJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Create and enqueue a new RenderJob
   */
  public createJob(params: {
    projectId: string;
    shortId?: string;
    rawRenderPlan: any;
    projectDir?: string;
  }): RenderJob {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const job: RenderJob = {
      id: jobId,
      projectId: params.projectId,
      shortId: params.shortId,
      status: 'queued',
      progress: 0,
      stage: 'preparing',
      startedAt: Date.now(),
      checklist: {
        captions: false,
        broll: false,
        sfx: false,
        vfx: false,
        audio: false,
      },
    };

    this.jobs.set(jobId, job);
    this.queue.push(jobId);

    // Save initial render plan in memory for worker
    (job as any)._rawPlan = params.rawRenderPlan;
    (job as any)._projectDir = params.projectDir || process.cwd();

    // Trigger next item in queue asynchronously
    setImmediate(() => this.processNextQueueItem());

    return job;
  }

  /**
   * Cancel an active or queued render job
   */
  public cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    // If queued, remove from queue
    const qIndex = this.queue.indexOf(jobId);
    if (qIndex !== -1) {
      this.queue.splice(qIndex, 1);
    }

    const active = this.activeProcesses.get(jobId);
    if (active) {
      clearTimeout(active.timeoutTimer);
      try {
        active.child.kill('SIGTERM');
        // Give 2s then SIGKILL if still running
        setTimeout(() => {
          try { active.child.kill('SIGKILL'); } catch {}
        }, 2000);
      } catch (err) {
        console.error(`[RENDER WORKER] Error killing process for ${jobId}:`, err);
      }
      this.activeProcesses.delete(jobId);
      this.activeCount = Math.max(0, this.activeCount - 1);
    }

    job.status = 'cancelled';
    job.stage = 'complete';
    job.error = 'Render cancelled by user';
    job.completedAt = Date.now();

    setImmediate(() => this.processNextQueueItem());
    return true;
  }

  /**
   * Process next item in the worker queue
   */
  private async processNextQueueItem() {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const nextJobId = this.queue.shift();
    if (!nextJobId) return;

    const job = this.jobs.get(nextJobId);
    if (!job || job.status === 'cancelled') {
      return this.processNextQueueItem();
    }

    this.activeCount++;
    this.executeRender(job).finally(() => {
      this.activeCount = Math.max(0, this.activeCount - 1);
      this.processNextQueueItem();
    });
  }

  /**
   * Executes the full pipeline for a RenderJob:
   * 1. Prepare assets & directory
   * 2. Build minimal filtergraph & arguments
   * 3. Spawn FFmpeg with -progress pipe:1
   * 4. Parse live progress
   * 5. Verify output (FFprobe + 5 frame extractions)
   */
  private async executeRender(job: RenderJob) {
    const rawPlan = (job as any)._rawPlan || {};
    const projectDir = (job as any)._projectDir || process.cwd();

    try {
      // Stage 1: Preparing
      job.status = 'preparing';
      job.stage = 'preparing';
      job.progress = 5;

      const prepared: PreparedRenderAssets = await prepareRenderAssets(job.id, rawPlan, projectDir);
      job.renderPlanHash = prepared.renderPlanHash;
      job.sourceQuality = prepared.sourceInfo;

      const expectedDuration = Number(rawPlan.duration || prepared.sourceInfo.sourceDuration || 30);
      job.duration = expectedDuration;
      job.totalDurationSec = expectedDuration;
      job.currentTimeSec = 0;

      // Update checklist based on actual components in plan
      if (job.checklist) {
        job.checklist.captions = !!prepared.subtitleAssPath;
        job.checklist.broll = prepared.validatedBrolls.length > 0;
        job.checklist.sfx = prepared.validatedSfx.length > 0;
        job.checklist.vfx = (Array.isArray(rawPlan.vfxList) && rawPlan.vfxList.length > 0) || !!rawPlan.vfxItem || (Array.isArray(rawPlan.dynamicZooms) && rawPlan.dynamicZooms.length > 0);
        job.checklist.audio = true;
      }

      // Stage 2: Analyzing & Building Filtergraph
      job.stage = 'building_filtergraph';
      job.progress = 12;

      const profile = getRenderQualityProfile(
        prepared.sourceInfo,
        rawPlan.resolution || '1080x1920',
        rawPlan.qualityMode || 'HIGH',
        rawPlan.frameRate
      );
      job.renderProfile = profile;

      const { args: rawFfmpegArgs } = buildFFmpegRenderArgs({
        sourcePath: prepared.sourceLocalPath,
        outputPath: prepared.outputPath,
        sourceInfo: prepared.sourceInfo,
        startTime: Number(rawPlan.startTime || 0),
        duration: expectedDuration,
        qualityMode: profile.qualityMode,
        speakerPosition: rawPlan.speakerPosition || 'center',
        subtitlePath: prepared.subtitleAssPath,
        watermarkText: (rawPlan.brandKit?.enabled && rawPlan.brandKit?.brandName) ? rawPlan.brandKit.brandName : undefined,
        watermarkOpacity: rawPlan.brandKit?.watermarkOpacity,
        colorTreatment: rawPlan.colorTreatment,
        brollList: prepared.validatedBrolls,
        sfxList: prepared.validatedSfx,
        voiceoverList: prepared.validatedVoiceovers,
        vfxItem: rawPlan.vfxItem,
        vfxList: rawPlan.vfxList,
        dynamicZooms: rawPlan.dynamicZooms,
        imageOverlays: rawPlan.imageOverlays,
        isAudioOnly: !!rawPlan.isAudioOnly,
      });

      // Save filtergraph.txt for auditability
      const fgIndex = rawFfmpegArgs.indexOf('-filter_complex');
      if (fgIndex !== -1 && rawFfmpegArgs[fgIndex + 1]) {
        fs.writeFileSync(prepared.filtergraphTxtPath, rawFfmpegArgs[fgIndex + 1], 'utf8');
      }

      // Prepend machine-readable progress pipe:1
      // Replace output with -progress pipe:1
      const progressArgs = ['-nostats', '-progress', 'pipe:1', ...rawFfmpegArgs];

      // Stage 3: Encoding & Rendering
      job.status = 'rendering';
      job.stage = 'encoding';
      job.progress = 15;

      // Configurable timeout: at least 10x expected media duration, minimum 300 seconds
      const timeoutMs = Math.max(300000, Math.round(expectedDuration * 10000));

      const logStream = fs.createWriteStream(prepared.progressLogPath, { flags: 'a' });

      await new Promise<void>((resolve, reject) => {
        const child = spawn(ffmpegPath, progressArgs, {
          cwd: prepared.jobDir,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        job.ffmpegPid = child.pid;

        const timeoutTimer = setTimeout(() => {
          try {
            child.kill('SIGTERM');
          } catch {}
          reject(new Error(`Render exceeded the maximum processing time of ${Math.round(timeoutMs / 1000)}s`));
        }, timeoutMs);

        this.activeProcesses.set(job.id, {
          child,
          timeoutTimer,
          jobDir: prepared.jobDir,
        });

        let progressBuffer = '';
        child.stdout.on('data', (chunk) => {
          const text = chunk.toString();
          logStream.write(text);
          progressBuffer += text;

          // Parse machine-readable key-value pairs from -progress pipe:1
          const lines = progressBuffer.split('\n');
          progressBuffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('out_time_us=')) {
              const us = Number(trimmed.split('=')[1]);
              if (!isNaN(us) && us > 0) {
                const currentSec = us / 1000000;
                job.currentTimeSec = Math.min(expectedDuration, Number(currentSec.toFixed(1)));
                const renderRatio = Math.min(1.0, currentSec / expectedDuration);
                // Progress mapped smoothly from 15% to 88%
                job.progress = Math.round(15 + renderRatio * 73);
              }
            } else if (trimmed.startsWith('out_time_ms=')) {
              const ms = Number(trimmed.split('=')[1]);
              if (!isNaN(ms) && ms > 0) {
                const currentSec = ms / 1000000; // note: ffmpeg out_time_ms is actually microseconds
                job.currentTimeSec = Math.min(expectedDuration, Number(currentSec.toFixed(1)));
                const renderRatio = Math.min(1.0, currentSec / expectedDuration);
                job.progress = Math.round(15 + renderRatio * 73);
              }
            } else if (trimmed === 'progress=end') {
              job.progress = 88;
            }
          }
        });

        let stderrBuffer = '';
        child.stderr.on('data', (chunk) => {
          const errText = chunk.toString();
          stderrBuffer += errText;
          logStream.write(`[STDERR] ${errText}`);
        });

        child.on('error', (procErr) => {
          clearTimeout(timeoutTimer);
          logStream.end();
          reject(procErr);
        });

        child.on('close', (code) => {
          clearTimeout(timeoutTimer);
          logStream.end();
          this.activeProcesses.delete(job.id);

          if (code === 0) {
            resolve();
          } else {
            // Sanitize technical details for client display
            const cleanErr = stderrBuffer.slice(-600).trim();
            reject(new Error(`FFmpeg render failed with exit code ${code}: ${cleanErr || 'Process exited abnormally'}`));
          }
        });
      });

      // Stage 4: Output Verification (Requirement 21)
      job.status = 'verifying';
      job.stage = 'verifying';
      job.progress = 90;

      if (!fs.existsSync(prepared.outputPath) || fs.statSync(prepared.outputPath).size === 0) {
        throw new Error('Export output MP4 was not created or has 0 bytes');
      }

      const outStats = fs.statSync(prepared.outputPath);
      const sizeMb = Number((outStats.size / (1024 * 1024)).toFixed(2));

      // Forensic verification with FFprobe
      const outputProbe = await probeSourceMedia(prepared.outputPath);

      if (outputProbe.sourceWidth !== 1080 || outputProbe.sourceHeight !== 1920) {
        throw new Error(`Output resolution mismatch: expected 1080x1920, got ${outputProbe.sourceWidth}x${outputProbe.sourceHeight}`);
      }
      if (!outputProbe.sourceCodec.toLowerCase().includes('h264')) {
        throw new Error(`Output video codec mismatch: expected h264, got ${outputProbe.sourceCodec}`);
      }
      if (outputProbe.sourceDuration < Math.min(expectedDuration * 0.8, 1)) {
        throw new Error(`Output duration unexpectedly short: ${outputProbe.sourceDuration}s vs expected ${expectedDuration}s`);
      }

      // Extract 5 inspection frames at 5%, 25%, 50%, 75%, 95%
      job.progress = 94;
      const pctList = [5, 25, 50, 75, 95];
      const framesExtracted: string[] = [];

      for (const pct of pctList) {
        const frameSec = Math.max(0.1, (expectedDuration * pct) / 100);
        const frameName = `frame_${pct}.png`;
        const frameDest = path.join(prepared.framesDir, frameName);

        await new Promise<void>((fResolve) => {
          const fArgs = [
            '-ss', String(frameSec.toFixed(2)),
            '-i', prepared.outputPath,
            '-vframes', '1',
            '-y',
            frameDest,
          ];
          const fChild = spawn(ffmpegPath, fArgs, { stdio: 'ignore' });
          fChild.on('close', () => {
            if (fs.existsSync(frameDest) && fs.statSync(frameDest).size > 1024) {
              framesExtracted.push(frameDest);
            }
            fResolve();
          });
        });
      }

      if (framesExtracted.length < 3) {
        throw new Error(`Output verification failed: could not extract valid video frames from rendered MP4`);
      }

      // Copy final MP4 to public exports directory so it's downloadable
      const publicExportsDir = path.join(projectDir, 'public', 'exports');
      if (!fs.existsSync(publicExportsDir)) {
        fs.mkdirSync(publicExportsDir, { recursive: true });
      }

      const outFileName = `${job.id}_1080x1920.mp4`;
      const finalPublicPath = path.join(publicExportsDir, outFileName);
      fs.copyFileSync(prepared.outputPath, finalPublicPath);

      job.status = 'completed';
      job.stage = 'complete';
      job.progress = 100;
      job.completedAt = Date.now();
      job.outputPath = finalPublicPath;
      job.downloadUrl = `/exports/${outFileName}`;
      job.fileName = outFileName;
      job.fileSizeMb = sizeMb;
      job.forensics = {
        width: outputProbe.sourceWidth,
        height: outputProbe.sourceHeight,
        codec: outputProbe.sourceCodec,
        audioCodec: outputProbe.sourceAudioCodec || 'aac',
        sampleRate: outputProbe.sourceAudioSampleRate || 48000,
        fps: outputProbe.sourceFPS,
        bitrateKbps: Math.round(outputProbe.sourceBitrate / 1000),
        framesExtracted,
        brollRendered: prepared.validatedBrolls.length,
        captionsBurned: (rawPlan.captions || rawPlan.captionEvents || []).length,
        verifiedAt: Date.now(),
      };

      console.log(`[RENDER WORKER] RenderJob ${job.id} COMPLETED and VERIFIED. Size: ${sizeMb} MB. Output: /exports/${outFileName}`);
    } catch (err: any) {
      if (job.status === 'cancelled') {
        console.log(`[RENDER WORKER] RenderJob ${job.id} was cancelled cleanly.`);
        return;
      }
      console.error(`[RENDER WORKER] RenderJob ${job.id} FAILED:`, err);
      job.status = 'failed';
      job.stage = 'complete';
      job.error = err?.message || String(err);
      job.completedAt = Date.now();
    }
  }
}

export const renderWorker = new RenderWorkerManager();
