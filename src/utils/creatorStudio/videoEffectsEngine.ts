/**
 * VIRALCLIP STUDIO — VIDEO EFFECTS & COLOR GRADING ENGINE
 * Deterministic VFX (Dynamic Zoom, Reaction Punch, Speed Ramp)
 * and 3 Authoritative Color Grading Profiles (Cinematic Red, Creator Vibrant, Natural Pro)
 * with strict FFmpeg and CSS Preview parity.
 */

import { ColorGradingProfile, ColorTreatmentId } from './types';

export const COLOR_GRADING_PROFILES: Record<ColorTreatmentId, ColorGradingProfile> = {
  cinematic_red: {
    id: 'cinematic_red',
    name: 'Cinematic Red',
    description: 'Reference B film treatment: warm cinematic red highlights, deep contrast, and rich shadow density',
    contrast: 1.15,
    saturation: 1.12,
    brightness: -0.01,
    gamma: 0.96,
    temperatureK: 5400,
    highlightsTint: '#FF6B6B',
    shadowsTint: '#1A0B0E',
    ffmpegFilter: 'eq=contrast=1.14:saturation=1.12:brightness=-0.01,colorbalance=rs=0.08:gs=-0.02:bs=-0.05',
    cssFilter: 'contrast(115%) saturate(112%) brightness(99%) sepia(8%) hue-rotate(-8deg)',
  },

  creator_vibrant: {
    id: 'creator_vibrant',
    name: 'Creator Vibrant',
    description: 'Reference A viral look: punchy saturated colors, bright skin tones, and crisp contrast',
    contrast: 1.08,
    saturation: 1.20,
    brightness: 0.02,
    gamma: 1.0,
    temperatureK: 6500,
    highlightsTint: '#FFFBEB',
    shadowsTint: '#0F172A',
    ffmpegFilter: 'eq=contrast=1.08:saturation=1.20:brightness=0.02',
    cssFilter: 'contrast(108%) saturate(120%) brightness(102%)',
  },

  natural_pro: {
    id: 'natural_pro',
    name: 'Natural Pro',
    description: 'Accurate broadcast fidelity: natural skin tones, balanced dynamic range, zero clipping',
    contrast: 1.02,
    saturation: 1.03,
    brightness: 0.0,
    gamma: 1.0,
    temperatureK: 6500,
    highlightsTint: '#FFFFFF',
    shadowsTint: '#000000',
    ffmpegFilter: 'eq=contrast=1.02:saturation=1.03:brightness=0.0',
    cssFilter: 'contrast(102%) saturate(103%) brightness(100%)',
  },

  clean_monochrome: {
    id: 'clean_monochrome',
    name: 'Clean Monochrome',
    description: 'Stylized black-and-white documentary look with high tonal contrast',
    contrast: 1.20,
    saturation: 0.0,
    brightness: 0.0,
    gamma: 0.95,
    ffmpegFilter: 'hue=s=0,eq=contrast=1.2:brightness=0.0',
    cssFilter: 'grayscale(100%) contrast(120%)',
  },

  warm_vintage: {
    id: 'warm_vintage',
    name: 'Warm Vintage',
    description: 'Golden hour nostalgic warmth with soft shadows',
    contrast: 1.05,
    saturation: 1.08,
    brightness: 0.01,
    gamma: 1.02,
    ffmpegFilter: 'eq=contrast=1.05:saturation=1.08,colorbalance=rs=0.05:gs=0.02:bs=-0.04',
    cssFilter: 'contrast(105%) saturate(108%) sepia(15%)',
  },
};

export function getColorGradingProfile(id: ColorTreatmentId = 'cinematic_red'): ColorGradingProfile {
  return COLOR_GRADING_PROFILES[id] || COLOR_GRADING_PROFILES.cinematic_red;
}

export interface DynamicZoomKeyframe {
  startTime: number;
  endTime: number;
  startScale: number;
  peakScale: number;
  endScale: number;
  easing: 'ease_in_out' | 'punch' | 'linear';
}

/**
 * Plans subtle dynamic zooms and reaction punches across a timeline
 */
export function planDynamicZooms(
  emotionSpikes: { time: number; intensity: number }[],
  totalDuration: number
): DynamicZoomKeyframe[] {
  const keyframes: DynamicZoomKeyframe[] = [];

  // Opening hook punch (0s - 2.5s): subtle push from 1.00x -> 1.04x
  keyframes.push({
    startTime: 0,
    endTime: Math.min(2.5, totalDuration),
    startScale: 1.0,
    peakScale: 1.04,
    endScale: 1.04,
    easing: 'ease_in_out',
  });

  // Emotional reaction punches (1.00x -> 1.08x -> 1.00x over 400ms)
  for (const spike of emotionSpikes) {
    if (spike.time > 3.0 && spike.time < totalDuration - 2.0) {
      keyframes.push({
        startTime: spike.time,
        endTime: spike.time + 0.45,
        startScale: 1.0,
        peakScale: 1.08,
        endScale: 1.0,
        easing: 'punch',
      });
    }
  }

  return keyframes;
}
