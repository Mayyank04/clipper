# ViralClip Studio — AI Edit Engine Comprehensive Audit

**Date:** September 28, 2026  
**Auditor:** Lead Systems Architect & Senior Video Processing Engineer  
**Document Status:** Production Forensic Baseline

---

## 1. Current Architecture Overview

ViralClip Studio is structured as a client-server web application with high-performance local media processing capabilities:

```
               [ React 18 + Vite Frontend ]
              (Port 3001 - Client / Editor UI)
                            │
               REST APIs / JSON / WebSocket / Polling
                            ▼
           [ Node.js + Express Server (server.ts) ]
         (In-process job queue, disk journal storage)
                            │
          ┌─────────────────┴─────────────────┐
          ▼                                   ▼
 [ Python AI Engine / Workers ]     [ Native Media Binaries ]
 • mlx-whisper (Metal GPU)          • ffmpeg 7.x
 • faster-whisper (CTranslate2)     • ffprobe 7.x
 • EBU R128 & spectral analysis     • yt-dlp 2025.x
 • Multilingual NLP & VAD           • ASS Subtitle Filter
```

### Core Subsystems:
1. **Frontend (`src/`):** React 18, TypeScript, TailwindCSS, Lucide icons.
   - **Editor (`src/components/Editor/`):** 3-column layout (`LeftToolPanel`, `VideoCanvas`, `RightInspector`), multi-track `Timeline`, `TypographyInspector`, `TranscriptEditor`.
   - **Modal Layer:** `ProcessingModal`, `ExportModal`, `BrandKitModal`, `NewShortModal`.
2. **Server (`server.ts`):** Express backend managing media storage, YouTube ingestion (`yt-dlp`), local media probing (`ffprobe`), transcription coordination, and asynchronous render jobs.
3. **Python AI Media Engine (`python_engine/`):**
   - Metal GPU accelerated Whisper transcription (`mlx-whisper` and `faster-whisper`).
   - Monotonic word-timestamp extractor and repetition loop suppressor.
   - Multilingual script classifier (`language_detector.py`).
   - 9:16 Lanczos video crop & composite renderer (`compositor.py`).
4. **Rendering Pipeline:**
   - Client: HTML5 Video Canvas with requestAnimationFrame animation loop.
   - Server: FFmpeg single-stage Lanczos filter chain with ASS subtitle burning, B-roll cutaway mixing, SFX audio ducking, and VFX filter primitives.

---

## 2. Existing Working Features

- **Local Metal GPU Whisper ASR:** Apple Silicon GPU acceleration (`Device(gpu, 0)`) via `mlx-whisper`, achieving ~15.3x realtime processing speed on M-series chips with zero stall/freeze.
- **Multilingual Transcription Matrix:** Full native classification and timestamp alignment for 23 languages (English, Hindi, Hinglish in Latin script, Bengali, Assamese, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi, Urdu, etc.).
- **Repetition Loop Suppression:** Prevents autoregressive decoder loop corruption ("They They They") while preserving human pause cadence (`pause > 0.6s`).
- **109 Typographic Caption Presets:** Across 20 creator categories (`VIRAL`, `PODCAST`, `CINEMATIC`, `GAMING`, `EDUCATION`, `MOTIVATIONAL`, `MEME`, `INDIAN`, `HINDI`, `HINGLISH`, `MINIMAL`, `LUXURY`, `NEWS`, `STORYTELLING`, `BUSINESS`, `FITNESS`, `FINANCE`, `TECH`, `VLOG`, `DRAMATIC`).
- **Live Animated Preview Loop:** Preset cards run the real-time canvas animation loop on `"THIS IS THE WORD"` with bounded active word scaling (1.08x).
- **Multi-Track Interactive Timeline:** Video track with extracted frame thumbnails, audio waveform peaks, caption block track, precision word-level track, B-roll overlays, SFX cues, and VFX zoom markers.
- **1080x1920 MP4 Export:** High-quality H.264/AAC 48kHz export with Lanczos scaling, faststart flags, and strict zero-watermark output.
- **Project Persistence & Job Status:** Disk journaling with automatic crash recovery, cancel endpoints, and real-time audio progress streaming.

