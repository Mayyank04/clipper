import React, { useState, useEffect, useRef } from 'react';
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
  Activity
} from 'lucide-react';
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
} from '../../types';
import { VideoCanvas } from './VideoCanvas';
import { Timeline } from './Timeline';
import { RightInspector } from './RightInspector';
import { AudioToVideoInspector } from './AudioToVideoInspector';
import { DevDebugPanel } from './DevDebugPanel';
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

export const VideoEditor: React.FC<VideoEditorProps> = ({
  project,
  short: initialShort,
  onBack,
  onExport,
  brandKit,
  editingPersonality,
  onUpdateShort,
}) => {
  const [currentShort, setCurrentShort] = useState<ShortCandidate>(initialShort);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(initialShort.aspectRatio || '9:16');
  const [activeTab, setActiveTab] = useState<'captions' | 'transcript' | 'hooks' | 'sfx' | 'vfx' | 'silence' | 'broll' | 'audio' | 'metadata'>('captions');
  const [zoomPunchEnabled, setZoomPunchEnabled] = useState<boolean>(true);
  const [isRegeneratingHooks, setIsRegeneratingHooks] = useState<boolean>(false);
  const [aiEditNotice, setAiEditNotice] = useState<string | null>(null);
  const [speakerPosition, setSpeakerPosition] = useState<'center' | 'left' | 'right' | 'auto_switch'>(initialShort.speakerPosition || 'center');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isDebugOpen, setIsDebugOpen] = useState<boolean>(false);
  const [panelMode, setPanelMode] = useState<'audio_studio' | 'standard'>(
    initialShort.audioToVideoConfig ? 'audio_studio' : 'standard'
  );
  const [isAiStyling, setIsAiStyling] = useState<boolean>(false);

  // History stack for Undo/Redo
  const [history, setHistory] = useState<ShortCandidate[]>([initialShort]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const pushState = (newShort: ShortCandidate) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newShort);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setCurrentShort(newShort);
    onUpdateShort?.(newShort);
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
    setCurrentShort(initialShort);
    setHistory([initialShort]);
    setHistoryIndex(0);
    setCurrentTime(0);
    setIsPlaying(false);
    playedSfxRef.current.clear();
    const vid = videoRef.current;
    if (vid) {
      vid.pause();
      vid.currentTime = initialShort.startTime || 0;
    }
  }, [initialShort.id]);

  const [captionConfig, setCaptionConfig] = useState<CaptionCustomization>({
    preset: 'viral_bold',
    fontFamily: 'Impact, sans-serif',
    fontSize: 28,
    primaryColor: '#ffffff',
    highlightColor: '#facc15',
    strokeColor: '#000000',
    strokeWidth: 3,
    positionY: 68,
    uppercase: true,
    hasShadow: true,
    wordsPerLine: 3,
  });

  // Keep track of SFX that played in the current run to prevent repeated triggers in the same second
  const playedSfxRef = useRef<Set<string>>(new Set());

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

  // Keyboard Shortcuts: Space to Play/Pause, Arrows to Seek, S to Split, Backspace/Delete to Remove, Cmd+Z/Y for Undo/Redo, Cmd+D for Diagnostics
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleTimeSeek(Math.max(0, currentTime - (e.shiftKey ? 5 : 1)));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleTimeSeek(Math.min(currentShort.duration, currentTime + (e.shiftKey ? 5 : 1)));
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        handleSplitTimeline(currentTime);
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedItemId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.metaKey || e.ctrlKey) && e.code === 'KeyD') {
        e.preventDefault();
        setIsDebugOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, currentShort.duration, currentShort.startTime, currentShort.endTime, isPlaying, historyIndex, history.length, selectedItemId]);

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

  // Transcribe speech using backend AI service
  const handleTranscribeCaptions = async () => {
    setIsTranscribing(true);
    setAiEditNotice('🎙️ Transcribing audio with word-level kinetic timestamps...');
    try {
      const res = await fetch('/api/transcribe-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: currentShort.videoProxyUrl || project.videoUrl,
          title: currentShort.title,
          topic: currentShort.topic,
          dialogue: currentShort.hookText || currentShort.title,
          duration: currentShort.duration,
          startTime: currentShort.startTime,
          endTime: currentShort.endTime,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.captions && data.captions.length > 0) {
          const updated = {
            ...currentShort,
            captions: data.captions,
          };
          pushState(updated);
          setAiEditNotice(`✨ Generated ${data.captions.length} timed caption segments!`);
        } else {
          setAiEditNotice('Transcription complete.');
        }
      } else {
        setAiEditNotice('⚠️ Transcription service busy. Try again shortly.');
      }
    } catch (err) {
      console.error('Failed to transcribe', err);
      setAiEditNotice('⚠️ Transcription request failed.');
    } finally {
      setIsTranscribing(false);
      setTimeout(() => setAiEditNotice(null), 3500);
    }
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

  // Delete Caption
  const handleDeleteCaption = (id: string) => {
    const updated = {
      ...currentShort,
      captions: (currentShort.captions || []).filter((c) => c.id !== id),
    };
    pushState(updated);
  };

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

  // Delete selected marker or video clip
  const handleDeleteSelected = () => {
    if (!selectedItemId) return;

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
      {/* TOP EDITOR TOOLBAR */}
      <div className="h-14 border-b border-neutral-800 bg-neutral-900/90 px-4 flex items-center justify-between gap-4 flex-shrink-0">
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex-shrink-0 cursor-pointer"
            title="Back to Shorts"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs">
                {currentShort.title}
              </h2>
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                Score {currentShort.viralScore?.overall || 94}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 truncate hidden sm:block">
              {project.originalTitle}
            </p>
          </div>
        </div>

        {/* Center: Aspect Ratio, Media Replace & Undo/Redo */}
        <div className="flex items-center gap-2">
          {/* Replace / Upload Media button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            onChange={handleLocalVideoUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-xs font-semibold text-neutral-300 hover:text-white transition-all cursor-pointer"
            title="Upload or replace source video file"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Upload Video</span>
          </button>

          {/* Undo / Redo */}
          <div className="hidden sm:flex items-center gap-1 bg-neutral-950 border border-neutral-800 p-1 rounded-xl">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Redo"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Aspect Ratio Switcher */}
          <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 p-1 rounded-xl">
            <button
              onClick={() => {
                setAspectRatio('9:16');
                pushState({ ...currentShort, aspectRatio: '9:16' });
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                aspectRatio === '9:16'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="9:16 Vertical (Shorts, Reels, TikTok)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">9:16</span>
            </button>

            <button
              onClick={() => {
                setAspectRatio('1:1');
                pushState({ ...currentShort, aspectRatio: '1:1' });
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                aspectRatio === '1:1'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="1:1 Square (LinkedIn, Feed)"
            >
              <Square className="w-3.5 h-3.5" />
              <span className="hidden md:inline">1:1</span>
            </button>

            <button
              onClick={() => {
                setAspectRatio('16:9');
                pushState({ ...currentShort, aspectRatio: '16:9' });
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                aspectRatio === '16:9'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="16:9 Landscape"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden md:inline">16:9</span>
            </button>
          </div>
        </div>

        {/* Right: Diagnostics, One-Click AI Edit & Export */}
        <div className="flex items-center gap-2">
          {/* Diagnostics Debug Toggle */}
          <button
            onClick={() => setIsDebugOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              isDebugOpen
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
            title="Toggle Real-Time Media Diagnostics (Ctrl+D)"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Diagnostics</span>
          </button>

          {/* One-Click AI Edit */}
          <button
            onClick={handleOneClickAIEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">1-Click AI Edit</span>
          </button>

          {/* Export Short */}
          <button
            onClick={() => onExport(currentShort)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* AI Edit Toast Notice */}
      {aiEditNotice && (
        <div className="bg-gradient-to-r from-purple-600 to-amber-500 text-white text-xs font-bold py-1.5 px-4 text-center animate-fade-in">
          {aiEditNotice}
        </div>
      )}

      {/* MAIN WORKSTATION BODY: CENTER CANVAS + RIGHT INSPECTOR */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* CENTER VIDEO CANVAS VIEW */}
        <div className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden relative bg-neutral-950/90">
          <VideoCanvas
            videoRef={videoRef}
            short={currentShort}
            videoUrl={currentShort.videoProxyUrl || currentShort.audioUrl || project.videoUrl || ''}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onTimeUpdate={handleTimeUpdate}
            onPlayPause={handlePlayPause}
            onPlayStateChange={setIsPlaying}
            aspectRatio={aspectRatio}
            captionConfig={captionConfig}
            brandKit={brandKit}
            zoomPunchEnabled={zoomPunchEnabled}
            speakerPosition={speakerPosition}
            onRelinkMedia={handleRelinkFile}
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

        {/* RIGHT INSPECTOR PANEL */}
        <div className="w-80 sm:w-96 flex flex-col h-full flex-shrink-0 border-l border-neutral-800 bg-neutral-900 overflow-hidden">
          {currentShort.audioToVideoConfig && (
            <div className="flex border-b border-neutral-800 bg-neutral-950/80 p-1 flex-shrink-0">
              <button
                onClick={() => setPanelMode('audio_studio')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  panelMode === 'audio_studio'
                    ? 'bg-amber-400 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Visual Style & Audio
              </button>
              <button
                onClick={() => setPanelMode('standard')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  panelMode === 'standard'
                    ? 'bg-amber-400 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Captions & Tracks
              </button>
            </div>
          )}

          {currentShort.audioToVideoConfig && panelMode === 'audio_studio' ? (
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
              onCaptionConfigChange={setCaptionConfig}
              onSelectHook={handleSelectHook}
              onRegenerateHooks={handleRegenerateHooks}
              isRegeneratingHooks={isRegeneratingHooks}
              onAddSFXAtCurrentTime={handleAddSFXAtCurrentTime}
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
            />
          )}
        </div>
      </div>

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
    </div>
  );
};
