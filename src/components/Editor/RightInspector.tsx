import React, { useState } from 'react';
import {
  Sparkles,
  Layers,
  Volume2,
  Zap,
  Sliders,
  Flame,
  FileText,
  Palette,
  Scissors,
  Check,
  RotateCcw,
  Copy,
  Plus,
  Play,
  Film,
  Upload,
  Music,
  Trash2,
  Edit3,
  Save,
  Image as ImageIcon,
  AlignLeft,
  Globe,
  SlidersHorizontal,
  RefreshCw,
  Eye,
  Info,
  CheckCircle2
} from 'lucide-react';
import {
  ShortCandidate,
  CaptionCustomization,
  CaptionStylePreset,
  BrandKit,
  HookCategory,
  SFXCategory,
  VFXMarker,
  BRollSuggestion,
  ApprovalMode,
} from '../../types';
import { sfxEngine } from '../../utils/sfxAudio';
import { TranscriptEditor } from './TranscriptEditor';
import { CAPTION_STYLES_REGISTRY, getCaptionStylePreset, calculateCaptionCoverage } from '../../utils/captionEngine';

interface RightInspectorProps {
  short: ShortCandidate;
  activeTab: 'captions' | 'transcript' | 'hooks' | 'sfx' | 'vfx' | 'silence' | 'broll' | 'audio' | 'metadata';
  onTabChange: (tab: 'captions' | 'transcript' | 'hooks' | 'sfx' | 'vfx' | 'silence' | 'broll' | 'audio' | 'metadata') => void;
  captionConfig: CaptionCustomization;
  onCaptionConfigChange: (config: CaptionCustomization) => void;
  onSelectHook: (hookText: string, category: HookCategory) => void;
  onRegenerateHooks: () => void;
  isRegeneratingHooks: boolean;
  onAddSFXAtCurrentTime: (cat: SFXCategory, name: string) => void;
  onAddVFXAtCurrentTime: (type: 'zoom_punch' | 'shake' | 'glow' | 'motion_blur' | 'glitch' | 'callout', label: string) => void;
  onToggleVFXZoom: (enabled: boolean) => void;
  zoomPunchEnabled: boolean;
  onToggleBRoll: (id: string) => void;
  onAddBRollAtCurrentTime: (concept: string, imageUrl: string) => void;
  onUpdateCaptionText: (id: string, text: string) => void;
  onDeleteCaption?: (id: string) => void;
  onAddCaptionAtCurrentTime?: () => void;
  onTranscribeCaptions?: () => void;
  isTranscribing?: boolean;
  onDeleteSFX?: (id: string) => void;
  onDeleteVFX?: (id: string) => void;
  onDeleteBRoll?: (id: string) => void;
  onSeekToTime?: (time: number) => void;
  onTrimSilence?: () => void;
  brandKit: BrandKit;
  speakerPosition: 'center' | 'left' | 'right' | 'auto_switch';
  onSpeakerPositionChange: (pos: 'center' | 'left' | 'right' | 'auto_switch') => void;
  currentTime: number;
  language?: string;
  onLanguageChange?: (lang: string) => void;
  approvalMode?: ApprovalMode;
  onApprovalModeChange?: (mode: ApprovalMode) => void;
  onRegenerateElements?: (type: 'all' | 'captions' | 'broll' | 'sfx' | 'vfx') => void;
  isRegeneratingElements?: boolean;
}

const VERIFIED_SFX_CATALOG: { category: SFXCategory; name: string; desc: string }[] = [
  { category: 'whoosh', name: 'Fast Modern Whoosh', desc: 'Quick camera pan or scene cut' },
  { category: 'hit', name: 'Heavy Cinematic Hit', desc: 'Bold emotional punchline or announcement' },
  { category: 'impact', name: 'Sub-bass Boom', desc: 'Dramatic realization or climax' },
  { category: 'pop', name: 'Bubble Pop Accent', desc: 'Text keyword appearance or numbered point' },
  { category: 'riser', name: 'Tension Riser', desc: 'Builds curiosity before key reveal' },
  { category: 'chime', name: 'Warm Crystal Chime', desc: 'Positive discovery, success or tip' },
  { category: 'click', name: 'Mechanical Snap', desc: 'Clean interface click or subtle tick' },
  { category: 'glitch', name: 'Digital Glitch', desc: 'Pattern interrupt, error or contrast' },
];

