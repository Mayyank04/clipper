import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  X,
  Zap,
} from 'lucide-react';

interface SystemHealthData {
  status: string;
  ffmpeg: string;
  ffprobe: string;
  whisper: string;
  model: string;
  device: string;
  storage: string;
  mediaStorage?: {
    mediaRoot: string;
    exists: boolean;
    writable: boolean;
    totalRegistered: number;
  };
  youtubeDownloader?: {
    available: boolean;
    ytDlpInstalled: boolean;
    ytDlpVersion?: string;
  };
  transcription?: {
    activeJobs: number;
    selected: string;
    providers: Array<{
      id: string;
      name: string;
      status: string;
      model?: string;
      device?: string;
      message?: string;
    }>;
  };
  hardware?: {
    deviceCode: string;
    deviceName: string;
    isAccelerated: boolean;
    platform: string;
    arch: string;
    cores: number;
    totalMemoryGb: number;
  };
  memory?: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  timestamp?: string;
}

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchHealth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/system/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setHealthData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch system health');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen]);

  const handleCopyDiagnostics = async () => {
    if (!healthData) return;
    try {
      const formatted = JSON.stringify(healthData, null, 2);
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Copy diagnostics fallback:', e);
    }
  };

  if (!isOpen) return null;

  const isFfmpegOk = healthData?.ffmpeg === 'ready';
  const isWhisperOk = healthData?.whisper === 'ready';
  const isStorageOk = healthData?.storage === 'ready';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                System Diagnostics & Engine Health
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live Status
                </span>
              </h2>
              <p className="text-xs text-neutral-400">ViralClip Studio Local Engine Core Inspection</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHealth}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-neutral-300">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-center gap-2">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading && !healthData ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
              <p className="text-neutral-400">Probing local media processing subsystems...</p>
            </div>
          ) : healthData ? (
            <>
              {/* Top Engine Health Indicators */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-400 text-[11px]">FFmpeg Engine</span>
                    {isFfmpegOk ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div className="text-base font-black text-white capitalize">{healthData.ffmpeg}</div>
                  <div className="text-[10px] text-neutral-500">Probe: {healthData.ffprobe}</div>
                </div>

                <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-400 text-[11px]">Local Whisper ASR</span>
                    {isWhisperOk ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div className="text-base font-black text-white capitalize">{healthData.whisper}</div>
                  <div className="text-[10px] text-neutral-500">Model: Whisper-{healthData.model}</div>
                </div>

                <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-400 text-[11px]">Media Storage</span>
                    {isStorageOk ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div className="text-base font-black text-white capitalize">{healthData.storage}</div>
                  <div className="text-[10px] text-neutral-500">
                    {healthData.mediaStorage?.totalRegistered || 0} files cached
                  </div>
                </div>
              </div>

              {/* Hardware Acceleration & Device */}
              <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex items-center gap-2 font-bold text-white text-xs">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  <span>Hardware & Compute Runtime</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-neutral-500 block">Execution Device</span>
                    <span className="font-mono text-neutral-200 font-semibold">{healthData.device}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Platform Architecture</span>
                    <span className="font-mono text-neutral-200 font-semibold">
                      {healthData.hardware?.platform || 'macOS'} ({healthData.hardware?.arch || 'arm64'}) •{' '}
                      {healthData.hardware?.cores || 10} cores
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">System Memory</span>
                    <span className="font-mono text-neutral-200 font-semibold">
                      {healthData.hardware?.totalMemoryGb || 16} GB RAM (Heap:{' '}
                      {Math.round((healthData.memory?.heapUsed || 0) / (1024 * 1024))}MB)
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">YouTube Downloader (yt-dlp)</span>
                    <span className="font-mono text-neutral-200 font-semibold">
                      {healthData.youtubeDownloader?.ytDlpInstalled
                        ? `Installed (v${healthData.youtubeDownloader.ytDlpVersion || 'latest'})`
                        : 'Not detected'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transcription Providers Details */}
              <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white text-xs">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Configured Speech Recognition Providers</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-mono">
                    Default: {healthData.transcription?.selected || 'local-whisper'}
                  </span>
                </div>

                <div className="space-y-2">
                  {healthData.transcription?.providers?.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800/80 flex items-center justify-between text-[11px]"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{p.name}</span>
                          <span
                            className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold ${
                              p.status === 'READY'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        {p.message && <p className="text-[10px] text-neutral-400">{p.message}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Storage Root */}
              {healthData.mediaStorage && (
                <div className="p-3 bg-neutral-950/40 border border-neutral-800/60 rounded-xl flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <HardDrive className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Media Storage Directory:</span>
                    <span className="font-mono text-neutral-300 truncate max-w-xs sm:max-w-md">
                      {healthData.mediaStorage.mediaRoot}
                    </span>
                  </div>
                  <span className="text-emerald-400 text-[10px] font-bold">Writable</span>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between">
          <button
            onClick={handleCopyDiagnostics}
            disabled={!healthData}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Diagnostics'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
