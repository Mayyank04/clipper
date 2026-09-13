import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  X,
  Sparkles,
  CheckCircle2,
  Film,
  Smartphone,
  Square,
  Tv,
  Share2,
  Copy,
  Layers,
  Zap,
  Check,
  Play,
  Pause,
  AlertCircle,
  RotateCcw,
  Clock,
  ShieldCheck,
  StopCircle,
} from 'lucide-react';
import { ShortCandidate, VideoResolution, FrameRate, CaptionCustomization, BrandKit } from '../types';
import { RenderResult } from '../utils/videoRenderer';
import { recordExport } from '../utils/storage';

interface ExportModalProps {
  isOpen: boolean;
  short: ShortCandidate | null;
  captionConfig?: CaptionCustomization;
  brandKit?: BrandKit;
  onClose: () => void;
}

const DEFAULT_CAPTION_CONFIG: CaptionCustomization = {
  style: 'viral',
  fontFamily: 'Cabinet Grotesk',
  fontSize: 32,
  positionY: 75,
  primaryColor: '#facc15',
  highlightColor: '#f43f5e',
  strokeColor: '#000000',
  strokeWidth: 2,
  hasShadow: true,
  wordsPerLine: 4,
  uppercase: true,
};

const DEFAULT_BRAND_KIT: BrandKit = {
  brandName: 'ViralClip',
  logoUrl: '',
  primaryColor: '#facc15',
  accentColor: '#f43f5e',
  watermarkPosition: 'top-right',
  watermarkOpacity: 80,
  enabled: true,
};

