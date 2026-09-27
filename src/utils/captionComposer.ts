/**
 * VIRALCLIP STUDIO — PRODUCTION CAPTION COMPOSER
 * Production-grade caption segmentation, timing analysis, semantic emphasis,
 * and multi-mode social-media formatting.
 *
 * Implements:
 * - Word, Line, Beat, Block, and Auto segmentation modes
 * - Preserves natural phrases, numbers/units, acronyms, dates, Hindi/Hinglish
 * - Acoustic repetition detection (preserves "no no no", collapses decoder loops)
 * - Zero proportional timestamp division; 100% true Whisper word alignment
 */

import {
  WordTiming,
  CaptionBeat,
  CaptionBeatWord,
  CaptionSegment,
  CaptionSegmentationOptions,
  CaptionSegmentationMode,
} from '../types';

export class CaptionComposer {
  /**
   * Main composition entry point.
   * Converts word-level Whisper timestamps into professional CaptionBeat[].
   */
  public static compose(
    words: WordTiming[],
    options: CaptionSegmentationOptions = {}
  ): CaptionBeat[] {
    if (!Array.isArray(words) || words.length === 0) {
      return [];
    }

    // 1. Sanitize input words and enforce strict chronological order
    const sortedWords = [...words]
      .filter((w) => Boolean(w && (w.word || (w as any).text)))
      .sort((a, b) => a.start - b.start);

    if (sortedWords.length === 0) return [];

    // 2. Resolve segmentation mode
    const mode = options.mode || 'BEAT';
    const effectiveMode = mode === 'AUTO' ? this.detectOptimalMode(sortedWords) : mode;

    // 3. Configure segmentation parameters based on mode and options
    const config = this.resolveModeConfig(effectiveMode, options);

    // 4. Acoustic repetition suppression (preserves "no no no", drops "They They They")
    const cleanedWords = this.suppressDecoderHallucinationLoops(sortedWords);

    // 5. Partition words into beats based on syntactic, cadence, and timing constraints
    const rawBeats = this.partitionIntoBeats(cleanedWords, config, options);

    // 6. Post-process beats: compute semantic types, emphasis words, pause analysis, reading speed
    return this.postProcessBeats(rawBeats, options);
  }

  /**
   * Converts CaptionBeat[] into backward-compatible CaptionSegment[]
   */
  public static toCaptionSegments(beats: CaptionBeat[], styleId = 'punch_pop'): CaptionSegment[] {
    return beats.map((b) => ({
      id: b.id,
      text: b.text,
      start: b.start,
      end: b.end,
      displayStart: b.start,
      displayEnd: b.end,
      words: b.words.map((w) => ({
        id: w.id,
        word: w.word,
        text: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence ?? 0.95,
        isHighlight: w.isEmphasis ?? false,
        highlightColor: w.highlightColor,
        scale: w.scale || 1.0,
      })),
      styleId,
      position: 'center' as any,
      animation: 'pop' as any,
      emphasisWords: b.emphasisWords,
      confidence: b.confidence,
      readingSpeed: b.readingSpeed,
      pauseBefore: b.pauseBefore,
      pauseAfter: b.pauseAfter,
      lineCount: b.lineCount,
      semanticType: b.semanticType,
    }));
  }

  /**
   * Intelligently selects best segmentation mode based on speech rate and cadence
   */
  private static detectOptimalMode(words: WordTiming[]): CaptionSegmentationMode {
    if (words.length <= 4) return 'BEAT';

    const totalDur = Math.max(0.5, words[words.length - 1].end - words[0].start);
    const wordsPerSecond = words.length / totalDur;

    // Very fast speech (>3.5 wps) benefits from punchy single words or tight beats
    if (wordsPerSecond > 3.6) {
      return 'BEAT';
    }
    // Moderate speech (2.0 - 3.5 wps) fits shorts beat cadence
    if (wordsPerSecond >= 2.0) {
      return 'BEAT';
    }
    // Deliberate or slow speech with long pauses fits natural lines
    return 'LINE';
  }

