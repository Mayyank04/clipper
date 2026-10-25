import {
  EditorProject,
  VideoProject,
  ShortCandidate,
  VideoClip,
  AudioClip,
  BrollItem,
  SfxItem,
  VfxItem,
  MusicItem,
  ExportSettings,
  SourceMedia,
  CaptionSegment,
} from '../types';
import { adjustShortTrimBounds } from './timeEngine';

/**
 * Creates the canonical single source of truth EditorProject
 * from a VideoProject and active ShortCandidate.
 */
export function createEditorProject(
  project: VideoProject,
  short: ShortCandidate,
  settings?: ExportSettings
): EditorProject {
  const isAudioProject = project.projectType === 'audio-to-video' || Boolean(short.audioToVideoConfig || short.audioUrl);
  const mediaUrl = short.videoProxyUrl || short.audioUrl || project.videoUrl || '';
  const seqDur = Math.max(1, short.duration || (short.endTime - short.startTime) || 28);

  const sourceMedia: SourceMedia = project.sourceMedia || short.sourceMedia || {
    id: `src_${project.id}`,
    type: isAudioProject ? 'audio' : 'video',
    kind: isAudioProject ? 'audio' : 'video',
    path: project.sourceMedia?.path || short.sourceMedia?.path || mediaUrl,
    localPath: project.sourceMedia?.localPath || project.sourceMedia?.path || mediaUrl,
    publicUrl: project.sourceMedia?.publicUrl || project.sourceMedia?.url || mediaUrl,
    name: project.originalTitle || 'Source Media',
    filename: project.originalTitle || 'Source Media',
    url: mediaUrl,
    mimeType: isAudioProject ? 'audio/mp3' : 'video/mp4',
    duration: project.originalDuration || seqDur,
    width: isAudioProject ? 1080 : 1920,
    height: isAudioProject ? 1920 : 1080,
    fps: 30,
    hasVideo: !isAudioProject,
    hasAudio: true,
    sourceType: project.demoMode ? 'demo' : 'upload',
    status: 'ready',
    audioAvailable: true,
  };

  // Canonical Video Clips (sequence mapping)
  const videoTracks: VideoClip[] = (short.videoClips && short.videoClips.length > 0)
    ? short.videoClips
    : [
        {
          id: `clip_${short.id}_0`,
          sourceUrl: mediaUrl,
          sourceStart: short.startTime,
          sourceEnd: short.endTime,
          timelineStart: 0,
          timelineEnd: seqDur,
        },
      ];

  // Canonical Audio Clips
  const audioTracks: AudioClip[] = [
    {
      id: `audio_${short.id}_0`,
      sourceUrl: mediaUrl,
      timelineStart: 0,
      timelineEnd: seqDur,
      volume: 1.0,
      muted: false,
      isVoiceTrack: true,
    },
  ];

  // Canonical B-Roll items
  const brollTrack: BrollItem[] = (short.brollSuggestions || []).map((b: any, idx) => ({
    id: b.id || `broll_${idx}`,
    assetUrl: b.assetUrl || b.imageUrl || '',
    timelineStart: b.timestamp,
    timelineEnd: b.timestamp + b.duration,
    x: 0,
    y: 0,
    width: 1080,
    height: 1920,
    opacity: 1.0,
    fit: 'cover',
    concept: b.concept,
    enabled: b.enabled ?? true,
  }));

  // Canonical SFX items
  const sfxTrack: SfxItem[] = (short.sfxMarkers || []).map((s: any, idx) => ({
    id: s.id || `sfx_${idx}`,
    audioUrl: s.audioUrl || `/assets/sfx/${s.category || 'impact'}.wav`,
    category: s.category,
    soundName: s.soundName,
    start: s.timestamp,
    end: s.timestamp + 1.2,
    volume: 0.85,
  }));

  // Canonical VFX items
  const vfxTrack: VfxItem[] = (short.vfxMarkers || []).map((v, idx) => ({
    id: v.id || `vfx_${idx}`,
    type: v.type,
    start: v.timestamp,
    end: v.timestamp + v.duration,
    intensity: v.intensity,
    label: v.label,
  }));

  // Canonical Music track
  const musicTrack: MusicItem[] = [];

  const defaultExportSettings: ExportSettings = settings || {
    resolution: '1080x1920',
    fps: 30,
    format: 'mp4',
    quality: 'high',
    socialPreset: 'shorts',
    includeWatermark: false,
    burnCaptions: true,
  };

  return {
    id: `editor_${short.id}`,
    title: short.title,
    source: sourceMedia,
    sequence: {
      duration: seqDur,
      fps: 30,
      width: 1080,
      height: 1920,
      aspectRatio: short.aspectRatio || '9:16',
    },
    videoTracks,
    audioTracks,
    captionTrack: short.captions || [],
    brollTrack,
    sfxTrack,
    vfxTrack,
    musicTrack,
    transforms: [
      {
        time: 0,
        scale: 1.0,
        x: 0,
        y: 0,
        rotation: 0,
        speakerTarget: short.speakerPosition === 'auto_switch' ? 'center' : (short.speakerPosition || 'center'),
      },
    ],
    transformState: {
      scale: 1.0,
      x: 0,
      y: 0,
      rotation: 0,
      speakerPosition: short.speakerPosition || 'center',
    },
    backgroundTrack: short.audioToVideoConfig
      ? {
          type: short.audioToVideoConfig.backgroundType,
          gradient: short.audioToVideoConfig.backgroundGradient,
          url: short.audioToVideoConfig.backgroundUrl,
          blur: short.audioToVideoConfig.backgroundBlur,
        }
      : undefined,
    exportSettings: defaultExportSettings,
    projectAnalysis: short.projectAnalysis || project.projectAnalysis,
    language: short.language || project.language,
  };
}