function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  short,
  captionConfig = DEFAULT_CAPTION_CONFIG,
  brandKit = DEFAULT_BRAND_KIT,
  onClose,
}) => {
  const [resolution, setResolution] = useState<VideoResolution>('1080x1920');
  const [frameRate, setFrameRate] = useState<FrameRate>(30);
  const [qualityMode, setQualityMode] = useState<'HIGH' | 'MASTER' | 'BALANCED' | 'FAST'>('HIGH');
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderStage, setRenderStage] = useState<string>('Preparing render worker...');
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [totalDurationSec, setTotalDurationSec] = useState<number>(30);
  const [checklist, setChecklist] = useState<{
    captions: boolean;
    broll: boolean;
    sfx: boolean;
    vfx: boolean;
    audio: boolean;
  }>({
    captions: false,
    broll: false,
    sfx: false,
    vfx: false,
    audio: false,
  });

  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [sourceQuality, setSourceQuality] = useState<{
    info?: any;
    score?: any;
    loading: boolean;
  }>({ loading: false });

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Fetch source media quality diagnostics when modal opens
  useEffect(() => {
    if (!isOpen || !short) return;
    const mediaUrl = short.videoProxyUrl || short.audioUrl || '';
    if (!mediaUrl) return;

    setTotalDurationSec(Number(short.duration || (short.endTime - short.startTime) || 30));

    setSourceQuality({ loading: true });
    fetch(`/api/media/quality-analysis?path=${encodeURIComponent(mediaUrl)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSourceQuality({
            info: data.sourceInfo,
            score: data.sourceQualityScore,
            loading: false,
          });
          if (data.sourceInfo?.sourceFPS) {
            const rawFps = Math.round(data.sourceInfo.sourceFPS);
            if (rawFps >= 50) setFrameRate(60);
            else setFrameRate(30);
          }
        } else {
          setSourceQuality({ loading: false });
        }
      })
      .catch(() => setSourceQuality({ loading: false }));
  }, [isOpen, short]);

  if (!isOpen || !short) return null;

  const isLowResSource = sourceQuality.info && (sourceQuality.info.sourceWidth < 1280 || sourceQuality.info.sourceHeight < 720);

  // Poll job status until terminal state
  const startPollingJob = (jobId: string, expectedDuration: number) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const pollRes = await fetch(`/api/export/${jobId}`);
        if (!pollRes.ok) return;

        const job = await pollRes.json();
        if (!job) return;

        setRenderProgress(job.progress ?? 0);
        if (typeof job.currentTimeSec === 'number') {
          setCurrentTimeSec(job.currentTimeSec);
        }
        if (typeof job.totalDurationSec === 'number') {
          setTotalDurationSec(job.totalDurationSec);
        }

        if (job.checklist) {
          setChecklist(job.checklist);
        }

        // Map canonical stages to user-friendly messages
        if (job.stage === 'preparing') {
          setRenderStage('Preparing assets & downloading B-roll...');
        } else if (job.stage === 'building_filtergraph') {
          setRenderStage('Optimizing minimal filtergraph & Lanczos scaler...');
        } else if (job.stage === 'encoding') {
          const curTime = formatTimecode(job.currentTimeSec || 0);
          const totalTime = formatTimecode(job.totalDurationSec || expectedDuration);
          setRenderStage(`Encoding video... ${curTime} / ${totalTime}`);
        } else if (job.stage === 'verifying') {
          setRenderStage('Verifying frames, streams & forensic integrity...');
        } else if (job.status === 'completed' && job.outputUrl) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsRendering(false);
          setRenderProgress(100);
          setRenderStage('Render & export completed successfully!');

          const resObj: RenderResult = {
            blobUrl: job.outputUrl,
            fileName: job.fileName || `${short.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_9x16.mp4`,
            fileSizeMb: job.fileSizeMb || 5.2,
            durationSeconds: job.totalDurationSec || expectedDuration,
          };

          setRenderResult(resObj);

          recordExport({
            id: job.jobId || `exp_${Date.now()}`,
            shortId: short.id,
            title: short.title,
            resolution,
            fps: frameRate,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            downloadUrl: resObj.blobUrl,
          });
        } else if (job.status === 'failed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsRendering(false);
          setRenderError(job.error || 'FFmpeg render worker failed.');
        } else if (job.status === 'cancelled') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsRendering(false);
          setIsCancelling(false);
          setRenderError('Render was cancelled by user.');
        }
      } catch (err) {
        // Network flutter during polling should not terminate the render
        console.warn('[ExportModal] Polling error:', err);
      }
    }, 800);
  };

  const handleStartExport = async () => {
    setIsRendering(true);
    setIsCancelling(false);
    setRenderProgress(5);
    setRenderStage('Enqueuing render job on background worker...');
    setRenderError(null);
    setRenderResult(null);

    const dur = Number(short.duration || (short.endTime - short.startTime) || 30);
    setTotalDurationSec(dur);
    setCurrentTimeSec(0);

    try {
      const exportRes = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: short.projectId || 'proj_active',
          shortId: short.id,
          short,
          resolution,
          format: 'mp4',
          qualityMode,
          frameRate,
          brandKit,
          captionConfig,
        }),
      });

      if (!exportRes.ok) {
        const errData = await exportRes.json().catch(() => ({}));
        throw new Error(errData.error || `Export initialization failed with status ${exportRes.status}`);
      }

      const expData = await exportRes.json();
      const jobId = expData.jobId || expData.exportId;

      if (!jobId) {
        throw new Error('No job ID returned from server');
      }

      setActiveJobId(jobId);
      startPollingJob(jobId, dur);
    } catch (err: any) {
      console.error('Export enqueuing failed:', err);
      setIsRendering(false);
      setRenderError(err.message || 'Failed to initiate render. Please check media source.');
    }
  };

  const handleCancelRender = async () => {
    if (!activeJobId) return;
    setIsCancelling(true);
    setRenderStage('Terminating FFmpeg process & cleaning workspace...');

    try {
      await fetch(`/api/export/${activeJobId}/cancel`, { method: 'POST' });
    } catch (cancelErr) {
      console.error('Cancel request error:', cancelErr);
    }
  };

  const handleDownloadFile = () => {
    if (!renderResult) return;
    const anchor = document.createElement('a');
    anchor.href = renderResult.blobUrl;
    anchor.download = renderResult.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard?.writeText?.(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Export Viral Short</h2>
              <p className="text-xs text-neutral-400 truncate max-w-sm">{short.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Real Source Media Quality Diagnostics Banner */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 select-none">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-300 flex items-center gap-2">
                <Tv className="w-4 h-4 text-cyan-400" />
                Source Media Diagnostics
              </span>
              {sourceQuality.loading ? (
                <span className="text-[10px] text-neutral-400 animate-pulse">Probing streams with FFprobe...</span>
              ) : sourceQuality.score ? (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    sourceQuality.score.rating === 'POOR'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : sourceQuality.score.rating === 'FAIR'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {sourceQuality.score.overallScore}/100 • {sourceQuality.score.rating}
                </span>
              ) : null}
            </div>

            {sourceQuality.info && (
              <div className="grid grid-cols-4 gap-2 text-center text-[10px] text-neutral-400 font-mono bg-neutral-900/60 p-2 rounded-lg">
                <div>
                  <div className="text-neutral-500">RESOLUTION</div>
                  <div className="text-white font-bold">{sourceQuality.info.sourceWidth}×{sourceQuality.info.sourceHeight}</div>
                </div>
                <div>
                  <div className="text-neutral-500">FRAME RATE</div>
                  <div className="text-white font-bold">{sourceQuality.info.sourceFPS} FPS</div>
                </div>
                <div>
                  <div className="text-neutral-500">BITRATE</div>
                  <div className="text-white font-bold">{(sourceQuality.info.sourceBitrate / 1000000).toFixed(1)} Mbps</div>
                </div>
                <div>
                  <div className="text-neutral-500">COLOR SPACE</div>
                  <div className="text-white font-bold">{sourceQuality.info.sourceColorSpace?.toUpperCase() || 'BT.709'}</div>
                </div>
              </div>
            )}

            {/* Source Quality Awareness Message (Section 9) */}
            {isLowResSource && (
              <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Source quality limited: {sourceQuality.info.sourceWidth}×{sourceQuality.info.sourceHeight}</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  1080×1920 output uses high-quality Lanczos upscaling with CRF 18–20 tuning to maximize sharpness without artificial artifacts.
                </p>
              </div>
            )}
          </div>

          {/* Active Rendering Card with Live Progress (Section 7) */}
          {isRendering && (
            <div className="p-5 rounded-xl bg-neutral-950 border border-amber-500/30 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                  Rendering Viral Short
                </span>
                <span className="font-mono text-amber-400 text-sm font-bold">{renderProgress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="h-2.5 w-full bg-neutral-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${Math.max(5, renderProgress)}%` }}
                />
              </div>

              {/* Stage & Timecode Counter */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-300 font-sans truncate">{renderStage}</span>
                <span className="text-amber-300 shrink-0 ml-2">
                  {formatTimecode(currentTimeSec)} / {formatTimecode(totalDurationSec)}
                </span>
              </div>

              {/* Real Components Checklist */}
              <div className="grid grid-cols-5 gap-2 pt-2 border-t border-neutral-800/80 text-center text-[11px]">
                {[
                  { label: 'Captions', active: checklist.captions },
                  { label: 'B-roll', active: checklist.broll },
                  { label: 'SFX', active: checklist.sfx },
                  { label: 'VFX', active: checklist.vfx },
                  { label: 'Audio', active: checklist.audio },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`py-1.5 px-1 rounded-lg border flex items-center justify-center gap-1 font-semibold ${
                      item.active
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span>{item.active ? '✓' : '•'}</span>
                  </div>
                ))}
              </div>

              {/* Cancel Render Button */}
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleCancelRender}
                  disabled={isCancelling}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-rose-950/40 hover:text-rose-300 border border-neutral-700 hover:border-rose-500/40 text-xs text-neutral-300 font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <StopCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isCancelling ? 'Cancelling...' : 'Cancel Render'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Configuration Form (Only visible when not rendering) */}
          {!isRendering && !renderResult && (
            <>
              {/* Resolution Options */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Target Output Format
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: '1080x1920' as VideoResolution, label: '1080×1920', desc: '9:16 Vertical Short', icon: Smartphone },
                    { id: '2160x3840' as VideoResolution, label: '4K Ultra', desc: '9:16 Master', icon: Sparkles },
                    { id: '1080x1080' as VideoResolution, label: 'Square', desc: '1:1 Feed', icon: Square },
                    { id: '1920x1080' as VideoResolution, label: '1080p HD', desc: '16:9 Landscape', icon: Tv },
                  ].map((res) => {
                    const isSelected = resolution === res.id;
                    return (
                      <button
                        key={res.id}
                        onClick={() => setResolution(res.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400/10 border-amber-400 text-white shadow-md'
                            : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <res.icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-amber-400' : 'text-neutral-400'}`} />
                        <div className="text-xs font-bold text-white">{res.label}</div>
                        <div className="text-[10px] text-neutral-400">{res.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Frame Rate & Source-Aware Quality Modes (Section 9 & 26) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Frame Rate (FPS)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[30, 60].map((fps) => (
                      <button
                        key={fps}
                        onClick={() => setFrameRate(fps as FrameRate)}
                        className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                          frameRate === fps
                            ? 'bg-amber-400/10 border-amber-400 text-amber-300'
                            : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
                        }`}
                      >
                        {fps} FPS {fps === 60 ? '⚡ Smooth' : '(Preserve Source)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Quality Mode (CRF)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'HIGH' as const, label: 'High', desc: isLowResSource ? 'CRF 18' : 'CRF 16' },
                      { id: 'MASTER' as const, label: 'Master', desc: isLowResSource ? 'CRF 16' : 'CRF 14' },
                      { id: 'BALANCED' as const, label: 'Balanced', desc: 'CRF 19' },
                      { id: 'FAST' as const, label: 'Fast', desc: isLowResSource ? 'CRF 22' : 'CRF 23' },
                    ].map((q) => (
                      <button
                        key={q.id}
                        onClick={() => setQualityMode(q.id)}
                        className={`p-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                          qualityMode === q.id
                            ? 'bg-amber-400/10 border-amber-400 text-amber-300'
                            : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
                        }`}
                      >
                        <div>{q.label}</div>
                        <div className="text-[9px] font-mono opacity-60">{q.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Render Error Banner with Retry (Section 25 & 27) */}
          {renderError && !isRendering && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Render failed</div>
                  <div className="text-rose-200/90 text-[11px] mt-0.5">{renderError}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleStartExport}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Export</span>
                </button>
                <button
                  onClick={() => setRenderError(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Back to Settings
                </button>
              </div>
            </div>
          )}

          {/* Finished State: Verified Output & Download (Section 21) */}
          {renderResult && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">Video Render Complete & Verified!</div>
                    <div className="text-[11px] text-emerald-400/80">
                      {renderResult.fileName} • {renderResult.fileSizeMb} MB
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDownloadFile}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download MP4</span>
                </button>
              </div>

              {/* In-Modal Video Preview Player */}
              <div className="pt-2 border-t border-emerald-500/20">
                <video
                  src={renderResult.blobUrl}
                  controls
                  className="w-full max-h-56 rounded-lg bg-black object-contain mx-auto"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between gap-3">
          <button
            onClick={handleCopyShareLink}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white px-3 py-2 rounded-lg border border-neutral-800 hover:bg-neutral-800 transition-colors"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
          </button>

          {!renderResult ? (
            <button
              onClick={handleStartExport}
              disabled={isRendering}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isRendering ? 'Rendering in Background...' : 'Start Render & Export'}</span>
            </button>
          ) : (
            <button
              onClick={handleDownloadFile}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Save MP4 to Disk</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
