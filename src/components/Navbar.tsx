import React from 'react';
import { Sparkles, Video, FolderKanban, ShieldCheck, Palette, Wand2, Compass, Film } from 'lucide-react';
import { EditingPersonality } from '../types';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: any) => void;
  onOpenNewShortModal: () => void;
  onOpenBrandKit: () => void;
  editingPersonality: EditingPersonality;
  onPersonalityChange: (mode: EditingPersonality) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenNewShortModal,
  onOpenBrandKit,
  editingPersonality,
  onPersonalityChange,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('landing')}>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-lg tracking-tight text-white">ViralClip</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30">
                Studio AI
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 hidden sm:block">YouTube to Viral 9:16 Shorts</p>
          </div>
        </div>

        {/* View Switcher / Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-neutral-900/90 border border-neutral-800 p-1 rounded-xl">
          <button
            onClick={() => onNavigate('landing')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'landing'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Overview
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'dashboard'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            Dashboard
          </button>

          <button
            onClick={() => onNavigate('project')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'project'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Project
          </button>

          <button
            onClick={() => onNavigate('editor')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'editor'
                ? 'bg-amber-400 text-neutral-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Editor
          </button>
        </nav>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2.5">
          {/* AI Editing Style Selector */}
          <div className="hidden lg:flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-lg">
            <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] text-neutral-400 font-medium">Style:</span>
            <select
              value={editingPersonality}
              onChange={(e) => onPersonalityChange(e.target.value as EditingPersonality)}
              className="bg-transparent text-xs font-semibold text-neutral-200 focus:outline-none cursor-pointer"
            >
              <option value="viral" className="bg-neutral-900 text-neutral-200">Viral (Fast & Punchy)</option>
              <option value="creator" className="bg-neutral-900 text-neutral-200">Creator (Modern Social)</option>
              <option value="cinematic" className="bg-neutral-900 text-neutral-200">Cinematic (Smooth & Moody)</option>
              <option value="clean" className="bg-neutral-900 text-neutral-200">Clean (Minimal & Crisp)</option>
            </select>
          </div>

          {/* Brand Kit Trigger */}
          <button
            onClick={onOpenBrandKit}
            title="Open Brand Kit"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-semibold transition-colors"
          >
            <Palette className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Brand Kit</span>
          </button>

          {/* Create New Short CTA */}
          <button
            onClick={onOpenNewShortModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 fill-neutral-950" />
            <span>Create Shorts</span>
          </button>
        </div>
      </div>
    </header>
  );
};
