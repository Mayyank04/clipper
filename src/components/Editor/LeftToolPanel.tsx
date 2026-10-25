import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Star,
  Download,
  Upload,
  Bookmark,
  X,
  FolderDown,
  FileText,
} from 'lucide-react';
import { CaptionPresetImporterModal } from './CaptionPresetImporterModal';
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
import { CREATOR_PRESETS_80, PRESET_CATEGORIES_20 } from '../../data/creatorPresets80';
import {
  getFavorites,
  toggleFavorite,
  getRecentlyUsed,
  addRecentlyUsed,
  getCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  exportPresetsJson,
  importPresetsJson,
} from '../../utils/customPresetsManager';
import { sfxEngine } from '../../utils/sfxAudio';
import { BUILTIN_SFX_CATALOG, searchSFXCatalog } from '../../utils/sfxCatalog';
import { SFX_LIBRARY, SFXDefinition } from '../../data/sfxLibrary';
import { VFX_LIBRARY, VFXDefinition } from '../../data/vfxLibrary';
import { generateAutoEditPlan, EditIntensity } from '../../utils/autoEditEngine';
import { LiveTemplatePreview } from './VideoCanvas';
import { formatTimeWithTenths } from '../../utils/timeFormat';
import { findTopHookCandidates, CandidateShort } from '../../utils/hookFinder';

