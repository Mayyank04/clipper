import React, { useState } from 'react';
import { Palette, X, Check, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { BrandKit } from '../types';

interface BrandKitModalProps {
  isOpen: boolean;
  brandKit: BrandKit;
  onSave: (kit: BrandKit) => void;
  onApplyToProject?: (kit: BrandKit) => void;
  onClose: () => void;
}

const BRAND_TEMPLATES: {
  id: string;
  name: string;
  desc: string;
  colors: string[];
  fontFamily: string;
  highlightColor: string;
  preset: string;
}[] = [
  {
    id: 'podcast',
    name: 'Podcast Minimal',
    desc: 'Subtle clean Inter font with cyan word highlights',
    colors: ['#ffffff', '#38bdf8', '#0f172a'],
    fontFamily: 'Inter, system-ui, sans-serif',
    highlightColor: '#38bdf8',
    preset: 'podcast_clean',
  },
  {
    id: 'tech',
    name: 'Tech & Founder',
    desc: 'Space Grotesk with electric amber kinetic accent',
    colors: ['#ffffff', '#f59e0b', '#8b5cf6'],
    fontFamily: 'Space Grotesk, sans-serif',
    highlightColor: '#f59e0b',
    preset: 'hormozi_bold',
  },
  {
    id: 'viral',
    name: 'Viral High-Energy',
    desc: 'Lemon Milk bold uppercase with punch pop yellow',
    colors: ['#ffffff', '#facc15', '#ef4444'],
    fontFamily: 'Lemon Milk, Montserrat, sans-serif',
    highlightColor: '#facc15',
    preset: 'punch_pop',
  },
  {
    id: 'cinematic',
    name: 'Cinematic Story',
    desc: 'Cinzel luxury serif with gold accent',
    colors: ['#fef08a', '#d97706', '#1c1917'],
    fontFamily: 'Cinzel, serif',
    highlightColor: '#facc15',
    preset: 'cinematic_gold',
  },
  {
    id: 'desi',
    name: 'Desi Viral',
    desc: 'Noto Sans Devanagari with saffron flame highlight',
    colors: ['#ffffff', '#ff9933', '#138808'],
    fontFamily: 'Noto Sans Devanagari, sans-serif',
    highlightColor: '#ff9933',
    preset: 'desi_punch',
  },
];

const BRAND_FONTS = [
  { label: 'Lemon Milk (Viral Punch)', value: 'Lemon Milk, Montserrat, sans-serif' },
  { label: 'American Captain (Punch Condensed)', value: 'American Captain, Impact, sans-serif' },
  { label: 'Montserrat (Creator Clean)', value: 'Montserrat, system-ui, sans-serif' },
  { label: 'Inter (Podcast Crisp)', value: 'Inter, system-ui, sans-serif' },
  { label: 'Space Grotesk (Neo-Grotesque)', value: 'Space Grotesk, sans-serif' },
  { label: 'Outfit (Modern Studio)', value: 'Outfit, Inter, sans-serif' },
  { label: 'Poppins (Geometric Bold)', value: 'Poppins, sans-serif' },
  { label: 'Cinzel (Luxury Cinema)', value: 'Cinzel, serif' },
  { label: 'Noto Sans Devanagari (Hindi / Hinglish)', value: 'Noto Sans Devanagari, sans-serif' },
];

export const BrandKitModal: React.FC<BrandKitModalProps> = ({
  isOpen,
  brandKit,
  onSave,
  onApplyToProject,
  onClose,
}) => {
  const [localKit, setLocalKit] = useState<BrandKit>({
    ...brandKit,
    highlightColor: brandKit.highlightColor || '#facc15',
    strokeColor: brandKit.strokeColor || '#000000',
    fontFamily: brandKit.fontFamily || 'Lemon Milk, Montserrat, sans-serif',
    defaultPositionY: brandKit.defaultPositionY ?? 72,
    defaultPreset: brandKit.defaultPreset || 'punch_pop',
  });

  if (!isOpen) return null;

  const handleSaveAndApply = () => {
    onSave(localKit);
    if (onApplyToProject) {
      onApplyToProject(localKit);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Enable Brand Kit switch */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <div>
              <div className="text-xs font-bold text-white">Enable Brand Kit Overlays</div>
              <div className="text-[11px] text-neutral-400">Auto-inject watermark and brand styling</div>
            </div>
            <input
              type="checkbox"
              checked={localKit.enabled}
              onChange={(e) => setLocalKit({ ...localKit, enabled: e.target.checked })}
              className="w-4 h-4 accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Brand Name / Handle & Logo URL */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Creator Handle / Name</label>
              <input
                type="text"
                value={localKit.brandName}
                onChange={(e) => setLocalKit({ ...localKit, brandName: e.target.value })}
                placeholder="@YourCreatorHandle"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Brand Logo URL</label>
              <input
                type="text"
                value={localKit.logoUrl || ''}
                onChange={(e) => setLocalKit({ ...localKit, logoUrl: e.target.value })}
                placeholder="https://.../logo.png"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Brand Fonts */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300">Brand Caption Font</label>
            <select
              value={localKit.fontFamily || BRAND_FONTS[0].value}
              onChange={(e) => setLocalKit({ ...localKit, fontFamily: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {BRAND_FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Colors: Primary, Highlight, Stroke */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Primary Color</label>
              <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl p-1.5">
                <input
                  type="color"
                  value={localKit.primaryColor || '#ffffff'}
                  onChange={(e) => setLocalKit({ ...localKit, primaryColor: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="text-[11px] font-mono text-neutral-300 uppercase">{localKit.primaryColor}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Highlight Color</label>
              <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl p-1.5">
                <input
                  type="color"
                  value={localKit.highlightColor || '#facc15'}
                  onChange={(e) => setLocalKit({ ...localKit, highlightColor: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="text-[11px] font-mono text-neutral-300 uppercase">{localKit.highlightColor}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Stroke Color</label>
              <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl p-1.5">
                <input
                  type="color"
                  value={localKit.strokeColor || '#000000'}
                  onChange={(e) => setLocalKit({ ...localKit, strokeColor: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="text-[11px] font-mono text-neutral-300 uppercase">{localKit.strokeColor}</span>
              </div>
            </div>
          </div>

          {/* Default Caption Position */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300">Default Caption Position</label>
            <div className="grid grid-cols-5 gap-1.5 text-center text-xs font-bold">
              {[
                { label: 'TOP', y: 15 },
                { label: 'UPPER', y: 35 },
                { label: 'CENTER', y: 50 },
                { label: 'LOWER', y: 72 },
                { label: 'BOTTOM', y: 82 },
              ].map((pos) => (
                <button
                  key={pos.label}
                  type="button"
                  onClick={() => setLocalKit({ ...localKit, defaultPositionY: pos.y })}
                  className={`py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    localKit.defaultPositionY === pos.y
                      ? 'bg-amber-400 text-neutral-950 border-amber-400 font-black'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Watermark Position & Opacity */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-300">Watermark Position</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'top-left', label: 'Top Left' },
                { id: 'top-right', label: 'Top Right' },
                { id: 'bottom-left', label: 'Bottom Left' },
                { id: 'bottom-right', label: 'Bottom Right' },
              ].map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => setLocalKit({ ...localKit, watermarkPosition: pos.id as any })}
                  className={`py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                    localKit.watermarkPosition === pos.id
                      ? 'bg-amber-400/10 border-amber-400 text-amber-300'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Templates Quick Select */}
          <div className="space-y-2 pt-2 border-t border-neutral-800">
            <label className="text-xs font-bold text-neutral-300">Quick Archetype Templates</label>
            <div className="grid grid-cols-1 gap-2">
              {BRAND_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() =>
                    setLocalKit({
                      ...localKit,
                      primaryColor: tmpl.colors[0],
                      secondaryColor: tmpl.colors[1],
                      highlightColor: tmpl.highlightColor,
                      fontFamily: tmpl.fontFamily,
                      defaultPreset: tmpl.preset,
                    })
                  }
                  className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{tmpl.name}</div>
                    <div className="text-[10px] text-neutral-400">{tmpl.desc}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {tmpl.colors.map((c, i) => (
                      <div key={i} className="w-3.5 h-3.5 rounded-full border border-neutral-700" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between">
          <button
            onClick={() => {
              onSave(localKit);
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs cursor-pointer transition-colors"
          >
            Save Brand Kit
          </button>

          <button
            onClick={handleSaveAndApply}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-neutral-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Apply Brand Kit to Short
          </button>
        </div>
      </div>
    </div>
  );
};