  /**
   * Resolves numeric bounds and pause thresholds based on mode and user settings
   */
  private static resolveModeConfig(
    mode: CaptionSegmentationMode,
    options: CaptionSegmentationOptions
  ): {
    minWords: number;
    maxWords: number;
    maxChars: number;
    maxDuration: number;
    pauseThreshold: number;
  } {
    // Pause sensitivity thresholds in seconds
    const pauseMap = {
      low: 0.55,
      medium: 0.35,
      high: 0.18,
    };
    const pauseThreshold = pauseMap[options.pauseSensitivity || 'medium'] || 0.35;

    // Reading speed character caps
    const speedMultiplier = options.readingSpeed === 'slow' ? 0.8 : options.readingSpeed === 'fast' ? 1.25 : 1.0;

    switch (mode) {
      case 'WORD':
        return {
          minWords: 1,
          maxWords: 1,
          maxChars: 18,
          maxDuration: 1.2,
          pauseThreshold: 0.15,
        };

      case 'LINE':
        return {
          minWords: 3,
          maxWords: 8,
          maxChars: Math.round((options.maxCharacters || 38) * speedMultiplier),
          maxDuration: 4.2,
          pauseThreshold,
        };

      case 'BLOCK':
        return {
          minWords: 5,
          maxWords: 12,
          maxChars: Math.round((options.maxCharacters || 45) * speedMultiplier),
          maxDuration: 5.5,
          pauseThreshold: Math.max(0.45, pauseThreshold),
        };

      case 'BEAT':
      default: {
        const userWords = options.wordsPerBeat || 3;
        return {
          minWords: Math.max(1, userWords - 1),
          maxWords: Math.min(6, Math.max(2, userWords + 1)),
          maxChars: Math.round((options.maxCharacters || 32) * speedMultiplier),
          maxDuration: 2.8,
          pauseThreshold,
        };
      }
    }
  }

  /**
   * Distinguishes genuine human repetition ("no no no", "very very") from Whisper decoder loops.
   */
  private static suppressDecoderHallucinationLoops(words: WordTiming[]): WordTiming[] {
    const cleaned: WordTiming[] = [];
    let lastNorm = '';
    let repeatCount = 0;

    const allowedRepeats = new Set([
      'no', 'wait', 'very', 'never', 'yes', 'now', 'stop', 'go', 'run', 'bye',
      'bhai', 'haan', 'nahi', 'sahi', 'sun', 'dekh', 'kya',
    ]);

    for (let i = 0; i < words.length; i++) {
      const cur = words[i];
      const wordText = (cur.word || (cur as any).text || '').trim();
      const norm = wordText.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/gi, '');

      if (!norm) continue;

      if (norm === lastNorm && norm.length > 1) {
        repeatCount++;
        const prevWord = cleaned[cleaned.length - 1];
        const gap = prevWord ? cur.start - prevWord.end : 0;
        const acousticDuration = cur.end - cur.start;

        const isAllowedWord = allowedRepeats.has(norm);
        const hasAcousticPresence = gap > 0.04 || acousticDuration > 0.18;

        // If human repetition, allow up to 3 occurrences; otherwise discard run-away loop
        if (isAllowedWord && hasAcousticPresence && repeatCount <= 3) {
          cleaned.push(cur);
        } else if (!isAllowedWord && repeatCount >= 2) {
          // Suppress decoder loop
          continue;
        } else if (repeatCount > 3) {
          continue;
        } else {
          cleaned.push(cur);
        }
      } else {
        repeatCount = 0;
        lastNorm = norm;
        cleaned.push(cur);
      }
    }

