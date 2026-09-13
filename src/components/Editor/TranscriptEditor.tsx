import React, { useState } from 'react';
import {
  FileText,
  Play,
  Scissors,
  Trash2,
  Edit2,
  Check,
  Sparkles,
  Upload,
  Clock,
  User,
  Plus
} from 'lucide-react';
import { CaptionSegment, ShortCandidate, WordTiming, ScriptSection } from '../../types';
import { formatTimeWithTenths } from '../../utils/timeFormat';
import { generateAutoScriptFromTranscript } from '../../utils/captionEngine';

interface TranscriptEditorProps {
  short: ShortCandidate;
  currentTime: number;
  onSeekToTime: (time: number) => void;
  onUpdateCaptionText: (id: string, newText: string) => void;
  onDeleteCaption?: (id: string) => void;
  onAddCaptionAtCurrentTime?: () => void;
  onTranscribeCaptions?: () => void;
  isTranscribing?: boolean;
}

export const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  short,
  currentTime,
  onSeekToTime,
  onUpdateCaptionText,
  onDeleteCaption,
  onAddCaptionAtCurrentTime,
  onTranscribeCaptions,
  isTranscribing,
}) => {
  const [subTab, setSubTab] = useState<'dialogue' | 'autoscript'>('dialogue');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const captions = short.captions || [];

  // Derive canonical script sections if not already provided
  const scriptSections: ScriptSection[] =
    short.scriptSections && short.scriptSections.length > 0
      ? short.scriptSections
      : short.canonicalTranscript
      ? generateAutoScriptFromTranscript(short.canonicalTranscript)
      : [];

  const handleStartEdit = (cap: CaptionSegment) => {
    setEditingId(cap.id);
    setEditText(cap.text);
  };

  const handleSaveEdit = (id: string) => {
    onUpdateCaptionText(id, editText.trim());
    setEditingId(null);
  };

  const filteredCaptions = searchQuery.trim()
    ? captions.filter((c) => c.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : captions;

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-200">
      {/* Top Controls Bar */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between gap-2 flex-wrap bg-neutral-900/60">
        <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-neutral-900 border border-neutral-800">
          <button
            onClick={() => setSubTab('dialogue')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              subTab === 'dialogue'
                ? 'bg-amber-400 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Dialogue ({captions.length})
          </button>
          <button
            onClick={() => setSubTab('autoscript')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              subTab === 'autoscript'
                ? 'bg-cyan-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Auto Script ({scriptSections.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onTranscribeCaptions && (
            <button
              onClick={onTranscribeCaptions}
              disabled={isTranscribing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-[11px] shadow transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isTranscribing ? 'Transcribing...' : 'AI Auto-Captions'}</span>
            </button>
          )}

          {onAddCaptionAtCurrentTime && (
            <button
              onClick={onAddCaptionAtCurrentTime}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold transition-colors cursor-pointer border border-neutral-700"
              title="Add caption at current playhead"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Add at {formatTimeWithTenths(currentTime)}</span>
            </button>
          )}
        </div>
      </div>

      {subTab === 'autoscript' ? (
        /* AUTO SCRIPT STORY STRUCTURE VIEW (Requirement 14) */
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {scriptSections.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-xs">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-neutral-600 animate-pulse" />
              <p className="font-semibold text-neutral-400 mb-1">No Auto Script structure generated yet</p>
              <p className="text-[11px] text-neutral-500 mb-3">
                Click "AI Auto-Captions" or "Auto-Transcribe" to transcribe speech and generate narrative story sections.
              </p>
            </div>
          ) : (
            scriptSections.map((sec, idx) => {
              const isCurrent = currentTime >= sec.start && currentTime <= sec.end;
              const typeColor =
                sec.type === 'hook'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : sec.type === 'context'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : sec.type === 'keypoint'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : sec.type === 'supporting'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

              return (
                <div
                  key={sec.id || idx}
                  className={`rounded-xl border transition-all p-3.5 ${
                    isCurrent
                      ? 'bg-neutral-900/90 border-cyan-500/60 ring-1 ring-cyan-500/30 shadow-lg'
                      : 'bg-neutral-900/40 border-neutral-800/80 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800/60 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase border ${typeColor}`}>
                        {sec.type}
                      </span>
                      <span className="font-bold text-white text-xs">{sec.title}</span>
                    </div>

                    <button
                      onClick={() => onSeekToTime(sec.start)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono font-bold transition-colors cursor-pointer border border-cyan-500/30 text-[11px]"
                      title="Seek video to section timestamp"
                    >
                      <Play className="w-2.5 h-2.5 fill-cyan-300" />
                      <span>{formatTimeWithTenths(sec.start)} - {formatTimeWithTenths(sec.end)}</span>
                    </button>
                  </div>

                  <p className="text-xs text-neutral-200 leading-relaxed font-sans mb-2">
                    "{sec.text}"
                  </p>

                  {sec.keyTakeaway && (
                    <div className="text-[10px] text-neutral-400 bg-neutral-950/60 px-2.5 py-1.5 rounded-lg border border-neutral-800/60 flex items-center gap-1.5">
                      <span className="text-cyan-400 font-bold">Strategy:</span>
                      <span>{sec.keyTakeaway}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* DIALOGUE VIEW */
        <>
          {/* Search Filter */}
          <div className="p-2.5 border-b border-neutral-800/80 bg-neutral-950 px-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter dialogue keywords (e.g., 'mistake', 'secret', 'results')..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-400/60"
            />
          </div>

      {/* Sentences List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredCaptions.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 text-xs">
            <FileText className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
            <p className="font-semibold text-neutral-400 mb-1">No dialogue segments found</p>
            <p className="text-[11px]">Click "AI Auto-Captions" or "Add at" to generate transcript segments.</p>
          </div>
        ) : (
          filteredCaptions.map((cap, idx) => {
            const isCurrent = currentTime >= cap.start && currentTime <= cap.end;
            const isEditing = editingId === cap.id;

            return (
              <div
                key={cap.id}
                className={`rounded-xl border transition-all p-3 ${
                  isCurrent
                    ? 'bg-neutral-900/90 border-amber-400/60 ring-1 ring-amber-400/30 shadow-lg'
                    : 'bg-neutral-900/40 border-neutral-800/80 hover:border-neutral-700'
                }`}
              >
                {/* Header: Timestamp, Speaker, Jump, Delete */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800/60 text-[11px]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSeekToTime(cap.start)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 font-mono font-bold transition-colors cursor-pointer border border-amber-400/30"
                      title="Seek preview video to this timestamp"
                    >
                      <Play className="w-2.5 h-2.5 fill-amber-300" />
                      <span>{formatTimeWithTenths(cap.start)} - {formatTimeWithTenths(cap.end)}</span>
                    </button>

                    <span className="flex items-center gap-1 text-neutral-400 font-medium">
                      <User className="w-3 h-3 text-neutral-500" />
                      {cap.speaker || 'Speaker 1'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {!isEditing ? (
                      <button
                        onClick={() => handleStartEdit(cap)}
                        className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Edit sentence text"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSaveEdit(cap.id)}
                        className="p-1 rounded text-emerald-400 hover:bg-emerald-400/20 transition-colors cursor-pointer"
                        title="Save changes"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onDeleteCaption && (
                      <button
                        onClick={() => onDeleteCaption(cap.id)}
                        className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete dialogue sentence"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sentence Content */}
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="w-full bg-neutral-950 border border-amber-400/60 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(cap.id)}
                        className="px-2.5 py-1 rounded bg-amber-400 text-neutral-950 font-bold text-[11px] hover:bg-amber-300 cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="leading-relaxed text-xs">
                    {(cap.words && cap.words.length > 0 ? cap.words : [{ word: cap.text, start: cap.start, end: cap.end }]).map((w, wIdx) => {
                      const isWordActive = currentTime >= w.start && currentTime <= w.end;
                      return (
                        <span
                          key={wIdx}
                          onClick={() => onSeekToTime(w.start)}
                          className={`inline-block mr-1.5 px-1 py-0.5 rounded cursor-pointer transition-all ${
                            isWordActive
                              ? 'bg-amber-400 text-neutral-950 font-black scale-105 shadow-sm'
                              : w.isHighlight
                              ? 'text-amber-300 font-bold hover:bg-neutral-800'
                              : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                          }`}
                          title={`Jump to ${formatTimeWithTenths(w.start)}`}
                        >
                          {w.word}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  )}
</div>
);
};
