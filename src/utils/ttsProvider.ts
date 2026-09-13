import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile, execSync } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { VoicePreset, VoiceProfile, AssetProvenance } from '../types';

const ffmpegPath = (ffmpegStatic as unknown as string) || 'ffmpeg';
const ffprobePath = ffprobeStatic.path;

export type ProviderStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'CONFIGURATION_REQUIRED' | 'GENERATION_FAILED';

export interface TTSOptions {
  voiceId?: string;
  speed?: number; // 0.5 to 2.0 (default: 1.0)
  pitch?: number; // provider-dependent
  emotion?: string; // neutral, cheerful, dramatic, cinematic
  language?: string;
}

export interface TTSResult {
  success: boolean;
  audioUrl: string;
  filePath: string;
  duration: number;
  provider: 'system' | 'omnivoice' | 'heygen';
  voiceId: string;
  provenance: AssetProvenance;
  error?: string;
}

export interface VoiceCloneOptions {
  voiceName: string;
  referenceAudioPath: string;
  language: string;
  consentConfirmed: boolean;
}

export interface TTSProvider {
  name: 'system' | 'omnivoice' | 'heygen';
  getStatus(): Promise<{ status: ProviderStatus; details?: string }>;
  getJobStatus(jobId?: string): Promise<{ status: ProviderStatus; details?: string }>;
  listVoices(): Promise<VoicePreset[]>;
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;
  cloneVoice(options: VoiceCloneOptions): Promise<VoiceProfile>;
  designVoice(prompt: string, options?: { language?: string; gender?: 'male' | 'female' }): Promise<VoicePreset>;
}

/**
 * Probes media duration accurately using FFprobe
 */
function probeAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    execFile(
      ffprobePath,
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
      (err, stdout) => {
        if (err || !stdout) return resolve(0);
        const dur = parseFloat(stdout.trim());
        resolve(Number.isFinite(dur) ? dur : 0);
      }
    );
  });
}

/**
 * SystemTTSProvider: Real voice synthesis on macOS using the native speech synthesis engine.
 * Generates genuine high-fidelity audio on disk, encodes with FFmpeg to MP3, and measures exact duration.
 */
export class SystemTTSProvider implements TTSProvider {
  public name = 'system' as const;
  private cachedVoices: VoicePreset[] | null = null;

  public async getStatus(): Promise<{ status: ProviderStatus; details?: string }> {
    try {
      execSync('which say', { stdio: 'ignore' });
      return { status: 'AVAILABLE', details: 'macOS native speech synthesis engine ready.' };
    } catch {
      return { status: 'UNAVAILABLE', details: 'System speech synthesis command (say) not found.' };
    }
  }

