// AUTO EDIT DECISION ENGINE
// Conforming to ViralClip Studio Phase 3, 5, 15, 16, 21 Specifications.
// Deterministic multi-modal intelligence for SFX, VFX, B-Roll, and Caption Styling.

import { ShortCandidate, SFXMarker, VFXMarker, BRollSuggestion } from '../types';
import { SFX_LIBRARY } from '../data/sfxLibrary';
import { VFX_LIBRARY } from '../data/vfxLibrary';
import { CREATOR_PRESETS_80 } from '../data/creatorPresets80';

export type EditIntensity = 'minimal' | 'balanced' | 'viral' | 'maximum';

export interface AutoEditPreferences {
  intensity?: EditIntensity;
  enableSFX?: boolean;
  enableVFX?: boolean;
  enableBRoll?: boolean;
  enableAutoReframe?: boolean;
  enableAudioEnhance?: boolean;
  preferredStyle?: string;
}

export interface AutoEditDecisionResult {
  short: ShortCandidate;
  sfxAdded: number;
  vfxAdded: number;
  brollAdded: number;
  captionPresetChosen: string;
  summary: string;
  decisions: Array<{
    type: 'sfx' | 'vfx' | 'broll' | 'caption' | 'reframe';
    timestamp: number;
    description: string;
    reason: string;
    confidence: number;
  }>;
}

// Keyword & semantic dictionaries
const QUESTION_REGEX = /\b(why|how|what|when|where|who|kya|kyun|kaise)\b|\?/i;
const NUMBER_REGEX = /\b(\d+|10x|50%|100%|crore|lakh|million|dollar|rupee|percent)\b/i;
const SHOCK_REGEX = /\b(insane|crazy|massive|huge|shocking|destroyed|worst|best|secret|bawal|khatarnak|hosh)\b/i;
const CONTRAST_REGEX = /\b(but|however|instead|actually|lekin|magar|parantu)\b/i;
const CTA_REGEX = /\b(subscribe|follow|comment|share|link in bio|check out|like|bell)\b/i;
const PROOF_REGEX = /\b(look at this|proof|evidence|screenshot|results|here it is|dekhye)\b/i;

/**
 * Recommends optimal caption preset based on video topic, language, and cadence.
 */
export function recommendCaptionPreset(short: ShortCandidate, transcriptText: string): string {
  const lower = transcriptText.toLowerCase();

  // Indian / Hinglish check
  if (short.language === 'hi' || short.detectedLanguage === 'hi' || /[\u0900-\u097F]/.test(transcriptText)) {
    return 'preset_hindi_punch_01';
  }
  if (/\b(kya|hai|nahi|hota|karo|bhai|yaar|dosto|mein|apne)\b/i.test(transcriptText)) {
    return 'preset_hinglish_creator_01';
  }

  // Podcast / Interview
  if (lower.includes('interview') || lower.includes('podcast') || lower.includes('guest') || lower.includes('episode')) {
    return 'preset_clean_podcast_01';
  }

  // Finance / Business
  if (NUMBER_REGEX.test(transcriptText) && (lower.includes('money') || lower.includes('invest') || lower.includes('market') || lower.includes('crypto'))) {
    return 'preset_market_pulse_01';
  }

  // Gaming
  if (lower.includes('game') || lower.includes('play') || lower.includes('level') || lower.includes('boss')) {
    return 'preset_gaming_high_energy_01';
  }

  // Default: Viral Punch Pop
  return 'preset_punch_pop_01';
}

/**
 * Core Auto Edit Decision Engine.
 * Analyzes video transcript, timing, word cadence, punctuation, and semantic intent.
 */
