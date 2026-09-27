import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Flame,
  Zap,
  Scissors,
  AlertTriangle,
  Upload,
  Shield,
  ArrowLeft,
  Star,
} from 'lucide-react';
import {
  ShortCandidate,
  AspectRatio,
  CaptionCustomization,
  BrandKit,
  VFXMarker,
  BRollSuggestion,
} from '../../types';
import { formatTime, formatTimeWithTenths } from '../../utils/timeFormat';
import { AudioVisualizerCanvas } from './AudioVisualizerCanvas';
import { TypingCaptionOverlay } from './TypingCaptionOverlay';
import {
  getCaptionStateAtTime,
  computeWordAnimationState,
  CaptionLayoutEngine,
  CaptionStyleDefinition,
} from '../../utils/captionEngine';
import { sfxEngine } from '../../utils/sfxAudio';
import { getColorGradingProfile } from '../../utils/creatorStudio/videoEffectsEngine';

interface VideoCanvasProps {
  videoRef?: React.RefObject<HTMLVideoElement>;
  short: ShortCandidate;
  videoUrl: string;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onPlayPause: () => void;
  onPlayStateChange?: (playing: boolean) => void;
  aspectRatio: AspectRatio;
  captionConfig: CaptionCustomization;
  brandKit: BrandKit;
  zoomPunchEnabled: boolean;
  speakerPosition?: 'center' | 'left' | 'right' | 'auto_switch';
  volume?: number; // 0 to 1
  safeAreaEnabled?: boolean;
  onToggleSafeArea?: (enabled: boolean) => void;
  onVideoLoaded?: (meta: { duration: number; videoWidth: number; videoHeight: number }) => void;
  onRelinkMedia?: (file: File) => void;
  onSelectCaption?: (captionId: string) => void;
  onBack?: () => void;
}

export interface LiveTemplatePreviewProps {
  styleDef: CaptionStyleDefinition;
  isSelected?: boolean;
  isFavorite?: boolean;
  onSelect?: () => void;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}