/**
 * Updates a ShortCandidate from the canonical EditorProject state
 */
export function updateShortFromEditor(
  short: ShortCandidate,
  editor: EditorProject
): ShortCandidate {
  const effectiveDuration = editor.sequence.duration;
  const primaryVideoClip = editor.videoTracks[0];
  const newStartTime = primaryVideoClip ? primaryVideoClip.sourceStart : short.startTime;
  const newEndTime = primaryVideoClip ? primaryVideoClip.sourceEnd : short.endTime;

  // Convert BrollItem back to BRollSuggestion
  const brollSuggestions = editor.brollTrack.map((b) => ({
    id: b.id,
    timestamp: b.timelineStart,
    duration: Math.max(0.5, b.timelineEnd - b.timelineStart),
    concept: b.concept || 'Visual B-Roll',
    imageUrl: b.assetUrl,
    prompt: b.concept || '',
    enabled: b.enabled ?? true,
  }));

  // Convert SfxItem back to SFXMarker
  const sfxMarkers = editor.sfxTrack.map((s) => ({
    id: s.id,
    timestamp: s.start,
    category: s.category,
    soundName: s.soundName,
    volume: s.volume,
  }));

  // Convert VfxItem back to VFXMarker
  const vfxMarkers = editor.vfxTrack.map((v) => ({
    id: v.id,
    timestamp: v.start,
    duration: Math.max(0.2, v.end - v.start),
    type: v.type,
    intensity: v.intensity,
    description: v.label,
  }));

  return {
    ...short,
    title: editor.title || short.title,
    duration: effectiveDuration,
    startTime: newStartTime,
    endTime: newEndTime,
    aspectRatio: editor.sequence.aspectRatio,
    speakerPosition: editor.transformState?.speakerPosition || short.speakerPosition,
    captions: editor.captionTrack,
    brollSuggestions,
    sfxMarkers,
    vfxMarkers,
    videoClips: editor.videoTracks,
  };
}

/**
 * Trims sequence and adjusts canonical video clip source mapping
 */
