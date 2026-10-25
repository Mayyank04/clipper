import React, { useState } from 'react';
import { Sparkles, Check, X, Film, Volume2, Palette, Sliders, Play, Layers } from 'lucide-react';
import { AIEditPlan, AIEditPlanItem } from '../../utils/creatorStudio/types';

interface AIEditPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: AIEditPlan | null;
  isLoading: boolean;
  onApplyPlan: (selectedItems: AIEditPlanItem[]) => void;
}

export const AIEditPlanModal: React.FC<AIEditPlanModalProps> = ({
  isOpen,
  onClose,
  plan,
  isLoading,
  onApplyPlan,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Initialize all items as selected by default when plan changes
  React.useEffect(() => {
    if (plan?.items) {
      setSelectedIds(new Set(plan.items.map((it) => it.id)));
    }
  }, [plan]);

  if (!isOpen) return null;

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (plan?.items) setSelectedIds(new Set(plan.items.map((it) => it.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleApplyAll = () => {
    if (plan?.items) {
      onApplyPlan(plan.items);
      onClose();
    }
  };

  const handleApplySelected = () => {
    if (plan?.items) {
      const selected = plan.items.filter((it) => selectedIds.has(it.id));
      onApplyPlan(selected);
      onClose();
    }
  };

  const getCategoryIcon = (category: AIEditPlanItem['category']) => {
    switch (category) {
      case 'broll':
        return <Film className="w-4 h-4 text-emerald-400" />;
      case 'sfx':
        return <Volume2 className="w-4 h-4 text-cyan-400" />;
      case 'color':
        return <Palette className="w-4 h-4 text-amber-400" />;
      case 'vfx':
        return <Play className="w-4 h-4 text-purple-400" />;
      case 'audio_ducking':
        return <Sliders className="w-4 h-4 text-blue-400" />;
      case 'captions':
      default:
        return <Sparkles className="w-4 h-4 text-yellow-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-700/70 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <span>AI Director Edit Plan</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {plan?.estimatedQualityBoost || 'Enhanced Pacing (Heuristic)'}
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Recommended Style: <span className="text-white font-medium capitalize">{plan?.recommendedStyle?.replace('_', ' ') || 'Reference Mix'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-neutral-300">AI Director is analyzing transcript & coordinating edit beats...</p>
              <p className="text-xs text-neutral-500">Evaluating speech pacing, emotion peaks, B-roll opportunities & sound design</p>
            </div>
          ) : !plan || plan.items.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-sm">
              No new AI suggestions available for this project.
            </div>
          ) : (
            <>
              {/* Summary Banner */}
              <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 flex items-start space-x-2.5">
                <Layers className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  {plan.summary}
                </div>
              </div>

              {/* Selection Controls */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Proposed Enhancements ({selectedIds.size}/{plan.items.length} Selected)
                </span>
                <div className="flex items-center space-x-2 text-xs">
                  <button
                    onClick={selectAll}
                    className="text-neutral-400 hover:text-white hover:underline transition-colors"
                  >
                    Select All
                  </button>
                  <span className="text-neutral-600">•</span>
                  <button
                    onClick={deselectAll}
                    className="text-neutral-400 hover:text-white hover:underline transition-colors"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5">
                {plan.items.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start space-x-3.5 ${
                        isChecked
                          ? 'bg-neutral-800/80 border-indigo-500/50 shadow-sm'
                          : 'bg-neutral-900/40 border-neutral-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center transition-colors shrink-0 ${
                          isChecked
                            ? 'bg-indigo-600 text-white'
                            : 'border border-neutral-600 hover:border-neutral-400'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      {/* Icon */}
                      <div className="p-2 rounded-lg bg-neutral-800/80 border border-neutral-700/60 shrink-0">
                        {getCategoryIcon(item.category)}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between space-x-2">
                          <h4 className="text-sm font-semibold text-white truncate">{item.title}</h4>
                          <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                            {item.timestamp.toFixed(1)}s
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-900/90">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleApplySelected}
              disabled={selectedIds.size === 0 || isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Selected ({selectedIds.size})
            </button>
            <button
              onClick={handleApplyAll}
              disabled={!plan || plan.items.length === 0 || isLoading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply All ({plan?.items.length || 0})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