export const LiveTemplatePreview: React.FC<LiveTemplatePreviewProps> = ({
  styleDef,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
}) => {
  const [ticker, setTicker] = useState<number>(0.6);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isHovered && !isSelected) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }
    let start = performance.now() - (ticker * 1000);
    const loop = (now: number) => {
      const elapsed = (now - start) / 1000;
      setTicker(elapsed % 2.4);
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isHovered, isSelected]);

  const sampleWords = useMemo(
    () => [
      { word: 'THIS', text: 'THIS', start: 0.05, end: 0.6 },
      { word: 'IS', text: 'IS', start: 0.65, end: 1.2 },
      { word: 'THE', text: 'THE', start: 1.25, end: 1.8 },
      { word: 'WORD', text: 'WORD', start: 1.85, end: 2.38 },
    ],
    []
  );

  const cfg = styleDef.config;
  const strokeW = Math.max(1, Math.min(3, Math.round((cfg.strokeWidth || 3) * 0.5)));

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative p-3 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden group select-none flex flex-col justify-between h-28 ${
        isSelected
          ? 'bg-amber-400/10 border-amber-400 shadow-lg shadow-amber-400/10 ring-1 ring-amber-400/40'
          : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
      }`}
    >
      {/* Top Bar: Name & Category badge & Favorite Star */}
      <div className="flex items-center justify-between gap-1 z-10">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold text-white truncate">{styleDef.name}</span>
          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-neutral-800/80 text-neutral-400 font-mono shrink-0">
            {styleDef.category}
          </span>
        </div>
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(e);
            }}
            className="p-1 text-neutral-500 hover:text-amber-400 transition cursor-pointer"
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
        )}
      </div>

      {/* Live Animated Canvas Container */}
      <div className="flex-1 flex items-center justify-center my-1">
        <div
          className={`flex items-center justify-center gap-1 px-2.5 py-1 ${
            cfg.backgroundShape === 'pill'
              ? 'rounded-full'
              : cfg.backgroundShape === 'box'
              ? 'rounded-lg'
              : ''
          }`}
          style={{
            fontFamily: cfg.fontFamily,
            fontSize: '13px',
            fontWeight: cfg.fontWeight || 800,
            textTransform: cfg.uppercase ? 'uppercase' : 'none',
            backgroundColor: cfg.backgroundColor
              ? `${cfg.backgroundColor}${Math.round((cfg.backgroundOpacity ?? 0.8) * 255).toString(16).padStart(2, '0')}`
              : undefined,
            letterSpacing: cfg.letterSpacing ? `${cfg.letterSpacing * 0.5}px` : undefined,
          }}
        >
          {sampleWords.map((w, idx) => {
            const anim = computeWordAnimationState(w, idx, ticker, cfg, sampleWords);
            return (
              <span
                key={idx}
                className="inline-block transition-all duration-75"
                style={{
                  color: anim.color,
                  transform: `translate(${anim.translateX || 0}px, ${anim.translateY || 0}px) scale(${anim.scale || 1}) rotate(${anim.rotate || 0}deg)`,
                  opacity: anim.opacity,
                  filter: anim.blur ? `blur(${anim.blur}px)` : undefined,
                  WebkitTextStroke: anim.strokeWidth > 0 ? `${strokeW}px ${anim.strokeColor}` : undefined,
                  textShadow: anim.glow
                    ? `0 0 10px ${anim.glow}, 0 2px 4px rgba(0,0,0,0.8)`
                    : cfg.hasShadow
                    ? '0 2px 5px rgba(0,0,0,0.9)'
                    : undefined,
                  textDecoration: anim.isUnderline ? 'underline' : undefined,
                }}
              >
                {anim.word}
              </span>
            );
          })}
        </div>
      </div>

      {/* Footer descriptor */}
      <div className="text-[10px] text-neutral-400 line-clamp-1 z-10">
        {styleDef.desc}
      </div>
    </div>
  );
};

export const VideoCanvas: React.FC<VideoCanvasProps> = ({
  videoRef: externalVideoRef,
  short,
  videoUrl,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onPlayPause,
  onPlayStateChange,
  aspectRatio,
  captionConfig,
  brandKit,
  zoomPunchEnabled,
  speakerPosition = 'center',
  volume = 0.85,
  safeAreaEnabled,
  onToggleSafeArea,
  onVideoLoaded,
  onRelinkMedia,
  onSelectCaption,
  onBack,
}) => {
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoRef = externalVideoRef || internalVideoRef;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const monitorRef = useRef<HTMLDivElement | null>(null);
  const [monitorWidth, setMonitorWidth] = useState<number>(340);
  const relinkInputRef = useRef<HTMLInputElement | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [localVolume, setLocalVolume] = useState<number>(volume);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaErrorCode, setMediaErrorCode] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);

  // Dynamically observe preview monitor width to calculate exact typography scaling
  useEffect(() => {
    const el = monitorRef.current;
    if (!el) return;
    const updateSize = () => {
      if (el) {
        setMonitorWidth(el.clientWidth || 340);
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspectRatio]);

  // Clear errors when source video changes
  useEffect(() => {
    setMediaError(null);
    setMediaErrorCode(null);
    setIsVideoReady(false);
  }, [videoUrl]);

  // Sync volume and mute
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.volume = isMuted ? 0 : localVolume;
    vid.muted = isMuted;
  }, [localVolume, isMuted]);

  // Sync playback speed
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  const handleMediaError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const vid = e.currentTarget;
    let detail = 'Unable to stream source media file.';
    let codeStr = 'MEDIA_ERR_UNKNOWN';

    if (vid.error) {
      switch (vid.error.code) {
        case 1: // MEDIA_ERR_ABORTED
          codeStr = 'MEDIA_ERR_ABORTED';
          detail = 'The media resource fetching was aborted by the user or browser.';
          break;
        case 2: // MEDIA_ERR_NETWORK
          codeStr = 'MEDIA_ERR_NETWORK';
          detail = 'A network error occurred while streaming the video file.';
          break;
        case 3: // MEDIA_ERR_DECODE
          codeStr = 'MEDIA_ERR_DECODE';
          detail = 'The browser failed to decode the media (codec incompatibility or corrupted file).';
          break;
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          codeStr = 'MEDIA_ERR_SRC_NOT_SUPPORTED';
          detail = 'The video format or stream source is not supported by your browser.';
          break;
        default:
          detail = vid.error.message || detail;
      }
    }
    console.error(`[VideoCanvas Error] code=${codeStr}:`, detail);
    setMediaErrorCode(codeStr);
    setMediaError(detail);
    setIsVideoReady(false);
  };

  const handleRetryMedia = () => {
    setMediaError(null);
    setMediaErrorCode(null);
    const vid = videoRef.current;
    if (vid) {
      try {
        vid.load();
      } catch (err) {
        console.warn('Retry load error:', err);
      }
    }
  };

  const handleVideoTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;

    const clips = short.videoClips && short.videoClips.length > 0
      ? short.videoClips
      : [{
          id: 'clip_default',
          sourceUrl: videoUrl,
          sourceStart: short.startTime,
          sourceEnd: short.endTime,
          timelineStart: 0,
          timelineEnd: short.duration,
        }];

    const curSource = vid.currentTime;
    const activeClip = clips.find((c) => curSource >= c.sourceStart - 0.05 && curSource <= c.sourceEnd + 0.05) || clips[0];
    const clipProgress = Math.max(0, curSource - activeClip.sourceStart);
    const seqTime = activeClip.timelineStart + clipProgress;

    // Check boundary for active clip
    if (curSource >= activeClip.sourceEnd) {
      const clipIdx = clips.indexOf(activeClip);
      if (clipIdx < clips.length - 1) {
        const nextClip = clips[clipIdx + 1];
        vid.currentTime = nextClip.sourceStart;
        onTimeUpdate(nextClip.timelineStart);
        return;
      } else {
        vid.pause();
        vid.currentTime = activeClip.sourceEnd;
        onPlayStateChange?.(false);
        onTimeUpdate(short.duration);
        return;
      }
    }

    if (curSource < activeClip.sourceStart) {
      vid.currentTime = activeClip.sourceStart;
      onTimeUpdate(activeClip.timelineStart);
      return;
    }

    onTimeUpdate(Math.max(0, Math.min(short.duration, seqTime)));
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const [showSafeZones, setShowSafeZones] = useState<boolean>(false);
  const playedSfxRef = useRef<Set<string>>(new Set());

  // Reset played SFX on seeking backwards or clip change
  useEffect(() => {
    playedSfxRef.current.clear();
  }, [short.id, videoUrl]);

  // Trigger verified SFX playback when playhead crosses timestamp
  useEffect(() => {
    if (!isPlaying || !short.sfxMarkers) return;
    for (const sfx of short.sfxMarkers) {
      if (
        currentTime >= sfx.timestamp - 0.08 &&
        currentTime <= sfx.timestamp + 0.15 &&
        !playedSfxRef.current.has(sfx.id)
      ) {
        playedSfxRef.current.add(sfx.id);
        sfxEngine.playSound(sfx.category, sfx.volume ?? 0.8);
      }
    }
  }, [currentTime, isPlaying, short.sfxMarkers]);

  // Synchronize Voiceover Audio in Canvas Preview
  const voiceoverAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!voiceoverAudioRef.current) {
      voiceoverAudioRef.current = new Audio();
    }
    const audio = voiceoverAudioRef.current;
    const activeVo = short.voiceoverEvents?.find(
      (vo) => currentTime >= vo.start && currentTime < vo.end
    );

    if (activeVo && isPlaying && !isMuted) {
      const offset = currentTime - activeVo.start;
      const targetSrc = activeVo.audioUrl.startsWith('http') ? activeVo.audioUrl : `${window.location.origin}${activeVo.audioUrl}`;
      if (audio.src !== targetSrc) {
        audio.src = activeVo.audioUrl;
        audio.currentTime = Math.max(0, offset);
        audio.volume = localVolume;
        audio.play().catch(() => {});
      } else {
        if (Math.abs(audio.currentTime - offset) > 0.25) {
          audio.currentTime = Math.max(0, offset);
        }
        if (audio.paused) {
          audio.play().catch(() => {});
        }
      }
    } else {
      if (!audio.paused) {
        audio.pause();
      }
    }
  }, [currentTime, isPlaying, isMuted, localVolume, short.voiceoverEvents]);

  useEffect(() => {
    return () => {
      if (voiceoverAudioRef.current) {
        voiceoverAudioRef.current.pause();
        voiceoverAudioRef.current = null;
      }
    };
  }, []);

  // Deterministic seek-safe caption state calculation with Netflix/BBC speech-hold gap-bridging
  const captionState = getCaptionStateAtTime(short.captions || [], currentTime, {
    ...captionConfig,
    enableSpeechHold: true,
    holdThresholdSeconds: 0.28,
    finalHoldSeconds: 0.8,
  });
  const activeCaption = captionState.activeCaption;

  // Find active VFX marker
  const activeVfx: VFXMarker | undefined = short.vfxMarkers?.find(
    (vfx) => currentTime >= vfx.timestamp && currentTime <= vfx.timestamp + vfx.duration
  );

  // Find active B-Roll
  const activeBRoll: BRollSuggestion | undefined = short.brollSuggestions?.find((br) => {
    const bStart = br.timestamp ?? (br as any).start ?? 0;
    const bDur = br.duration ?? (((br as any).end ?? bStart + 3) - bStart);
    return br.enabled !== false && currentTime >= bStart && currentTime <= bStart + bDur;
  });

  // Aspect ratio styling
  const getAspectRatioClasses = () => {
    switch (aspectRatio) {
      case '9:16':
        return 'w-[300px] sm:w-[340px] md:w-[360px] h-[533px] sm:h-[604px] md:h-[640px]';
      case '1:1':
        return 'w-[340px] sm:w-[440px] h-[340px] sm:h-[440px]';
      case '16:9':
        return 'w-[480px] sm:w-[620px] h-[270px] sm:h-[348px]';
      default:
        return 'w-[340px] h-[604px]';
    }
  };

  // Dynamic Reframing Subject Alignment (Subject-aware without destructive upscaling)
  const getSpeakerReframeStyle = () => {
    switch (speakerPosition) {
      case 'left':
        return 'object-[28%_center]';
      case 'right':
        return 'object-[72%_center]';
      case 'auto_switch':
      case 'center':
      default:
        return 'object-center';
    }
  };

  // Dynamic VFX transforms
  const isPunchZoom = zoomPunchEnabled && activeVfx?.type === 'zoom_punch';
  const isShake = activeVfx?.type === 'shake';
  const isFlash = activeVfx?.type === 'glow';
  const isBlur = activeVfx?.type === 'motion_blur';
  const isGlitch = activeVfx?.type === 'glitch';

  // Pro Creator Color Grading Profile (CSS Preview Parity)
  const colorTreatmentId = (short as any).colorTreatment || 'cinematic_red';
  const colorGrade = getColorGradingProfile(colorTreatmentId);

  // Check if Audio-to-Video mode is active
  const isAudioMode = Boolean(short.audioToVideoConfig || short.audioUrl);

  return (
    <div ref={containerRef} className="relative flex flex-col items-center justify-center p-2 sm:p-4 h-full">
      {/* Video Framing Monitor */}
      <div
        ref={monitorRef}
        className={`relative ${getAspectRatioClasses()} bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl flex items-center justify-center select-none transition-all duration-300 ${
          isShake ? 'translate-x-1 translate-y-1' : ''
        }`}
      >
        {/* Clean dark cinematic backdrop */}
        <div className="absolute inset-0 bg-neutral-900 pointer-events-none" />

        {/* Audio-to-Video Engine Canvas (Background & Reactive Visualizer) */}
        {isAudioMode && short.audioToVideoConfig && (
          <div className="absolute inset-0 z-10">
            <AudioVisualizerCanvas
              config={short.audioToVideoConfig}
              currentTime={currentTime}
              isPlaying={isPlaying}
              mediaElement={videoRef.current}
            />
          </div>
        )}

        {/* Source Video Player - Persistent HTMLVideoElement */}
        <video
          ref={videoRef}
          src={videoUrl}
          preload="auto"
          playsInline
          onTimeUpdate={handleVideoTimeUpdate}
          onPlay={() => onPlayStateChange?.(true)}
          onPause={() => onPlayStateChange?.(false)}
          onEnded={() => {
            onPlayStateChange?.(false);
            if (videoRef.current) {
              videoRef.current.currentTime = short.startTime;
            }
          }}
          onLoadedMetadata={(e) => {
            const vid = e.currentTarget;
            setMediaError(null);
            setIsVideoReady(true);
            if (vid.currentTime < short.startTime) {
              vid.currentTime = short.startTime;
            }
            if (vid && onVideoLoaded) {
              const dur = Number.isFinite(vid.duration) && vid.duration > 0 ? vid.duration : (short.duration || 30);
              onVideoLoaded({
                duration: dur,
                videoWidth: vid.videoWidth || 720,
                videoHeight: vid.videoHeight || 1280,
              });
            }
          }}
          onCanPlay={() => {
            setIsVideoReady(true);
            setMediaError(null);
          }}
          onStalled={() => {
            console.warn('[VideoCanvas] video stream stalled');
          }}
          onAbort={() => {
            console.warn('[VideoCanvas] video stream aborted');
          }}
          onEmptied={() => {
            setIsVideoReady(false);
          }}
          onError={handleMediaError}
          onClick={onPlayPause}
          style={{
            imageRendering: 'auto' as any,
            filter: colorGrade.cssFilter,
          }}
          className={`relative z-10 w-full h-full object-cover cursor-pointer transition-all duration-300 ${
            isAudioMode ? 'opacity-0 pointer-events-auto' : ''
          } ${getSpeakerReframeStyle()} ${
            isPunchZoom ? 'scale-125' : 'scale-100'
          } ${isBlur ? 'blur-sm' : ''} ${isGlitch ? 'hue-rotate-90 saturate-200' : ''}`}
        />

        {/* Video Loading Indicator */}
        {!isVideoReady && !mediaError && (
          <div className="absolute top-4 z-25 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-800 text-[11px] text-amber-400 font-semibold flex items-center gap-2 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Loading video...
          </div>
        )}

        {/* Media Error / Relink State (PART 4 SPECIFICATION) */}
        {(mediaError || short.mediaUnavailable) && (
          <div className="absolute inset-0 z-30 bg-neutral-950/95 flex flex-col items-center justify-center p-6 text-center animate-fade-in select-none">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 shadow-lg shadow-rose-500/10">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-white font-black text-sm uppercase tracking-wider mb-1">
              VIDEO COULD NOT BE LOADED
            </h3>
            <p className="text-neutral-300 text-xs max-w-xs mb-1 font-medium leading-relaxed">
              {mediaError || 'Unable to stream or decode video media file.'}
            </p>
            {mediaErrorCode && (
              <span className="text-[10px] font-mono text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800 mb-4">
                {mediaErrorCode}
              </span>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <button
                onClick={handleRetryMedia}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>

              <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs border border-neutral-700 shadow-md transition-all cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Relink Media</span>
                <input
                  ref={relinkInputRef}
                  type="file"
                  accept="video/*,audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onRelinkMedia) {
                      onRelinkMedia(file);
                    }
                  }}
                />
              </label>

              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white font-semibold text-xs border border-neutral-800 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Flash Overlay if active */}
        {isFlash && (
          <div className="absolute inset-0 z-15 bg-white/30 pointer-events-none animate-pulse" />
        )}

        {/* B-Roll Cutaway Overlay if active (Full Cover or PIP Card) */}
        {activeBRoll && (
          <div
            className={`z-15 transition-all duration-300 animate-fade-in overflow-hidden ${
              (activeBRoll as any).isPIP
                ? 'absolute top-4 right-4 w-32 h-56 rounded-xl border-2 border-white/90 shadow-2xl z-25 bg-black'
                : 'absolute inset-0'
            }`}
          >
            {(activeBRoll.videoUrl || (activeBRoll as any).assetUrl?.endsWith('.mp4')) ? (
              <video
                src={activeBRoll.videoUrl || (activeBRoll as any).assetUrl}
                autoPlay
                loop
                muted={!activeBRoll.audioEnabled}
                playsInline
                className="w-full h-full object-cover transition-transform duration-1000 ease-out"
                style={{
                  transform: activeBRoll.crop?.motion ? 'scale(1.04)' : 'scale(1.0)',
                }}
              />
            ) : (
              <img
                src={activeBRoll.imageUrl || (activeBRoll as any).assetUrl}
                alt={activeBRoll.concept}
                className="w-full h-full object-cover transition-transform duration-1000 ease-out"
                style={{
                  transform: activeBRoll.crop?.motion ? 'scale(1.04)' : 'scale(1.0)',
                }}
              />
            )}
          </div>
        )}

        {/* Watermark Overlay (Brand Kit) */}
        {brandKit.enabled && brandKit.brandName && (
          <div
            className={`absolute z-20 pointer-events-none text-xs font-bold tracking-wider text-white px-2.5 py-1 rounded bg-black/40 backdrop-blur-sm border border-white/10 ${
              brandKit.watermarkPosition === 'top-left'
                ? 'top-4 left-4'
                : brandKit.watermarkPosition === 'top-right'
                ? 'top-4 right-4'
                : brandKit.watermarkPosition === 'bottom-left'
                ? 'bottom-4 left-4'
                : 'bottom-4 right-4'
            }`}
            style={{ opacity: brandKit.watermarkOpacity / 100 }}
          >
            {brandKit.brandName}
          </div>
        )}

        {/* Top Floating Badges */}
        <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-full border border-neutral-800 text-[11px] text-amber-400 font-bold shadow-md">
            <Flame className="w-3.5 h-3.5 fill-amber-400" />
            <span>{short.viralScore?.overall || 94} VIRAL</span>
          </div>

          <div className="text-[11px] font-mono text-neutral-300 bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-full border border-neutral-800">
            {formatTimeWithTenths(currentTime)} / {formatTimeWithTenths(short.duration)}
          </div>
        </div>

        {/* Keypoint Callout Banner if VFX marker active */}
        {activeVfx?.type === 'callout' && (
          <div className="absolute top-16 inset-x-4 z-20 animate-bounce">
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-neutral-950 font-black text-xs px-3 py-1.5 rounded-lg shadow-xl text-center uppercase tracking-wider">
              {activeVfx.label || 'CRITICAL MOMENT'}
            </div>
          </div>
        )}

        {/* LIVE ANIMATED CAPTIONS OVERLAY (Audio-to-Video Typing Engine OR Standard Kinetic Captions) */}
        {isAudioMode && short.audioToVideoConfig ? (
          <TypingCaptionOverlay
            captions={short.captions || []}
            currentTime={currentTime}
            config={short.audioToVideoConfig}
          />
        ) : (
          captionState.activeCaption && (() => {
            const previewStyles = CaptionLayoutEngine.getPreviewStyles(captionConfig, monitorWidth);
            const words = captionState.activeCaption.words || [];

            // Face-avoid automatic positioning or explicit positionY
            const effectivePosY = captionConfig.autoPositionMode === 'face_avoid'
              ? Math.min(84, (captionConfig.positionY || 72) + 6)
              : captionConfig.positionY || 72;

            // Alignment styles
            const alignClass = captionConfig.alignment === 'left'
              ? 'text-left items-start'
              : captionConfig.alignment === 'right'
              ? 'text-right items-end'
              : 'text-center items-center';

            // Background shape class
            const bgShapeClass = captionConfig.backgroundShape === 'pill'
              ? 'rounded-full px-4 py-2'
              : captionConfig.backgroundShape === 'sharp'
              ? 'rounded-none px-3 py-1.5'
              : captionConfig.backgroundColor
              ? 'rounded-xl px-3 py-1.5'
              : 'rounded-xl p-1';

            return (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (captionState.activeCaption) {
                    onSelectCaption?.(captionState.activeCaption.id);
                  }
                }}
                className={`absolute inset-x-3 z-20 flex flex-col pointer-events-auto cursor-pointer group px-2 transition-all duration-150 ${alignClass}`}
                style={{ top: `${effectivePosY}%` }}
                title="Click to edit caption text, timing, font, or split/merge"
              >
                <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-1 text-[9px] font-mono font-bold bg-amber-400 text-neutral-950 px-2 py-0.5 rounded shadow pointer-events-none">
                  Click to edit caption
                </div>
                <div
                  className={`leading-snug transition-all group-hover:ring-1 group-hover:ring-amber-400/50 ${bgShapeClass} ${
                    captionConfig.hasShadow ? 'filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]' : ''
                  }`}
                  style={{
                    fontFamily: captionConfig.fontFamily,
                    fontSize: `${previewStyles.fontSize}px`,
                    fontWeight: captionConfig.fontWeight || 800,
                    maxWidth: `${previewStyles.maxLineWidthPercent}%`,
                    textTransform: captionConfig.uppercase ? 'uppercase' : 'none',
                    backgroundColor: captionConfig.backgroundColor
                      ? `${captionConfig.backgroundColor}${Math.round((captionConfig.backgroundOpacity ?? 0.85) * 255).toString(16).padStart(2, '0')}`
                      : undefined,
                    letterSpacing: previewStyles.letterSpacing ? `${previewStyles.letterSpacing}px` : undefined,
                  }}
                >
                  {words.map((w: any, idx: number) => {
                    const anim = computeWordAnimationState(w, idx, currentTime, captionConfig, words);
                    if (!anim.visible) return null;

                    return (
                      <span
                        key={idx}
                        className={`inline-block mx-1 transition-all duration-75 select-none ${
                          anim.strokeWidth > 0 ? 'text-stroke-sm' : ''
                        } ${anim.isMarker ? 'bg-amber-400/30 px-1 rounded' : ''}`}
                        style={{
                          color: anim.color,
                          transform: `translate(${anim.translateX || 0}px, ${anim.translateY || 0}px) scale(${anim.scale || 1}) rotate(${anim.rotate || 0}deg)`,
                          transformOrigin: 'center center',
                          opacity: anim.opacity,
                          filter: anim.blur ? `blur(${anim.blur}px)` : undefined,
                          WebkitTextStroke: anim.strokeWidth > 0 ? `${previewStyles.strokeWidth}px ${anim.strokeColor}` : undefined,
                          textShadow: anim.glow
                            ? `0 0 16px ${anim.glow}, 0 4px 10px rgba(0,0,0,0.95)`
                            : anim.highlighted && captionConfig.hasShadow
                            ? `0 0 16px ${anim.color}80, 0 4px 10px rgba(0,0,0,0.95)`
                            : undefined,
                          textDecoration: anim.isUnderline ? 'underline' : undefined,
                        }}
                      >
                        {anim.word}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })()
        )}

        {/* 9:16 Safe-Zone Overlay Guides (TikTok / Reels / Shorts Parity) */}
        {(safeAreaEnabled !== undefined ? safeAreaEnabled : showSafeZones) && aspectRatio === '9:16' && (
          <div className="absolute inset-0 pointer-events-none z-25 border-2 border-dashed border-sky-400/40">
            {/* Top Bar Safe Zone */}
            <div className="absolute top-0 inset-x-0 h-[14%] bg-red-500/10 border-b border-dashed border-red-400/50 flex items-center justify-between px-3">
              <span className="text-[9px] font-mono font-bold text-red-300 tracking-wider bg-black/75 px-2 py-0.5 rounded border border-red-500/30">
                TOP SAFE ZONE (14% — Search & Status Bar)
              </span>
              <span className="text-[8px] font-mono text-neutral-300 bg-neutral-900/80 px-1.5 py-0.5 rounded">
                TikTok / Reels / Shorts
              </span>
            </div>
            {/* Right Action Icons Safe Zone */}
            <div className="absolute top-[14%] right-0 bottom-[22%] w-[18%] bg-red-500/10 border-l border-dashed border-red-400/50 flex items-center justify-center">
              <span className="text-[8px] font-mono font-bold text-red-300 tracking-wider bg-black/75 px-1.5 py-0.5 rounded rotate-90 whitespace-nowrap border border-red-500/30">
                ACTION BUTTONS (18% — Like / Share / Remix)
              </span>
            </div>
            {/* Bottom Metadata & Controls Safe Zone */}
            <div className="absolute bottom-0 inset-x-0 h-[22%] bg-amber-500/10 border-t border-dashed border-amber-400/50 flex items-center justify-between px-3">
              <span className="text-[9px] font-mono font-bold text-amber-300 tracking-wider bg-black/75 px-2 py-0.5 rounded border border-amber-500/30">
                BOTTOM SAFE ZONE (22% — Username / Title / Audio Track)
              </span>
              <span className="text-[8px] font-mono font-bold text-emerald-300 bg-black/75 px-2 py-0.5 rounded border border-emerald-500/30">
                OPTIMAL CAPTION Y: 60% – 76%
              </span>
            </div>
          </div>
        )}

        {/* Viral Progress Bar at Bottom of Short */}
        <div className="absolute bottom-0 inset-x-0 h-1.5 bg-neutral-900/80 z-20 pointer-events-none">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-sm transition-all duration-100"
            style={{ width: `${Math.min(100, (currentTime / (short.duration || 30)) * 100)}%` }}
          />
        </div>

        {/* Big Center Play Icon when Paused */}
        {!isPlaying && (
          <div
            onClick={onPlayPause}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-[1px] cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-amber-400/95 text-neutral-950 flex items-center justify-center shadow-2xl shadow-amber-400/30 transform hover:scale-110 transition-transform">
              <Play className="w-8 h-8 fill-neutral-950 ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Transport Bar */}
      <div className="mt-3 flex items-center gap-2.5 sm:gap-3 bg-neutral-900/95 border border-neutral-800 px-3.5 py-2 rounded-xl shadow-lg">
        <button
          onClick={() => {
            const vid = videoRef.current;
            if (vid) vid.currentTime = short.startTime;
            onTimeUpdate(0);
          }}
          title="Restart Short"
          className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onPlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
          className="p-2 rounded-lg bg-amber-400 text-neutral-950 hover:bg-amber-300 font-bold transition-colors cursor-pointer"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-neutral-950" /> : <Play className="w-4 h-4 fill-neutral-950 ml-0.5" />}
        </button>

        {/* Volume / Mute Control */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : localVolume}
          onChange={(e) => {
            setLocalVolume(Number(e.target.value));
            if (isMuted) setIsMuted(false);
          }}
          className="w-16 accent-amber-400 hidden sm:inline-block cursor-pointer"
          title="Volume"
        />

        {/* Speed Selector */}
        <select
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          className="bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-300 rounded px-1.5 py-1 focus:outline-none cursor-pointer"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1.0x</option>
          <option value={1.25}>1.25x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2.0x</option>
        </select>

        <div className="text-xs font-mono text-neutral-300">
          {formatTimeWithTenths(currentTime)} / {formatTimeWithTenths(short.duration)}
        </div>

        {/* Safe Zones Toggle */}
        <button
          onClick={() => {
            const current = safeAreaEnabled !== undefined ? safeAreaEnabled : showSafeZones;
            if (onToggleSafeArea) {
              onToggleSafeArea(!current);
            } else {
              setShowSafeZones(!current);
            }
          }}
          className={`p-1.5 rounded transition-colors ml-1 cursor-pointer ${
            (safeAreaEnabled !== undefined ? safeAreaEnabled : showSafeZones)
              ? 'text-amber-400 bg-amber-400/10'
              : 'text-neutral-400 hover:text-white'
          }`}
          title="Toggle 9:16 UI Safe-Zones Guide"
        >
          <Shield className="w-4 h-4" />
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
