import React from 'react';
import {
  Sparkles,
  Play,
  Film,
  Flame,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Trash2,
  Plus,
  Upload
} from 'lucide-react';
import { VideoProject } from '../types';

interface DashboardViewProps {
  projects: VideoProject[];
  onSelectProject: (proj: VideoProject) => void;
  onNewShortClick: () => void;
  onDeleteProject?: (id: string) => void;
  onImportVideoFile?: (file: File) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  onSelectProject,
  onNewShortClick,
  onDeleteProject,
  onImportVideoFile,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportVideoFile) {
      onImportVideoFile(file);
    }
  };

  // Aggregate stats dynamically computed from actual projects
  const allShorts = projects.flatMap((p) => p.shorts || []);
  const totalShorts = allShorts.length;
  const totalExports = projects.filter((p) => p.status === 'ready').length;
  const avgViralScore = totalShorts > 0
    ? Number((allShorts.reduce((sum, s) => sum + (s.viralScore?.overall || 0), 0) / totalShorts).toFixed(1))
    : 0;
  const avgDuration = totalShorts > 0
    ? `${Math.round(allShorts.reduce((sum, s) => sum + (s.duration || 0), 0) / totalShorts)}s`
    : '0s';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8 animate-fade-in">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.webm,.m4v"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Top Banner Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/30 border border-neutral-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
              Welcome back 👋
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Your AI editing workstation is active. Turn long videos into high-retention Shorts in seconds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-400/30 font-bold text-sm shadow transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Import Video</span>
          </button>

          <button
            onClick={onNewShortClick}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Short</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold">
            <span>Shorts Generated</span>
            <Film className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white">{totalShorts}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <TrendingUp className="w-3 h-3" />
            <span>{totalShorts > 0 ? `${totalShorts} active clips` : 'No clips created yet'}</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold">
            <span>Total Exports</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white">{totalExports}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
            <span>1080p & 4K Master MP4s</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold">
            <span>Avg Viral Score</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-3xl font-black text-amber-400">{avgViralScore > 0 ? avgViralScore : '--'} <span className="text-sm text-neutral-500 font-normal">/ 100</span></div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <span>{totalShorts > 0 ? 'Calculated from analyzed clips' : 'Awaiting clip analysis'}</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold">
            <span>Average Duration</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white">{avgDuration}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
            <span>Sweet spot for TikTok & Shorts</span>
          </div>
        </div>
      </div>

      {/* Recent Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Recent Projects</h2>
            <p className="text-xs text-neutral-400">Your processed YouTube videos and generated short batches</p>
          </div>
          <span className="text-xs text-neutral-400">{projects.length} Projects Total</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => (
            <div
              key={proj.id}
              onClick={() => onSelectProject(proj)}
              className="group cursor-pointer rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-400/50 transition-all overflow-hidden flex flex-col justify-between hover:shadow-xl hover:shadow-amber-500/10"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video bg-neutral-950 overflow-hidden">
                <img
                  src={proj.originalThumbnail}
                  alt={proj.originalTitle}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-80" />

                <div className="absolute top-3 right-3 bg-neutral-950/90 text-amber-400 text-[11px] font-bold px-2 py-0.5 rounded-lg border border-amber-400/30">
                  {proj.shorts.length} Shorts Ready
                </div>

                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-400/90 text-neutral-950 flex items-center justify-center shadow-lg">
                    <Play className="w-3.5 h-3.5 fill-neutral-950 ml-0.5" />
                  </div>
                  <span className="text-xs font-semibold text-white truncate max-w-[200px]">
                    {proj.channelName}
                  </span>
                </div>
              </div>

              {/* Card Meta */}
              <div className="p-4 space-y-3">
                <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-amber-300 transition-colors">
                  {proj.originalTitle}
                </h3>

                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                  <span>{proj.createdAt}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      Open Project <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                    {onDeleteProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(proj.id);
                        }}
                        title="Delete project"
                        className="p-1 hover:text-rose-400 text-neutral-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
