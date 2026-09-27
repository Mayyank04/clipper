import React from 'react';
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Move,
  Sliders,
  Sparkles,
  Layers,
  Palette,
} from 'lucide-react';
import { CaptionCustomization } from '../../types';

interface TypographyInspectorProps {
  captionConfig: CaptionCustomization;
  onChange: (config: CaptionCustomization) => void;
}

export const TypographyInspector: React.FC<TypographyInspectorProps> = ({
  captionConfig,
  onChange,
}) => {
  const fontFamilies = [
    { label: 'Lemon Milk (Viral Standard)', value: 'Lemon Milk, American Captain, Montserrat, sans-serif' },
    { label: 'American Captain (Punch Condensed)', value: 'American Captain, Impact, sans-serif' },
    { label: 'Coolvetica (Viral Snappy)', value: 'Coolvetica, Montserrat, sans-serif' },
    { label: 'The Bold Font (Heavy Punch)', value: 'The Bold Font, Montserrat, sans-serif' },
    { label: 'Montserrat (Clean & Bold)', value: 'Montserrat, system-ui, sans-serif' },
    { label: 'Poppins (Geometric Modern)', value: 'Poppins, sans-serif' },
    { label: 'Inter (Podcast Crisp)', value: 'Inter, sans-serif' },
    { label: 'Outfit (Modern Creator)', value: 'Outfit, Inter, sans-serif' },
    { label: 'DM Sans (Clean Editorial)', value: 'DM Sans, sans-serif' },
    { label: 'Plus Jakarta Sans (Tech Founder)', value: 'Plus Jakarta Sans, sans-serif' },
    { label: 'Space Grotesk (Neo-Grotesque)', value: 'Space Grotesk, sans-serif' },
    { label: 'Manrope (Executive Minimal)', value: 'Manrope, sans-serif' },
    { label: 'Archivo Black (Industrial Bold)', value: 'Archivo Black, Impact, sans-serif' },
    { label: 'Bebas Neue (Condensed Dramatic)', value: 'Bebas Neue, sans-serif' },
    { label: 'Impact (High Contrast Classic)', value: 'Impact, Arial Black, sans-serif' },
    { label: 'Russo One (Gaming Esports)', value: 'Russo One, sans-serif' },
    { label: 'JetBrains Mono (Technical Code)', value: 'JetBrains Mono, monospace' },
    { label: 'Playfair Display (Cinema Luxury)', value: 'Playfair Display, Georgia, serif' },
    { label: 'Cinzel (Prestige Blockbuster)', value: 'Cinzel, serif' },
    { label: 'Noto Sans Devanagari (Hindi / Hinglish)', value: 'Noto Sans Devanagari, Poppins, sans-serif' },
  ];

  const positionPresets = [
    { label: 'Top', y: 18 },
    { label: 'Upper Third', y: 32 },
    { label: 'Center', y: 50 },
    { label: 'Lower Third', y: 72 },
    { label: 'Bottom', y: 84 },
  ];

  return (
    <div className="w-80 sm:w-88 flex flex-col h-full flex-shrink-0 border-l border-neutral-800 bg-neutral-900 select-none overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-950/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Typography & Style</h3>
        </div>
        <span className="text-[10px] font-mono text-neutral-500">1080x1920 Native</span>
      </div>

      {/* Controls Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-neutral-300">
        {/* Font Family */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-neutral-400">Font Family</label>
          <select
            value={captionConfig.fontFamily}
            onChange={(e) => onChange({ ...captionConfig, fontFamily: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            {fontFamilies.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size & Weight */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-[11px] font-semibold text-neutral-400">Size</label>
              <span className="font-mono text-white text-[11px]">{captionConfig.fontSize || 32}px</span>
            </div>
            <input
              type="range"
              min="20"
              max="56"
              step="1"
              value={captionConfig.fontSize || 32}
              onChange={(e) => onChange({ ...captionConfig, fontSize: Number(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-neutral-500">
              <span>Normal</span>
              <span>Emphasis</span>
              <span>Hero</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-neutral-400">Weight</label>
            <select
              value={captionConfig.fontWeight || 800}
              onChange={(e) => onChange({ ...captionConfig, fontWeight: Number(e.target.value) })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value={500}>Medium (500)</option>
              <option value={600}>Semi-Bold (600)</option>
              <option value={700}>Bold (700)</option>
              <option value={800}>Extra Bold (800)</option>
              <option value={900}>Black (900)</option>
            </select>
          </div>
        </div>

        {/* Colors: Text & Highlight */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-neutral-400 block">Text Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={captionConfig.primaryColor || '#ffffff'}
                onChange={(e) => onChange({ ...captionConfig, primaryColor: e.target.value })}
                className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer"
              />
              <span className="font-mono text-[11px] text-neutral-300 uppercase">
                {captionConfig.primaryColor || '#FFFFFF'}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-neutral-400 block">Highlight Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={captionConfig.highlightColor || '#facc15'}
                onChange={(e) => onChange({ ...captionConfig, highlightColor: e.target.value })}
                className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer"
              />
              <span className="font-mono text-[11px] text-neutral-300 uppercase">
                {captionConfig.highlightColor || '#FACC15'}
              </span>
            </div>
          </div>
        </div>

        {/* Text Stroke (Range 0 - 20) */}
        <div className="space-y-2 p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-semibold text-neutral-400">Outline Stroke Width</label>
            <span className="font-mono text-white text-[11px]">{captionConfig.strokeWidth || 4}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="12"
            step="0.5"
            value={captionConfig.strokeWidth ?? 4}
            onChange={(e) => onChange({ ...captionConfig, strokeWidth: Number(e.target.value) })}
            className="w-full accent-amber-400 cursor-pointer"
          />
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-neutral-400">Stroke Color</span>
            <input
              type="color"
              value={captionConfig.strokeColor || '#000000'}
              onChange={(e) => onChange({ ...captionConfig, strokeColor: e.target.value })}
              className="w-6 h-6 rounded border border-neutral-700 bg-transparent cursor-pointer"
            />
          </div>
        </div>

        {/* Shadow */}
        <div className="space-y-2 p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-neutral-400">Drop Shadow</label>
            <input
              type="checkbox"
              checked={captionConfig.hasShadow ?? true}
              onChange={(e) => onChange({ ...captionConfig, hasShadow: e.target.checked })}
              className="accent-amber-400 cursor-pointer"
            />
          </div>
          {captionConfig.hasShadow !== false && (
            <div className="flex items-center justify-between pt-1 text-[10px] text-neutral-400">
              <span>Deep cinematic contrast</span>
              <span className="text-emerald-400 font-bold">Enabled</span>
            </div>
          )}
        </div>

        {/* Vertical Position Presets & Custom Y Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-semibold text-neutral-400">Screen Position (Y %)</label>
            <span className="font-mono text-white text-[11px]">{captionConfig.positionY || 72}%</span>
          </div>

          <div className="grid grid-cols-5 gap-1 text-[10px] font-bold">
            {positionPresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => onChange({ ...captionConfig, positionY: preset.y })}
                className={`py-1 rounded border text-center transition-colors cursor-pointer ${
                  captionConfig.positionY === preset.y
                    ? 'bg-amber-400 text-neutral-950 border-amber-400'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                {preset.label.split(' ')[0]}
              </button>
            ))}
          </div>

          <input
            type="range"
            min="10"
            max="90"
            step="1"
            value={captionConfig.positionY || 72}
            onChange={(e) => onChange({ ...captionConfig, positionY: Number(e.target.value) })}
            className="w-full accent-amber-400 cursor-pointer"
          />
        </div>

        {/* Letter Spacing & Line Height */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-[11px] font-semibold text-neutral-400">Letter Spacing</label>
              <span className="font-mono text-white text-[11px]">{captionConfig.letterSpacing || 0}px</span>
            </div>
            <input
              type="range"
              min="-2"
              max="8"
              step="0.5"
              value={captionConfig.letterSpacing || 0}
              onChange={(e) => onChange({ ...captionConfig, letterSpacing: Number(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-[11px] font-semibold text-neutral-400">Line Height</label>
              <span className="font-mono text-white text-[11px]">{captionConfig.lineHeight || 1.3}</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.0"
              step="0.05"
              value={captionConfig.lineHeight || 1.3}
              onChange={(e) => onChange({ ...captionConfig, lineHeight: Number(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Background Box & Shape */}
        <div className="space-y-2 p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-semibold text-neutral-400">Background Shape</label>
            <div className="flex gap-1">
              {(['none', 'pill', 'box'] as const).map((shape) => (
                <button
                  key={shape}
                  onClick={() =>
                    onChange({
                      ...captionConfig,
                      backgroundShape: shape === 'none' ? undefined : shape,
                      backgroundColor: shape === 'none' ? 'transparent' : (captionConfig.backgroundColor && captionConfig.backgroundColor !== 'transparent' ? captionConfig.backgroundColor : '#000000'),
                    })
                  }
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold cursor-pointer transition ${
                    (captionConfig.backgroundShape || 'none') === shape
                      ? 'bg-amber-400 text-neutral-950'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white'
                  }`}
                >
                  {shape}
                </button>
              ))}
            </div>
          </div>

          {captionConfig.backgroundShape && captionConfig.backgroundShape !== 'none' && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800/60">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-400">Box Color</span>
                <input
                  type="color"
                  value={captionConfig.backgroundColor || '#000000'}
                  onChange={(e) => onChange({ ...captionConfig, backgroundColor: e.target.value })}
                  className="w-6 h-6 rounded border border-neutral-700 bg-transparent cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-neutral-400">Opacity</span>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={captionConfig.backgroundOpacity ?? 0.8}
                  onChange={(e) => onChange({ ...captionConfig, backgroundOpacity: Number(e.target.value) })}
                  className="w-16 accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Glow Bloom */}
        <div className="space-y-2 p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <label className="text-[11px] font-semibold text-neutral-400">Active Word Glow</label>
            </div>
            <input
              type="checkbox"
              checked={captionConfig.glowEnabled ?? false}
              onChange={(e) => onChange({ ...captionConfig, glowEnabled: e.target.checked })}
              className="accent-amber-400 cursor-pointer"
            />
          </div>
          {captionConfig.glowEnabled && (
            <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60">
              <span className="text-[10px] text-neutral-400">Glow Accent Color</span>
              <input
                type="color"
                value={captionConfig.glowColor || captionConfig.highlightColor || '#facc15'}
                onChange={(e) => onChange({ ...captionConfig, glowColor: e.target.value })}
                className="w-6 h-6 rounded border border-neutral-700 bg-transparent cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Case & Layout */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-800">
          <label className="flex items-center gap-2 cursor-pointer text-[11px] text-neutral-300">
            <input
              type="checkbox"
              checked={captionConfig.uppercase !== false}
              onChange={(e) => onChange({ ...captionConfig, uppercase: e.target.checked })}
              className="accent-amber-400 cursor-pointer"
            />
            <span>ALL CAPS</span>
          </label>

          <div className="flex items-center justify-end gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            {(['left', 'center', 'right'] as const).map((align) => (
              <button
                key={align}
                onClick={() => onChange({ ...captionConfig, alignment: align })}
                className={`p-1 rounded transition-colors ${
                  (captionConfig.alignment || 'center') === align
                    ? 'bg-neutral-800 text-amber-400'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
