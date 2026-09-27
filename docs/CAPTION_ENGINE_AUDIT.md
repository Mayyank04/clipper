# VIRAL STUDIO — CAPTION ENGINE & PIPELINE AUDIT REPORT
**Author:** Principal Full-Stack Video Architect & Media Infrastructure Engineer  
**Date:** September 2026  
**Status:** Audit Complete — Phase 1 Architecture Discovery

---

## 1. CURRENT SYSTEM OVERVIEW

Viral Studio currently processes media and renders captions across a hybrid stack:
1. **Frontend Editor Workstation (`src/components/Editor/`):**
   - React 19 + TypeScript + Vite.
   - `VideoCanvas.tsx`: HTML5 `<video>` preview with overlaid absolute positioned caption words.
   - `FloatingCaptionEditor.tsx` & `RightInspector.tsx`: Typography, style picker, positioning controls.
   - `captionEngine.ts`: In-memory word timing math, segment grouping, style presets registry, animation state calculation.
2. **Transcription Pipeline (`src/utils/transcription/` & `backend/app/transcription/`):**
   - `TranscriptionManager.ts`: Multi-provider registry (`LocalWhisperProvider`, `GeminiProvider`).
   - `LocalWhisperProvider.ts`: ONNX Runtime via `@xenova/transformers` running local quantized Whisper (`tiny`, `base`, `small`, `medium`).
   - `backend/app/transcription/whisper_service.py`: Python `faster-whisper` engine with CTranslate2 and native word timestamp extraction.
3. **Rendering & Export Pipeline (`src/utils/videoQuality/` & `backend/app/rendering/`):**
   - `renderAssetPreparer.ts`: Gathers video, audio, B-roll, SFX, and formats `captions.ass`.
   - `subtitleFormatter.ts`: Converts caption segments and word timestamps into ASS (Advanced SubStation Alpha) format.
   - `ffmpegRenderPipeline.ts`: FFmpeg filtergraph scaling to 1080x1920 (9:16 vertical), burning ASS subtitles, mixing SFX, and encoding H.264/AAC.

---

## 2. ROOT CAUSES OF OBSERVED PROBLEMS

### A. Repeated Words ("They They They If")
1. **Decoder Autoregressive Loops in Low Energy / Silence:**
   When Whisper processes audio with low energy, background noise, or silence windows with `chunk_length_s: 30`, the autoregressive attention mechanism gets trapped in repetitive loop tokens (e.g., repeating "They", "They", "They").
2. **Permissive Repetition Filter Threshold in Provider (`LocalWhisperProvider.ts`):**
   Lines 298–304 had `consecutiveRepeatCount >= 3` before discarding words. This allowed Word 1 ("They"), Word 2 ("They"), and Word 3 ("They") to be emitted into the final transcript as legitimate text.
3. **Absence of Silence/VAD Gating before Transcription:**
   Feeding non-speech regions without speech probability filtering causes hallucinated words during background music or silent pauses.

### B. Desynchronized Word Timings & Blinking Captions
1. **ASS Word-Window Gaps (`subtitleFormatter.ts`):**
   In `subtitleFormatter.ts`, dialogue lines were emitted strictly for `[activeW.start, activeW.end]`. Any gap between the end of word $N$ and the start of word $N+1$ resulted in no dialogue line being rendered by `libass`, causing captions to flash off and on between words.
2. **Loss of Visual Hold in Export:**
   During the post-speech visual hold period (0.28s hold threshold and 0.8s punchline hold), the browser preview kept the caption visible with all words inactive, but `subtitleFormatter.ts` generated zero dialogue events after `words[last].end`, causing export/preview divergence.
3. **Double Scaling in Preview vs. Export:**
   `VideoCanvas.tsx` applied a `scale-110` class on active words *on top* of the style transform `scale(1.18 + bounce * 0.08)`, producing an aggressive `~1.38x` jump that caused text collision and word wrapping shifts.

### C. Caption Segmentation Failures
1. **Rigid Word-Count Splitting:**
   `groupWordsIntoCaptionSegments` frequently broke phrases based purely on `wordsPerGroup` (3 or 4 words) regardless of semantic cohesion, breaking noun phrases and splitting numbers from units.
2. **Missing CPS (Characters Per Second) Constraints:**
   Short speech bursts produced captions displayed for less than 300ms, while long slow phrases remained on screen for over 6 seconds without pagination.

### D. Hindi & Hinglish Transcription Degradation
1. **Aggressive Translation to Devanagari:**
   Hinglish conversational speech was often forced into pure Devanagari script, corrupting standard English loanwords (e.g. converting "AI startup" into unintelligible phonetic Devanagari).
2. **Lack of Language Disambiguation:**
   Whisper default language detection confused code-switching (Hinglish) with pure Hindi or English.

---

## 3. BROKEN COMPONENTS

| Component | File Path | Failure Mode |
|---|---|---|
| **Whisper Word Parser** | `src/utils/transcription/providers/LocalWhisperProvider.ts` | Allows 3x consecutive word repetitions; no silence thresholding. |
| **ASS Subtitle Formatter** | `src/utils/subtitleFormatter.ts` | Inter-word timing gaps cause flicker; visual hold gap missing; active word scale too large (`fscx115`-`fscx125`). |
| **Canvas Word Renderer** | `src/components/Editor/VideoCanvas.tsx` | Double scale (`scale-110` + transform `scale(...)`) causes jumpy line shifts; no hold bridge. |
| **Caption Segmenter** | `src/utils/captionEngine.ts` | Splits proper nouns, contractions, and compound terms; ignores minimum display duration (0.6s). |
| **Preset System** | `src/utils/captionEngine.ts` | Only 40 presets with repetitive styling; missing dedicated 60-preset creator taxonomy. |

