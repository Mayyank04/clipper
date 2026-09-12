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
  ChevronRight
} from 'lucide-react';
import { ShortCandidate, SFXMarker, VFXMarker, CaptionSegment, BRollSuggestion } from '../../types';
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
  onSelectClip?: (clipId: string) => void;
  onTrimChange?: (newBounds: { startTime: number; endTime: number }) => void;
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
  onSelectClip,
  onTrimChange,
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
    };

    if (isDraggingPlayhead || isTrimmingStart || isTrimmingEnd) {
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
    calculateTimeFromClientX,
    onTimeSeek,
    onTrimChange,
    duration,
    short.startTime,
    short.endTime,
    trimPreviewStart,
    trimPreviewEnd,
  ]);

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : (short?.duration || 30);
  const playheadPercent = safeDuration > 0 ? Math.max(0, Math.min(100, (currentTime / safeDuration) * 100)) : 0;

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

            {/* TRACK 3: CAPTIONS TRACK */}
            <div className="relative h-9 bg-neutral-900/90 rounded-r-lg border border-neutral-800 overflow-hidden flex items-center px-1">
              <div className="w-full h-full relative">
                {short.captions?.map((cap) => {
                  const leftPct = (cap.start / duration) * 100;
                  const widthPct = Math.max(2, ((cap.end - cap.start) / duration) * 100);
                  const isCurrent = currentTime >= cap.start && currentTime <= cap.end;
                  const isSelected = selectedItemId === cap.id;

                  return (
                    <div
                      key={cap.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCaption?.(cap);
                        onTimeSeek(cap.start);
                      }}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      className={`absolute h-7 top-1 rounded border px-2 flex items-center text-[10px] font-bold truncate transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/50 border-cyan-300 text-white ring-2 ring-cyan-400 shadow-md'
                          : isCurrent
                          ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-sm'
                          : 'bg-cyan-950/40 border-cyan-800/40 text-cyan-300/80 hover:bg-cyan-900/50'
                      }`}
                    >
                      <span className="truncate">{cap.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TRACK 4: B-ROLL OVERLAYS */}
            <div className="relative h-8 bg-neutral-900/90 rounded-r-lg border border-neutral-800 overflow-hidden flex items-center px-1">
              <div className="w-full h-full relative">
                {short.brollSuggestions?.map((br) => {
                  const leftPct = (br.timestamp / duration) * 100;
                  const widthPct = Math.max(3, (br.duration / duration) * 100);
                  const isCurrent = currentTime >= br.timestamp && currentTime <= br.timestamp + br.duration;
                  const isSelected = selectedItemId === br.id;

                  return (
                    <div
                      key={br.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBRoll?.(br);
                        onTimeSeek(br.timestamp);
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
                      style={{ left: `${leftPct}%` }}
                      className={`absolute top-1 -translate-x-1/2 px-2 py-0.5 rounded-full border text-[10px] font-extrabold flex items-center gap-1 transition-transform shadow-md cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500 text-white border-white scale-110 ring-2 ring-white shadow-lg'
                          : isNear
                          ? 'bg-orange-500 text-white border-white scale-105'
                          : 'bg-orange-950/80 text-orange-300 border-orange-500/40 hover:scale-105'
                      }`}
                    >
                      <Volume2 className="w-2.5 h-2.5" />
                      <span>{sfx.soundName.split(' ')[0]}</span>
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
