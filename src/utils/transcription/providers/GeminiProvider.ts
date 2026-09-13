/**
 * VIRALCLIP STUDIO — GEMINI TRANSCRIPTION PROVIDER
 * Primary cloud ASR provider using Gemini 2.5 Flash with word-level timestamps.
 * Credentials strictly isolated to server-side process.env.GEMINI_API_KEY.
 */

import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import {
  TranscriptionProvider,
  ProviderHealth,
  TranscriptionInput,
  CanonicalTranscriptResult,
  TranscriptionError,
} from '../types';
import { normalizeCanonicalTranscript } from '../../captionEngine';

export class GeminiProvider implements TranscriptionProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini Cloud ASR';
  readonly priority = 1;

  private aiClient: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI | null {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) {
      this.aiClient = null;
      return null;
    }
    if (!this.aiClient) {
      this.aiClient = new GoogleGenAI({ apiKey: key });
    }
    return this.aiClient;
  }

  async health(): Promise<ProviderHealth> {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) {
      return {
        id: this.id,
        name: this.name,
        status: 'CONFIGURATION_REQUIRED',
        message: 'GEMINI_API_KEY is not configured in server environment (.env)',
      };
    }

    return {
      id: this.id,
      name: this.name,
      status: 'READY',
      model: 'gemini-2.5-flash',
      device: 'Cloud Google AI',
      message: 'Gemini 2.5 Flash speech-to-text API ready',
      supportedLanguages: ['auto', 'en', 'hi', 'pa', 'es', 'pt', 'ar', 'ur', 'bn', 'ta', 'te'],
    };
  }

  async transcribe(input: TranscriptionInput): Promise<CanonicalTranscriptResult> {
    const client = this.getClient();
    if (!client) {
      throw new TranscriptionError(
        'TRANSCRIPTION_CONFIGURATION_REQUIRED',
        'GEMINI_API_KEY is not configured in server environment (.env)',
        this.id
      );
    }

    if (!fs.existsSync(input.audioPath)) {
      throw new TranscriptionError(
        'NO_AUDIO',
        `Audio file does not exist at path: ${input.audioPath}`,
        this.id
      );
    }

    const audioStats = fs.statSync(input.audioPath);
    if (audioStats.size === 0) {
      throw new TranscriptionError(
        'EMPTY_TRANSCRIPT',
        'Audio file is zero bytes (no audio stream)',
        this.id
      );
    }

    const clipDuration = Math.max(1, Number(input.duration) || 30);
    const targetLanguage = input.language && input.language !== 'auto' ? input.language : undefined;

    const base64Audio = fs.readFileSync(input.audioPath).toString('base64');
    const prompt = `You are a world-class production speech transcription and subtitle engine.
Transcribe the speech in this audio track with EXACT word-level timestamps.
Total duration of this audio segment: ${clipDuration} seconds.
${targetLanguage ? `Target Language Hint: ${targetLanguage}` : ''}

MANDATORY RULES:
1. AUTOMATIC LANGUAGE DETECTION:
   - Detect the exact spoken language.
   - Support at least: English, Hindi, Punjabi, Spanish, Portuguese (Brazil), French, German, Italian, Arabic, Urdu, Bengali, Marathi, Gujarati, Tamil, Telugu, Kannada, Malayalam, Japanese, Korean, Chinese, Russian, Indonesian, Turkish, Dutch.
   - Support CODE SWITCHING (e.g. Hindi + English, Hinglish, Punjabi + English, Urdu + English, Spanish + English).
   - If code-switching occurs, return a detectedLanguages breakdown with percentages summing to 100.
2. VERBATIM ACCURACY:
   - Transcribe the ACTUAL spoken speech in its native script (Devanagari for Hindi/Marathi, Gurmukhi for Punjabi, Arabic script for Arabic/Urdu, Bengali script, etc.) or Latin/Roman script if spoken in English or transliterated.
   - DO NOT translate the transcript unless translation was explicitly requested. Preserve native language!
   - DO NOT invent, summarize, or omit words.
3. WORD-LEVEL TIMESTAMPS:
   - Every word must have exact start and end timestamps in seconds (float).
   - Start >= 0, end > start, strictly chronological.
   - Cover ALL spoken parts across the duration (speech coverage >= 95%).
   - Mark 1-2 key impact words per sentence with isHighlight: true.

Return a JSON object:
{
  "language": "Detected primary language name (e.g., Hindi, English, Punjabi, Spanish)",
  "languageConfidence": 0.95,
  "detectedLanguages": [
    { "language": "Hindi", "percentage": 70 },
    { "language": "English", "percentage": 30 }
  ],
  "duration": ${clipDuration},
  "segments": [
    {
      "id": "seg_1",
      "text": "verbatim phrase text",
      "start": 0.5,
      "end": 3.8,
      "words": [
        {
          "word": "word",
          "start": 0.5,
          "end": 0.9,
          "confidence": 0.98,
          "isHighlight": true
        }
      ]
    }
  ]
}`;

    try {
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { inlineData: { mimeType: 'audio/mp3', data: base64Audio } },
          prompt,
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (!response.text) {
        throw new TranscriptionError(
          'EMPTY_TRANSCRIPT',
          'Gemini returned an empty response text.',
          this.id
        );
      }

      const rawJson = JSON.parse(response.text);
      const canonical = normalizeCanonicalTranscript(rawJson, clipDuration);

      if (!canonical || !canonical.words || canonical.words.length === 0) {
        throw new TranscriptionError(
          'EMPTY_TRANSCRIPT',
          'Gemini detected no spoken words in the audio segment.',
          this.id
        );
      }

      return {
        transcript: canonical,
        providerId: this.id,
        providerName: this.name,
        model: 'gemini-2.5-flash',
        device: 'Cloud Google AI',
        detectedLanguage: canonical.language || 'English',
        detectedLanguages: canonical.detectedLanguages,
        languageConfidence: canonical.languageConfidence || 0.9,
        speechCoverage: canonical.speechCoverage || 0,
        duration: canonical.duration || clipDuration,
        wordCount: canonical.words.length,
        segmentCount: canonical.segments.length,
      };
    } catch (err: any) {
      if (err instanceof TranscriptionError) throw err;

      const errMsg = err?.message || String(err);
      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('unauthorized') || errMsg.includes('401')) {
        throw new TranscriptionError('TRANSCRIPTION_AUTH_FAILED', `Gemini authentication failed: ${errMsg}`, this.id);
      }
      if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429') || errMsg.includes('quota')) {
        throw new TranscriptionError('TRANSCRIPTION_RATE_LIMITED', `Gemini rate limit / quota exceeded: ${errMsg}`, this.id);
      }

      throw new TranscriptionError('TRANSCRIPTION_FAILED', `Gemini speech-to-text failed: ${errMsg}`, this.id);
    }
  }
}