export function trimEditorProject(
  editor: EditorProject,
  newStartTime: number,
  newEndTime: number
): EditorProject {
  const currentClip = (editor.videoTracks && editor.videoTracks[0]) || (editor as any).videoClips?.[0];
  const currentSourceStart = currentClip ? currentClip.sourceStart : 0;
  const currentSourceEnd = currentClip ? currentClip.sourceEnd : (editor.sequence?.duration ?? (editor as any).duration ?? 30);

  let computedSourceStart: number;
  let computedSourceEnd: number;
  let delta: number;

  // Determine if caller provided absolute source bounds or sequence-relative bounds
  if (currentSourceStart > 0 && newStartTime >= currentSourceStart) {
    // Absolute source time domain (e.g. 125s - 150s on a 120s - 150s clip)
    computedSourceStart = Math.max(currentSourceStart, newStartTime);
    computedSourceEnd = Math.max(computedSourceStart + 1, newEndTime);
    delta = computedSourceStart - currentSourceStart;
  } else {
    // Sequence-relative time domain (e.g. 5s - 25s on a 30s sequence, or 0-offset clip)
    const safeStart = Math.max(0, newStartTime);
    const safeEnd = Math.max(safeStart + 1, newEndTime);
    computedSourceStart = currentSourceStart + safeStart;
    computedSourceEnd = currentSourceStart + safeEnd;
    delta = safeStart;
  }

  const newDuration = Math.max(1, Number((computedSourceEnd - computedSourceStart).toFixed(2)));

  const updatedVideoTracks: VideoClip[] = [
    {
      id: currentClip ? currentClip.id : `clip_${Date.now()}`,
      sourceUrl: currentClip ? currentClip.sourceUrl : (editor.source?.url || ''),
      sourceStart: Number(computedSourceStart.toFixed(2)),
      sourceEnd: Number(computedSourceEnd.toFixed(2)),
      timelineStart: 0,
      timelineEnd: newDuration,
    },
  ];

  // Shift and clamp tracks to new sequence duration
  const existingCaptions = editor.captionTrack || (editor as any).captionSegments || [];
  const updatedCaptions = existingCaptions
    .map((c: any) => ({
      ...c,
      start: Number((c.start - delta).toFixed(2)),
      end: Number((c.end - delta).toFixed(2)),
      words: (c.words || []).map((w: any) => ({
        ...w,
        start: Number((w.start - delta).toFixed(2)),
        end: Number((w.end - delta).toFixed(2)),
      })).filter((w: any) => w.end > 0 && w.start < newDuration),
    }))
    .filter((c: any) => c.end > 0 && c.start < newDuration)
    .map((c: any) => ({
      ...c,
      start: Math.max(0, c.start),
      end: Math.min(newDuration, c.end),
    }));

  const existingBroll = editor.brollTrack || (editor as any).brollClips || [];
  const updatedBroll = existingBroll
    .map((b: any) => ({
      ...b,
      timelineStart: Number(((b.timelineStart ?? b.start ?? 0) - delta).toFixed(2)),
      timelineEnd: Number(((b.timelineEnd ?? b.end ?? 0) - delta).toFixed(2)),
    }))
    .filter((b: any) => b.timelineEnd > 0 && b.timelineStart < newDuration)
    .map((b: any) => ({
      ...b,
      timelineStart: Math.max(0, b.timelineStart),
      timelineEnd: Math.min(newDuration, b.timelineEnd),
    }));

  const existingSfx = editor.sfxTrack || (editor as any).sfxClips || [];
  const updatedSfx = existingSfx
    .map((s: any) => ({
      ...s,
      start: Number((s.start - delta).toFixed(2)),
      end: Number((s.end - delta).toFixed(2)),
    }))
    .filter((s: any) => s.start >= 0 && s.start <= newDuration);

  const existingVfx = editor.vfxTrack || (editor as any).vfxClips || [];
  const updatedVfx = existingVfx
    .map((v: any) => ({
      ...v,
      start: Number((v.start - delta).toFixed(2)),
      end: Number((v.end - delta).toFixed(2)),
    }))
    .filter((v: any) => v.end > 0 && v.start < newDuration)
    .map((v: any) => ({
      ...v,
      start: Math.max(0, v.start),
      end: Math.min(newDuration, v.end),
    }));

  return {
    ...editor,
    duration: newDuration,
    sequence: editor.sequence ? {
      ...editor.sequence,
      duration: newDuration,
    } : {
      duration: newDuration,
      fps: 30,
      width: 1080,
      height: 1920,
      aspectRatio: '9:16',
    },
    videoTracks: updatedVideoTracks,
    videoClips: updatedVideoTracks,
    captionTrack: updatedCaptions,
    captionSegments: updatedCaptions,
    brollTrack: updatedBroll,
    brollClips: updatedBroll,
    sfxTrack: updatedSfx,
    sfxClips: updatedSfx,
    vfxTrack: updatedVfx,
    vfxClips: updatedVfx,
  } as any;
}