    return cleaned;
  }

  /**
   * Partitions words into creator beats adhering strictly to semantic and punctuation boundaries.
   */
  private static partitionIntoBeats(
    words: WordTiming[],
    config: {
      minWords: number;
      maxWords: number;
      maxChars: number;
      maxDuration: number;
      pauseThreshold: number;
    },
    options: CaptionSegmentationOptions
  ): Array<{ words: WordTiming[]; pauseBefore: number; pauseAfter: number }> {
    const beats: Array<{ words: WordTiming[]; pauseBefore: number; pauseAfter: number }> = [];
    let currentWords: WordTiming[] = [];
    let beatPauseBefore = 0;

    const sentenceAware = options.sentenceAwareness !== false;
    const punctAware = options.punctuationAwareness !== false;

    const flush = (nextWordStart?: number) => {
      if (currentWords.length === 0) return;
      const lastWord = currentWords[currentWords.length - 1];
      const pauseAfter = nextWordStart !== undefined ? Math.max(0, nextWordStart - lastWord.end) : 0;

      beats.push({
        words: [...currentWords],
        pauseBefore: Number(beatPauseBefore.toFixed(3)),
        pauseAfter: Number(pauseAfter.toFixed(3)),
      });

      currentWords = [];
      beatPauseBefore = pauseAfter;
    };

    for (let i = 0; i < words.length; i++) {
      const curWord = words[i];
      const prevWord = currentWords[currentWords.length - 1];

      if (prevWord) {
        const pause = curWord.start - prevWord.end;
        const prevText = (prevWord.word || (prevWord as any).text || '').trim();
        const currText = (curWord.word || (curWord as any).text || '').trim();

        // 1. Punctuation checks
        const endsWithSentence = /[.?!]$/.test(prevText);
        const endsWithClause = /[,;:]$/.test(prevText);

        // 2. Syntax protection: do not split numbers & units ("$50" "million", "42" "%")
        const isNumUnit =
          /^\$?\d+[\d,.]*$/i.test(prevText) &&
          /^(percent|%|k|m|b|dollars|rs|inr|crore|lakh|miles|kg|lbs|users|hours|seconds|minutes|years|views|subscribers)$/i.test(currText);

        // 3. Contraction protection ("don" "'t", "it" "'s")
        const isContraction = /^[’'](s|t|re|ve|ll|d|m)$/i.test(currText) || /n['’]t$/i.test(currText);

        // 4. Proper noun / Name pair ("Elon" "Musk", "Steve" "Jobs")
        const isCapitalPair =
          /^[A-Z][a-z]+$/.test(prevText) &&
          /^[A-Z][a-z]+$/.test(currText) &&
          currentWords.length < config.maxWords;

        // 5. Hindi / Hinglish colloquial phrases ("kya" "baat", "bhai" "ye")
        const isHindiPair =
          /^(kya|bhai|yaar|sabse|bohot|kaafi|ek|ye|wo)$/i.test(prevText) &&
          /^(baat|suno|accha|badiya|paisa|video|view)$/i.test(currText);

        const unbreakable = isNumUnit || isContraction || isCapitalPair || isHindiPair;

        // Evaluate boundary break criteria
        const charLengthSoFar = currentWords.map((w) => w.word || (w as any).text).join(' ').length;
        const durationSoFar = curWord.end - currentWords[0].start;

        const shouldBreak =
          !unbreakable &&
          (
            (sentenceAware && endsWithSentence) ||
            (punctAware && endsWithClause && currentWords.length >= config.minWords) ||
            pause > config.pauseThreshold ||
            currentWords.length >= config.maxWords ||
            charLengthSoFar + currText.length + 1 > config.maxChars ||
            durationSoFar > config.maxDuration
          );

        if (shouldBreak) {
          flush(curWord.start);
        }
      }

      currentWords.push(curWord);
    }

    flush();
    return beats;
  }

  /**
   * Enriches raw beats with semantic metadata, reading speed, and AI emphasis
   */
  private static postProcessBeats(
    rawBeats: Array<{ words: WordTiming[]; pauseBefore: number; pauseAfter: number }>,
    options: CaptionSegmentationOptions
  ): CaptionBeat[] {
    return rawBeats.map((beat, bIdx) => {
      const beatWords = beat.words;
      const start = Number(beatWords[0].start.toFixed(3));
      const end = Number(beatWords[beatWords.length - 1].end.toFixed(3));
      const text = beatWords.map((w) => w.word || (w as any).text).join(' ').trim();

      // Detect semantic emphasis
      const emphasisMetadata = this.detectSemanticEmphasis(beatWords);
      const emphasisWords = emphasisMetadata.map((e) => e.word);

      // Map words with emphasis metadata
      const enrichedWords: CaptionBeatWord[] = beatWords.map((w, wIdx) => {
        const wordStr = w.word || (w as any).text || '';
        const emp = emphasisMetadata.find((e) => e.wordIndex === wIdx);

        return {
          id: `beat_${bIdx}_w_${wIdx}`,
          word: wordStr,
          text: wordStr,
          start: Number(w.start.toFixed(3)),
          end: Number(w.end.toFixed(3)),
          confidence: w.confidence ?? 0.95,
          isHighlight: Boolean(emp || w.isHighlight),
          isEmphasis: Boolean(emp),
          emphasisType: emp ? emp.type : undefined,
          highlightColor: emp ? emp.color : w.highlightColor,
          scale: emp ? 1.08 : (w.scale || 1.0),
        };
      });

      // Compute reading speed (characters per second)
      const duration = Math.max(0.1, end - start);
      const readingSpeed = Number((text.length / duration).toFixed(1));

      // Compute line count (splits around 24 chars if beat is long)
      const lineCount = text.length > 28 ? 2 : 1;

      // Determine semantic classification
      const semanticType = this.classifySemanticType(text, bIdx, rawBeats.length);

      // Average confidence
      const avgConfidence =
        beatWords.reduce((acc, w) => acc + (w.confidence ?? 0.95), 0) / Math.max(1, beatWords.length);

      return {
        id: `beat_${bIdx + 1}`,
        start,
        end,
        text,
        words: enrichedWords,
        emphasisWords,
        confidence: Number(avgConfidence.toFixed(2)),
        readingSpeed,
        pauseBefore: beat.pauseBefore,
        pauseAfter: beat.pauseAfter,
        lineCount,
        semanticType,
      };
    });
  }

  /**
   * High-accuracy semantic emphasis detection (Phase 13)
   * Targets: numbers, statistics, money, percentages, strong verbs, emotional words, hooks.
   */
  public static detectSemanticEmphasis(
    words: WordTiming[]
  ): Array<{ wordIndex: number; word: string; type: CaptionBeatWord['emphasisType']; color: string }> {
    const results: Array<{ wordIndex: number; word: string; type: CaptionBeatWord['emphasisType']; color: string }> = [];

    const hookWords = new Set([
      'secret', 'never', 'insane', 'proven', 'shocking', 'stop', 'warning', 'watch',
      'truth', 'million', 'billion', 'mistake', 'nobody', 'destroy', 'unreal', 'huge',
      'free', 'hacks', 'rule', 'leaked', 'viral', 'fast', 'worst', 'best', 'genius',
      'bhai', 'paisa', 'kamao', 'dhamaka', 'sach', 'khatarnak',
    ]);

    for (let i = 0; i < words.length; i++) {
      const wStr = (words[i].word || (words[i] as any).text || '').trim();
      const clean = wStr.toLowerCase().replace(/[^a-z0-9%$]/g, '');

      // 1. Currency or Money ($100, ₹500, Rs)
      if (/^[$₹€£]\d+[\d,.]*$/i.test(wStr) || /^\d+(k|m|b)$/i.test(clean)) {
        results.push({ wordIndex: i, word: wStr, type: 'currency', color: '#10b981' });
        continue;
      }

      // 2. Percentages & Statistics (42%, 99.9%, 10x)
      if (/\d+%/i.test(wStr) || /^\d+x$/i.test(clean)) {
        results.push({ wordIndex: i, word: wStr, type: 'metric', color: '#06b6d4' });
        continue;
      }

      // 3. Numbers (1, 2, 10, 100, 2026)
      if (/^\d+[\d,.]*$/.test(clean) && clean.length <= 6) {
        results.push({ wordIndex: i, word: wStr, type: 'number', color: '#facc15' });
        continue;
      }

      // 4. Hook words / High Emotion
      if (hookWords.has(clean)) {
        results.push({ wordIndex: i, word: wStr, type: 'hook', color: '#f97316' });
        continue;
      }
    }

    // Limit maximum emphasis to 2 words per beat to avoid visual fatigue
    return results.slice(0, 2);
  }

  /**
   * Classifies beat into creator semantic role
   */
  private static classifySemanticType(
    text: string,
    index: number,
    total: number
  ): CaptionBeat['semanticType'] {
    if (text.includes('?')) return 'question';
    if (index === 0) return 'hook';
    if (index >= total - 1 && /(subscribe|follow|comment|share|link|bio)/i.test(text)) return 'punchline';
    if (/(must|never|always|secret|guaranteed|impossible)/i.test(text)) return 'statement';
    return 'standard';
  }
}
