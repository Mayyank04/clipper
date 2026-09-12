import React from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw, Film, Home } from 'lucide-react';

interface ShortUnavailableRecoveryProps {
  reason?: string;
  projectId?: string;
  shortId?: string;
  onBackToShorts: () => void;
  onReloadProject?: () => void;
  onBackToDashboard?: () => void;
}

export const ShortUnavailableRecovery: React.FC<ShortUnavailableRecoveryProps> = ({
  reason = 'This Short could not be loaded because its source project or media is missing.',
  projectId,
  shortId,
  onBackToShorts,
  onReloadProject,
  onBackToDashboard,
}) => {
  return (
    <div className="min-h-[70vh] w-full flex flex-col items-center justify-center p-6 bg-neutral-950 text-neutral-100 select-none">
      <div className="max-w-md w-full p-8 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-2xl backdrop-blur-xl text-center space-y-6 animate-fade-in">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
          <Film className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[11px] font-bold tracking-widest text-amber-400 uppercase bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
            Route Validation Notice
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-3 tracking-tight">
            SHORT UNAVAILABLE
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 mt-2 leading-relaxed font-medium">
            "{reason}"
          </p>
        </div>

        {(projectId || shortId) && (
          <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800/80 font-mono text-[11px] text-neutral-400 text-left space-y-1">
            {projectId && (
              <div>
                <span className="text-neutral-500">Project ID: </span>
                <span className="text-neutral-300 break-all">{projectId}</span>
              </div>
            )}
            {shortId && (
              <div>
                <span className="text-neutral-500">Short ID: </span>
                <span className="text-neutral-300 break-all">{shortId}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onBackToShorts}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Shorts</span>
          </button>

          {onReloadProject && (
            <button
              onClick={onReloadProject}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs border border-neutral-700 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <span>Reload Project</span>
            </button>
          )}

          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white font-semibold text-xs border border-neutral-800 transition-all cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
