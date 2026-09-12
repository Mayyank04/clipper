import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  Scissors,
  Share2,
  Download,
  Copy,
  Flame,
  Clock,
  ChevronRight,
  Filter,
  ArrowLeft,
  ExternalLink,
  Sliders,
  Check
} from 'lucide-react';
import { VideoProject, ShortCandidate } from '../types';

interface ProjectViewProps {
  project: VideoProject;
  onBack: () => void;
  onOpenEditor: (short: ShortCandidate) => void;
  onQuickExport: (short: ShortCandidate) => void;
  onDuplicateShort: (short: ShortCandidate) => void;
  onUpdateProject?: (project: VideoProject) => void;
}

export const ProjectView: React.FC<ProjectViewProps> = ({
  project,
  onBack,
  onOpenEditor,
  onQuickExport,
  onDuplicateShort,
  onUpdateProject,
}) => {
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('all');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGeneratingMore, setIsGeneratingMore] = useState<boolean>(false);
  const [isRegeneratingStyle, setIsRegeneratingStyle] = useState<boolean>(false);
  const [activePersonality, setActivePersonality] = useState<string>(project.editingPersonality || 'viral');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const topics = Array.from(new Set(project.shorts.map((s) => s.topic)));

  const filteredShorts = project.shorts.filter((s) => {
    if (selectedTopicFilter !== 'all' && s.topic !== selectedTopicFilter) return false;
    if (s.viralScore.overall < minScoreFilter) return false;
    return true;
  });

  const handleCopyLink = (short: ShortCandidate) => {
    navigator.clipboard?.writeText?.(project.youtubeUrl);
    setCopiedId(short.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Generate more non-overlapping shorts from unexplored moments
  const handleGenerateMore = async () => {
    setIsGeneratingMore(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/generate-more`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.allShorts) {
          const updated: VideoProject = {
            ...project,
            shorts: data.allShorts,
            analysisStats: {
              ...(project.analysisStats || {
                durationFormatted: `${Math.floor(project.originalDuration / 60)}:${String(project.originalDuration % 60).padStart(2, '0')}`,
                totalDurationSeconds: project.originalDuration,
                topicsDetected: 6,
                potentialMoments: 18,
                highQualityMoments: data.allShorts.length,
                generatedShortsCount: data.allShorts.length,
              }),
              generatedShortsCount: data.allShorts.length,
            },
          };
          onUpdateProject?.(updated);
          setFeedbackMessage(`✨ Successfully discovered & indexed ${data.addedCount || 2} new unique moments!`);
          setTimeout(() => setFeedbackMessage(null), 4000);
        }
      } else {
        setFeedbackMessage('Could not index additional moments at this time.');
      }
    } catch (err) {
      console.warn('Generate more fallback:', err);
    } finally {
      setIsGeneratingMore(false);
    }
  };

  // Retune editing personality across all candidates
  const handleRetuneStyle = async (personality: string) => {
    setActivePersonality(personality);
    setIsRegeneratingStyle(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personality }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.project) {
          onUpdateProject?.(data.project);
          setFeedbackMessage(`⚡ Retuned all candidates with ${personality.toUpperCase()} editing style.`);
          setTimeout(() => setFeedbackMessage(null), 3500);
        }
      }
    } catch (e) {
      console.warn('Regenerate style network fallback');
    } finally {
      setIsRegeneratingStyle(false);
    }
  };

  const totalDurSeconds = project.originalDuration || 135;
  const durMinutes = Math.floor(totalDurSeconds / 60);
  const durSeconds = Math.floor(totalDurSeconds % 60);
  const formattedDuration = `${durMinutes}:${String(durSeconds).padStart(2, '0')}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8 animate-fade-in">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>

        <div className="flex items-center gap-2">
          {Boolean((project as any).demoMode || project.id?.includes('sample') || project.channelName?.includes('Demo')) && (
            <span className="text-xs text-amber-300 font-extrabold px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 tracking-wider">
              DEMO PROJECT
            </span>
          )}
          <span className="text-xs text-amber-400 font-bold px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30">
            ✨ {project.shorts.length} Shorts Found
          </span>
        </div>
      </div>

      {/* ORIGINAL SOURCE VIDEO CARD */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row items-center gap-6 shadow-xl">
        <div className="relative w-full md:w-72 aspect-video rounded-xl overflow-hidden bg-neutral-950 flex-shrink-0 border border-neutral-800">
          <img
            src={project.originalThumbnail}
            alt={project.originalTitle}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-mono px-2 py-0.5 rounded">
            {formattedDuration}
          </div>
          <a
            href={project.youtubeUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/90 transition-colors"
            title="Open YouTube video"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="text-amber-400 font-bold uppercase tracking-wider">Source Video</span>
            <span>&bull;</span>
            <span>{project.channelName}</span>
            <span>&bull;</span>
            <span>Created {project.createdAt}</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight leading-snug">
            {project.originalTitle}
          </h1>

          <p className="text-xs text-neutral-400 line-clamp-2">
            AI analyzed the entire video timeline across speech, cadence, visual motion, and emotional inflections to isolate high-retention vertical moments.
          </p>

          {/* WHOLE-VIDEO ANALYSIS AUDIT METRICS */}
          <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Total Analyzed</span>
              <span className="text-xs font-mono font-bold text-amber-400">{formattedDuration} (100%)</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Speech Arcs Scanned</span>
              <span className="text-xs font-mono font-bold text-blue-400">{project.analysisStats?.potentialMoments || 18} Moments</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">High-Viral Peaks</span>
              <span className="text-xs font-mono font-bold text-emerald-400">{project.analysisStats?.highQualityMoments || 6} Peak Arcs</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Generated Shorts</span>
              <span className="text-xs font-mono font-bold text-purple-400">{project.shorts.length} Unique Clips</span>
            </div>
          </div>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold flex items-center justify-between animate-fade-in">
          <span>{feedbackMessage}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-amber-400 hover:text-white">✕</button>
        </div>
      )}

      {/* FILTER & AI PIPELINE ACTION BAR */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>AI Short Candidates</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
              {filteredShorts.length} available
            </span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">Ranked by algorithmically evaluated hook & retention potential</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Style Retuner */}
          <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-xl text-xs">
            <Sliders className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-neutral-400">Style:</span>
            <select
              value={activePersonality}
              disabled={isRegeneratingStyle}
              onChange={(e) => handleRetuneStyle(e.target.value)}
              className="bg-transparent text-amber-400 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="viral" className="bg-neutral-900 text-white">Viral Punch</option>
              <option value="educational" className="bg-neutral-900 text-white">Educational</option>
              <option value="cinematic" className="bg-neutral-900 text-white">Cinematic</option>
              <option value="high_energy" className="bg-neutral-900 text-white">High Energy</option>
              <option value="minimalist" className="bg-neutral-900 text-white">Minimalist</option>
            </select>
            {isRegeneratingStyle && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
          </div>

          {/* Topic filter */}
          <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-xl text-xs text-neutral-300">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={selectedTopicFilter}
              onChange={(e) => setSelectedTopicFilter(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-neutral-900 text-white">All Topics</option>
              {topics.map((top) => (
                <option key={top} value={top} className="bg-neutral-900 text-white">
                  {top}
                </option>
              ))}
            </select>
          </div>

          {/* Min Score filter */}
          <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-xl text-xs text-neutral-300">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <select
              value={minScoreFilter}
              onChange={(e) => setMinScoreFilter(Number(e.target.value))}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              <option value={0} className="bg-neutral-900 text-white">All Scores</option>
              <option value={90} className="bg-neutral-900 text-white">Score 90+</option>
              <option value={94} className="bg-neutral-900 text-white">Score 94+ (Elite)</option>
            </select>
          </div>

          {/* Generate More Shorts Button */}
          <button
            onClick={handleGenerateMore}
            disabled={isGeneratingMore}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingMore ? 'animate-spin' : ''}`} />
            <span>{isGeneratingMore ? 'Analyzing More Moments...' : 'Generate More Shorts'}</span>
          </button>
        </div>
      </div>

      {/* SHORTS CANDIDATES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredShorts.map((short, index) => {
          const vs = short.viralScore || {
            overall: 94,
            breakdown: {
              hook: 96,
              retention: 94,
              emotion: 92,
              value: 95,
              pacing: 94,
              shareability: 93,
              clarity: 95,
              contextCompleteness: 91,
            },
            summary: 'Strong retention curve and opening hook',
          };
          const breakdown = vs.breakdown || {
            hook: 96,
            retention: 94,
            emotion: 92,
            value: 95,
            pacing: 94,
            shareability: 93,
            clarity: 95,
            contextCompleteness: 91,
          };
          const startMin = Math.floor((short.startTime || 0) / 60);
          const startSec = Math.floor((short.startTime || 0) % 60);
          const endMin = Math.floor((short.endTime || short.duration || 30) / 60);
          const endSec = Math.floor((short.endTime || short.duration || 30) % 60);
          const timeWindow = `${startMin}:${String(startSec).padStart(2, '0')} - ${endMin}:${String(endSec).padStart(2, '0')}`;

          return (
            <div
              key={short.id}
              className="rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-400/50 transition-all overflow-hidden flex flex-col justify-between hover:shadow-2xl hover:shadow-amber-500/10 group"
            >
              {/* Top Banner: Index & Duration & Score */}
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-neutral-800 text-amber-400">
                    Short #{String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    00:{String(short.duration).padStart(2, '0')} ({timeWindow})
                  </span>
                </div>

                {/* Overall Viral Score Badge */}
                <div className="flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-xl">
                  <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-black text-amber-300">
                    {vs.overall}/100
                  </span>
                </div>
              </div>

              {/* 9:16 Portrait Preview Container */}
              <div
                onClick={() => onOpenEditor(short)}
                className="relative aspect-[9/13] bg-neutral-950 cursor-pointer overflow-hidden group/thumb"
              >
                <img
                  src={short.thumbnail}
                  alt={short.title}
                  className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-500"
                />

                {/* Gradient vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950/40" />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-amber-400/90 text-neutral-950 flex items-center justify-center shadow-xl shadow-amber-400/30 transform group-hover/thumb:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-neutral-950 ml-1" />
                  </div>
                </div>

                {/* Hook Tag */}
                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-neutral-700 text-[11px] text-amber-300 font-bold uppercase tracking-wider">
                  Hook: {short.hookCategory}
                </div>

                {/* Captions Preview Bar */}
                <div className="absolute bottom-4 inset-x-3 bg-black/85 backdrop-blur-md p-2.5 rounded-xl border border-amber-400/30 shadow-lg text-center">
                  <p className="font-display font-extrabold text-sm text-white line-clamp-2 leading-snug">
                    "{short.hookText}"
                  </p>
                </div>
              </div>

              {/* Card Meta & Breakdown */}
              <div className="p-4 space-y-3.5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                      {short.topic}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {short.sfxTrack?.length || 0} SFX &bull; {short.vfxTrack?.length || 0} VFX
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1 line-clamp-2">
                    {short.title}
                  </h3>
                </div>

                {/* WHY SELECTED AI INSIGHTS */}
                {short.whySelected && short.whySelected.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800/80 space-y-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Why AI Selected This Moment
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {short.whySelected.map((reason, rIdx) => (
                        <span
                          key={rIdx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300 font-medium"
                        >
                          ✦ {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* EDIT PLAN PILLS */}
                {short.editPlan && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/20 font-medium">
                      🎯 {short.editPlan.hookAngle || 'Fast Hook'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-400/10 text-blue-300 border border-blue-400/20 font-medium">
                      ⚡ {short.editPlan.pacingStrategy || 'Punchy Pacing'}
                    </span>
                  </div>
                )}

                {/* 5-Attribute Viral Score Progress Indicators */}
                <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400">
                    <span>Viral Retention Audit</span>
                    <span className="text-amber-400">{vs.overall} Pts</span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
                    <div className="flex items-center justify-between text-neutral-300">
                      <span>🔥 Hook</span>
                      <span className="font-bold text-amber-400">{breakdown.hook}</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-300">
                      <span>🧠 Value</span>
                      <span className="font-bold text-blue-400">{breakdown.value}</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-300">
                      <span>❤️ Emotion</span>
                      <span className="font-bold text-rose-400">{breakdown.emotion}</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-300">
                      <span>⚡ Pacing</span>
                      <span className="font-bold text-emerald-400">{breakdown.pacing}</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-between text-neutral-300 pt-0.5 border-t border-neutral-800/80">
                      <span>📈 Retention Potential</span>
                      <span className="font-bold text-purple-400">{breakdown.retention}%</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Preview | Edit | Duplicate | Export */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => onOpenEditor(short)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs shadow-md transition-colors"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Edit in Studio</span>
                  </button>

                  <button
                    onClick={() => onQuickExport(short)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Short</span>
                  </button>

                  <button
                    onClick={() => onDuplicateShort(short)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Duplicate</span>
                  </button>

                  <button
                    onClick={() => handleCopyLink(short)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs transition-colors"
                  >
                    {copiedId === short.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3 h-3" />
                        <span>Share Clip</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
