/**
 * Real NLE Time Engine & Coordinate Transformation Architecture
 *
 * CRITICAL RULE:
 * Explicitly separates:
 * - SOURCE MEDIA TIME (0 -> sourceMedia.duration)
 * - ABSOLUTE PROJECT / SEQUENCE TIME (0 -> short.duration)
 * - LOCAL ITEM RELATIVE TIME
 */

import { ShortCandidate, SourceMedia } from '../types';

/**
 * Maps project sequence time (0 -> short.duration) to the underlying source media time
 * @param projectTime - Current offset within the Short (seconds)
 * @param clipSourceStart - In-point of the clip in the raw source video (seconds)
 */
export function projectTimeToSourceTime(projectTime: number, clipSourceStart: number): number {
  return Math.max(0, clipSourceStart + projectTime);
}

// Canonical aliases (Section 4)
export const shortToSourceTime = projectTimeToSourceTime;
export const sequenceTimeToSourceTime = projectTimeToSourceTime;
export const sequenceToSourceTime = projectTimeToSourceTime;

/**
 * Maps underlying source media time back to short time (0 -> short.duration)
 * @param sourceTime - Absolute time in source media file (seconds)
 * @param clipSourceStart - In-point of the short clip in the raw source video (seconds)
 */
export function sourceTimeToProjectTime(sourceTime: number, clipSourceStart: number): number {
  return Math.max(0, sourceTime - clipSourceStart);
}

// Canonical aliases (Section 4)
export const sourceToShortTime = sourceTimeToProjectTime;
export const sourceTimeToSequenceTime = sourceTimeToProjectTime;
export const sourceToSequenceTime = sourceTimeToProjectTime;

/**
 * Maps project time to pixel coordinate in the timeline track
 * @param projectTime - Project sequence time (seconds)
 * @param projectDuration - Total duration of the sequence (seconds)
 * @param trackWidthPx - Visual pixel width of the track
 */
export function projectTimeToPixel(
  projectTime: number,
  projectDuration: number,
  trackWidthPx: number
): number {
  if (projectDuration <= 0 || trackWidthPx <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, projectTime / projectDuration));
  return ratio * trackWidthPx;
}

// Canonical Section 3 aliases
export const sequenceTimeToPixel = projectTimeToPixel;
export const sequenceToPixel = projectTimeToPixel;

/**
 * Maps a click / touch pixel coordinate to project sequence time
 * @param pixelX - Pixel offset from the start of the active track lane
 * @param trackWidthPx - Visual pixel width of the track lane
 * @param projectDuration - Total duration of the sequence (seconds)
 */
export function pixelToProjectTime(
  pixelX: number,
  trackWidthPx: number,
  projectDuration: number
): number {
  if (trackWidthPx <= 0 || projectDuration <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, pixelX / trackWidthPx));
  return ratio * projectDuration;
}

// Canonical alias: Phase 3
export const pixelToSequenceTime = pixelToProjectTime;

/**
 * Clamps a project time value within valid sequence bounds
 */
export function clampProjectTime(time: number, sequenceDuration: number): number {
  if (!Number.isFinite(time) || Number.isNaN(time)) return 0;
  return Math.max(0, Math.min(sequenceDuration, time));
}

export const clampShortTime = clampProjectTime;

/**
 * Runtime timing assertion for any timeline item
 */
export function validateTimelineItem(
  item: { start?: number; timestamp?: number; end?: number; duration?: number },
  sequenceDuration: number,
  itemName: string
): { isValid: boolean; error?: string } {
  const start = item.start !== undefined ? item.start : item.timestamp;
  const end =
    item.end !== undefined
      ? item.end
      : item.duration !== undefined && start !== undefined
      ? start + item.duration
      : undefined;

  if (start === undefined) {
    return { isValid: false, error: `${itemName} is missing start/timestamp` };
  }
  if (start < 0) {
    return { isValid: false, error: `${itemName} starts before 0: start=${start}` };
  }
  if (end !== undefined && end < start) {
    return { isValid: false, error: `${itemName} end (${end}) is before start (${start})` };
  }
  if (end !== undefined && end > sequenceDuration + 0.5) {
    return {
      isValid: false,
      error: `${itemName} end (${end.toFixed(1)}s) exceeds sequence duration (${sequenceDuration.toFixed(1)}s)`,
    };
  }

  return { isValid: true };
}

/**
 * Full audit of a ShortCandidate against its source video
 */
