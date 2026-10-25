import React, { useState, useMemo } from 'react';
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
  Plus,
  Search,
  Replace,
  Type,
  Split,
  Merge,
  VolumeX,
  Wand2,
  Zap,
  Star,
  ChevronRight,
  ArrowRight,
  AlertCircle,
  X,
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
  onUpdateCaptions?: (captions: CaptionSegment[]) => void;
  onSplitCaption?: (captionId: string, splitTime: number) => void;
  onMergeCaptions?: (captionId: string) => void;
  onTrimChange?: (bounds: { startTime: number; endTime: number }) => void;
}

const COMMON_FILLER_WORDS = new Set([
  'um', 'uh', 'uhh', 'umm', 'like', 'you know', 'actually', 'basically', 'sort of', 'kind of', 'i mean'
]);

export const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  short,
  currentTime,
  onSeekToTime,
  onUpdateCaptionText,
  onDeleteCaption,
  onAddCaptionAtCurrentTime,
  onTranscribeCaptions,
  isTranscribing,
  onUpdateCaptions,
  onSplitCaption,
  onMergeCaptions,
  onTrimChange,
}) => {
  const [subTab, setSubTab] = useState<'dialogue' | 'autoscript' | 'cleanup'>('dialogue');
  const [viewMode, setViewMode] = useState<'word' | 'line'>('word');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');

  // Search & Replace state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [replaceQuery, setReplaceQuery] = useState<string>('');
  const [showReplaceBar, setShowReplaceBar] = useState<boolean>(false);
  const [replaceSuccessMsg, setReplaceSuccessMsg] = useState<string | null>(null);

  // Active Selected Word for Inline Editing Popover
  const [selectedWordInfo, setSelectedWordInfo] = useState<{
    captionId: string;
    wordIndex: number;
    word: string;
    start: number;
    end: number;
    emphasis?: string;
  } | null>(null);

  const captions = short.captions || [];

  // Derive canonical script sections
  const scriptSections: ScriptSection[] =
    short.scriptSections && short.scriptSections.length > 0
      ? short.scriptSections
      : short.canonicalTranscript
      ? generateAutoScriptFromTranscript(short.canonicalTranscript)
      : [];

  // Detect Fillers in current captions
  const detectedFillers = useMemo(() => {
    const list: Array<{
      captionId: string;
      wordIndex: number;
      word: string;
      start: number;
      end: number;
    }> = [];

    captions.forEach((cap) => {
      (cap.words || []).forEach((w, wIdx) => {
        const clean = (w.word || (w as any).text || '').toLowerCase().replace(/[^a-z]/g, '');
        if (COMMON_FILLER_WORDS.has(clean)) {
          list.push({
            captionId: cap.id,
            wordIndex: wIdx,
            word: w.word || (w as any).text || '',
            start: w.start,
            end: w.end,
          });
        }
      });
    });

    return list;
  }, [captions]);

  // Detect Silences > 0.4s between consecutive captions
  const detectedSilences = useMemo(() => {
    const silences: Array<{
      beforeId: string;
      afterId: string;
      gapStart: number;
      gapEnd: number;
      duration: number;
    }> = [];

    for (let i = 0; i < captions.length - 1; i++) {
      const curEnd = captions[i].end;
      const nextStart = captions[i + 1].start;
      const gap = nextStart - curEnd;
      if (gap >= 0.4) {
        silences.push({
          beforeId: captions[i].id,
          afterId: captions[i + 1].id,
          gapStart: curEnd,
          gapEnd: nextStart,
          duration: Number(gap.toFixed(2)),
        });
      }
    }
    return silences;
  }, [captions]);

  // Handle Find & Replace
  const handleReplaceAll = () => {
    if (!searchQuery.trim()) return;
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let replacedCount = 0;

    const newCaptions = captions.map((cap) => {
      if (regex.test(cap.text)) {
        const newText = cap.text.replace(regex, replaceQuery);
        replacedCount++;
        const newWords = (cap.words || []).map((w) => {
          const wStr = w.word || (w as any).text || '';
          return {
            ...w,
            word: wStr.replace(regex, replaceQuery),
            text: wStr.replace(regex, replaceQuery),
          };
        });
        return {
          ...cap,
          text: newText,
          words: newWords,
        };
      }
      return cap;
    });

    if (replacedCount > 0 && onUpdateCaptions) {
      onUpdateCaptions(newCaptions);
      setReplaceSuccessMsg(`Replaced ${replacedCount} occurrence${replacedCount > 1 ? 's' : ''}`);
      setTimeout(() => setReplaceSuccessMsg(null), 3000);
    }
  };

  // Inline word edit: Save word modifications
  const handleSaveWordEdit = (updates: Partial<WordTiming> & { emphasis?: string }) => {
    if (!selectedWordInfo) return;
    const cap = captions.find((c) => c.id === selectedWordInfo.captionId);
    if (!cap || !cap.words) return;

    const newWords = [...cap.words];
    const idx = selectedWordInfo.wordIndex;
    if (idx >= 0 && idx < newWords.length) {
      newWords[idx] = {
        ...newWords[idx],
        ...updates,
        word: updates.word !== undefined ? updates.word : newWords[idx].word,
        text: updates.word !== undefined ? updates.word : newWords[idx].text,
        start: updates.start !== undefined ? updates.start : newWords[idx].start,
        end: updates.end !== undefined ? updates.end : newWords[idx].end,
        emphasis: updates.emphasis !== undefined ? updates.emphasis : (newWords[idx] as any).emphasis,
        isHighlight: updates.emphasis === 'hero' || updates.emphasis === 'strong' ? true : updates.emphasis === 'none' ? false : (newWords[idx] as any).isHighlight,
      };

      const newText = newWords.map((w) => w.word || (w as any).text).join(' ');
      const newCaptions = captions.map((c) =>
        c.id === cap.id ? { ...c, text: newText, words: newWords } : c
      );

      if (onUpdateCaptions) {
        onUpdateCaptions(newCaptions);
      } else {
        onUpdateCaptionText(cap.id, newText);
      }
    }
    setSelectedWordInfo(null);
  };

  // Delete a single word
  const handleDeleteWord = (captionId: string, wordIndex: number) => {
    const cap = captions.find((c) => c.id === captionId);
    if (!cap || !cap.words) return;

    if (cap.words.length <= 1) {
      // If only word, delete caption
      onDeleteCaption?.(captionId);
      setSelectedWordInfo(null);
      return;
    }

    const newWords = cap.words.filter((_, i) => i !== wordIndex);
    const newText = newWords.map((w) => w.word || (w as any).text).join(' ');
    const newCaptions = captions.map((c) =>
      c.id === captionId ? { ...c, text: newText, words: newWords } : c
    );

    if (onUpdateCaptions) {
      onUpdateCaptions(newCaptions);
    }
    setSelectedWordInfo(null);
  };

  // Split line at specific word
  const handleSplitAtWord = (captionId: string, wordIndex: number) => {
    const cap = captions.find((c) => c.id === captionId);
    if (!cap || !cap.words || wordIndex <= 0 || wordIndex >= cap.words.length) return;

    const leftWords = cap.words.slice(0, wordIndex);
    const rightWords = cap.words.slice(wordIndex);

    const leftCap: CaptionSegment = {
      ...cap,
      id: `cap_${Date.now()}_1`,
      start: leftWords[0].start,
      end: leftWords[leftWords.length - 1].end,
      text: leftWords.map((w) => w.word || (w as any).text).join(' '),
      words: leftWords,
    };

    const rightCap: CaptionSegment = {
      ...cap,
      id: `cap_${Date.now()}_2`,
      start: rightWords[0].start,
      end: rightWords[rightWords.length - 1].end,
      text: rightWords.map((w) => w.word || (w as any).text).join(' '),
      words: rightWords,
    };

    const capIndex = captions.findIndex((c) => c.id === captionId);
    const newCaptions = [...captions];
    newCaptions.splice(capIndex, 1, leftCap, rightCap);

    if (onUpdateCaptions) {
      onUpdateCaptions(newCaptions);
    }
    setSelectedWordInfo(null);
  };

  // Remove All Filler Words
  const handleRemoveAllFillers = () => {
    const newCaptions = captions
      .map((cap) => {
        const remainingWords = (cap.words || []).filter((w) => {
          const clean = (w.word || (w as any).text || '').toLowerCase().replace(/[^a-z]/g, '');
          return !COMMON_FILLER_WORDS.has(clean);
        });

        if (remainingWords.length === 0) return null;

        return {
          ...cap,
          start: remainingWords[0].start,
          end: remainingWords[remainingWords.length - 1].end,
          text: remainingWords.map((w) => w.word || (w as any).text).join(' '),
          words: remainingWords,
        };
      })
      .filter((c): c is CaptionSegment => c !== null);

    if (onUpdateCaptions) {
      onUpdateCaptions(newCaptions);
      setReplaceSuccessMsg(`Removed ${detectedFillers.length} filler words!`);
      setTimeout(() => setReplaceSuccessMsg(null), 3000);
    }
  };

  // Shorten silence gap
  const handleShortenSilence = (silence: { beforeId: string; afterId: string; gapStart: number; gapEnd: number; duration: number }) => {
    const cutAmount = Math.max(0, silence.duration - 0.15);
    const afterIndex = captions.findIndex((c) => c.id === silence.afterId);
    if (afterIndex === -1) return;

    const newCaptions = captions.map((c, i) => {
      if (i >= afterIndex) {
        return {
          ...c,
          start: Math.max(0, c.start - cutAmount),
          end: Math.max(0.1, c.end - cutAmount),
          words: (c.words || []).map((w) => ({
            ...w,
            start: Math.max(0, w.start - cutAmount),
            end: Math.max(0.05, w.end - cutAmount),
          })),
        };
      }
      return c;
    });

    if (onUpdateCaptions) {
      onUpdateCaptions(newCaptions);
      setReplaceSuccessMsg(`Tightened silence gap by ${cutAmount.toFixed(2)}s`);
      setTimeout(() => setReplaceSuccessMsg(null), 3000);
    }
  };

  // Filter captions by search query
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
          <button
            onClick={() => setSubTab('cleanup')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              subTab === 'cleanup'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>AI Clean ({detectedFillers.length + detectedSilences.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {subTab === 'dialogue' && (
            <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setViewMode('word')}
                className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                  viewMode === 'word' ? 'bg-neutral-800 text-amber-300' : 'text-neutral-400 hover:text-white'
                }`}
                title="Word-level interactive mode"
              >
                Word Mode
              </button>
              <button
                onClick={() => setViewMode('line')}
                className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                  viewMode === 'line' ? 'bg-neutral-800 text-amber-300' : 'text-neutral-400 hover:text-white'
                }`}
                title="Line-level sentence mode"
              >
                Line Mode
              </button>
            </div>
          )}

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
              <span>Add</span>
            </button>
          )}
        </div>
      </div>

      {/* SUBTAB: AI CLEANUP (Filler words & Silence gaps) */}
      {subTab === 'cleanup' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Header Action Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-950/40 via-neutral-900 to-neutral-900 border border-rose-500/30 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-rose-400" />
                <span>AI Transcript Cleanup</span>
              </h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Remove filler words ("um", "like", "you know") and tightens dead air silences.
              </p>
            </div>
            {detectedFillers.length > 0 && (
              <button
                onClick={handleRemoveAllFillers}
                className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition cursor-pointer shadow-md"
              >
                Remove All ({detectedFillers.length})
              </button>
            )}
          </div>

          {/* Filler Words List */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center justify-between">
              <span>Detected Filler Words ({detectedFillers.length})</span>
            </h5>
            {detectedFillers.length === 0 ? (
              <div className="p-4 text-center text-neutral-500 text-xs bg-neutral-900/40 rounded-xl border border-neutral-800">
                ✓ No unnecessary filler words detected!
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {detectedFillers.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-neutral-900/70 border border-neutral-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">
                        "{f.word}"
                      </span>
                      <span className="text-neutral-400 text-[10px] font-mono">
                        at {formatTimeWithTenths(f.start)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onSeekToTime(f.start)}
                        className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-bold cursor-pointer"
                      >
                        Play
                      </button>
                      <button
                        onClick={() => handleDeleteWord(f.captionId, f.wordIndex)}
                        className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-[10px] font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Silence Gaps List */}
          <div className="space-y-2 pt-2 border-t border-neutral-800">
            <h5 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center justify-between">
              <span>Silence Gaps &gt; 0.4s ({detectedSilences.length})</span>
            </h5>
            {detectedSilences.length === 0 ? (
              <div className="p-4 text-center text-neutral-500 text-xs bg-neutral-900/40 rounded-xl border border-neutral-800">
                ✓ Dialogue pacing is tight without dead air.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {detectedSilences.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-neutral-900/70 border border-neutral-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-mono font-bold text-amber-300">
                        {s.duration}s dead air
                      </span>
                      <span className="text-neutral-400 text-[10px] font-mono">
                        ({formatTimeWithTenths(s.gapStart)} - {formatTimeWithTenths(s.gapEnd)})
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onSeekToTime(s.gapStart)}
                        className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-bold cursor-pointer"
                      >
                        Seek
                      </button>
                      <button
                        onClick={() => handleShortenSilence(s)}
                        className="px-2 py-0.5 rounded bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-[10px] font-bold cursor-pointer"
                      >
                        Tighten
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB: AUTO SCRIPT */}
      {subTab === 'autoscript' && (
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
      )}

      {/* SUBTAB: DIALOGUE VIEW */}
      {subTab === 'dialogue' && (
        <>
          {/* Search & Replace Header */}
          <div className="p-2.5 border-b border-neutral-800/80 bg-neutral-950 px-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find in captions..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-400/60"
                />
              </div>
              <button
                onClick={() => setShowReplaceBar(!showReplaceBar)}
                className={`p-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                  showReplaceBar
                    ? 'bg-amber-400 text-neutral-950 border-amber-400'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
                title="Toggle Find & Replace"
              >
                <Replace className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Replace Input Bar */}
            {showReplaceBar && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder="Replace with..."
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-400/60"
                />
                <button
                  onClick={handleReplaceAll}
                  disabled={!searchQuery.trim()}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-neutral-950 text-xs font-bold transition cursor-pointer"
                >
                  Replace All
                </button>
              </div>
            )}

            {replaceSuccessMsg && (
              <div className="text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-2 py-1 rounded">
                ✓ {replaceSuccessMsg}
              </div>
            )}
          </div>

          {/* Sentences List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredCaptions.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs">
                <FileText className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                <p className="font-semibold text-neutral-400 mb-1">No dialogue segments found</p>
                <p className="text-[11px]">Click "AI Auto-Captions" or "Add" to generate transcript segments.</p>
              </div>
            ) : (
              filteredCaptions.map((cap) => {
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
                            onClick={() => {
                              setEditingId(cap.id);
                              setEditText(cap.text);
                            }}
                            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Edit sentence text"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              onUpdateCaptionText(cap.id, editText.trim());
                              setEditingId(null);
                            }}
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
                            onClick={() => {
                              onUpdateCaptionText(cap.id, editText.trim());
                              setEditingId(null);
                            }}
                            className="px-2.5 py-1 rounded bg-amber-400 text-neutral-950 font-bold text-[11px] hover:bg-amber-300 cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="leading-relaxed text-xs">
                        {(cap.words && cap.words.length > 0
                          ? cap.words
                          : [{ word: cap.text, start: cap.start, end: cap.end }]
                        ).map((w, wIdx) => {
                          const isWordActive = currentTime >= w.start && currentTime <= w.end;
                          const isHero = (w as any).emphasis === 'hero' || w.isHighlight;
                          const isStrong = (w as any).emphasis === 'strong';
                          const isUnderline = (w as any).emphasis === 'underline';
                          const isMarker = (w as any).emphasis === 'marker';

                          return (
                            <span
                              key={wIdx}
                              onClick={() => {
                                onSeekToTime(w.start);
                                if (viewMode === 'word') {
                                  setSelectedWordInfo({
                                    captionId: cap.id,
                                    wordIndex: wIdx,
                                    word: w.word || (w as any).text || '',
                                    start: w.start,
                                    end: w.end,
                                    emphasis: (w as any).emphasis || (w.isHighlight ? 'hero' : 'none'),
                                  });
                                }
                              }}
                              className={`inline-block mr-1.5 px-1 py-0.5 rounded cursor-pointer transition-all ${
                                isWordActive
                                  ? 'bg-amber-400 text-neutral-950 font-black scale-105 shadow-sm'
                                  : isHero
                                  ? 'text-amber-300 font-black underline decoration-amber-400 hover:bg-neutral-800'
                                  : isStrong
                                  ? 'text-white font-bold hover:bg-neutral-800'
                                  : isMarker
                                  ? 'bg-amber-400/20 text-amber-300 hover:bg-amber-400/30'
                                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                              } ${isUnderline ? 'underline' : ''}`}
                              title={viewMode === 'word' ? 'Click to edit word timing & emphasis' : `Jump to ${formatTimeWithTenths(w.start)}`}
                            >
                              {w.word || (w as any).text}
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

      {/* INLINE WORD ACTION POPOVER MODAL */}
      {selectedWordInfo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-2xl p-4 shadow-2xl space-y-4 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-1.5">
                <Type className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Edit Word</h4>
              </div>
              <button
                onClick={() => setSelectedWordInfo(null)}
                className="text-neutral-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Word Input */}
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 uppercase font-mono">Word Text</label>
              <input
                type="text"
                value={selectedWordInfo.word}
                onChange={(e) =>
                  setSelectedWordInfo({ ...selectedWordInfo, word: e.target.value })
                }
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Timing Controls (start & end) */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase font-mono">Start Time</label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      setSelectedWordInfo({
                        ...selectedWordInfo,
                        start: Math.max(0, Number((selectedWordInfo.start - 0.05).toFixed(2))),
                      })
                    }
                    className="px-1.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] font-mono cursor-pointer"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-mono text-xs text-amber-300 bg-neutral-950 py-1 rounded border border-neutral-800">
                    {selectedWordInfo.start.toFixed(2)}s
                  </span>
                  <button
                    onClick={() =>
                      setSelectedWordInfo({
                        ...selectedWordInfo,
                        start: Math.min(selectedWordInfo.end - 0.05, Number((selectedWordInfo.start + 0.05).toFixed(2))),
                      })
                    }
                    className="px-1.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] font-mono cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase font-mono">End Time</label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      setSelectedWordInfo({
                        ...selectedWordInfo,
                        end: Math.max(selectedWordInfo.start + 0.05, Number((selectedWordInfo.end - 0.05).toFixed(2))),
                      })
                    }
                    className="px-1.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] font-mono cursor-pointer"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-mono text-xs text-amber-300 bg-neutral-950 py-1 rounded border border-neutral-800">
                    {selectedWordInfo.end.toFixed(2)}s
                  </span>
                  <button
                    onClick={() =>
                      setSelectedWordInfo({
                        ...selectedWordInfo,
                        end: Number((selectedWordInfo.end + 0.05).toFixed(2)),
                      })
                    }
                    className="px-1.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] font-mono cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Word Emphasis Selector */}
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 uppercase font-mono">Visual Emphasis</label>
              <div className="grid grid-cols-4 gap-1">
                {(['none', 'strong', 'hero', 'marker'] as const).map((emp) => (
                  <button
                    key={emp}
                    onClick={() => setSelectedWordInfo({ ...selectedWordInfo, emphasis: emp })}
                    className={`py-1 rounded text-[11px] font-bold capitalize transition cursor-pointer ${
                      selectedWordInfo.emphasis === emp
                        ? 'bg-amber-400 text-neutral-950 shadow'
                        : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                    }`}
                  >
                    {emp}
                  </button>
                ))}
              </div>
            </div>

            {/* Transcript Trimming Controls */}
            {onTrimChange && (
              <div className="space-y-1.5 pt-2 border-t border-neutral-800">
                <label className="text-[10px] text-amber-400 uppercase font-mono font-bold flex items-center gap-1">
                  <Scissors className="w-3 h-3" />
                  <span>Transcript-First Trimming</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onTrimChange({
                        startTime: short.startTime + selectedWordInfo.start,
                        endTime: short.endTime,
                      });
                      setSelectedWordInfo(null);
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-amber-400/40 text-[11px] text-amber-300 font-semibold transition cursor-pointer"
                    title="Set clip start to this word"
                  >
                    <span>Set Clip Start</span>
                  </button>
                  <button
                    onClick={() => {
                      onTrimChange({
                        startTime: short.startTime,
                        endTime: short.startTime + selectedWordInfo.end,
                      });
                      setSelectedWordInfo(null);
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-amber-400/40 text-[11px] text-amber-300 font-semibold transition cursor-pointer"
                    title="Set clip end to this word"
                  >
                    <span>Set Clip End</span>
                  </button>
                </div>
              </div>
            )}

            {/* Word Action Row: Split line at word, Delete word */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSplitAtWord(selectedWordInfo.captionId, selectedWordInfo.wordIndex)}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  title="Split this caption into two segments at this word"
                >
                  <Split className="w-3.5 h-3.5" />
                  <span>Split Line</span>
                </button>
                <button
                  onClick={() => handleDeleteWord(selectedWordInfo.captionId, selectedWordInfo.wordIndex)}
                  className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Word</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedWordInfo(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    handleSaveWordEdit({
                      word: selectedWordInfo.word,
                      start: selectedWordInfo.start,
                      end: selectedWordInfo.end,
                      emphasis: selectedWordInfo.emphasis,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-amber-400 text-neutral-950 font-bold text-xs hover:bg-amber-300 transition cursor-pointer shadow-md"
                >
                  Save Word
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
