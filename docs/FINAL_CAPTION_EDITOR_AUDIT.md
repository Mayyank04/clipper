# VIRALCLIP STUDIO — FORENSIC AUDIT REPORT
**Target Standard:** Professional Browser-Based Short-Form Video & Auto-Caption Editor (Clucap & CapCut Quality Parity)  
**Document:** `docs/FINAL_CAPTION_EDITOR_AUDIT.md`  
**Date:** September 2026  
**Auditor:** Lead Video-Editor Architect, Caption-Engine Specialist & Performance Engineer  

---

## EXECUTIVE SUMMARY

ViralClip Studio contains strong foundational infrastructure: local Whisper speech-to-text inference with faster-whisper and ONNX Runtime, native FFmpeg/FFprobe media engines, automated unit test suites, and 60 initial caption presets.

However, forensic inspection of the browser application and execution flows reveals critical discrepancies between passing automated test scripts and the actual user experience in the browser. In automated tests, pure functions were evaluated with synthetic payloads; in the browser, decoupled state synchronization, missing prop drilling to the export modal, layout reflow during word scaling, proportional duration re-splitting upon text editing, and missing preset visual parameters resulted in degraded user experience.

This audit details the exact findings across the 14 mandatory audit areas.

---

## 1. WHAT CURRENTLY WORKS

1. **Local Audio Extraction & Whisper ASR Pipeline:**
   - FFmpeg converts arbitrary video/audio into clean 16kHz mono 16-bit PCM WAV.
   - `LocalWhisperProvider` runs locally on CPU/Metal without requiring cloud API keys.
   - Faster-Whisper backend on port 8000 provides high-speed native Python inference.
2. **Decoder Repetition Loop Cleansing ("They They They If"):**
   - `CaptionQualityAnalyzer.ts` and `quality_analyzer.py` successfully detect and purge autoregressive hallucination loops ("They They They If" -> "They If") while preserving genuine human hesitation ("no, no, no").
   - Non-speech noise tokens (`[music]`, `♪`, `[applause]`, `[blank_audio]`) are filtered out.
3. **Monotonic Timestamp Enforcement:**
   - Timestamps are strictly clamped to positive, non-decreasing boundaries conforming to audio stream duration.
4. **Basic FFmpeg 1080x1920 Export Pipeline:**
   - FFmpeg encodes clean vertical videos with `-c:v libx264 -pix_fmt yuv420p -c:a aac -ar 48000`.
   - Companion `.srt`, `.vtt`, `.ass`, `.txt`, and `.json` subtitle files are generated.
5. **Timeline Multi-Track Visualization:**
   - Multi-track display supports Video clips with strip frames, Audio waveform, Caption blocks, Word blocks, B-roll, SFX, and VFX markers.
   - Playhead scrubbing and magnetic snapping function smoothly.
6. **Hardware Acceleration Detection:**
   - Detects CPU cores, Apple Silicon Metal (MPS), CUDA, and host RAM to configure optimal thread pools.

---

## 2. WHAT ONLY WORKS IN AUTOMATED TESTS

1. **Preset Visual Diversity in Video Export:**
   - `scripts/test_caption_export.py` tests ASS generation by injecting an explicit style definition directly into the generator.
   - In the real browser app, when a user selects a preset in `LeftToolPanel` or `TypographyInspector`, `App.tsx` did not forward `captionConfig` to `ExportModal` (`<ExportModal short={exportingShort} ... />`), causing exports to fall back to `DEFAULT_CAPTION_CONFIG` (Lemon Milk bold yellow).
2. **Font Parity in FFmpeg Python Worker:**
   - `scripts/test_caption_presets.py` validates preset schema in memory.
   - When exporting via `backend/app/rendering/ffmpeg_engine.py`, the FFmpeg subtitles filter was invoked as `subtitles='{ass_path}'` without `:fontsdir=`, meaning custom creator fonts (`Coolvetica`, `American Captain`, `Lemon Milk`) were not loaded by FFmpeg unless already installed in system font libraries.
3. **Continuous Word Karaoke Parity:**
   - Unit tests verified that ASS output has gap-free dialogue events. However, in `VideoCanvas.tsx`, live web rendering relied on standard CSS transitions without transform-origin pinning, leading to visual differences between canvas preview and burned ASS subtitles.

---

## 3. WHAT DOES NOT WORK IN THE BROWSER

1. **Preset Changes Do Not Reflect in Export:**
   - Selecting a preset (e.g., *Alex Minimal*, *Neon Gaming*, *Cinematic Subtitle*) updates the canvas preview, but clicking "Export" rendered the default yellow preset because `captionConfig` was not tied to `exportingShort`.
