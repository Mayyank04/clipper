import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { ShortCandidate, ExportSettings, VideoResolution, FrameRate, CaptionCustomization, BrandKit } from '../types';
import { renderShortVideo, RenderResult } from '../utils/videoRenderer';
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
  brandName: '@ViralMaster',
  primaryColor: '#facc15',
  accentColor: '#f43f5e',
  watermarkPosition: 'top-right',
  watermarkOpacity: 80,
  enabled: true,
};

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
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderStage, setRenderStage] = useState<string>('Preparing video encoder...');
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [previewPlaying, setPreviewPlaying] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [sourceQuality, setSourceQuality] = useState<{
    info?: any;
    score?: any;
    loading: boolean;
  }>({ loading: false });

  // Fetch source media quality diagnostics when modal opens
  useEffect(() => {
    if (!isOpen || !short) return;
    const mediaUrl = short.videoProxyUrl || short.audioUrl || '';
    if (!mediaUrl) return;

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

  const handleStartExport = async () => {
    setIsRendering(true);
    setRenderProgress(10);
    setRenderStage('Initializing server-side Lanczos 9:16 render pipeline...');
    setRenderError(null);
    setRenderResult(null);

    try {
      const projectId = short.projectId || 'proj_active';
      const exportRes = await fetch(`/api/projects/${projectId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortId: short.id,
          short,
          resolution,
          format: 'mp4',
          qualityMode,
          brandKit,
          captionConfig,
        }),
      });

      if (!exportRes.ok) {
        const errData = await exportRes.json().catch(() => ({}));
        throw new Error(errData.error || `Export initialization failed with status ${exportRes.status}`);
      }

      const expData = await exportRes.json();
      const exportId = expData.exportId;

      if (!exportId) {
        throw new Error('No export job ID received from server');
      }

      // Poll export status until completion
      let attempts = 0;
      const maxAttempts = 60; // 30 seconds max
      let completed = false;

      while (attempts < maxAttempts && !completed) {
        attempts++;
        await new Promise((r) => setTimeout(r, 500));
        try {
          const pollRes = await fetch(`/api/exports/${exportId}`);
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            const job = pollData.job;
            if (job) {
              setRenderProgress(Math.min(98, job.progress || 20 + attempts * 2));
              setRenderStage(
                job.progress < 50
                  ? 'Probing streams & calculating smart 9:16 crop...'
                  : job.progress < 85
                  ? `Lanczos scaling & CRF ${job.renderProfile?.crf || 16} H.264 encode...`
                  : 'Burning kinetic subtitles & mixing audio tracks...'
              );

              if (job.status === 'completed' && job.downloadUrl) {
                completed = true;
                setRenderProgress(100);
                setRenderStage('Export completed successfully!');
                const resObj: RenderResult = {
                  blobUrl: job.downloadUrl,
                  fileName: job.fileName || `${short.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_9x16.mp4`,
                  fileSizeMb: job.fileSizeMb || 5.2,
                  durationSeconds: short.duration || 30,
                };
                setRenderResult(resObj);
                setIsRendering(false);

                recordExport({
                  id: `exp_${Date.now()}`,
                  shortId: short.id,
                  title: short.title,
                  resolution,
                  fps: frameRate,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  downloadUrl: resObj.blobUrl,
                });
                return;
              } else if (job.status === 'failed') {
                throw new Error(job.error || 'Server FFmpeg export failed');
              }
            }
          }
        } catch (pollErr: any) {
          if (completed) return;
          if (pollErr.message && !pollErr.message.includes('fetch')) {
            throw pollErr;
          }
        }
      }

      if (!completed) {
        throw new Error('Export render timed out on server. Please try again.');
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      setIsRendering(false);
      setRenderProgress(0);
      setRenderError(err.message || 'Export rendering failed. Please verify media source and try again.');
      setRenderResult(null);
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
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Real Source Media Quality Diagnostics Banner */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 select-none">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-300 flex items-center gap-2">
                <Tv className="w-4 h-4 text-cyan-400" />
                Source Media Quality Analysis
              </span>
              {sourceQuality.loading ? (
                <span className="text-[10px] text-neutral-400 animate-pulse">Probing streams...</span>
              ) : sourceQuality.score ? (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  sourceQuality.score.rating === 'POOR'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : sourceQuality.score.rating === 'FAIR'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
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

            {sourceQuality.score?.warningMessage && (
              <div className="flex items-center gap-2 text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{sourceQuality.score.warningMessage}</span>
              </div>
            )}
          </div>

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
                    className={`p-3 rounded-xl border text-left transition-all ${
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

          {/* Frame Rate & Production Quality Modes */}
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
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                      frameRate === fps
                        ? 'bg-amber-400/10 border-amber-400 text-amber-300'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    {fps} FPS {fps === 60 ? '⚡ Smooth' : '(Source)'}
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
                  { id: 'HIGH' as const, label: 'High', desc: 'CRF 16' },
                  { id: 'MASTER' as const, label: 'Master', desc: 'CRF 14' },
                  { id: 'BALANCED' as const, label: 'Balanced', desc: 'CRF 19' },
                  { id: 'FAST' as const, label: 'Fast', desc: 'CRF 23' },
                ].map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setQualityMode(q.id)}
                    className={`p-2 rounded-xl border text-center text-xs font-bold transition-all ${
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

          {/* Rendering Progress Indicator */}
          {isRendering && (
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  {renderStage}
                </span>
                <span className="font-mono text-amber-400 font-bold">{renderProgress}%</span>
              </div>
              <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
                  style={{ width: `${renderProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-neutral-400">Encoding vertical 9:16 frame buffers, kinetic captions & SFX</p>
            </div>
          )}

          {/* Error notice */}
          {renderError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{renderError}</span>
            </div>
          )}

          {/* Finished State: Real Download & Preview */}
          {renderResult && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">Video Render Complete!</div>
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
                  className="w-full max-h-48 rounded-lg bg-black object-contain mx-auto"
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
              <span>{isRendering ? 'Rendering Video...' : 'Start Render & Export'}</span>
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