---

## 3. Existing Broken / Incomplete Features

1. **Sequential / Linear Fallback Clipping:** When Gemini API keys are omitted, `server.ts` (lines 1712–1748) blindly partitions source media into arbitrary 20-second slices starting at timestamp 0.00s instead of evaluating the entire video for genuine viral hooks.
2. **SFX Library Depth:** The UI previously presented only a small subset of sound effects (6–8 buttons) rather than a complete 100+ categorized SFX registry.
3. **Automated SFX Placement (Auto SFX):** Missing automated acoustic and transcript-driven decision engine that analyzes emotional peaks, questions, dramatic numbers, and scene transitions to place SFX markers with explicit reasons.
4. **VFX Library Depth:** Limited to 9 basic types (`zoom_punch`, `shake`, `glow`, `motion_blur`, `particles`, `callout`, `progress_bar`, `emoji`, `glitch`) instead of the required 60+ categorized visual effects.
5. **Automated VFX Intelligence (Auto VFX):** Lacks contextual auto-placement matching strong statements, hook transitions, and active speaker emphasis.
6. **AI B-Roll Source Footage Extraction:** Currently searches local library assets or stock providers, but does not extract contextual B-roll cutaways from the user's *own* source footage using visual scene similarity.
7. **Unified Master Auto Edit Flow:** No single-click "Auto Edit" master action in AI Tools coordinating Hook Detection, Smart Clipping, Caption Styling, Auto SFX, Auto VFX, and Auto B-roll.

---

## 4. Duplicate / Redundant Implementations

- **RenderPlan Builders:** `buildCanonicalRenderPlan` in `src/utils/brollRankingEngine.ts` vs. `buildExportRenderPlan` in `server.ts`. Both construct render plans with minor schema divergences (e.g. `source.url` vs `sourceMedia.sourcePath`).
- **Caption Pacing Utilities:** Word alignment exists both in `src/utils/captionEngine.ts` (`alignWordsInSegment`) and in `python_engine/transcription/caption_segmenter.py`.
- **SFX Catalogs:** `BUILTIN_SFX_CATALOG` in `src/utils/sfxCatalog.ts` vs procedural sound synthesizer in `src/utils/sfxGenerationProvider.ts`.
- **FFmpeg Render Pipelines:** `src/utils/videoQuality/ffmpegRenderPipeline.ts` (Node spawn) vs `python_engine/video/compositor.py` (Python subprocess) vs `backend/app/rendering/ffmpeg_engine.py`.

---

## 5. Current Data Structures

### 5.1 Current RenderPlan (`src/types.ts`)
```typescript
export interface RenderPlan {
  projectId: string;
  shortId: string;
  duration: number;
  source?: {
    mediaId?: string;
    url: string;
    originalFilename?: string;
    mimeType?: string;
  };
  clips?: Array<{ id: string; startTime: number; endTime: number; label?: string }>;
  brollEvents: BrollEvent[];
  captions: CaptionSegment[];
  sfxMarkers: SFXMarker[];
  vfxMarkers?: VFXMarker[];
  styles?: CaptionCustomization | Record<string, any>;
  animations?: { type?: string; preset?: string; mode?: string };
  dynamicZooms?: Array<{ startTime: number; endTime: number; peakScale: number }>;
  canvas?: { width: number; height: number; aspectRatio: string };
  exportSettings?: {
    resolution: string;
    frameRate: number;
    qualityMode: 'FAST' | 'BALANCED' | 'HIGH' | 'MASTER';
    format: 'mp4' | 'mov' | 'webm';
  };
  brandKit?: BrandKit;
  audioTrack: {
    originalVolume: number;
    brollDuckingDb: number;
    voiceoverVolume?: number;
  };
}
```

