import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ShortUnavailableRecovery } from '../ShortUnavailableRecovery';
import { ErrorBoundary } from '../ErrorBoundary';
import { SAMPLE_PROJECTS } from '../../data/sampleProjects';
import {
  ArrowLeft,
  Sparkles,
  Download,
  Share2,
  Sliders,
  Flame,
  Smartphone,
  Square,
  Tv,
  Check,
  Wand2,
  Undo2,
  Redo2,
  Upload,
  Activity,
  AlertTriangle,
  FileText,
  CheckCircle2,
  RotateCcw,
  X,
  Eye,
} from 'lucide-react';
import { generateContentAwareBRollSuggestions } from '../../utils/analysisEngine';
import {
  normalizeTranscriptResponse,
  autoFixCaptions,
  validateCaptionTiming,
  detectSemanticWordEmphasis,
} from '../../utils/captionEngine';
import { FloatingCaptionEditor } from './FloatingCaptionEditor';
import { buildCanonicalRenderPlan } from '../../utils/brollRankingEngine';
import {
  ShortCandidate,
  VideoProject,
  AspectRatio,
  CaptionCustomization,
  BrandKit,
  HookCategory,
  SFXCategory,
  EditingPersonality,
  SFXMarker,
  VFXMarker,
  BRollSuggestion,
  CaptionSegment,
  AudioToVideoConfig,
  ApprovalMode,
} from '../../types';
import { VideoCanvas } from './VideoCanvas';
import { Timeline } from './Timeline';
import { RightInspector, InspectorTabType } from './RightInspector';
import { AudioToVideoInspector } from './AudioToVideoInspector';
import { DevDebugPanel } from './DevDebugPanel';
import { EditorHeader, AutosaveStatus } from './EditorHeader';
import { LeftToolPanel, LeftPanelTabType } from './LeftToolPanel';
import { TypographyInspector } from './TypographyInspector';
import { DiagnosticsModal } from '../DiagnosticsModal';
import { BrandKitModal } from '../BrandKitModal';
import { sfxEngine } from '../../utils/sfxAudio';
import { adjustShortTrimBounds } from '../../utils/timeEngine';
import {
  createEditorProject,
  updateShortFromEditor,
  splitEditorProject,
  deleteEditorClip,
  trimEditorProject,
} from '../../utils/canonicalEditor';

interface VideoEditorProps {
  project: VideoProject;
  short: ShortCandidate;
  onBack: () => void;
  onExport: (short: ShortCandidate) => void;
  brandKit: BrandKit;
  editingPersonality: EditingPersonality;
  onUpdateShort?: (updated: ShortCandidate) => void;
}

function normalizeEditorShort(rawShort?: ShortCandidate, proj?: VideoProject): ShortCandidate {
  const safeProj = proj || SAMPLE_PROJECTS[0];
  const base = rawShort || safeProj?.shorts?.[0] || SAMPLE_PROJECTS[0]?.shorts?.[0];
  const safeStartTime = Number.isFinite(base?.startTime) ? base.startTime : 0;
  const safeDuration = Number.isFinite(base?.duration) && base.duration > 0
    ? base.duration
    : (Number.isFinite(base?.endTime) && base.endTime > safeStartTime ? base.endTime - safeStartTime : 28);
  const safeEndTime = Number.isFinite(base?.endTime) && base.endTime > safeStartTime ? base.endTime : (safeStartTime + safeDuration);

  return {
    ...base,
    id: base?.id || `short_${Date.now()}`,
    title: base?.title || 'Untitled Short Candidate',
    startTime: safeStartTime,
    endTime: safeEndTime,
    duration: safeDuration,
    aspectRatio: base?.aspectRatio || '9:16',
    speakerPosition: base?.speakerPosition || 'center',
    captions: Array.isArray(base?.captions) ? base.captions : [],
    sfxMarkers: Array.isArray(base?.sfxMarkers) ? base.sfxMarkers : [],
    vfxMarkers: Array.isArray(base?.vfxMarkers) ? base.vfxMarkers : [],
    brollSuggestions: Array.isArray(base?.brollSuggestions) ? base.brollSuggestions : [],
    viralScore: base?.viralScore || {
      overall: 94,
      breakdown: { hook: 96, retention: 94, emotion: 92, value: 95, pacing: 94, shareability: 93, clarity: 95, contextCompleteness: 91 },
      summary: 'High engagement score',
    },
    videoClips: Array.isArray(base?.videoClips) && base.videoClips.length > 0
      ? base.videoClips
      : [
          {
            id: `clip_${base?.id || '0'}`,
            sourceUrl: base?.videoProxyUrl || base?.audioUrl || safeProj?.videoUrl || '',
            sourceStart: safeStartTime,
            sourceEnd: safeEndTime,
            timelineStart: 0,
            timelineEnd: safeDuration,
          },
        ],
  };
}