export function generateAutoEditPlan(
  short: ShortCandidate,
  transcriptSegments: any[],
  preferences: AutoEditPreferences = {}
): AutoEditDecisionResult {
  const intensity = preferences.intensity || 'balanced';
  const enableSFX = preferences.enableSFX !== false;
  const enableVFX = preferences.enableVFX !== false;
  const enableBRoll = preferences.enableBRoll !== false;

  const clipStart = short.startTime || 0;
  const clipEnd = short.endTime || (clipStart + (short.duration || 30));
  const clipDuration = Math.max(5, clipEnd - clipStart);

  // Filter segments belonging to this short
  const relevantSegs = transcriptSegments.filter((s) => s.end >= clipStart && s.start <= clipEnd);
  const fullTranscript = relevantSegs.map((s) => s.text || '').join(' ');

  // Budgeting limits based on intensity
  const maxSfxBudget =
    intensity === 'minimal' ? Math.max(1, Math.round(clipDuration / 12)) :
    intensity === 'balanced' ? Math.max(2, Math.round(clipDuration / 7)) :
    intensity === 'viral' ? Math.max(3, Math.round(clipDuration / 4)) :
    Math.max(4, Math.round(clipDuration / 3));

  const maxVfxBudget =
    intensity === 'minimal' ? Math.max(1, Math.round(clipDuration / 14)) :
    intensity === 'balanced' ? Math.max(2, Math.round(clipDuration / 8)) :
    intensity === 'viral' ? Math.max(3, Math.round(clipDuration / 5)) :
    Math.max(4, Math.round(clipDuration / 3.5));

  const decisions: AutoEditDecisionResult['decisions'] = [];
  const sfxMarkers: SFXMarker[] = [];
  const vfxMarkers: VFXMarker[] = [];
  const brollSuggestions: BRollSuggestion[] = [...(short.brollSuggestions || [])];

  let lastSfxTime = -5;
  let lastVfxTime = -5;

  // 1. Hook at 00:00 (Every short needs an opening hook punch!)
  if (enableVFX && vfxMarkers.length < maxVfxBudget) {
    vfxMarkers.push({
      id: `vfx_hook_${Date.now()}_0`,
      timestamp: 0.1,
      duration: 1.0,
      type: 'subtle_zoom_in',
      label: 'Hook In',
      intensity: 6,
      reason: 'Opening 3-second hook retention zoom',
      confidence: 0.95,
    });
    decisions.push({
      type: 'vfx',
      timestamp: 0.1,
      description: 'Subtle Zoom In on hook opening',
      reason: 'Opening 3-second hook retention zoom to prevent viewer drop-off',
      confidence: 0.95,
    });
    lastVfxTime = 0.1;
  }

  if (enableSFX && sfxMarkers.length < maxSfxBudget) {
    const hookSfx = SFX_LIBRARY.find((s) => s.id === 'whoosh_fast_01') || SFX_LIBRARY[0];
    sfxMarkers.push({
      id: `sfx_hook_${Date.now()}_0`,
      timestamp: 0.05,
      duration: hookSfx.duration,
      category: 'whoosh',
      soundName: hookSfx.name,
      volume: 0.75,
      audioUrl: hookSfx.file,
      reason: 'Dynamic introductory whoosh for the short-form opening',
      confidence: 0.92,
      source: 'library',
    });
    decisions.push({
      type: 'sfx',
      timestamp: 0.05,
      description: `SFX: ${hookSfx.name}`,
      reason: 'Dynamic introductory whoosh for the short-form opening',
      confidence: 0.92,
    });
    lastSfxTime = 0.05;
  }

  // 2. Iterate through segments and detect moments
  for (let idx = 0; idx < relevantSegs.length; idx++) {
    const seg = relevantSegs[idx];
    const segRelStart = Math.max(0, seg.start - clipStart);
    const segRelEnd = Math.max(segRelStart + 0.5, seg.end - clipStart);
    const text = (seg.text || '').trim();

    // Check Question
    if (QUESTION_REGEX.test(text)) {
      if (enableVFX && segRelStart - lastVfxTime >= 3.0 && vfxMarkers.length < maxVfxBudget) {
        vfxMarkers.push({
          id: `vfx_q_${idx}`,
          timestamp: segRelStart,
          duration: 0.8,
          type: 'subtle_zoom_in',
          label: 'Question Focus',
          intensity: 5,
          reason: `Question detected: "${text.slice(0, 35)}..."`,
          confidence: 0.88,
        });
        decisions.push({
          type: 'vfx',
          timestamp: segRelStart,
          description: 'Subtle Zoom In for Question',
          reason: `Question detected: "${text.slice(0, 35)}..."`,
          confidence: 0.88,
        });
        lastVfxTime = segRelStart;
      }
      if (enableSFX && segRelStart - lastSfxTime >= 2.5 && sfxMarkers.length < maxSfxBudget) {
        const sfx = SFX_LIBRARY.find((s) => s.id === 'riser_tension_01') || SFX_LIBRARY[15];
        sfxMarkers.push({
          id: `sfx_q_${idx}`,
          timestamp: segRelStart,
          duration: Math.min(1.2, sfx.duration),
          category: 'riser',
          soundName: sfx.name,
          volume: 0.65,
          audioUrl: sfx.file,
          reason: 'Tension riser accentuating open-loop inquiry',
          confidence: 0.85,
          source: 'library',
        });
        decisions.push({
          type: 'sfx',
          timestamp: segRelStart,
          description: `SFX: ${sfx.name}`,
          reason: 'Tension riser accentuating open-loop inquiry',
          confidence: 0.85,
        });
        lastSfxTime = segRelStart;
      }
    }

    // Check High Emotion / Shock
    else if (SHOCK_REGEX.test(text)) {
      if (enableVFX && segRelStart - lastVfxTime >= 2.5 && vfxMarkers.length < maxVfxBudget) {
        vfxMarkers.push({
          id: `vfx_shock_${idx}`,
          timestamp: segRelStart,
          duration: 0.45,
          type: 'punch_zoom',
          label: 'Shock Punch',
          intensity: 8,
          reason: `High conviction word detected: "${text.slice(0, 30)}..."`,
          confidence: 0.91,
        });
        decisions.push({
          type: 'vfx',
          timestamp: segRelStart,
          description: 'Punch Zoom on high emotion',
          reason: `High conviction word detected: "${text.slice(0, 30)}..."`,
          confidence: 0.91,
        });
        lastVfxTime = segRelStart;
      }
      if (enableSFX && segRelStart - lastSfxTime >= 2.5 && sfxMarkers.length < maxSfxBudget) {
        const sfx = SFX_LIBRARY.find((s) => s.id === 'impact_punch_02') || SFX_LIBRARY[4];
        sfxMarkers.push({
          id: `sfx_shock_${idx}`,
          timestamp: segRelStart,
          duration: sfx.duration,
          category: 'impact',
          soundName: sfx.name,
          volume: 0.78,
          audioUrl: sfx.file,
          reason: 'Punchy impact reinforcing critical revelation',
          confidence: 0.89,
          source: 'library',
        });
        decisions.push({
          type: 'sfx',
          timestamp: segRelStart,
          description: `SFX: ${sfx.name}`,
          reason: 'Punchy impact reinforcing critical revelation',
          confidence: 0.89,
        });
        lastSfxTime = segRelStart;
      }
    }

    // Check Numbers / Statistics
    else if (NUMBER_REGEX.test(text)) {
      if (enableVFX && segRelStart - lastVfxTime >= 2.5 && vfxMarkers.length < maxVfxBudget) {
        vfxMarkers.push({
          id: `vfx_num_${idx}`,
          timestamp: segRelStart,
          duration: 0.35,
          type: 'micro_zoom',
          label: 'Number Emphasis',
          intensity: 6,
          reason: `Key quantitative statistic detected: "${text.slice(0, 30)}..."`,
          confidence: 0.87,
        });
        decisions.push({
          type: 'vfx',
          timestamp: segRelStart,
          description: 'Micro Zoom on quantitative data',
          reason: `Key quantitative statistic detected: "${text.slice(0, 30)}..."`,
          confidence: 0.87,
        });
        lastVfxTime = segRelStart;
      }
      if (enableSFX && segRelStart - lastSfxTime >= 2.5 && sfxMarkers.length < maxSfxBudget) {
        const sfx = SFX_LIBRARY.find((s) => s.id === 'pop_bubble_01') || SFX_LIBRARY[27];
        sfxMarkers.push({
          id: `sfx_num_${idx}`,
          timestamp: segRelStart,
          duration: sfx.duration,
          category: 'pop',
          soundName: sfx.name,
          volume: 0.7,
          audioUrl: sfx.file,
          reason: 'Crisp pop accentuating empirical numerical fact',
          confidence: 0.86,
          source: 'library',
        });
        decisions.push({
          type: 'sfx',
          timestamp: segRelStart,
          description: `SFX: ${sfx.name}`,
          reason: 'Crisp pop accentuating empirical numerical fact',
          confidence: 0.86,
        });
        lastSfxTime = segRelStart;
      }
    }

    // Check Proof / Evidence / Visual statement -> B-Roll recommendation
    if (enableBRoll && PROOF_REGEX.test(text) && brollSuggestions.length < 3) {
      const brollItem: BRollSuggestion = {
        id: `broll_auto_${idx}`,
        timestamp: segRelStart,
        duration: Math.min(3.0, segRelEnd - segRelStart + 1.0),
        concept: text.slice(0, 40),
        keyword: text.split(' ')[0] || 'Evidence',
        imageUrl: '/assets/broll/sample_concept.jpg',
        enabled: true,
        reason: `Visual evidence claim detected: "${text.slice(0, 35)}..."`,
        confidence: 0.84,
      };
      brollSuggestions.push(brollItem);
      decisions.push({
        type: 'broll',
        timestamp: segRelStart,
        description: `B-Roll: ${brollItem.keyword}`,
        reason: brollItem.reason!,
        confidence: 0.84,
      });
    }

    // Check Call To Action near end of clip
    if (CTA_REGEX.test(text) && segRelStart > clipDuration * 0.6) {
      if (enableVFX && vfxMarkers.length < maxVfxBudget) {
        vfxMarkers.push({
          id: `vfx_cta_${idx}`,
          timestamp: segRelStart,
          duration: 1.0,
          type: 'social_cta_glow',
          label: 'CTA Glow',
          intensity: 6,
          reason: 'Call to action beacon guiding engagement',
          confidence: 0.93,
        });
        decisions.push({
          type: 'vfx',
          timestamp: segRelStart,
          description: 'CTA Glow Effect',
          reason: 'Call to action beacon guiding engagement',
          confidence: 0.93,
        });
      }
      if (enableSFX && sfxMarkers.length < maxSfxBudget) {
        const sfx = SFX_LIBRARY.find((s) => s.id === 'notification_ding_01') || SFX_LIBRARY[42];
        sfxMarkers.push({
          id: `sfx_cta_${idx}`,
          timestamp: segRelStart,
          duration: sfx.duration,
          category: 'notification',
          soundName: sfx.name,
          volume: 0.72,
          audioUrl: sfx.file,
          reason: 'Friendly notification chime prompting follow / subscribe',
          confidence: 0.91,
          source: 'library',
        });
        decisions.push({
          type: 'sfx',
          timestamp: segRelStart,
          description: `SFX: ${sfx.name}`,
          reason: 'Friendly notification chime prompting follow / subscribe',
          confidence: 0.91,
        });
      }
    }
  }

  // Recommended Caption Preset
  const chosenPresetId = preferences.preferredStyle || recommendCaptionPreset(short, fullTranscript);
  decisions.push({
    type: 'caption',
    timestamp: 0,
    description: `Caption Style: ${chosenPresetId}`,
    reason: `Optimal match for dialogue cadence and format`,
    confidence: 0.94,
  });

  // Updated short object with AI decisions applied
  const updatedShort: ShortCandidate = {
    ...short,
    sfxMarkers: sfxMarkers.sort((a, b) => a.timestamp - b.timestamp),
    vfxMarkers: vfxMarkers.sort((a, b) => a.timestamp - b.timestamp),
    brollSuggestions,
    speakerPosition: preferences.enableAutoReframe !== false ? 'auto_switch' : short.speakerPosition || 'center',
    captionConfig: {
      ...(short.captionConfig || {}),
      presetId: chosenPresetId,
    } as any,
  };

  const summary = `Applied ${intensity.toUpperCase()} AI Edit: ${sfxMarkers.length} SFX, ${vfxMarkers.length} VFX, ${brollSuggestions.length} B-Roll clips, and "${chosenPresetId}" typography preset.`;

  return {
    short: updatedShort,
    sfxAdded: sfxMarkers.length,
    vfxAdded: vfxMarkers.length,
    brollAdded: brollSuggestions.length,
    captionPresetChosen: chosenPresetId,
    summary,
    decisions,
  };
}

export default generateAutoEditPlan;
