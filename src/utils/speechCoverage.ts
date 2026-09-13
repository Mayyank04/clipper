import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { CaptionSegment } from '../types';

const ffmpegPath = (ffmpegStatic as unknown as string) || 'ffmpeg';

export interface SpeechInterval {
  start: number;
  end: number;
}

export interface IndependentSpeechCoverageResult {
  independentSpeechDuration: number;
  captionCoveredDuration: number;
  coveragePercent: number;
  passed: boolean;
  independentSpeechIntervals: SpeechInterval[];
}

/**
 * Derives independent physical speech intervals from audio using FFmpeg silencedetect.
 * Voice Activity is detected by inverting periods of silence below noiseDb threshold.
 */
export function getIndependentAudioSpeechIntervals(
  filePath: string,
  totalDuration: number,
  noiseDb = '-30dB',
  minSilenceSec = 0.3
): Promise<SpeechInterval[]> {
  return new Promise((resolve) => {
    execFile(
      ffmpegPath,
      [
        '-v', 'info',
        '-i', filePath,
        '-af', `silencedetect=noise=${noiseDb}:d=${minSilenceSec}`,
        '-vn', '-sn', '-dn',
        '-f', 'null',
        '-',
      ],
      (err, _stdout, stderr) => {
        const output = (stderr || '') + (_stdout || '');
        const silenceStarts: number[] = [];
        const silenceEnds: number[] = [];

        const startRegex = /silence_start:\s*([0-9.]+)/g;
        const endRegex = /silence_end:\s*([0-9.]+)/g;

        let match: RegExpExecArray | null;
        while ((match = startRegex.exec(output)) !== null) {
          silenceStarts.push(parseFloat(match[1]));
        }
        while ((match = endRegex.exec(output)) !== null) {
          silenceEnds.push(parseFloat(match[1]));
        }

        const silenceIntervals: SpeechInterval[] = [];
        for (let i = 0; i < silenceStarts.length; i++) {
          const s = silenceStarts[i];
          const e = silenceEnds[i] !== undefined ? silenceEnds[i] : totalDuration;
          silenceIntervals.push({ start: s, end: Math.min(totalDuration, e) });
        }

        // Invert silence to get independent physical speech intervals
        const speechIntervals: SpeechInterval[] = [];
        let cur = 0;
        for (const sil of silenceIntervals) {
          if (sil.start > cur + 0.05) {
            speechIntervals.push({
              start: Number(cur.toFixed(3)),
              end: Number(Math.min(totalDuration, sil.start).toFixed(3)),
            });
          }
          cur = Math.max(cur, sil.end);
        }
        if (cur < totalDuration - 0.05) {
          speechIntervals.push({
            start: Number(cur.toFixed(3)),
            end: Number(totalDuration.toFixed(3)),
          });
        }

        // If audio track has speech but no silence detected (continuous speech)
        if (speechIntervals.length === 0 && totalDuration > 0) {
          speechIntervals.push({ start: 0, end: Number(totalDuration.toFixed(3)) });
        }

        resolve(speechIntervals);
      }
    );
  });
}

/**
 * Calculates mathematical union duration of a set of intervals.
 */
export function mergeIntervals(intervals: SpeechInterval[]): SpeechInterval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: SpeechInterval[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr.start <= last.end + 0.02) {
      last.end = Math.max(last.end, curr.end);
    } else {
      merged.push({ ...curr });
    }
  }
  return merged;
}

/**
 * Computes intersection between two interval arrays.
 */
export function intersectIntervals(aList: SpeechInterval[], bList: SpeechInterval[]): SpeechInterval[] {
  const result: SpeechInterval[] = [];
  for (const a of aList) {
    for (const b of bList) {
      const s = Math.max(a.start, b.start);
      const e = Math.min(a.end, b.end);
      if (e > s + 0.01) {
        result.push({ start: Number(s.toFixed(3)), end: Number(e.toFixed(3)) });
      }
    }
  }
  return mergeIntervals(result);
}

/**
 * Independent speech coverage calculator (Section 3 requirement):
 * speechCoverage = union(intersection(independentSpeechIntervals, captionIntervals)) / union(independentSpeechIntervals)
 */
export async function calculateIndependentSpeechCoverage(
  mediaPath: string,
  totalDuration: number,
  captions: CaptionSegment[]
): Promise<IndependentSpeechCoverageResult> {
  const independentSpeech = await getIndependentAudioSpeechIntervals(mediaPath, totalDuration);
  const mergedSpeech = mergeIntervals(independentSpeech);
  const totalIndependentSpeechDuration = mergedSpeech.reduce((acc, int) => acc + (int.end - int.start), 0);

  const rawCaptionIntervals: SpeechInterval[] = captions.map((c) => ({
    start: Math.max(0, c.start),
    end: Math.min(totalDuration, c.end),
  }));
  const mergedCaptions = mergeIntervals(rawCaptionIntervals);

  // Compute intersection
  const coveredIntervals = intersectIntervals(mergedSpeech, mergedCaptions);
  const coveredDuration = coveredIntervals.reduce((acc, int) => acc + (int.end - int.start), 0);

  const coverageRatio =
    totalIndependentSpeechDuration > 0
      ? Math.min(1.0, coveredDuration / totalIndependentSpeechDuration)
      : captions.length > 0 ? 1.0 : 0.0;

  const coveragePercent = Number((coverageRatio * 100).toFixed(1));

  return {
    independentSpeechDuration: Number(totalIndependentSpeechDuration.toFixed(2)),
    captionCoveredDuration: Number(coveredDuration.toFixed(2)),
    coveragePercent,
    passed: coveragePercent >= 95.0,
    independentSpeechIntervals: mergedSpeech,
  };
}