const VFX_CATALOG = [
  { type: 'zoom_punch' as const, label: '1.25x Punch Zoom', desc: 'Snaps in on key phrase' },
  { type: 'shake' as const, label: 'Impact Camera Shake', desc: 'Earthquake rumble effect' },
  { type: 'glow' as const, label: 'Radiant Edge Glow', desc: 'Dramatic cinematic light' },
  { type: 'motion_blur' as const, label: 'Motion Blur Filter', desc: 'Action-packed blur sweep' },
  { type: 'glitch' as const, label: 'RGB Glitch Aberration', desc: 'Digital chromatic split' },
  { type: 'callout' as const, label: 'Floating Keynote Banner', desc: 'Top highlighted headline' },
];

const VERIFIED_BROLL_ASSETS = [
  { concept: 'Coding & Tech Build', url: '/assets/broll/coding.jpg', tag: 'tech' },
  { concept: 'AI & Neural Systems', url: '/assets/broll/ai_interface.jpg', tag: 'ai' },
  { concept: 'Growth Analytics Chart', url: '/assets/broll/analytics.jpg', tag: 'growth' },
  { concept: 'Modern Tech Workspace', url: '/assets/broll/workspace.jpg', tag: 'office' },
  { concept: 'Dynamic City Skyline', url: '/assets/broll/city_skyline.jpg', tag: 'city' },
  { concept: 'Deep Thinking & Strategy', url: '/assets/broll/strategy.jpg', tag: 'strategy' },
  { concept: 'Cinema & Studio Camera', url: '/assets/broll/camera.jpg', tag: 'media' },
];

