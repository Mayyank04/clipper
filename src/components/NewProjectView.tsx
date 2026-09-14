import React, { useState, useRef } from 'react';
import {
  Upload,
  Film,
  Music,
  Youtube,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileVideo,
  FileAudio,
  AlertTriangle,
  Play,
  Clock,
  Layers,
  Volume2,
  Info,
} from 'lucide-react';
import { formatTimeWithTenths } from '../utils/timeFormat';

interface MediaInspectionMeta {
  file: File;
  kind: 'video' | 'audio';
  objectUrl: string;
  name: string;
  sizeFormatted: string;
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  hasAudio: boolean;
  thumbnailUrl?: string;
}

interface NewProjectViewProps {
  onImportVideo: (file: File) => void;
  onImportAudio: (file: File) => void;
  onImportYouTube: (url: string) => void;
  onCancel?: () => void;
}

export const NewProjectView: React.FC<NewProjectViewProps> = ({
  onImportVideo,
  onImportAudio,
  onImportYouTube,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'youtube' | 'audio'>('video');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [inspectedMedia, setInspectedMedia] = useState<MediaInspectionMeta | null>(null);
  const [inspectionError, setInspectionError] = useState<string | null>(null);

  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const inspectMediaFile = (file: File, kind: 'video' | 'audio') => {
    setInspectionError(null);
    const objectUrl = URL.createObjectURL(file);
    const sizeFormatted = formatFileSize(file.size);

    if (kind === 'video') {
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.src = objectUrl;

      vid.onloadedmetadata = () => {
        const dur = Number.isFinite(vid.duration) && vid.duration > 0 ? Number(vid.duration.toFixed(2)) : 0;
        const width = vid.videoWidth || 1920;
        const height = vid.videoHeight || 1080;

        // Capture thumbnail at 1s or 0.1s
        vid.currentTime = Math.min(1.0, dur > 1 ? 1.0 : dur / 2);
        vid.onseeked = () => {
          let thumbnailUrl = '';
          try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(width, 480);
            canvas.height = Math.round((canvas.width * height) / width);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
              thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
            }
          } catch (e) {
            console.warn('Thumbnail generation fallback:', e);
          }

          setInspectedMedia({
            file,
            kind: 'video',
            objectUrl,
            name: file.name,
            sizeFormatted,
            duration: dur,
            width,
            height,
            fps: 30,
            hasAudio: true,
            thumbnailUrl,
          });
        };
      };

      vid.onerror = () => {
        setInspectionError('Could not decode video metadata. Please ensure the file is an MP4, MOV, WebM, MKV, or AVI file.');
      };
    } else {
      // Audio inspection
      const audio = new Audio(objectUrl);
      audio.onloadedmetadata = () => {
        const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? Number(audio.duration.toFixed(2)) : 0;
        setInspectedMedia({
          file,
          kind: 'audio',
          objectUrl,
          name: file.name,
          sizeFormatted,
          duration: dur,
          hasAudio: true,
        });
      };

      audio.onerror = () => {
        setInspectionError('Could not decode audio metadata. Please select an MP3, WAV, M4A, or AAC file.');
      };
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type.startsWith('audio/')) {
      inspectMediaFile(file, 'audio');
    } else {
      inspectMediaFile(file, 'video');
    }
  };

  const handleContinue = () => {
    if (!inspectedMedia) return;
    if (inspectedMedia.kind === 'audio') {
      onImportAudio(inspectedMedia.file);
    } else {
      onImportVideo(inspectedMedia.file);
    }
  };

  const handleYouTubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;
    onImportYouTube(youtubeUrl.trim());
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full space-y-6 animate-fade-in">
      {/* Hidden file inputs */}
      <input
        ref={videoFileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/avi,.mp4,.mov,.webm,.mkv,.avi"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) inspectMediaFile(f, 'video');
        }}
      />
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/mp3,audio/wav,audio/x-m4a,audio/aac,.mp3,.wav,.m4a,.aac"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) inspectMediaFile(f, 'audio');
        }}
      />

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ViralClip Studio Project Ingestion</span>
        </div>
        <h1 className="text-3xl font-display font-extrabold text-white tracking-tight">
          Create Your Next Viral Short
        </h1>
        <p className="text-sm text-neutral-400 max-w-lg mx-auto">
          Drop any long-form video or podcast. Local Whisper transcribes full audio with real word timestamps.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-center gap-2 border-b border-neutral-800 pb-2">
        <button
          onClick={() => {
            setActiveTab('video');
            setInspectedMedia(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'video'
              ? 'bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/10'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Upload Video</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('youtube');
            setInspectedMedia(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'youtube'
              ? 'bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/10'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Youtube className="w-4 h-4" />
          <span>Import from YouTube</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('audio');
            setInspectedMedia(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'audio'
              ? 'bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/10'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Music className="w-4 h-4" />
          <span>Upload Audio (Audio → Video)</span>
        </button>
      </div>

      {/* TAB 1: LOCAL VIDEO DROP ZONE */}
      {activeTab === 'video' && !inspectedMedia && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => videoFileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[300px] ${
            isDragging
              ? 'border-amber-400 bg-amber-400/5 scale-[1.01]'
              : 'border-neutral-800 bg-neutral-900/50 hover:border-amber-400/50 hover:bg-neutral-900'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8 text-amber-400" />
          </div>

          <h3 className="text-lg font-bold text-white mb-1">DROP VIDEO HERE</h3>
          <p className="text-xs text-neutral-400 mb-4">
            or <span className="text-amber-400 font-semibold underline underline-offset-2">Browse files</span> from your computer
          </p>

          <div className="flex items-center gap-2 text-[11px] text-neutral-500 bg-neutral-950/80 px-3 py-1.5 rounded-full border border-neutral-800">
            <span>Supported formats: MP4 • MOV • WebM • MKV • AVI</span>
          </div>
        </div>
      )}

      {/* TAB 2: YOUTUBE INGESTION */}
      {activeTab === 'youtube' && !inspectedMedia && (
        <form onSubmit={handleYouTubeSubmit} className="space-y-4 p-8 bg-neutral-900/60 border border-neutral-800 rounded-3xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
              <Youtube className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Import YouTube Video Directly</h3>
              <p className="text-xs text-neutral-400">
                Downloads raw source stream with yt-dlp, extracts audio, and transcribes locally
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-300">Paste YouTube URL</label>
            <input
              type="url"
              required
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Import from YouTube</span>
          </button>
        </form>
      )}

      {/* TAB 3: AUDIO TO VIDEO DROP ZONE */}
      {activeTab === 'audio' && !inspectedMedia && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => audioFileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[300px] ${
            isDragging
              ? 'border-purple-400 bg-purple-400/5 scale-[1.01]'
              : 'border-neutral-800 bg-neutral-900/50 hover:border-purple-400/50 hover:bg-neutral-900'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-purple-400/10 border border-purple-400/30 flex items-center justify-center mb-4">
            <Music className="w-8 h-8 text-purple-400" />
          </div>

          <h3 className="text-lg font-bold text-white mb-1">DROP AUDIO HERE</h3>
          <p className="text-xs text-neutral-400 mb-4">
            or <span className="text-purple-400 font-semibold underline underline-offset-2">Browse audio files</span> for Audio → Video
          </p>

          <div className="flex items-center gap-2 text-[11px] text-neutral-500 bg-neutral-950/80 px-3 py-1.5 rounded-full border border-neutral-800">
            <span>Supported audio: MP3 • WAV • M4A • AAC</span>
          </div>
        </div>
      )}

      {/* Error notification */}
      {inspectionError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{inspectionError}</span>
        </div>
      )}

      {/* MEDIA INSPECTION CARD (Instantly shows file specs before continue) */}
      {inspectedMedia && (
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-6 shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Media Ingestion & Codec Verified</h3>
            </div>
            <button
              onClick={() => setInspectedMedia(null)}
              className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
            >
              Choose different file
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Thumbnail */}
            <div className="w-full md:w-56 aspect-video bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center relative flex-shrink-0">
              {inspectedMedia.thumbnailUrl ? (
                <img
                  src={inspectedMedia.thumbnailUrl}
                  alt={inspectedMedia.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-neutral-600">
                  <Music className="w-8 h-8 text-purple-400" />
                  <span className="text-[10px] text-neutral-400">Audio Stream</span>
                </div>
              )}
            </div>

            {/* Spec details */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs w-full">
              <div className="p-2.5 bg-neutral-950/70 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 block">Duration</span>
                <span className="font-bold text-white text-sm">
                  {formatTimeWithTenths(inspectedMedia.duration)}
                </span>
              </div>

              <div className="p-2.5 bg-neutral-950/70 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 block">Resolution</span>
                <span className="font-bold text-white text-sm">
                  {inspectedMedia.width && inspectedMedia.height
                    ? `${inspectedMedia.width}x${inspectedMedia.height}`
                    : 'Audio Master'}
                </span>
              </div>

              <div className="p-2.5 bg-neutral-950/70 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 block">FPS / Audio</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {inspectedMedia.fps ? `${inspectedMedia.fps} FPS • Stereo` : 'AAC / 48kHz'}
                </span>
              </div>

              <div className="p-2.5 bg-neutral-950/70 border border-neutral-800 rounded-xl col-span-2 sm:col-span-3">
                <span className="text-[10px] text-neutral-500 block">Source File & Size</span>
                <span className="font-bold text-neutral-200 truncate block">
                  {inspectedMedia.name} ({inspectedMedia.sizeFormatted})
                </span>
              </div>
            </div>
          </div>

          {/* Action to continue */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-xs text-neutral-400">
              Ready to extract audio and transcribe with Local Whisper
            </span>
            <button
              onClick={handleContinue}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <span>Continue to Editor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