export type LeftPanelTabType =
  | 'captions'
  | 'styles'
  | 'animation'
  | 'broll'
  | 'sfx'
  | 'vfx'
  | 'audio'
  | 'aitools'
  | 'transcription'
  | 'hooks';

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
  const [presetSearch, setPresetSearch] = useState<string>('');
  const [favoritesList, setFavoritesList] = useState<string[]>(() => getFavorites());
  const [recentlyUsedList, setRecentlyUsedList] = useState<string[]>(() => getRecentlyUsed());
  const [customPresetsList, setCustomPresetsList] = useState<CaptionStyleDefinition[]>(() => getCustomPresets());
  const [showSavePresetModal, setShowSavePresetModal] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [sfxSearchQuery, setSfxSearchQuery] = useState<string>('');
  const [sfxCategoryFilter, setSfxCategoryFilter] = useState<string>('all');
  const [vfxCategoryFilter, setVfxCategoryFilter] = useState<string>('ALL');
  const [vfxSearchTerm, setVfxSearchTerm] = useState<string>('');
  const [editIntensity, setEditIntensity] = useState<EditIntensity>('balanced');
  const [autoCaptionsEnabled, setAutoCaptionsEnabled] = useState<boolean>(true);
  const [autoBRollEnabled, setAutoBRollEnabled] = useState<boolean>(true);
  const [autoSFXEnabled, setAutoSFXEnabled] = useState<boolean>(true);
  const [autoVFXEnabled, setAutoVFXEnabled] = useState<boolean>(true);
  const [autoReframeEnabled, setAutoReframeEnabled] = useState<boolean>(true);
  const [autoAudioEnabled, setAutoAudioEnabled] = useState<boolean>(true);
  const [autoEditMessage, setAutoEditMessage] = useState<string | null>(null);
  const [selectedWordState, setSelectedWordState] = useState<{
    captionId: string;
    wordIndex: number;
    word: WordTiming;
  } | null>(null);

  // Transcription & Hook Detection State
  const [transcriptSearch, setTranscriptSearch] = useState<string>('');
  const [transcriptReplace, setTranscriptReplace] = useState<string>('');
  const [hookFilterCategory, setHookFilterCategory] = useState<string>('all');

  const hookCandidates = useMemo(() => {
    try {
      const segments = short.captions || [];
      return findTopHookCandidates(segments, short.duration || 30, 8, 10, 60);
    } catch {
      return [];
    }
  }, [short]);

  // Google Drive & Imported Presets State (Phases 1, 16, 17)
  const [importedPresetsList, setImportedPresetsList] = useState<CaptionStyleDefinition[]>([]);
  const [showDriveImporterModal, setShowDriveImporterModal] = useState<boolean>(false);

  const fetchImportedPresets = useCallback(async () => {
    try {
      const res = await fetch('/api/caption-import/presets');
      const data = await res.json();
      if (data.success && Array.isArray(data.presets)) {
        const mapped: CaptionStyleDefinition[] = data.presets.map((p: any) => ({
          id: p.id,
          name: p.name,
          desc: p.presetJson?.desc || `Imported ${p.category} preset`,
          category: (p.category || 'imported').toLowerCase() as any,
          config: p.presetJson?.config || {
            style: p.id,
            preset: p.id,
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 34,
            fontWeight: 800,
            primaryColor: '#FFFFFF',
            highlightColor: '#FACC15',
            strokeColor: '#000000',
            strokeWidth: 4.0,
            hasShadow: true,
            positionY: 72,
            animationType: 'pop',
            animationMode: 'POP_WORD',
          },
        }));
        setImportedPresetsList(mapped);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchImportedPresets();
  }, [fetchImportedPresets]);

  const handleApplyImportedPreset = (presetRecord: any) => {
    const styleDef: CaptionStyleDefinition = {
      id: presetRecord.id,
      name: presetRecord.name,
      desc: presetRecord.presetJson?.desc || 'Imported Preset',
      category: (presetRecord.category || 'imported').toLowerCase() as any,
      config: presetRecord.presetJson?.config || captionConfig,
    };
    handleApplyStyle(styleDef);
  };

  // All Available Presets (Builtin 85 + Custom + Imported)
  const allAvailablePresets = useMemo(() => {
    return [...customPresetsList, ...importedPresetsList, ...CREATOR_PRESETS_80];
  }, [customPresetsList, importedPresetsList]);

  // Filtered Styles
  const filteredStyles = useMemo(() => {
    let list = allAvailablePresets;
    const cat = selectedStyleCategory.toLowerCase();

    if (cat === 'favorites') {
      list = list.filter((p) => favoritesList.includes(p.id));
    } else if (cat === 'recent') {
      list = list.filter((p) => recentlyUsedList.includes(p.id));
      list.sort((a, b) => recentlyUsedList.indexOf(a.id) - recentlyUsedList.indexOf(b.id));
    } else if (cat === 'custom') {
      list = list.filter((p) => p.category === 'custom');
    } else if (cat === 'imported') {
      list = list.filter((p) => importedPresetsList.some((ip) => ip.id === p.id));
    } else if (cat !== 'all') {
      list = list.filter((p) => {
        const pCat = (p.category || '').toLowerCase();
        if (cat === 'indian') return pCat === 'indian' || pCat === 'hindi' || pCat === 'hinglish';
        return pCat === cat || pCat.includes(cat);
      });
    }

    if (presetSearch.trim()) {
      const q = presetSearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.desc && p.desc.toLowerCase().includes(q)) ||
          (p.config.fontFamily && p.config.fontFamily.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allAvailablePresets, selectedStyleCategory, favoritesList, recentlyUsedList, presetSearch]);

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

  // Handle Apply Style (instantly updates config & records to recently used)
  const handleApplyStyle = (styleDef: CaptionStyleDefinition) => {
    const updatedConfig: CaptionCustomization = {
      ...captionConfig,
      ...styleDef.config,
      preset: styleDef.id as CaptionStylePreset,
      style: styleDef.id,
    };
    onCaptionConfigChange(updatedConfig);
    const updatedRecent = addRecentlyUsed(styleDef.id);
    setRecentlyUsedList(updatedRecent);
  };

  const handleToggleFavorite = (presetId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = toggleFavorite(presetId);
    setFavoritesList(updated);
  };

  const handleSaveCurrentPreset = () => {
    if (!newPresetName.trim()) return;
    saveCustomPreset(newPresetName, captionConfig);
    setCustomPresetsList(getCustomPresets());
    setNewPresetName('');
    setShowSavePresetModal(false);
    setSelectedStyleCategory('custom');
  };

  const handleDeleteCustomPreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteCustomPreset(presetId);
    setCustomPresetsList(updated);
  };

  const handleExportPresetsJson = () => {
    const jsonStr = exportPresetsJson(customPresetsList.length > 0 ? customPresetsList : CREATOR_PRESETS_80.slice(0, 10));
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viralclip_presets_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPresetsJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = importPresetsJson(content);
        setCustomPresetsList(imported);
        setSelectedStyleCategory('custom');
      } catch (err: any) {
        alert(err.message || 'Failed to import presets JSON');
      }
    };
    reader.readAsText(file);
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

  const handlePlaySfxPreview = (file: string) => {
    try {
      const audio = new Audio(file);
      audio.volume = 0.8;
      audio.play().catch((e) => console.warn('[SFX Preview] Play error:', e));
    } catch (e) {
      console.warn('[SFX Preview] Exception:', e);
    }
  };

  // Add SFX Marker
  const handleAddSfx = (category: string, name: string, file?: string, reason?: string) => {
    const sfxAsset = SFX_LIBRARY.find((s) => s.name === name || s.id === name);
    const audioUrl = file || sfxAsset?.file || `/assets/sfx/${category}.wav`;
    const newMarker: SFXMarker = {
      id: `sfx_${Date.now()}`,
      category: category as any,
      soundName: name,
      timestamp: Number(currentTime.toFixed(2)),
      duration: sfxAsset?.duration || 0.8,
      volume: 0.8,
      audioUrl,
      reason: reason || 'Manually placed sound effect',
      confidence: 1.0,
      source: 'library',
    };
    handlePlaySfxPreview(audioUrl);
    onUpdateShort({
      ...short,
      sfxMarkers: [...(short.sfxMarkers || []), newMarker].sort((a, b) => a.timestamp - b.timestamp),
    });
  };

  // Add VFX Marker
  const handleAddVfx = (type: VFXMarker['type'], label?: string, reason?: string) => {
    const vfxDef = VFX_LIBRARY.find((v) => v.type === type || v.id === type);
    const newMarker: VFXMarker = {
      id: `vfx_${Date.now()}`,
      type,
      timestamp: Number(currentTime.toFixed(2)),
      duration: vfxDef?.duration || 1.2,
      label: label || vfxDef?.name || `${type.toUpperCase()} Effect`,
      intensity: vfxDef?.intensity || 6,
      reason: reason || 'Manually placed visual effect',
      confidence: 1.0,
    };
    onUpdateShort({
      ...short,
      vfxMarkers: [...(short.vfxMarkers || []), newMarker].sort((a, b) => a.timestamp - b.timestamp),
    });
  };

  // Master Auto Edit Handler
  const handleMasterAutoEdit = () => {
    const transcriptSegs = short.captions || (short as any).sentences || [];
    const plan = generateAutoEditPlan(short, transcriptSegs, {
      intensity: editIntensity,
      enableSFX: autoSFXEnabled,
      enableVFX: autoVFXEnabled,
      enableBRoll: autoBRollEnabled,
      enableAutoReframe: autoReframeEnabled,
      enableAudioEnhance: autoAudioEnabled,
    });
    onUpdateShort(plan.short);
    setAutoEditMessage(plan.summary);
  };

  const handleResetAutoEdit = () => {
    onUpdateShort({
      ...short,
      sfxMarkers: [],
      vfxMarkers: [],
      brollSuggestions: [],
    });
    setAutoEditMessage('Reset: Cleared all AI-generated SFX, VFX, and B-Roll markers.');
  };

  const navTabs = [
    { id: 'captions' as const, label: 'CAPTIONS', icon: Subtitles },
    { id: 'styles' as const, label: 'STYLES', icon: Palette },
    { id: 'animation' as const, label: 'ANIM', icon: Sparkles },
    { id: 'broll' as const, label: 'B-ROLL', icon: Film },
    { id: 'sfx' as const, label: 'SFX', icon: Volume2 },
    { id: 'vfx' as const, label: 'VFX', icon: Zap },
    { id: 'audio' as const, label: 'AUDIO', icon: Music },
    { id: 'aitools' as const, label: 'AI TOOLS', icon: Wand2 },
    { id: 'transcription' as const, label: 'TRANSCRIPT', icon: FileText },
    { id: 'hooks' as const, label: 'HOOKS', icon: Flame },
  ];

  return (
    <div className="w-80 sm:w-88 flex flex-col h-full flex-shrink-0 border-r border-neutral-800 bg-neutral-900 select-none overflow-hidden">
      {/* Top Tab Bar */}
      <div className="grid grid-cols-5 border-b border-neutral-800 bg-neutral-950/80 p-1 flex-shrink-0 gap-1 text-[9px]">
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
                <span className="text-amber-400 font-bold capitalize">
                  {typeof short.language === 'string'
                    ? short.language
                    : (short.language as any)?.language || short.detectedLanguage || 'Auto Detected'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px] pt-1 border-t border-neutral-800/60">
                <div>
                  <span className="text-neutral-500 block">Words</span>
                  <span className="text-white font-bold text-xs">{totalWordsCount}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Segments</span>
                  <span className="text-white font-bold text-xs">{(short.captions || []).length}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Coverage</span>
                  <span className="text-white font-bold text-xs">
                    {short.speechCoverage ? `${Math.round(short.speechCoverage * 100)}%` : '95%'}
                  </span>
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
          <div className="space-y-3.5">
            {/* Search and Manage Presets Bar */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search 85+ creator styles, fonts, tags..."
                  value={presetSearch}
                  onChange={(e) => setPresetSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                />
                {presetSearch && (
                  <button
                    onClick={() => setPresetSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Google Drive Caption Preset Importer CTA Button */}
              <button
                onClick={() => setShowDriveImporterModal(true)}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-neutral-950 font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20"
              >
                <FolderDown className="w-4 h-4" />
                <span>+ Import Preset Pack</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-950/20 font-mono">
                  Drive & Local
                </span>
              </button>

              {/* Quick Actions (Save Current, Export, Import) */}
              <div className="flex items-center justify-between text-[11px]">
                <div className="text-[10px] text-neutral-400 font-mono">
                  {filteredStyles.length} Styles Shown
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowSavePresetModal(true)}
                    className="px-2 py-0.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 font-bold border border-amber-400/40 cursor-pointer flex items-center gap-1 text-[10px]"
                    title="Save current typography as custom preset"
                  >
                    <Plus className="w-3 h-3" />
                    Save Preset
                  </button>
                  <button
                    onClick={handleExportPresetsJson}
                    className="p-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 cursor-pointer"
                    title="Export Presets JSON"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <label
                    className="p-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 cursor-pointer flex items-center justify-center"
                    title="Import Presets JSON"
                  >
                    <Upload className="w-3 h-3" />
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImportPresetsJson(file);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Save Preset Inline Modal */}
            {showSavePresetModal && (
              <div className="p-3 bg-neutral-950 border border-amber-400/40 rounded-xl space-y-2">
                <span className="text-xs font-bold text-amber-300 block">Save Current Style as Preset</span>
                <input
                  type="text"
                  placeholder="e.g. My MrBeast Style"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveCurrentPreset()}
                  className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                  autoFocus
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => setShowSavePresetModal(false)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCurrentPreset}
                    disabled={!newPresetName.trim()}
                    className="px-3 py-1 rounded-lg bg-amber-400 text-neutral-950 font-bold text-xs hover:bg-amber-300 disabled:opacity-50 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Category Filter Pills (Phase 16 Categories: ALL, BEGINNER, INTERMEDIATE, PRO, 3D, IMPORTED, MY STYLES) */}
            <div className="flex flex-wrap gap-1 text-[10px] font-bold max-h-24 overflow-y-auto pr-1">
              {[
                { id: 'all', label: `All (${allAvailablePresets.length})` },
                { id: 'imported', label: `📥 Imported (${importedPresetsList.length})` },
                { id: 'custom', label: `🎨 My Presets (${customPresetsList.length})` },
                { id: 'pro', label: 'PRO' },
                { id: 'beginner', label: 'BEGINNER' },
                { id: 'intermediate', label: 'INTERMEDIATE' },
                { id: '3d', label: '3D' },
                { id: 'favorites', label: `⭐ Favorites (${favoritesList.length})` },
                { id: 'recent', label: '🕒 Recent' },
                ...PRESET_CATEGORIES_20.filter((c) => !['all', 'pro', 'beginner', 'intermediate', '3d'].includes(c)).map((c) => ({
                  id: c,
                  label: c.toUpperCase(),
                })),
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedStyleCategory(cat.id)}
                  className={`px-2 py-0.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                    selectedStyleCategory === cat.id
                      ? 'bg-amber-400 text-neutral-950 font-black shadow-sm'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* 85+ Styles Grid with Live Animated Hover Preview */}
            <div className="grid grid-cols-2 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredStyles.map((styleDef) => {
                const isSelected = captionConfig.preset === styleDef.id || captionConfig.style === styleDef.id;
                const isFav = favoritesList.includes(styleDef.id);
                const isCustom = styleDef.category === 'custom';

                return (
                  <div
                    key={styleDef.id}
                    onClick={() => handleApplyStyle(styleDef)}
                    className={`group relative rounded-xl border p-2 flex flex-col justify-between transition-all cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'bg-amber-400/10 border-amber-400 shadow-md shadow-amber-500/10'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {/* Live Animated Preview Canvas with Hover Loop */}
                    <div className="aspect-video w-full rounded-lg overflow-hidden mb-1.5 relative bg-black/70 flex items-center justify-center">
                      <LiveTemplatePreview
                        styleDef={styleDef}
                        isSelected={isSelected}
                        isFavorite={isFav}
                        onToggleFavorite={(e) => handleToggleFavorite(styleDef.id, e)}
                      />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-[11px] truncate">{styleDef.name}</span>
                        <div className="flex items-center gap-1">
                          {isCustom && (
                            <button
                              onClick={(e) => handleDeleteCustomPreset(styleDef.id, e)}
                              className="text-neutral-500 hover:text-red-400 p-0.5"
                              title="Delete custom preset"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                          {isSelected && <Check className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-neutral-500">
                        <span className="capitalize">{styleDef.category}</span>
                        <span className="font-mono text-[8px] text-neutral-600 truncate max-w-[80px]">
                          {styleDef.config.fontFamily?.split(',')[0]}
                        </span>
                      </div>
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
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                Sound Effects Library ({SFX_LIBRARY.length} Assets)
              </span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                At {currentTime.toFixed(1)}s
              </span>
            </div>

            {/* AI Recommended SFX */}
            <div className="p-3 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>AI Recommended SFX</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'whoosh_fast_01', name: 'Fast Whoosh', cat: 'whoosh', reason: 'Transition swipe' },
                  { id: 'impact_punch_02', name: 'Punchy Impact', cat: 'impact', reason: 'Statement punch' },
                  { id: 'riser_tension_01', name: 'Tension Riser', cat: 'riser', reason: 'Question open-loop' },
                  { id: 'notification_ding_01', name: 'App Ding', cat: 'notification', reason: 'CTA chime' },
                ].map((rec) => {
                  const asset = SFX_LIBRARY.find((s) => s.id === rec.id) || SFX_LIBRARY[0];
                  return (
                    <button
                      key={rec.id}
                      onClick={() => handleAddSfx(rec.cat, asset.name, asset.file, rec.reason)}
                      className="p-2 rounded-lg bg-neutral-950/80 border border-amber-500/30 hover:border-amber-400 text-left transition-all flex flex-col justify-between group cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-[11px] text-white truncate">{asset.name}</span>
                        <Plus className="w-3 h-3 text-amber-400 shrink-0 group-hover:scale-125 transition-transform" />
                      </div>
                      <span className="text-[9px] text-amber-400/80 truncate mt-0.5">{rec.reason}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search & Category Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search 111+ SFX sounds or tags..."
                  value={sfxSearchQuery}
                  onChange={(e) => setSfxSearchQuery(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
                {['all', 'WHOOSH', 'IMPACT', 'HIT', 'SWOOSH', 'TRANSITION', 'RISER', 'DROP', 'BOOM', 'CLICK', 'POP', 'DIGITAL', 'GLITCH', 'UI', 'CHIME', 'NOTIFICATION', 'LAUGH', 'REACTION', 'MEME', 'GAMING', 'CINEMATIC', 'SUCCESS', 'FAILURE', 'ALERT', 'CAMERA', 'KEYBOARD', 'RECORD_SCRATCH', 'HEARTBEAT', 'BASS', 'AIR', 'FOLEY'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSfxCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                      sfxCategoryFilter.toLowerCase() === cat.toLowerCase()
                        ? 'bg-amber-400 text-neutral-950 shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtered SFX Catalog Grid */}
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {SFX_LIBRARY.filter((s) => {
                const matchCat = sfxCategoryFilter === 'all' || s.category.toLowerCase() === sfxCategoryFilter.toLowerCase();
                const q = sfxSearchQuery.toLowerCase();
                const matchQ = !q || s.name.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q));
                return matchCat && matchQ;
              }).map((item) => (
                <div
                  key={item.id}
                  className="p-2 rounded-xl bg-neutral-950/70 border border-neutral-800/80 hover:border-neutral-700 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => handlePlaySfxPreview(item.file)}
                      title="Play Preview"
                      className="w-6 h-6 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-amber-400 text-amber-400 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <Play className="w-2.5 h-2.5 ml-0.5" />
                    </button>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-neutral-200 truncate">{item.name}</div>
                      <div className="text-[9px] text-neutral-500 font-mono">
                        {item.category} • {item.duration}s
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddSfx(item.category.toLowerCase(), item.name, item.file)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-amber-400 hover:text-neutral-950 text-neutral-300 font-bold text-[10px] border border-neutral-800 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Insert</span>
                  </button>
                </div>
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
                    <div className="min-w-0">
                      <span className="font-semibold text-neutral-300 truncate block">{m.soundName}</span>
                      {m.reason && (
                        <span className="text-[9px] text-amber-400/80 truncate block">{m.reason}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[10px] text-neutral-500">{m.timestamp.toFixed(2)}s</span>
                      <button
                        onClick={() => {
                          const updated = (short.sfxMarkers || []).filter((s) => s.id !== m.id);
                          onUpdateShort({ ...short, sfxMarkers: updated });
                        }}
                        className="text-neutral-500 hover:text-rose-400 cursor-pointer"
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
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                Visual Effects Library ({VFX_LIBRARY.length} Presets)
              </span>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                At {currentTime.toFixed(1)}s
              </span>
            </div>

            {/* AI Recommended VFX */}
            <div className="p-3 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-transparent border border-purple-500/20 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-purple-400 text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>AI Recommended VFX</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { type: 'punch_zoom', name: 'Punch Zoom', reason: 'High vocal emphasis' },
                  { type: 'subtle_zoom_in', name: 'Subtle Zoom In', reason: 'Curiosity opening' },
                  { type: 'screen_shake', name: 'Screen Shake', reason: 'Impact accent' },
                  { type: 'glow', name: 'Neon Glow', reason: 'Key revelation' },
                ].map((rec) => (
                  <button
                    key={rec.type}
                    onClick={() => handleAddVfx(rec.type as any, rec.name, rec.reason)}
                    className="p-2 rounded-lg bg-neutral-950/80 border border-purple-500/30 hover:border-purple-400 text-left transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-[11px] text-white truncate">{rec.name}</span>
                      <Plus className="w-3 h-3 text-purple-400 shrink-0 group-hover:scale-125 transition-transform" />
                    </div>
                    <span className="text-[9px] text-purple-400/80 truncate mt-0.5">{rec.reason}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search & Category Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search 64 VFX presets..."
                  value={vfxSearchTerm}
                  onChange={(e) => setVfxSearchTerm(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
                {['ALL', 'ZOOM', 'SHAKE', 'GLITCH', 'LIGHT', 'GLOW', 'BLUR', 'COLOR', 'TRANSITION', 'PARTICLES', 'ENERGY', 'MEME', 'GAMING', 'PODCAST', 'SOCIAL'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setVfxCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                      vfxCategoryFilter === cat
                        ? 'bg-purple-500 text-white shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtered VFX Catalog Grid */}
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {VFX_LIBRARY.filter((v) => {
                const matchCat = vfxCategoryFilter === 'ALL' || v.category === vfxCategoryFilter;
                const q = vfxSearchTerm.toLowerCase();
                const matchQ = !q || v.name.toLowerCase().includes(q) || v.description.toLowerCase().includes(q);
                return matchCat && matchQ;
              }).map((item) => (
                <div
                  key={item.id}
                  className="p-2 rounded-xl bg-neutral-950/70 border border-neutral-800/80 hover:border-neutral-700 flex items-center justify-between transition-all"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-xs text-neutral-200 truncate">{item.name}</div>
                    <div className="text-[9px] text-neutral-500 font-mono">
                      {item.category} • {item.duration}s • Level {item.intensity}/10
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddVfx(item.type as any, item.name)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-purple-500 hover:text-white text-neutral-300 font-bold text-[10px] border border-neutral-800 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Insert</span>
                  </button>
                </div>
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
                    <div className="min-w-0">
                      <span className="font-semibold text-neutral-300 truncate block">{v.label || v.type}</span>
                      {v.reason && (
                        <span className="text-[9px] text-purple-400/80 truncate block">{v.reason}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[10px] text-neutral-500">{v.timestamp.toFixed(2)}s</span>
                      <button
                        onClick={() => {
                          const updated = (short.vfxMarkers || []).filter((s) => s.id !== v.id);
                          onUpdateShort({ ...short, vfxMarkers: updated });
                        }}
                        className="text-neutral-500 hover:text-rose-400 cursor-pointer"
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
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
                ViralClip AI Edit Engine
              </span>
              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                PRO LEVEL
              </span>
            </div>

            {/* Master Auto Edit Panel */}
            <div className="p-4 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-neutral-950 border border-amber-500/30 rounded-2xl space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                    <Wand2 className="w-4 h-4 text-amber-400" />
                    <span>SMART AUTO EDIT</span>
                  </h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    Multi-signal AI analysis for hooks, captions, SFX & VFX.
                  </p>
                </div>
              </div>

              {/* Edit Intensity Selector */}
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-1.5">
                  Edit Intensity
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {(['minimal', 'balanced', 'viral', 'maximum'] as EditIntensity[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setEditIntensity(level)}
                      className={`py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all cursor-pointer ${
                        editIntensity === level
                          ? 'bg-amber-400 text-neutral-950 shadow-md scale-102'
                          : 'bg-neutral-950/80 text-neutral-400 border border-neutral-800 hover:text-white'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modular Toggles */}
              <div className="space-y-1.5 pt-1 text-[11px]">
                {[
                  { label: 'Auto Captions & Typography', state: autoCaptionsEnabled, set: setAutoCaptionsEnabled },
                  { label: 'Auto B-Roll Cutaways', state: autoBRollEnabled, set: setAutoBRollEnabled },
                  { label: 'Auto SFX Sound Design', state: autoSFXEnabled, set: setAutoSFXEnabled },
                  { label: 'Auto VFX & Dynamic Zooms', state: autoVFXEnabled, set: setAutoVFXEnabled },
                  { label: 'Auto Portrait Reframe (9:16)', state: autoReframeEnabled, set: setAutoReframeEnabled },
                  { label: 'Auto Dialogue Loudness & Ducking', state: autoAudioEnabled, set: setAutoAudioEnabled },
                ].map((item, idx) => (
                  <label key={idx} className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/80 cursor-pointer hover:border-neutral-700 transition-colors">
                    <span className="text-neutral-300 text-[10px] font-semibold">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={item.state}
                      onChange={(e) => item.set(e.target.checked)}
                      className="accent-amber-400 cursor-pointer"
                    />
                  </label>
                ))}
              </div>

              {/* Master Run Button */}
              <button
                onClick={handleMasterAutoEdit}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-neutral-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Sparkles className="w-4 h-4 fill-neutral-950" />
                <span>GENERATE FULL AUTO EDIT</span>
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleMasterAutoEdit}
                  className="text-[10px] text-amber-400/80 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Regenerate AI Edit</span>
                </button>
                <button
                  onClick={handleResetAutoEdit}
                  className="text-[10px] text-neutral-500 hover:text-rose-400 font-semibold cursor-pointer"
                >
                  Reset AI Edit
                </button>
              </div>

              {/* Summary message */}
              {autoEditMessage && (
                <div className="p-2.5 bg-neutral-950 border border-amber-500/40 rounded-xl text-[10px] text-amber-300 leading-relaxed animate-fade-in">
                  ✓ {autoEditMessage}
                </div>
              )}
            </div>

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

            {/* Micro AI Actions */}
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

        {/* ===================== TAB 9: TRANSCRIPTION ===================== */}
        {activeTab === 'transcription' && (
          <div className="space-y-4">
            {/* Language Selection & Audio Model */}
            <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400 font-semibold">Spoken Language:</span>
                <span className="text-amber-400 font-bold capitalize">
                  {typeof short.language === 'string' ? short.language : 'Auto-detected'}
                </span>
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 font-medium block mb-1">
                  Language Override / Script
                </label>
                <select
                  value={typeof short.language === 'string' ? short.language : 'auto'}
                  onChange={(e) => {
                    onUpdateShort({
                      ...short,
                      language: e.target.value,
                    });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-amber-400/50"
                >
                  <option value="auto">Auto-Detect Multilingual</option>
                  <option value="en">English (Global)</option>
                  <option value="hi">Hindi (हिन्दी / Devanagari)</option>
                  <option value="hinglish">Hinglish (Hindi in Latin Script)</option>
                  <option value="bn">Bengali (বাংলা)</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                  <option value="te">Telugu (తెలుగు)</option>
                  <option value="kn">Kannada (ಕನ್ನಡ)</option>
                  <option value="ml">Malayalam (മലയാളം)</option>
                  <option value="mr">Marathi (मराठी)</option>
                  <option value="gu">Gujarati (ગુજરાતી)</option>
                  <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                  <option value="ur">Urdu (اردو)</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>

              {/* Coverage & Word Metrics */}
              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-neutral-800/60 text-center">
                <div className="bg-neutral-900/60 p-1.5 rounded-lg">
                  <div className="text-[10px] text-neutral-400">Total Words</div>
                  <div className="font-bold text-amber-400 text-xs">
                    {(short.captions || []).reduce((acc, c) => acc + (c.words?.length || c.text.split(/\s+/).length), 0)}
                  </div>
                </div>
                <div className="bg-neutral-900/60 p-1.5 rounded-lg">
                  <div className="text-[10px] text-neutral-400">Duration</div>
                  <div className="font-bold text-neutral-200 text-xs">
                    {(short.duration || 0).toFixed(1)}s
                  </div>
                </div>
                <div className="bg-neutral-900/60 p-1.5 rounded-lg">
                  <div className="text-[10px] text-neutral-400">Coverage</div>
                  <div className="font-bold text-emerald-400 text-xs">
                    {short.captions && short.captions.length > 0 ? '98%' : '0%'}
                  </div>
                </div>
              </div>
            </div>

            {/* Word Search and Replace */}
            <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-2">
              <div className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-amber-400" />
                <span>Search & Replace Words</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Find word..."
                  value={transcriptSearch}
                  onChange={(e) => setTranscriptSearch(e.target.value)}
                  className="px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-400/50"
                />
                <input
                  type="text"
                  placeholder="Replace with..."
                  value={transcriptReplace}
                  onChange={(e) => setTranscriptReplace(e.target.value)}
                  className="px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-400/50"
                />
              </div>
              <button
                onClick={() => {
                  if (!transcriptSearch.trim()) return;
                  const regex = new RegExp(transcriptSearch, 'gi');
                  const updated = (short.captions || []).map((cap) => ({
                    ...cap,
                    text: cap.text.replace(regex, transcriptReplace),
                    words: (cap.words || []).map((w) => ({
                      ...w,
                      word: w.word.replace(regex, transcriptReplace),
                    })),
                  }));
                  onUpdateShort({ ...short, captions: updated });
                  setTranscriptSearch('');
                  setTranscriptReplace('');
                }}
                disabled={!transcriptSearch.trim()}
                className="w-full py-1.5 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors cursor-pointer"
              >
                Replace In All Captions
              </button>
            </div>

            {/* Quality & Alignment Tools */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-neutral-400 px-1">Transcript Tools</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const rawCaptions = short.captions || [];
                    const fixed = removeCaptionGaps(rawCaptions, 0.25);
                    onUpdateShort({ ...short, captions: fixed });
                  }}
                  className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-[11px] text-neutral-300 font-semibold transition-all text-left flex flex-col gap-1 cursor-pointer"
                >
                  <span className="text-amber-400 font-bold">Remove Gaps</span>
                  <span className="text-[10px] text-neutral-500">Bridge awkward speech pauses</span>
                </button>
                <button
                  onClick={() => {
                    const rawCaptions = short.captions || [];
                    const fixed = addNaturalHolds(rawCaptions, 0.35);
                    onUpdateShort({ ...short, captions: fixed });
                  }}
                  className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-[11px] text-neutral-300 font-semibold transition-all text-left flex flex-col gap-1 cursor-pointer"
                >
                  <span className="text-cyan-400 font-bold">Speech Holds</span>
                  <span className="text-[10px] text-neutral-500">Hold punchlines naturally</span>
                </button>
              </div>

              {onOpenTranscriptEditor && (
                <button
                  onClick={onOpenTranscriptEditor}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400/20 to-orange-500/20 hover:from-amber-400/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Open Full Transcript Editor</span>
                </button>
              )}
            </div>

            {/* Editable Caption Segments List */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 px-1">
                <span>Segments ({short.captions?.length || 0})</span>
                <span className="text-[10px] text-neutral-500">Click to seek playhead</span>
              </div>
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {(short.captions || []).map((cap, idx) => {
                  const isActive = currentTime >= cap.start && currentTime <= cap.end;
                  return (
                    <div
                      key={cap.id || `cap_${idx}`}
                      onClick={() => onSeek(cap.start)}
                      className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-400/10 border-amber-400/50 shadow-sm'
                          : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1">
                        <span className="font-mono text-amber-400/80">#{idx + 1}</span>
                        <span className="font-mono">
                          {cap.start.toFixed(2)}s - {cap.end.toFixed(2)}s ({(cap.end - cap.start).toFixed(2)}s)
                        </span>
                      </div>
                      <input
                        type="text"
                        value={cap.text}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const updated = [...(short.captions || [])];
                          updated[idx] = { ...cap, text: e.target.value };
                          onUpdateShort({ ...short, captions: updated });
                        }}
                        className="w-full bg-transparent text-neutral-200 font-medium focus:outline-none focus:text-white border-b border-transparent focus:border-amber-400/40 pb-0.5"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 10: HOOK DETECTION ===================== */}
        {activeTab === 'hooks' && (
          <div className="space-y-4">
            {/* Header & Explanation */}
            <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs text-white">AI Hook & Moment Detection</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Evaluates the entire source speech for curiosity gaps, punchlines, bold questions, and high-retention opening hooks.
              </p>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
              {['all', 'curiosity', 'question', 'bold', 'shock', 'educational'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setHookFilterCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-colors cursor-pointer flex-shrink-0 ${
                    hookFilterCategory === cat
                      ? 'bg-amber-400 text-neutral-950'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Hook Candidates List */}
            <div className="space-y-2.5">
              {hookCandidates.length === 0 ? (
                <div className="p-4 rounded-xl bg-neutral-950/50 border border-neutral-800 text-center space-y-2">
                  <Flame className="w-6 h-6 text-neutral-600 mx-auto" />
                  <p className="text-xs text-neutral-400 font-medium">No hooks detected in this segment.</p>
                  <p className="text-[11px] text-neutral-500">Ensure the video contains transcribed speech.</p>
                </div>
              ) : (
                hookCandidates
                  .filter((h) => hookFilterCategory === 'all' || h.hookCategory === hookFilterCategory)
                  .map((hook, idx) => (
                    <div
                      key={hook.id || `hook_${idx}`}
                      className="p-3 rounded-xl bg-neutral-950/90 border border-neutral-800 hover:border-amber-400/40 transition-all space-y-2.5 group"
                    >
                      {/* Top Row: Rank & Score */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono font-bold text-[10px]">
                            Rank #{hook.rank || idx + 1}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold text-[10px] capitalize">
                            {hook.hookCategory}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{hook.viralScoreOverall || 85}/100</span>
                        </div>
                      </div>

                      {/* Hook Quote */}
                      <div className="text-xs font-bold text-neutral-100 group-hover:text-amber-300 transition-colors">
                        "{hook.hookText}"
                      </div>

                      {/* Timestamp range */}
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                        <span>{hook.startTime.toFixed(1)}s - {hook.endTime.toFixed(1)}s</span>
                        <span>Duration: {hook.duration.toFixed(1)}s</span>
                      </div>

                      {/* Reasons / Why Selected */}
                      {hook.whySelected && hook.whySelected.length > 0 && (
                        <div className="text-[10px] text-neutral-400 bg-neutral-900/60 p-1.5 rounded-lg border border-neutral-800/60 space-y-0.5">
                          {hook.whySelected.slice(0, 2).map((reason, rIdx) => (
                            <div key={rIdx} className="flex items-start gap-1">
                              <span className="text-amber-400">•</span>
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => onSeek(hook.startTime)}
                          className="py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[11px] font-semibold text-neutral-300 hover:text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3" />
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={() => {
                            onUpdateShort({
                              ...short,
                              title: hook.title || short.title,
                              startTime: hook.startTime,
                              endTime: hook.endTime,
                              duration: hook.duration,
                            });
                            onSeek(hook.startTime);
                          }}
                          className="py-1.5 px-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-[11px] font-bold text-neutral-950 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Scissors className="w-3 h-3" />
                          <span>Clip As Short</span>
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Caption Preset Importer Modal */}
      <CaptionPresetImporterModal
        isOpen={showDriveImporterModal}
        onClose={() => {
          setShowDriveImporterModal(false);
          fetchImportedPresets();
        }}
        onApplyPreset={handleApplyImportedPreset}
      />
    </div>
  );
};