/**
 * Splits the active video clip at a sequence timestamp
 */
export function splitEditorProject(
  editor: EditorProject,
  splitSequenceTime: number
): EditorProject {
  if (splitSequenceTime <= 0.5 || splitSequenceTime >= editor.sequence.duration - 0.5) {
    return editor;
  }

  const clips = [...editor.videoTracks];
  const targetIndex = clips.findIndex(
    (c) => splitSequenceTime >= c.timelineStart && splitSequenceTime <= c.timelineEnd
  );

  if (targetIndex === -1) return editor;

  const targetClip = clips[targetIndex];
  const offsetInClip = splitSequenceTime - targetClip.timelineStart;
  const splitSourceTime = targetClip.sourceStart + offsetInClip;

  const clipA: VideoClip = {
    ...targetClip,
    id: `clip_${Date.now()}_a`,
    sourceEnd: splitSourceTime,
    timelineEnd: splitSequenceTime,
  };

  const clipB: VideoClip = {
    ...targetClip,
    id: `clip_${Date.now()}_b`,
    sourceStart: splitSourceTime,
    timelineStart: splitSequenceTime,
  };

  clips.splice(targetIndex, 1, clipA, clipB);

  return {
    ...editor,
    videoTracks: clips,
  };
}

/**
 * Deletes a video clip by ID and recalibrates the timeline sequence
 */
export function deleteEditorClip(
  editor: EditorProject,
  clipId: string
): EditorProject {
  if (editor.videoTracks.length <= 1) {
    return editor; // Can't delete the only remaining clip
  }

  const clipIndex = editor.videoTracks.findIndex((c) => c.id === clipId);
  if (clipIndex === -1) return editor;

  const clipToDelete = editor.videoTracks[clipIndex];
  const clipDuration = clipToDelete.timelineEnd - clipToDelete.timelineStart;

  const remainingClips = editor.videoTracks
    .filter((c) => c.id !== clipId)
    .map((c) => {
      if (c.timelineStart >= clipToDelete.timelineEnd) {
        return {
          ...c,
          timelineStart: c.timelineStart - clipDuration,
          timelineEnd: c.timelineEnd - clipDuration,
        };
      }
      return c;
    });

  const newSequenceDuration = Math.max(1, editor.sequence.duration - clipDuration);

  // Recalibrate captions
  const updatedCaptions = editor.captionTrack
    .filter((c) => !(c.start >= clipToDelete.timelineStart && c.end <= clipToDelete.timelineEnd))
    .map((c) => {
      if (c.start >= clipToDelete.timelineEnd) {
        return {
          ...c,
          start: c.start - clipDuration,
          end: c.end - clipDuration,
        };
      }
      return c;
    });

  return {
    ...editor,
    sequence: {
      ...editor.sequence,
      duration: newSequenceDuration,
    },
    videoTracks: remainingClips,
    captionTrack: updatedCaptions,
  };
}
