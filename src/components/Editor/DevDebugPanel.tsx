import React, { useEffect, useState } from 'react';
import { X, Activity, RefreshCw } from 'lucide-react';
import { ShortCandidate } from '../../types';

interface DevDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  short: ShortCandidate;
  currentTime: number;
  isPlaying: boolean;
  videoUrl: string;
}

const READY_STATE_MAP: Record<number, string> = {
  0: 'HAVE_NOTHING (0)',
  1: 'HAVE_METADATA (1)',
  2: 'HAVE_CURRENT_DATA (2)',
  3: 'HAVE_FUTURE_DATA (3)',
  4: 'HAVE_ENOUGH_DATA (4)',
};

export const DevDebugPanel: React.FC<DevDebugPanelProps> = ({
  isOpen,
  onClose,
  videoRef,
  short,
  currentTime,
  isPlaying,
  videoUrl,
}) => {
  const [, setTick] = useState<number>(0);

  // Poll video element state at high frequency for live diagnostics
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 100);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const vid = videoRef.current;
  const rawCurrentTime = vid?.currentTime ?? 0;
  const rawDuration = vid?.duration ?? 0;
  const readyState = vid?.readyState ?? 0;
  const videoWidth = vid?.videoWidth ?? 0;
  const videoHeight = vid?.videoHeight ?? 0;
  const paused = vid?.paused ?? true;
  const muted = vid?.muted ?? false;
  const volume = vid ? Math.round(vid.volume * 100) : 0;

  const captionsList = short.captions || [];
  const brollList = short.brollSuggestions || [];
  const sfxList = short.sfxMarkers || [];
  const vfxList = short.vfxMarkers || [];

  const totalWords = captionsList.reduce(
    (acc, c) => acc + (c.words?.length || c.text.split(/\s+/).filter(Boolean).length),
    0
  );
  const firstCapTime = captionsList.length > 0 ? `${captionsList[0].start.toFixed(2)}s` : 'N/A';
  const lastCapTime =
    captionsList.length > 0 ? `${captionsList[captionsList.length - 1].end.toFixed(2)}s` : 'N/A';

  const speechDuration = captionsList.reduce((acc, c) => acc + Math.max(0, c.end - c.start), 0);
  const speechCoverage =
    short.duration > 0 ? Math.min(100, Math.round((speechDuration / short.duration) * 100)) : 0;

  const brollAccepted = brollList.filter((b) => b.enabled).length;
  const brollRejected = brollList.filter((b) => !b.enabled).length;
  const firstBrollTime = brollList.length > 0 ? `${brollList[0].timestamp.toFixed(2)}s` : 'N/A';
  const lastBrollTime =
    brollList.length > 0
      ? `${(brollList[brollList.length - 1].timestamp + brollList[brollList.length - 1].duration).toFixed(2)}s`
      : 'N/A';

  const detectedLang =
    typeof short.language === 'object' && short.language !== null
      ? (short.language as any).detectedCode || (short.language as any).primaryLanguage
      : short.language || 'en';

  const activeCaption = captionsList.find(
    (c) => currentTime >= c.start && currentTime <= c.end
  );
  const activeBroll = brollList.find(
    (b) => b.enabled && currentTime >= b.timestamp && currentTime <= b.timestamp + b.duration
  );
  const activeSfx = sfxList.find(
    (s) => Math.abs(currentTime - s.timestamp) < 0.5
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[85vh] bg-neutral-950/95 border border-amber-500/40 rounded-2xl shadow-2xl backdrop-blur-xl p-4 text-xs font-mono text-neutral-200 overflow-y-auto animate-fade-in select-text">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <Activity className="w-4 h-4 animate-pulse" />
          <span>DIAGNOSTICS (PART 25)</span>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {/* SOURCE */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-amber-400 border-b border-neutral-900 pb-0.5">
            1. SOURCE
          </div>
          <div className="grid grid-cols-2 gap-x-2 text-[11px]">
            <div>Duration: <span className="text-white font-bold">{rawDuration ? `${rawDuration.toFixed(2)}s` : 'N/A'}</span></div>
            <div>Resolution: <span className="text-white font-bold">{videoWidth && videoHeight ? `${videoWidth}x${videoHeight}` : '1080x1920'}</span></div>
            <div>FPS: <span className="text-white font-bold">{short.sourceMedia?.fps || 30}</span></div>
            <div>Audio: <span className="text-emerald-400 font-bold">{muted ? 'Muted' : 'AAC Active'}</span></div>
          </div>
        </div>

        {/* TRANSCRIPT */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-sky-400 border-b border-neutral-900 pb-0.5">
            2. TRANSCRIPT
          </div>
          <div className="grid grid-cols-2 gap-x-2 text-[11px]">
            <div>Language: <span className="text-white font-bold">{detectedLang}</span></div>
            <div>Segments: <span className="text-white font-bold">{captionsList.length}</span></div>
            <div>Words: <span className="text-white font-bold">{totalWords}</span></div>
            <div>Coverage: <span className="text-emerald-400 font-bold">{speechCoverage}%</span></div>
          </div>
        </div>

        {/* CAPTIONS */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-amber-300 border-b border-neutral-900 pb-0.5">
            3. CAPTIONS
          </div>
          <div className="grid grid-cols-2 gap-x-2 text-[11px]">
            <div>Count: <span className="text-white font-bold">{captionsList.length}</span></div>
            <div>Speech Cov: <span className={`font-bold ${speechCoverage >= 95 ? 'text-emerald-400' : 'text-amber-400'}`}>{speechCoverage}%</span></div>
            <div>First: <span className="text-white font-bold">{firstCapTime}</span></div>
            <div>Last: <span className="text-white font-bold">{lastCapTime}</span></div>
          </div>
          <div className="text-[10px] text-neutral-400 truncate bg-neutral-900 px-2 py-1 rounded">
            {activeCaption ? `Active: "${activeCaption.text}"` : 'No caption at playhead'}
          </div>
        </div>

        {/* B-ROLL */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-purple-400 border-b border-neutral-900 pb-0.5">
            4. B-ROLL
          </div>
          <div className="grid grid-cols-2 gap-x-2 text-[11px]">
            <div>Candidates: <span className="text-white font-bold">{brollList.length}</span></div>
            <div>Accepted: <span className="text-emerald-400 font-bold">{brollAccepted}</span></div>
            <div>Rejected: <span className="text-neutral-500 font-bold">{brollRejected}</span></div>
            <div>First/Last: <span className="text-white font-bold">{firstBrollTime} / {lastBrollTime}</span></div>
          </div>
          <div className="text-[10px] text-neutral-400 truncate bg-neutral-900 px-2 py-1 rounded">
            {activeBroll ? `Active: ${activeBroll.concept} (${activeBroll.confidence || 0.9} conf)` : 'No B-roll at playhead'}
          </div>
        </div>

        {/* SFX */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-rose-400 border-b border-neutral-900 pb-0.5">
            5. SFX
          </div>
          <div className="grid grid-cols-2 gap-x-2 text-[11px]">
            <div>Candidates: <span className="text-white font-bold">{sfxList.length}</span></div>
            <div>Accepted: <span className="text-emerald-400 font-bold">{sfxList.length}</span></div>
          </div>
          <div className="text-[10px] text-neutral-400 truncate bg-neutral-900 px-2 py-1 rounded">
            {activeSfx ? `Playing: ${activeSfx.soundName || activeSfx.category}` : 'Idle'}
          </div>
        </div>

        {/* RENDER */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-emerald-400 border-b border-neutral-900 pb-0.5">
            6. RENDER (CANONICAL RENDER PLAN)
          </div>
          <div className="grid grid-cols-2 gap-x-2 text-[11px]">
            <div>Video Layers: <span className="text-white font-bold">1 (9:16 Base)</span></div>
            <div>Caption Layers: <span className="text-white font-bold">{captionsList.length > 0 ? '1 (Kinetic)' : '0'}</span></div>
            <div>B-roll Layers: <span className="text-white font-bold">{brollAccepted > 0 ? '1 (Cutaway)' : '0'}</span></div>
            <div>SFX Layers: <span className="text-white font-bold">{sfxList.length > 0 ? '1 (AudioMix)' : '0'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
