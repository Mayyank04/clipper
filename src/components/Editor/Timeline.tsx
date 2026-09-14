import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Sparkles,
  Scissors,
  Trash2,
  ZoomIn,
  ZoomOut,
  Layers,
  Film,
  Image as ImageIcon,
  Activity,
  ChevronLeft,
  ChevronRight,
  Type,
  Magnet,
  Undo2,
  Redo2,
} from 'lucide-react';
import { ShortCandidate, SFXMarker, VFXMarker, CaptionSegment, BRollSuggestion, WordTiming } from '../../types';
import { sfxEngine } from '../../utils/sfxAudio';
import { captureVideoThumbnails, generateWaveformData } from '../../utils/mediaThumbnails';
import { formatTime, formatTimeWithTenths } from '../../utils/timeFormat';

interface TimelineProps {
  short: ShortCandidate;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeSeek: (time: number) => void;
  onPlayPause: () => void;
  onSplit?: (time: number) => void;
  onDeleteSelected?: () => void;
  onSelectSFX?: (sfx: SFXMarker) => void;
  onSelectVFX?: (vfx: VFXMarker) => void;
  onSelectBRoll?: (broll: BRollSuggestion) => void;
  onSelectCaption?: (caption: CaptionSegment) => void;
  onUpdateCaptionTiming?: (captionId: string, newStart: number, newEnd: number) => void;
  onUpdateWordTiming?: (captionId: string, wordIndex: number, newStart: number, newEnd: number) => void;
  onSelectWord?: (captionId: string, wordIndex: number, word: WordTiming) => void;
  onSelectClip?: (clipId: string) => void;
  onTrimChange?: (newBounds: { startTime: number; endTime: number }) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  selectedItemId?: string | null;
  videoUrl?: string;
}