2. **Keyboard Shortcut Collisions:**
   - `VideoEditor.tsx` registered two separate `keydown` listeners (lines 362 and 1360), and `Timeline.tsx` registered a third. Pressing `Space` or `KeyS` occasionally triggered double actions or lost focus.
3. **Text Editing Overwriting Word Timestamps with Equal Slices:**
   - When a user edited text in `FloatingCaptionEditor.tsx` (lines 100-108), the editor calculated `capDuration / tokens.length` and divided duration equally across words. This wiped out Whisper's acoustic word timestamps and violated the zero-proportional-splitting rule.
4. **Brand Kit "Apply" Incomplete:**
   - The Brand Kit modal provided basic watermark toggles, but lacked brand font selection, stroke, highlight color, and a dedicated "Apply Brand Kit" action that updates the Canonical RenderPlan.

---

## 4. CAPTION TIMING PROBLEMS

1. **Proportional Duration Splitting in Inline Editing:**
   - Found in `FloatingCaptionEditor.tsx`: modifying a single misspelled word redistributed the whole caption beat into equal time slices.
2. **Micro-Pause Blinking:**
   - Whisper word chunks frequently have 80–200ms pauses between adjacent words. In un-bridged playback, the active highlight flickered off during pauses.
3. **Boundary Hold Inconsistency:**
   - Without an intelligent post-speech hold (150–350ms), captions flashed off immediately as the speaker finished the last syllable, causing jarring visual cuts before the next phrase.

---

## 5. CAPTION SEGMENTATION PROBLEMS

1. **Fixed 4-Word Arbitrary Chunking:**
   - `LocalWhisperProvider.ts` hardcoded `wordsPerGroup: 4` and `maxDuration: 2.8s`, ignoring natural cadence, sentence boundaries, and phrase semantics.
2. **Lack of Segmentation Modes:**
   - Creators require `WORD` (1 word pop), `LINE` (natural phrase), `BEAT` (2–4 punchy words), `BLOCK` (classic subtitle block), and `AUTO` (adaptive). Currently only an ad-hoc grouping was available.
3. **Awkward Grammatical Splitting:**
   - Number and unit pairs (e.g. "$50" and "million", "42" and "%") or title names were occasionally split across separate visual beats.

---

## 6. CAPTION VISUAL-QUALITY PROBLEMS

1. **Active Word Layout Jitter (Horizontal Text Shift):**
   - In `VideoCanvas.tsx` (line 792), active words switched CSS class from `font-bold` (700) to `font-black` (900). Because character metrics differ between weights, surrounding words shifted horizontally by 3–8 pixels every time a word became active.
2. **Scale Overshoot:**
   - Uncontrolled scale factors ($> 1.25\times$) caused word boxes to clip or jump erratically.
3. **Shadow and Stroke Inconsistencies:**
   - Drop shadow in canvas used `drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]` while ASS export used integer pixel offsets without blur rendering.

---

## 7. PRESET PROBLEMS

1. **Insufficient Preset Count & Shallow Diversity:**
   - Only 60 presets existed, concentrated mainly in 8 categories, whereas 80+ presets across 15 creator categories (Viral, Creator, Podcast, Cinematic, Gaming, Education, Motivational, Meme, News, Business, Luxury, Indian, Hindi, Hinglish, Minimal) are required.
2. **Static Cards Lacking Live Preview:**
   - Preset cards displayed basic static text or a generic pulse rather than an animated hover preview showing the exact kinetic behavior of the preset.
3. **Missing Custom Presets & Persistence:**
   - Users could not create, save, favorite, or export/import custom caption styles ("My Presets").

---

## 8. TIMELINE PROBLEMS

1. **Double Playhead Handlers:**
   - Both mouse and touch listeners on the timeline scrubber competed with canvas playhead scrubbing, causing occasional playhead jump to position 0.
2. **Word-Level Timeline Granularity:**
   - Word blocks in the timeline were not synchronized with keyboard navigation (ArrowLeft / ArrowRight to jump exact word).
3. **Undo/Redo Tracking on Drag Boundaries:**
   - Dragging a caption boundary updated local component state, but did not consistently push a history snapshot to the undo/redo stack.

---

## 9. PREVIEW / EXPORT MISMATCH

1. **Caption Style Disconnect:**
   - Canvas preview consumed `captionConfig` state from `VideoEditor.tsx`.
   - `ExportModal.tsx` consumed `short` without `captionConfig` passed from `App.tsx`, defaulting to `DEFAULT_CAPTION_CONFIG`. The exported MP4 therefore did not match the user's styling.
2. **Font Rendering Differences:**
   - Canvas preview used browser CSS `@font-face` from `/assets/fonts/`.
   - FFmpeg export in `backend/app/rendering/ffmpeg_engine.py` lacked `:fontsdir=`, falling back to standard system fonts.
