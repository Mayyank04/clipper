import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Scissors,
  Combine,
  Sparkles,
  Trash2,
  Check,
  Clock,
  Palette,
  AlignVerticalJustifyCenter,
} from 'lucide-react';
import { CaptionSegment, CaptionStyleId, CaptionPosition } from '../../types';
import { formatTimeWithTenths } from '../../utils/timeFormat';
import { validateCaptionTiming, PRODUCTION_REFERENCE_PRESETS } from '../../utils/captionEngine';

interface FloatingCaptionEditorProps {
  caption: CaptionSegment;
  currentTime: number;
  duration: number;
  onUpdateCaption: (updated: CaptionSegment) => void;
  onSplitCaption?: (captionId: string, splitTime: number) => void;
  onMergeWithNext?: (captionId: string) => void;
  onDeleteCaption?: (captionId: string) => void;
  onRegenerateCaption?: (captionId: string) => void;
  onClose: () => void;
}

export const FloatingCaptionEditor: React.FC<FloatingCaptionEditorProps> = ({
  caption,
  currentTime,
  duration,
  onUpdateCaption,
  onSplitCaption,
  onMergeWithNext,
  onDeleteCaption,
  onRegenerateCaption,
  onClose,
}) => {
  const [text, setText] = useState<string>(caption.text || '');
  const [startTime, setStartTime] = useState<number>(caption.start);
  const [endTime, setEndTime] = useState<number>(caption.end);
  const [styleId, setStyleId] = useState<string>(caption.styleId || 'reference_mix');
  const [position, setPosition] = useState<CaptionPosition>(caption.position || 'center');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setText(caption.text || '');
    setStartTime(caption.start);
    setEndTime(caption.end);
    setStyleId(caption.styleId || 'reference_mix');
    setPosition(caption.position || 'center');
  }, [caption]);

  // Direct text edit propagation
  const handleTextChange = (newText: string) => {
    setText(newText);
    const tokens = newText.trim().split(/\s+/).filter(Boolean);
    const capDuration = Math.max(0.2, endTime - startTime);
    const tokenDur = capDuration / Math.max(1, tokens.length);

    const updatedWords = tokens.map((token, idx) => ({
      id: `w_${idx}`,
      word: token,
      text: token,
      start: Number((startTime + idx * tokenDur).toFixed(3)),
      end: Number((startTime + (idx + 1) * tokenDur).toFixed(3)),
      confidence: 0.95,
      isHighlight: caption.words?.[idx]?.isHighlight ?? false,
      highlightColor: caption.words?.[idx]?.highlightColor,
      scale: 1.0,
    }));

    const updated: CaptionSegment = {
      ...caption,
      text: newText,
      start: startTime,
      end: endTime,
      words: updatedWords,
      styleId: styleId as any,
      position,
    };

    const val = validateCaptionTiming(updated, undefined, duration);
    setValidationErrors(val.errors);
    onUpdateCaption(updated);
  };

  const handleStartChange = (newStart: number) => {
    const validStart = Math.max(0, Number(newStart.toFixed(3)));
    setStartTime(validStart);
    const updated: CaptionSegment = {
      ...caption,
      start: validStart,
      words: (caption.words || []).map((w) => ({
        ...w,
        start: Math.max(validStart, w.start),
      })),
    };
    const val = validateCaptionTiming(updated, undefined, duration);
    setValidationErrors(val.errors);
    onUpdateCaption(updated);
  };

  const handleEndChange = (newEnd: number) => {
    const validEnd = Math.min(duration, Math.max(startTime + 0.1, Number(newEnd.toFixed(3))));
    setEndTime(validEnd);
    const updated: CaptionSegment = {
      ...caption,
      end: validEnd,
      words: (caption.words || []).map((w) => ({
        ...w,
        end: Math.min(validEnd, w.end),
      })),
    };
    const val = validateCaptionTiming(updated, undefined, duration);
    setValidationErrors(val.errors);
    onUpdateCaption(updated);
  };

  const toggleWordHighlight = (wordIdx: number) => {
    const words = [...(caption.words || [])];
    if (!words[wordIdx]) return;
    const current = Boolean(words[wordIdx].isHighlight);
    words[wordIdx] = {
      ...words[wordIdx],
      isHighlight: !current,
      highlightColor: !current ? '#FACC15' : undefined,
      scale: !current ? 1.08 : 1.0,
    };
    const updated = { ...caption, words };
    onUpdateCaption(updated);
  };

  return (
    <div className="absolute z-50 bottom-24 left-1/2 transform -translate-x-1/2 w-96 max-w-[95vw] bg-neutral-900/95 backdrop-blur-md border border-cyan-500/40 rounded-xl shadow-2xl p-4 text-white animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
            Caption Editor
          </h4>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition"
          title="Close editor"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Directly Editable Text (Part 9: Click text -> edit immediately) */}
      <div className="mt-3">
        <label className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
          Spoken Text
        </label>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={2}
          className="w-full mt-1 px-3 py-2 bg-neutral-950/80 border border-neutral-700 rounded-lg text-sm font-bold text-white tracking-wide focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none uppercase"
          placeholder="ENTER CAPTION TEXT..."
        />
      </div>

      {/* Interactive Word Highlight Toggles */}
      <div className="mt-2.5">
        <label className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
          Highlights (Click to emphasize)
        </label>
        <div className="flex flex-wrap gap-1.5 mt-1 max-h-20 overflow-y-auto p-1 bg-neutral-950/40 rounded border border-neutral-800">
          {(caption.words || []).map((w, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => toggleWordHighlight(idx)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase transition ${
                w.isHighlight
                  ? 'bg-amber-400 text-neutral-950 shadow-xs ring-1 ring-amber-300'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              {w.word || (w as any).text}
            </button>
          ))}
        </div>
      </div>

      {/* Start / End Timestamp Inputs */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div>
          <label className="text-[10px] uppercase font-semibold text-neutral-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" /> Start Time
          </label>
          <div className="flex items-center mt-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1">
            <input
              type="number"
              step="0.05"
              min="0"
              max={endTime - 0.1}
              value={startTime}
              onChange={(e) => handleStartChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent text-xs font-mono text-cyan-300 focus:outline-none"
            />
            <span className="text-[9px] font-mono text-neutral-500">
              {formatTimeWithTenths(startTime)}
            </span>
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-semibold text-neutral-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" /> End Time
          </label>
          <div className="flex items-center mt-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1">
            <input
              type="number"
              step="0.05"
              min={startTime + 0.1}
              max={duration}
              value={endTime}
              onChange={(e) => handleEndChange(parseFloat(e.target.value) || duration)}
              className="w-full bg-transparent text-xs font-mono text-cyan-300 focus:outline-none"
            />
            <span className="text-[9px] font-mono text-neutral-500">
              {formatTimeWithTenths(endTime)}
            </span>
          </div>
        </div>
      </div>

      {/* Style & Position Selector */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div>
          <label className="text-[10px] uppercase font-semibold text-neutral-400 flex items-center gap-1">
            <Palette className="w-3 h-3 text-cyan-400" /> Style
          </label>
          <select
            value={styleId}
            onChange={(e) => {
              setStyleId(e.target.value);
              onUpdateCaption({ ...caption, styleId: e.target.value as any });
            }}
            className="w-full mt-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-cyan-400"
          >
            {PRODUCTION_REFERENCE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase font-semibold text-neutral-400 flex items-center gap-1">
            <AlignVerticalJustifyCenter className="w-3 h-3 text-cyan-400" /> Position
          </label>
          <select
            value={position}
            onChange={(e) => {
              const pos = e.target.value as any;
              setPosition(pos);
              onUpdateCaption({ ...caption, position: pos });
            }}
            className="w-full mt-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-cyan-400"
          >
            <option value="center">Center</option>
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
            <option value="lower_center">Lower Center</option>
          </select>
        </div>
      </div>

      {/* Validation Warning Alert */}
      {validationErrors.length > 0 && (
        <div className="mt-2 text-[10px] text-red-400 bg-red-950/60 border border-red-800 rounded p-1.5 font-mono">
          {validationErrors[0]}
        </div>
      )}

      {/* Quick Actions: [Split] [Merge] [Regenerate] [Delete] (Part 9) */}
      <div className="grid grid-cols-4 gap-1.5 mt-3.5 pt-2.5 border-t border-neutral-800">
        <button
          type="button"
          onClick={() => onSplitCaption?.(caption.id, currentTime)}
          className="flex items-center justify-center gap-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] font-bold transition"
          title="Split caption at playhead (Shortcut: S)"
        >
          <Scissors className="w-3 h-3 text-cyan-400" />
          <span>Split</span>
        </button>

        <button
          type="button"
          onClick={() => onMergeWithNext?.(caption.id)}
          className="flex items-center justify-center gap-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] font-bold transition"
          title="Merge with adjacent caption (Shortcut: M)"
        >
          <Combine className="w-3 h-3 text-emerald-400" />
          <span>Merge</span>
        </button>

        <button
          type="button"
          onClick={() => onRegenerateCaption?.(caption.id)}
          className="flex items-center justify-center gap-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] font-bold transition"
          title="Regenerate this caption region using AI"
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Fix Beat</span>
        </button>

        <button
          type="button"
          onClick={() => onDeleteCaption?.(caption.id)}
          className="flex items-center justify-center gap-1 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-900/80 rounded text-[11px] font-bold transition"
          title="Delete caption (Shortcut: Del)"
        >
          <Trash2 className="w-3 h-3 text-red-400" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
};