export const Timeline: React.FC<TimelineProps> = ({
  short,
  currentTime,
  duration,
  isPlaying,
  onTimeSeek,
  onPlayPause,
  onSplit,
  onDeleteSelected,
  onSelectSFX,
  onSelectVFX,
  onSelectBRoll,
  onSelectCaption,
  onUpdateCaptionTiming,
  onUpdateWordTiming,
  onSelectWord,
  onSelectClip,
  onTrimChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  selectedItemId,
  videoUrl,
}) => {
  const timelineTrackRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [isTrimmingStart, setIsTrimmingStart] = useState<boolean>(false);
  const [isTrimmingEnd, setIsTrimmingEnd] = useState<boolean>(false);
  const [showWordTrack, setShowWordTrack] = useState<boolean>(true);
  const [snappingActive, setSnappingActive] = useState<boolean>(true);
  const [snapIndicator, setSnapIndicator] = useState<{ time: number; label?: string } | null>(null);
  const [captionDrag, setCaptionDrag] = useState<{
    id: string;
    type: 'start' | 'end' | 'move';
    initialStart: number;
    initialEnd: number;
    currentStart: number;
    currentEnd: number;
  } | null>(null);
  const [wordDrag, setWordDrag] = useState<{
    captionId: string;
    wordIndex: number;
    type: 'start' | 'end' | 'move';
    initialStart: number;
    initialEnd: number;
    currentStart: number;
    currentEnd: number;
    minAllowed: number;
    maxAllowed: number;
  } | null>(null);
  const safeStartTime = Number.isFinite(short?.startTime) ? short.startTime : 0;
  const safeEndTime = Number.isFinite(short?.endTime) ? short.endTime : (safeStartTime + (short?.duration || 30));
  const [trimPreviewStart, setTrimPreviewStart] = useState<number>(safeStartTime);
  const [trimPreviewEnd, setTrimPreviewEnd] = useState<number>(safeEndTime);

  // Sync trim bounds with short
  useEffect(() => {
    setTrimPreviewStart(Number.isFinite(short?.startTime) ? short.startTime : 0);
    setTrimPreviewEnd(Number.isFinite(short?.endTime) ? short.endTime : ((short?.startTime || 0) + (short?.duration || 30)));
  }, [short?.startTime, short?.endTime, short?.duration]);

  // Capture real video frames across the clip interval
  useEffect(() => {
    let isCancelled = false;
    const loadThumbnails = async () => {
      const src = videoUrl || short.videoProxyUrl;
      if (!src) return;
      try {
        const frames = await captureVideoThumbnails(src, short.startTime, short.duration, 10);
        if (!isCancelled && frames.length > 0) {
          setCapturedFrames(frames);
        }
      } catch (err) {
        console.warn('Could not extract video thumbnails:', err);
      }
    };
    loadThumbnails();
    return () => {
      isCancelled = true;
    };
  }, [videoUrl, short.videoProxyUrl, short.startTime, short.duration]);

  // Generate waveform peaks for spoken dialogue
  const waveformPeaks = useMemo(() => {
    return generateWaveformData(
      duration,
      (short.captions || []).map((c) => ({ start: c.start, end: c.end })),
      80
    );
  }, [duration, short.captions]);

  const calculateTimeFromClientX = useCallback(
    (clientX: number) => {
      if (!timelineTrackRef.current) return 0;
      const rect = timelineTrackRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  // Mouse / Touch handlers for Playhead Dragging
  const handleStartPlayheadDrag = (clientX: number) => {
    setIsDraggingPlayhead(true);
    const newTime = calculateTimeFromClientX(clientX);
    onTimeSeek(newTime);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      if (isDraggingPlayhead) {
        const newTime = calculateTimeFromClientX(clientX);
        onTimeSeek(newTime);
      } else if (isTrimmingStart && timelineTrackRef.current) {
        const rect = timelineTrackRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const deltaSec = ratio * duration;
        // Constraint: new start must be at least 2 seconds before end
        const proposedStart = Number((short.startTime + deltaSec).toFixed(1));
        if (proposedStart < trimPreviewEnd - 2) {
          setTrimPreviewStart(proposedStart);
          onTimeSeek(Math.max(0, proposedStart - short.startTime));
        }
      } else if (isTrimmingEnd && timelineTrackRef.current) {
        const rect = timelineTrackRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const deltaSec = ratio * duration;
        // Constraint: new end must be at least 2 seconds after start
        const proposedEnd = Number((short.startTime + deltaSec).toFixed(1));
        if (proposedEnd > trimPreviewStart + 2) {
          setTrimPreviewEnd(proposedEnd);
          onTimeSeek(Math.max(0, proposedEnd - short.startTime));
        }
      } else if (captionDrag && timelineTrackRef.current) {
        const rect = timelineTrackRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        let pointerTime = ratio * duration;

        if (snappingActive) {
          if (Math.abs(pointerTime - currentTime) <= 0.05) {
            pointerTime = currentTime;
            setSnapIndicator({ time: currentTime, label: 'Playhead' });
          } else {
            setSnapIndicator(null);
          }
        }

        if (captionDrag.type === 'start') {
          const newStart = Math.max(0, Math.min(captionDrag.initialEnd - 0.15, pointerTime));
          setCaptionDrag((prev) => prev ? { ...prev, currentStart: Number(newStart.toFixed(3)) } : null);
          onTimeSeek(newStart);
        } else if (captionDrag.type === 'end') {
          const newEnd = Math.min(duration, Math.max(captionDrag.initialStart + 0.15, pointerTime));
          setCaptionDrag((prev) => prev ? { ...prev, currentEnd: Number(newEnd.toFixed(3)) } : null);
          onTimeSeek(newEnd);
        } else if (captionDrag.type === 'move') {
          const capDur = captionDrag.initialEnd - captionDrag.initialStart;
          const newStart = Math.max(0, Math.min(duration - capDur, pointerTime));
          const newEnd = Number((newStart + capDur).toFixed(3));
          setCaptionDrag((prev) => prev ? { ...prev, currentStart: Number(newStart.toFixed(3)), currentEnd: newEnd } : null);
          onTimeSeek(newStart);
        }
      } else if (wordDrag && timelineTrackRef.current) {
        const rect = timelineTrackRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        let pointerTime = ratio * duration;

        if (snappingActive) {
          const snapTargets = [currentTime, wordDrag.minAllowed, wordDrag.maxAllowed];
          let didSnap = false;
          for (const st of snapTargets) {
            if (Math.abs(pointerTime - st) <= 0.05) {
              pointerTime = st;
              setSnapIndicator({ time: st, label: st === currentTime ? 'Playhead' : 'Word Bound' });
              didSnap = true;
              break;
            }
          }
          if (!didSnap) setSnapIndicator(null);
        }

        if (wordDrag.type === 'start') {
          const newStart = Math.max(wordDrag.minAllowed, Math.min(wordDrag.currentEnd - 0.04, pointerTime));
          setWordDrag((prev) => prev ? { ...prev, currentStart: Number(newStart.toFixed(3)) } : null);
          onTimeSeek(newStart);
        } else if (wordDrag.type === 'end') {
          const newEnd = Math.min(wordDrag.maxAllowed, Math.max(wordDrag.currentStart + 0.04, pointerTime));
          setWordDrag((prev) => prev ? { ...prev, currentEnd: Number(newEnd.toFixed(3)) } : null);
          onTimeSeek(newEnd);
        } else if (wordDrag.type === 'move') {
          const wDur = wordDrag.initialEnd - wordDrag.initialStart;
          const newStart = Math.max(wordDrag.minAllowed, Math.min(wordDrag.maxAllowed - wDur, pointerTime));
          const newEnd = Number((newStart + wDur).toFixed(3));
          setWordDrag((prev) => prev ? { ...prev, currentStart: Number(newStart.toFixed(3)), currentEnd: newEnd } : null);
          onTimeSeek(newStart);
        }
      }
    };

    const handleEnd = () => {
      if (isDraggingPlayhead) {
        setIsDraggingPlayhead(false);
      }
      if (isTrimmingStart) {
        setIsTrimmingStart(false);
        if (onTrimChange && trimPreviewStart !== short.startTime) {
          onTrimChange({ startTime: trimPreviewStart, endTime: short.endTime });
        }
      }
      if (isTrimmingEnd) {
        setIsTrimmingEnd(false);
        if (onTrimChange && trimPreviewEnd !== short.endTime) {
          onTrimChange({ startTime: short.startTime, endTime: trimPreviewEnd });
        }
      }
      if (captionDrag) {
        if (onUpdateCaptionTiming) {
          onUpdateCaptionTiming(captionDrag.id, captionDrag.currentStart, captionDrag.currentEnd);
        }
        setCaptionDrag(null);
        setSnapIndicator(null);
      }
      if (wordDrag) {
        if (onUpdateWordTiming) {
          onUpdateWordTiming(wordDrag.captionId, wordDrag.wordIndex, wordDrag.currentStart, wordDrag.currentEnd);
        }
        setWordDrag(null);
        setSnapIndicator(null);
      }
    };

    if (isDraggingPlayhead || isTrimmingStart || isTrimmingEnd || captionDrag || wordDrag) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [
    isDraggingPlayhead,
    isTrimmingStart,
    isTrimmingEnd,
    captionDrag,
    wordDrag,
    snappingActive,
    currentTime,
    calculateTimeFromClientX,
    onTimeSeek,
    onTrimChange,
    onUpdateCaptionTiming,
    onUpdateWordTiming,
    duration,
    short.startTime,
    short.endTime,
    trimPreviewStart,
    trimPreviewEnd,
  ]);

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : (short?.duration || 30);
  const playheadPercent = safeDuration > 0 ? Math.max(0, Math.min(100, (currentTime / safeDuration) * 100)) : 0;

  // Fallback word generator if segment has no precomputed word timings
  const fallbackWords = useCallback((cap: CaptionSegment): WordTiming[] => {
    if (cap.words && cap.words.length > 0) return cap.words;
    const rawWords = (cap.text || '').trim().split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return [];
    const dur = Math.max(0.1, cap.end - cap.start);
    const step = dur / rawWords.length;
    return rawWords.map((w, i) => ({
      id: `w_${cap.id}_${i}`,
      word: w,
      start: Number((cap.start + i * step).toFixed(3)),
      end: Number((cap.start + (i + 1) * step).toFixed(3)),
    }));
  }, []);

  // Keyboard Shortcuts (Space, Arrow keys, S, Delete, Cmd+Z/Y, +/-)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onPlayPause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? (safeDuration > 30 ? 2 : 1) : 0.04;
        onTimeSeek(Math.max(0, currentTime - step));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? (safeDuration > 30 ? 2 : 1) : 0.04;
        onTimeSeek(Math.min(safeDuration, currentTime + step));
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        onSplit?.(currentTime);
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedItemId) {
          e.preventDefault();
          onDeleteSelected?.();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo?.();
        } else {
          onUndo?.();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        onRedo?.();
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setZoomLevel((z) => Math.min(3, z + 0.5));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoomLevel((z) => Math.max(1, z - 0.5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentTime,
    safeDuration,
    onPlayPause,
    onTimeSeek,
    onSplit,
    selectedItemId,
    onDeleteSelected,
    onUndo,
    onRedo,
  ]);

  // Time ruler ticks
  const step = safeDuration > 40 ? 5 : safeDuration > 15 ? 2 : 1;
  const ticksCount = Math.max(1, Math.min(120, Math.ceil(safeDuration / step)));
  const ticks = Array.from({ length: ticksCount + 1 }, (_, i) => Math.min(safeDuration, i * step));

  return (
    <div ref={containerRef} className="w-full bg-neutral-950 border-t border-neutral-800 p-3 sm:p-4 select-none flex flex-col gap-2">
      {/* Top Timeline Toolbar */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-800/80">
        {/* Left Transport controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTimeSeek(0)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Jump to Start (0:00)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onPlayPause}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-neutral-950" /> : <Play className="w-3.5 h-3.5 fill-neutral-950 ml-0.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {/* Time display */}
          <div className="text-xs font-mono text-neutral-300 ml-2">
            <span className="text-amber-400 font-bold">{formatTimeWithTenths(currentTime)}</span>
            <span className="text-neutral-500"> / {formatTime(duration)}</span>
          </div>

          <div className="h-4 w-px bg-neutral-800 mx-1" />

          {/* Split at Playhead Action */}
          <button
            onClick={() => onSplit?.(currentTime)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-semibold transition-colors cursor-pointer"
            title="Split clip at current playhead (Key: S)"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Split</span>
          </button>

          {/* Delete Selected Action */}
          {selectedItemId && (
            <button
              onClick={onDeleteSelected}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-semibold transition-colors cursor-pointer animate-fade-in"
              title="Delete selected item (Key: Delete / Backspace)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete</span>
            </button>
          )}

          {/* Undo / Redo in Timeline Toolbar */}
          {(onUndo || onRedo) && (
            <div className="hidden lg:flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-0.5 rounded-lg">
              {onUndo && (
                <button
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Undo (Cmd+Z)"
                >
                  <Undo2 className="w-3 h-3" />
                </button>
              )}
              {onRedo && (
                <button
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Redo (Cmd+Shift+Z)"
                >
                  <Redo2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Word Track Toggle */}
          <button
            onClick={() => setShowWordTrack((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              showWordTrack
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
            title="Toggle Word-Level Precision Timeline Track"
          >
            <Type className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Words</span>
          </button>

          {/* Snapping Toggle */}
          <button
            onClick={() => setSnappingActive((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              snappingActive
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:text-neutral-300'
            }`}
            title={snappingActive ? 'Magnetic Snapping Active (0.05s snap to playhead/bounds)' : 'Snapping Disabled'}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Snap</span>
          </button>

          {/* Real Trim Tooltip indicator when active */}
          {(isTrimmingStart || isTrimmingEnd) && (
            <div className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 animate-pulse">
              Trimming: {trimPreviewStart.toFixed(1)}s - {trimPreviewEnd.toFixed(1)}s ({(trimPreviewEnd - trimPreviewStart).toFixed(1)}s)
            </div>
          )}
        </div>

        {/* Right tools: Zoom */}
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-lg">
            <button
              onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
              className="p-1 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] px-1 text-neutral-300 font-mono font-bold">{zoomLevel.toFixed(1)}x</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(3, z + 0.5))}
              className="p-1 hover:text-white transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Multi-Track Area with Zoom Scrolling */}
      <div className="overflow-x-auto pb-1">
        <div
          style={{ width: `${zoomLevel * 100}%`, minWidth: '100%' }}
          className="flex transition-all duration-150"
        >
          {/* LEFT COLUMN: Track Headers & Badges */}
          <div className="w-24 min-w-[96px] max-w-[96px] bg-neutral-950/90 border-r border-neutral-800/80 flex flex-col gap-1.5 pt-4 select-none z-10">
            {/* Ruler Header */}
            <div className="h-6 flex items-center px-2 text-[10px] font-mono text-neutral-500 font-semibold border-b border-neutral-800/50">
              TIME
            </div>

            {/* Video Track Header */}
            <div className="h-14 flex items-center px-2 bg-neutral-900/90 rounded-l border-y border-l border-neutral-800">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400">
                <Film className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">Video</span>
              </div>
            </div>

            {/* Waveform Header */}
            <div className="h-7 flex items-center px-2 bg-neutral-900/60 rounded-l border-y border-l border-neutral-800/70">
              <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                <Activity className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                <span className="truncate">Audio</span>
              </div>
            </div>

            {/* Captions Header */}
            <div className="h-9 flex items-center px-2 bg-neutral-900/70 rounded-l border-y border-l border-neutral-800">
              <div className="flex items-center gap-1 text-[9px] font-bold text-cyan-300">
                <Layers className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                <span className="truncate">Captions</span>
              </div>
            </div>

            {/* Words Header */}
            {showWordTrack && (
              <div className="h-8 flex items-center px-2 bg-neutral-900/80 rounded-l border-y border-l border-neutral-800">
                <div className="flex items-center gap-1 text-[9px] font-bold text-amber-300">
                  <Type className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                  <span className="truncate">Words</span>
                </div>
              </div>
            )}

            {/* B-Roll Header */}
            <div className="h-8 flex items-center px-2 bg-neutral-900/60 rounded-l border-y border-l border-neutral-800">
              <div className="flex items-center gap-1 text-[9px] font-bold text-blue-300">
                <ImageIcon className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                <span className="truncate">B-Roll</span>
              </div>
            </div>

            {/* SFX Header */}
            <div className="h-8 flex items-center px-2 bg-neutral-900/60 rounded-l border-y border-l border-neutral-800">
              <div className="flex items-center gap-1 text-[9px] font-bold text-orange-300">
                <Volume2 className="w-2.5 h-2.5 text-orange-400 shrink-0" />
                <span className="truncate">SFX</span>
              </div>
            </div>

            {/* VFX Header */}
            <div className="h-8 flex items-center px-2 bg-neutral-900/60 rounded-l border-y border-l border-neutral-800">
              <div className="flex items-center gap-1 text-[9px] font-bold text-purple-300">
                <Sparkles className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                <span className="truncate">VFX</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Track Lanes & Unified Playhead */}
          <div
            ref={timelineTrackRef}
            className="flex-1 relative flex flex-col gap-1.5 pt-4 bg-neutral-950/40 cursor-pointer"
            onMouseDown={(e) => handleStartPlayheadDrag(e.clientX)}
            onTouchStart={(e) => handleStartPlayheadDrag(e.touches[0].clientX)}
          >
            {/* Playhead Vertical Needle line with Draggable Thumb */}
            <div
              className="absolute top-0 bottom-0 z-40 -translate-x-1/2 flex flex-col items-center pointer-events-none"
              style={{ left: `${playheadPercent}%` }}
            >
              <div
                className="w-3.5 h-3.5 bg-amber-400 rotate-45 shadow-lg shadow-amber-400/60 pointer-events-auto cursor-ew-resize hover:scale-125 transition-transform"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleStartPlayheadDrag(e.clientX);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  handleStartPlayheadDrag(e.touches[0].clientX);
                }}
              />
              <div className="w-0.5 flex-1 bg-amber-400 shadow-sm" />
            </div>

            {/* Magnetic Snapping Guideline */}
            {snapIndicator && (
              <div
                className="absolute top-0 bottom-0 z-35 w-px bg-cyan-400 pointer-events-none border-r border-dashed border-cyan-300 -translate-x-1/2"
                style={{ left: `${(snapIndicator.time / safeDuration) * 100}%` }}
              >
                <div className="absolute top-1 -translate-x-1/2 bg-cyan-500 text-neutral-950 font-black text-[8px] px-1 py-0.5 rounded shadow">
                  {snapIndicator.label || `${snapIndicator.time.toFixed(2)}s`}
                </div>
              </div>
            )}

            {/* TIME RULER */}
            <div className="relative h-6 bg-neutral-900/90 rounded-r border border-neutral-800 overflow-hidden flex items-center px-1">
              {ticks.map((t, idx) => {
                const leftPct = (t / duration) * 100;
                return (
                  <div
                    key={idx}
                    className="absolute top-0 bottom-0 flex flex-col items-center justify-between text-[9px] font-mono text-neutral-500 pointer-events-none"
                    style={{ left: `${leftPct}%` }}
                  >
                    <div className="w-px h-2 bg-neutral-700" />
                    <span className="transform -translate-x-1/2">
                      {Math.floor(t)}s
                    </span>
                  </div>
                );
              })}
            </div>

            {/* TRACK 1: VIDEO TRACK (with multi-clip support, frame thumbnails & draggable trim handles) */}
            <div className="relative h-14 bg-neutral-900 rounded-r-lg border border-neutral-800 overflow-hidden flex items-center p-0.5 group">
              {/* Left Draggable Trim Handle */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsTrimmingStart(true);
                }}
                className="absolute left-0 top-0 bottom-0 w-3.5 z-30 bg-amber-400/90 hover:bg-amber-300 cursor-ew-resize flex items-center justify-center rounded-l shadow-lg"
                title="Drag to trim Clip Start"
              >
                <ChevronLeft className="w-3 h-3 text-neutral-950 font-bold" />
              </div>

              {/* Right Draggable Trim Handle */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsTrimmingEnd(true);
                }}
                className="absolute right-0 top-0 bottom-0 w-3.5 z-30 bg-amber-400/90 hover:bg-amber-300 cursor-ew-resize flex items-center justify-center rounded-r shadow-lg"
                title="Drag to trim Clip End"
              >
                <ChevronRight className="w-3 h-3 text-neutral-950 font-bold" />
              </div>

              {/* Video Clips (Single or Split Multi-Clips) */}
              {(() => {
                const clips = short.videoClips && short.videoClips.length > 0
                  ? short.videoClips
                  : [{
                      id: `clip_${short.id}_0`,
                      sourceUrl: videoUrl || short.videoProxyUrl || '',
                      sourceStart: short.startTime,
                      sourceEnd: short.endTime,
                      timelineStart: 0,
                      timelineEnd: duration,
                    }];

                return clips.map((clip, clipIdx) => {
                  const leftPct = (clip.timelineStart / duration) * 100;
                  const widthPct = Math.max(1, ((clip.timelineEnd - clip.timelineStart) / duration) * 100);
                  const isSelected = selectedItemId === clip.id;
                  const clipDur = clip.timelineEnd - clip.timelineStart;

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClip?.(clip.id);
                        onTimeSeek(clip.timelineStart);
                      }}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      className={`absolute top-0.5 bottom-0.5 rounded overflow-hidden border transition-all cursor-pointer group/clip ${
                        isSelected
                          ? 'border-amber-400 ring-2 ring-amber-400/90 bg-amber-400/20 z-25 shadow-lg'
                          : 'border-neutral-700/80 hover:border-neutral-500 bg-neutral-900/90 z-10'
                      }`}
                    >
                      {/* Clip Badge */}
                      <div className="absolute top-1 left-1.5 z-20 flex items-center gap-1 bg-black/80 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-300 pointer-events-none">
                        <span>Clip {clipIdx + 1}</span>
                        <span className="text-neutral-400 font-normal">({clipDur.toFixed(1)}s)</span>
                      </div>

                      {/* Video Strip Frames */}
                      <div className="w-full h-full flex items-center gap-1 opacity-90 px-0.5">
                        {capturedFrames.length > 0 ? (
                          capturedFrames.slice(0, Math.max(1, Math.round((clipDur / duration) * capturedFrames.length))).map((frameData, i) => (
                            <div
                              key={i}
                              className="flex-1 h-full rounded bg-neutral-900 overflow-hidden border border-neutral-700/50 relative shadow-inner"
                            >
                              <img
                                src={frameData}
                                alt={`frame_${i}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-400 font-mono">
                            {clipDur.toFixed(1)}s
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Split Cut Boundaries Markers */}
              {short.cuts?.map((cutTime, idx) => {
                const cutPct = (cutTime / duration) * 100;
                return (
                  <div
                    key={idx}
                    className="absolute top-0 bottom-0 z-25 w-1 bg-amber-400 flex flex-col items-center justify-between pointer-events-none shadow"
                    style={{ left: `${cutPct}%` }}
                  >
                    <span className="text-[8px] font-black bg-amber-400 text-neutral-950 px-1 rounded-b">
                      CUT
                    </span>
                    <span className="text-[8px] font-mono text-amber-300 bg-neutral-950/90 px-1 rounded-t">
                      {cutTime.toFixed(1)}s
                    </span>
                  </div>
                );
              })}
            </div>

            {/* TRACK 2: AUDIO WAVEFORM TRACK */}
            <div className="relative h-7 bg-neutral-950/80 rounded-r-lg border border-neutral-800/80 overflow-hidden flex items-center px-1">
              <div className="w-full h-full flex items-center gap-0.5 px-1">
                {waveformPeaks.map((heightPct, idx) => (
                  <div
                    key={idx}
                    className="flex-1 bg-emerald-500/70 hover:bg-emerald-400 rounded-xs transition-all"
                    style={{ height: `${Math.max(15, heightPct)}%` }}
                  />
                ))}
              </div>
            </div>

            {/* TRACK 3: CAPTIONS TRACK (Part 10: actual blocks with draggable left & right edges) */}
            <div className="relative h-9 bg-neutral-900/90 rounded-r-lg border border-neutral-800 overflow-hidden flex items-center px-1">
              <div className="w-full h-full relative">
                {short.captions?.map((cap) => {
                  const isBeingDragged = captionDrag?.id === cap.id;
                  const startSec = isBeingDragged ? captionDrag.currentStart : cap.start;
                  const endSec = isBeingDragged ? captionDrag.currentEnd : cap.end;
                  const leftPct = (startSec / duration) * 100;
                  const widthPct = Math.max(2, ((endSec - startSec) / duration) * 100);
                  const isCurrent = currentTime >= startSec && currentTime <= endSec;
                  const isSelected = selectedItemId === cap.id;

                  return (
                    <div
                      key={cap.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCaption?.(cap);
                        onTimeSeek(startSec);
                      }}
                      onMouseDown={(e) => {
                        // Drag caption body to move interval
                        if ((e.target as HTMLElement).dataset.handle) return;
                        e.stopPropagation();
                        onSelectCaption?.(cap);
                        setCaptionDrag({
                          id: cap.id,
                          type: 'move',
                          initialStart: cap.start,
                          initialEnd: cap.end,
                          currentStart: cap.start,
                          currentEnd: cap.end,
                        });
                      }}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      className={`absolute h-7 top-1 rounded border px-1 flex items-center justify-between text-[10px] font-bold transition-all select-none cursor-grab active:cursor-grabbing group/cap ${
                        isSelected
                          ? 'bg-cyan-500/50 border-cyan-300 text-white ring-2 ring-cyan-400 shadow-lg z-25'
                          : isCurrent
                          ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-sm z-20'
                          : 'bg-cyan-950/50 border-cyan-800/60 text-cyan-300/80 hover:bg-cyan-900/60 z-10'
                      }`}
                    >
                      {/* Left Drag Handle (Adjust Start Time) */}
                      <div
                        data-handle="start"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          onSelectCaption?.(cap);
                          setCaptionDrag({
                            id: cap.id,
                            type: 'start',
                            initialStart: cap.start,
                            initialEnd: cap.end,
                            currentStart: cap.start,
                            currentEnd: cap.end,
                          });
                        }}
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-cyan-400/80 hover:bg-cyan-300 rounded-l transition-opacity opacity-70 group-hover/cap:opacity-100 z-30"
                        title="Drag to change caption start time"
                      />

                      <span className="truncate mx-2 pointer-events-none select-none">
                        {cap.text}
                      </span>

                      {/* Right Drag Handle (Adjust End Time) */}
                      <div
                        data-handle="end"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          onSelectCaption?.(cap);
                          setCaptionDrag({
                            id: cap.id,
                            type: 'end',
                            initialStart: cap.start,
                            initialEnd: cap.end,
                            currentStart: cap.start,
                            currentEnd: cap.end,
                          });
                        }}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-cyan-400/80 hover:bg-cyan-300 rounded-r transition-opacity opacity-70 group-hover/cap:opacity-100 z-30"
                        title="Drag to change caption end time"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TRACK 3B: WORD TRACK (Precision Draggable Word Blocks with Snapping) */}
            {showWordTrack && (
              <div className="relative h-8 bg-neutral-950/70 rounded-r-lg border border-neutral-800/80 overflow-hidden flex items-center px-1">
                <div className="w-full h-full relative">
                  {short.captions?.flatMap((cap) => {
                    const words = fallbackWords(cap);
                    return words.map((w, wIdx) => {
                      const wordId = `word_${cap.id}_${wIdx}`;
                      const isBeingDragged = wordDrag?.captionId === cap.id && wordDrag?.wordIndex === wIdx;
                      const startSec = isBeingDragged ? wordDrag.currentStart : w.start;
                      const endSec = isBeingDragged ? wordDrag.currentEnd : w.end;
                      const leftPct = (startSec / duration) * 100;
                      const widthPct = Math.max(1.2, ((endSec - startSec) / duration) * 100);
                      const isCurrent = currentTime >= startSec && currentTime <= endSec;
                      const isSelected = selectedItemId === wordId;

                      let badgeStyle = 'bg-neutral-800/90 border-neutral-700 text-neutral-300 hover:bg-neutral-700/80';
                      if (w.emphasis === 'hero' || w.isHighlight) {
                        badgeStyle = 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-xs';
                      } else if (w.emphasis === 'marker') {
                        badgeStyle = 'bg-yellow-400/30 border-yellow-300 text-yellow-200';
                      } else if (w.emphasis === 'strong') {
                        badgeStyle = 'bg-cyan-500/30 border-cyan-400 text-cyan-200';
                      }

                      if (isSelected) {
                        badgeStyle = 'bg-amber-400 text-neutral-950 font-bold border-white ring-2 ring-amber-400 shadow-md z-30';
                      } else if (isCurrent) {
                        badgeStyle += ' ring-1 ring-amber-400/60 z-20';
                      }

                      return (
                        <div
                          key={wordId}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectWord?.(cap.id, wIdx, w);
                            onTimeSeek(startSec);
                          }}
                          onMouseDown={(e) => {
                            if ((e.target as HTMLElement).dataset.handle) return;
                            e.stopPropagation();
                            onSelectWord?.(cap.id, wIdx, w);
                            const prevEnd = wIdx > 0 ? words[wIdx - 1].end : 0;
                            const nextStart = wIdx < words.length - 1 ? words[wIdx + 1].start : duration;
                            setWordDrag({
                              captionId: cap.id,
                              wordIndex: wIdx,
                              type: 'move',
                              initialStart: w.start,
                              initialEnd: w.end,
                              currentStart: w.start,
                              currentEnd: w.end,
                              minAllowed: prevEnd,
                              maxAllowed: nextStart,
                            });
                          }}
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          title={`${w.word} (${startSec.toFixed(2)}s - ${endSec.toFixed(2)}s)`}
                          className={`absolute h-6 top-1 rounded border px-1 flex items-center justify-between text-[9px] transition-all select-none cursor-grab active:cursor-grabbing group/word overflow-hidden z-15 ${badgeStyle}`}
                        >
                          {/* Left Drag Handle */}
                          <div
                            data-handle="start"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              onSelectWord?.(cap.id, wIdx, w);
                              const prevEnd = wIdx > 0 ? words[wIdx - 1].end : 0;
                              setWordDrag({
                                captionId: cap.id,
                                wordIndex: wIdx,
                                type: 'start',
                                initialStart: w.start,
                                initialEnd: w.end,
                                currentStart: w.start,
                                currentEnd: w.end,
                                minAllowed: prevEnd,
                                maxAllowed: w.end - 0.04,
                              });
                            }}
                            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-amber-400/80 hover:bg-amber-300 rounded-l transition-opacity opacity-60 group-hover/word:opacity-100 z-25"
                            title="Drag word start"
                          />

                          <span className="truncate mx-1 pointer-events-none select-none font-medium">
                            {w.word}
                          </span>

                          {/* Right Drag Handle */}
                          <div
                            data-handle="end"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              onSelectWord?.(cap.id, wIdx, w);
                              const nextStart = wIdx < words.length - 1 ? words[wIdx + 1].start : duration;
                              setWordDrag({
                                captionId: cap.id,
                                wordIndex: wIdx,
                                type: 'end',
                                initialStart: w.start,
                                initialEnd: w.end,
                                currentStart: w.start,
                                currentEnd: w.end,
                                minAllowed: w.start + 0.04,
                                maxAllowed: nextStart,
                              });
                            }}
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-amber-400/80 hover:bg-amber-300 rounded-r transition-opacity opacity-60 group-hover/word:opacity-100 z-25"
                            title="Drag word end"
                          />
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            )}

            {/* TRACK 4: B-ROLL OVERLAYS */}
            <div className="relative h-8 bg-neutral-900/90 rounded-r-lg border border-neutral-800 overflow-hidden flex items-center px-1">
              <div className="w-full h-full relative">
                {short.brollSuggestions?.map((br) => {
                  const bStart = br.timestamp ?? (br as any).start ?? 0;
                  const bDur = br.duration ?? (((br as any).end ?? (bStart + 3)) - bStart);
                  const leftPct = (bStart / duration) * 100;
                  const widthPct = Math.max(3, (bDur / duration) * 100);
                  const isCurrent = currentTime >= bStart && currentTime <= bStart + bDur;
                  const isSelected = selectedItemId === br.id;

                  return (
                    <div
                      key={br.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBRoll?.(br);
                        onTimeSeek(bStart);
                      }}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      className={`absolute h-6 top-1 rounded border px-2 flex items-center text-[10px] font-bold truncate transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-500/60 border-white text-white ring-2 ring-blue-400 shadow-md'
                          : isCurrent
                          ? 'bg-blue-500/40 border-blue-400 text-blue-200 shadow-sm'
                          : 'bg-blue-950/40 border-blue-800/40 text-blue-300/80 hover:bg-blue-900/50'
                      }`}
                    >
                      <span className="truncate">{br.concept}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TRACK 5: SFX CUES */}
            <div className="relative h-8 bg-neutral-900/90 rounded-r-lg border border-neutral-800 overflow-hidden flex items-center px-1">
              <div className="w-full h-full relative">
                {short.sfxMarkers?.map((sfx) => {
                  const leftPct = (sfx.timestamp / duration) * 100;
                  const sfxDur = sfx.duration || 1.5;
                  const widthPct = Math.max(4, Math.min(25, (sfxDur / duration) * 100));
                  const isNear = Math.abs(currentTime - sfx.timestamp) < 0.4;
                  const isSelected = selectedItemId === sfx.id;

                  return (
                    <button
                      key={sfx.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        sfxEngine.playSound(sfx.category, sfx.volume);
                        onSelectSFX?.(sfx);
                        onTimeSeek(sfx.timestamp);
                      }}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      title={`${sfx.soundName} (${sfx.timestamp.toFixed(1)}s - ${(sfx.timestamp + sfxDur).toFixed(1)}s)`}
                      className={`absolute top-0.5 h-7 rounded-lg border text-[10px] font-extrabold flex items-center justify-between gap-1 px-1.5 transition-transform shadow-md cursor-pointer overflow-hidden ${
                        isSelected
                          ? 'bg-amber-400 text-neutral-950 border-white ring-2 ring-amber-400 shadow-lg z-20'
                          : isNear
                          ? 'bg-amber-500 text-neutral-950 border-amber-300 z-10'
                          : 'bg-amber-950/80 text-amber-300 border-amber-500/40 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <Volume2 className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{sfx.soundName.split(' ')[0]}</span>
                      </div>
                      <div className="flex items-center gap-0.5 h-3 opacity-60 shrink-0">
                        <div className="w-0.5 h-full bg-current rounded-full" />
                        <div className="w-0.5 h-2 bg-current rounded-full" />
                        <div className="w-0.5 h-1.5 bg-current rounded-full" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TRACK 6: VFX & ZOOMS */}
            <div className="relative h-8 bg-neutral-900/90 rounded-r-lg border border-neutral-800 overflow-hidden flex items-center px-1">
              <div className="w-full h-full relative">
                {short.vfxMarkers?.map((vfx) => {
                  const leftPct = (vfx.timestamp / duration) * 100;
                  const widthPct = Math.max(3, (vfx.duration / duration) * 100);
                  const isCurrent = currentTime >= vfx.timestamp && currentTime <= vfx.timestamp + vfx.duration;
                  const isSelected = selectedItemId === vfx.id;

                  return (
                    <div
                      key={vfx.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectVFX?.(vfx);
                        onTimeSeek(vfx.timestamp);
                      }}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      className={`absolute h-6 top-1 rounded border px-2 flex items-center text-[10px] font-bold truncate transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-500/70 border-white text-white ring-2 ring-purple-300 shadow-md'
                          : isCurrent
                          ? 'bg-purple-500/40 border-purple-400 text-purple-200 shadow-md'
                          : 'bg-purple-950/50 border-purple-800/40 text-purple-300 hover:bg-purple-900/50'
                      }`}
                    >
                      <span className="truncate">{vfx.label || vfx.type}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
