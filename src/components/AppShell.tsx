import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  LayoutDashboard,
  FolderKanban,
  PlusCircle,
  Flame,
  Subtitles,
  Palette,
  Layers,
  Music,
  Download,
  Settings,
  Activity,
  HardDrive,
  User,
  ShieldCheck,
  ChevronRight,
  Zap,
} from 'lucide-react';

export type AppShellNavView =
  | 'dashboard'
  | 'projects'
  | 'create'
  | 'shorts'
  | 'captions'
  | 'templates'
  | 'brandkit'
  | 'assets'
  | 'audio'
  | 'exports'
  | 'settings';

interface AppShellProps {
  currentView: AppShellNavView | 'editor';
  onNavigate: (view: AppShellNavView) => void;
  onOpenNewProject: () => void;
  onOpenBrandKit: () => void;
  onOpenDiagnostics: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentView,
  onNavigate,
  onOpenNewProject,
  onOpenBrandKit,
  onOpenDiagnostics,
  children,
}) => {
  const [systemStatus, setSystemStatus] = useState<{
    whisperReady: boolean;
    ffmpegReady: boolean;
    device: string;
  }>({
    whisperReady: true,
    ffmpegReady: true,
    device: 'Apple Silicon / MPS',
  });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/system/health');
        if (res.ok) {
          const data = await res.json();
          setSystemStatus({
            whisperReady: data.whisper === 'ready',
            ffmpegReady: data.ffmpeg === 'ready',
            device: data.hardware?.deviceName || data.device || 'Local Compute Engine',
          });
        }
      } catch (err) {
        console.warn('System status check offline fallback');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects' as const, label: 'Projects', icon: FolderKanban },
    { id: 'create' as const, label: 'Create', icon: PlusCircle, isPrimary: true, action: onOpenNewProject },
    { id: 'shorts' as const, label: 'AI Shorts', icon: Flame },
    { id: 'captions' as const, label: 'Captions', icon: Subtitles },
    { id: 'templates' as const, label: 'Templates', icon: Layers },
    { id: 'brandkit' as const, label: 'Brand Kit', icon: Palette, action: onOpenBrandKit },
    { id: 'assets' as const, label: 'Assets', icon: Layers },
    { id: 'audio' as const, label: 'Audio → Video', icon: Music },
    { id: 'exports' as const, label: 'Exports', icon: Download },
    { id: 'settings' as const, label: 'Settings', icon: Settings, action: onOpenDiagnostics },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex font-sans overflow-hidden">
      {/* LEFT SIDEBAR SHELL */}
      <aside className="w-64 flex-shrink-0 bg-neutral-950 border-r border-neutral-800/80 flex flex-col justify-between select-none z-30">
        {/* Brand Header */}
        <div className="p-5 border-b border-neutral-900 flex flex-col gap-1">
          <div
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-base tracking-tight text-white">
                  ViralClip
                </span>
                <span className="font-display font-bold text-base text-amber-400">Studio</span>
              </div>
              <p className="text-[10px] text-neutral-400 tracking-wider uppercase font-semibold">
                AI Shorts Workstation
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else {
                    onNavigate(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  item.isPrimary
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/10 hover:from-amber-300 hover:to-amber-400 mb-2'
                    : isActive
                    ? 'bg-neutral-900 text-amber-400 border border-neutral-800/80 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${item.isPrimary ? 'text-neutral-950' : isActive ? 'text-amber-400' : 'text-neutral-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.isPrimary && <ChevronRight className="w-3.5 h-3.5 text-neutral-950" />}
              </button>
            );
          })}
        </div>

        {/* Bottom User & System Status Footer */}
        <div className="p-3 border-t border-neutral-900 bg-neutral-950/80 space-y-2.5">
          {/* Live System Status Pill */}
          <div
            onClick={onOpenDiagnostics}
            title="Click to view full System Engine Diagnostics"
            className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/40 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-neutral-200 group-hover:text-amber-300 transition-colors">
                  Local Whisper Ready
                </span>
              </div>
              <Activity className="w-3.5 h-3.5 text-neutral-500 group-hover:text-amber-400 transition-colors" />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-400">
              <span className="truncate max-w-[130px]">{systemStatus.device}</span>
              <span className="text-emerald-400 font-semibold font-mono">FFmpeg OK</span>
            </div>
          </div>

          {/* User Profile / Workspace */}
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-neutral-900/40 border border-neutral-800/40 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold text-xs flex-shrink-0">
                VS
              </div>
              <div className="min-w-0">
                <span className="font-bold text-white block truncate text-[11px]">Creator Studio</span>
                <span className="text-[10px] text-neutral-500 block truncate">Local Station • 1080p</span>
              </div>
            </div>
            <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
              Pro
            </span>
          </div>
        </div>
      </aside>

      {/* MAIN VIEW CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-neutral-950">
        {children}
      </div>
    </div>
  );
};