3. **Vertical Safe Zones:**
   - Captions placed near bottom ($> 80\%$) looked fine in an unconstrained canvas, but in TikTok/Reels, they collided with the platform title, description, and audio disc UI.

---

## 10. PERFORMANCE PROBLEMS

1. **Unnecessary Canvas Re-renders on Playback:**
   - `currentTime` updates fired every `requestAnimationFrame` or `timeupdate` event (up to 60fps), triggering top-level re-evaluation of `VideoCanvas` children rather than isolating caption ticker state.
2. **Synchronous Thumbnail Extraction:**
   - Video thumbnail frame extraction on the timeline ran in the main thread during video load, causing frame drops on longer clips ($> 60\text{s}$).
3. **Lack of Transcription Result Memoization:**
   - Re-opening or tweaking styling caused re-checks of transcription health rather than caching provider transcripts.

---

## 11. STATE-MANAGEMENT PROBLEMS

1. **Split State Architecture:**
   - `currentShort` held project and candidate state, while `captionConfig` was managed in a separate `useState`. Changes to typography did not write back to `currentShort.captionCustomization`.
2. **Three Duplicate Keydown Listeners:**
   - Event listeners in `VideoEditor.tsx` (x2) and `Timeline.tsx` (x1) created duplicate execution risks for Space, S, and Delete keys.
3. **Autosave Race Conditions:**
   - Rapid typography slider dragging triggered immediate autosave requests without proper debouncing (300–500ms).

---

## 12. FAKE / DEMO / PLACEHOLDER FUNCTIONALITY IDENTIFIED

1. **Proportional Timestamp Splitting in FloatingCaptionEditor:**
   - Dividing caption duration equally by token length when text was edited.
2. **Hardcoded B-Roll Suggestions:**
   - Fallback B-roll suggestions occasionally defaulted to static placeholder keyword lists instead of analyzing spoken transcript semantics.
3. **Heuristic Viral Score Presentation:**
   - Viral score displayed percentages that were heuristic rule-based calculations without clearly disclosing the breakdown logic.

---

## 13. BUTTONS THAT APPEAR FUNCTIONAL BUT DO NOTHING OR INCOMPLETE

1. **"Apply Brand Kit" in BrandKitModal:**
   - Modal only updated local brand kit state; it did not apply brand fonts, highlight colors, or caption positions directly to the current Short's RenderPlan.
2. **AI Polish Suggestions in LeftToolPanel:**
   - Modal appeared and calculated score, but clicking "Apply Polish" applied only partial timing tweaks without updating word emphasis styling.
3. **Audio-to-Video Visual Style Auto-Apply:**
   - Inspector controls updated canvas visualizer, but did not burn visualizer spectrum into video exports when video tracks were present.

---

## 14. SETTINGS THAT UPDATE STATE BUT DON'T AFFECT RENDERING/EXPORT

1. **Typography Inspector Letter Spacing & Line Height:**
   - Updated React canvas state, but ASS subtitle generator (`subtitleFormatter.ts`) omitted ASS tag `\fsp` (font spacing) and `\line` controls.
2. **Glow Bloom Color:**
   - Glow state was toggled in React, but ASS v4+ subtitles do not natively render CSS box/text glow without secondary blur layers.
3. **Custom Caption Preset Selection:**
   - Preset selection updated `captionConfig.preset`, but because `captionConfig` was dropped before `ExportModal`, export rendered the default preset.

---

## AUDIT CONCLUSION & IMPLEMENTATION ROADMAP

ViralClip Studio will be elevated to professional standard through the following sequential phases:
- **Phase 1–3:** Implement `CaptionComposer` with `CaptionBeat[]` schema, zero synthetic timestamps, multi-mode segmentation (`WORD`, `LINE`, `BEAT`, `BLOCK`, `AUTO`), repetition intelligence, and user-adjustable segmentation parameters.
- **Phase 4–6:** Expand to 80+ distinct presets across 15 categories with live animated hover previews, instant single-click application, and persistent custom preset library.
- **Phase 7–9:** Build deterministic `CaptionAnimationEngine` with zero text-reflow jitter, true karaoke gap bridging, and TikTok/Reels/Shorts safe-zone enforcement.
- **Phase 10–15:** Unify Typography Inspector state -> RenderPlan -> Export sync, word-level editing with shortcut preservation, auto-timing before/after previews, AI emphasis (Auto/Manual/Off), and multi-language/translation modes.
- **Phase 16–28:** Parity across all timeline tracks, canonical RenderPlan single-source-of-truth, heuristic viral score transparency, and clean export cancellation.
- **Phase 29–40:** Real browser subagent verification, visual regression testing, and final certification documentation.
