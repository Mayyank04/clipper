/**
 * VIRALCLIP STUDIO — AI DIRECTOR
 * The Master Editorial Coordinator:
 * 1. Coordinates Caption + B-roll + SFX + VFX + Camera into unified EditBeat objects.
 * 2. Enforces ZERO random media (every decision has reason, query, confidence, timestamp).
 * 3. Implements AI Polish: inspects project state and constructs an itemized AIEditPlan.
 */

import {
  AIEditPlan,
  AIEditPlanItem,
  CreatorStyleId,
  EditBeat,
  ReferenceStyleProfile,
} from './types';
import { getCreatorStyleProfile, recommendCreatorStyle } from './creatorStyleEngine';
import { buildKineticCaptionSegments } from './kineticCaptionEngine';
import { SemanticBRollEngine } from './brollEngine';
import { SoundDesignEngine } from './soundDesignEngine';
import { getColorGradingProfile } from './videoEffectsEngine';
import { WordTiming } from '../../types';

export interface AIDirectorInput {
  projectId: string;
  transcriptText: string;
  wordTimings: WordTiming[];
  totalDurationSeconds: number;
  styleId?: CreatorStyleId;
}

export class AIDirector {
  private brollEngine: SemanticBRollEngine;
  private soundEngine: SoundDesignEngine;

  constructor() {
    this.brollEngine = new SemanticBRollEngine();
    this.soundEngine = new SoundDesignEngine();
  }

  /**
   * Generates synchronized EditBeat timeline where Captions, B-Roll, SFX, VFX, and Camera
   * feel like ONE cohesive editorial decision. Zero Math.random().
   */
  public async coordinateEditBeats(input: AIDirectorInput): Promise<{
    style: ReferenceStyleProfile;
    editBeats: EditBeat[];
    colorGrade: ReturnType<typeof getColorGradingProfile>;
  }> {
    const { wordTimings, totalDurationSeconds, transcriptText } = input;

    // 1. Resolve Style Profile
    const selectedStyleId = input.styleId || recommendCreatorStyle({
      transcriptText,
      wordsPerMinute: Math.round((wordTimings.length / Math.max(1, totalDurationSeconds)) * 60),
      durationSeconds: totalDurationSeconds,
    }).recommendedStyle;

    const style = getCreatorStyleProfile(selectedStyleId);
    const colorGrade = getColorGradingProfile(style.visuals.colorTreatment);

    // 2. Generate Kinetic Caption Segments
    const captionSegments = buildKineticCaptionSegments(wordTimings, style, totalDurationSeconds);

    // 3. Extract sentence chunks for B-roll planning
    const sentenceChunks: { text: string; start: number; end: number }[] = [];
    let currentWords: WordTiming[] = [];

    for (let i = 0; i < wordTimings.length; i++) {
      const w = wordTimings[i];
      currentWords.push(w);
      if (w.word.endsWith('.') || w.word.endsWith('?') || w.word.endsWith('!') || i === wordTimings.length - 1) {
        if (currentWords.length > 0) {
          sentenceChunks.push({
            text: currentWords.map((cw) => cw.word).join(' '),
            start: currentWords[0].start,
            end: currentWords[currentWords.length - 1].end,
          });
          currentWords = [];
        }
      }
    }

    // 4. Plan and Resolve B-roll
    const brollOpps = this.brollEngine.planBRollTimeline(
      sentenceChunks,
      totalDurationSeconds,
      style.pacing.brollCoveragePercent
    );
    const resolvedBroll = await this.brollEngine.resolveBRollAssets(brollOpps);

    // 5. Plan and Resolve SFX
    const brollCuts = resolvedBroll.map((b) => ({ startTime: b.startTime }));
    const sfxCues = this.soundEngine.planSFXCues(
      transcriptText,
      wordTimings,
      brollCuts,
      totalDurationSeconds,
      style.pacing.sfxDensityPer10Sec
    );

    // 6. Coordinate into unified EditBeat objects
    const editBeats: EditBeat[] = [];

    for (let i = 0; i < captionSegments.length; i++) {
      const seg = captionSegments[i];
      const beatId = `beat_${i}_${Math.round(seg.start * 10)}`;

      // Find matching B-roll for this beat window
      const matchingBroll = resolvedBroll.find(
        (b) => b.startTime >= seg.start - 0.2 && b.startTime <= seg.end + 0.2
      );

      // Find matching SFX for this beat window
      const matchingSFX = sfxCues.find(
        (s) => s.timestamp >= seg.start - 0.2 && s.timestamp <= seg.end + 0.2
      );

      // Determine VFX (punch-in on hook, climax, or high-confidence emphasis)
      const hasEmphasis = seg.words.some((w) => w.isEmphasized);
      let vfx: EditBeat['vfx'];
      if (seg.sceneRole === 'hook') {
        vfx = { type: 'punch_in', intensity: 1.05, durationMs: 400 };
      } else if (hasEmphasis && (seg.sceneRole === 'climax' || matchingBroll)) {
        vfx = { type: 'reaction_punch', intensity: 1.08, durationMs: 350 };
      }

      // Determine Camera framing
      let camera: EditBeat['camera'] = { framing: 'center', zoom: 1.0 };
      if (vfx?.type === 'punch_in') {
        camera = { framing: 'speaker_tight', zoom: 1.05 };
      } else if (matchingBroll?.isPIP) {
        camera = { framing: 'speaker_tight', zoom: 1.02 };
      }

      // Collect emphasis decisions
      const emphasisDecisions = seg.words
        .filter((w) => w.emphasis)
        .map((w) => w.emphasis!);

      editBeats.push({
        id: beatId,
        startTime: seg.start,
        endTime: seg.end,
        captionStyle: seg.sceneRole === 'hook' ? 'viral_bold' : seg.sceneRole === 'climax' ? 'cinematic_emphasis' : 'standard',
        emphasisWords: emphasisDecisions,
        broll: matchingBroll
          ? {
              id: matchingBroll.id,
              concept: matchingBroll.concept,
              query: matchingBroll.queryMatched,
              assetUrl: matchingBroll.assetUrl,
              provider: matchingBroll.provider,
              isPIP: matchingBroll.isPIP,
              transition: matchingBroll.transition,
              attribution: matchingBroll.attribution,
            }
          : undefined,
        sfx: matchingSFX
          ? {
              id: `sfx_beat_${i}`,
              name: matchingSFX.category,
              category: matchingSFX.category,
              assetUrl: `/assets/sfx/${matchingSFX.category}.wav`,
              volume: 0.65,
              reason: matchingSFX.reason,
            }
          : undefined,
        vfx,
        camera,
        reason: `Synchronized ${seg.sceneRole} editorial beat: ${emphasisDecisions.length > 0 ? 'semantic emphasis' : 'dialogue progression'}${matchingBroll ? ' with visual cut' : ''}`,
        confidence: 0.94,
      });
    }

    return {
      style,
      editBeats,
      colorGrade,
    };
  }

