/**
 * VIRALCLIP STUDIO — TRANSCRIPTION PROVIDER ARCHITECTURE
 * Core interfaces, provider types, canonical schemas, and error definitions.
 */

import {
  Transcript,
  TranscriptSegment,
  TranscriptWord,
  DetectedLanguageBreakdown,
  CaptionSegment,
  ScriptSection,
} from '../../types';

export type ProviderStatus =
  | 'READY'
  | 'CONFIGURATION_REQUIRED'
  | 'UNAVAILABLE'
  | 'DEGRADED';

export interface ProviderHealth {
  id: string;
  name: string;
  status: ProviderStatus;
  device?: string;
  model?: string;
  message?: string;
  latencyMs?: number;
  supportedLanguages?: string[];
  error?: string;
}

export interface TranscriptionInput {
  audioPath: string;
  sourceMediaPath?: string;
  language?: string; // 'auto' or specific ISO code like 'en', 'hi', 'pa', 'es'
  wordTimestamps: boolean;
  clipStart?: number;
  clipEnd?: number;
  duration?: number;
  forceRefresh?: boolean;
  vocabulary?: string[];
  preset?: 'FAST' | 'BALANCED' | 'QUALITY' | 'MAX QUALITY' | 'tiny' | 'base' | 'small' | 'medium' | 'large-v3';
}

export interface CanonicalTranscriptResult {
  transcript: Transcript;
  providerId: string;
  providerName: string;
  model?: string;
  device?: string;
  detectedLanguage: string;
  detectedLanguages?: DetectedLanguageBreakdown[];
  languageConfidence: number;
  speechCoverage: number;
  duration: number;
  wordCount: number;
  segmentCount: number;
}

export interface TranscriptionProvider {
  readonly id: string;
  readonly name: string;
  readonly priority: number; // Lower number = higher priority
  health(): Promise<ProviderHealth>;
  transcribe(input: TranscriptionInput): Promise<CanonicalTranscriptResult>;
}

export type TranscriptionJobStage =
  | 'QUEUED'
  | 'EXTRACTING_AUDIO'
  | 'CHECKING_PROVIDER'
  | 'TRANSCRIBING'
  | 'ALIGNING'
  | 'DETECTING_LANGUAGE'
  | 'BUILDING_CAPTIONS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface TranscriptionJob {
  id: string;
  stage: TranscriptionJobStage;
  progressPercent: number; // 0 to 100
  stageMessage: string;
  providerUsed?: string;
  device?: string;
  model?: string;
  createdAt: number;
  updatedAt: number;
  result?: {
    canonicalTranscript: Transcript;
    captions: CaptionSegment[];
    scriptSections: ScriptSection[];
    detectedLanguages: DetectedLanguageBreakdown[];
    speechCoverage: number;
    language: string;
    languageConfidence: number;
    providerUsed: string;
    model?: string;
    device?: string;
  };
  error?: {
    code: CanonicalTranscriptionErrorCode;
    message: string;
    details?: string;
    providerStatuses?: ProviderHealth[];
  };
}

export type CanonicalTranscriptionErrorCode =
  | 'TRANSCRIPTION_PROVIDER_UNAVAILABLE'
  | 'TRANSCRIPTION_CONFIGURATION_REQUIRED'
  | 'TRANSCRIPTION_AUTH_FAILED'
  | 'TRANSCRIPTION_RATE_LIMITED'
  | 'TRANSCRIPTION_TIMEOUT'
  | 'TRANSCRIPTION_FAILED'
  | 'NO_AUDIO'
  | 'NO_MEDIA'
  | 'EMPTY_TRANSCRIPT'
  | 'INVALID_TIMESTAMPS';

export class TranscriptionError extends Error {
  readonly code: CanonicalTranscriptionErrorCode;
  readonly providerId?: string;
  readonly providerStatuses?: ProviderHealth[];

  constructor(
    code: CanonicalTranscriptionErrorCode,
    message: string,
    providerId?: string,
    providerStatuses?: ProviderHealth[]
  ) {
    super(message);
    this.name = 'TranscriptionError';
    this.code = code;
    this.providerId = providerId;
    this.providerStatuses = providerStatuses;
  }
}
