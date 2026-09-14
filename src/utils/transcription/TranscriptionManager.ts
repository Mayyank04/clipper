/**
 * VIRALCLIP STUDIO — TRANSCRIPTION MANAGER
 * Central orchestrator managing provider discovery, health monitoring,
 * priority fallback chains, audio extraction caching, and transcript caching.
 * Local Whisper is the primary default provider (Priority 1).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import {
  TranscriptionProvider,
  ProviderHealth,
  TranscriptionInput,
  CanonicalTranscriptResult,
  TranscriptionJob,
  TranscriptionJobStage,
  TranscriptionError,
} from './types';
import { LocalWhisperProvider } from './providers/LocalWhisperProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { detectHardware } from './hardwareDetector';
import {
  canonicalTranscriptToSegments,
  generateAutoScriptFromTranscript,
} from '../captionEngine';
import { Transcript, CaptionSegment, ScriptSection } from '../../types';

export interface ManagerTranscribeOptions {
  sourceMediaPath: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
  language?: string;
  title?: string;
  topic?: string;
  forceRefresh?: boolean;
  onProgress?: (stage: TranscriptionJobStage, message: string, percent: number) => void;
}

export interface ManagerTranscribeResult {
  success: true;
  canonicalTranscript: Transcript;
  captions: CaptionSegment[];
  scriptSections: ScriptSection[];
  detectedLanguages: any[];
  speechCoverage: number;
  language: string;
  languageConfidence: number;
  providerUsed: string;
  model?: string;
  device?: string;
  fromCache?: boolean;
}

export class TranscriptionManager {
  private static instance: TranscriptionManager | null = null;

  private providers: TranscriptionProvider[] = [];
  private audioExtractionCache = new Map<string, string>(); // hash -> audioPath on disk
  private transcriptCache = new Map<string, ManagerTranscribeResult>(); // hash -> cached result
  private activeJobs = new Map<string, TranscriptionJob>();

  private constructor() {
    // Priority 1: Canonical Local Whisper (runs offline, zero external dependencies)
    this.registerProvider(new LocalWhisperProvider());
    // Priority 2: Google Gemini Cloud ASR (optional, requires GEMINI_API_KEY)
    this.registerProvider(new GeminiProvider());
  }

  public static getInstance(): TranscriptionManager {
    if (!TranscriptionManager.instance) {
      TranscriptionManager.instance = new TranscriptionManager();
    }
    return TranscriptionManager.instance;
  }

  public registerProvider(provider: TranscriptionProvider): void {
    const existingIdx = this.providers.findIndex((p) => p.id === provider.id);
    if (existingIdx >= 0) {
      this.providers[existingIdx] = provider;
    } else {
      this.providers.push(provider);
    }
    // Maintain ascending priority order (1 is highest)
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  public getProviders(): TranscriptionProvider[] {
    return [...this.providers];
  }

  /**
   * Evaluates the health of all registered providers.
   */
  public async getProvidersHealth(): Promise<{
    providers: ProviderHealth[];
    selected: string;
    device: string;
    hardware: ReturnType<typeof detectHardware>;
  }> {
    const hw = detectHardware();
    const healthResults: ProviderHealth[] = [];

    for (const provider of this.providers) {
      try {
        const h = await provider.health();
        healthResults.push(h);
      } catch (err: any) {
        healthResults.push({
          id: provider.id,
          name: provider.name,
          status: 'UNAVAILABLE',
          error: err?.message || String(err),
        });
      }
    }

    // Determine the active/selected provider (highest priority READY provider)
    const readyProvider = healthResults.find((p) => p.status === 'READY');
    const selectedId = readyProvider ? readyProvider.id : 'none';

    return {
      providers: healthResults,
      selected: selectedId,
      device: hw.deviceName,
      hardware: hw,
    };
  }

  /**
   * Probes true media duration using ffprobe.
   */
  private async probeDuration(filePath: string): Promise<number> {
    const ffprobePath = (ffprobeStatic as any)?.path || 'ffprobe';
    return new Promise((resolve) => {
      execFile(
        ffprobePath,
        ['-v', 'quiet', '-print_format', 'json', '-show_format', filePath],
        (err, stdout) => {
          if (!err && stdout) {
            try {
              const data = JSON.parse(stdout);
              const dur = parseFloat(data?.format?.duration);
              if (!isNaN(dur) && dur > 0) {
                return resolve(dur);
              }
            } catch (_) {}
          }
          resolve(30);
        }
      );
    });
  }

  /**
   * Extracts and caches a normalized 16kHz mono PCM WAV audio segment from source media.
   * Deterministic, standard WAV format ideal for Whisper and audio analysis.
   */
  public async extractOrGetCachedAudio(
    sourceMediaPath: string,
    startTime: number,
    duration?: number
  ): Promise<string> {
    const fileStats = fs.statSync(sourceMediaPath);
    const durStr = duration && duration > 0 ? duration.toFixed(2) : 'full';
    const hashPayload = `${sourceMediaPath}_${fileStats.size}_${fileStats.mtimeMs}_${startTime.toFixed(2)}_${durStr}`;
    const cacheKey = crypto.createHash('sha256').update(hashPayload).digest('hex');

    const cacheDir = path.join(process.cwd(), 'public', 'audio', 'extracted_cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cachedFilePath = path.join(cacheDir, `audio_${cacheKey}.wav`);

    if (fs.existsSync(cachedFilePath) && fs.statSync(cachedFilePath).size > 0) {
      return cachedFilePath;
    }

    // Extract audio using FFmpeg as 16kHz mono PCM 16-bit WAV
    const ffmpegPath = ffmpegStatic || 'ffmpeg';
    const args = ['-y'];

    if (startTime > 0) {
      args.push('-ss', startTime.toFixed(3));
    }
    args.push('-i', sourceMediaPath);
    if (duration && duration > 0) {
      args.push('-t', duration.toFixed(3));
    }
    args.push(
      '-vn',
      '-ar',
      '16000',
      '-ac',
      '1',
      '-c:a',
      'pcm_s16le',
      cachedFilePath
    );

    await new Promise<void>((resolve, reject) => {
      execFile(ffmpegPath, args, (err) => {
        if (err) {
          reject(new Error(`FFmpeg audio extraction to 16kHz WAV failed: ${err.message}`));
        } else {
          resolve();
        }
      });
    });

    if (!fs.existsSync(cachedFilePath) || fs.statSync(cachedFilePath).size === 0) {
      throw new Error('Failed to extract audio track: zero bytes produced');
    }

    return cachedFilePath;
  }

  /**
   * Main entry point for transcription with fallback, caching, disk persistence, and progress updates.
   */
  public async transcribe(options: ManagerTranscribeOptions): Promise<ManagerTranscribeResult> {
    const startTime = Math.max(0, Number(options.startTime) || 0);
    let duration = Number(options.duration) || 0;
    const language = options.language || 'auto';

    if (!fs.existsSync(options.sourceMediaPath)) {
      throw new TranscriptionError(
        'NO_MEDIA',
        `Source media file not found at: ${options.sourceMediaPath}`
      );
    }

    // If duration not specified or <= 0, probe the actual media file
    if (duration <= 0) {
      const mediaDur = await this.probeDuration(options.sourceMediaPath);
      duration = Math.max(1, mediaDur - startTime);
    }

    // 1. Check Memory & Disk Transcript Cache (Phases 23 & 24)
    const fileStats = fs.statSync(options.sourceMediaPath);
    const sourceHash = crypto
      .createHash('sha256')
      .update(`${options.sourceMediaPath}_${fileStats.size}_${fileStats.mtimeMs}`)
      .digest('hex');

    const transcriptCacheKey = `${sourceHash}_${startTime.toFixed(2)}_${duration.toFixed(2)}_${language}`;
    const cacheDir = path.join(process.cwd(), 'public', 'audio', 'extracted_cache');
    const diskTranscriptPath = path.join(cacheDir, `transcript_${transcriptCacheKey}.json`);

    if (!options.forceRefresh) {
      if (this.transcriptCache.has(transcriptCacheKey)) {
        const cached = this.transcriptCache.get(transcriptCacheKey)!;
        options.onProgress?.('COMPLETED', 'Loaded from cache', 100);
        return {
          ...cached,
          fromCache: true,
        };
      }

      if (fs.existsSync(diskTranscriptPath)) {
        try {
          const rawDisk = fs.readFileSync(diskTranscriptPath, 'utf8');
          const parsed = JSON.parse(rawDisk);
          if (parsed && parsed.success && parsed.canonicalTranscript) {
            this.transcriptCache.set(transcriptCacheKey, parsed);
            options.onProgress?.('COMPLETED', 'Loaded from disk cache', 100);
            return {
              ...parsed,
              fromCache: true,
            };
          }
        } catch (_) {}
      }
    }

    // 2. Extract Audio (16kHz mono PCM 16-bit WAV)
    options.onProgress?.('EXTRACTING_AUDIO', 'Extracting audio stream...', 10);
    const audioPath = await this.extractOrGetCachedAudio(
      options.sourceMediaPath,
      startTime,
      duration
    );

    // 3. Provider Discovery & Priority Fallback (Local Whisper is Priority 1)
    options.onProgress?.('CHECKING_PROVIDER', 'Loading transcription engine...', 20);
    const providerHealths: ProviderHealth[] = [];

    for (const provider of this.providers) {
      let health: ProviderHealth;
      try {
        health = await provider.health();
      } catch (err: any) {
        health = {
          id: provider.id,
          name: provider.name,
          status: 'UNAVAILABLE',
          error: err?.message || String(err),
        };
      }
      providerHealths.push(health);

      if (health.status !== 'READY') {
        console.log(`[TranscriptionManager] Provider ${provider.name} is ${health.status} (${health.message || health.error || ''}). Skipping.`);
        continue;
      }

      // Provider is READY: attempt transcription
      try {
        console.log(`[TranscriptionManager] Attempting transcription via ${provider.name}...`);
        options.onProgress?.(
          'TRANSCRIBING',
          `Transcribing with ${provider.name}...`,
          45
        );

        const transcriptionResult: CanonicalTranscriptResult = await provider.transcribe({
          audioPath,
          sourceMediaPath: options.sourceMediaPath,
          language,
          wordTimestamps: true,
          clipStart: startTime,
          duration,
        });

        options.onProgress?.('DETECTING_LANGUAGE', 'Detecting language & formatting...', 80);
        options.onProgress?.('BUILDING_CAPTIONS', 'Building captions & timeline sync...', 90);

        // Derive captions and Auto Script narrative blocks
        const captions = canonicalTranscriptToSegments(transcriptionResult.transcript);
        const scriptSections = generateAutoScriptFromTranscript(transcriptionResult.transcript);

        const finalResult: ManagerTranscribeResult = {
          success: true,
          canonicalTranscript: transcriptionResult.transcript,
          captions,
          scriptSections,
          detectedLanguages: transcriptionResult.detectedLanguages || [],
          speechCoverage: transcriptionResult.speechCoverage,
          language: transcriptionResult.detectedLanguage,
          languageConfidence: transcriptionResult.languageConfidence,
          providerUsed: provider.id,
          model: transcriptionResult.model,
          device: transcriptionResult.device,
          fromCache: false,
        };

        // Cache successful result in memory and persist on disk (Phase 24)
        this.transcriptCache.set(transcriptCacheKey, finalResult);
        try {
          fs.writeFileSync(diskTranscriptPath, JSON.stringify(finalResult, null, 2), 'utf8');
          const diskCaptionsPath = path.join(cacheDir, `captions_${transcriptCacheKey}.json`);
          fs.writeFileSync(diskCaptionsPath, JSON.stringify(captions, null, 2), 'utf8');
        } catch (saveErr) {
          console.warn('[TranscriptionManager] Notice persisting transcript cache:', saveErr);
        }

        options.onProgress?.('COMPLETED', 'Transcription ready', 100);
        return finalResult;
      } catch (providerError: any) {
        console.warn(`[TranscriptionManager] Provider ${provider.name} failed:`, providerError);
        // Continue loop to fall back to next available provider in chain
      }
    }

    // 4. All Providers Down / Unavailable
    options.onProgress?.('FAILED', 'No speech-to-text provider available', 0);
    throw new TranscriptionError(
      'TRANSCRIPTION_PROVIDER_UNAVAILABLE',
      'No speech-to-text provider is currently available.',
      undefined,
      providerHealths
    );
  }

  /**
   * Creates an asynchronous transcription job tracking stage and progress.
   */
  public createJob(options: ManagerTranscribeOptions): TranscriptionJob {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const job: TranscriptionJob = {
      id: jobId,
      stage: 'QUEUED',
      progressPercent: 0,
      stageMessage: 'Transcription job queued...',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.activeJobs.set(jobId, job);

    // Run async execution without blocking
    (async () => {
      try {
        const result = await this.transcribe({
          ...options,
          onProgress: (stage, message, percent) => {
            if (job.stage === 'CANCELLED') return;
            job.stage = stage;
            job.stageMessage = message;
            job.progressPercent = percent;
            job.updatedAt = Date.now();
          },
        });

        if (job.stage === 'CANCELLED') return;

        job.stage = 'COMPLETED';
        job.progressPercent = 100;
        job.stageMessage = 'Transcription complete';
        job.result = result;
        job.providerUsed = result.providerUsed;
        job.model = result.model;
        job.device = result.device;
        job.updatedAt = Date.now();
      } catch (err: any) {
        if (job.stage === 'CANCELLED') return;
        job.stage = 'FAILED';
        job.progressPercent = 0;
        job.stageMessage = err?.message || 'Transcription failed';
        job.error = {
          code: err?.code || 'TRANSCRIPTION_FAILED',
          message: err?.message || 'Speech-to-text could not complete',
          providerStatuses: err?.providerStatuses,
        };
        job.updatedAt = Date.now();
      }
    })();

    return job;
  }

  public getJob(jobId: string): TranscriptionJob | undefined {
    return this.activeJobs.get(jobId);
  }

  public cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (!job) return false;
    job.stage = 'CANCELLED';
    job.stageMessage = 'Job cancelled by user';
    job.updatedAt = Date.now();
    return true;
  }
}