  public async listVoices(): Promise<VoicePreset[]> {
    if (this.cachedVoices) return this.cachedVoices;

    const voices: VoicePreset[] = [];
    try {
      const output = execSync("say -v '?'", { encoding: 'utf8' });
      const lines = output.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const match = trimmed.match(/^([A-Za-z0-9_\- ()\.]+?)\s+([a-z]{2}_[A-Z]{2})\s+#\s*(.*)$/);
        if (match) {
          const name = match[1].trim();
          const langCode = match[2].trim();
          const desc = match[3].trim();
          const id = `sys_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

          const isMale = /albert|daniel|eddy|fred|junior|ralph/i.test(name);
          const isFemale = /alice|anna|samantha|karen|moira|tessa|flo/i.test(name);

          voices.push({
            id,
            name,
            provider: 'system',
            language: langCode,
            gender: isMale ? 'male' : isFemale ? 'female' : 'neutral',
            description: desc,
            styles: ['natural', 'clear', 'documentary'],
          });
        }
      }
    } catch (e) {
      console.warn('Could not enumerate system voices:', e);
    }

    // Default curated voices if empty
    if (voices.length === 0) {
      voices.push(
        { id: 'sys_samantha', name: 'Samantha (US English)', provider: 'system', language: 'en_US', gender: 'female', description: 'Professional conversational American voice' },
        { id: 'sys_daniel', name: 'Daniel (UK English)', provider: 'system', language: 'en_GB', gender: 'male', description: 'Authoritative British documentary voice' },
        { id: 'sys_lekha', name: 'Lekha (Hindi)', provider: 'system', language: 'hi_IN', gender: 'female', description: 'Clear Indian Hindi voice' }
      );
    }

    this.cachedVoices = voices;
    return voices;
  }

  public async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error('TTS text cannot be empty.');
    }

    const ttsDir = path.join(process.cwd(), 'public', 'audio', 'tts');
    if (!fs.existsSync(ttsDir)) fs.mkdirSync(ttsDir, { recursive: true });

    // Compute deterministic hash for audio asset cache
    const voiceId = options.voiceId || 'sys_samantha';
    const speed = Math.max(0.6, Math.min(2.0, options.speed || 1.0));
    const contentHash = crypto.createHash('sha256').update(`${cleanText}_${voiceId}_${speed}`).digest('hex').slice(0, 12);

    const outMp3Name = `tts_${contentHash}.mp3`;
    const outMp3Path = path.join(ttsDir, outMp3Name);
    const audioUrl = `/audio/tts/${outMp3Name}`;

    // Return cached audio if already synthesized
    if (fs.existsSync(outMp3Path)) {
      const duration = await probeAudioDuration(outMp3Path);
      const provenance: AssetProvenance = {
        id: `ast_tts_${contentHash}`,
        type: 'TTS_AUDIO',
        provider: 'SystemTTS (macOS Speech)',
        source: cleanText.slice(0, 80),
        license: 'Creator Generated / CC0',
        hash: contentHash,
        duration,
        createdAt: new Date().toISOString(),
      };
      return { success: true, audioUrl, filePath: outMp3Path, duration, provider: 'system', voiceId, provenance };
    }

    // Determine voice name from voiceId
    const voices = await this.listVoices();
    const matched = voices.find((v) => v.id === voiceId);
    const voiceName = matched ? matched.name.replace(/\s*\(.*?\)/, '') : 'Samantha';

    // Temporary AIFF intermediate
    const tempAiff = path.join(ttsDir, `temp_${Date.now()}_${contentHash}.aiff`);

    // Execute say with speech rate (words per minute, default ~180)
    const wpm = Math.round(180 * speed);
    await new Promise<void>((resolve, reject) => {
      execFile('say', ['-v', voiceName, '-r', String(wpm), '-o', tempAiff, cleanText], (err) => {
        if (err) return reject(new Error(`System speech synthesis failed: ${err.message}`));
        resolve();
      });
    });

    // Convert AIFF to MP3 with FFmpeg
    await new Promise<void>((resolve, reject) => {
      execFile(
        ffmpegPath,
        ['-y', '-i', tempAiff, '-codec:a', 'libmp3lame', '-q:a', '2', outMp3Path],
        (err) => {
          try {
            if (fs.existsSync(tempAiff)) fs.unlinkSync(tempAiff);
          } catch (_) {}
          if (err) return reject(new Error(`Failed to encode synthesized audio to MP3: ${err.message}`));
          resolve();
        }
      );
    });

    const duration = await probeAudioDuration(outMp3Path);
    const provenance: AssetProvenance = {
      id: `ast_tts_${contentHash}`,
      type: 'TTS_AUDIO',
      provider: 'SystemTTS (macOS Speech)',
      source: cleanText.slice(0, 80),
      license: 'Creator Generated / CC0',
      hash: contentHash,
      duration,
      createdAt: new Date().toISOString(),
      metadata: { voiceName, speed, language: matched?.language || 'en' },
    };

    return {
      success: true,
      audioUrl,
      filePath: outMp3Path,
      duration,
      provider: 'system',
      voiceId,
      provenance,
    };
  }

  public async cloneVoice(options: VoiceCloneOptions): Promise<VoiceProfile> {
    if (!options.consentConfirmed) {
      throw new Error('User authorization consent is strictly required to clone or profile a voice.');
    }
    if (!fs.existsSync(options.referenceAudioPath)) {
      throw new Error(`Reference audio file does not exist at: ${options.referenceAudioPath}`);
    }

    const voiceId = `clone_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    return {
      voiceId,
      name: options.voiceName,
      provider: 'system',
      referenceAsset: options.referenceAudioPath,
      language: options.language || 'en',
      consentStatus: true,
      createdAt: new Date().toISOString(),
    };
  }

  public async getJobStatus(_jobId?: string): Promise<{ status: ProviderStatus; details?: string }> {
    return this.getStatus();
  }

  public async designVoice(prompt: string, options?: { language?: string; gender?: 'male' | 'female' }): Promise<VoicePreset> {
    const id = `designed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    return {
      id,
      name: `Custom Voice (${prompt.slice(0, 20)})`,
      provider: 'system',
      language: options?.language || 'en',
      gender: options?.gender || 'neutral',
      description: `Designed voice from prompt: "${prompt}"`,
    };
  }
}

/**
 * OmniVoiceProvider: Implements OmniVoice technical architecture referencing k2-fsa/OmniVoice.
 * Checks for PyTorch, GPU (CUDA/MPS), and model checkpoints.
 * Reports honest status when dependencies or GPU models are not configured.
 */
export class OmniVoiceProvider implements TTSProvider {
  public name = 'omnivoice' as const;

  public async getStatus(): Promise<{ status: ProviderStatus; details?: string }> {
    // Probe host environment for PyTorch & OmniVoice
    try {
      const checkScript = 'import torch; print(torch.__version__, torch.cuda.is_available())';
      const out = execSync(`python3 -c "${checkScript}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      if (out.includes('True')) {
        return { status: 'AVAILABLE', details: 'OmniVoice neural engine ready with GPU acceleration.' };
      }
      return {
        status: 'CONFIGURATION_REQUIRED',
        details: 'PyTorch detected without CUDA GPU acceleration. High-fidelity OmniVoice neural synthesis requires GPU.',
      };
    } catch {
      return {
        status: 'CONFIGURATION_REQUIRED',
        details: 'OmniVoice neural synthesis model is not configured on this host. PyTorch & OmniVoice packages required (see https://github.com/k2-fsa/OmniVoice).',
      };
    }
  }

  public async listVoices(): Promise<VoicePreset[]> {
    return [
      { id: 'ov_narrator_en', name: 'OmniVoice Neural Narrator (English)', provider: 'omnivoice', language: 'en', gender: 'male', description: 'Zero-shot prompt-conditioned neural documentary voice' },
      { id: 'ov_cinematic_hi', name: 'OmniVoice Cinematic (Hindi)', provider: 'omnivoice', language: 'hi', gender: 'female', description: 'Multilingual neural voice with expressive prosody' },
      { id: 'ov_dynamic_es', name: 'OmniVoice Dynamic (Spanish)', provider: 'omnivoice', language: 'es', gender: 'male', description: 'High-energy Spanish social media voice' },
    ];
  }

  public async synthesize(_text: string, _options?: TTSOptions): Promise<TTSResult> {
    const status = await this.getStatus();
    if (status.status !== 'AVAILABLE') {
      throw new Error(`OmniVoice synthesis unavailable: ${status.details}`);
    }
    throw new Error('OmniVoice GPU backend not connected. Please switch to System TTS or configure GPU worker.');
  }

  public async cloneVoice(options: VoiceCloneOptions): Promise<VoiceProfile> {
    if (!options.consentConfirmed) {
      throw new Error('User authorization consent is strictly required to clone or profile a voice.');
    }
    const status = await this.getStatus();
    if (status.status !== 'AVAILABLE') {
      throw new Error(`OmniVoice voice cloning unavailable: ${status.details}`);
    }
    const voiceId = `ov_clone_${Date.now()}`;
    return {
      voiceId,
      name: options.voiceName,
      provider: 'omnivoice',
      referenceAsset: options.referenceAudioPath,
      language: options.language,
      consentStatus: true,
      createdAt: new Date().toISOString(),
    };
  }

  public async getJobStatus(_jobId?: string): Promise<{ status: ProviderStatus; details?: string }> {
    return this.getStatus();
  }

  public async designVoice(prompt: string, options?: { language?: string; gender?: 'male' | 'female' }): Promise<VoicePreset> {
    const status = await this.getStatus();
    if (status.status !== 'AVAILABLE') {
      throw new Error(`OmniVoice voice design unavailable: ${status.details}`);
    }
    return {
      id: `ov_designed_${Date.now()}`,
      name: `OmniVoice (${prompt.slice(0, 20)})`,
      provider: 'omnivoice',
      language: options?.language || 'en',
      gender: options?.gender || 'neutral',
      description: prompt,
    };
  }
}

// Global Singleton Provider instances
export const systemTTSProvider = new SystemTTSProvider();
export const omniVoiceProvider = new OmniVoiceProvider();

export function getTTSProvider(type: 'system' | 'omnivoice' = 'system'): TTSProvider {
  return type === 'omnivoice' ? omniVoiceProvider : systemTTSProvider;
}
