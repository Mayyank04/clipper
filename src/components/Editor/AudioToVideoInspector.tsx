import React, { useState } from 'react';
import {
  Wand2,
  Sparkles,
  Music,
  Sliders,
  Type,
  Layers,
  Palette,
  Eye,
  Check,
  Zap,
  Activity,
  Maximize2
} from 'lucide-react';
import {
  ShortCandidate,
  AudioToVideoConfig,
  TypingStyleId,
  VisualizerStyle,
  BackgroundType
} from '../../types';
import { AUDIO_TEMPLATES } from '../../data/audioTemplates';
import { TYPING_STYLES } from '../../utils/typingCaptionEngine';

interface AudioToVideoInspectorProps {
  short: ShortCandidate;
  config: AudioToVideoConfig;
  onChangeConfig: (newConfig: AudioToVideoConfig) => void;
  onAutoStyleWithAI?: () => void;
  isAiGenerating?: boolean;
}

export const AudioToVideoInspector: React.FC<AudioToVideoInspectorProps> = ({
  short,
  config,
  onChangeConfig,
  onAutoStyleWithAI,
  isAiGenerating = false,
}) => {
  const [subTab, setSubTab] = useState<'templates' | 'typing' | 'visualizer' | 'background'>('templates');

  const updateConfig = (patch: Partial<AudioToVideoConfig>) => {
    onChangeConfig({
      ...config,
      ...patch,
    });
  };

  const handleApplyTemplate = (templateId: string) => {
    const tmpl = AUDIO_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;
    onChangeConfig({
      ...config,
      ...tmpl.config,
    });
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800 select-none">
      {/* Header with AI Auto-Style */}
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Music className="w-3.5 h-3.5" />
            <span>Audio to Video Studio</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">Beat-synced kinetic lyric & quote generation</p>
        </div>

        {onAutoStyleWithAI && (
          <button
            onClick={onAutoStyleWithAI}
            disabled={isAiGenerating}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-neutral-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiGenerating ? 'animate-spin' : ''}`} />
            <span>{isAiGenerating ? 'Styling...' : 'AI Re-Style'}</span>
          </button>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="grid grid-cols-4 border-b border-neutral-800 bg-neutral-950/60 p-1 text-xs">
        <button
          onClick={() => setSubTab('templates')}
          className={`py-1.5 text-center font-semibold rounded-md transition-colors ${
            subTab === 'templates' ? 'bg-neutral-800 text-amber-400 shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Presets
        </button>
        <button
          onClick={() => setSubTab('typing')}
          className={`py-1.5 text-center font-semibold rounded-md transition-colors ${
            subTab === 'typing' ? 'bg-neutral-800 text-amber-400 shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Captions
        </button>
        <button
          onClick={() => setSubTab('visualizer')}
          className={`py-1.5 text-center font-semibold rounded-md transition-colors ${
            subTab === 'visualizer' ? 'bg-neutral-800 text-amber-400 shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Visualizer
        </button>
        <button
          onClick={() => setSubTab('background')}
          className={`py-1.5 text-center font-semibold rounded-md transition-colors ${
            subTab === 'background' ? 'bg-neutral-800 text-amber-400 shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Canvas BG
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar text-xs">
        {/* TAB 1: TEMPLATES */}
        {subTab === 'templates' && (
          <div className="space-y-4">
            <p className="text-neutral-400 text-[11px]">
              Select a production template to instantly configure motion typography, visualizer geometry, and ambient shader colors:
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              {AUDIO_TEMPLATES.map((tmpl) => {
                const isActive = config.typingStyle === tmpl.config.typingStyle;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => handleApplyTemplate(tmpl.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between ${
                      isActive
                        ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/5'
                        : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: tmpl.previewColor }}
                        />
                        <span className="font-bold text-white text-xs">{tmpl.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 uppercase font-mono">
                          {tmpl.category}
                        </span>
                      </div>
                      <p className="text-neutral-400 text-[11px] mt-1 leading-snug">{tmpl.description}</p>
                    </div>

                    {isActive && (
                      <div className="w-5 h-5 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center flex-shrink-0 ml-2">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: TYPING & CAPTIONS */}
        {subTab === 'typing' && (
          <div className="space-y-4">
            {/* Typing Mode */}
            <div>
              <label className="block font-bold text-neutral-300 mb-1.5">Animation Sequence Mode</label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-950 rounded-lg border border-neutral-800">
                <button
                  onClick={() => updateConfig({ typingMode: 'char_by_char' })}
                  className={`py-1.5 rounded text-center font-semibold transition-colors ${
                    config.typingMode === 'char_by_char'
                      ? 'bg-amber-400 text-neutral-950'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Typewriter
                </button>
                <button
                  onClick={() => updateConfig({ typingMode: 'word_by_word' })}
                  className={`py-1.5 rounded text-center font-semibold transition-colors ${
                    config.typingMode === 'word_by_word'
                      ? 'bg-amber-400 text-neutral-950'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Word Pop
                </button>
                <button
                  onClick={() => updateConfig({ typingMode: 'karaoke' })}
                  className={`py-1.5 rounded text-center font-semibold transition-colors ${
                    config.typingMode === 'karaoke'
                      ? 'bg-amber-400 text-neutral-950'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Karaoke
                </button>
              </div>
            </div>

            {/* Typing Styles Grid (15 styles) */}
            <div>
              <label className="block font-bold text-neutral-300 mb-2">Typography & Motion Style</label>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 custom-scrollbar">
                {Object.values(TYPING_STYLES).map((style) => {
                  const isSelected = config.typingStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      onClick={() => updateConfig({ typingStyle: style.id as TypingStyleId })}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400/10 text-white font-bold'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs truncate">{style.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                      </div>
                      <span className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">{style.fontFamily}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vertical Position */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-neutral-300">Vertical Alignment Y%</span>
                <span className="font-mono text-amber-400">{config.captionPositionY || 50}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="85"
                value={config.captionPositionY || 50}
                onChange={(e) => updateConfig({ captionPositionY: Number(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Reveal and Hold Timing */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-neutral-400">Reveal Softness</span>
                  <span className="font-mono text-neutral-300">{(config.revealDuration ?? 0.35).toFixed(2)}s</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.8"
                  step="0.05"
                  value={config.revealDuration ?? 0.35}
                  onChange={(e) => updateConfig({ revealDuration: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-neutral-400">Hold Duration</span>
                  <span className="font-mono text-neutral-300">{(config.holdDuration ?? 0.4).toFixed(2)}s</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.1"
                  value={config.holdDuration ?? 0.4}
                  onChange={(e) => updateConfig({ holdDuration: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VISUALIZER */}
        {subTab === 'visualizer' && (
          <div className="space-y-4">
            {/* Visualizer Style */}
            <div>
              <label className="block font-bold text-neutral-300 mb-1.5">Visualizer Geometry</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'bars', label: 'Audio Bars' },
                  { id: 'waveform', label: 'Waveform' },
                  { id: 'circle', label: 'Radial Ring' },
                  { id: 'spectrum', label: 'Spectrum' },
                  { id: 'pulse', label: 'Transients' },
                  { id: 'line', label: 'Laser Line' },
                ].map((v) => (
                  <button
                    key={v.id}
                    onClick={() => updateConfig({ visualizerStyle: v.id as VisualizerStyle })}
                    className={`py-2 px-1 text-center rounded-lg border font-semibold transition-all cursor-pointer ${
                      config.visualizerStyle === v.id
                        ? 'border-amber-400 bg-amber-400/15 text-amber-400'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visualizer Height */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-neutral-300">Amplitude Height</span>
                <span className="font-mono text-amber-400">{config.visualizerHeight || 120}px</span>
              </div>
              <input
                type="range"
                min="40"
                max="260"
                value={config.visualizerHeight || 120}
                onChange={(e) => updateConfig({ visualizerHeight: Number(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Visualizer Opacity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-neutral-300">Visualizer Opacity</span>
                <span className="font-mono text-amber-400">{Math.round((config.visualizerOpacity || 0.8) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={config.visualizerOpacity || 0.8}
                onChange={(e) => updateConfig({ visualizerOpacity: Number(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Visualizer Position */}
            <div>
              <label className="block font-bold text-neutral-300 mb-1.5">Anchor Position</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['bottom', 'center', 'behind_caption'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => updateConfig({ visualizerPosition: pos })}
                    className={`py-1.5 text-center rounded-lg border font-semibold transition-colors cursor-pointer capitalize ${
                      config.visualizerPosition === pos
                        ? 'border-amber-400 bg-amber-400/10 text-amber-400'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                    }`}
                  >
                    {pos.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Beat Sync Motion */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white">Beat Sync Dynamics</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.beatSyncMotion}
                  onChange={(e) => updateConfig({ beatSyncMotion: e.target.checked })}
                  className="w-4 h-4 accent-amber-400 cursor-pointer"
                />
              </div>

              {config.beatSyncMotion && (
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-neutral-400">Transient Reactivity</span>
                    <span className="font-mono text-amber-400">{Math.round((config.beatEnergy || 0.7) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.05"
                    value={config.beatEnergy || 0.7}
                    onChange={(e) => updateConfig({ beatEnergy: Number(e.target.value) })}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CANVAS BACKGROUND */}
        {subTab === 'background' && (
          <div className="space-y-4">
            {/* Background Type */}
            <div>
              <label className="block font-bold text-neutral-300 mb-1.5">Background Engine</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'animated_gradient', label: 'Color Drift Gradient' },
                  { id: 'particles', label: 'Floating Particles' },
                  { id: 'abstract_motion', label: 'Cosmic Nebula Orb' },
                  { id: 'dynamic_waveform', label: 'Audio Ray Field' },
                  { id: 'solid', label: 'Minimal Studio Black' },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => updateConfig({ backgroundType: b.id as BackgroundType })}
                    className={`p-2 rounded-lg border text-left font-semibold transition-all cursor-pointer ${
                      config.backgroundType === b.id
                        ? 'border-amber-400 bg-amber-400/10 text-amber-400'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Gradient Presets */}
            {config.backgroundType === 'animated_gradient' && (
              <div>
                <label className="block font-bold text-neutral-300 mb-2">Palette Drift</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    ['#0f172a', '#1e293b', '#020617'],
                    ['#1e1b4b', '#312e81', '#0f172a'],
                    ['#2e1065', '#3b0764', '#09090b'],
                    ['#064e3b', '#022c22', '#09090b'],
                    ['#4c0519', '#1f030a', '#09090b'],
                    ['#172554', '#082f49', '#020617'],
                    ['#292524', '#1c1917', '#0c0a09'],
                    ['#09090b', '#18181b', '#000000'],
                  ].map((grad, idx) => (
                    <button
                      key={idx}
                      onClick={() => updateConfig({ backgroundGradient: grad as [string, string, string] })}
                      className="h-9 rounded-lg border border-neutral-700 overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                      style={{
                        background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]}, ${grad[2]})`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
