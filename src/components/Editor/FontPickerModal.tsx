import React, { useState, useMemo } from 'react';
import { Search, X, Check, Sparkles, Type } from 'lucide-react';
import { CREATOR_FONTS, CreatorFont, FONT_CATEGORIES, FontCategory } from '../../data/fontRegistry';

interface FontPickerModalProps {
  isOpen: boolean;
  currentFontFamily?: string;
  onSelectFont: (font: CreatorFont) => void;
  onClose: () => void;
}

export const FontPickerModal: React.FC<FontPickerModalProps> = ({
  isOpen,
  currentFontFamily = 'Lemon Milk',
  onSelectFont,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [previewText, setPreviewText] = useState('THE BIGGEST MISTAKE');

  // Extract base family name for active comparison
  const activeBaseName = useMemo(() => {
    return (currentFontFamily || '').split(',')[0].replace(/['"]/g, '').trim().toLowerCase();
  }, [currentFontFamily]);

  const filteredFonts = useMemo(() => {
    return CREATOR_FONTS.filter((font) => {
      const matchesSearch =
        font.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        font.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
        font.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'ALL' || font.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30 text-amber-400">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide text-white flex items-center gap-2">
                Creator Typography Studio
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 font-mono">
                  {CREATOR_FONTS.length} Genuine Fonts
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Authoritative font pack imported from Google Drive with 100% Canvas &amp; FFmpeg libass parity
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Preview Text Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-6 py-3 border-b border-neutral-800 bg-neutral-900/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search fonts by name, style, or genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition"
            />
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Custom preview text..."
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value || 'THE BIGGEST MISTAKE')}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-amber-300 font-semibold focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500 pointer-events-none">
              Preview
            </span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-neutral-800/80 bg-neutral-950/40 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 ${
              selectedCategory === 'ALL'
                ? 'bg-amber-400 text-neutral-950 shadow-sm'
                : 'bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            All Fonts ({CREATOR_FONTS.length})
          </button>
          {FONT_CATEGORIES.map((cat) => {
            const count = CREATOR_FONTS.filter((f) => f.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-amber-400 text-neutral-950 shadow-sm'
                    : 'bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Font Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFonts.map((font) => {
            const isSelected = font.family.toLowerCase() === activeBaseName;

            return (
              <div
                key={font.id}
                onClick={() => {
                  onSelectFont(font);
                  onClose();
                }}
                className={`group relative p-4 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-b from-amber-500/10 to-amber-950/20 border-amber-500/80 shadow-lg shadow-amber-500/5 ring-1 ring-amber-400/40'
                    : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
                }`}
              >
                {/* Header: Title & Badges */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white group-hover:text-amber-300 transition">
                        {font.displayName}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">
                        {font.category}
                      </span>
                      <span className="text-neutral-600">•</span>
                      <span className="text-[10px] text-neutral-400">
                        Weights: {font.weights.join(', ')}
                      </span>
                    </div>
                  </div>

                  <span className="text-[9px] font-mono text-neutral-500 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded">
                    Drive Pack
                  </span>
                </div>

                {/* Live Sample Preview Text */}
                <div className="my-2 py-3 px-3 rounded-lg bg-black/40 border border-neutral-800/60 overflow-hidden text-center">
                  <span
                    className="block text-2xl md:text-3xl text-white tracking-wide uppercase transition duration-150 group-hover:text-amber-200"
                    style={{
                      fontFamily: `"${font.family}", sans-serif`,
                      textShadow: '0 2px 8px rgba(0, 0, 0, 0.85)',
                    }}
                  >
                    {previewText}
                  </span>
                </div>

                {/* Footer info & CTA */}
                <div className="flex items-center justify-between pt-2 mt-1 border-t border-neutral-800/60 text-[11px]">
                  <span className="text-neutral-500 font-mono text-[10px]">
                    {font.sourceFile || `${font.id}.otf`}
                  </span>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded text-xs font-bold transition ${
                      isSelected
                        ? 'bg-amber-400 text-neutral-950'
                        : 'bg-neutral-800 text-neutral-300 group-hover:bg-amber-400 group-hover:text-neutral-950'
                    }`}
                  >
                    {isSelected ? 'Selected' : 'Use Font'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Fonts are loaded locally from <code className="font-mono text-neutral-300">public/assets/fonts/</code> and linked directly into FFmpeg export.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
