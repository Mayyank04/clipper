import React, { useState, useEffect } from 'react';
import {
  Mic,
  Volume2,
  Play,
  Pause,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Globe,
  RefreshCw,
  Sliders,
  CheckCircle2,
  FileAudio,
  Languages,
} from 'lucide-react';
import { ShortCandidate, VoicePreset, VoiceoverEvent, ScriptSection } from '../../types';

interface VoiceStudioInspectorProps {
  short: ShortCandidate;
  currentTime: number;
  onUpdateShort: (updated: ShortCandidate) => void;
  onTimeSeek?: (time: number) => void;
}

export const VoiceStudioInspector: React.FC<VoiceStudioInspectorProps> = ({
  short,
  currentTime,
  onUpdateShort,
  onTimeSeek,
}) => {
  const [subTab, setSubTab] = useState<'tts' | 'clone' | 'script_vo' | 'dubbing'>('tts');
  const [voices, setVoices] = useState<VoicePreset[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('sys_samantha');
  const [speechText, setSpeechText] = useState<string>('Welcome to ViralClip Studio AI production editor.');
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [emotion, setEmotion] = useState<string>('natural');
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Clone Voice State
  const [cloneVoiceName, setCloneVoiceName] = useState<string>('My Custom Voice');
  const [cloneRefAsset, setCloneRefAsset] = useState<string>(short?.videoProxyUrl || '');
  const [cloneConsent, setCloneConsent] = useState<boolean>(false);
  const [isCloning, setIsCloning] = useState<boolean>(false);

  // Script Voiceover State
  const [isGeneratingVO, setIsGeneratingVO] = useState<boolean>(false);
  const [voWarnings, setVoWarnings] = useState<string[]>([]);

  // Dubbing State
  const [targetDubLanguage, setTargetDubLanguage] = useState<string>('Hindi');
  const [isDubbing, setIsDubbing] = useState<boolean>(false);
  const [dubResults, setDubResults] = useState<{ original: string; translated: string; start: number; end: number }[]>([]);

  // Audio preview element reference
  const [audioElem] = useState<HTMLAudioElement>(new Audio());

  useEffect(() => {
    // Load available voices from server
    fetch('/api/voice/voices')
      .then((res) => res.json())
      .then((data) => {
        if (data.voices && Array.isArray(data.voices)) {
          setVoices(data.voices);
          if (data.voices.length > 0) setSelectedVoiceId(data.voices[0].id);
        }
      })
      .catch((err) => console.warn('Could not load voices:', err));

    audioElem.onended = () => setIsPlayingPreview(false);
    return () => {
      audioElem.pause();
    };
  }, [audioElem]);

  // Handle TTS Synthesis
  const handleSynthesize = async () => {
    if (!speechText.trim()) return;
    setIsSynthesizing(true);
    setErrorNotice(null);
    setStatusNotice('Synthesizing speech with high-fidelity engine...');

    try {
      const res = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: speechText,
          voiceId: selectedVoiceId,
          speed: speechSpeed,
          emotion,
          provider: selectedVoiceId.startsWith('ov_') ? 'omnivoice' : 'system',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Speech synthesis failed');
      }

      setPreviewAudioUrl(data.audioUrl);
      setAudioDuration(data.duration);
      audioElem.src = data.audioUrl;
      setStatusNotice(`Synthesized ${data.duration.toFixed(2)}s audio successfully!`);
    } catch (err: any) {
      setErrorNotice(err.message || 'Synthesis failed');
      setStatusNotice(null);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Toggle Audio Preview
  const handleTogglePreview = () => {
    if (!previewAudioUrl) return;
    if (isPlayingPreview) {
      audioElem.pause();
      setIsPlayingPreview(false);
    } else {
      audioElem.play();
      setIsPlayingPreview(true);
    }
  };

  // Add Synthesized Audio to Timeline as Voiceover Event
  const handleAddToTimeline = () => {
    if (!previewAudioUrl) return;
    const newVO: VoiceoverEvent = {
      id: `vo_custom_${Date.now()}`,
      start: currentTime,
      end: currentTime + audioDuration,
      duration: audioDuration,
      text: speechText,
      sectionType: 'context',
      audioUrl: previewAudioUrl,
      voiceId: selectedVoiceId,
      volume: 1.0,
    };

    const updatedEvents = [...(short.voiceoverEvents || []), newVO];
    const updatedShort: ShortCandidate = {
      ...short,
      voiceoverEvents: updatedEvents,
      renderPlan: {
        ...(short.renderPlan || {
          projectId: short.projectId,
          shortId: short.id,
          duration: short.duration,
          brollEvents: [],
          captions: short.captions || [],
          sfxMarkers: short.sfxMarkers || [],
          audioTrack: { originalVolume: 1.0, brollDuckingDb: 6 },
        }),
        voiceoverEvents: updatedEvents,
      },
    };

    onUpdateShort(updatedShort);
    setStatusNotice(`Added voiceover to timeline at ${currentTime.toFixed(1)}s!`);
  };

  // Clone Voice
  const handleCloneVoice = async () => {
    if (!cloneConsent) {
      setErrorNotice('Authorization confirmation is required to clone voice.');
      return;
    }
    setIsCloning(true);
    setErrorNotice(null);
    try {
      const res = await fetch('/api/voice/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceName: cloneVoiceName,
          referenceAudioPath: cloneRefAsset,
          language: 'en',
          consentConfirmed: cloneConsent,
          provider: 'system',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Voice cloning failed');
      setStatusNotice(`Voice profile '${cloneVoiceName}' created successfully!`);
    } catch (err: any) {
      setErrorNotice(err.message || 'Voice cloning failed');
    } finally {
      setIsCloning(false);
    }
  };

  // Generate Voiceover for all Auto Script sections
  const handleGenerateScriptVO = async () => {
    const sections = short.scriptSections || [];
    if (sections.length === 0) {
      setErrorNotice('No Auto Script sections available. Transcribe speech first.');
      return;
    }

    setIsGeneratingVO(true);
    setErrorNotice(null);
    setVoWarnings([]);

    try {
      const res = await fetch('/api/voice/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptSections: sections,
          voiceId: selectedVoiceId,
          speed: speechSpeed,
          provider: selectedVoiceId.startsWith('ov_') ? 'omnivoice' : 'system',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Voiceover generation failed');

      if (data.warnings && data.warnings.length > 0) {
        setVoWarnings(data.warnings);
      }

      const updatedShort: ShortCandidate = {
        ...short,
        voiceoverEvents: data.voiceoverEvents,
        renderPlan: {
          ...(short.renderPlan || {
            projectId: short.projectId,
            shortId: short.id,
            duration: short.duration,
            brollEvents: [],
            captions: short.captions || [],
            sfxMarkers: short.sfxMarkers || [],
            audioTrack: { originalVolume: 1.0, brollDuckingDb: 6 },
          }),
          voiceoverEvents: data.voiceoverEvents,
        },
      };

      onUpdateShort(updatedShort);
      setStatusNotice(`Generated voiceover tracks for ${data.voiceoverEvents?.length} script sections!`);
    } catch (err: any) {
      setErrorNotice(err.message || 'Script voiceover generation failed');
    } finally {
      setIsGeneratingVO(false);
    }
  };

  // AI Multilingual Dubbing
  const handleGenerateDubbing = async () => {
    if (!short.canonicalTranscript && (!short.captions || short.captions.length === 0)) {
      setErrorNotice('Canonical transcript required for dubbing. Transcribe speech first.');
      return;
    }

    setIsDubbing(true);
    setErrorNotice(null);

    try {
      const transcriptPayload = short.canonicalTranscript || {
        language: 'English',
        languageConfidence: 0.95,
        duration: short.duration,
        segments: (short.captions || []).map((c) => ({
          id: c.id,
          text: c.text,
          start: c.start,
          end: c.end,
          words: c.words || [],
        })),
        words: [],
      };

      const res = await fetch('/api/voice/dub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptPayload,
          targetLanguage: targetDubLanguage,
          voiceId: selectedVoiceId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Dubbing failed');

      setDubResults(data.sideBySide || []);
      const updatedShort: ShortCandidate = {
        ...short,
        dubEvents: data.dubEvents,
        renderPlan: {
          ...(short.renderPlan || {
            projectId: short.projectId,
            shortId: short.id,
            duration: short.duration,
            brollEvents: [],
            captions: short.captions || [],
            sfxMarkers: short.sfxMarkers || [],
            audioTrack: { originalVolume: 1.0, brollDuckingDb: 6 },
          }),
          dubEvents: data.dubEvents,
        },
      };

      onUpdateShort(updatedShort);
      setStatusNotice(`Dubbing sequence prepared in ${targetDubLanguage}!`);
    } catch (err: any) {
      setErrorNotice(err.message || 'Dubbing generation failed');
    } finally {
      setIsDubbing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800 text-neutral-200 text-xs">
      {/* HEADER */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="font-bold text-sm tracking-wide text-white uppercase">Voice Studio</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono">
          OmniVoice + System
        </span>
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="flex border-b border-neutral-800 bg-neutral-950/60 p-1 gap-1 text-[11px]">
        <button
          onClick={() => setSubTab('tts')}
          className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-all ${
            subTab === 'tts'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          TTS & Voices
        </button>
        <button
          onClick={() => setSubTab('script_vo')}
          className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-all ${
            subTab === 'script_vo'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Voiceover ({short.scriptSections?.length || 0})
        </button>
        <button
          onClick={() => setSubTab('dubbing')}
          className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-all ${
            subTab === 'dubbing'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          AI Dub
        </button>
        <button
          onClick={() => setSubTab('clone')}
          className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-all ${
            subTab === 'clone'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Clone Voice
        </button>
      </div>

      {/* NOTICES */}
      {statusNotice && (
        <div className="m-3 p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}
      {errorNotice && (
        <div className="m-3 p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* SUBTAB 1: TTS & VOICES */}
        {subTab === 'tts' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Select Voice Preset
              </label>
              <select
                value={selectedVoiceId}
                onChange={(e) => setSelectedVoiceId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-white text-xs focus:border-amber-400 outline-none"
              >
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.language}) [{v.provider.toUpperCase()}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Speech Script / Text
              </label>
              <textarea
                value={speechText}
                onChange={(e) => setSpeechText(e.target.value)}
                rows={3}
                placeholder="Enter speech text to synthesize..."
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-white text-xs focus:border-amber-400 outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 mb-1">
                  Speed ({speechSpeed.toFixed(1)}x)
                </label>
                <input
                  type="range"
                  min="0.6"
                  max="1.8"
                  step="0.1"
                  value={speechSpeed}
                  onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 mb-1">Emotion / Tone</label>
                <select
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-1.5 text-white text-xs outline-none"
                >
                  <option value="natural">Natural / Conversational</option>
                  <option value="documentary">Documentary / Authoritative</option>
                  <option value="cheerful">Cheerful / High Energy</option>
                  <option value="cinematic">Cinematic / Deep</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSynthesize}
              disabled={isSynthesizing || !speechText.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSynthesizing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Real Audio...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span>Synthesize Voice Track</span>
                </>
              )}
            </button>

            {previewAudioUrl && (
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileAudio className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white">Audio Asset Ready</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">{audioDuration.toFixed(2)}s</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleTogglePreview}
                    className="flex-1 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center gap-1.5 font-medium transition-colors cursor-pointer"
                  >
                    {isPlayingPreview ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlayingPreview ? 'Pause' : 'Play Preview'}</span>
                  </button>
                  <button
                    onClick={handleAddToTimeline}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center gap-1.5 font-medium transition-colors cursor-pointer"
                  >
                    <span>Insert at {currentTime.toFixed(1)}s</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 2: SCRIPT VOICEOVER */}
        {subTab === 'script_vo' && (
          <div className="space-y-3">
            <div className="text-[11px] text-neutral-400">
              Generate synchronized voiceover directly from your narrative Auto Script sections (Hook, Context, Key Point, Payoff).
            </div>

            <button
              onClick={handleGenerateScriptVO}
              disabled={isGeneratingVO || !short.scriptSections?.length}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all cursor-pointer"
            >
              {isGeneratingVO ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Aligning Voiceover Tracks...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Multi-Section Voiceover</span>
                </>
              )}
            </button>

            {voWarnings.length > 0 && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1">
                <div className="font-bold text-amber-300 text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Voiceover Overrun Detected</span>
                </div>
                {voWarnings.map((w, idx) => (
                  <div key={idx} className="text-[10px] text-amber-200/80">
                    • {w}
                  </div>
                ))}
              </div>
            )}

            {/* Sections breakdown */}
            <div className="space-y-2">
              {(short.scriptSections || []).map((sec, idx) => {
                const targetDur = sec.end - sec.start;
                const matchedVO = (short.voiceoverEvents || []).find((vo) => vo.sectionType === sec.type);
                return (
                  <div
                    key={idx}
                    onClick={() => onTimeSeek?.(sec.start)}
                    className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 hover:border-amber-400/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-amber-300 uppercase text-[10px]">
                        {sec.type} [{sec.start.toFixed(1)}s - {sec.end.toFixed(1)}s]
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">Target: {targetDur.toFixed(1)}s</span>
                    </div>
                    <p className="text-[11px] text-neutral-300 line-clamp-2">{sec.text}</p>
                    {matchedVO && (
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-emerald-400">
                        <span>✓ Voiceover synced ({matchedVO.duration.toFixed(1)}s)</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            audioElem.src = matchedVO.audioUrl;
                            audioElem.play();
                          }}
                          className="hover:underline"
                        >
                          ▶ Preview
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBTAB 3: AI DUBBING */}
        {subTab === 'dubbing' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Target Dubbing Language
              </label>
              <select
                value={targetDubLanguage}
                onChange={(e) => setTargetDubLanguage(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-white text-xs focus:border-amber-400 outline-none"
              >
                <option value="Hindi">Hindi (हिन्दी)</option>
                <option value="Spanish">Spanish (Español)</option>
                <option value="Portuguese">Portuguese (Português)</option>
                <option value="French">French (Français)</option>
                <option value="German">German (Deutsch)</option>
                <option value="Italian">Italian (Italiano)</option>
                <option value="Arabic">Arabic (العربية)</option>
                <option value="Punjabi">Punjabi (ਪੰਜਾਬੀ)</option>
                <option value="Japanese">Japanese (日本語)</option>
              </select>
            </div>

            <button
              onClick={handleGenerateDubbing}
              disabled={isDubbing}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all cursor-pointer"
            >
              {isDubbing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Translating & Adapting Timing...</span>
                </>
              ) : (
                <>
                  <Languages className="w-4 h-4" />
                  <span>Translate & Dub Video</span>
                </>
              )}
            </button>

            {dubResults.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                  Side-by-Side Review
                </div>
                {dubResults.slice(0, 5).map((d, idx) => (
                  <div key={idx} className="p-2 bg-neutral-950 border border-neutral-800 rounded-lg space-y-1">
                    <div className="text-[10px] text-neutral-500 font-mono">
                      {d.start.toFixed(1)}s - {d.end.toFixed(1)}s
                    </div>
                    <div className="text-[11px] text-neutral-400">Orig: {d.original}</div>
                    <div className="text-[11px] font-semibold text-amber-300">Dub: {d.translated}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 4: CLONE VOICE */}
        {subTab === 'clone' && (
          <div className="space-y-4">
            <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 mb-1">Voice Profile Name</label>
                <input
                  type="text"
                  value={cloneVoiceName}
                  onChange={(e) => setCloneVoiceName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white text-xs outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 mb-1">Reference Audio Track</label>
                <input
                  type="text"
                  value={cloneRefAsset}
                  onChange={(e) => setCloneRefAsset(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white text-xs outline-none font-mono"
                />
              </div>

              {/* Mandatory Authorization Confirmation (Section 8) */}
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                <input
                  type="checkbox"
                  id="consent_check"
                  checked={cloneConsent}
                  onChange={(e) => setCloneConsent(e.target.checked)}
                  className="mt-0.5 accent-amber-400 cursor-pointer"
                />
                <label htmlFor="consent_check" className="text-[11px] text-amber-200 cursor-pointer leading-tight">
                  I explicitly certify and confirm that I have lawful authorization and consent to clone and synthesize this speaker's voice.
                </label>
              </div>

              <button
                onClick={handleCloneVoice}
                disabled={isCloning || !cloneConsent}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all cursor-pointer"
              >
                {isCloning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Profiling Voice...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Create Authorized Voice Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