export function auditShortTiming(
  short: ShortCandidate,
  sourceDuration: number
): { valid: boolean; warnings: string[]; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const effectiveDuration = short.duration || short.endTime - short.startTime;

  if (short.startTime < 0) {
    errors.push(`Invalid clip startTime: ${short.startTime} < 0`);
  }
  if (short.endTime <= short.startTime) {
    errors.push(`Invalid clip bounds: endTime (${short.endTime}) <= startTime (${short.startTime})`);
  }
  if (sourceDuration > 0 && short.endTime > sourceDuration + 1.0) {
    errors.push(
      `Clip endTime (${short.endTime.toFixed(1)}s) exceeds source video duration (${sourceDuration.toFixed(1)}s)`
    );
  }

  // Audit captions
  (short.captions || []).forEach((c, i) => {
    const res = validateTimelineItem(c, effectiveDuration, `Caption #${i + 1} ("${c.text.slice(0, 15)}...")`);
    if (!res.isValid) errors.push(res.error!);
  });

  // Audit SFX
  (short.sfxMarkers || []).forEach((s, i) => {
    const res = validateTimelineItem(s, effectiveDuration, `SFX #${i + 1} (${s.soundName})`);
    if (!res.isValid) errors.push(res.error!);
  });

  // Audit VFX
  (short.vfxMarkers || []).forEach((v, i) => {
    const res = validateTimelineItem(v, effectiveDuration, `VFX #${i + 1} (${v.type})`);
    if (!res.isValid) errors.push(res.error!);
  });

  // Audit B-Roll
  (short.brollSuggestions || []).forEach((b, i) => {
    const res = validateTimelineItem(b, effectiveDuration, `B-Roll #${i + 1} (${b.concept})`);
    if (!res.isValid) errors.push(res.error!);
  });

  // Coverage check: verify effects don't abruptly stop in the first half
  const maxCaptionEnd = Math.max(0, ...(short.captions || []).map((c) => c.end));
  if (effectiveDuration > 10 && maxCaptionEnd < effectiveDuration * 0.7) {
    warnings.push(
      `Captions terminate early: last caption at ${maxCaptionEnd.toFixed(1)}s in ${effectiveDuration.toFixed(1)}s clip`
    );
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Adjusts trim bounds for a ShortCandidate and automatically recalibrates
 * all internal timeline track coordinates (captions, SFX, VFX, B-roll)
 * so they maintain frame-accurate sync with the underlying video content.
 */
export function adjustShortTrimBounds(
  short: ShortCandidate,
  newStartTime: number,
  newEndTime: number
): ShortCandidate {
  const safeStart = Math.max(0, Number(newStartTime.toFixed(1)));
  const safeEnd = Math.max(safeStart + 1, Number(newEndTime.toFixed(1)));
  const newDur = Number((safeEnd - safeStart).toFixed(1));
  const deltaStart = safeStart - short.startTime;

  let captions = short.captions || [];
  let sfxMarkers = short.sfxMarkers || [];
  let vfxMarkers = short.vfxMarkers || [];
  let brollSuggestions = short.brollSuggestions || [];

  if (Math.abs(deltaStart) > 0.01) {
    // Shift relative track times by deltaStart
    captions = captions
      .map((c) => {
        const start = Number((c.start - deltaStart).toFixed(2));
        const end = Number((c.end - deltaStart).toFixed(2));
        const words = (c.words || [])
          .map((w) => ({
            ...w,
            start: Number((w.start - deltaStart).toFixed(2)),
            end: Number((w.end - deltaStart).toFixed(2)),
          }))
          .filter((w) => w.end > 0 && w.start < newDur);
        return { ...c, start, end, words };
      })
      .filter((c) => c.end > 0 && c.start < newDur)
      .map((c) => ({
        ...c,
        start: Math.max(0, c.start),
        end: Math.min(newDur, c.end),
      }));

    sfxMarkers = sfxMarkers
      .map((s) => ({
        ...s,
        timestamp: Number((s.timestamp - deltaStart).toFixed(2)),
      }))
      .filter((s) => s.timestamp >= 0 && s.timestamp <= newDur);

    vfxMarkers = vfxMarkers
      .map((v) => ({
        ...v,
        timestamp: Number((v.timestamp - deltaStart).toFixed(2)),
      }))
      .filter((v) => v.timestamp + v.duration > 0 && v.timestamp < newDur)
      .map((v) => ({
        ...v,
        timestamp: Math.max(0, v.timestamp),
        duration: Math.min(v.duration, Number((newDur - Math.max(0, v.timestamp)).toFixed(2))),
      }));

    brollSuggestions = brollSuggestions
      .map((b) => ({
        ...b,
        timestamp: Number((b.timestamp - deltaStart).toFixed(2)),
      }))
      .filter((b) => b.timestamp + b.duration > 0 && b.timestamp < newDur)
      .map((b) => ({
        ...b,
        timestamp: Math.max(0, b.timestamp),
        duration: Math.min(b.duration, Number((newDur - Math.max(0, b.timestamp)).toFixed(2))),
      }));
  } else {
    // Only end bound changed, clamp items to newDur
    captions = captions
      .filter((c) => c.start < newDur)
      .map((c) => ({
        ...c,
        end: Math.min(newDur, c.end),
        words: (c.words || [])
          .filter((w) => w.start < newDur)
          .map((w) => ({ ...w, end: Math.min(newDur, w.end) })),
      }));

    sfxMarkers = sfxMarkers.filter((s) => s.timestamp <= newDur);
    vfxMarkers = vfxMarkers
      .filter((v) => v.timestamp < newDur)
      .map((v) => ({
        ...v,
        duration: Math.min(v.duration, Number((newDur - v.timestamp).toFixed(2))),
      }));

    brollSuggestions = brollSuggestions
      .filter((b) => b.timestamp < newDur)
      .map((b) => ({
        ...b,
        duration: Math.min(b.duration, Number((newDur - b.timestamp).toFixed(2))),
      }));
  }

  return {
    ...short,
    startTime: safeStart,
    endTime: safeEnd,
    duration: newDur,
    captions,
    sfxMarkers,
    vfxMarkers,
    brollSuggestions,
  };
}
