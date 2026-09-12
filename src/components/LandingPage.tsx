import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  ArrowRight,
  Layers,
  Scissors,
  Wand2,
  Volume2,
  Flame,
  Check,
  HelpCircle,
  Video,
  ChevronDown,
  Eye,
  Sliders,
  TrendingUp,
  Zap,
  Film,
  Upload,
  Music,
  Headphones
} from 'lucide-react';
import { SAMPLE_PROJECTS } from '../data/sampleProjects';
import { VideoProject } from '../types';

interface LandingPageProps {
  onStartAnalysis: (url: string) => void;
  onSelectProject: (proj: VideoProject) => void;
  onStartDemo?: () => void;
  onImportVideoFile?: (file: File) => void;
  onImportAudioFile?: (file: File) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartAnalysis,
  onSelectProject,
  onStartDemo,
  onImportVideoFile,
  onImportAudioFile,
}) => {
  const [creationMode, setCreationMode] = useState<'video' | 'audio'>('video');
  const [urlInput, setUrlInput] = useState<string>('');
  const [urlError, setUrlError] = useState<string>('');
  const [sliderPos, setSliderPos] = useState<number>(50); // 0 to 100 for before/after
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (creationMode === 'audio' || file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(file.name)) {
      if (onImportAudioFile) {
        onImportAudioFile(file);
      }
    } else if (onImportVideoFile) {
      onImportVideoFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportVideoFile) {
      onImportVideoFile(file);
    }
  };

  const handleAudioFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportAudioFile) {
      onImportAudioFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setUrlError('Please paste a valid YouTube video link');
      return;
    }
    // Basic YouTube regex validation
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!ytRegex.test(trimmed)) {
      setUrlError('Please enter a valid YouTube URL (e.g., https://youtube.com/watch?v=...)');
      return;
    }
    setUrlError('');
    onStartAnalysis(trimmed);
  };

  const handleQuickPick = (sample: VideoProject) => {
    setUrlInput(sample.youtubeUrl);
    setUrlError('');
    onSelectProject(sample);
  };

  const faqs = [
    {
      q: 'How does the AI detect which moments will go viral?',
      a: 'Our AI model analyzes the complete audio transcript for emotional spikes, strong opening hook statements, humor, curiosity loops, and high-energy value delivery. It scores every potential segment out of 100 on hook strength, retention, pacing, and clarity.'
    },
    {
      q: 'Does it automatically keep the speaker centered in 9:16 vertical?',
      a: 'Yes! Smart Reframing uses intelligent facial and subject tracking to dynamically frame the active speaker. If two speakers are in frame (like a podcast), it smoothly cuts or pans between them without awkward cropping.'
    },
    {
      q: 'Can I customize the caption fonts, animations, and highlight colors?',
      a: 'Absolutely. Choose between 7 pre-engineered viral styles (Viral Bold, Minimal, Podcast, Dynamic Kinetic, Cinematic Gold, Gaming, and Corporate Crisp) or fine-tune font sizes, Y-position, stroke thickness, and keyword colors in the studio editor.'
    },
    {
      q: 'Are sound effects and visual zooms placed automatically?',
      a: 'Yes. The SFX engine detects transition moments, punchlines, and high-impact phrases to insert tasteful whooshes, pops, and cinematic hits. The AI follows the strict rule: "Enhance attention, never destroy the content."'
    },
    {
      q: 'What resolution and aspect ratios can I export?',
      a: 'You can export in 1080x1920 (standard Full HD vertical) or 2160x3840 (4K Ultra), with 30 or 60 FPS options. We also support 1:1 square for LinkedIn/Instagram feed and 16:9 widescreen.'
    }
  ];

  return (
    <div className="w-full min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* HERO SECTION */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/10 blur-[130px] rounded-full pointer-events-none" />

        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 mb-8 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Next-Gen AI Video Repurposing &bull; Powered by Gemini AI</span>
        </div>

        {/* Main Headline */}
        <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
          Turn Long Videos Into{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200">
            Viral Shorts
          </span>{' '}
          Automatically.
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
          Import your video file or paste a YouTube link. Our AI finds the high-retention moments, reframes into 9:16 vertical,
          animates kinetic captions, adds intelligent SFX, and delivers social-media-ready Shorts in seconds.
        </p>

        {/* CREATION MODE TOGGLE: VIDEO TO SHORTS vs AUDIO TO VIDEO */}
        <div className="mt-8 flex items-center justify-center">
          <div className="inline-flex items-center p-1.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-xl gap-1">
            <button
              onClick={() => setCreationMode('video')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                creationMode === 'video'
                  ? 'bg-amber-400 text-neutral-950 shadow-md shadow-amber-400/20'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Video to Shorts</span>
            </button>

            <button
              onClick={() => setCreationMode('audio')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                creationMode === 'audio'
                  ? 'bg-amber-400 text-neutral-950 shadow-md shadow-amber-400/20'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <Music className="w-4 h-4" />
              <span>Audio to Video</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500 text-white font-extrabold uppercase tracking-wide">
                NEW
              </span>
            </button>
          </div>
        </div>

        {/* WORKFLOW CONTAINER */}
        <div className="mt-6 max-w-2xl mx-auto">
          {/* MODE 1: VIDEO TO SHORTS */}
          {creationMode === 'video' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.webm,.m4v"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 sm:p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center text-center group ${
                  isDragging
                    ? 'border-amber-400 bg-amber-400/10 scale-[1.01]'
                    : 'border-neutral-800 bg-neutral-900/60 hover:border-amber-400/60 hover:bg-neutral-900/90'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-3 shadow-inner group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Drop your video here
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-md">
                  Supports MP4, MOV, WebM, or M4V. Load local video directly for instant real NLE editing.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-400/20 transition-transform">
                  <Upload className="w-4 h-4" />
                  <span>Import Video</span>
                </div>
              </div>

              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-800" />
                </div>
                <div className="relative inline-block px-4 bg-neutral-950 text-xs text-neutral-500 font-semibold tracking-wider uppercase">
                  Or paste YouTube video link
                </div>
              </div>

              {/* STEP 1: Paste YouTube URL Input Box */}
              <form onSubmit={handleSubmit} className="relative flex flex-col sm:flex-row items-center gap-2.5 p-2 bg-neutral-900/90 border border-neutral-800 rounded-2xl shadow-2xl focus-within:border-amber-400/60 transition-all">
                <div className="flex items-center gap-3 px-3 w-full">
                  <Film className="w-5 h-5 text-neutral-500 flex-shrink-0" />
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      if (urlError) setUrlError('');
                    }}
                    placeholder="Paste your YouTube link here (e.g., https://youtube.com/watch?v=...)"
                    className="w-full bg-transparent text-sm sm:text-base text-white placeholder-neutral-500 focus:outline-none py-2"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 fill-neutral-950" />
                    <span>Create Shorts</span>
                  </button>

                  {onStartDemo && (
                    <button
                      type="button"
                      onClick={onStartDemo}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-400/30 font-bold text-sm tracking-wide shadow transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap cursor-pointer"
                      title="Run pipeline with bundled sample demo video"
                    >
                      <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>Try Demo</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* MODE 2: AUDIO TO VIDEO */}
          {creationMode === 'audio' && (
            <div>
              <input
                ref={audioFileInputRef}
                type="file"
                accept="audio/mp3,audio/wav,audio/m4a,audio/aac,audio/flac,audio/ogg,audio/x-m4a,.mp3,.wav,.m4a,.aac,.flac,.ogg"
                onChange={handleAudioFileInputChange}
                className="hidden"
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => audioFileInputRef.current?.click()}
                className={`p-6 sm:p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center text-center group ${
                  isDragging
                    ? 'border-amber-400 bg-amber-400/10 scale-[1.01]'
                    : 'border-neutral-800 bg-neutral-900/60 hover:border-amber-400/60 hover:bg-neutral-900/90'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-3 shadow-inner group-hover:scale-110 transition-transform">
                  <Headphones className="w-7 h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Drop your audio file here
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-md">
                  Upload MP3, WAV, M4A, AAC, FLAC, or OGG. Automatically generates word-level timestamps, kinetic typing captions, audio visualizers, and animated backgrounds.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-neutral-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-400/20 transition-transform">
                  <Music className="w-4 h-4" />
                  <span>Select Audio File</span>
                </div>
              </div>

              {/* Highlights pills */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-neutral-400">
                <div className="p-2 rounded-xl bg-neutral-900/50 border border-neutral-800/80">
                  <span className="block font-bold text-amber-400">Word-Sync</span>
                  <span className="text-[10px]">Deterministic captions</span>
                </div>
                <div className="p-2 rounded-xl bg-neutral-900/50 border border-neutral-800/80">
                  <span className="block font-bold text-amber-400">Audio Visualizer</span>
                  <span className="text-[10px]">Waveforms & bars</span>
                </div>
                <div className="p-2 rounded-xl bg-neutral-900/50 border border-neutral-800/80">
                  <span className="block font-bold text-amber-400">1080x1920 MP4</span>
                  <span className="text-[10px]">Ready for TikTok/Shorts</span>
                </div>
              </div>
            </div>
          )}

          {urlError && (
            <p className="text-xs text-rose-400 mt-2 text-left px-2">{urlError}</p>
          )}

          {/* Quick-Pick Sample Demo Videos */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-400">
            <span className="text-neutral-500">Or try instant demo:</span>
            {SAMPLE_PROJECTS.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => handleQuickPick(sample)}
                className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Play className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                <span>{sample.originalTitle.split('-')[0].trim()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* WORKFLOW PIPELINE DEMONSTRATION: LONG VIDEO → AI ANALYSIS → MULTIPLE SHORTS */}
        <div className="mt-16 p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Stage 1: Long Video */}
            <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 text-left space-y-2">
              <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold">
                <span className="uppercase tracking-wider">Source Material</span>
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">16:9 Landscape</span>
              </div>
              <div className="relative aspect-video rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800">
                <img
                  src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80"
                  alt="Raw YouTube Video"
                  className="w-full h-full object-cover opacity-70"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="w-8 h-8 text-white fill-white/80" />
                </div>
                <span className="absolute bottom-2 right-2 text-[10px] bg-black/80 text-white px-1.5 py-0.5 rounded">
                  45:20
                </span>
              </div>
              <p className="text-xs font-medium text-neutral-300 truncate">Steve Jobs - Full Stanford & Archives Interview</p>
            </div>

            {/* Stage 2: AI Engine Processing */}
            <div className="flex flex-col items-center justify-center text-center px-2 py-4">
              <div className="w-12 h-12 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg shadow-amber-500/10 animate-pulse">
                <Wand2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">AI Studio Engine</span>
              <p className="text-[11px] text-neutral-400 mt-1">Transcribes, detects viral hooks, reframes & layers dynamic SFX</p>
              <div className="flex items-center gap-1 text-amber-400 text-xs font-bold mt-2">
                <span>Auto-Reframing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Stage 3: Multiple 9:16 Shorts */}
            <div className="p-4 rounded-xl bg-neutral-950/80 border border-amber-500/30 text-left space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
                <span className="uppercase tracking-wider">12 Viral Shorts</span>
                <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">9:16 Vertical</span>
              </div>
              <div className="flex gap-2">
                <div className="w-1/2 aspect-[9/16] rounded-lg overflow-hidden relative border border-amber-500/40 bg-neutral-900">
                  <img
                    src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&auto=format&fit=crop&q=80"
                    alt="Short 1"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 right-1.5 bg-neutral-950/90 text-amber-400 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-amber-400/40">
                    96 SCORE
                  </div>
                  <div className="absolute bottom-2 inset-x-1 bg-black/80 rounded p-1 text-[9px] font-bold text-center text-amber-300 leading-tight">
                    NO SMARTER THAN YOU
                  </div>
                </div>
                <div className="w-1/2 aspect-[9/16] rounded-lg overflow-hidden relative border border-neutral-800 bg-neutral-900">
                  <img
                    src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&auto=format&fit=crop&q=80"
                    alt="Short 2"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 right-1.5 bg-neutral-950/90 text-amber-400 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-amber-400/40">
                    93 SCORE
                  </div>
                  <div className="absolute bottom-2 inset-x-1 bg-black/80 rounded p-1 text-[9px] font-bold text-center text-white leading-tight">
                    UNREASONABLE MAN
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE BEFORE / AFTER COMPARISON SLIDER */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="text-center mb-10">
          <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Visual Transformation</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-2">
            See The Difference: Raw Video vs AI Viral Short
          </h2>
          <p className="text-sm text-neutral-400 mt-2 max-w-xl mx-auto">
            Drag the slider to experience how raw, low-retention horizontal footage transforms into an energetic,
            captioned, punchy 9:16 Short.
          </p>
        </div>

        {/* Comparison Viewer Container */}
        <div className="relative w-full max-w-2xl mx-auto aspect-[9/14] sm:aspect-[9/13] rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-900 select-none">
          {/* AFTER VIEW (Viral Short with captions and punch-in) */}
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1000&auto=format&fit=crop&q=80"
              alt="After short"
              className="w-full h-full object-cover scale-110 filter contrast-105"
            />
            {/* Captions Overlay */}
            <div className="absolute bottom-24 inset-x-4 flex flex-col items-center text-center">
              <div className="bg-black/75 backdrop-blur-sm px-4 py-2 rounded-xl border border-amber-400/40 shadow-xl">
                <span className="font-display font-extrabold text-2xl text-white tracking-tight uppercase">
                  They were <span className="text-amber-400 text-stroke-sm scale-110 inline-block">NO SMARTER</span> than you.
                </span>
              </div>
            </div>
            {/* Viral Badge */}
            <div className="absolute top-4 right-4 bg-neutral-950/90 border border-amber-400/40 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span className="text-xs font-bold text-white">Viral Score 96/100</span>
            </div>
            {/* Audio Wave / SFX indicator */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-neutral-700 text-[11px] text-neutral-300 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>SFX: Impact Hit</span>
            </div>
            <div className="absolute bottom-4 left-4 text-xs font-bold text-amber-400 bg-black/80 px-3 py-1 rounded-lg">
              ✨ AFTER: 9:16 Viral Short
            </div>
          </div>

          {/* BEFORE VIEW (Horizontal cropped with dead space) */}
          <div
            className="absolute inset-0 overflow-hidden border-r-2 border-amber-400"
            style={{ width: `${sliderPos}%` }}
          >
            <div className="absolute inset-0 w-full h-full bg-neutral-950 flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1000&auto=format&fit=crop&q=80"
                alt="Before raw"
                className="w-full h-48 object-cover opacity-80"
              />
              <div className="absolute top-4 left-4 text-xs font-bold text-neutral-400 bg-neutral-900/90 px-3 py-1 rounded-lg border border-neutral-800">
                RAW: 16:9 Landscape (No Captions / Slow)
              </div>
            </div>
          </div>

          {/* Drag Handle */}
          <div
            className="absolute top-0 bottom-0 -translate-x-1/2 flex items-center justify-center pointer-events-none"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="w-8 h-8 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center shadow-lg font-bold text-xs">
              ↔
            </div>
          </div>

          {/* Range Slider for Interaction */}
          <input
            type="range"
            min="5"
            max="95"
            value={sliderPos}
            onChange={(e) => setSliderPos(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
            aria-label="Before and after slider"
          />
        </div>
      </section>

      {/* HOW IT WORKS (4 STEPS) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Workflow</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-2">How It Works in 4 Steps</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-neutral-900/70 border border-neutral-800 text-left relative">
            <span className="text-3xl font-display font-black text-amber-400/40">01</span>
            <h3 className="text-base font-bold text-white mt-2">Paste YouTube Video</h3>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Input any public YouTube interview, podcast, keynote, or educational lecture.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/70 border border-neutral-800 text-left relative">
            <span className="text-3xl font-display font-black text-amber-400/40">02</span>
            <h3 className="text-base font-bold text-white mt-2">AI Detects Viral Moments</h3>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Evaluates hook strength, storytelling peaks, surprising claims, and retention curves.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/70 border border-neutral-800 text-left relative">
            <span className="text-3xl font-display font-black text-amber-400/40">03</span>
            <h3 className="text-base font-bold text-white mt-2">Auto-Edits & Reframes</h3>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Centers the speaker in 9:16, generates word-by-word kinetic captions, and applies punch-in zooms.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/70 border border-neutral-800 text-left relative">
            <span className="text-3xl font-display font-black text-amber-400/40">04</span>
            <h3 className="text-base font-bold text-white mt-2">Export & Publish</h3>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Download 1080p or 4K MP4 files customized for TikTok, YouTube Shorts, and Instagram Reels.
            </p>
          </div>
        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Engine Capabilities</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-2">Everything You Need To Dominate Short-Form</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
              <Scissors className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Smart 9:16 Reframing</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Active speaker tracking keeps face and gestures centered with smooth dynamic transitions.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-orange-400/10 text-orange-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Word-by-Word Animated Captions</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              7 viral presets with dynamic pop, bounce, and keyword color accents timed to the millisecond.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-400/10 text-rose-400 flex items-center justify-center">
              <Volume2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">AI Sound Effects (SFX) Engine</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Procedurally syncs whooshes, pops, and dramatic risers to maintain intense viewer engagement.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-400/10 text-purple-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Contextual VFX & Punch-Ins</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Subtle 1.15x zooms, camera shakes, and key-point callouts emphasize crucial takeaways.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Silence & Pacing Tightener</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Automatically identifies awkward dead air and filler words to keep pacing fast and addictive.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-400/10 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Predictive Viral Score</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Scores every Short on hook strength, emotional resonance, and retention potential before you post.
            </p>
          </div>
        </div>
      </section>

      {/* SAMPLE VIRAL SHORTS GALLERY */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Live Demos</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Explore Pre-Analyzed Shorts</h2>
          </div>
          <span className="text-xs text-neutral-400">Click any card to open in Studio Editor</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAMPLE_PROJECTS.map((proj) => {
            const topShort = proj.shorts[0];
            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj)}
                className="group cursor-pointer rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-400/50 transition-all overflow-hidden flex flex-col hover:shadow-xl hover:shadow-amber-500/10"
              >
                {/* Thumbnail */}
                <div className="relative aspect-[16/10] overflow-hidden bg-neutral-950">
                  <img
                    src={topShort.thumbnail}
                    alt={topShort.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-neutral-950/90 text-amber-400 text-xs font-black px-2.5 py-1 rounded-lg border border-amber-400/30 flex items-center gap-1 shadow-md">
                    <Flame className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{topShort.viralScore.overall}/100</span>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-neutral-950/80 text-white text-xs font-semibold px-2 py-0.5 rounded">
                    {topShort.duration}s
                  </div>
                </div>

                {/* Info */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                      {topShort.topic}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1 group-hover:text-amber-300 transition-colors line-clamp-2">
                      {topShort.title}
                    </h3>
                  </div>

                  <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                    <span>{proj.channelName}</span>
                    <span className="text-amber-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Open Editor <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* PRICING PLANS (CLEARLY LABELED DEMO / NO FAKE PAYMENT) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Simple Tiering</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-2">Transparent Creator Plans</h2>
          <p className="text-xs text-neutral-400 mt-2">
            Explore features in unrestricted demo mode. No credit card required.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Free */}
          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Free</h3>
              <div className="text-2xl font-black text-white mt-2">$0</div>
              <p className="text-xs text-neutral-400 mt-1">For testing the platform</p>
              <ul className="mt-4 space-y-2 text-xs text-neutral-300">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> 3 Shorts per month</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> 720p Exports</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> Standard Captions</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onSelectProject(SAMPLE_PROJECTS[0])}
              className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200"
            >
              Current Active Tier
            </button>
          </div>

          {/* Creator */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-700 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Creator</h3>
              <div className="text-2xl font-black text-white mt-2">$19<span className="text-xs text-neutral-400 font-normal">/mo</span></div>
              <p className="text-xs text-neutral-400 mt-1">For active YouTubers</p>
              <ul className="mt-4 space-y-2 text-xs text-neutral-300">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> 30 Shorts per month</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> 1080p FHD Exports</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> Auto SFX & VFX Zooms</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> No Watermark</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onSelectProject(SAMPLE_PROJECTS[0])}
              className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200"
            >
              Demo Enabled
            </button>
          </div>

          {/* Pro (Highlighted) */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 border-2 border-amber-400 space-y-4 flex flex-col justify-between relative shadow-xl shadow-amber-500/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-400 text-neutral-950 text-[10px] font-extrabold uppercase">
              Most Popular
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Pro</h3>
              <div className="text-2xl font-black text-amber-400 mt-2">$49<span className="text-xs text-neutral-400 font-normal">/mo</span></div>
              <p className="text-xs text-neutral-400 mt-1">For high-growth agencies & creators</p>
              <ul className="mt-4 space-y-2 text-xs text-neutral-300">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> Unlimited Shorts</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> 4K Ultra Exports (60 FPS)</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> Custom Brand Kit & Fonts</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> Silence & Filler Remover</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> Batch 1-Click Export</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onSelectProject(SAMPLE_PROJECTS[0])}
              className="w-full py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-xs font-bold text-neutral-950 shadow-md shadow-amber-400/20"
            >
              Try in Studio
            </button>
          </div>

          {/* Agency */}
          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Agency</h3>
              <div className="text-2xl font-black text-white mt-2">$99<span className="text-xs text-neutral-400 font-normal">/mo</span></div>
              <p className="text-xs text-neutral-400 mt-1">For multi-brand operations</p>
              <ul className="mt-4 space-y-2 text-xs text-neutral-300">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> Multi-seat collaboration</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> Unlimited Brand Kits</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> Priority Cloud Rendering</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onSelectProject(SAMPLE_PROJECTS[0])}
              className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200"
            >
              Demo Enabled
            </button>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full">
        <div className="text-center mb-10">
          <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Got Questions?</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div
              key={i}
              className="border border-neutral-800 rounded-xl bg-neutral-900/60 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-4 text-left flex items-center justify-between text-sm font-bold text-neutral-200 hover:text-white"
              >
                <span>{f.q}</span>
                <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-xs text-neutral-400 leading-relaxed border-t border-neutral-800/60 pt-3">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-neutral-900 py-8 px-4 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-300">ViralClip Studio AI</span>
            <span>&bull; Professional Short-Form Video Repurposing</span>
          </div>
          <div className="text-[11px]">
            Compliant YouTube ingestion &bull; Gemini 3.8 Intelligence
          </div>
        </div>
      </footer>
    </div>
  );
};