### 5.2 Current Caption Data Structure (`src/types.ts`)
```typescript
export interface CaptionSegment {
  id: string;
  text: string;
  start: number; // in seconds relative to short clip start
  end: number;
  speaker?: string;
  words: WordTiming[]; // { word, text, start, end, confidence, isHighlight }
  language?: string;
  styleId?: string;
  displayStart?: number;
  displayEnd?: number;
  emphasisWords?: string[];
  confidence?: number;
  readingSpeed?: number;
  pauseBefore?: number;
  pauseAfter?: number;
  semanticType?: 'hook' | 'statement' | 'question' | 'punchline' | 'standard';
}
```

### 5.3 Current SFX Data Structure (`src/types.ts`)
```typescript
export interface SFXMarker {
  id: string;
  timestamp: number; // relative to short clip start
  duration?: number;
  category: SFXCategory;
  soundName: string;
  volume: number; // 0 to 1
  reason?: string;
  triggerText?: string;
  confidence?: number;
  audioUrl?: string;
  assetId?: string;
  source?: 'library' | 'ai_generated' | 'user_imported';
  fadeIn?: number;
  fadeOut?: number;
  duckingDb?: number;
}
```

### 5.4 Current VFX Data Structure (`src/types.ts`)
```typescript
export interface VFXMarker {
  id: string;
  timestamp: number; // relative to short clip start
  duration: number; // in seconds
  type: VFXType;
  label?: string;
  intensity?: number; // 1 to 10
  reason?: string;
  confidence?: number;
}
```

### 5.5 Current B-Roll Data Structure (`src/types.ts`)
```typescript
export interface BRollSuggestion {
  id: string;
  timestamp: number;
  duration: number;
  concept: string;
  imageUrl: string;
  videoUrl?: string;
  keyword?: string;
  enabled: boolean;
  reason?: string;
  triggerText?: string;
  confidence?: number;
  source?: 'pexels' | 'pinterest' | 'uploaded' | 'source_footage';
  crop?: CropPlan;
  audioVolume?: number;
}
```

### 5.6 Current Project & Short Data Structure (`src/types.ts`)
```typescript
export interface ShortCandidate {
  id: string;
  projectId?: string;
  title: string;
  description: string;
  hashtags: string[];
  keywords: string[];
  viralScore: ViralScore; // overall (0-100) + breakdown (hook, retention, emotion, etc.)
  duration: number;
  startTime: number; // in original source video
  endTime: number;
  topic: string;
  thumbnail: string;
  hookText: string;
  hookCategory: HookCategory;
  captions: CaptionSegment[];
  sfxMarkers: SFXMarker[];
  vfxMarkers: VFXMarker[];
  brollSuggestions: BRollSuggestion[];
  renderPlan?: RenderPlan;
  captionCustomization?: CaptionCustomization;
  speechCoverage?: number;
}
```

---

## 6. Current Export Pipeline

```
Short Selection / RenderPlan
           │
           ▼
POST /api/export or POST /api/projects/:id/export
           │
           ▼
renderWorker.createJob() / python_engine compositor
           │
           ├─ 1. Resolve source video (local disk path)
           ├─ 2. Probe source dimensions, rotation, SAR/DAR via ffprobe
           ├─ 3. Generate ASS subtitles with kinetic highlight and scale tags
           ├─ 4. Build FFmpeg filtergraph:
           │     • Smart crop / Lanczos scaling to 1080x1920
           │     • VFX filter chain (zoom punch, shake, glow, flash)
           │     • B-roll cutaway overlay layers
           │     • ASS subtitle filter burning
           ├─ 5. Audio filtergraph:
           │     • Volume normalization
           │     • SFX cues mixing with adelay and amix
           │     • Background ducking during speech
           └─ 6. H.264 encode (CRF 16-18, yuv420p, 48kHz AAC, faststart)
```

---

## 7. Where Python Can Be Introduced Safely

