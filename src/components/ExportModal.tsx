import React, { useState } from 'react';
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
  const [frameRate, setFrameRate] = useState<FrameRate>(60);
  const [quality, setQuality] = useState<'standard' | 'high' | 'ultra'>('high');
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderStage, setRenderStage] = useState<string>('Preparing video encoder...');
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [previewPlaying, setPreviewPlaying] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  if (!isOpen || !short) return null;

  const handleStartExport = async () => {
    setIsRendering(true);
    setRenderProgress(5);
    setRenderStage('Initializing render canvas...');
    setRenderError(null);
    setRenderResult(null);

    try {
      // 1. Try real server-side FFmpeg 9:16 render if projectId is available
      if (short.projectId) {
        setRenderStage('Queuing server-side FFmpeg 9:16 vertical render...');
        setRenderProgress(20);
        try {
          const exportRes = await fetch(`/api/projects/${short.projectId}/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shortId: short.id,
              short,
              resolution,
              format: 'mp4',
            }),
          });
          if (exportRes.ok) {
            const expData = await exportRes.json();
            const exportId = expData.exportId;

            if (exportId) {
              // Poll export status
              let attempts = 0;
              const maxAttempts = 30; // 15 seconds max
              while (attempts < maxAttempts) {
                attempts++;
                await new Promise((r) => setTimeout(r, 500));
                try {
                  const pollRes = await fetch(`/api/exports/${exportId}`);
                  if (pollRes.ok) {
                    const pollData = await pollRes.json();
                    const job = pollData.job;
                    if (job) {
                      setRenderProgress(Math.min(95, job.progress || 35 + attempts * 2));
                      setRenderStage(`Server FFmpeg encoding (${job.status})...`);
                      if (job.status === 'completed' && job.downloadUrl) {
                        setRenderProgress(100);
                        setRenderStage('FFmpeg render complete!');
                        const resObj = {
                          blobUrl: job.downloadUrl,
                          fileName: `${short.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_9x16.mp4`,
                          fileSizeMb: 4.8,
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
                        break;
                      }
                    }
                  }
                } catch {
                  // retry
                }
              }
            } else if (expData.downloadUrl) {
              setRenderProgress(100);
              setRenderStage('FFmpeg render complete!');
              const resObj = {
                blobUrl: expData.downloadUrl,
                fileName: expData.fileName || `${short.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_9x16.mp4`,
                fileSizeMb: expData.fileSizeMb || 4.8,
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
            }
          }
        } catch (srvErr) {
          console.warn('Server FFmpeg render skipped, falling back to client canvas encoder:', srvErr);
        }
      }

      const settings: ExportSettings = {
        resolution,
        fps: frameRate,
        format: 'mp4',
        quality,
        socialPreset: 'shorts',
        includeWatermark: brandKit.enabled,
        burnCaptions: true,
      };

      const result = await renderShortVideo(
        null,
        short,
        captionConfig,
        brandKit,
        settings,
        (progress, stage) => {
          setRenderProgress(progress);
          setRenderStage(stage);
        }
      );

      setRenderResult(result);
      setIsRendering(false);
      setRenderProgress(100);

      // Record in persistent storage
      recordExport({
        id: `exp_${Date.now()}`,
        shortId: short.id,
        title: short.title,
        resolution,
        fps: frameRate,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        downloadUrl: result.blobUrl,
      });
    } catch (err: any) {
      console.error('Export failed:', err);
      setIsRendering(false);
      setRenderProgress(0);
      setRenderError(err.message || 'Export rendering failed. Please check your media source and try again.');
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
          {/* Resolution Options */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Resolution
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: '1080x1920' as VideoResolution, label: '1080p FHD', desc: '9:16 Vertical', icon: Smartphone },
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

          {/* Frame Rate & Quality */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Frame Rate
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
                    {fps} FPS {fps === 60 ? '⚡ Smooth' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Quality Preset
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['standard', 'high', 'ultra'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`p-2 rounded-xl border text-center text-[11px] font-bold capitalize transition-all ${
                      quality === q
                        ? 'bg-amber-400/10 border-amber-400 text-amber-300'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    {q}
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
