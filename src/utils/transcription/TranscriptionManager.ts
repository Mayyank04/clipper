/**
 * VIRALCLIP STUDIO — TRANSCRIPTION MANAGER
 * Central orchestrator managing provider discovery, health monitoring,
 * priority fallback chains, audio extraction caching, and transcript caching.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import {
  TranscriptionProvider,
  ProviderHealth,
  TranscriptionInput,
  CanonicalTranscriptResult,
  TranscriptionJob,
  TranscriptionJobStage,
  TranscriptionError,
} from './types';
import { GeminiProvider } from './providers/GeminiProvider';
import { LocalWhisperProvider } from './providers/LocalWhisperProvider';
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
    // Register default providers in priority order
    // Priority 1: Gemini Cloud ASR
    // Priority 2: Local Whisper (ONNX Runtime)
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new LocalWhisperProvider());
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

    // Determine the active/selected provider
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
   * Extracts and caches a normalized audio segment from source media.
   * Requirement 13: Pipeline source.mp4 -> audio hash -> extracted audio cache -> ASR.
   * Reuses the exact same extracted audio if primary provider fails.
   */
  public async extractOrGetCachedAudio(
    sourceMediaPath: string,
    startTime: number,
    duration: number
  ): Promise<string> {
    const fileStats = fs.statSync(sourceMediaPath);
    const hashPayload = `${sourceMediaPath}_${fileStats.size}_${fileStats.mtimeMs}_${startTime.toFixed(2)}_${duration.toFixed(2)}`;
    const cacheKey = crypto.createHash('sha256').update(hashPayload).digest('hex');

    const cacheDir = path.join(process.cwd(), 'public', 'audio', 'extracted_cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cachedFilePath = path.join(cacheDir, `audio_${cacheKey}.mp3`);

    if (fs.existsSync(cachedFilePath) && fs.statSync(cachedFilePath).size > 0) {
      return cachedFilePath;
    }

    // Extract audio using FFmpeg
    const ffmpegPath = ffmpegStatic || 'ffmpeg';
    await new Promise<void>((resolve, reject) => {
      execFile(
        ffmpegPath,
        [
          '-y',
          '-ss',
          startTime.toFixed(3),
          '-t',
          duration.toFixed(3),
          '-i',
          sourceMediaPath,
          '-vn',
          '-acodec',
          'libmp3lame',
          '-q:a',
          '2',
          cachedFilePath,
        ],
        (err) => {
          if (err) {
            reject(new Error(`FFmpeg audio extraction failed: ${err.message}`));
          } else {
            resolve();
          }
        }
      );
    });

    if (!fs.existsSync(cachedFilePath) || fs.statSync(cachedFilePath).size === 0) {
      throw new Error('Failed to extract audio track: zero bytes produced');
    }

    return cachedFilePath;
  }

  /**
   * Main entry point for transcription with fallback, caching, and progress updates.
   */
  public async transcribe(options: ManagerTranscribeOptions): Promise<ManagerTranscribeResult> {
    const startTime = Math.max(0, Number(options.startTime) || 0);
    const duration = Math.max(1, Number(options.duration) || 30);
    const language = options.language || 'auto';

    if (!fs.existsSync(options.sourceMediaPath)) {
      throw new TranscriptionError(
        'NO_MEDIA',
        `Source media file not found at: ${options.sourceMediaPath}`
      );
    }

    // 1. Check Transcript Cache (Requirement 14)
    const fileStats = fs.statSync(options.sourceMediaPath);
    const sourceHash = crypto
      .createHash('sha256')
      .update(`${options.sourceMediaPath}_${fileStats.size}_${fileStats.mtimeMs}`)
      .digest('hex');

    const transcriptCacheKey = `${sourceHash}_${startTime.toFixed(2)}_${duration.toFixed(2)}_${language}`;

    if (!options.forceRefresh && this.transcriptCache.has(transcriptCacheKey)) {
      const cached = this.transcriptCache.get(transcriptCacheKey)!;
      options.onProgress?.('COMPLETED', 'Loaded from cache', 100);
      return {
        ...cached,
        fromCache: true,
      };
    }

    // 2. Extract Audio (Requirement 13)
    options.onProgress?.('EXTRACTING_AUDIO', 'Preparing audio stream...', 15);
    const audioPath = await this.extractOrGetCachedAudio(
      options.sourceMediaPath,
      startTime,
      duration
    );

    // 3. Provider Discovery & Priority Fallback (Requirements 1, 2, 5)
    options.onProgress?.('CHECKING_PROVIDER', 'Checking transcription providers...', 30);
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
          55
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

        // Cache successful result
        this.transcriptCache.set(transcriptCacheKey, finalResult);
        options.onProgress?.('COMPLETED', 'Transcription ready', 100);

        return finalResult;
      } catch (providerError: any) {
        console.warn(`[TranscriptionManager] Provider ${provider.name} failed:`, providerError);
        // Continue loop to fall back to next available provider in chain
      }
    }

    // 4. All Providers Down / Unavailable (Requirements 11, 22)
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
            job.stage = stage;
            job.stageMessage = message;
            job.progressPercent = percent;
            job.updatedAt = Date.now();
          },
        });

        job.stage = 'COMPLETED';
        job.progressPercent = 100;
        job.stageMessage = 'Transcription complete';
        job.result = result;
        job.providerUsed = result.providerUsed;
        job.model = result.model;
        job.device = result.device;
        job.updatedAt = Date.now();
      } catch (err: any) {
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
}