export const VideoEditor: React.FC<VideoEditorProps> = ({
  project,
  short: initialShort,
  onBack,
  onExport,
  brandKit,
  editingPersonality,
  onUpdateShort,
}) => {
  // Pre-render validation: ensure project or short exists
  if (!project && !initialShort) {
    return (
      <ShortUnavailableRecovery
        reason="This Short could not be loaded because its source project is missing."
        onBackToShorts={onBack}
        onBackToDashboard={onBack}
      />
    );
  }

  const normalizedInitial = useMemo(() => normalizeEditorShort(initialShort, project), [initialShort, project]);
  const [currentShort, setCurrentShort] = useState<ShortCandidate>(normalizedInitial);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Keep track of SFX that played in the current run to prevent repeated triggers in the same second
  const playedSfxRef = useRef<Set<string>>(new Set());

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(normalizedInitial.aspectRatio || '9:16');
  const [activeTab, setActiveTab] = useState<InspectorTabType>('captions');
  const [zoomPunchEnabled, setZoomPunchEnabled] = useState<boolean>(true);
  const [isRegeneratingHooks, setIsRegeneratingHooks] = useState<boolean>(false);
  const [aiEditNotice, setAiEditNotice] = useState<string | null>(null);
  const [speakerPosition, setSpeakerPosition] = useState<'center' | 'left' | 'right' | 'auto_switch'>(normalizedInitial.speakerPosition || 'center');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcribeProgress, setTranscribeProgress] = useState<number>(0);
  const [transcribeStage, setTranscribeStage] = useState<
    'idle' | 'preparing_audio' | 'checking_providers' | 'transcribing' | 'detecting_language' | 'generating_timestamps' | 'building_captions' | 'syncing_timeline' | 'ready'
  >('idle');
  const [isDebugOpen, setIsDebugOpen] = useState<boolean>(false);
  const [panelMode, setPanelMode] = useState<'audio_studio' | 'standard'>(
    normalizedInitial.audioToVideoConfig ? 'audio_studio' : 'standard'
  );
  const [isAiStyling, setIsAiStyling] = useState<boolean>(false);
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>('auto_apply');
  const [isRegeneratingElements, setIsRegeneratingElements] = useState<boolean>(false);
  const [transcriptionFailure, setTranscriptionFailure] = useState<{
    reason: string;
    code?: string;
    providerStatuses?: Array<{ id: string; name: string; status: string; message?: string }>;
  } | null>(null);
  const [showManualCaptionModal, setShowManualCaptionModal] = useState<boolean>(false);
  const [manualDialogueText, setManualDialogueText] = useState<string>('');

  // Left Tool Panel Tab & Inspector Mode states
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTabType>('captions');
  const [inspectorMode, setInspectorMode] = useState<'typography' | 'tracks'>('typography');
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState<boolean>(false);
  const [isBrandKitModalOpen, setIsBrandKitModalOpen] = useState<boolean>(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('saved');

  // History stack for Undo/Redo
  const [history, setHistory] = useState<ShortCandidate[]>([normalizedInitial]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const pushState = (newShort: ShortCandidate) => {
    // Build canonical RenderPlan to ensure preview, timeline, and export are always 1:1 in sync
    const brollEvents = (newShort.brollSuggestions || []).map((b, idx) => ({
      id: b.id || `b_${idx}`,
      start: b.timestamp,
      end: b.timestamp + b.duration,
      source: 'pexels' as const,
      assetId: b.keyword || 'stock',
      assetUrl: b.imageUrl || '',
      thumbnailUrl: b.imageUrl || '',
      query: b.concept || '',
      transcriptContext: b.triggerText || '',
      reason: b.reason || '',
      semanticScore: b.confidence || 0.9,
      visualScore: 0.9,
      temporalScore: 0.9,
      continuityScore: 0.9,
      crop: { x: 0, y: 0, width: 1080, height: 1920, type: 'smart' as const },
      opacity: 1.0,
      audioEnabled: false,
      audioVolume: 0.08,
      approved: b.enabled !== false,
    }));

    const plan = buildCanonicalRenderPlan(
      project.id,
      newShort.id,
      newShort.duration,
      brollEvents,
      newShort.captions || [],
      newShort.sfxMarkers || []
    );

    plan.voiceoverEvents = newShort.voiceoverEvents;
    plan.presenterEvents = newShort.presenterEvents;
    plan.dubEvents = newShort.dubEvents;
    plan.assetProvenance = newShort.provenanceList;
    const effectiveCaptionCfg = newShort.captionCustomization || newShort.captionConfig || captionConfig;
    newShort.captionCustomization = effectiveCaptionCfg;
    newShort.captionConfig = effectiveCaptionCfg;
    (plan as any).captionConfig = effectiveCaptionCfg;
    newShort.renderPlan = plan;

    setAutosaveStatus('saving');
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newShort);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setCurrentShort(newShort);
    onUpdateShort?.(newShort);
    setTimeout(() => setAutosaveStatus('saved'), 600);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      const target = history[prevIdx];
      setCurrentShort(target);
      onUpdateShort?.(target);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      const target = history[nextIdx];
      setCurrentShort(target);
      onUpdateShort?.(target);
    }
  };

  // Sync state when active short clip changes
  useEffect(() => {
    const fresh = normalizeEditorShort(initialShort, project);
    setCurrentShort(fresh);
    setHistory([fresh]);
    setHistoryIndex(0);
    setCurrentTime(0);
    setIsPlaying(false);
    playedSfxRef.current.clear();
    const vid = videoRef.current;
    if (vid) {
      vid.pause();
      vid.currentTime = fresh.startTime || 0;
    }
  }, [initialShort?.id, project?.id]);

  const [captionConfig, setCaptionConfig] = useState<CaptionCustomization>(() => {
    return initialShort?.captionCustomization || initialShort?.captionConfig || {
      preset: 'punch_pop',
      style: 'punch_pop',
      fontFamily: 'Lemon Milk, Montserrat, sans-serif',
      fontSize: 34,
      fontWeight: 800,
      primaryColor: '#ffffff',
      highlightColor: '#facc15',
      strokeColor: '#000000',
      strokeWidth: 4,
      positionY: 72,
      uppercase: true,
      hasShadow: true,
      shadowColor: 'rgba(0, 0, 0, 0.95)',
      wordsPerLine: 3,
      wordsPerGroup: 3,
      maxLines: 2,
      animationType: 'pop',
      animationMode: 'ACTIVE_WORD',
    };
  });

  const handleCaptionConfigChange = useCallback((newCfg: CaptionCustomization) => {
    setCaptionConfig(newCfg);
    setCurrentShort((prev) => ({
      ...prev,
      captionCustomization: newCfg,
      captionConfig: newCfg,
    }));
  }, []);

  // Safe Area overlay state (lifted for header & canvas sync)
  const [safeAreaEnabled, setSafeAreaEnabled] = useState<boolean>(true);

  // Playhead update handler
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);

    // Check if an SFX marker was just passed
    currentShort.sfxMarkers?.forEach((sfx) => {
      if (Math.abs(time - sfx.timestamp) < 0.25 && !playedSfxRef.current.has(sfx.id)) {
        playedSfxRef.current.add(sfx.id);
        sfxEngine.playSound(sfx.category, sfx.volume);
      }
    });
  };

  // Reset played SFX tracker when seeking back
  const handleTimeSeek = (time: number) => {
    if (time < currentTime) {
      playedSfxRef.current.clear();
    }
    const boundedTime = Math.max(0, Math.min(currentShort.duration, time));
    setCurrentTime(boundedTime);
    const vid = videoRef.current;
    if (vid) {
      const clips = currentShort.videoClips && currentShort.videoClips.length > 0
        ? currentShort.videoClips
        : [{
            id: 'clip_default',
            sourceUrl: currentShort.videoProxyUrl || project.videoUrl || '',
            sourceStart: currentShort.startTime,
            sourceEnd: currentShort.endTime,
            timelineStart: 0,
            timelineEnd: currentShort.duration,
          }];
      const activeClip = clips.find((c) => boundedTime >= c.timelineStart && boundedTime < c.timelineEnd) || clips[clips.length - 1];
      vid.currentTime = activeClip.sourceStart + (boundedTime - activeClip.timelineStart);
    }
  };

  const handlePlayPause = async () => {
    const vid = videoRef.current;
    if (!vid) {
      setIsPlaying((p) => !p);
      return;
    }
    if (vid.paused) {
      if (vid.currentTime >= currentShort.endTime - 0.1) {
        vid.currentTime = currentShort.startTime;
        setCurrentTime(0);
      }
      try {
        await vid.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('Playback play request was prevented:', err);
      }
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };



  // Handle local video upload / media replacement
  const handleRelinkFile = (file: File) => {
    const objectUrl = URL.createObjectURL(file);

    // Sync file to backend /api/upload for server-side FFmpeg rendering
    const formData = new FormData();
    formData.append('video', file);
    fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.fileUrl) {
          setCurrentShort((prev) => ({
            ...prev,
            videoProxyUrl: data.fileUrl,
          }));
        }
      })
      .catch((err) => {
        console.warn('Backend video upload sync fallback:', err);
      });

    const tempVid = document.createElement('video');
    tempVid.preload = 'metadata';
    tempVid.src = objectUrl;
    tempVid.onloadedmetadata = () => {
      const dur = Number.isFinite(tempVid.duration) && tempVid.duration > 0 ? Math.round(tempVid.duration) : 28;
      const updated: ShortCandidate = {
        ...currentShort,
        videoProxyUrl: objectUrl,
        mediaUnavailable: false,
        mediaFileName: file.name,
        title: file.name.replace(/\.[^/.]+$/, ''),
        duration: dur,
        startTime: 0,
        endTime: dur,
      };
      pushState(updated);
      setAiEditNotice(`🎬 Loaded "${file.name}" (${dur}s, ${tempVid.videoWidth}x${tempVid.videoHeight})`);
      setTimeout(() => setAiEditNotice(null), 3500);
    };
    tempVid.onerror = () => {
      const updated: ShortCandidate = {
        ...currentShort,
        videoProxyUrl: objectUrl,
        mediaUnavailable: false,
        mediaFileName: file.name,
        title: file.name.replace(/\.[^/.]+$/, ''),
      };
      pushState(updated);
      setAiEditNotice(`🎬 Loaded "${file.name}"!`);
      setTimeout(() => setAiEditNotice(null), 3000);
    };
  };

  const handleLocalVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleRelinkFile(file);
  };

  // Select Hook variation
  const handleSelectHook = (hookText: string, category: HookCategory) => {
    const updated = {
      ...currentShort,
      hookText,
      hookCategory: category,
    };
    pushState(updated);
  };

  // Regenerate Hooks via server API
  const handleRegenerateHooks = async () => {
    setIsRegeneratingHooks(true);
    try {
      const res = await fetch('/api/generate-hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipTopic: currentShort.topic,
          currentDialogue: currentShort.hookText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.hooks && Array.isArray(data.hooks)) {
          const updated = {
            ...currentShort,
            hookOptions: data.hooks,
          };
          pushState(updated);
        }
      }
    } catch (err) {
      console.warn('Fallback hooks regeneration:', err);
    } finally {
      setIsRegeneratingHooks(false);
    }
  };

  // Add SFX Marker at current playhead
  const handleAddSFXAtCurrentTime = (cat: SFXCategory, name: string) => {
    const newMarker: SFXMarker = {
      id: `sfx_${Date.now()}`,
      category: cat,
      soundName: name,
      timestamp: currentTime,
      volume: 0.8,
    };

    const updated = {
      ...currentShort,
      sfxMarkers: [...(currentShort.sfxMarkers || []), newMarker],
    };
    pushState(updated);
    sfxEngine.playSound(cat, 0.8);
  };

  const handleAddSFXMarker = (marker: SFXMarker) => {
    const updated = {
      ...currentShort,
      sfxMarkers: [...(currentShort.sfxMarkers || []), marker],
    };
    pushState(updated);
  };

  const handleUpdateSFXMarker = (id: string, updates: Partial<SFXMarker>) => {
    const updated = {
      ...currentShort,
      sfxMarkers: (currentShort.sfxMarkers || []).map((s) => (s.id === id ? { ...s, ...updates } : s)),
    };
    pushState(updated);
  };

  const handleRegenerateSingleSFX = async (sfxId: string) => {
    try {
      const projId = project?.id || 'default';
      const res = await fetch(`/api/projects/${projId}/regenerate-elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortId: currentShort.id,
          target: 'sfx',
          targetSfxId: sfxId,
        }),
      });
      const data = await res.json();
      if (data.success && data.short) {
        pushState(data.short);
        setAiEditNotice('✨ Selected SFX regenerated with AI sound synthesis!');
      }
    } catch (err) {
      console.error('Error regenerating single SFX:', err);
    }
  };

  // Add VFX Marker at current playhead
  const handleAddVFXAtCurrentTime = (
    type: 'zoom_punch' | 'shake' | 'glow' | 'motion_blur' | 'glitch' | 'callout',
    label: string
  ) => {
    const newVfx: VFXMarker = {
      id: `vfx_${Date.now()}`,
      type,
      timestamp: currentTime,
      duration: 1.5,
      label,
      intensity: 0.8,
    };

    const updated = {
      ...currentShort,
      vfxMarkers: [...(currentShort.vfxMarkers || []), newVfx],
    };
    pushState(updated);
  };

  // Add B-Roll at current playhead
  const handleAddBRollAtCurrentTime = (concept: string, imageUrl: string) => {
    const newBRoll: BRollSuggestion = {
      id: `broll_${Date.now()}`,
      concept,
      timestamp: currentTime,
      duration: 2.5,
      imageUrl,
      enabled: true,
    };

    const updated = {
      ...currentShort,
      brollSuggestions: [...(currentShort.brollSuggestions || []), newBRoll],
    };
    pushState(updated);
  };

  // Toggle B-Roll
  const handleToggleBRoll = (id: string) => {
    const updated = {
      ...currentShort,
      brollSuggestions: (currentShort.brollSuggestions || []).map((br) =>
        br.id === id ? { ...br, enabled: !br.enabled } : br
      ),
    };
    pushState(updated);
  };

  // Update Short candidate and persist to project
  const handleUpdateShort = (updatedShort: ShortCandidate) => {
    pushState(updatedShort);
    if (project) {
      const updatedShorts = (project.shorts || []).map((s) => (s.id === updatedShort.id ? updatedShort : s));
      const updatedProject = { ...project, shorts: updatedShorts };
      fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: updatedProject }),
      }).catch(console.error);
    }
  };

  // Update specific B-roll suggestion properties
  const handleUpdateBRoll = (id: string, updates: Partial<BRollSuggestion>) => {
    const updated = {
      ...currentShort,
      brollSuggestions: (currentShort.brollSuggestions || []).map((br) =>
        br.id === id ? { ...br, ...updates } : br
      ),
    };
    handleUpdateShort(updated);
  };

  // Update Caption Segment Text
  const handleUpdateCaptionText = (id: string, text: string) => {
    const updated = {
      ...currentShort,
      captions: (currentShort.captions || []).map((c) => {
        if (c.id === id) {
          const rawWords = text.trim().split(/\s+/);
          const segDuration = Math.max(0.5, c.end - c.start);
          const wordDur = segDuration / Math.max(1, rawWords.length);
          const words = rawWords.map((w, idx) => ({
            word: w,
            start: c.start + idx * wordDur,
            end: c.start + (idx + 1) * wordDur,
            scale: 1.15,
          }));
          return { ...c, text, words };
        }
        return c;
      }),
    };
    pushState(updated);
  };

  // Split at playhead
  const handleSplitTimeline = (time: number) => {
    if (time <= 0.5 || time >= currentShort.duration - 0.5) return;
    const splitTime = Number(time.toFixed(1));

    // Split any active caption crossing splitTime into two distinct segments
    const splitCaptions = (currentShort.captions || []).flatMap((c) => {
      if (c.start < splitTime && c.end > splitTime) {
        const wordsBefore = (c.words || []).filter((w) => w.end <= splitTime);
        const wordsAfter = (c.words || []).filter((w) => w.start >= splitTime);
        return [
          {
            ...c,
            id: `${c.id}_pt1`,
            end: splitTime,
            text: wordsBefore.map((w) => w.word).join(' ') || c.text,
            words: wordsBefore,
          },
          {
            ...c,
            id: `${c.id}_pt2`,
            start: splitTime,
            text: wordsAfter.map((w) => w.word).join(' ') || c.text,
            words: wordsAfter,
          },
        ];
      }
      return [c];
    });

    // Canonical split for multi-clip editing
    const editor = createEditorProject(project, { ...currentShort, captions: splitCaptions });
    const splitEditor = splitEditorProject(editor, splitTime);
    const updated = updateShortFromEditor(currentShort, splitEditor);

    const existingCuts = currentShort.cuts || [];
    updated.cuts = Array.from(new Set([...existingCuts, splitTime])).sort((a, b) => a - b);
    updated.captions = splitCaptions;

    pushState(updated);
    setAiEditNotice(`✂️ Split clip into Clip A & Clip B at ${splitTime.toFixed(1)}s`);
    setTimeout(() => setAiEditNotice(null), 2500);
  };

  // Transcribe speech using production AI transcription service with multi-provider fallback
  const handleTranscribeCaptions = async () => {
    if (isTranscribing) return; // Prevent duplicate clicks

    // STATE 1: Preparing audio
    setIsTranscribing(true);
    setTranscribeProgress(15);
    setTranscribeStage('preparing_audio');
    setAiEditNotice('🎙️ Preparing audio stream from source media...');

    try {
      // STATE 2: Checking providers
      setTimeout(() => {
        setTranscribeProgress(30);
        setTranscribeStage('checking_providers');
        setAiEditNotice('🔍 Checking transcription providers (Gemini & Local Whisper)...');
      }, 250);

      const targetVideoUrl =
        currentShort.videoProxyUrl ||
        currentShort.audioUrl ||
        project.videoUrl ||
        project.extractedAudioPath ||
        '';

      const activeLang = typeof currentShort.language === 'object' && currentShort.language !== null
        ? ((currentShort.language as any).detectedCode || (currentShort.language as any).primaryLanguage || 'auto')
        : String(currentShort.language || 'auto');

      const res = await fetch('/api/transcribe-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: targetVideoUrl,
          title: currentShort.title,
          topic: currentShort.topic,
          duration: currentShort.duration,
          startTime: currentShort.startTime || 0,
          endTime: currentShort.endTime,
          language: activeLang,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsTranscribing(false);
        setTranscribeStage('idle');
        setTranscribeProgress(0);
        const errorReason = data?.message || data?.error || 'Speech transcription failed.';
        setTranscriptionFailure({
          reason: errorReason,
          code: data?.code,
          providerStatuses: data?.providerStatuses,
        });
        setAiEditNotice(null);
        return;
      }

      // Hard Validation:
      const words =
        data.canonicalTranscript?.words ||
        (data.captions || []).flatMap((c: any) => c.words || []);
      const hasWords = Array.isArray(words) && words.length > 0;
      const validTimestamps =
        hasWords &&
        words.every(
          (w: any) =>
            typeof w.start === 'number' &&
            typeof w.end === 'number' &&
            w.start >= 0 &&
            w.end >= w.start
        );
      const hasCaptions = Array.isArray(data.captions) && data.captions.length > 0;

      if (!hasWords || !validTimestamps || !hasCaptions) {
        setIsTranscribing(false);
        setTranscribeStage('idle');
        setTranscribeProgress(0);
        setTranscriptionFailure({
          reason: 'Transcription validation failed: Received empty or invalid word timestamps from audio.',
          code: 'INVALID_WORD_TIMESTAMPS',
        });
        setAiEditNotice(null);
        return;
      }

      const providerLabel = data.providerUsed === 'local-whisper'
        ? `Local Whisper (${data.model || 'tiny'})`
        : (data.providerUsed === 'gemini' ? 'Google Gemini' : data.providerUsed || 'AI ASR');

      // STATE 3: Transcribing
      setTranscribeProgress(60);
      setTranscribeStage('transcribing');
      setAiEditNotice(`⚡ Transcribed using ${providerLabel}...`);

      // STATE 4: Detecting language
      setTimeout(() => {
        setTranscribeProgress(75);
        setTranscribeStage('detecting_language');
        const langLabel = data.language || 'Auto';
        const confPercent = Math.round((data.languageConfidence || 0.95) * 100);
        setAiEditNotice(`✓ Detected language: ${langLabel} (${confPercent}%)`);
      }, 200);

      // STATE 5: Generating timestamps & building captions
      setTimeout(() => {
        setTranscribeProgress(85);
        setTranscribeStage('generating_timestamps');
        setAiEditNotice(`⏱️ Generated ${words.length} word-level timestamps`);
      }, 400);

      setTimeout(() => {
        setTranscribeProgress(92);
        setTranscribeStage('building_captions');
      }, 550);

      // STATE 6: Syncing timeline & RenderPlan
      setTimeout(() => {
        setTranscribeProgress(97);
        setTranscribeStage('syncing_timeline');

        // Regenerate semantic B-roll based on newly generated captions!
        const semanticBroll = generateContentAwareBRollSuggestions(data.captions, currentShort.duration, {
          threshold: 0.85,
        });
        const updatedBroll = semanticBroll.map((b, idx) => ({
          id: `broll_trans_${Date.now()}_${idx}`,
          timestamp: b.start,
          duration: Number((b.end - b.start).toFixed(2)),
          concept: b.query || b.concept,
          imageUrl: b.assetUrl,
          keyword: b.assetId,
          type: 'broll' as const,
          category: 'stock',
          enabled: true,
          status: 'accepted' as const,
          reason: `Auto-matched to speech transcript: "${b.concept}"`,
          track: 2,
        }));

        const updated: ShortCandidate = {
          ...currentShort,
          captions: data.captions,
          canonicalTranscript: data.canonicalTranscript,
          scriptSections: data.scriptSections || currentShort.scriptSections,
          detectedLanguages: data.detectedLanguages || currentShort.detectedLanguages,
          language: data.language || currentShort.language,
          brollSuggestions: updatedBroll.length > 0 ? updatedBroll : currentShort.brollSuggestions,
        };

        pushState(updated);

        // STATE 7: Ready
        setTimeout(() => {
          setTranscribeProgress(100);
          setTranscribeStage('ready');
          const cov = Math.round((data.speechCoverage || 0.96) * 100);
          const successNotice = data.providerUsed === 'local-whisper'
            ? `✓ Transcribed locally using Whisper (${data.captions.length} captions, ${cov}% speech coverage)`
            : `✓ Transcribed with ${providerLabel} (${data.captions.length} captions, ${cov}% speech coverage)`;
          setAiEditNotice(successNotice);
          setTimeout(() => {
            setIsTranscribing(false);
            setTranscribeStage('idle');
            setTranscribeProgress(0);
          }, 1200);
        }, 300);
      }, 700);
    } catch (err: any) {
      console.error('Failed to transcribe', err);
      setIsTranscribing(false);
      setTranscribeStage('idle');
      setTranscribeProgress(0);
      setTranscriptionFailure({
        reason: 'Network error or transcription service unavailable. Please check server logs.',
        code: 'NETWORK_ERROR',
      });
      setAiEditNotice(null);
    }
  };

  // Manual Dialogue / Transcript submission
  const handleApplyManualDialogue = async () => {
    if (!manualDialogueText.trim()) return;
    setIsTranscribing(true);
    try {
      const res = await fetch('/api/transcribe-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dialogue: manualDialogueText.trim(),
          duration: currentShort.duration,
        }),
      });
      const data = await res.json();
      if (data.success && data.captions && data.captions.length > 0) {
        const semanticBroll = generateContentAwareBRollSuggestions(data.captions, currentShort.duration, {
          threshold: 0.85,
        });
        const updatedBroll = semanticBroll.map((b, idx) => ({
          id: `broll_man_${Date.now()}_${idx}`,
          timestamp: b.start,
          duration: Number((b.end - b.start).toFixed(2)),
          concept: b.query || b.concept,
          imageUrl: b.assetUrl,
          keyword: b.assetId,
          enabled: true,
          reason: b.reason,
          triggerText: b.triggerText,
          confidence: b.confidence,
        }));

        const updated = {
          ...currentShort,
          captions: data.captions,
          brollSuggestions: updatedBroll.length > 0 ? updatedBroll : currentShort.brollSuggestions,
        };
        pushState(updated);
        setShowManualCaptionModal(false);
        setManualDialogueText('');
        setAiEditNotice(`✨ Generated ${data.captions.length} aligned caption segments from text!`);
        setTimeout(() => setAiEditNotice(null), 3500);
      }
    } catch (err) {
      console.error('Failed to apply manual dialogue', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Subtitle file (.srt, .vtt, .json) upload handler
  const handleUploadSubtitles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = String(ev.target?.result || '');
        let parsed: any = null;
        if (file.name.endsWith('.json')) {
          parsed = JSON.parse(content);
        } else {
          // Parse SRT / VTT lines into segments
          const lines = content.split(/\r?\n/);
          const vttSegments: any[] = [];
          let currentTiming: { start: number; end: number } | null = null;
          let currentText: string[] = [];
          const parseTime = (tStr: string): number => {
            const parts = tStr.trim().replace(',', '.').split(':');
            if (parts.length === 3)
              return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
            if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
            return 0;
          };
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'WEBVTT' || /^\d+$/.test(trimmed)) {
              if (currentTiming && currentText.length > 0) {
                const text = currentText.join(' ').trim();
                if (text)
                  vttSegments.push({
                    id: `sub_${vttSegments.length + 1}`,
                    start: currentTiming.start,
                    end: currentTiming.end,
                    text,
                  });
                currentTiming = null;
                currentText = [];
              }
              continue;
            }
            const match = trimmed.match(
              /((?:\d+:)?\d+:\d+(?:[.,]\d+)?)\s*-->\s*((?:\d+:)?\d+:\d+(?:[.,]\d+)?)/
            );
            if (match) {
              if (currentTiming && currentText.length > 0) {
                const text = currentText.join(' ').trim();
                if (text)
                  vttSegments.push({
                    id: `sub_${vttSegments.length + 1}`,
                    start: currentTiming.start,
                    end: currentTiming.end,
                    text,
                  });
                currentText = [];
              }
              currentTiming = {
                start: Number(parseTime(match[1]).toFixed(3)),
                end: Number(parseTime(match[2]).toFixed(3)),
              };
            } else if (currentTiming) {
              currentText.push(trimmed.replace(/<[^>]+>/g, ''));
            }
          }
          parsed = { segments: vttSegments };
        }
        const normalized = normalizeTranscriptResponse(parsed, currentShort.duration);
        if (normalized.segments.length > 0) {
          const semanticBroll = generateContentAwareBRollSuggestions(
            normalized.segments as any,
            currentShort.duration,
            { threshold: 0.85 }
          );
          const updatedBroll = semanticBroll.map((b, idx) => ({
            id: `broll_file_${Date.now()}_${idx}`,
            timestamp: b.start,
            duration: Number((b.end - b.start).toFixed(2)),
            concept: b.query || b.concept,
            imageUrl: b.assetUrl,
            keyword: b.assetId,
            enabled: true,
            reason: b.reason,
            triggerText: b.triggerText,
            confidence: b.confidence,
          }));
          const updated = {
            ...currentShort,
            captions: normalized.segments as any,
            brollSuggestions: updatedBroll.length > 0 ? updatedBroll : currentShort.brollSuggestions,
          };
          pushState(updated);
          setShowManualCaptionModal(false);
          setTranscriptionFailure(null);
          setAiEditNotice(`✨ Imported ${normalized.segments.length} caption segments from file!`);
          setTimeout(() => setAiEditNotice(null), 3500);
        }
      } catch (err) {
        console.error('Failed to parse subtitle file:', err);
      }
    };
    reader.readAsText(file);
  };

  // Add caption segment at current playhead
  const handleAddCaptionAtCurrentTime = () => {
    const start = currentTime;
    const end = Math.min(start + 2.0, currentShort.duration);
    const newCap: CaptionSegment = {
      id: `cap_${Date.now()}`,
      start,
      end,
      text: 'New spoken phrase',
      words: [
        { word: 'New', start, end: start + 0.6, scale: 1.1 },
        { word: 'spoken', start: start + 0.6, end: start + 1.3, scale: 1.1 },
        { word: 'phrase', start: start + 1.3, end, scale: 1.1 },
      ],
    };
    const updated = {
      ...currentShort,
      captions: [...(currentShort.captions || []), newCap].sort((a, b) => a.start - b.start),
    };
    pushState(updated);
    setAiEditNotice(`📝 Added caption segment at ${start.toFixed(1)}s`);
    setTimeout(() => setAiEditNotice(null), 2500);
  };

  // Update Caption
  const handleUpdateCaption = (updatedCaption: CaptionSegment) => {
    const updatedCaptions = (currentShort.captions || []).map((c) =>
      c.id === updatedCaption.id ? updatedCaption : c
    );
    const updated = {
      ...currentShort,
      captions: updatedCaptions,
    };
    pushState(updated);
  };

  // Update Caption Timing (from draggable timeline block handles)
  const handleUpdateCaptionTiming = (captionId: string, newStart: number, newEnd: number) => {
    const target = (currentShort.captions || []).find((c) => c.id === captionId);
    if (!target) return;

    const dur = Math.max(0.2, newEnd - newStart);
    const words = target.words || [];
    const origDur = Math.max(0.1, target.end - target.start);
    const updatedWords = words.map((w) => {
      const ratioStart = Math.max(0, Math.min(1, (w.start - target.start) / origDur));
      const ratioEnd = Math.max(0, Math.min(1, (w.end - target.start) / origDur));
      return {
        ...w,
        start: Number((newStart + ratioStart * dur).toFixed(3)),
        end: Number((newStart + ratioEnd * dur).toFixed(3)),
      };
    });

    const updatedCaption: CaptionSegment = {
      ...target,
      start: Number(newStart.toFixed(3)),
      end: Number(newEnd.toFixed(3)),
      words: updatedWords,
    };

    validateCaptionTiming(updatedCaption, undefined, currentShort.duration);

    const updatedCaptions = (currentShort.captions || []).map((c) =>
      c.id === captionId ? updatedCaption : c
    ).sort((a, b) => a.start - b.start);

    const updated = {
      ...currentShort,
      captions: updatedCaptions,
    };
    pushState(updated);
  };

  // Update Individual Word Timing (from draggable timeline word boundaries)
  const handleUpdateWordTiming = (captionId: string, wordIndex: number, newStart: number, newEnd: number) => {
    const target = (currentShort.captions || []).find((c) => c.id === captionId);
    if (!target) return;

    let words = target.words;
    if (!words || words.length === 0) {
      const rawWords = (target.text || '').trim().split(/\s+/).filter(Boolean);
      const dur = Math.max(0.1, target.end - target.start);
      const step = dur / Math.max(1, rawWords.length);
      words = rawWords.map((w, i) => ({
        id: `w_${target.id}_${i}`,
        word: w,
        start: Number((target.start + i * step).toFixed(3)),
        end: Number((target.start + (i + 1) * step).toFixed(3)),
      }));
    }

    if (!words[wordIndex]) return;

    const updatedWords = [...words];
    const oldWord = updatedWords[wordIndex];
    updatedWords[wordIndex] = {
      ...oldWord,
      start: Number(newStart.toFixed(3)),
      end: Number(newEnd.toFixed(3)),
    };

    const minStart = Math.min(target.start, newStart);
    const maxEnd = Math.max(target.end, newEnd);

    const updatedCaption: CaptionSegment = {
      ...target,
      start: Number(minStart.toFixed(3)),
      end: Number(maxEnd.toFixed(3)),
      words: updatedWords,
    };

    const updatedCaptions = (currentShort.captions || []).map((c) =>
      c.id === captionId ? updatedCaption : c
    );

    pushState({
      ...currentShort,
      captions: updatedCaptions,
    });
  };

  // Reset workspace layout
  const handleResetLayout = () => {
    setAspectRatio('9:16');
    setSafeAreaEnabled(true);
    setActiveTab('captions');
    setPanelMode('standard');
    setSelectedItemId(null);
    setAiEditNotice('🔄 Layout reset to default 9:16 configuration');
    setTimeout(() => setAiEditNotice(null), 2000);
  };

  // Split Caption at Playhead (Part 9 & 11)
  const handleSplitCaption = (captionId?: string, splitTime?: number) => {
    const targetId = captionId || selectedItemId;
    const time = splitTime ?? currentTime;
    const target = (currentShort.captions || []).find((c) => c.id === targetId);
    if (!target || time <= target.start + 0.1 || time >= target.end - 0.1) return;

    const wordsBefore = (target.words || []).filter((w) => w.end <= time || w.start < time);
    const wordsAfter = (target.words || []).filter((w) => w.start >= time || w.end > time);

    const capPt1: CaptionSegment = {
      ...target,
      id: `${target.id}_pt1`,
      end: Number(time.toFixed(3)),
      text: wordsBefore.map((w) => w.word || (w as any).text).join(' ') || target.text,
      words: wordsBefore,
    };

    const capPt2: CaptionSegment = {
      ...target,
      id: `${target.id}_pt2`,
      start: Number(time.toFixed(3)),
      text: wordsAfter.map((w) => w.word || (w as any).text).join(' ') || target.text,
      words: wordsAfter,
    };

    const updatedCaptions = (currentShort.captions || [])
      .flatMap((c) => (c.id === targetId ? [capPt1, capPt2] : [c]))
      .sort((a, b) => a.start - b.start);

    const updated = {
      ...currentShort,
      captions: updatedCaptions,
    };
    pushState(updated);
    setSelectedItemId(capPt2.id);
    setAiEditNotice(`✂️ Split caption beat at ${time.toFixed(1)}s`);
    setTimeout(() => setAiEditNotice(null), 2500);
  };

  // Merge Adjacent Captions (Part 9 & 11)
  const handleMergeCaptions = (captionId?: string) => {
    const targetId = captionId || selectedItemId;
    const caps = currentShort.captions || [];
    const idx = caps.findIndex((c) => c.id === targetId);
    if (idx === -1 || idx >= caps.length - 1) return;

    const currentCap = caps[idx];
    const nextCap = caps[idx + 1];

    const mergedWords = [...(currentCap.words || []), ...(nextCap.words || [])];
    const mergedText = `${currentCap.text} ${nextCap.text}`.trim();

    const mergedCap: CaptionSegment = {
      ...currentCap,
      end: nextCap.end,
      text: mergedText,
      words: mergedWords,
    };

    const updatedCaptions = caps
      .filter((_, i) => i !== idx + 1)
      .map((c) => (c.id === targetId ? mergedCap : c));

    const updated = {
      ...currentShort,
      captions: updatedCaptions,
    };
    pushState(updated);
    setAiEditNotice(`🔗 Merged 2 caption beats into one`);
    setTimeout(() => setAiEditNotice(null), 2500);
  };

  // Regenerate Single Caption Beat (Part 33)
  const handleRegenerateCaption = (captionId?: string) => {
    const targetId = captionId || selectedItemId;
    const target = (currentShort.captions || []).find((c) => c.id === targetId);
    if (!target) return;

    const emphasis = detectSemanticWordEmphasis(target.words || []);
    const updatedWords = (target.words || []).map((w, idx) => {
      const emp = emphasis.find((e) => e.wordIndex === idx);
      return {
        ...w,
        isHighlight: Boolean(emp),
        highlightColor: emp ? emp.highlightColor : undefined,
        scale: emp ? 1.08 : 1.0,
      };
    });

    const updatedCap = {
      ...target,
      words: updatedWords,
    };

    const updated = {
      ...currentShort,
      captions: (currentShort.captions || []).map((c) => (c.id === targetId ? updatedCap : c)),
    };
    pushState(updated);
    setAiEditNotice(`✨ Regenerated caption beat emphasis`);
    setTimeout(() => setAiEditNotice(null), 2000);
  };

  // Auto-Fix Captions (Part 12)
  const handleFixCaptions = () => {
    const res = autoFixCaptions(currentShort.captions || [], currentShort.duration || 30);
    const updated = {
      ...currentShort,
      captions: res.fixedCaptions,
      speechCoverage: res.speechCoveragePercent,
    };
    pushState(updated);
    setAiEditNotice(`✅ ${res.message}`);
    setTimeout(() => setAiEditNotice(null), 3500);
  };

  // Delete Caption
  const handleDeleteCaption = (id: string) => {
    const updated = {
      ...currentShort,
      captions: (currentShort.captions || []).filter((c) => c.id !== id),
    };
    pushState(updated);
    if (selectedItemId === id) {
      setSelectedItemId(null);
    }
  };

  // Delete selected marker, caption or video clip
  const handleDeleteSelected = () => {
    if (!selectedItemId) return;

    // Check if selected item is a word
    if (selectedItemId.startsWith('word_')) {
      const parts = selectedItemId.split('_');
      const capId = parts.slice(1, -1).join('_');
      const wIdx = parseInt(parts[parts.length - 1], 10);
      const target = (currentShort.captions || []).find((c) => c.id === capId);
      if (target && target.words && target.words[wIdx] !== undefined) {
        const updatedWords = target.words.filter((_, idx) => idx !== wIdx);
        const updatedCaption: CaptionSegment = {
          ...target,
          text: updatedWords.map((w) => w.word || (w as any).text).join(' '),
          words: updatedWords,
        };
        const updatedCaptions = (currentShort.captions || []).map((c) =>
          c.id === capId ? updatedCaption : c
        );
        pushState({
          ...currentShort,
          captions: updatedCaptions,
        });
        setSelectedItemId(null);
        setAiEditNotice('🗑️ Deleted word from timeline');
        setTimeout(() => setAiEditNotice(null), 2000);
        return;
      }
    }

    // Check if it's a video clip
    if (currentShort.videoClips && currentShort.videoClips.some((c) => c.id === selectedItemId)) {
      if (currentShort.videoClips.length <= 1) {
        setAiEditNotice('⚠️ Cannot delete the only remaining video clip.');
        setTimeout(() => setAiEditNotice(null), 2500);
        return;
      }
      const editor = createEditorProject(project, currentShort);
      const updatedEditor = deleteEditorClip(editor, selectedItemId);
      const updated = updateShortFromEditor(currentShort, updatedEditor);
      pushState(updated);
      setSelectedItemId(null);
      setAiEditNotice('🗑️ Deleted clip and recalibrated sequence.');
      setTimeout(() => setAiEditNotice(null), 2500);
      return;
    }

    const capToDelete = (currentShort.captions || []).find((c) => c.id === selectedItemId);
    if (capToDelete) {
      setDeletedCaptionsHistory((prev) => [...prev, capToDelete]);
    }

    const updated = {
      ...currentShort,
      captions: (currentShort.captions || []).filter((c) => c.id !== selectedItemId),
      sfxMarkers: (currentShort.sfxMarkers || []).filter((s) => s.id !== selectedItemId),
      vfxMarkers: (currentShort.vfxMarkers || []).filter((v) => v.id !== selectedItemId),
      brollSuggestions: (currentShort.brollSuggestions || []).filter((b) => b.id !== selectedItemId),
    };
    pushState(updated);
    setSelectedItemId(null);
  };

  const [deletedCaptionsHistory, setDeletedCaptionsHistory] = useState<CaptionSegment[]>([]);

  // Duplicate Caption (Phase 11)
  const handleDuplicateCaption = useCallback((captionId: string) => {
    const capIndex = (currentShort.captions || []).findIndex((c) => c.id === captionId);
    if (capIndex === -1) return;
    const target = currentShort.captions![capIndex];
    const duration = Math.max(0.4, target.end - target.start);
    const newStart = target.end + 0.05;
    const newEnd = newStart + duration;
    const newId = `cap_dup_${Date.now()}`;
    const newWords = (target.words || []).map((w, wIdx) => {
      const offset = newStart - target.start;
      return {
        ...w,
        id: `${newId}_w_${wIdx}`,
        start: w.start + offset,
        end: w.end + offset,
      };
    });

    const duplicatedCaption: CaptionSegment = {
      ...target,
      id: newId,
      start: newStart,
      end: newEnd,
      displayStart: newStart,
      displayEnd: newEnd,
      words: newWords,
    };

    const newCaptions = [...(currentShort.captions || [])];
    newCaptions.splice(capIndex + 1, 0, duplicatedCaption);

    pushState({
      ...currentShort,
      captions: newCaptions,
    });
    setSelectedItemId(newId);
  }, [currentShort, pushState]);

  // Restore Last Deleted Caption (Phase 11)
  const handleRestoreLastCaption = useCallback(() => {
    if (deletedCaptionsHistory.length === 0) return;
    const lastDeleted = deletedCaptionsHistory[deletedCaptionsHistory.length - 1];
    setDeletedCaptionsHistory((prev) => prev.slice(0, -1));
    const newCaptions = [...(currentShort.captions || []), lastDeleted].sort((a, b) => a.start - b.start);
    pushState({
      ...currentShort,
      captions: newCaptions,
    });
    setSelectedItemId(lastDeleted.id);
  }, [deletedCaptionsHistory, currentShort, pushState]);

  // Consolidated Professional Keyboard Shortcuts (Phase 11)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        if (selectedItemId && (currentShort.captions || []).some((c) => c.id === selectedItemId)) {
          handleSplitCaption(selectedItemId, currentTime);
        } else {
          handleSplitTimeline(currentTime);
        }
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        if (selectedItemId && (currentShort.captions || []).some((c) => c.id === selectedItemId)) {
          handleMergeCaptions(selectedItemId);
        }
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedItemId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const cap = selectedItemId ? (currentShort.captions || []).find((c) => c.id === selectedItemId) : null;
        if (cap && Array.isArray(cap.words) && cap.words.length > 0) {
          const curIdx = cap.words.findIndex((w) => currentTime >= w.start && currentTime <= w.end);
          if (curIdx > 0) {
            handleTimeSeek(cap.words[curIdx - 1].start);
          } else {
            handleTimeSeek(Math.max(0, cap.start));
          }
        } else {
          handleTimeSeek(Math.max(0, currentTime - (e.shiftKey ? 5 : 1)));
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const cap = selectedItemId ? (currentShort.captions || []).find((c) => c.id === selectedItemId) : null;
        if (cap && Array.isArray(cap.words) && cap.words.length > 0) {
          const curIdx = cap.words.findIndex((w) => currentTime >= w.start && currentTime <= w.end);
          if (curIdx >= 0 && curIdx < cap.words.length - 1) {
            handleTimeSeek(cap.words[curIdx + 1].start);
          } else {
            handleTimeSeek(Math.min(currentShort.duration, cap.end));
          }
        } else {
          handleTimeSeek(Math.min(currentShort.duration, currentTime + (e.shiftKey ? 5 : 1)));
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD') {
        e.preventDefault();
        setIsDebugOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedItemId,
    currentTime,
    currentShort,
    handlePlayPause,
    handleDeleteSelected,
    handleUndo,
    handleRedo,
    handleSplitCaption,
    handleSplitTimeline,
    handleMergeCaptions,
    handleTimeSeek,
  ]);

  // Delete SFX
  const handleDeleteSFX = (id: string) => {
    const updated = {
      ...currentShort,
      sfxMarkers: (currentShort.sfxMarkers || []).filter((s) => s.id !== id),
    };
    pushState(updated);
  };

  // Delete VFX
  const handleDeleteVFX = (id: string) => {
    const updated = {
      ...currentShort,
      vfxMarkers: (currentShort.vfxMarkers || []).filter((v) => v.id !== id),
    };
    pushState(updated);
  };

  // Delete B-Roll
  const handleDeleteBRoll = (id: string) => {
    const updated = {
      ...currentShort,
      brollSuggestions: (currentShort.brollSuggestions || []).filter((b) => b.id !== id),
    };
    pushState(updated);
  };

  // Trim silence & dead air
  const handleTrimSilence = () => {
    const caps = currentShort.captions || [];
    if (caps.length === 0) {
      setAiEditNotice('No captions found to analyze silence.');
      setTimeout(() => setAiEditNotice(null), 2500);
      return;
    }

    if (caps[0].start > 0.6) {
      const trimAmount = caps[0].start - 0.15;
      const newStart = currentShort.startTime + trimAmount;
      const shiftedCaps = caps.map((c) => ({
        ...c,
        start: Math.max(0, c.start - trimAmount),
        end: Math.max(0.1, c.end - trimAmount),
        words: c.words?.map((w) => ({
          ...w,
          start: Math.max(0, w.start - trimAmount),
          end: Math.max(0.1, w.end - trimAmount),
        })),
      }));

      const newDur = Math.max(2, currentShort.duration - trimAmount);
      const updated = {
        ...currentShort,
        startTime: newStart,
        duration: newDur,
        captions: shiftedCaps,
      };
      pushState(updated);
      setAiEditNotice(`✂️ Cut ${trimAmount.toFixed(1)}s of opening dead air!`);
    } else {
      setAiEditNotice('✨ Speech timing is already tight!');
    }
    setTimeout(() => setAiEditNotice(null), 3000);
  };

  // Handle trim changes directly from timeline handles
  const handleTrimChange = (newBounds: { startTime: number; endTime: number }) => {
    const { startTime, endTime } = newBounds;
    const editor = createEditorProject(project, currentShort);
    const trimmedEditor = trimEditorProject(editor, startTime, endTime);
    const updated = updateShortFromEditor(currentShort, trimmedEditor);
    pushState(updated);
    const vid = videoRef.current;
    if (vid) {
      vid.currentTime = updated.startTime;
    }
    setCurrentTime(0);
  };

  // One-Click AI Edit button
  const handleOneClickAIEdit = async () => {
    setCaptionConfig((prev) => ({
      ...prev,
      preset: 'kinetic',
      highlightColor: '#facc15',
      fontSize: 32,
      strokeWidth: 3,
      positionY: 65,
    }));
    setZoomPunchEnabled(true);
    sfxEngine.playSound('impact', 0.9);

    // Call server AI edit if available
    try {
      const res = await fetch(`/api/projects/${project.id}/ai-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortId: currentShort.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.short) {
          pushState(data.short);
        }
      }
    } catch (e) {
      console.warn('Client fallback AI edit');
    }

    setAiEditNotice('✨ AI Auto-Edit applied: Kinetic captions, enhanced punch-ins, and optimized SFX!');
    setTimeout(() => setAiEditNotice(null), 3500);
  };

  const handleLanguageChange = (newLang: string) => {
    const updated = {
      ...currentShort,
      language: newLang,
    };
    pushState(updated);
  };

  const handleRegenerateElements = async (type: 'all' | 'captions' | 'broll' | 'sfx' | 'vfx') => {
    setIsRegeneratingElements(true);
    try {
      const elementTypes = type === 'all' ? ['captions', 'broll', 'sfx', 'vfx'] : [type];
      const res = await fetch(`/api/projects/${project.id}/regenerate-elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortId: currentShort.id,
          elementTypes,
          approvalMode,
          language: typeof currentShort.language === 'object' && currentShort.language !== null ? currentShort.language.detectedCode : (currentShort.language || 'en'),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.short) {
          pushState(data.short);
          setAiEditNotice(`✨ Regenerated ${type.toUpperCase()} elements successfully!`);
          setTimeout(() => setAiEditNotice(null), 3000);
        }
      }
    } catch (err) {
      console.error('Failed to regenerate elements', err);
    } finally {
      setIsRegeneratingElements(false);
    }
  };

  // Audio-to-Video config updater
  const handleAudioConfigChange = (newConfig: AudioToVideoConfig) => {
    const updated = {
      ...currentShort,
      audioToVideoConfig: newConfig,
    };
    pushState(updated);
  };

  // AI-driven automatic aesthetic planner for Audio-to-Video
  const handleAutoStyleWithAI = async () => {
    if (!currentShort.audioToVideoConfig) return;
    setIsAiStyling(true);
    try {
      const res = await fetch('/api/audio-visual-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript:
            currentShort.transcript ||
            currentShort.captions?.map((c) => c.text).join(' ') ||
            '',
          personality: editingPersonality,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          const updated = {
            ...currentShort,
            audioToVideoConfig: {
              ...currentShort.audioToVideoConfig,
              ...data.config,
            },
          };
          pushState(updated);
          setAiEditNotice(`🎨 Applied AI aesthetic: ${data.stylePlan?.mood || 'Cinematic'}!`);
          setTimeout(() => setAiEditNotice(null), 3000);
        }
      }
    } catch (e) {
      console.warn('AI Style error:', e);
    } finally {
      setIsAiStyling(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-neutral-950 text-neutral-100 overflow-hidden select-none">
      {/* PROFESSIONAL TOP EDITOR HEADER */}
      <EditorHeader
        projectName={currentShort.title}
        onRenameProject={(newName) => {
          pushState({ ...currentShort, title: newName });
        }}
        onBack={onBack}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        autosaveStatus={autosaveStatus}
        safeAreaEnabled={safeAreaEnabled}
        onToggleSafeArea={() => setSafeAreaEnabled((p) => !p)}
        onOpenBrandKit={() => setIsBrandKitModalOpen(true)}
        onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
        onOpenAiTools={handleOneClickAIEdit}
        onExport={() => {
          onExport({
            ...currentShort,
            captionCustomization: captionConfig,
            captionConfig: captionConfig,
          });
        }}
      />

      {/* AI Edit Toast Notice */}
      {aiEditNotice && (
        <div className="bg-gradient-to-r from-purple-600 to-amber-500 text-white text-xs font-bold py-1.5 px-4 text-center animate-fade-in">
          {aiEditNotice}
        </div>
      )}

      {/* MAIN WORKSTATION BODY: LEFT TOOL PANEL | VIDEO PREVIEW | INSPECTOR */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* 1. LEFT TOOL PANEL (Captions, Styles, Animation, B-Roll, SFX, VFX, Audio, AI Tools) */}
        <LeftToolPanel
          short={currentShort}
          activeTab={leftPanelTab}
          onTabChange={setLeftPanelTab}
          captionConfig={captionConfig}
          onCaptionConfigChange={handleCaptionConfigChange}
          currentTime={currentTime}
          onSeek={handleTimeSeek}
          onUpdateShort={pushState}
          onSplitCaptionAtWord={(captionId, wordIndex) => {
            const target = (currentShort.captions || []).find((c) => c.id === captionId);
            if (!target || !target.words || target.words.length <= 1) return;
            const w = target.words[wordIndex];
            if (w) handleSplitCaption(captionId, w.end);
          }}
          onMergeCaptions={(capId1, capId2) => {
            handleMergeCaptions(capId1);
          }}
        />

        {/* 2. CENTER VIDEO CANVAS VIEW */}
        <div className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden relative bg-neutral-950/90">
          <VideoCanvas
            videoRef={videoRef}
            short={currentShort}
            videoUrl={currentShort.videoProxyUrl || currentShort.audioUrl || project?.videoUrl || ''}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onTimeUpdate={handleTimeUpdate}
            onPlayPause={handlePlayPause}
            onPlayStateChange={setIsPlaying}
            aspectRatio={aspectRatio}
            captionConfig={captionConfig}
            brandKit={brandKit}
            safeAreaEnabled={safeAreaEnabled}
            onToggleSafeArea={() => setSafeAreaEnabled((prev) => !prev)}
            zoomPunchEnabled={zoomPunchEnabled}
            speakerPosition={speakerPosition}
            onRelinkMedia={handleRelinkFile}
            onSelectCaption={(captionId) => setSelectedItemId(captionId)}
            onBack={onBack}
            onVideoLoaded={(meta) => {
              if (meta.duration && Number.isFinite(meta.duration)) {
                if (currentShort.endTime > meta.duration) {
                  setCurrentShort((prev) => ({
                    ...prev,
                    endTime: meta.duration,
                    duration: meta.duration - prev.startTime,
                  }));
                }
              }
            }}
          />
        </div>

        {/* 3. RIGHT INSPECTOR PANEL */}
        <div className="w-80 sm:w-96 flex flex-col h-full flex-shrink-0 border-l border-neutral-800 bg-neutral-900 overflow-hidden">
          {/* Toggle between Typography and Advanced Tracks */}
          <div className="flex border-b border-neutral-800 bg-neutral-950/80 p-1 flex-shrink-0 text-xs font-bold">
            <button
              onClick={() => setInspectorMode('typography')}
              className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                inspectorMode === 'typography'
                  ? 'bg-amber-400 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Typography & Style
            </button>
            <button
              onClick={() => setInspectorMode('tracks')}
              className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                inspectorMode === 'tracks'
                  ? 'bg-amber-400 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Tracks & AI Voice
            </button>
          </div>

          {inspectorMode === 'typography' ? (
            <TypographyInspector
              captionConfig={captionConfig}
              onChange={handleCaptionConfigChange}
            />
          ) : currentShort.audioToVideoConfig && panelMode === 'audio_studio' ? (
            <AudioToVideoInspector
              short={currentShort}
              config={currentShort.audioToVideoConfig}
              onChangeConfig={handleAudioConfigChange}
              onAutoStyleWithAI={handleAutoStyleWithAI}
              isAiGenerating={isAiStyling}
            />
          ) : (
            <RightInspector
              short={currentShort}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              captionConfig={captionConfig}
              onCaptionConfigChange={handleCaptionConfigChange}
              onSelectHook={handleSelectHook}
              onRegenerateHooks={handleRegenerateHooks}
              isRegeneratingHooks={isRegeneratingHooks}
              onAddSFXAtCurrentTime={handleAddSFXAtCurrentTime}
              onAddSFXMarker={handleAddSFXMarker}
              onUpdateSFXMarker={handleUpdateSFXMarker}
              onRegenerateSingleSFX={handleRegenerateSingleSFX}
              onAddVFXAtCurrentTime={handleAddVFXAtCurrentTime}
              onToggleVFXZoom={setZoomPunchEnabled}
              zoomPunchEnabled={zoomPunchEnabled}
              onToggleBRoll={handleToggleBRoll}
              onAddBRollAtCurrentTime={handleAddBRollAtCurrentTime}
              onUpdateCaptionText={handleUpdateCaptionText}
              onDeleteCaption={handleDeleteCaption}
              onAddCaptionAtCurrentTime={handleAddCaptionAtCurrentTime}
              onTranscribeCaptions={handleTranscribeCaptions}
              isTranscribing={isTranscribing}
              onDeleteSFX={handleDeleteSFX}
              onDeleteVFX={handleDeleteVFX}
              onDeleteBRoll={handleDeleteBRoll}
              onSeekToTime={handleTimeSeek}
              onTrimSilence={handleTrimSilence}
              brandKit={brandKit}
              speakerPosition={speakerPosition}
              onSpeakerPositionChange={setSpeakerPosition}
              currentTime={currentTime}
              language={typeof currentShort.language === 'object' && currentShort.language !== null ? (currentShort.language.detectedCode || currentShort.language.primaryLanguage || 'en') : String(currentShort.language || 'en')}
              onLanguageChange={handleLanguageChange}
              approvalMode={approvalMode}
              onApprovalModeChange={setApprovalMode}
              onRegenerateElements={handleRegenerateElements}
              isRegeneratingElements={isRegeneratingElements}
              onUpdateShort={handleUpdateShort}
              onUpdateBRoll={handleUpdateBRoll}
            />
          )}
        </div>
      </div>

      {/* Floating Caption Editor (Part 9) */}
      {(() => {
        const selectedCaption = (currentShort.captions || []).find((c) => c.id === selectedItemId);
        if (!selectedCaption) return null;
        return (
          <FloatingCaptionEditor
            caption={selectedCaption}
            currentTime={currentTime}
            duration={currentShort.duration || 30}
            currentFontFamily={captionConfig.fontFamily}
            onUpdateFont={(fontFamily) => setCaptionConfig((prev) => ({ ...prev, fontFamily }))}
            onUpdateCaption={handleUpdateCaption}
            onSplitCaption={handleSplitCaption}
            onMergeWithNext={handleMergeCaptions}
            onDeleteCaption={handleDeleteCaption}
            onRegenerateCaption={handleRegenerateCaption}
            onClose={() => setSelectedItemId(null)}
          />
        );
      })()}

      {/* BOTTOM MULTI-TRACK TIMELINE */}
      <Timeline
        short={currentShort}
        currentTime={currentTime}
        duration={currentShort.duration || 28}
        isPlaying={isPlaying}
        onTimeSeek={handleTimeSeek}
        onPlayPause={handlePlayPause}
        onSplit={handleSplitTimeline}
        onDeleteSelected={handleDeleteSelected}
        onSelectClip={(clipId) => setSelectedItemId(clipId)}
        onSelectSFX={(sfx) => setSelectedItemId(sfx.id)}
        onSelectVFX={(vfx) => setSelectedItemId(vfx.id)}
        onSelectBRoll={(br) => setSelectedItemId(br.id)}
        onSelectCaption={(cap) => setSelectedItemId(cap.id)}
        onSelectWord={(capId, wIdx) => setSelectedItemId(`word_${capId}_${wIdx}`)}
        onUpdateCaptionTiming={handleUpdateCaptionTiming}
        onUpdateWordTiming={handleUpdateWordTiming}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onTrimChange={handleTrimChange}
        selectedItemId={selectedItemId}
        videoUrl={currentShort.videoProxyUrl || currentShort.audioUrl || project.videoUrl || ''}
      />

      {/* Real Media Diagnostics Panel */}
      <DevDebugPanel
        isOpen={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
        videoRef={videoRef}
        short={currentShort}
        currentTime={currentTime}
        isPlaying={isPlaying}
        videoUrl={currentShort.videoProxyUrl || currentShort.audioUrl || project.videoUrl || ''}
      />

      {/* 6-STATE AI TRANSCRIPTION PROCESSING MODAL (Requirements 5 & 20) */}
      {isTranscribing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="w-full max-w-md bg-neutral-900 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">AI TRANSCRIPTION</h3>
                  <p className="text-[11px] text-neutral-400">Verbatim speech-to-text with word kinetic timestamps</p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-cyan-400">{transcribeProgress}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 via-amber-400 to-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${transcribeProgress}%` }}
              />
            </div>

            {/* Step Checkpoints */}
            <div className="space-y-2 text-xs pt-1">
              {[
                { key: 'prep', label: 'Audio extracted & media analyzed', minProg: 15 },
                { key: 'trans', label: 'Transcribing speech with AI...', minProg: 45 },
                { key: 'lang', label: 'Detecting language & code switching...', minProg: 70 },
                { key: 'build', label: 'Building kinetic caption blocks...', minProg: 85 },
                { key: 'sync', label: 'Syncing timeline & RenderPlan...', minProg: 95 },
              ].map((step) => {
                const isDone = transcribeProgress > step.minProg;
                const isCurrent = transcribeProgress >= step.minProg && transcribeProgress <= step.minProg + 25;
                return (
                  <div key={step.key} className="flex items-center gap-2.5">
                    {isDone ? (
                      <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                    ) : isCurrent ? (
                      <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-neutral-700 text-neutral-600 flex items-center justify-center text-[10px]">
                        ○
                      </div>
                    )}
                    <span
                      className={`text-xs ${
                        isDone
                          ? 'text-neutral-300'
                          : isCurrent
                          ? 'text-cyan-300 font-bold'
                          : 'text-neutral-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PART 2: TRANSCRIPTION UNAVAILABLE / MULTI-PROVIDER FAILURE MODAL (Requirement 11) */}
      {transcriptionFailure && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  TRANSCRIPTION UNAVAILABLE
                </h3>
                <p className="text-[11px] text-neutral-400">No speech-to-text provider is currently available</p>
              </div>
            </div>

            {/* Individual Provider Health Breakdown (Requirement 11) */}
            <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                Provider Diagnostic Status:
              </span>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900/60 border border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="font-medium text-neutral-200">Google Gemini Cloud</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-sans font-semibold border border-amber-500/20">
                    Setup Required
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900/60 border border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-medium text-neutral-200">Local Whisper (ONNX)</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-sans font-semibold border border-emerald-500/20">
                    Ready
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                Details:
              </span>
              <div className="text-xs font-mono text-neutral-300 bg-neutral-950 px-3 py-2 rounded-xl border border-neutral-800 break-words leading-relaxed">
                {transcriptionFailure.reason}
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setIsDebugOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs rounded-xl border border-neutral-700 shadow-md transition-all cursor-pointer"
                  title="Open Diagnostics & Capability Center"
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Configure</span>
                </button>
                <button
                  onClick={() => {
                    setTranscriptionFailure(null);
                    handleTranscribeCaptions();
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
                <button
                  onClick={() => {
                    setTranscriptionFailure(null);
                    setShowManualCaptionModal(true);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl border border-neutral-700 shadow-md transition-all cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit Manually</span>
                </button>
              </div>

              <button
                onClick={() => setTranscriptionFailure(null)}
                className="w-full text-[11px] text-neutral-500 hover:text-neutral-300 py-1 font-medium transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL CAPTION EDITING & SUBTITLE IMPORT MODAL */}
      {showManualCaptionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>EDIT CAPTIONS MANUALLY</span>
              </div>
              <button
                onClick={() => setShowManualCaptionModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Type or paste your spoken dialogue, or import a subtitle file (<span className="font-mono text-amber-400">.srt</span>, <span className="font-mono text-amber-400">.vtt</span>, <span className="font-mono text-amber-400">.json</span>). Word timings will be deterministically aligned across the {currentShort.duration.toFixed(1)}s duration.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-neutral-400 block uppercase tracking-wider">
                Dialogue Text:
              </label>
              <textarea
                value={manualDialogueText}
                onChange={(e) => setManualDialogueText(e.target.value)}
                placeholder="Paste or type the dialogue for this short clip..."
                rows={5}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-400 transition-colors resize-none leading-relaxed font-sans"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-3 py-2 rounded-xl border border-neutral-700 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Upload Subtitles (.srt / .vtt)</span>
                <input
                  type="file"
                  accept=".srt,.vtt,.json"
                  onChange={handleUploadSubtitles}
                  className="hidden"
                />
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowManualCaptionModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyManualDialogue}
                  disabled={!manualDialogueText.trim() || isTranscribing}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-neutral-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isTranscribing ? 'Aligning...' : 'Generate Captions'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsModalOpen}
        onClose={() => setIsDiagnosticsModalOpen(false)}
      />

      {/* Brand Kit Modal */}
      <BrandKitModal
        isOpen={isBrandKitModalOpen}
        brandKit={brandKit}
        onSave={() => {
          setIsBrandKitModalOpen(false);
        }}
        onApplyToProject={(kit) => {
          const newCfg: CaptionCustomization = {
            ...captionConfig,
            fontFamily: kit.fontFamily || captionConfig.fontFamily,
            primaryColor: kit.primaryColor || captionConfig.primaryColor,
            highlightColor: kit.highlightColor || captionConfig.highlightColor,
            strokeColor: kit.strokeColor || captionConfig.strokeColor,
            positionY: kit.defaultPositionY ?? captionConfig.positionY,
            preset: (kit.defaultPreset as any) || captionConfig.preset,
          };
          handleCaptionConfigChange(newCfg);
          setIsBrandKitModalOpen(false);
          setAiEditNotice('✨ Applied Brand Kit to captions & preview!');
          setTimeout(() => setAiEditNotice(null), 2500);
        }}
        onClose={() => setIsBrandKitModalOpen(false)}
      />
    </div>
  );
};
