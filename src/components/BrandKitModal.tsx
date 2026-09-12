import React from 'react';
import { Palette, X, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { BrandKit } from '../types';

interface BrandKitModalProps {
  isOpen: boolean;
  brandKit: BrandKit;
  onSave: (kit: BrandKit) => void;
  onClose: () => void;
}

const BRAND_TEMPLATES: { id: string; name: string; desc: string; colors: string[] }[] = [
  { id: 'podcast', name: 'Podcast Minimal', desc: 'Subtle clean white text with cyan accents', colors: ['#ffffff', '#38bdf8', '#0f172a'] },
  { id: 'tech', name: 'Tech & Startup', desc: 'Electric amber & violet high-contrast', colors: ['#ffffff', '#f59e0b', '#8b5cf6'] },
  { id: 'motivation', name: 'Motivation / Fitness', desc: 'Aggressive impact gold & crimson', colors: ['#ffffff', '#eab308', '#ef4444'] },
  { id: 'storytelling', name: 'Cinematic Storytelling', desc: 'Warm ivory & champagne gold', colors: ['#fef08a', '#d97706', '#1c1917'] },
  { id: 'educational', name: 'Educational Breakdown', desc: 'Crisp emerald & cobalt for high trust', colors: ['#ffffff', '#10b981', '#3b82f6'] },
];

export const BrandKitModal: React.FC<BrandKitModalProps> = ({
  isOpen,
  brandKit,
  onSave,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Creator Brand Kit</h2>
              <p className="text-xs text-neutral-400">Consistent visual identity across all your generated Shorts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Enable Brand Kit switch */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <div>
              <div className="text-xs font-bold text-white">Enable Brand Kit Overlays</div>
              <div className="text-[11px] text-neutral-400">Auto-inject watermark and brand styling</div>
            </div>
            <input
              type="checkbox"
              checked={brandKit.enabled}
              onChange={(e) => onSave({ ...brandKit, enabled: e.target.checked })}
              className="w-4 h-4 accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Brand Name / Handle */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300">Creator Handle or Brand Name</label>
            <input
              type="text"
              value={brandKit.brandName}
              onChange={(e) => onSave({ ...brandKit, brandName: e.target.value })}
              placeholder="@YourCreatorHandle"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Watermark Position */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-300">Watermark Position</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'top-left', label: 'Top Left' },
                { id: 'top-right', label: 'Top Right' },
                { id: 'bottom-left', label: 'Bottom Left' },
                { id: 'bottom-right', label: 'Bottom Right' },
              ].map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => onSave({ ...brandKit, watermarkPosition: pos.id as any })}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-colors ${
                    brandKit.watermarkPosition === pos.id
                      ? 'bg-amber-400/10 border-amber-400 text-amber-300'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Watermark Opacity */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-neutral-300">
              <span>Watermark Opacity</span>
              <span className="font-mono text-amber-400">{brandKit.watermarkOpacity}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={brandKit.watermarkOpacity}
              onChange={(e) => onSave({ ...brandKit, watermarkOpacity: Number(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Brand Templates */}
          <div className="space-y-2 pt-2 border-t border-neutral-800">
            <label className="text-xs font-bold text-neutral-300">Quick Archetype Templates</label>
            <div className="space-y-2">
              {BRAND_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() =>
                    onSave({
                      ...brandKit,
                      primaryColor: tmpl.colors[0],
                      secondaryColor: tmpl.colors[1],
                      accentColor: tmpl.colors[1],
                    })
                  }
                  className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{tmpl.name}</div>
                    <div className="text-[11px] text-neutral-400">{tmpl.desc}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {tmpl.colors.map((c, i) => (
                      <div key={i} className="w-4 h-4 rounded-full border border-neutral-700" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs shadow-md transition-colors"
          >
            Save Brand Kit
          </button>
        </div>
      </div>
    </div>
  );
};
