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

  const activeCaption = short.captions?.find(
    (c) => currentTime >= c.start && currentTime <= c.end
  );
  const activeBroll = short.brollSuggestions?.find(
    (b) => b.enabled && currentTime >= b.timestamp && currentTime <= b.timestamp + b.duration
  );
  const activeSfx = short.sfxMarkers?.find(
    (s) => Math.abs(currentTime - s.timestamp) < 0.5
  );
  const activeVfx = short.vfxMarkers?.find(
    (v) => currentTime >= v.timestamp && currentTime <= v.timestamp + v.duration
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[85vh] bg-neutral-950/95 border border-amber-500/40 rounded-2xl shadow-2xl backdrop-blur-xl p-4 text-xs font-mono text-neutral-200 overflow-y-auto animate-fade-in select-text">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <Activity className="w-4 h-4 animate-pulse" />
          <span>REAL MEDIA DIAGNOSTICS</span>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <span className="text-neutral-500 block">SOURCE MEDIA:</span>
          <span className="text-amber-300 font-semibold break-all text-[11px]">
            {videoUrl || 'No source loaded'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-900">
          <div>
            <span className="text-neutral-500 block">VIDEO DURATION:</span>
            <span className="text-white font-bold">
              {Number.isFinite(rawDuration) ? `${rawDuration.toFixed(2)}s` : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block">CLIP DURATION:</span>
            <span className="text-white font-bold">
              {short.duration ? `${short.duration.toFixed(2)}s` : 'N/A'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-900">
          <div>
            <span className="text-neutral-500 block">RESOLUTION:</span>
            <span className="text-white font-bold">
              {videoWidth && videoHeight ? `${videoWidth}x${videoHeight}` : 'Probing...'}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block">READY STATE:</span>
            <span className={`font-bold ${readyState >= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {READY_STATE_MAP[readyState] || `STATE_${readyState}`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-900">
          <div>
            <span className="text-neutral-500 block">VIDEO CURRENT TIME:</span>
            <span className="text-amber-400 font-bold">{rawCurrentTime.toFixed(3)}s</span>
          </div>
          <div>
            <span className="text-neutral-500 block">CLIP RELATIVE TIME:</span>
            <span className="text-amber-400 font-bold">{currentTime.toFixed(3)}s</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-900">
          <div>
            <span className="text-neutral-500 block">PLAYBACK STATE:</span>
            <span className={`font-bold ${!paused ? 'text-emerald-400' : 'text-neutral-400'}`}>
              {!paused ? '▶ PLAYING' : '⏸ PAUSED'}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block">VOLUME / MUTED:</span>
            <span className="text-white font-bold">
              {muted ? 'MUTED' : `${volume}%`}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-neutral-900 space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-500">CAPTIONS:</span>
            <span className="text-white">{short.captions?.length || 0} segments</span>
          </div>
          <div className="text-[11px] text-neutral-300 italic truncate bg-neutral-900 px-2 py-1 rounded">
            {activeCaption ? `"${activeCaption.text}"` : 'No caption active at playhead'}
          </div>
        </div>

        <div className="pt-1 border-t border-neutral-900 space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-500">B-ROLL TRACK:</span>
            <span className="text-white">{short.brollSuggestions?.length || 0} assets</span>
          </div>
          <div className="text-[11px] text-neutral-300 truncate bg-neutral-900 px-2 py-1 rounded">
            {activeBroll ? `Active: ${activeBroll.concept}` : 'None active'}
          </div>
        </div>

        <div className="pt-1 border-t border-neutral-900 space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-500">SFX TRACK:</span>
            <span className="text-white">{short.sfxMarkers?.length || 0} markers</span>
          </div>
          <div className="text-[11px] text-neutral-300 truncate bg-neutral-900 px-2 py-1 rounded">
            {activeSfx ? `Playing: ${activeSfx.name} (${activeSfx.category})` : 'Idle'}
          </div>
        </div>

        <div className="pt-1 border-t border-neutral-900 space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-500">VFX TRACK:</span>
            <span className="text-white">{short.vfxMarkers?.length || 0} markers</span>
          </div>
          <div className="text-[11px] text-neutral-300 truncate bg-neutral-900 px-2 py-1 rounded">
            {activeVfx ? `Active: ${activeVfx.type} (${activeVfx.label})` : 'Idle'}
          </div>
        </div>

        <div className="pt-1 border-t border-neutral-900">
          <span className="text-neutral-500 block">TIMELINE BOUNDS:</span>
          <span className="text-white text-[11px]">
            start: {short.startTime.toFixed(2)}s | end: {short.endTime.toFixed(2)}s
          </span>
        </div>
      </div>
    </div>
  );
};
