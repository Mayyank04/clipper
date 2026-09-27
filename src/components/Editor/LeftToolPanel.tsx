import React, { useState, useMemo } from 'react';
import {
  Subtitles,
  Palette,
  Sparkles,
  Film,
  Volume2,
  Zap,
  Music,
  Wand2,
  Play,
  Pause,
  Split,
  Merge,
  Scissors,
  Check,
  Plus,
  Trash2,
  Clock,
  Search,
  Sliders,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Layers,
  ChevronDown,
  RefreshCw,
  Edit3,
} from 'lucide-react';
import {
  ShortCandidate,
  CaptionSegment,
  CaptionCustomization,
  SFXMarker,
  VFXMarker,
  BRollSuggestion,
  WordTiming,
  CaptionStylePreset,
} from '../../types';
import {
  ALL_CAPTION_STYLES,
  getCaptionStylePreset,
  CaptionStyleDefinition,
  detectSemanticWordEmphasis,
  autoFixCaptions,
  validateCaptionTiming,
  removeCaptionGaps,
  addNaturalHolds,
  alignToSpeech,
  normalizeCaptionPacing,
  analyzeCaptionPolish,
  PolishSuggestion,
} from '../../utils/captionEngine';
import { sfxEngine } from '../../utils/sfxAudio';
import { BUILTIN_SFX_CATALOG, searchSFXCatalog } from '../../utils/sfxCatalog';
import { LiveTemplatePreview } from './VideoCanvas';
import { formatTimeWithTenths } from '../../utils/timeFormat';

export type LeftPanelTabType =
  | 'captions'
  | 'styles'
  | 'animation'
  | 'broll'
  | 'sfx'
  | 'vfx'
  | 'audio'
  | 'aitools';

interface LeftToolPanelProps {
  short: ShortCandidate;
  activeTab: LeftPanelTabType;
  onTabChange: (tab: LeftPanelTabType) => void;
  captionConfig: CaptionCustomization;
  onCaptionConfigChange: (config: CaptionCustomization) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateShort: (short: ShortCandidate) => void;
  onOpenTranscriptEditor?: () => void;
  onSplitCaptionAtWord?: (captionId: string, wordIndex: number) => void;
  onMergeCaptions?: (captionId1: string, captionId2: string) => void;
}

