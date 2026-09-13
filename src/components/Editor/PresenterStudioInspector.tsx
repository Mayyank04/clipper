import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Video,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Layers,
  Sliders,
  Play,
  Monitor,
} from 'lucide-react';
import { ShortCandidate, PresenterEvent, AspectRatio, HeyGenAvatar } from '../../types';

interface PresenterStudioInspectorProps {
  short: ShortCandidate;
  currentTime: number;
  onUpdateShort: (updated: ShortCandidate) => void;
  onTimeSeek?: (time: number) => void;
}

export const PresenterStudioInspector: React.FC<PresenterStudioInspectorProps> = ({
  short,
  currentTime,
  onUpdateShort,
  onTimeSeek,
}) => {
  const [avatars, setAvatars] = useState<HeyGenAvatar[]>([]);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('josh_lite3_20230714');
  const [scriptText, setScriptText] = useState<string>('Welcome to this masterclass. Today we examine the core frameworks of AI production.');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [enableBrollCuts, setEnableBrollCuts] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/presenter/avatars')
      .then((res) => res.json())
      .then((data) => {
        setIsConfigured(Boolean(data.isConfigured));
        setStatusMessage(data.message || '');
        if (data.avatars && Array.isArray(data.avatars)) {
          setAvatars(data.avatars);
          if (data.avatars.length > 0) setSelectedAvatarId(data.avatars[0].avatarId);
        }
      })
      .catch((err) => console.warn('Could not load avatars:', err));
  }, []);

  const handleGeneratePresenter = async () => {
    if (!isConfigured) {
      setErrorNotice('HeyGen integration requires configuration. Configure provider credentials in server environment.');
      return;
    }

    setIsGenerating(true);
    setErrorNotice(null);
    setSuccessNotice('Dispatching presenter video generation to HeyGen...');

    try {
      const res = await fetch('/api/presenter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatarId: selectedAvatarId,
          scriptText,
          aspectRatio,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch presenter job');
      }

      setActiveJobId(data.job?.jobId);
      setSuccessNotice(`Presenter video job dispatched (ID: ${data.job?.jobId}). Polling status...`);
    } catch (err: any) {
      setErrorNotice(err.message || 'Generation failed');
      setSuccessNotice(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedAvatar = avatars.find((a) => a.avatarId === selectedAvatarId);

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800 text-neutral-200 text-xs">
      {/* HEADER */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-bold text-sm tracking-wide text-white uppercase">AI Presenter</span>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
            isConfigured
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          {isConfigured ? 'HeyGen Connected' : 'Config Required'}
        </span>
      </div>

      {/* CONFIGURATION BANNER (Section 11) */}
      {!isConfigured && (
        <div className="m-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>HeyGen Integration Requires Configuration</span>
          </div>
          <p className="text-[10px] text-amber-200/80 leading-relaxed">
            Configure <code className="text-white bg-black/40 px-1 py-0.5 rounded">HeyGen API credentials</code> in your server environment to enable live cloud video avatar generation.
          </p>
        </div>
      )}

      {/* NOTICES */}
      {successNotice && (
        <div className="m-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}
      {errorNotice && (
        <div className="m-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* BODY */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* AVATAR SELECTOR */}
        <div>
          <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
            Select Avatar
          </label>
          <div className="grid grid-cols-2 gap-2">
            {avatars.map((av) => (
              <div
                key={av.avatarId}
                onClick={() => setSelectedAvatarId(av.avatarId)}
                className={`p-2 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center ${
                  selectedAvatarId === av.avatarId
                    ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <img
                  src={av.previewImageUrl}
                  alt={av.avatarName}
                  className="w-14 h-14 rounded-full object-cover mb-1.5 border border-neutral-700"
                />
                <span className="font-bold text-[11px] line-clamp-1">{av.avatarName}</span>
                <span className="text-[9px] text-neutral-500">{av.category}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SCRIPT INPUT */}
        <div>
          <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
            Presenter Speech Script
          </label>
          <textarea
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            rows={3}
            className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-white text-xs outline-none focus:border-cyan-400 resize-none"
            placeholder="Enter words for avatar to speak..."
          />
        </div>

        {/* EDITORIAL OPTIONS (Section 13: Presenter + B-Roll) */}
        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
            AI Director Editorial Mode
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[11px] font-semibold text-white">Cut to B-Roll on Key Concepts</div>
              <div className="text-[10px] text-neutral-400">
                Presenter opens hook, cuts to contextual B-roll, returns to conclusion
              </div>
            </div>
            <input
              type="checkbox"
              checked={enableBrollCuts}
              onChange={(e) => setEnableBrollCuts(e.target.checked)}
              className="accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-neutral-800">
            <span className="text-[11px] text-neutral-400">Target Aspect Ratio</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setAspectRatio('9:16')}
                className={`px-2 py-1 rounded text-[10px] font-bold ${
                  aspectRatio === '9:16' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-neutral-900 text-neutral-400'
                }`}
              >
                9:16 Vertical
              </button>
              <button
                onClick={() => setAspectRatio('16:9')}
                className={`px-2 py-1 rounded text-[10px] font-bold ${
                  aspectRatio === '16:9' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-neutral-900 text-neutral-400'
                }`}
              >
                16:9 Landscape
              </button>
            </div>
          </div>
        </div>

        {/* GENERATE BUTTON */}
        <button
          onClick={handleGeneratePresenter}
          disabled={isGenerating || !isConfigured}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 transition-all cursor-pointer"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Generating Presenter Video...</span>
            </>
          ) : (
            <>
              <Video className="w-4 h-4" />
              <span>Generate AI Presenter Video</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
