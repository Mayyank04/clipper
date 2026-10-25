/**
 * VIRALCLIP STUDIO — COMPOSITION V1 COMPILER & DETERMINISTIC HASH GENERATOR
 * Compiles editing project states into frozen, immutable CompositionV1 manifests.
 * Implements Master Plan Section 6 contracts with piecewise source-to-timeline remapping.
 */

import crypto from 'crypto';
import {
  CompositionV1,
  CompositionSegmentV1,
  CompositionCaptionV1,
  CompositionAudioV1,
  CompositionBrollV1,
  CompositionEffectV1,
  CompositionOutputProfileV1,
  EditorProject,
  ShortCandidate,
} from '../types';

export function computeCompositionHash(comp: Omit<CompositionV1, 'compositionHash'>): string {
  const normalized = {
    schemaVersion: comp.schemaVersion,
    workspaceId: comp.workspaceId,
    projectId: comp.projectId,
    clipId: comp.clipId,
    output: comp.output,
    sources: comp.sources.map((s) => ({
      assetId: s.assetId,
      url: s.url,
      contentHash: s.contentHash,
      durationUs: s.durationUs,
      width: s.width,
      height: s.height,
      fps: s.fps,
    })),
    segments: comp.segments.map((seg) => ({
      id: seg.id,
      sourceAssetId: seg.sourceAssetId,
      sourceInUs: seg.sourceInUs,
      sourceOutUs: seg.sourceOutUs,
      timelineStartUs: seg.timelineStartUs,
      speed: seg.speed,
      crop: seg.crop,
      speakerPosition: seg.speakerPosition,
    })),
    captions: comp.captions.map((c) => ({
      id: c.id,
      startUs: c.startUs,
      endUs: c.endUs,
      text: c.text,
      words: c.words.map((w) => ({
        word: w.word,
        startUs: w.startUs,
        endUs: w.endUs,
      })),
      customization: c.customization,
    })),
    broll: comp.broll.map((b) => ({
      id: b.id,
      assetId: b.assetId,
      sourceInUs: b.sourceInUs,
      sourceOutUs: b.sourceOutUs,
      timelineStartUs: b.timelineStartUs,
      timelineEndUs: b.timelineEndUs,
      crop: b.crop,
      opacity: b.opacity,
    })),
    effects: comp.effects.map((e) => ({
      id: e.id,
      effectType: e.effectType,
      timelineStartUs: e.timelineStartUs,
      timelineEndUs: e.timelineEndUs,
      intensity: e.intensity,
    })),
    brand: comp.brand,
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex');
}

export function compileToCompositionV1(
  editor: EditorProject,
  options: {
    workspaceId?: string;
    clipId?: string;
    revisionId?: string;
    aspectRatio?: '9:16' | '1:1' | '16:9' | '4:5';
    qualityMode?: 'MASTER' | 'HIGH' | 'BALANCED' | 'FAST';
    requestedFPS?: number;
  } = {}
): CompositionV1 {
  const workspaceId = options.workspaceId || 'ws_default';
  const clipId = options.clipId || editor.id;
  const revisionId = options.revisionId || `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const sourceMedia = editor.source;
  const sourceAssetId = sourceMedia?.id || `asset_${editor.id}`;
  const sourceUrl = sourceMedia?.url || '';

  const aspectRatio = options.aspectRatio || editor.sequence?.aspectRatio || '9:16';
  let width = 1080;
  let height = 1920;
  if (aspectRatio === '1:1') {
    width = 1080;
    height = 1080;
  } else if (aspectRatio === '16:9') {
    width = 1920;
    height = 1080;
  } else if (aspectRatio === '4:5') {
    width = 1080;
    height = 1350;
  }

  const fps = options.requestedFPS || editor.sequence?.fps || 30;
  const output: CompositionOutputProfileV1 = {
    width,
    height,
    fps: { numerator: fps * 1000, denominator: 1000 },
    aspectRatio,
    qualityMode: options.qualityMode || 'HIGH',
  };

  const videoClips = editor.videoTracks || (editor as any).videoClips || [];
  const segments: CompositionSegmentV1[] = videoClips.map((vc, idx) => ({
    id: vc.id || `seg_${idx}`,
    sourceAssetId,
    sourceInUs: Math.round(vc.sourceStart * 1_000_000),
    sourceOutUs: Math.round(vc.sourceEnd * 1_000_000),
    timelineStartUs: Math.round((vc.timelineStart ?? idx * 30) * 1_000_000),
    speed: { numerator: 1, denominator: 1 },
    speakerPosition: (editor as any).speakerPosition || 'center',
  }));

  const captionsTrack = editor.captionTrack || (editor as any).captionSegments || [];
  const captions: CompositionCaptionV1[] = captionsTrack.map((c: any, idx: number) => ({
    id: c.id || `cap_${idx}`,
    startUs: Math.round(c.start * 1_000_000),
    endUs: Math.round(c.end * 1_000_000),
    text: c.text || '',
    words: (c.words || []).map((w: any) => ({
      word: w.text || w.word || '',
      startUs: Math.round(w.start * 1_000_000),
      endUs: Math.round(w.end * 1_000_000),
      originalStartUs: Math.round((w.originalStart ?? w.start) * 1_000_000),
      originalEndUs: Math.round((w.originalEnd ?? w.end) * 1_000_000),
      confidence: w.confidence ?? 1.0,
    })),
    customization: c.customization || (editor as any).captionCustomization || (editor as any).captionConfig,
  }));

  const brollTrack = editor.brollTrack || (editor as any).brollClips || [];
  const broll: CompositionBrollV1[] = brollTrack.map((b: any, idx: number) => ({
    id: b.id || `broll_${idx}`,
    assetId: b.assetId || b.imageUrl || 'stock',
    sourceInUs: 0,
    sourceOutUs: Math.round((b.duration ?? (b.timelineEnd - b.timelineStart) ?? 3) * 1_000_000),
    timelineStartUs: Math.round((b.timelineStart ?? b.start ?? 0) * 1_000_000),
    timelineEndUs: Math.round((b.timelineEnd ?? b.end ?? 3) * 1_000_000),
    crop: b.crop,
    opacity: b.opacity ?? 1.0,
  }));

  const sfxTrack = editor.sfxTrack || (editor as any).sfxClips || [];
  const audio: CompositionAudioV1[] = sfxTrack.map((s: any, idx: number) => ({
    id: s.id || `sfx_${idx}`,
    assetId: s.file || s.name || 'sfx',
    sourceInUs: 0,
    sourceOutUs: Math.round((s.duration || 1) * 1_000_000),
    timelineStartUs: Math.round(s.start * 1_000_000),
    gain: s.volume ?? 1.0,
  }));

  const vfxTrack = editor.vfxTrack || (editor as any).vfxClips || [];
  const effects: CompositionEffectV1[] = vfxTrack.map((v: any, idx: number) => ({
    id: v.id || `vfx_${idx}`,
    effectType: v.effectType || v.type || 'zoom',
    timelineStartUs: Math.round(v.start * 1_000_000),
    timelineEndUs: Math.round(v.end * 1_000_000),
    intensity: v.intensity ?? 5,
  }));

  const partialComp = {
    schemaVersion: 'v1' as const,
    revisionId,
    projectId: editor.id,
    workspaceId,
    clipId,
    sources: [
      {
        assetId: sourceAssetId,
        url: sourceUrl,
        durationUs: Math.round((sourceMedia?.duration || editor.sequence?.duration || 30) * 1_000_000),
        width: sourceMedia?.width || 1920,
        height: sourceMedia?.height || 1080,
        fps: { numerator: 30000, denominator: 1001 },
        hasAudio: sourceMedia?.hasAudio ?? true,
        hasVideo: sourceMedia?.hasVideo ?? true,
      },
    ],
    output,
    segments,
    captions,
    audio,
    broll,
    effects,
    createdAt: new Date().toISOString(),
  };

  const compositionHash = computeCompositionHash(partialComp);

  return {
    ...partialComp,
    compositionHash,
  };
}