---

## 4. WORKING COMPONENTS

| Component | File Path | Strengths |
|---|---|---|
| **Audio Extraction** | `LocalWhisperProvider.ts` / `whisper_service.py` | 16kHz mono 16-bit PCM conversion with FFmpeg is stable and high-fidelity. |
| **Native Word Timestamps** | `faster-whisper` & `transformers.js` | Emits genuine word-level start/end timings when not perturbed by autoregressive loops. |
| **Font Registry** | `public/assets/fonts/` & `fonts.css` | 24 creator font families with 39 physical font files on disk. |
| **Zero Watermark Architecture** | `server.ts` & `ffmpegRenderPipeline.ts` | Filtergraph strictly guards against unauthorized watermarks. |
| **Forensic Validation** | `backend/app/rendering/validator.py` | FFprobe validation of duration, 1080x1920 canvas, H.264/AAC codecs. |
| **Storage & Persistence** | `StorageProvider.ts` & `PostgresDatabase.ts` | Decoupled S3/R2 and PostgreSQL with disk fallback. |

---

## 5. RECOMMENDED ARCHITECTURE

```
                               SOURCE MEDIA (Video / Audio)
                                             │
                                             ▼
                                  FFprobe Audio Stream Analysis
                                             │
                                             ▼
                                 FFmpeg 16kHz Mono PCM Extraction
                                             │
                                             ▼
                                 Audio Normalization (-16 LUFS)
                                             │
                                             ▼
                           Contextual Speech Chunking (5s - 30s)
                           (Zero over-segmentation; no tiny chunks)
                                             │
                                             ▼
                                  TranscriptionProvider
                         ┌───────────────────┴───────────────────┐
                         ▼                                       ▼
                  MLX Whisper (Mac)                    faster-whisper (GPU/CPU)
                         └───────────────────┬───────────────────┘
                                             │
                                  Native Word Timestamps
                               { text, start, end, confidence }
                                             │
                                             ▼
                                   CaptionQualityAnalyzer
                            - Repetition Loop Suppressor
                            - Silence / Music Hallucination Filter
                            - Punctuation Restoration
                            - Hinglish Script Preservation
                                             │
                                             ▼
                                CaptionSegmentationEngine
                            - 2 to 5 words target beat
                            - Min duration: 0.6s | Max duration: 3.5s
                            - Target CPS: 12-18 | Hard max: 22
                            - Semantic boundary preservation
                            - Frame-safe boundary snapping (FPS)
                                             │
                                             ▼
                                 Visual Hold & Bridging
                            - holdThreshold: 0.28s
                            - punchlineHold: 0.80s
                            - Continuous inter-word dialogue events
                                             │
                                             ▼
                                60 Professional Presets
                            - VIRAL, PODCAST, CINEMATIC, GAMING,
                              EDUCATION, MOTIVATIONAL, MEME, INDIAN
                                             │
                                             ▼
                                   Canonical RenderPlan
                         ┌───────────────────┴───────────────────┐
                         ▼                                       ▼
                 Browser Preview                         FFmpeg ASS Export
             (Subtle 1.04-1.08x scale)               (Subtle 1.04-1.08x scale)
```

---

## 6. CHANGES REQUIRED

1. **Implement `CaptionQualityAnalyzer`:**
   - Detect and collapse hallucinated token loops (e.g. collapsing "They They They" -> "They" while preserving legitimate dramatic repetitions).
   - Gate out text emitted during periods of silence or high background music energy.
2. **Upgrade `LocalWhisperProvider` and `whisper_service.py`:**
   - Add VAD speech clustering (5–30s contextual windows) rather than feeding dozens of 1–3s audio fragments.
   - Enforce immediate consecutive repeat suppression.
   - Add user domain vocabulary injection.
3. **Build `CaptionSegmentationEngine`:**
   - Implement minimum display duration (0.6s), maximum display duration (3.5s), CPS bounds (12–22).
   - Snap boundaries to source video FPS.
   - Guarantee continuous visual coverage without blinking between words.
4. **Synchronize Preview & ASS Subtitles:**
   - Update `subtitleFormatter.ts` to bridge inter-word gaps within the same beat and render the visual hold phase.
   - Standardize active word scale to `1.04x–1.08x` across both CSS and ASS `\fscx106\fscy106`.
5. **Expand Preset System to 60+ Creator Presets:**
   - Implement the complete 60-preset taxonomy across all 8 creator categories.
   - Wire live animated preview cards into the editor UI.
6. **Create Comprehensive Automated Certification Tests:**
   - `scripts/test_caption_quality.py`
   - `scripts/test_caption_presets.py`
   - `scripts/test_caption_export.py`
   - `scripts/test_hindi_hinglish.py`
   - `scripts/test_word_alignment.py`
   - Final report in `docs/CAPTION_ENGINE_CERTIFICATION.md`.
