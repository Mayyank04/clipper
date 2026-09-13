import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  Star,
  Search,
  Wand2,
  FolderPlus,
  Pause,
  VolumeX,
} from 'lucide-react';
import {
  ShortCandidate,
  CaptionCustomization,
  CaptionStylePreset,
  BrandKit,
  HookCategory,
  SFXCategory,
  SFXMarker,
  SFXAsset,
  GeneratedSFXItem,
  VFXMarker,
  BRollSuggestion,
  ApprovalMode,
} from '../../types';
import { sfxEngine } from '../../utils/sfxAudio';
import { TranscriptEditor } from './TranscriptEditor';
import { ALL_CAPTION_STYLES, getCaptionStylePreset, calculateCaptionCoverage } from '../../utils/captionEngine';
import {
  BUILTIN_SFX_CATALOG,
  SFX_CATEGORIES,
  searchSFXCatalog,
  buildSmartSFXPrompt,
} from '../../utils/sfxCatalog';

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
  onAddSFXMarker?: (marker: SFXMarker) => void;
  onUpdateSFXMarker?: (id: string, updates: Partial<SFXMarker>) => void;
  onRegenerateSingleSFX?: (sfxId: string) => Promise<void>;
  sfxApprovalMode?: 'auto_apply' | 'balanced' | 'suggest_only';
  onSFXApprovalModeChange?: (mode: 'auto_apply' | 'balanced' | 'suggest_only') => void;
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
  onUpdateShort?: (short: ShortCandidate) => void;
  onUpdateBRoll?: (id: string, updates: Partial<BRollSuggestion>) => void;
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
  onAddSFXMarker,
  onUpdateSFXMarker,
  onRegenerateSingleSFX,
  sfxApprovalMode = 'auto_apply',
  onSFXApprovalModeChange,
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
  onUpdateShort,
  onUpdateBRoll,
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

  // B-Roll Studio State (Professional AI Semantic Engine)
  const [brollSubTab, setBrollSubTab] = useState<'timeline' | 'search' | 'upload'>('timeline');
  const [selectedBrollId, setSelectedBrollId] = useState<string | null>(null);
  const [isPolishingBroll, setIsPolishingBroll] = useState<boolean>(false);
  const [polishMessage, setPolishMessage] = useState<string | null>(null);
  const [isRegeneratingBrollId, setIsRegeneratingBrollId] = useState<string | null>(null);

  // Stock search state
  const [brollSearchQuery, setBrollSearchQuery] = useState<string>('');
  const [brollOrientation, setBrollOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [isSearchingBroll, setIsSearchingBroll] = useState<boolean>(false);
  const [stockResults, setStockResults] = useState<any[]>([]);
  const [pinterestStatus, setPinterestStatus] = useState<{ available: boolean; message: string }>({
    available: false,
    message: 'Pinterest integration unavailable. Connect Pinterest API to enable Pinterest results.',
  });

  // SFX Studio State
  const [sfxSubTab, setSfxSubTab] = useState<'catalog' | 'generator' | 'active'>('catalog');
  const [sfxSearchQuery, setSfxSearchQuery] = useState<string>('');
  const [sfxCategoryFilter, setSfxCategoryFilter] = useState<string>('all');
  const [sfxSourceFilter, setSfxSourceFilter] = useState<'all' | 'favorites' | 'user' | 'generated'>('all');
  const [sfxLibrary, setSfxLibrary] = useState<SFXAsset[]>(BUILTIN_SFX_CATALOG);
  const [playingSfxId, setPlayingSfxId] = useState<string | null>(null);
  const [previewVolume, setPreviewVolume] = useState<number>(0.8);
  const [recentlyUsedSfx, setRecentlyUsedSfx] = useState<string[]>([]);
  const [isRegeneratingSfxId, setIsRegeneratingSfxId] = useState<string | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // AI Sound Generator State
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiStyle, setAiStyle] = useState<string>('Cinematic');
  const [aiIntensity, setAiIntensity] = useState<'low' | 'medium' | 'high'>('high');
  const [aiDuration, setAiDuration] = useState<number>(1.8);
  const [aiVariations, setAiVariations] = useState<number>(2);
  const [isGeneratingAiSfx, setIsGeneratingAiSfx] = useState<boolean>(false);
  const [generatedResults, setGeneratedResults] = useState<GeneratedSFXItem[]>([]);
  const [aiGenError, setAiGenError] = useState<string | null>(null);

  // Upload & Drive Import State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showDriveModal, setShowDriveModal] = useState<boolean>(false);
  const [driveFolderName, setDriveFolderName] = useState<string>('My Drive SFX Vault');
  const [uploadCategory, setUploadCategory] = useState<SFXCategory>('impact');
  const [uploadLicense, setUploadLicense] = useState<string>('User-owned');
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [isUploadingSfx, setIsUploadingSfx] = useState<boolean>(false);

  // Load full SFX library from server
  useEffect(() => {
    fetch('/api/sfx/library')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.assets) && data.assets.length > 0) {
          setSfxLibrary(data.assets);
        }
      })
      .catch(() => {});
  }, [activeTab]);

  const handleTogglePlayPreview = (asset: { id: string; file?: string; url?: string; category?: string }) => {
    const audioUrl = asset.file || (asset as any).url;
    if (playingSfxId === asset.id) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      setPlayingSfxId(null);
      return;
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.volume = previewVolume;
      audioElementRef.current = audio;
      setPlayingSfxId(asset.id);

      audio.onended = () => {
        setPlayingSfxId(null);
        audioElementRef.current = null;
      };
      audio.onerror = () => {
        sfxEngine.playSound(asset.category || 'impact', previewVolume);
        setPlayingSfxId(null);
        audioElementRef.current = null;
      };

      audio.play().catch(() => {
        sfxEngine.playSound(asset.category || 'impact', previewVolume);
        setPlayingSfxId(null);
      });
    } else {
      sfxEngine.playSound(asset.category || 'impact', previewVolume);
    }

    setRecentlyUsedSfx((prev) => [asset.id, ...prev.filter((id) => id !== asset.id)].slice(0, 10));
  };

  const handleToggleFavorite = async (assetId: string) => {
    const asset = sfxLibrary.find((a) => a.id === assetId);
    const newFav = !asset?.isFavorite;
    setSfxLibrary((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, isFavorite: newFav } : a))
    );
    try {
      await fetch('/api/sfx/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, isFavorite: newFav }),
      });
    } catch {}
  };

  const handlePlaceSFXOnTimeline = (asset: { id: string; name: string; category?: any; file?: string; duration?: number; prompt?: string }) => {
    const marker: SFXMarker = {
      id: `sfx_${Date.now()}`,
      timestamp: Number(currentTime.toFixed(2)),
      duration: asset.duration || 1.5,
      category: (asset.category || 'impact') as SFXCategory,
      soundName: asset.name,
      volume: 0.8,
      audioUrl: asset.file,
      assetId: asset.id,
      source: asset.prompt ? 'ai_generated' : 'library',
      prompt: asset.prompt,
      reason: 'User manual placement at playhead',
      confidence: 1.0,
      fadeIn: 0,
      fadeOut: 0,
    };
    if (onAddSFXMarker) {
      onAddSFXMarker(marker);
    } else {
      onAddSFXAtCurrentTime(marker.category, marker.soundName);
    }
    handleTogglePlayPreview(asset);
  };

  const handleGenerateAiSFX = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAiSfx(true);
    setAiGenError(null);
    try {
      const res = await fetch('/api/sfx/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          style: aiStyle,
          intensity: aiIntensity,
          duration: aiDuration,
          variations: aiVariations,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setGeneratedResults(data.items);
        fetch('/api/sfx/library')
          .then((r) => r.json())
          .then((lib) => {
            if (lib.success) setSfxLibrary(lib.assets);
          });
      } else {
        setAiGenError(data.error || 'AI SFX generation failed. Please retry.');
      }
    } catch (err: any) {
      setAiGenError(err.message || 'Network error during AI SFX generation.');
    } finally {
      setIsGeneratingAiSfx(false);
    }
  };

  const handleUploadSfxFile = async () => {
    if (!selectedUploadFile) return;
    setIsUploadingSfx(true);
    const formData = new FormData();
    formData.append('audio', selectedUploadFile);
    formData.append('category', uploadCategory);
    formData.append('license', uploadLicense);

    try {
      const res = await fetch('/api/sfx/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.asset) {
        setSfxLibrary((prev) => [data.asset, ...prev]);
        setShowUploadModal(false);
        setSelectedUploadFile(null);
      } else {
        alert(data.error || 'Failed to upload audio');
      }
    } catch (err: any) {
      alert(err.message || 'Error uploading file');
    } finally {
      setIsUploadingSfx(false);
    }
  };

  const handleDriveImport = async () => {
    try {
      const res = await fetch('/api/sfx/import-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName: driveFolderName }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.importedAssets)) {
        setSfxLibrary((prev) => [...data.importedAssets, ...prev]);
        setShowDriveModal(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to import from Drive');
    }
  };

  const handleRegenSingleCue = async (sfxId: string) => {
    if (onRegenerateSingleSFX) {
      setIsRegeneratingSfxId(sfxId);
      try {
        await onRegenerateSingleSFX(sfxId);
      } finally {
        setIsRegeneratingSfxId(null);
      }
    }
  };

  const analysis = short.projectAnalysis;
  const rawLang = analysis?.language || short.language || language || 'en';
  const detectedLangCode = typeof rawLang === 'object' && rawLang !== null ? (rawLang.detectedCode || rawLang.primaryLanguage || 'en') : String(rawLang);
  const detectedLangName = analysis?.languageConfidence
    ? `${detectedLangCode.toUpperCase()} (${Math.round(analysis.languageConfidence * 100)}%)`
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

  const handleAIPolish = async () => {
    if (!short.projectId || !short.id) return;
    setIsPolishingBroll(true);
    setPolishMessage(null);
    try {
      const res = await fetch('/api/broll/ai-polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: short.projectId, shortId: short.id }),
      });
      const data = await res.json();
      if (data.success) {
        setPolishMessage(data.message || 'AI Polish complete!');
        if (data.short && onUpdateShort) {
          onUpdateShort(data.short);
        }
      }
    } catch (err) {
      console.error('Error in AI Polish:', err);
    } finally {
      setIsPolishingBroll(false);
    }
  };

  const handleRegenerateSingleBroll = async (brollId: string) => {
    if (!short.projectId || !short.id) return;
    setIsRegeneratingBrollId(brollId);
    try {
      const res = await fetch(`/api/projects/${short.projectId}/regenerate-elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortId: short.id,
          target: 'broll',
          targetBrollId: brollId,
        }),
      });
      const data = await res.json();
      if (data.success && data.short && onUpdateShort) {
        onUpdateShort(data.short);
      }
    } catch (err) {
      console.error('Error regenerating single B-roll:', err);
    } finally {
      setIsRegeneratingBrollId(null);
    }
  };

  const handleSearchStock = async (queryText?: string) => {
    const q = queryText || brollSearchQuery || short.title || 'technology';
    setIsSearchingBroll(true);
    try {
      const res = await fetch(`/api/broll/search?query=${encodeURIComponent(q)}&orientation=${brollOrientation}`);
      const data = await res.json();
      if (data.success) {
        setStockResults(data.items || []);
        if (data.pinterestStatus) {
          setPinterestStatus(data.pinterestStatus);
        }
      }
    } catch (err) {
      console.error('Error searching stock:', err);
    } finally {
      setIsSearchingBroll(false);
    }
  };

  const handleUpdateBrollCrop = (brollId: string, cropType: 'center' | 'smart' | 'face-safe' | 'object-safe') => {
    if (onUpdateBRoll) {
      onUpdateBRoll(brollId, {
        crop: {
          x: 0,
          y: 0,
          width: 1080,
          height: 1920,
          type: cropType,
          motion: { startScale: 1.0, endScale: 1.04, easing: 'ease-in-out' },
        },
      });
    }
  };

  const handleToggleBrollMotion = (brollId: string, hasMotion: boolean) => {
    if (onUpdateBRoll) {
      const currentCue = (short.brollSuggestions || []).find((b) => b.id === brollId);
      const prevCrop = currentCue?.crop || { x: 0, y: 0, width: 1080, height: 1920, type: 'center' };
      onUpdateBRoll(brollId, {
        crop: {
          ...prevCrop,
          motion: hasMotion ? { startScale: 1.0, endScale: 1.04, easing: 'ease-in-out' } : undefined,
        },
      });
    }
  };

  const filteredPresets = ALL_CAPTION_STYLES.filter((p) => {
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

        {/* TAB 3: SFX SOUND EFFECTS & AI GENERATOR */}
        {activeTab === 'sfx' && (
          <div className="space-y-4 animate-fade-in">
            {/* Header & Sub-Navigation */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                    <span>Sound Effects Studio</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono border border-amber-500/20">
                      34 Categories
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Browse library, generate custom sounds, and manage timeline cues
                  </p>
                </div>
              </div>

              {/* Sub-tab Navigation */}
              <div className="flex items-center gap-1.5 p-1 bg-neutral-900 rounded-xl border border-neutral-800 mt-3 text-xs">
                <button
                  type="button"
                  onClick={() => setSfxSubTab('catalog')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                    sfxSubTab === 'catalog'
                      ? 'bg-amber-400 text-neutral-950 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Library Browser
                </button>
                <button
                  type="button"
                  onClick={() => setSfxSubTab('generator')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    sfxSubTab === 'generator'
                      ? 'bg-amber-400 text-neutral-950 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Wand2 className="w-3 h-3" />
                  <span>AI Generator</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSfxSubTab('active')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    sfxSubTab === 'active'
                      ? 'bg-amber-400 text-neutral-950 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>Cues</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    sfxSubTab === 'active' ? 'bg-neutral-950/20 text-neutral-950' : 'bg-neutral-800 text-amber-400'
                  }`}>
                    {short.sfxMarkers?.length || 0}
                  </span>
                </button>
              </div>
            </div>

            {/* SUBTAB 1: SFX LIBRARY BROWSER */}
            {sfxSubTab === 'catalog' && (
              <div className="space-y-3.5">
                {/* Search Bar & Import Actions */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={sfxSearchQuery}
                      onChange={(e) => setSfxSearchQuery(e.target.value)}
                      placeholder="Semantic search (e.g. 'funny', 'boom', 'transition', 'digital')..."
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                    {sfxSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setSfxSearchQuery('')}
                        className="text-neutral-500 hover:text-white text-xs absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Top Actions: Upload & Drive */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                      {(['all', 'favorites', 'user', 'generated'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setSfxSourceFilter(mode)}
                          className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                            sfxSourceFilter === mode
                              ? 'bg-neutral-800 text-amber-400 border border-amber-400/30'
                              : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                          }`}
                        >
                          {mode === 'all' && 'All Sources'}
                          {mode === 'favorites' && '★ Favorites'}
                          {mode === 'user' && '📁 My Uploads'}
                          {mode === 'generated' && '✨ Generated'}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
                        title="Upload SFX file (.wav, .mp3, .ogg)"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDriveModal(true)}
                        className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
                        title="Import from Google Drive"
                      >
                        <FolderPlus className="w-3 h-3" />
                        <span>Drive</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category Chips Horizontal Carousel */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => setSfxCategoryFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      sfxCategoryFilter === 'all'
                        ? 'bg-amber-400 text-neutral-950 font-bold'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    All ({sfxLibrary.length})
                  </button>
                  {SFX_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSfxCategoryFilter(cat.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        sfxCategoryFilter === cat.id
                          ? 'bg-amber-400 text-neutral-950 font-bold'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Sound Cards List */}
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {(() => {
                    const filtered = searchSFXCatalog(
                      sfxLibrary,
                      sfxSearchQuery,
                      sfxCategoryFilter,
                      sfxSourceFilter
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-10 bg-neutral-950/60 rounded-xl border border-neutral-800 text-neutral-400 text-xs">
                          <VolumeX className="w-6 h-6 mx-auto mb-2 opacity-50" />
                          <p className="font-bold text-white">No sound effects matched</p>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            Try searching for synonyms or generate with AI
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setAiPrompt(sfxSearchQuery);
                              setSfxSubTab('generator');
                            }}
                            className="mt-3 px-3 py-1.5 rounded-lg bg-amber-400 text-neutral-950 font-bold text-xs hover:bg-amber-300 transition-colors cursor-pointer"
                          >
                            Generate "{sfxSearchQuery}" with AI
                          </button>
                        </div>
                      );
                    }

                    return filtered.map((asset) => {
                      const isPlaying = playingSfxId === asset.id;
                      const waveformPoints = asset.waveform || [0.2, 0.5, 0.8, 0.6, 0.9, 0.4, 0.2];

                      return (
                        <div
                          key={asset.id}
                          className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 hover:border-neutral-700 transition-all space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => handleTogglePlayPreview(asset)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer ${
                                  isPlaying
                                    ? 'bg-amber-400 text-neutral-950'
                                    : 'bg-amber-500/10 text-amber-400 hover:bg-amber-400 hover:text-neutral-950'
                                }`}
                                title={isPlaying ? 'Pause Preview' : 'Play Preview'}
                              >
                                {isPlaying ? (
                                  <Pause className="w-3.5 h-3.5 fill-current" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                )}
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-white truncate">{asset.name}</span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                                    {asset.duration.toFixed(1)}s
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-neutral-400 mt-0.5">
                                  <span className="capitalize text-neutral-300 font-medium">{asset.category}</span>
                                  <span>•</span>
                                  <span className="text-neutral-500">{asset.license || 'Royalty-free'}</span>
                                  {asset.source === 'ai_generated' && (
                                    <>
                                      <span>•</span>
                                      <span className="text-amber-400">AI Gen</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleFavorite(asset.id)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  asset.isFavorite ? 'text-amber-400 hover:text-amber-300' : 'text-neutral-600 hover:text-neutral-300'
                                }`}
                                title={asset.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                              >
                                <Star className={`w-3.5 h-3.5 ${asset.isFavorite ? 'fill-current' : ''}`} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePlaceSFXOnTimeline(asset)}
                                className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 transition-colors cursor-pointer"
                                title={`Place at ${currentTime.toFixed(1)}s`}
                              >
                                <Plus className="w-3 h-3" />
                                <span>Place at {currentTime.toFixed(0)}s</span>
                              </button>
                            </div>
                          </div>

                          {/* Waveform Visualization Canvas (Interactive Preview) */}
                          <div
                            onClick={() => handleTogglePlayPreview(asset)}
                            className="h-6 w-full bg-neutral-900/90 rounded-lg p-1 flex items-center justify-between gap-0.5 cursor-pointer hover:bg-neutral-900 transition-colors"
                            title="Click waveform to play preview"
                          >
                            {waveformPoints.map((val, pIdx) => {
                              const heightPct = Math.max(15, Math.min(100, Math.round(val * 100)));
                              return (
                                <div
                                  key={pIdx}
                                  className={`flex-1 rounded-sm transition-all ${
                                    isPlaying ? 'bg-amber-400' : 'bg-neutral-600 hover:bg-neutral-400'
                                  }`}
                                  style={{ height: `${heightPct}%` }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* SUBTAB 2: AI TEXT-TO-SFX GENERATOR */}
            {sfxSubTab === 'generator' && (
              <div className="space-y-4 p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-xl animate-fade-in">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Text-to-SFX Generator</span>
                    </h4>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      Neural Synthesizer Ready
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Describe any custom audio effect tailored for this exact short.
                  </p>
                </div>

                {/* Prompt Input Area */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-300">Sound Description Prompt</label>
                  <textarea
                    rows={3}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="E.g. Short dramatic bass impact when speaker reveals a surprising fact..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors resize-none"
                  />
                  {/* Quick Prompts */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
                    <span className="text-neutral-500 shrink-0">Try:</span>
                    {[
                      'Dramatic reveal bass drop',
                      'Aerodynamic swift whoosh',
                      'Digital code glitch interrupt',
                      'Tension riser pitch sweep',
                      'Success harmonic chime',
                    ].map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        onClick={() => setAiPrompt(sample)}
                        className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 whitespace-nowrap cursor-pointer"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style & Intensity Controls */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-300">Style</label>
                    <select
                      value={aiStyle}
                      onChange={(e) => setAiStyle(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      {['Cinematic', 'Modern', 'Cartoon', 'Glitch', 'Sci-Fi', 'Horror', 'Gaming', 'Ambient'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-300">Intensity</label>
                    <div className="grid grid-cols-3 gap-1 p-0.5 bg-neutral-900 rounded-lg border border-neutral-800">
                      {(['low', 'medium', 'high'] as const).map((int) => (
                        <button
                          key={int}
                          type="button"
                          onClick={() => setAiIntensity(int)}
                          className={`py-1 rounded text-[10px] font-bold capitalize transition-colors ${
                            aiIntensity === int ? 'bg-amber-400 text-neutral-950' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          {int}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Duration & Variations */}
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-neutral-300">Duration</span>
                      <span className="text-amber-400 font-mono">{aiDuration.toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={4.0}
                      step={0.1}
                      value={aiDuration}
                      onChange={(e) => setAiDuration(parseFloat(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-neutral-300">Variations</span>
                      <span className="text-amber-400 font-mono">{aiVariations}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 p-0.5 bg-neutral-900 rounded-lg border border-neutral-800">
                      {[1, 2].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setAiVariations(v)}
                          className={`py-1 rounded text-[10px] font-bold transition-colors ${
                            aiVariations === v ? 'bg-amber-400 text-neutral-950' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          {v} {v === 1 ? 'Take' : 'Takes'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  type="button"
                  onClick={handleGenerateAiSFX}
                  disabled={isGeneratingAiSfx || !aiPrompt.trim()}
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  {isGeneratingAiSfx ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing Audio Waveforms...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Sound Effect</span>
                    </>
                  )}
                </button>

                {aiGenError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
                    <span>{aiGenError}</span>
                    <button
                      type="button"
                      onClick={handleGenerateAiSFX}
                      className="text-white underline font-bold"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Generated Results List */}
                {generatedResults.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-neutral-800">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                      <span>Generated Sound Options ({generatedResults.length})</span>
                      <span className="text-emerald-400 text-[10px]">Saved to Project Assets</span>
                    </div>

                    <div className="space-y-2">
                      {generatedResults.map((gen, gIdx) => {
                        const isPlaying = playingSfxId === gen.id;
                        return (
                          <div
                            key={gen.id}
                            className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePlayPreview(gen as any)}
                                  className="w-7 h-7 rounded-lg bg-amber-400 text-neutral-950 flex items-center justify-center"
                                  title="Audition Sound"
                                >
                                  {isPlaying ? (
                                    <Pause className="w-3.5 h-3.5 fill-current" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                  )}
                                </button>
                                <div>
                                  <div className="text-xs font-bold text-white">Variation #{gIdx + 1}</div>
                                  <div className="text-[10px] text-neutral-400">{gen.duration.toFixed(1)}s • 44.1kHz WAV</div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handlePlaceSFXOnTimeline({
                                    id: gen.id,
                                    name: `AI Sound: ${aiStyle}`,
                                    category: 'impact',
                                    file: gen.url,
                                    duration: gen.duration,
                                    prompt: gen.prompt,
                                  })
                                }
                                className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Use in Timeline</span>
                              </button>
                            </div>

                            {/* Waveform */}
                            <div
                              onClick={() => handleTogglePlayPreview(gen as any)}
                              className="h-5 w-full bg-neutral-950 rounded p-1 flex items-center justify-between gap-0.5 cursor-pointer"
                            >
                              {(gen.waveform || [0.3, 0.7, 0.9, 0.4, 0.2]).map((val, pIdx) => (
                                <div
                                  key={pIdx}
                                  className={`flex-1 rounded-sm ${isPlaying ? 'bg-amber-400' : 'bg-neutral-600'}`}
                                  style={{ height: `${Math.max(20, Math.round(val * 100))}%` }}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 3: ACTIVE SFX TIMELINE CUES */}
            {sfxSubTab === 'active' && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <span>Active Timeline Cues ({short.sfxMarkers?.length || 0})</span>
                  <span className="text-amber-400 text-[10px]">Speech Ducking Enabled</span>
                </div>

                {(!short.sfxMarkers || short.sfxMarkers.length === 0) ? (
                  <div className="text-center py-10 bg-neutral-950/60 rounded-xl border border-neutral-800 text-neutral-400 text-xs">
                    <p className="font-bold text-white">No SFX Cues on Timeline</p>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Add sound cues from the Library or AI Generator.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSfxSubTab('catalog')}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-amber-400 text-neutral-950 font-bold text-xs hover:bg-amber-300 transition-colors cursor-pointer"
                    >
                      Browse SFX Library
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {short.sfxMarkers.map((sfx) => {
                      const isPlaying = playingSfxId === sfx.id;
                      const isRegenerating = isRegeneratingSfxId === sfx.id;

                      return (
                        <div
                          key={sfx.id}
                          className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div
                              className="flex items-center gap-2 cursor-pointer min-w-0 flex-1"
                              onClick={() => {
                                handleTogglePlayPreview({ id: sfx.id, file: sfx.audioUrl, category: sfx.category });
                                onSeekToTime?.(sfx.timestamp);
                              }}
                            >
                              <Volume2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              <span className="text-xs font-bold text-white truncate">{sfx.soundName}</span>
                              <span className="text-[10px] font-mono text-amber-400 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                                {sfx.timestamp.toFixed(1)}s
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleTogglePlayPreview({ id: sfx.id, file: sfx.audioUrl, category: sfx.category })}
                                className="p-1 rounded text-neutral-400 hover:text-white"
                                title="Play SFX Preview"
                              >
                                {isPlaying ? (
                                  <Pause className="w-3 h-3 fill-current text-amber-400" />
                                ) : (
                                  <Play className="w-3 h-3 fill-current" />
                                )}
                              </button>

                              {/* Section 26: Regenerate selected SFX only */}
                              <button
                                type="button"
                                onClick={() => handleRegenSingleCue(sfx.id)}
                                disabled={isRegenerating}
                                className="p-1 rounded text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer"
                                title="Regenerate this sound with AI"
                              >
                                <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin text-amber-400' : ''}`} />
                              </button>

                              {onDeleteSFX && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteSFX(sfx.id)}
                                  className="text-neutral-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                                  title="Delete SFX"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* AI Justification & Explanation Card (Section 23) */}
                          <div className="text-[11px] text-neutral-300 bg-neutral-900/80 p-2 rounded-lg border border-neutral-800/80 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate">
                                <strong className="text-neutral-400">Trigger:</strong> {sfx.triggerText ? `"${sfx.triggerText}"` : 'Spoken emphasis'}
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                                {sfx.source === 'ai_generated' ? 'AI Gen' : 'Library'} • {Math.round((sfx.confidence || 0.9) * 100)}%
                              </span>
                            </div>

                            {sfx.reason && (
                              <div className="text-[10px] text-neutral-400">
                                <strong className="text-neutral-500">Reason:</strong> {sfx.reason}
                              </div>
                            )}

                            {sfx.prompt && (
                              <div className="text-[10px] text-neutral-400 font-mono truncate">
                                <strong className="text-neutral-500">Prompt:</strong> {sfx.prompt}
                              </div>
                            )}
                          </div>

                          {/* Volume & Ducking Indicator */}
                          <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1">
                            <span>Speech Ducking: -16 dB dialogue / -10 dB pause</span>
                            <span className="font-mono text-neutral-300">Vol: {Math.round((sfx.volume || 0.8) * 100)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* MODAL: UPLOAD SFX FILE */}
            {showUploadModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>Upload Licensed Audio File</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      className="text-neutral-400 hover:text-white text-base"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-neutral-800 hover:border-amber-400 rounded-xl p-6 text-center transition-colors">
                      <input
                        type="file"
                        accept="audio/*,.wav,.mp3,.m4a,.ogg"
                        onChange={(e) => setSelectedUploadFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="sfx-upload-input"
                      />
                      <label htmlFor="sfx-upload-input" className="cursor-pointer space-y-1 block">
                        <Upload className="w-8 h-8 text-amber-400 mx-auto opacity-80" />
                        <div className="text-xs font-bold text-white">
                          {selectedUploadFile ? selectedUploadFile.name : 'Select or Drop Audio File'}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          Supports WAV, MP3, M4A, OGG • Verified via FFprobe
                        </div>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-neutral-300">Category</label>
                        <select
                          value={uploadCategory}
                          onChange={(e) => setUploadCategory(e.target.value as SFXCategory)}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white"
                        >
                          {SFX_CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-neutral-300">License Right</label>
                        <select
                          value={uploadLicense}
                          onChange={(e) => setUploadLicense(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white"
                        >
                          <option value="User-owned">User-owned</option>
                          <option value="User-provided">User-provided</option>
                          <option value="Licensed">Licensed</option>
                          <option value="Royalty-free">Royalty-free</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadSfxFile}
                      disabled={!selectedUploadFile || isUploadingSfx}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-neutral-950 flex items-center gap-1.5 cursor-pointer"
                    >
                      {isUploadingSfx ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>Upload & Verify</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL: GOOGLE DRIVE IMPORT */}
            {showDriveModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <FolderPlus className="w-4 h-4 text-amber-400" />
                      <span>Import from Google Drive Folders</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowDriveModal(false)}
                      className="text-neutral-400 hover:text-white text-base"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-neutral-400">
                      Import user-owned SFX assets from connected Google Drive folders. All files will be verified and indexed with FFprobe.
                    </p>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-neutral-300">Folder Name or ID</label>
                      <input
                        type="text"
                        value={driveFolderName}
                        onChange={(e) => setDriveFolderName(e.target.value)}
                        placeholder="Google Drive SFX Folder..."
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white"
                      />
                    </div>

                    <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800 space-y-1 text-xs">
                      <div className="font-bold text-white">License Compliance</div>
                      <div className="text-[11px] text-neutral-400">
                        Tracks license as "User-provided" without scraping third-party platforms.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setShowDriveModal(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDriveImport}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-neutral-950 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Import Authorized Files</span>
                    </button>
                  </div>
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

        {/* TAB 5: PROFESSIONAL AI B-ROLL STUDIO */}
        {activeTab === 'broll' && (
          <div className="space-y-4 animate-fade-in">
            {/* Header with AI POLISH Action */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-amber-400" />
                  <span>AI Semantic B-Roll Studio</span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Transcript-driven cutaways with 9:16 smart reframing
                </p>
              </div>

              {/* AI POLISH BUTTON (Requirement 24) */}
              <button
                onClick={handleAIPolish}
                disabled={isPolishingBroll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 shrink-0"
                title="Automatically analyze, prune weak visuals, fill gaps, and balance 60-75% original footage"
              >
                {isPolishingBroll ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                )}
                <span>{isPolishingBroll ? 'Polishing...' : 'AI Polish'}</span>
              </button>
            </div>

            {/* AI Polish Result Feedback */}
            {polishMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-snug">{polishMessage}</div>
                <button
                  onClick={() => setPolishMessage(null)}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                >
                  ×
                </button>
              </div>
            )}

            {/* Sub-tab Navigation */}
            <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-xl border border-neutral-800 text-xs">
              <button
                onClick={() => {
                  setBrollSubTab('timeline');
                  setSelectedBrollId(null);
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition-colors cursor-pointer ${
                  brollSubTab === 'timeline'
                    ? 'bg-neutral-800 text-white shadow'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Timeline ({short.brollSuggestions?.length || 0})
              </button>
              <button
                onClick={() => {
                  setBrollSubTab('search');
                  if (stockResults.length === 0) {
                    handleSearchStock();
                  }
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition-colors cursor-pointer ${
                  brollSubTab === 'search'
                    ? 'bg-neutral-800 text-white shadow'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Stock Search
              </button>
              <button
                onClick={() => setBrollSubTab('upload')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition-colors cursor-pointer ${
                  brollSubTab === 'upload'
                    ? 'bg-neutral-800 text-white shadow'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Upload
              </button>
            </div>

            {/* SUB-TAB 1: TIMELINE CUES & INSPECTOR */}
            {brollSubTab === 'timeline' && (
              <div className="space-y-3">
                {/* Active Clip Inspector (Requirement 23) */}
                {selectedBrollId ? (() => {
                  const selectedCue = (short.brollSuggestions || []).find((b) => b.id === selectedBrollId);
                  if (!selectedCue) return null;

                  return (
                    <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-700/80 space-y-3 animate-fade-in shadow-xl">
                      {/* Top Bar */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setSelectedBrollId(null)}
                          className="text-[11px] font-bold text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          ← All Cues
                        </button>
                        <div className="flex items-center gap-1.5">
                          {selectedCue.shotType && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {selectedCue.shotType}
                            </span>
                          )}
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {selectedCue.source || 'Pexels'}
                          </span>
                        </div>
                      </div>

                      {/* Thumbnail with 9:16 Aspect Ratio framing */}
                      <div className="relative rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 aspect-[9/16] max-h-48 mx-auto flex items-center justify-center">
                        <img
                          src={selectedCue.imageUrl || (selectedCue as any).assetUrl}
                          alt={selectedCue.concept}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur px-2 py-0.5 rounded text-[10px] text-white font-mono">
                          {selectedCue.timestamp.toFixed(1)}s - {(selectedCue.timestamp + selectedCue.duration).toFixed(1)}s ({selectedCue.duration}s)
                        </div>
                      </div>

                      {/* Concept Title */}
                      <div>
                        <div className="text-xs font-bold text-white leading-snug">{selectedCue.concept}</div>
                        {selectedCue.topic && (
                          <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                            Topic: {selectedCue.topic}
                          </div>
                        )}
                      </div>

                      {/* Transcript Context */}
                      <div className="p-2 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1">
                        <div className="text-[10px] uppercase font-bold text-neutral-400">Narration Context</div>
                        <div className="text-xs text-neutral-200 italic leading-relaxed">
                          "{selectedCue.transcriptContext || selectedCue.triggerText || 'Dialogue segment'}"
                        </div>
                      </div>

                      {/* Why this clip? (Requirement 11) */}
                      <div className="p-2 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1">
                        <div className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1">
                          <Info className="w-3 h-3 text-amber-400" />
                          <span>Why this clip?</span>
                        </div>
                        <div className="text-xs text-neutral-300 leading-relaxed">
                          {selectedCue.reason || 'Selected to visually reinforce narration topic.'}
                        </div>
                      </div>

                      {/* Relevance Scores Breakdown (Requirement 8) */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                          <div className="text-[9px] text-neutral-400">Semantic</div>
                          <div className="text-xs font-bold text-emerald-400">
                            {Math.round((selectedCue.semanticScore ?? selectedCue.confidence ?? 0.88) * 100)}%
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                          <div className="text-[9px] text-neutral-400">Visual</div>
                          <div className="text-xs font-bold text-blue-400">
                            {Math.round((selectedCue.visualScore ?? 0.91) * 100)}%
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                          <div className="text-[9px] text-neutral-400">Continuity</div>
                          <div className="text-xs font-bold text-purple-400">
                            {Math.round((selectedCue.continuityScore ?? 0.94) * 100)}%
                          </div>
                        </div>
                      </div>

                      {/* Reframing & Crop Controls (Requirement 16) */}
                      <div className="space-y-1.5 pt-1 border-t border-neutral-800">
                        <div className="text-[10px] uppercase font-bold text-neutral-400">9:16 Reframing Mode</div>
                        <div className="grid grid-cols-4 gap-1 text-[10px]">
                          {(['center', 'smart', 'face-safe', 'object-safe'] as const).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => handleUpdateBrollCrop(selectedCue.id, mode)}
                              className={`py-1 rounded font-semibold capitalize transition-colors cursor-pointer ${
                                (selectedCue.crop?.type || 'center') === mode
                                  ? 'bg-amber-400 text-neutral-950'
                                  : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
                              }`}
                            >
                              {mode.replace('-safe', '')}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Motion & Audio Controls */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-800">
                        <span className="text-neutral-300">Smooth Motion Zoom (1.04x)</span>
                        <input
                          type="checkbox"
                          checked={Boolean(selectedCue.crop?.motion)}
                          onChange={(e) => handleToggleBrollMotion(selectedCue.id, e.target.checked)}
                          className="w-4 h-4 accent-amber-400 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-300">Voice Ducking</span>
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          -16 dB during speech
                        </span>
                      </div>

                      {/* Action Controls */}
                      <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
                        <button
                          onClick={() => handleRegenerateSingleBroll(selectedCue.id)}
                          disabled={isRegeneratingBrollId === selectedCue.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white border border-blue-500/40 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingBrollId === selectedCue.id ? 'animate-spin' : ''}`} />
                          <span>{isRegeneratingBrollId === selectedCue.id ? 'Finding...' : 'Regenerate'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setBrollSubTab('search');
                            setBrollSearchQuery(selectedCue.concept);
                            handleSearchStock(selectedCue.concept);
                          }}
                          className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-bold transition-colors cursor-pointer border border-neutral-700"
                          title="Search Similar Footage"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>Similar</span>
                        </button>

                        {onDeleteBRoll && (
                          <button
                            onClick={() => {
                              onDeleteBRoll(selectedCue.id);
                              setSelectedBrollId(null);
                            }}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 transition-colors cursor-pointer"
                            title="Delete Clip"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                  /* Timeline Cues List */
                  <div className="space-y-2">
                    {short.brollSuggestions && short.brollSuggestions.length > 0 ? (
                      short.brollSuggestions.map((br) => (
                        <div
                          key={br.id}
                          className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-400/50 transition-all space-y-1.5 cursor-pointer group"
                          onClick={() => setSelectedBrollId(br.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-900 flex-shrink-0 border border-neutral-800">
                              <img
                                src={br.imageUrl || (br as any).assetUrl}
                                alt={br.concept}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              {br.shotType && (
                                <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[7px] text-center font-mono uppercase text-amber-300 py-0.5 truncate">
                                  {br.shotType}
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                                {br.concept}
                              </div>
                              <div className="text-[10px] text-neutral-400 font-mono flex items-center gap-2">
                                <span>{br.timestamp.toFixed(1)}s - {(br.timestamp + br.duration).toFixed(1)}s ({br.duration}s)</span>
                                {br.confidence !== undefined && (
                                  <span className="text-emerald-400 font-bold">
                                    {Math.round(br.confidence * 100)}%
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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

                          {/* Quick justification preview */}
                          <div className="text-[10px] text-neutral-400 truncate bg-neutral-900/60 px-2 py-1 rounded border border-neutral-800/60 flex items-center justify-between">
                            <span className="truncate">
                              {br.triggerText ? `Context: "${br.triggerText}"` : br.reason || 'Semantic match'}
                            </span>
                            <span className="text-amber-400 font-bold ml-1 text-[9px] shrink-0">Inspect →</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-neutral-400 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
                        <Film className="w-6 h-6 text-neutral-600 mx-auto" />
                        <div className="font-medium text-neutral-300">No sufficiently relevant B-roll found. Original footage retained.</div>
                        <p className="text-[11px] text-neutral-500">
                          High semantic threshold (0.82) protects video pacing. Click "AI Polish" or search footage manually.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB 2: PEXELS & STOCK SEARCH */}
            {brollSubTab === 'search' && (
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={brollSearchQuery}
                      onChange={(e) => setBrollSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchStock()}
                      placeholder="Search Pexels stock video..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <button
                    onClick={() => handleSearchStock()}
                    disabled={isSearchingBroll}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSearchingBroll ? '...' : 'Search'}
                  </button>
                </div>

                {/* Quick Topic Chips */}
                <div className="flex flex-wrap gap-1">
                  {['Computer Science', 'AI & Tech', 'Analytics Chart', 'Modern Office', 'City Skyline', 'Camera Studio'].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => {
                        setBrollSearchQuery(chip);
                        handleSearchStock(chip);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Pinterest Integration Status Banner (Requirement 6) */}
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-2 text-[11px] text-neutral-400">
                  <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-neutral-300 font-semibold">Pinterest Integration: </span>
                    {pinterestStatus.message}
                  </div>
                </div>

                {/* Results Grid */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {stockResults.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-3 hover:border-neutral-700 transition-colors"
                    >
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-neutral-900 shrink-0 border border-neutral-800 relative">
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={item.tags?.[0] || 'stock'}
                          className="w-full h-full object-cover"
                        />
                        {item.duration && (
                          <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.2 rounded text-[8px] font-mono text-white">
                            {item.duration}s
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {item.queryMatched || item.tags?.[0] || 'Stock Footage'}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate">
                          By {item.author || 'Pexels Creator'}
                        </div>
                        <div className="text-[9px] text-neutral-500 font-mono">
                          {item.width}x{item.height} • {item.provider}
                        </div>
                      </div>

                      <button
                        onClick={() => onAddBRollAtCurrentTime(item.queryMatched || item.tags?.[0] || 'B-Roll Clip', item.url)}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Place</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-TAB 3: CUSTOM UPLOAD */}
            {brollSubTab === 'upload' && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3 text-center">
                  <div className="text-xs font-bold text-neutral-300">Upload Licensed / Owned Footage</div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Import your own authenticated video cutaways (.mp4, .mov, .jpg, .png) to use in this short.
                  </p>
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-neutral-700 hover:border-amber-400 text-xs text-neutral-300 hover:text-white cursor-pointer transition-colors bg-neutral-900/50">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Select Media File</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleUploadCustomBRoll}
                      className="hidden"
                    />
                  </label>
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