Python can be integrated without disturbing existing UI components or blocking Node.js:
1. **Acoustic & Hook Analysis:** Signal energy analysis (RMS, spectral flux, speech rate, pause density) to calculate true Hook Scores across the whole video.
2. **Intelligent Scene & Motion Analysis:** Detecting visual scene cuts, camera motion, and activity peaks without heavy cloud APIs.
3. **Procedural SFX Engine:** Synthesizing realistic sound effects directly into 44.1kHz/48kHz WAV audio files.
4. **Auto-Edit Decision Engine (`AutoEditDecisionEngine`):** Correlating transcript tokens, sentiment, audio peaks, and scene changes into a unified list of edits with explainable `reason` and `confidence` annotations.

---

## 8. Exact Implementation Plan

### Step 1: SFX Library (100+ Categorized Sound Effects)
- Create `src/data/sfxLibrary.ts` with 100+ sound definitions across all 37 categories.
- Implement procedural audio generation in `python_engine/audio/sfx_generator.py` and `src/utils/sfxAudio.ts` so every sound effect produces real audio offline without external dependencies.
- Update `LeftToolPanel.tsx` SFX panel with Category filters, Search, Favorites, Recent, and "AI Recommended" badges.

### Step 2: VFX Engine (60+ Professional Effects)
- Expand `VFXType` and create `src/data/vfxLibrary.ts` with 60+ categorized visual effects.
- Implement full preview rendering in `VideoCanvas.tsx` and matching FFmpeg filter directives in `python_engine/effects/vfx_engine.py` and `ffmpegRenderPipeline.ts`.
- Update `LeftToolPanel.tsx` VFX tab with Categories, Intensity sliders, and "AI Recommended" badges.

### Step 3: Real AI Hook Finder & Candidate Scoring
- Replace the sequential linear chunking in `server.ts` with a multi-signal Hook Scoring algorithm:
  $$\text{HookScore} = \text{Semantic} + \text{Curiosity} + \text{Emotional} + \text{SpeechEnergy} + \text{VisualActivity} - \text{Silence} - \text{Filler} - \text{Repetition}$$
- Scan the **entire** video timeline to return top-scoring non-first hooks with timestamps, score breakdowns, and human-readable reasons.

### Step 4: Intelligent Auto-SFX & Auto-VFX Decision Engine
- Create `src/utils/autoEditEngine.ts` and `python_engine/editing/decision_engine.py`.
- Rules-based placement:
  - Strong statements / revelation hooks $\rightarrow$ Impact + subtle zoom punch.
  - Scene changes / topic transitions $\rightarrow$ Whoosh + whip pan / directional blur.
  - Important numbers / currency $\rightarrow$ Pop / Notification chime + micro zoom + caption highlight.
  - Questions / open loops $\rightarrow$ Tension riser + slow push zoom.
  - Punchlines / reactions $\rightarrow$ Hit + camera shake.
- Attach `reason` and `confidence` to every marker for UI transparency.

### Step 5: Source Footage B-Roll Extraction
- Implement cutaway candidate identification from the original footage for visual context when no external stock footage is present.
- Wire auto B-roll suggestions into the Timeline track.

### Step 6: Master One-Click "AUTO EDIT" Workflow
- Add the master "AUTO EDIT" button and granular toggle controls in the AI TOOLS tab (`AUTO EDIT`, `AUTO CAPTIONS`, `AUTO B-ROLL`, `AUTO SFX`, `AUTO VFX`, `AUTO HOOK`, `AUTO REFRAME`, `AUTO AUDIO`).
- Support Edit Intensity presets: `Minimal`, `Balanced`, `Viral`, `Maximum`.

### Step 7: Parity Verification & Testing
- Ensure every generated effect updates the canonical `RenderPlan` and renders identically in `VideoCanvas` preview and FFmpeg export.
- Run complete test suites (`test_caption_quality.py`, `test_caption_presets.py`, `test_word_alignment.py`, `test_hindi_hinglish.py`, `test_broll.py`, `test_vfx.py`, `test_export.py`, `test_multilingual.py`, and new `test_ai_edit_engine.py`).
- Validate with real media files.