  /**
   * AI POLISH:
   * Inspects existing project and formulates an actionable AIEditPlan
   * with itemized cards across captions, B-roll, SFX, zooms, and color grading.
   */
  public async generateAIPolishPlan(input: AIDirectorInput): Promise<AIEditPlan> {
    const { style, editBeats, colorGrade } = await this.coordinateEditBeats(input);

    const items: AIEditPlanItem[] = [];

    // 1. Color Grading Upgrade
    items.push({
      id: 'polish_color_grade',
      category: 'color',
      title: `Apply ${colorGrade.name} Color Grade`,
      description: `Normalizes film contrast (x${colorGrade.contrast}) and saturation (x${colorGrade.saturation}) to match ${style.name} visual identity.`,
      timestamp: 0,
      duration: input.totalDurationSeconds,
      impact: 'high',
      selected: true,
    });

    // 2. Audio Ducking & Voice Priority
    items.push({
      id: 'polish_audio_ducking',
      category: 'audio_ducking',
      title: 'Dialogue-Aware Sound Ducking (-15dB)',
      description: 'Automatically ducks background music and sound effects during speech to protect intelligibility.',
      timestamp: 0,
      duration: input.totalDurationSeconds,
      impact: 'high',
      selected: true,
    });

    // 3. Caption Polish & Semantic Emphasis
    const emphasizedBeats = editBeats.filter((b) => b.emphasisWords.length > 0);
    if (emphasizedBeats.length > 0) {
      items.push({
        id: 'polish_caption_emphasis',
        category: 'captions',
        title: `Semantic Word Emphasis (${emphasizedBeats.length} beats)`,
        description: `Highlight key numbers, currency, and hook words in ${style.captionStyle.highlightColors.primary} while keeping base text stable.`,
        timestamp: emphasizedBeats[0].startTime,
        duration: input.totalDurationSeconds,
        impact: 'high',
        selected: true,
      });
    }

    // 4. B-roll Polish
    const brollBeats = editBeats.filter((b) => b.broll);
    for (const b of brollBeats.slice(0, 3)) {
      items.push({
        id: `polish_broll_${b.id}`,
        category: 'broll',
        title: `Insert B-Roll: "${b.broll?.concept}"`,
        description: `Semantically aligned cutaway (${b.broll?.isPIP ? 'PIP Card' : 'Full Cover'}) from ${b.broll?.provider}.`,
        timestamp: b.startTime,
        duration: Number((b.endTime - b.startTime).toFixed(2)),
        impact: 'high',
        selected: true,
        editBeat: b,
      });
    }

    // 5. SFX Cues Polish
    const sfxBeats = editBeats.filter((b) => b.sfx);
    for (const b of sfxBeats.slice(0, 3)) {
      items.push({
        id: `polish_sfx_${b.id}`,
        category: 'sfx',
        title: `Add ${b.sfx?.category.toUpperCase()} Sound Effect`,
        description: b.sfx?.reason || 'Dynamic audio cue synchronized with visual transition.',
        timestamp: b.startTime,
        duration: 0.5,
        impact: 'medium',
        selected: true,
        editBeat: b,
      });
    }

    // 6. Dynamic Zooms & VFX
    const vfxBeats = editBeats.filter((b) => b.vfx);
    if (vfxBeats.length > 0) {
      items.push({
        id: 'polish_vfx_zooms',
        category: 'vfx',
        title: 'Dynamic Punch-in Zooms',
        description: 'Applies smooth 1.05x - 1.08x punch zooms on opening hook and emotional climax beats.',
        timestamp: vfxBeats[0].startTime,
        duration: 0.45,
        impact: 'medium',
        selected: true,
      });
    }

    return {
      projectId: input.projectId,
      recommendedStyle: style.id,
      summary: `AI Director analyzed ${input.wordTimings.length} words across ${input.totalDurationSeconds.toFixed(1)}s and recommended ${style.name}. ${items.length} high-impact improvements generated.`,
      estimatedQualityBoost: 'Enhanced Pacing & Visual Cadence (Heuristic)',
      items,
      generatedAt: Date.now(),
    };
  }
}
