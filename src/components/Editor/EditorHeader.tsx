import React, { useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Undo2,
  Redo2,
  Download,
  Palette,
  Settings,
  Eye,
  Edit2,
  Check,
  Activity,
  Wand2,
  CheckCircle2,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import { BrandKit } from '../../types';

export type AutosaveStatus = 'saving' | 'saved' | 'offline' | 'unsaved';

interface EditorHeaderProps {
  projectName: string;
  onRenameProject?: (newName: string) => void;
  onBack: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  autosaveStatus: AutosaveStatus;
  safeAreaEnabled: boolean;
  onToggleSafeArea: () => void;
  onOpenBrandKit: () => void;
  onOpenDiagnostics: () => void;
  onOpenAiTools: () => void;
  onExport: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  projectName,
  onRenameProject,
  onBack,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  autosaveStatus,
  safeAreaEnabled,
  onToggleSafeArea,
  onOpenBrandKit,
  onOpenDiagnostics,
  onOpenAiTools,
  onExport,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [titleInput, setTitleInput] = useState<string>(projectName);

  const handleTitleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsEditingTitle(false);
    if (titleInput.trim() && onRenameProject) {
      onRenameProject(titleInput.trim());
    }
  };

  return (
    <header className="h-14 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md px-4 flex items-center justify-between gap-4 flex-shrink-0 select-none z-30">
      {/* LEFT: Back, Logo, Project Name, Rename */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors flex-shrink-0 cursor-pointer"
          title="Back to Dashboard & Projects"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* ViralClip Studio Brand Mark */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 p-0.5 flex items-center justify-center">
            <div className="w-full h-full bg-neutral-950 rounded-[6px] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
          <span className="font-display font-extrabold text-xs tracking-tight text-white hidden sm:inline">
            ViralClip <span className="text-amber-400">Studio</span>
          </span>
        </div>

        <div className="h-4 w-px bg-neutral-800 hidden sm:block" />

        {/* Editable Project Name */}
        <div className="min-w-0 flex items-center gap-2">
          {isEditingTitle ? (
            <form onSubmit={handleTitleSubmit} className="flex items-center gap-1">
              <input
                type="text"
                autoFocus
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={() => handleTitleSubmit()}
                className="px-2 py-0.5 bg-neutral-900 border border-amber-400/50 rounded text-xs text-white focus:outline-none max-w-[200px]"
              />
              <button
                type="submit"
                className="p-1 text-emerald-400 hover:text-emerald-300"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
              <span className="text-xs font-bold text-neutral-200 truncate max-w-[180px] sm:max-w-[240px] group-hover:text-amber-300 transition-colors">
                {projectName}
              </span>
              <button
                type="button"
                className="text-neutral-500 group-hover:text-neutral-300 transition-colors p-0.5"
                title="Rename project"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CENTER: Undo, Redo, Autosave Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors cursor-pointer"
            title="Undo (Cmd/Ctrl + Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors cursor-pointer"
            title="Redo (Cmd/Ctrl + Shift + Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Autosave Status */}
        <div className="hidden md:flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 px-2 py-1 rounded-lg bg-neutral-900/60 border border-neutral-800/60">
          {autosaveStatus === 'saving' && (
            <>
              <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
              <span className="text-amber-300">Saving...</span>
            </>
          )}
          {autosaveStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-neutral-300">Saved</span>
            </>
          )}
          {autosaveStatus === 'unsaved' && (
            <>
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-neutral-400">Unsaved changes</span>
            </>
          )}
          {autosaveStatus === 'offline' && (
            <>
              <CloudOff className="w-3 h-3 text-neutral-500" />
              <span className="text-neutral-500">Offline</span>
            </>
          )}
        </div>
      </div>

      {/* RIGHT: Safe Zones, AI Tools, Brand Kit, Settings, Export */}
      <div className="flex items-center gap-2">
        {/* Safe Zones Toggle */}
        <button
          onClick={onToggleSafeArea}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
            safeAreaEnabled
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
          }`}
          title="Toggle Social Safe Zones (Shorts / Reels / TikTok)"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Safe Zones</span>
        </button>

        {/* AI Tools */}
        <button
          onClick={onOpenAiTools}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          title="Open AI Tools & Auto-Polish"
        >
          <Wand2 className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden xl:inline">AI Tools</span>
        </button>

        {/* Brand Kit */}
        <button
          onClick={onOpenBrandKit}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          title="Open Brand Kit"
        >
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden xl:inline">Brand Kit</span>
        </button>

        {/* Settings / Diagnostics */}
        <button
          onClick={onOpenDiagnostics}
          className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          title="System Diagnostics & Engine Health"
        >
          <Activity className="w-4 h-4 text-emerald-400" />
        </button>

        {/* Prominent Export Button */}
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