const SUPPORTED_LANGUAGES = [
  { code: 'auto', label: 'Auto Detect (Content-Driven)' },
  { code: 'en', label: 'English (US/UK)' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'hi-Latn', label: 'Hinglish (Hindi Latin)' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'de', label: 'German (Deutsch)' },
  { code: 'pt', label: 'Portuguese (Português)' },
  { code: 'it', label: 'Italian (Italiano)' },
  { code: 'ja', label: 'Japanese (日本語)' },
  { code: 'ko', label: 'Korean (한국어)' },
  { code: 'zh', label: 'Chinese (中文)' },
  { code: 'ar', label: 'Arabic (العربية)' },
  { code: 'ru', label: 'Russian (Русский)' },
  { code: 'id', label: 'Indonesian (Bahasa)' },
  { code: 'tr', label: 'Turkish (Türkçe)' },
  { code: 'vi', label: 'Vietnamese (Tiếng Việt)' },
  { code: 'nl', label: 'Dutch (Nederlands)' },
  { code: 'pl', label: 'Polish (Polski)' },
  { code: 'th', label: 'Thai (ไทย)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'bn', label: 'Bengali (বাংলা)' },
];

export const RightInspector: React.FC<RightInspectorProps> = ({
  short,
  activeTab,
  onTabChange,
  captionConfig,
  onCaptionConfigChange,
  onSelectHook,
  onRegenerateHooks,
  isRegeneratingHooks,
  onAddSFXAtCurrentTime,
  onAddVFXAtCurrentTime,
  onToggleVFXZoom,
  zoomPunchEnabled,
  onToggleBRoll,
  onAddBRollAtCurrentTime,
  onUpdateCaptionText,
  onDeleteCaption,
  onAddCaptionAtCurrentTime,
  onTranscribeCaptions,
  isTranscribing,
  onDeleteSFX,
  onDeleteVFX,
  onDeleteBRoll,
  onSeekToTime,
  onTrimSilence,
  brandKit,
  speakerPosition,
  onSpeakerPositionChange,
  currentTime,
  language = 'en',
  onLanguageChange,
  approvalMode = 'auto_apply',
  onApprovalModeChange,
  onRegenerateElements,
  isRegeneratingElements = false,
}) => {
  const [copiedTitle, setCopiedTitle] = useState<boolean>(false);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editedCaptionText, setEditedCaptionText] = useState<string>('');
  const [customBrollUrl, setCustomBrollUrl] = useState<string>('');
  const [customBrollConcept, setCustomBrollConcept] = useState<string>('');
  const [voiceVolume, setVoiceVolume] = useState<number>(100);
  const [musicVolume, setMusicVolume] = useState<number>(30);
  const [sfxVolume, setSfxVolume] = useState<number>(75);
  const [autoDucking, setAutoDucking] = useState<boolean>(true);
  const [selectedMusic, setSelectedMusic] = useState<string>('hype_trap');
  const [presetFilterCategory, setPresetFilterCategory] = useState<string>('all');

  const analysis = short.projectAnalysis;
  const detectedLangCode = analysis?.language || short.language || language || 'en';
  const detectedLangName = analysis?.languageConfidence
    ? `${analysis.language.toUpperCase()} (${Math.round(analysis.languageConfidence * 100)}%)`
    : detectedLangCode.toUpperCase();

  const captionCoverage = calculateCaptionCoverage(short.captions || [], short.duration || 30);

  const applyPreset = (preset: CaptionStylePreset) => {
    const styleDef = getCaptionStylePreset(preset);
    onCaptionConfigChange({
      ...captionConfig,
      ...styleDef,
      preset,
    });
  };

  const copyMetadata = (text: string) => {
    navigator.clipboard?.writeText?.(text);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 1500);
  };

  const handleStartEditCaption = (id: string, text: string) => {
    setEditingCaptionId(id);
    setEditedCaptionText(text);
  };

  const handleSaveCaption = (id: string) => {
    onUpdateCaptionText(id, editedCaptionText);
    setEditingCaptionId(null);
  };

  const handleUploadCustomBRoll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onAddBRollAtCurrentTime(file.name.replace(/\.[^/.]+$/, ''), url);
    }
  };

  const filteredPresets = CAPTION_STYLES_REGISTRY.filter((p) => {
    if (presetFilterCategory === 'all') return true;
    return p.category === presetFilterCategory;
  });

  return (
    <div className="w-full lg:w-96 bg-neutral-900 border-l border-neutral-800 flex flex-col h-full overflow-hidden">
      {/* TOP AI PRODUCTION INTELLIGENCE CONTROLS */}
      <div className="p-3 bg-neutral-950 border-b border-neutral-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">AI Intelligence</span>
          </div>

          {/* Language selector & badge */}
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={language}
              onChange={(e) => onLanguageChange?.(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 text-neutral-200 text-[11px] font-semibold rounded px-1.5 py-0.5 focus:outline-none focus:border-amber-400 cursor-pointer"
              title="Content Language & Transcription Model"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Human Approval Mode Pills */}
        <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
          {[
            { id: 'auto_apply' as const, label: 'Auto Apply (≥0.80)' },
            { id: 'balanced' as const, label: 'Balanced (≥0.85)' },
            { id: 'suggest_only' as const, label: 'Suggest Only' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => onApprovalModeChange?.(mode.id)}
              className={`flex-1 py-1 px-1.5 text-[10px] font-bold rounded transition-colors text-center cursor-pointer ${
                approvalMode === mode.id
                  ? 'bg-amber-400 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title={`Approval Mode: ${mode.label}`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Regeneration Actions Bar */}
        <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80">
          <span className="text-[10px] font-medium text-neutral-400">Regenerate:</span>
          <div className="flex items-center gap-1">
            {[
              { id: 'all' as const, label: '✨ All' },
              { id: 'captions' as const, label: 'Captions' },
              { id: 'broll' as const, label: 'B-Roll' },
              { id: 'sfx' as const, label: 'SFX' },
              { id: 'vfx' as const, label: 'VFX' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => onRegenerateElements?.(btn.id)}
                disabled={isRegeneratingElements}
                className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 hover:border-amber-400/50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Switcher Icons */}
      <div className="flex items-center gap-1 p-2 border-b border-neutral-800 overflow-x-auto bg-neutral-950/60 scrollbar-none">
        {[
          { id: 'captions' as const, label: 'Captions', icon: Layers },
          { id: 'transcript' as const, label: 'Transcript', icon: AlignLeft },
          { id: 'hooks' as const, label: 'Hooks', icon: Flame },
          { id: 'sfx' as const, label: 'SFX', icon: Volume2 },
          { id: 'vfx' as const, label: 'VFX', icon: Zap },
          { id: 'silence' as const, label: 'Silence', icon: Scissors },
          { id: 'broll' as const, label: 'B-Roll', icon: Film },
          { id: 'audio' as const, label: 'Audio', icon: Music },
          { id: 'metadata' as const, label: 'SEO', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                isActive ? 'bg-amber-400 text-neutral-950' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* TAB: TRANSCRIPT-BASED EDITING */}
        {activeTab === 'transcript' && (
          <div className="h-full">
            <TranscriptEditor
              short={short}
              currentTime={currentTime}
              onSeekToTime={onSeekToTime || (() => {})}
              onUpdateCaptionText={onUpdateCaptionText}
              onDeleteCaption={onDeleteCaption}
              onAddCaptionAtCurrentTime={onAddCaptionAtCurrentTime}
              onTranscribeCaptions={onTranscribeCaptions}
              isTranscribing={isTranscribing}
            />
          </div>
        )}

        {/* TAB 1: CAPTION ENGINE */}
        {activeTab === 'captions' && (
          <div className="space-y-6 animate-fade-in">
            {/* Presets Header & Auto-Transcribe */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Caption Presets</h3>
                <p className="text-xs text-neutral-400 mt-0.5">25 viral styles with word-level animations</p>
              </div>

              {onTranscribeCaptions && (
                <button
                  onClick={onTranscribeCaptions}
                  disabled={isTranscribing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
                  title="Generate accurate word-level timestamped captions"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isTranscribing ? 'animate-spin text-cyan-400' : 'text-cyan-300'}`} />
                  <span>{isTranscribing ? 'Transcribing...' : 'Auto-Transcribe'}</span>
                </button>
              )}
            </div>

            {/* Caption Coverage Diagnostic Bar */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-300">Timeline Coverage</span>
                <span className="font-mono font-bold text-amber-400">{captionCoverage.coveragePercent}%</span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, captionCoverage.coveragePercent)}%` }}
                />
              </div>
              <div className="grid grid-cols-4 gap-1 pt-1 text-[10px] text-center">
                <span className={`px-1 py-0.5 rounded font-mono ${captionCoverage.quartileCoverage.q1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-900 text-neutral-600'}`}>Q1 (0-25%)</span>
                <span className={`px-1 py-0.5 rounded font-mono ${captionCoverage.quartileCoverage.q2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-900 text-neutral-600'}`}>Q2 (25-50%)</span>
                <span className={`px-1 py-0.5 rounded font-mono ${captionCoverage.quartileCoverage.q3 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-900 text-neutral-600'}`}>Q3 (50-75%)</span>
                <span className={`px-1 py-0.5 rounded font-mono ${captionCoverage.quartileCoverage.q4 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-900 text-neutral-600'}`}>Q4 (75-100%)</span>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'all', label: 'All (25)' },
                { id: 'viral', label: 'Viral' },
                { id: 'high_energy', label: 'Energy' },
                { id: 'podcast', label: 'Podcast' },
                { id: 'cinematic', label: 'Cinematic' },
                { id: 'creative', label: 'Creative' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setPresetFilterCategory(c.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    presetFilterCategory === c.id
                      ? 'bg-amber-400 text-neutral-950 shadow-sm'
                      : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* 25 Presets Grid */}
            <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
              {filteredPresets.map((p) => {
                const isSelected = (captionConfig.preset || 'viral_bold') === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400/10 border-amber-400 text-white shadow-md ring-1 ring-amber-400/30'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{p.name}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                          {p.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">{p.desc}</div>
                    </div>
                    <span
                      className="text-xs font-extrabold px-2 py-0.5 rounded border text-center shrink-0"
                      style={{
                        backgroundColor: '#0a0a0a',
                        borderColor: isSelected ? '#fbbf24' : '#262626',
                        color: p.config.highlightColor || '#facc15',
                        fontFamily: p.config.fontFamily || 'inherit',
                      }}
                    >
                      Aa
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Position & Styling Controls */}
            <div className="pt-4 border-t border-neutral-800 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Position & Styling</h4>

              {/* Vertical Position */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>Vertical Position (Y)</span>
                  <span className="font-mono text-amber-400">{captionConfig.positionY}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="85"
                  value={captionConfig.positionY}
                  onChange={(e) =>
                    onCaptionConfigChange({ ...captionConfig, positionY: Number(e.target.value) })
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Font Size */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>Font Size</span>
                  <span className="font-mono text-amber-400">{captionConfig.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="48"
                  value={captionConfig.fontSize}
                  onChange={(e) =>
                    onCaptionConfigChange({ ...captionConfig, fontSize: Number(e.target.value) })
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Highlight Color Pickers */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-neutral-300">Active Highlight Color</span>
                <div className="flex items-center gap-1.5">
                  {['#facc15', '#38bdf8', '#4ade80', '#fb7185', '#c084fc', '#ff007f', '#00f5ff'].map((col) => (
                    <button
                      key={col}
                      onClick={() => onCaptionConfigChange({ ...captionConfig, highlightColor: col })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        captionConfig.highlightColor === col ? 'scale-125 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-neutral-300">Uppercase All Words</span>
                <input
                  type="checkbox"
                  checked={captionConfig.uppercase}
                  onChange={(e) =>
                    onCaptionConfigChange({ ...captionConfig, uppercase: e.target.checked })
                  }
                  className="w-4 h-4 accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Captions List on Active Clip */}
            <div className="pt-4 border-t border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Captions on Clip ({short.captions?.length || 0})
                </h4>
                {onAddCaptionAtCurrentTime && (
                  <button
                    onClick={onAddCaptionAtCurrentTime}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Caption</span>
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {(short.captions || []).map((cap) => {
                  const isEditing = editingCaptionId === cap.id;
                  const isCurrentlyActive = currentTime >= cap.start && currentTime <= cap.end;

                  return (
                    <div
                      key={cap.id}
                      className={`p-2.5 rounded-xl border text-xs transition-all ${
                        isCurrentlyActive
                          ? 'bg-amber-400/10 border-amber-400 shadow-sm'
                          : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 text-[10px] text-neutral-400">
                        <span
                          className="font-mono cursor-pointer hover:text-amber-400 font-bold"
                          onClick={() => onSeekToTime?.(cap.start)}
                        >
                          {cap.start.toFixed(1)}s - {cap.end.toFixed(1)}s
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isEditing ? (
                            <button
                              onClick={() => handleSaveCaption(cap.id)}
                              className="text-emerald-400 hover:text-emerald-300 transition-colors"
                              title="Save"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartEditCaption(cap.id, cap.text)}
                              className="text-neutral-400 hover:text-white transition-colors"
                              title="Edit Caption Text"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDeleteCaption && (
                            <button
                              onClick={() => onDeleteCaption(cap.id)}
                              className="text-neutral-500 hover:text-rose-400 transition-colors"
                              title="Delete Caption"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <input
                          type="text"
                          value={editedCaptionText}
                          onChange={(e) => setEditedCaptionText(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-400"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCaption(cap.id);
                          }}
                        />
                      ) : (
                        <p
                          onClick={() => onSeekToTime?.(cap.start)}
                          className="text-neutral-200 font-medium leading-relaxed cursor-pointer hover:text-white"
                        >
                          {cap.text}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AI HOOK GENERATOR */}
        {activeTab === 'hooks' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">5 AI Hook Angles</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Stop the scroll in the first 2 seconds</p>
              </div>

              <button
                onClick={onRegenerateHooks}
                disabled={isRegeneratingHooks}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 transition-colors cursor-pointer"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isRegeneratingHooks ? 'animate-spin' : ''}`} />
                <span>{isRegeneratingHooks ? 'Generating...' : 'Regenerate'}</span>
              </button>
            </div>

            <div className="space-y-3">
              {(short.hookOptions || short.availableHooks || []).map((hk, idx) => {
                const isSelected = short.hookText === hk.text;
                return (
                  <div
                    key={idx}
                    onClick={() => onSelectHook(hk.text, hk.category)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-400/10 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                        : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-amber-300">
                        {hk.title}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                          <Check className="w-3 h-3" /> Active Hook
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-white leading-relaxed">
                      "{hk.text}"
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: SFX SOUND EFFECTS */}
        {activeTab === 'sfx' && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Sound Effects Catalog</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Click to test sound or place at playhead ({currentTime.toFixed(1)}s)</p>
            </div>

            <div className="space-y-2">
              {VERIFIED_SFX_CATALOG.map((s) => (
                <div
                  key={s.name}
                  className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 flex items-center justify-between gap-2 hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => sfxEngine.playSound(s.category, 0.8)}
                      title="Play Sound Preview"
                      className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-neutral-950 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>
                    <div>
                      <div className="text-xs font-bold text-white">{s.name}</div>
                      <div className="text-[11px] text-neutral-500">{s.desc}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => onAddSFXAtCurrentTime(s.category, s.name)}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-amber-400 hover:text-neutral-950 text-neutral-200 transition-colors flex-shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Place at {currentTime.toFixed(0)}s</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Active SFX on this clip with semantic justifications */}
            {short.sfxMarkers && short.sfxMarkers.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-neutral-800">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <span>Active SFX on Timeline</span>
                  <span className="text-amber-400 text-[10px]">{short.sfxMarkers.length} cues</span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {short.sfxMarkers.map((sfx) => (
                    <div
                      key={sfx.id}
                      className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className="flex items-center gap-2 cursor-pointer min-w-0 flex-1"
                          onClick={() => {
                            sfxEngine.playSound(sfx.category, sfx.volume);
                            onSeekToTime?.(sfx.timestamp);
                          }}
                        >
                          <Volume2 className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                          <span className="text-xs font-bold text-white truncate">{sfx.soundName}</span>
                          <span className="text-[10px] font-mono text-amber-400 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                            {sfx.timestamp.toFixed(1)}s
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => sfxEngine.playSound(sfx.category, sfx.volume)}
                            className="p-1 rounded text-neutral-400 hover:text-white"
                            title="Play SFX"
                          >
                            <Play className="w-3 h-3 fill-current" />
                          </button>
                          {onDeleteSFX && (
                            <button
                              onClick={() => onDeleteSFX(sfx.id)}
                              className="text-neutral-500 hover:text-rose-400 p-1 transition-colors"
                              title="Delete SFX"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Justification metadata */}
                      <div className="text-[11px] text-neutral-400 bg-neutral-900/60 p-1.5 rounded border border-neutral-800/60 flex items-center justify-between gap-2">
                        <span className="truncate">
                          <strong className="text-neutral-300">Cue:</strong> {sfx.triggerText ? `"${sfx.triggerText}"` : sfx.reason || 'Spoken emphasis'}
                        </span>
                        {sfx.confidence !== undefined && (
                          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                            {Math.round(sfx.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MOTION GRAPHICS & VFX */}
        {activeTab === 'vfx' && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Motion Graphics & VFX</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Add camera punches, shakes, and flashes at {currentTime.toFixed(1)}s</p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {VFX_CATALOG.map((vfx) => (
                <div
                  key={vfx.type}
                  className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{vfx.label}</div>
                    <div className="text-[11px] text-neutral-400">{vfx.desc}</div>
                  </div>
                  <button
                    onClick={() => onAddVFXAtCurrentTime(vfx.type, vfx.label)}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white border border-purple-500/30 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Active VFX on this clip */}
            {short.vfxMarkers && short.vfxMarkers.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-neutral-800">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <span>Active VFX on Timeline</span>
                  <span className="text-purple-400 text-[10px]">{short.vfxMarkers.length} effects</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {short.vfxMarkers.map((vfx) => (
                    <div
                      key={vfx.id}
                      className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2 hover:border-neutral-700 transition-colors"
                    >
                      <div
                        className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1"
                        onClick={() => onSeekToTime?.(vfx.timestamp)}
                      >
                        <Zap className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                        <span className="text-xs font-bold text-white truncate">{vfx.label || vfx.type}</span>
                        <span className="text-[10px] font-mono text-purple-300 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                          {vfx.timestamp.toFixed(1)}s ({vfx.duration}s)
                        </span>
                      </div>
                      {onDeleteVFX && (
                        <button
                          onClick={() => onDeleteVFX(vfx.id)}
                          className="text-neutral-500 hover:text-rose-400 p-1 transition-colors"
                          title="Delete VFX"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Punch Zoom Global Toggle */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Dynamic Punch-In Zooms</div>
                <div className="text-[11px] text-neutral-400">Subtle 1.25x scale punch on key phrases</div>
              </div>
              <input
                type="checkbox"
                checked={zoomPunchEnabled}
                onChange={(e) => onToggleVFXZoom(e.target.checked)}
                className="w-4 h-4 accent-amber-400 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* TAB: SILENCE REMOVAL & DEAD AIR DETECTION */}
        {activeTab === 'silence' && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Silence & Dead Air Detection</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Eliminate dead air to dramatically increase viewer retention</p>
            </div>

            {/* Analysis card */}
            <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Detected Speech Pauses</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {(() => {
                    const caps = short.captions || [];
                    let silenceCount = 0;
                    if (caps.length > 0 && caps[0].start > 0.6) silenceCount++;
                    for (let i = 0; i < caps.length - 1; i++) {
                      if (caps[i + 1].start - caps[i].end > 0.7) silenceCount++;
                    }
                    return `${silenceCount} intervals`;
                  })()}
                </span>
              </div>

              <div className="text-xs text-neutral-400 leading-relaxed">
                Smart audio analysis detects empty pauses where no vocal speech is active, allowing seamless tightening.
              </div>

              {onTrimSilence && (
                <button
                  onClick={onTrimSilence}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Auto-Trim Dead Air & Tighten Clip</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: B-ROLL OVERLAYS */}
        {activeTab === 'broll' && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Content-Aware AI B-Roll</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Visual cutaways semantically aligned to spoken topics</p>
            </div>

            {/* Custom Upload or Add */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
              <div className="text-xs font-bold text-neutral-300">Add Custom B-Roll Asset</div>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-neutral-700 hover:border-amber-400 text-xs text-neutral-300 hover:text-white cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Upload Image File</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleUploadCustomBRoll}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Pre-packaged Asset Catalog */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Verified Local Assets
              </div>
              <div className="space-y-1.5">
                {VERIFIED_BROLL_ASSETS.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800 flex items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-900 flex-shrink-0 border border-neutral-700">
                      <img src={item.url} alt={item.concept} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{item.concept}</div>
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                        {item.tag}
                      </span>
                    </div>
                    <button
                      onClick={() => onAddBRollAtCurrentTime(item.concept, item.url)}
                      className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white border border-blue-500/30 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Place</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Short B-Roll List with justifications */}
            {short.brollSuggestions && short.brollSuggestions.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <span>Timeline B-Roll Overlays</span>
                  <span className="text-amber-400 text-[10px]">{short.brollSuggestions.length} items</span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {short.brollSuggestions.map((br) => (
                    <div
                      key={br.id}
                      className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={br.imageUrl || br.assetUrl}
                          alt={br.concept}
                          onClick={() => onSeekToTime?.(br.timestamp)}
                          className="w-12 h-12 rounded object-cover cursor-pointer hover:opacity-80 border border-neutral-800"
                        />
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => onSeekToTime?.(br.timestamp)}
                        >
                          <div className="text-xs font-bold text-white truncate">{br.concept}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {br.timestamp.toFixed(1)}s - {(br.timestamp + br.duration).toFixed(1)}s ({br.duration}s)
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={br.enabled}
                            onChange={() => onToggleBRoll(br.id)}
                            className="w-4 h-4 accent-amber-400 cursor-pointer"
                            title="Toggle Overlay"
                          />
                          {onDeleteBRoll && (
                            <button
                              onClick={() => onDeleteBRoll(br.id)}
                              className="text-neutral-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                              title="Delete B-Roll"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Justification details */}
                      <div className="text-[11px] text-neutral-400 bg-neutral-900/60 p-1.5 rounded border border-neutral-800/60 flex items-center justify-between gap-2">
                        <span className="truncate">
                          <strong className="text-neutral-300">Keyword:</strong> {br.triggerText ? `"${br.triggerText}"` : br.reason || 'Thematic match'}
                        </span>
                        {br.confidence !== undefined && (
                          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                            {Math.round(br.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: AUDIO MIXER & DUCKING */}
        {activeTab === 'audio' && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Audio Mixer & Ducking</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Balance dialogue, music, and SFX dynamics</p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-4">
              {/* Voice Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>Dialogue Voice Track</span>
                  <span className="font-mono text-amber-400">{voiceVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={voiceVolume}
                  onChange={(e) => setVoiceVolume(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Music Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>Background Music</span>
                  <span className="font-mono text-amber-400">{musicVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* SFX Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>Sound Effects</span>
                  <span className="font-mono text-amber-400">{sfxVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sfxVolume}
                  onChange={(e) => setSfxVolume(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Auto-Ducking Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                <div>
                  <div className="text-xs font-bold text-white">Smart Auto-Ducking (-12dB)</div>
                  <div className="text-[11px] text-neutral-400">Automatically lowers music during spoken dialogue</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoDucking}
                  onChange={(e) => setAutoDucking(e.target.checked)}
                  className="w-4 h-4 accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Royalty-Free Background Music Track */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-300">Viral Background Music</label>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: 'hype_trap', name: '⚡ Hype Trap Anthem', vibe: 'Energetic & Driving' },
                  { id: 'lofi_chill', name: '☕ Lo-Fi Warm Beats', vibe: 'Relaxed & Educational' },
                  { id: 'cinematic_pulse', name: '🎬 Cinematic Tension', vibe: 'Dramatic Storytelling' },
                  { id: 'tech_upbeat', name: '🚀 Modern Silicon', vibe: 'B2B & Startup Pitch' },
                ].map((track) => (
                  <button
                    key={track.id}
                    onClick={() => setSelectedMusic(track.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedMusic === track.id
                        ? 'bg-amber-400/10 border-amber-400 text-white shadow-sm'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{track.name}</div>
                      <div className="text-[10px] text-neutral-400">{track.vibe}</div>
                    </div>
                    {selectedMusic === track.id && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: SEO / TITLE & DESCRIPTION */}
        {activeTab === 'metadata' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Viral Title & SEO</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Optimized for TikTok, Reels, and Shorts algorithm</p>
              </div>

              <button
                onClick={() => copyMetadata(`${short.title}\n\n${short.description}\n\n${(short.hashtags || []).join(' ')}`)}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
              >
                {copiedTitle ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTitle ? 'Copied!' : 'Copy All'}</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-400">Viral Short Title</label>
                <div className="mt-1 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-semibold text-white">
                  {short.title}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400">Social Description</label>
                <div className="mt-1 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 leading-relaxed">
                  {short.description}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400">Targeted Hashtags</label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(short.hashtags || ['#shorts', '#viral', '#ai']).map((ht) => (
                    <span
                      key={ht}
                      className="text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-800 text-amber-300"
                    >
                      {ht}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
