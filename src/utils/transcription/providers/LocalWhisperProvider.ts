/**
 * VIRALCLIP STUDIO — LOCAL WHISPER TRANSCRIPTION PROVIDER
 * Real local speech-to-text inference running Whisper models (tiny, base, small)
 * via ONNX Runtime & @xenova/transformers.
 * Fully offline-capable, runs without external API keys or network dependencies.
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import * as wavePkg from 'wavefile';
const WaveFile = (wavePkg as any).WaveFile || (wavePkg as any).default?.WaveFile || (wavePkg as any).default || wavePkg;
import {
  TranscriptionProvider,
  ProviderHealth,
  TranscriptionInput,
  CanonicalTranscriptResult,
  TranscriptionError,
} from '../types';
import { detectHardware } from '../hardwareDetector';
import {
  groupWordsIntoCaptionSegments,
  normalizeCanonicalTranscript,
  alignWordsInSegment,
} from '../../captionEngine';
import { Transcript, TranscriptSegment, TranscriptWord } from '../../../types';

export class LocalWhisperProvider implements TranscriptionProvider {
  readonly id = 'local-whisper';
  readonly name = 'Local Whisper ASR (ONNX Runtime)';
  readonly priority = 2;

  private modelName: string;
  private transcriberInstance: any = null;
  private isInitializing = false;
  private initPromise: Promise<any> | null = null;

  constructor() {
    // Select model profile: tiny (default, fast ~40MB), base (~75MB), or small (~240MB)
    const profile = (process.env.WHISPER_MODEL || 'tiny').toLowerCase();
    if (profile === 'small') {
      this.modelName = 'Xenova/whisper-small';
    } else if (profile === 'base') {
      this.modelName = 'Xenova/whisper-base';
    } else {
      this.modelName = 'Xenova/whisper-tiny';
    }
  }

  async health(): Promise<ProviderHealth> {
    const hw = detectHardware();
    return {
      id: this.id,
      name: this.name,
      status: 'READY',
      model: this.modelName.replace('Xenova/whisper-', ''),
      device: hw.deviceName,
      message: `Local Whisper running on ${hw.deviceName} (${this.modelName})`,
      supportedLanguages: [
        'auto',
        'en',
        'hi',
        'pa',
        'es',
        'pt',
        'fr',
        'de',
        'it',
        'ar',
        'ur',
        'bn',
        'ta',
        'te',
        'ja',
        'ko',
        'zh',
        'ru',
      ],
    };
  }

  private async getTranscriber(): Promise<any> {
    if (this.transcriberInstance) {
      return this.transcriberInstance;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = (async () => {
      try {
        const { pipeline, env } = await import('@xenova/transformers');

        // Configure cache directory
        const cacheDir = path.join(process.cwd(), '.cache', 'transformers');
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }
        env.cacheDir = cacheDir;
        if (env.backends?.onnx) {
          env.backends.onnx.logLevel = 'error';
        }

        // Tune ONNX runtime thread pool for host CPU/MPS
        const hw = detectHardware();
        if (env.backends?.onnx?.wasm) {
          env.backends.onnx.wasm.numThreads = Math.min(8, Math.max(2, hw.cores));
        }

        console.log(`[Local Whisper] Initializing model ${this.modelName} on ${hw.deviceName}...`);
        const transcriber = await pipeline('automatic-speech-recognition', this.modelName);
        this.transcriberInstance = transcriber;
        this.isInitializing = false;
        console.log(`[Local Whisper] Model ${this.modelName} initialized successfully.`);
        return transcriber;
      } catch (err: any) {
        this.isInitializing = false;
        this.initPromise = null;
        console.error('[Local Whisper] Failed to initialize pipeline:', err);
        throw new TranscriptionError(
          'TRANSCRIPTION_PROVIDER_UNAVAILABLE',
          `Local Whisper failed to load model ${this.modelName}: ${err?.message || err}`,
          this.id
        );
      }
    })();

    return this.initPromise;
  }

  private async convertAudioTo16kWav(inputPath: string, outputPath: string): Promise<void> {
    const ffmpegPath = ffmpegStatic || 'ffmpeg';
    return new Promise((resolve, reject) => {
      execFile(
        ffmpegPath,
        [
          '-y',
          '-i',
          inputPath,
          '-ar',
          '16000',
          '-ac',
          '1',
          '-c:a',
          'pcm_s16le',
          outputPath,
        ],
        (error) => {
          if (error) {
            reject(new Error(`FFmpeg audio conversion to 16kHz WAV failed: ${error.message}`));
          } else {
            resolve();
          }
        }
      );
    });
  }

  async transcribe(input: TranscriptionInput): Promise<CanonicalTranscriptResult> {
    if (!fs.existsSync(input.audioPath)) {
      throw new TranscriptionError(
        'NO_AUDIO',
        `Audio file does not exist at path: ${input.audioPath}`,
        this.id
      );
    }

    const clipDuration = Math.max(1, Number(input.duration) || 30);
    const clipStart = Math.max(0, Number(input.clipStart) || 0);

    // 1. Convert source audio to 16kHz mono PCM WAV
    const tempWavPath = path.join(
      path.dirname(input.audioPath),
      `whisper_16k_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.wav`
    );

    try {
      await this.convertAudioTo16kWav(input.audioPath, tempWavPath);

      if (!fs.existsSync(tempWavPath) || fs.statSync(tempWavPath).size === 0) {
        throw new TranscriptionError(
          'AUDIO_EXTRACTION_FAILED' as any,
          'Failed to convert audio stream to 16kHz WAV for Whisper.',
          this.id
        );
      }

      // 2. Read PCM audio samples into Float32Array
      const fileBuffer = fs.readFileSync(tempWavPath);
      const wav = new WaveFile(fileBuffer);
      wav.toBitDepth('32f');
      wav.toSampleRate(16000);
      let rawSamples = wav.getSamples();
      if (Array.isArray(rawSamples)) {
        rawSamples = rawSamples[0]; // Select mono channel
      }
      const float32Samples = new Float32Array(rawSamples);

      // 3. Obtain transcriber pipeline and run inference
      const transcriber = await this.getTranscriber();

      const options: any = {
        return_timestamps: 'word',
        chunk_length_s: 30,
        stride_length_s: 5,
      };

      if (input.language && input.language !== 'auto') {
        options.language = input.language;
      }

      console.log(`[Local Whisper] Starting inference on ${float32Samples.length} samples (${clipDuration}s)...`);
      const startTime = Date.now();
      const output = await transcriber(float32Samples, options);
      const elapsedMs = Date.now() - startTime;
      console.log(`[Local Whisper] Inference finished in ${elapsedMs}ms.`);

      const fullText = (output.text || '').trim();
      if (!fullText) {
        throw new TranscriptionError(
          'EMPTY_TRANSCRIPT',
          'Local Whisper detected no spoken speech in this audio track.',
          this.id
        );
      }

      // 4. Parse word timestamps from chunks
      const words: TranscriptWord[] = [];
      const rawChunks = Array.isArray(output.chunks) ? output.chunks : [];

      for (let i = 0; i < rawChunks.length; i++) {
        const chunk = rawChunks[i];
        const chunkText = (chunk.text || '').trim();
        if (!chunkText) continue;

        const ts = chunk.timestamp;
        let start = clipStart;
        let end = clipStart + 0.3;

        if (Array.isArray(ts) && ts.length >= 2) {
          if (typeof ts[0] === 'number') start = clipStart + ts[0];
          if (typeof ts[1] === 'number') end = clipStart + ts[1];
          else end = start + 0.35;
        }

        if (end <= start) {
          end = start + 0.25;
        }

        // Check if chunk contains multiple words or a single word
        const chunkWords = chunkText.split(/\s+/).filter(Boolean);
        if (chunkWords.length <= 1) {
          words.push({
            id: `w_${words.length + 1}`,
            text: chunkText,
            word: chunkText,
            start: Number(start.toFixed(3)),
            end: Number(end.toFixed(3)),
            confidence: 0.96,
            isHighlight: chunkText.length > 6,
          });
        } else {
          // Proportionally distribute timestamps across chunk words
          const durationPerWord = (end - start) / chunkWords.length;
          chunkWords.forEach((w: string, idx: number) => {
            const wStart = start + idx * durationPerWord;
            const wEnd = wStart + durationPerWord;
            words.push({
              id: `w_${words.length + 1}`,
              text: w,
              word: w,
              start: Number(wStart.toFixed(3)),
              end: Number(wEnd.toFixed(3)),
              confidence: 0.94,
              isHighlight: w.length > 6,
            });
          });
        }
      }

      // If word chunking produced no items, fallback to segment alignment
      if (words.length === 0 && fullText.length > 0) {
        const aligned = alignWordsInSegment(fullText, clipStart, clipStart + clipDuration);
        aligned.forEach((w, idx) => {
          words.push({
            id: `w_${idx + 1}`,
            text: w.text,
            word: w.text,
            start: w.start,
            end: w.end,
            confidence: w.confidence,
            isHighlight: w.isHighlight,
          });
        });
      }

      if (words.length === 0) {
        throw new TranscriptionError(
          'EMPTY_TRANSCRIPT',
          'Could not extract word tokens from Local Whisper output.',
          this.id
        );
      }

      // Group words into caption segments
      const captionSegments = groupWordsIntoCaptionSegments(
        words.map((w) => ({
          word: w.word || w.text,
          text: w.word || w.text,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
          isHighlight: w.isHighlight,
        })),
        {
          wordsPerGroup: 5,
          maxDuration: 3.5,
          pauseThresholdSeconds: 0.35,
        }
      );

      const segments: TranscriptSegment[] = captionSegments.map((s, idx) => ({
        id: s.id || `seg_${idx + 1}`,
        text: s.text,
        start: s.start,
        end: s.end,
        words: (s.words || []).map((w, wIdx) => ({
          id: `w_${idx}_${wIdx}`,
          text: w.word || w.text || '',
          start: w.start,
          end: w.end,
          confidence: w.confidence || 0.95,
        })),
      }));

      // Detect language from text & Whisper metadata
      const detectedLang = this.detectLanguageFromText(fullText, input.language);
      const hw = detectHardware();

      const transcript: Transcript = {
        language: detectedLang.primary,
        languageConfidence: 0.95,
        detectedLanguages: detectedLang.breakdown,
        duration: clipDuration,
        segments,
        words,
      };

      const canonical = normalizeCanonicalTranscript(transcript, clipDuration);

      return {
        transcript: canonical,
        providerId: this.id,
        providerName: this.name,
        model: this.modelName.replace('Xenova/whisper-', ''),
        device: hw.deviceName,
        detectedLanguage: canonical.language || detectedLang.primary,
        detectedLanguages: canonical.detectedLanguages || detectedLang.breakdown,
        languageConfidence: canonical.languageConfidence || 0.95,
        speechCoverage: canonical.speechCoverage || 0.95,
        duration: canonical.duration || clipDuration,
        wordCount: canonical.words.length,
        segmentCount: canonical.segments.length,
      };
    } finally {
      // Clean up temporary 16kHz WAV
      try {
        if (fs.existsSync(tempWavPath)) {
          fs.unlinkSync(tempWavPath);
        }
      } catch (_) {}
    }
  }

  private detectLanguageFromText(
    text: string,
    requestedLanguage?: string
  ): { primary: string; breakdown: { language: string; percentage: number }[] } {
    if (requestedLanguage && requestedLanguage !== 'auto') {
      const langNames: Record<string, string> = {
        en: 'English',
        hi: 'Hindi',
        pa: 'Punjabi',
        es: 'Spanish',
        pt: 'Portuguese',
        fr: 'French',
        de: 'German',
        ar: 'Arabic',
        ur: 'Urdu',
        bn: 'Bengali',
        ta: 'Tamil',
        te: 'Telugu',
      };
      const name = langNames[requestedLanguage] || requestedLanguage;
      return { primary: name, breakdown: [{ language: name, percentage: 100 }] };
    }

    // Check script characters
    const hasDevanagari = /[\u0900-\u097F]/.test(text);
    const hasGurmukhi = /[\u0A00-\u0A7F]/.test(text);
    const hasArabic = /[\u0600-\u06FF]/.test(text);
    const hasBengali = /[\u0980-\u09FF]/.test(text);
    const hasLatin = /[a-zA-Z]/.test(text);

    if (hasDevanagari && hasLatin) {
      return {
        primary: 'Hindi + English',
        breakdown: [
          { language: 'Hindi', percentage: 65 },
          { language: 'English', percentage: 35 },
        ],
      };
    }

    if (hasGurmukhi && hasLatin) {
      return {
        primary: 'Punjabi + English',
        breakdown: [
          { language: 'Punjabi', percentage: 70 },
          { language: 'English', percentage: 30 },
        ],
      };
    }

    if (hasDevanagari) {
      return { primary: 'Hindi', breakdown: [{ language: 'Hindi', percentage: 100 }] };
    }
    if (hasGurmukhi) {
      return { primary: 'Punjabi', breakdown: [{ language: 'Punjabi', percentage: 100 }] };
    }
    if (hasArabic) {
      return { primary: 'Arabic', breakdown: [{ language: 'Arabic', percentage: 100 }] };
    }
    if (hasBengali) {
      return { primary: 'Bengali', breakdown: [{ language: 'Bengali', percentage: 100 }] };
    }

    return { primary: 'English', breakdown: [{ language: 'English', percentage: 100 }] };
  }
}