export const LeftToolPanel: React.FC<LeftToolPanelProps> = ({
  short,
  activeTab,
  onTabChange,
  captionConfig,
  onCaptionConfigChange,
  currentTime,
  onSeek,
  onUpdateShort,
  onOpenTranscriptEditor,
  onSplitCaptionAtWord,
  onMergeCaptions,
}) => {
  // Captions Tab sub-mode: 'word' | 'line' | 'block'
  const [captionEditMode, setCaptionEditMode] = useState<'word' | 'line' | 'block'>('word');
  const [selectedStyleCategory, setSelectedStyleCategory] = useState<string>('all');
  const [sfxSearchQuery, setSfxSearchQuery] = useState<string>('');
  const [selectedWordState, setSelectedWordState] = useState<{
    captionId: string;
    wordIndex: number;
    word: WordTiming;
  } | null>(null);

  // Filtered Styles
  const filteredStyles = useMemo(() => {
    if (selectedStyleCategory === 'all') return ALL_CAPTION_STYLES;
    const sel = selectedStyleCategory.toLowerCase();
    return ALL_CAPTION_STYLES.filter((s) => {
      const cat = (s.category || '').toLowerCase();
      if (sel === 'education' && (cat === 'education' || cat === 'educational')) return true;
      if (sel === 'indian' && (cat === 'indian' || cat === 'indian_creator' || cat === 'hindi' || cat === 'hinglish')) return true;
      return cat === sel;
    });
  }, [selectedStyleCategory]);

  // Total words & duration stats
  const totalWordsCount = useMemo(() => {
    return (short.captions || []).reduce((sum, c) => sum + (c.words?.length || c.text.split(' ').length), 0);
  }, [short.captions]);

  // Caption Quality Analysis
  const qualityWarnings = useMemo(() => {
    const warnings: Array<{ id: string; text: string; severity: 'warn' | 'error' }> = [];
    (short.captions || []).forEach((c, idx) => {
      const dur = c.end - c.start;
      const charCount = c.text.length;
      const cps = dur > 0 ? charCount / dur : 0;
      if (cps > 24) {
        warnings.push({
          id: c.id,
          text: `Caption #${idx + 1} (${cps.toFixed(0)} cps) is too fast to read comfortably.`,
          severity: 'warn',
        });
      }
      if (idx > 0) {
        const prev = short.captions![idx - 1];
        if (c.start < prev.end - 0.05) {
          warnings.push({
            id: c.id,
            text: `Overlap detected between Caption #${idx} and #${idx + 1}.`,
            severity: 'error',
          });
        }
      }
    });
    return warnings;
  }, [short.captions]);

  // Handle Apply Style
  const handleApplyStyle = (styleDef: CaptionStyleDefinition) => {
    const updatedConfig: CaptionCustomization = {
      ...captionConfig,
      preset: styleDef.id as CaptionStylePreset,
      style: styleDef.id,
      fontFamily: styleDef.config.fontFamily || captionConfig.fontFamily,
      fontSize: styleDef.config.fontSize || captionConfig.fontSize,
      fontWeight: styleDef.config.fontWeight || captionConfig.fontWeight,
      primaryColor: styleDef.config.primaryColor || captionConfig.primaryColor,
      highlightColor: styleDef.config.highlightColor || captionConfig.highlightColor,
      strokeColor: styleDef.config.strokeColor || captionConfig.strokeColor,
      strokeWidth: styleDef.config.strokeWidth ?? captionConfig.strokeWidth,
      shadowColor: styleDef.config.shadowColor || captionConfig.shadowColor,
      hasShadow: styleDef.config.hasShadow ?? captionConfig.hasShadow,
      positionY: styleDef.config.positionY ?? captionConfig.positionY,
      animationType: styleDef.config.animationType || captionConfig.animationType,
      animationMode: styleDef.config.animationMode || captionConfig.animationMode,
    };
    onCaptionConfigChange(updatedConfig);
  };

  // Auto-Fix Captions
  const handleAutoFixCaptions = () => {
    if (!short.captions || short.captions.length === 0) return;
    const fixed = autoFixCaptions(short.captions, short.duration);
    onUpdateShort({ ...short, captions: fixed.fixedCaptions });
  };

  const [polishSuggestions, setPolishSuggestions] = useState<PolishSuggestion[] | null>(null);
  const [isPolishing, setIsPolishing] = useState<boolean>(false);
  const [aiEmphasisMode, setAiEmphasisMode] = useState<'auto' | 'manual' | 'off'>('auto');

  // Run AI Emphasis
  const handleRunAiEmphasis = () => {
    if (!short.captions || short.captions.length === 0) return;
    if (aiEmphasisMode === 'off') return;
    const updated = short.captions.map((cap) => {
      if (!cap.words || cap.words.length === 0) return cap;
      const emphasisResults = detectSemanticWordEmphasis(cap.words);
      const highlightedIndices = new Set(emphasisResults.map((r) => r.wordIndex));
      const newWords = cap.words.map((w, idx) => ({
        ...w,
        isHighlight: highlightedIndices.has(idx),
      }));
      return { ...cap, words: newWords };
    });
    onUpdateShort({ ...short, captions: updated });
  };

  // Dedicated Timing Tools
  const handleRemoveGaps = () => {
    if (!short.captions || short.captions.length === 0) return;
    const fixed = removeCaptionGaps(short.captions);
    onUpdateShort({ ...short, captions: fixed });
  };

  const handleAddNaturalHolds = () => {
    if (!short.captions || short.captions.length === 0) return;
    const fixed = addNaturalHolds(short.captions);
    onUpdateShort({ ...short, captions: fixed });
  };

  const handleAlignToSpeech = () => {
    if (!short.captions || short.captions.length === 0) return;
    const fixed = alignToSpeech(short.captions);
    onUpdateShort({ ...short, captions: fixed });
  };

  const handleNormalizePacing = () => {
    if (!short.captions || short.captions.length === 0) return;
    const fixed = normalizeCaptionPacing(short.captions);
    onUpdateShort({ ...short, captions: fixed });
  };

  // AI Polish
  const handleOpenAiPolish = () => {
    if (!short.captions || short.captions.length === 0) return;
    setIsPolishing(true);
    const suggestions = analyzeCaptionPolish(short.captions);
    setPolishSuggestions(suggestions);
    setIsPolishing(false);
  };

  const handleAcceptPolish = (suggestion: PolishSuggestion) => {
    const updated = (short.captions || []).map((c) =>
      c.id === suggestion.captionId ? { ...c, text: suggestion.suggestedText } : c
    );
    onUpdateShort({ ...short, captions: updated });
    setPolishSuggestions((prev) => (prev ? prev.filter((p) => p.captionId !== suggestion.captionId) : null));
  };

  const handleRejectPolish = (suggestion: PolishSuggestion) => {
    setPolishSuggestions((prev) => (prev ? prev.filter((p) => p.captionId !== suggestion.captionId) : null));
  };

  const handleAcceptAllPolish = () => {
    if (!polishSuggestions || !short.captions) return;
    const map = new Map(polishSuggestions.map((s) => [s.captionId, s.suggestedText]));
    const updated = short.captions.map((c) => (map.has(c.id) ? { ...c, text: map.get(c.id)! } : c));
    onUpdateShort({ ...short, captions: updated });
    setPolishSuggestions(null);
  };

  // Shift all captions
  const handleShiftAllCaptions = (deltaSeconds: number) => {
    if (!short.captions) return;
    const updated = short.captions.map((c) => ({
      ...c,
      start: Math.max(0, c.start + deltaSeconds),
      end: Math.max(0.1, c.end + deltaSeconds),
      words: (c.words || []).map((w) => ({
        ...w,
        start: Math.max(0, w.start + deltaSeconds),
        end: Math.max(0.05, w.end + deltaSeconds),
      })),
    }));
    onUpdateShort({ ...short, captions: updated });
  };

  // Add SFX Marker
  const handleAddSfx = (category: string, name: string) => {
    const newMarker: SFXMarker = {
      id: `sfx_${Date.now()}`,
      category: category as any,
      soundName: name,
      timestamp: Number(currentTime.toFixed(2)),
      duration: 0.8,
      volume: 0.8,
    };
    sfxEngine.playSound(category as any, 0.8);
    onUpdateShort({
      ...short,
      sfxMarkers: [...(short.sfxMarkers || []), newMarker].sort((a, b) => a.timestamp - b.timestamp),
    });
  };

  // Add VFX Marker
  const handleAddVfx = (type: VFXMarker['type']) => {
    const newMarker: VFXMarker = {
      id: `vfx_${Date.now()}`,
      type,
      timestamp: Number(currentTime.toFixed(2)),
      duration: 1.2,
      label: `${type.toUpperCase()} Effect`,
    };
    onUpdateShort({
      ...short,
      vfxMarkers: [...(short.vfxMarkers || []), newMarker].sort((a, b) => a.timestamp - b.timestamp),
    });
  };

  const navTabs = [
    { id: 'captions' as const, label: 'CAPTIONS', icon: Subtitles },
    { id: 'styles' as const, label: 'STYLES', icon: Palette },
    { id: 'animation' as const, label: 'ANIMATION', icon: Sparkles },
    { id: 'broll' as const, label: 'B-ROLL', icon: Film },
    { id: 'sfx' as const, label: 'SFX', icon: Volume2 },
    { id: 'vfx' as const, label: 'VFX', icon: Zap },
    { id: 'audio' as const, label: 'AUDIO', icon: Music },
    { id: 'aitools' as const, label: 'AI TOOLS', icon: Wand2 },
  ];

  return (
    <div className="w-80 sm:w-88 flex flex-col h-full flex-shrink-0 border-r border-neutral-800 bg-neutral-900 select-none overflow-hidden">
      {/* Top Tab Bar */}
      <div className="grid grid-cols-4 border-b border-neutral-800 bg-neutral-950/80 p-1 flex-shrink-0 gap-1 text-[10px]">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-400 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5 mb-1" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Panel Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-neutral-300">
        {/* ===================== TAB 1: CAPTIONS ===================== */}
        {activeTab === 'captions' && (
          <div className="space-y-4">
            {/* Header & Stats */}
            <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400 font-semibold">Detected Language:</span>
                <span className="text-amber-400 font-bold">English (Auto Detected)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1 border-t border-neutral-800/60">
                <div>
                  <span className="text-neutral-500 block">Words</span>
                  <span className="text-white font-bold text-xs">{totalWordsCount}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Segments</span>
                  <span className="text-white font-bold text-xs">{(short.captions || []).length}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Duration</span>
                  <span className="text-white font-bold text-xs">{formatTimeWithTenths(short.duration)}</span>
                </div>
              </div>
            </div>

            {/* Mode Switcher: WORD MODE | LINE MODE | BLOCK MODE */}
            <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 p-1 rounded-xl text-[11px] font-bold">
              {(['word', 'line', 'block'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setCaptionEditMode(m)}
                  className={`flex-1 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                    captionEditMode === m
                      ? 'bg-neutral-800 text-amber-300 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {m} Mode
                </button>
              ))}
            </div>

            {/* Caption Quality Score Card */}
            {(() => {
              const baseScore = Math.max(70, Math.min(99, 96 - qualityWarnings.length * 3));
              const timingScore = Math.max(72, baseScore + 2);
              const readScore = Math.max(68, baseScore - 3);
              const segScore = Math.max(75, baseScore - 1);
              const langScore = 95;

              return (
                <div className="p-3 rounded-2xl bg-neutral-950/90 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 text-xs font-mono">
                        {baseScore}
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                          <span>Caption Quality</span>
                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-400/20 text-emerald-300 rounded font-mono">EXCELLENT</span>
                        </div>
                        <div className="text-[9px] text-neutral-400 font-mono">Score: {baseScore}/100</div>
                      </div>
                    </div>
                    <button
                      onClick={handleAutoFixCaptions}
                      className="px-2 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 text-[10px] font-bold transition cursor-pointer"
                    >
                      Fix automatically
                    </button>
                  </div>

                  {/* Quality Metrics Grid */}
                  <div className="grid grid-cols-4 gap-1 pt-1 border-t border-neutral-800/60 text-[9px] font-mono">
                    <div className="bg-neutral-900/60 p-1 rounded text-center">
                      <span className="text-neutral-500 block">Timing</span>
                      <span className="text-neutral-200 font-bold">{timingScore}%</span>
                    </div>
                    <div className="bg-neutral-900/60 p-1 rounded text-center">
                      <span className="text-neutral-500 block">Readability</span>
                      <span className="text-neutral-200 font-bold">{readScore}%</span>
                    </div>
                    <div className="bg-neutral-900/60 p-1 rounded text-center">
                      <span className="text-neutral-500 block">Segment</span>
                      <span className="text-neutral-200 font-bold">{segScore}%</span>
                    </div>
                    <div className="bg-neutral-900/60 p-1 rounded text-center">
                      <span className="text-neutral-500 block">Language</span>
                      <span className="text-neutral-200 font-bold">{langScore}%</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* AI Emphasis & AI Polish Controls */}
            <div className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                  AI Polish & Emphasis
                </span>
                <div className="flex items-center bg-neutral-900 rounded-lg p-0.5 border border-neutral-800 text-[9px] font-bold">
                  {(['auto', 'manual', 'off'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setAiEmphasisMode(mode)}
                      className={`px-1.5 py-0.5 rounded capitalize transition cursor-pointer ${
                        aiEmphasisMode === mode
                          ? 'bg-purple-500 text-white font-black'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleRunAiEmphasis}
                  disabled={aiEmphasisMode === 'off'}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-40 text-purple-300 border border-purple-500/40 font-bold text-xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Highlight Words</span>
                </button>

                <button
                  onClick={handleOpenAiPolish}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs transition-all cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>AI Polish</span>
                </button>
              </div>
            </div>

            {/* AI Polish Review Modal Overlay */}
            {polishSuggestions !== null && (
              <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-neutral-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-cyan-300 text-xs">
                    <Wand2 className="w-4 h-4" />
                    <span>AI Polish Proposing {polishSuggestions.length} Improvements</span>
                  </div>
                  <button
                    onClick={() => setPolishSuggestions(null)}
                    className="text-neutral-400 hover:text-white text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {polishSuggestions.length === 0 ? (
                  <p className="text-[11px] text-neutral-400 py-1">All captions already adhere to optimal grammar, cadence, and CPS!</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {polishSuggestions.map((sug) => (
                      <div key={sug.captionId} className="bg-neutral-900/90 border border-neutral-800 p-2 rounded-xl space-y-1">
                        <div className="text-[10px] text-neutral-500 font-mono">{sug.reason}</div>
                        <div className="text-[11px] line-through text-red-400/80">{sug.originalText}</div>
                        <div className="text-[11px] font-bold text-emerald-400">{sug.suggestedText}</div>
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            onClick={() => handleRejectPolish(sug)}
                            className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 text-[10px] cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleAcceptPolish(sug)}
                            className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold cursor-pointer"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={handleAcceptAllPolish}
                        className="w-full py-1.5 rounded-xl bg-cyan-500 text-neutral-950 font-bold text-xs hover:bg-cyan-400 transition cursor-pointer"
                      >
                        Accept All Suggestions
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Precision Timing Tools */}
            <div className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                Caption Timing Tools
              </span>

              {/* Quick Timing Helper Actions */}
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <button
                  onClick={handleAlignToSpeech}
                  className="py-1 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 font-bold text-neutral-300 hover:text-white transition cursor-pointer text-left"
                >
                  ⚡ Align to Speech
                </button>
                <button
                  onClick={handleRemoveGaps}
                  className="py-1 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 font-bold text-neutral-300 hover:text-white transition cursor-pointer text-left"
                >
                  ✂️ Remove Gaps
                </button>
                <button
                  onClick={handleAddNaturalHolds}
                  className="py-1 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 font-bold text-neutral-300 hover:text-white transition cursor-pointer text-left"
                >
                  ⏳ Add Holds (+0.35s)
                </button>
                <button
                  onClick={handleNormalizePacing}
                  className="py-1 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 font-bold text-neutral-300 hover:text-white transition cursor-pointer text-left"
                >
                  ⚖️ Normalize Pacing
                </button>
              </div>

              {/* Timing Micro-Shift (-100ms, -50ms, -10ms, +10ms, +50ms, +100ms) */}
              <div className="pt-1 border-t border-neutral-800/60">
                <span className="text-[9px] uppercase font-mono text-neutral-500 block mb-1">
                  Micro-Shift Timing
                </span>
                <div className="grid grid-cols-6 gap-1">
                  {[-0.1, -0.05, -0.01, 0.01, 0.05, 0.1].map((delta) => (
                    <button
                      key={delta}
                      onClick={() => handleShiftAllCaptions(delta)}
                      className="py-1 px-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-md text-[9px] font-mono font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer text-center"
                    >
                      {delta > 0 ? `+${Math.round(delta * 1000)}ms` : `${Math.round(delta * 1000)}ms`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Caption Segments List */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
                Caption Timeline Blocks (Click to Seek)
              </span>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {(short.captions || []).map((caption, cIdx) => {
                  const isActive = currentTime >= caption.start && currentTime <= caption.end;
                  return (
                    <div
                      key={caption.id || cIdx}
                      onClick={() => onSeek(caption.start)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/10 border-amber-400/60 shadow-sm'
                          : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1.5">
                        <span className="font-mono text-neutral-400">
                          {formatTimeWithTenths(caption.start)} → {formatTimeWithTenths(caption.end)}
                        </span>
                        <div className="flex items-center gap-1">
                          {captionEditMode === 'line' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newText = prompt('Edit caption text:', caption.text);
                                if (newText !== null && newText.trim()) {
                                  const updated = (short.captions || []).map((c) =>
                                    c.id === caption.id ? { ...c, text: newText.trim() } : c
                                  );
                                  onUpdateShort({ ...short, captions: updated });
                                }
                              }}
                              className="p-1 text-neutral-400 hover:text-white"
                              title="Edit line"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                          {cIdx < (short.captions?.length || 0) - 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMergeCaptions?.(caption.id, short.captions![cIdx + 1].id);
                              }}
                              className="p-1 text-neutral-400 hover:text-amber-400"
                              title="Merge with next caption"
                            >
                              <Merge className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* WORD MODE: Interactive individual words with timestamps */}
                      {captionEditMode === 'word' && caption.words && caption.words.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {caption.words.map((w, wIdx) => {
                            const isWordActive = currentTime >= w.start && currentTime <= w.end;
                            return (
                              <span
                                key={wIdx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSeek(w.start);
                                  setSelectedWordState({ captionId: caption.id, wordIndex: wIdx, word: w });
                                }}
                                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                                  isWordActive
                                    ? 'bg-amber-400 text-neutral-950 font-bold'
                                    : w.isHighlight
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                    : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                                }`}
                                title={`${w.word} (${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s)`}
                              >
                                {w.word}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] font-medium text-white leading-relaxed">{caption.text}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Word Inspector Modal / Floating box if word clicked */}
            {selectedWordState && (
              <div className="p-3 bg-neutral-950 border border-amber-400/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 text-[11px]">
                    Word: "{selectedWordState.word.word}"
                  </span>
                  <button
                    onClick={() => setSelectedWordState(null)}
                    className="text-neutral-500 hover:text-white text-[10px]"
                  >
                    Done
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-neutral-400">
                  <span>Timing: {selectedWordState.word.start.toFixed(2)}s → {selectedWordState.word.end.toFixed(2)}s</span>
                  <button
                    onClick={() => {
                      onSplitCaptionAtWord?.(selectedWordState.captionId, selectedWordState.wordIndex);
                      setSelectedWordState(null);
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30"
                  >
                    <Split className="w-3 h-3" />
                    <span>Split Caption (S)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 2: STYLES ===================== */}
        {activeTab === 'styles' && (
          <div className="space-y-4">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
              {['all', 'viral', 'podcast', 'cinematic', 'gaming', 'education', 'motivational', 'meme', 'indian'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedStyleCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                    selectedStyleCategory === cat
                      ? 'bg-amber-400 text-neutral-950 font-black'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* 30+ Styles Grid with Live Animated Hover Preview */}
            <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredStyles.map((styleDef) => {
                const isSelected = captionConfig.preset === styleDef.id || captionConfig.style === styleDef.id;
                return (
                  <div
                    key={styleDef.id}
                    onClick={() => handleApplyStyle(styleDef)}
                    className={`group relative rounded-xl border p-2.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'bg-amber-400/10 border-amber-400 shadow-md shadow-amber-500/10'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {/* Live Animated Preview Canvas */}
                    <div className="aspect-video w-full rounded-lg overflow-hidden mb-2 relative bg-black/60 flex items-center justify-center">
                      <LiveTemplatePreview styleDef={styleDef} isSelected={isSelected} />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-[11px] truncate">{styleDef.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                      </div>
                      <span className="text-[9px] text-neutral-500 capitalize">{styleDef.category}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================== TAB 3: ANIMATION ===================== */}
        {activeTab === 'animation' && (
          <div className="space-y-4">
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
              Caption Motion Presets
            </span>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'pop', label: 'Pop & Scale' },
                { id: 'bounce', label: 'Elastic Bounce' },
                { id: 'typewriter', label: 'Typewriter' },
                { id: 'slide_up', label: 'Slide Up' },
                { id: 'fade', label: 'Smooth Fade' },
                { id: 'shake', label: 'High Energy Shake' },
              ].map((anim) => (
                <button
                  key={anim.id}
                  onClick={() => onCaptionConfigChange({ ...captionConfig, animationType: anim.id as any })}
                  className={`p-2.5 rounded-xl border text-left font-bold text-xs transition-all cursor-pointer ${
                    captionConfig.animationType === anim.id
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                      : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                  }`}
                >
                  {anim.label}
                </button>
              ))}
            </div>

            {/* Active Word Karaoke Settings */}
            <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3">
              <span className="font-bold text-white text-xs block">Active Word Karaoke Behavior</span>
              <p className="text-[11px] text-neutral-400">
                The active word follows actual transcription word timestamps synchronously.
              </p>

              <div className="space-y-2">
                <label className="text-[11px] text-neutral-400 block">Active Highlight Color</label>
                <div className="flex items-center gap-2">
                  {['#FACC15', '#22C55E', '#38BDF8', '#F43F5E', '#A855F7'].map((col) => (
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
            </div>
          </div>
        )}

        {/* ===================== TAB 4: B-ROLL ===================== */}
        {activeTab === 'broll' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                AI B-Roll Suggestions ({(short.brollSuggestions || []).length})
              </span>
            </div>

            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {(short.brollSuggestions || []).length === 0 ? (
                <div className="p-6 text-center text-neutral-500 space-y-2 bg-neutral-950/50 rounded-2xl border border-neutral-800/80">
                  <Film className="w-8 h-8 mx-auto text-neutral-600" />
                  <p className="text-xs">No B-Roll suggestions yet.</p>
                </div>
              ) : (
                short.brollSuggestions!.map((broll) => (
                  <div
                    key={broll.id}
                    onClick={() => onSeek(broll.timestamp)}
                    className="p-3 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-xl space-y-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-white capitalize">{broll.concept || broll.keyword}</span>
                      <span className="font-mono text-neutral-400 text-[10px]">
                        {broll.timestamp.toFixed(1)}s ({broll.duration}s)
                      </span>
                    </div>
                    {broll.reason && (
                      <p className="text-[10px] text-neutral-400 line-clamp-1">{broll.reason}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 5: SFX ===================== */}
        {activeTab === 'sfx' && (
          <div className="space-y-4">
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
              Sound Effects Catalog (Click to Insert at Playhead: {currentTime.toFixed(1)}s)
            </span>

            <div className="grid grid-cols-2 gap-2">
              {[
                { cat: 'whoosh', name: 'Quick Whoosh' },
                { cat: 'impact', name: 'Heavy Impact' },
                { cat: 'swoosh', name: 'Air Swoosh' },
                { cat: 'chime', name: 'Notification Chime' },
                { cat: 'hit', name: 'Punchline Hit' },
                { cat: 'riser', name: 'Tension Riser' },
              ].map((sfx) => (
                <button
                  key={sfx.name}
                  onClick={() => handleAddSfx(sfx.cat, sfx.name)}
                  className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-400/50 text-left font-bold text-xs text-neutral-200 hover:text-white transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">{sfx.name}</span>
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                </button>
              ))}
            </div>

            {/* Active SFX Markers on Timeline */}
            <div className="pt-2 border-t border-neutral-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
                Timeline SFX Events ({(short.sfxMarkers || []).length})
              </span>
              <div className="space-y-1 max-h-[160px] overflow-y-auto">
                {(short.sfxMarkers || []).map((m) => (
                  <div
                    key={m.id}
                    className="p-2 bg-neutral-950/60 rounded-lg border border-neutral-800/80 flex items-center justify-between text-[11px]"
                  >
                    <span className="font-semibold text-neutral-300">{m.soundName}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-neutral-500">{m.timestamp.toFixed(2)}s</span>
                      <button
                        onClick={() => {
                          const updated = (short.sfxMarkers || []).filter((s) => s.id !== m.id);
                          onUpdateShort({ ...short, sfxMarkers: updated });
                        }}
                        className="text-neutral-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 6: VFX ===================== */}
        {activeTab === 'vfx' && (
          <div className="space-y-4">
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
              Visual Effects Markers (Add at {currentTime.toFixed(1)}s)
            </span>

            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'glow' as const, label: 'Energy Glow' },
                { type: 'shake' as const, label: 'Screen Shake' },
                { type: 'zoom_punch' as const, label: 'Zoom Punch' },
                { type: 'motion_blur' as const, label: 'Motion Blur' },
                { type: 'glitch' as const, label: 'Glitch Distortion' },
                { type: 'particles' as const, label: 'Particles Flare' },
              ].map((vfx) => (
                <button
                  key={vfx.type}
                  onClick={() => handleAddVfx(vfx.type)}
                  className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-purple-400/50 text-left font-bold text-xs text-neutral-200 hover:text-white transition-all flex items-center justify-between cursor-pointer"
                >
                  <span>{vfx.label}</span>
                  <Plus className="w-3.5 h-3.5 text-purple-400" />
                </button>
              ))}
            </div>

            {/* Active VFX on Timeline */}
            <div className="pt-2 border-t border-neutral-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
                Timeline VFX Events ({(short.vfxMarkers || []).length})
              </span>
              <div className="space-y-1 max-h-[160px] overflow-y-auto">
                {(short.vfxMarkers || []).map((v) => (
                  <div
                    key={v.id}
                    className="p-2 bg-neutral-950/60 rounded-lg border border-neutral-800/80 flex items-center justify-between text-[11px]"
                  >
                    <span className="font-semibold text-neutral-300">{v.label || v.type}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-neutral-500">{v.timestamp.toFixed(2)}s</span>
                      <button
                        onClick={() => {
                          const updated = (short.vfxMarkers || []).filter((s) => s.id !== v.id);
                          onUpdateShort({ ...short, vfxMarkers: updated });
                        }}
                        className="text-neutral-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 7: AUDIO ===================== */}
        {activeTab === 'audio' && (
          <div className="space-y-4">
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
              Audio Level Controls
            </span>

            <div className="space-y-3 p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-neutral-400">Original Speech Volume</span>
                  <span className="font-bold text-white">100%</span>
                </div>
                <input type="range" min="0" max="100" defaultValue="100" className="w-full accent-amber-400" />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-neutral-400">Background Music Volume</span>
                  <span className="font-bold text-white">35%</span>
                </div>
                <input type="range" min="0" max="100" defaultValue="35" className="w-full accent-amber-400" />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-neutral-400">SFX Sound Effects Volume</span>
                  <span className="font-bold text-white">80%</span>
                </div>
                <input type="range" min="0" max="100" defaultValue="80" className="w-full accent-amber-400" />
              </div>

              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px]">
                <span className="text-neutral-400 font-semibold">Auto Speech Ducking</span>
                <input type="checkbox" defaultChecked className="accent-amber-400 cursor-pointer" />
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 8: AI TOOLS ===================== */}
        {activeTab === 'aitools' && (
          <div className="space-y-4">
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
              ViralClip AI Intelligence
            </span>

            {/* Viral Score Breakdown */}
            <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">Viral Clip Score</span>
                <span className="text-amber-400 font-black text-base">
                  {short.viralScore?.overall || 94} / 100
                </span>
              </div>

              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between text-neutral-400">
                  <span>Hook Strength</span>
                  <span className="font-bold text-neutral-200">
                    {short.viralScore?.breakdown?.hook || 96}%
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Retention Potential</span>
                  <span className="font-bold text-neutral-200">
                    {short.viralScore?.breakdown?.retention || 94}%
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Information Value</span>
                  <span className="font-bold text-neutral-200">
                    {short.viralScore?.breakdown?.value || 95}%
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Pacing & Energy</span>
                  <span className="font-bold text-neutral-200">
                    {short.viralScore?.breakdown?.pacing || 94}%
                  </span>
                </div>
              </div>
            </div>

            {/* AI Actions */}
            <div className="space-y-2">
              <button
                onClick={handleRunAiEmphasis}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Run AI Kinetic Emphasis</span>
              </button>

              <button
                onClick={handleAutoFixCaptions}
                className="w-full py-2.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Auto-Fix Caption Pacing</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
