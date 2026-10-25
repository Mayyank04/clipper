import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Wand2,
  CheckCircle2,
  XCircle,
  FileEdit,
  Film,
  Type,
  Mic,
  Languages,
  Scissors,
  ArrowRight,
} from 'lucide-react';
import { ShortCandidate, AIEditPlan, CaptionStylePreset } from '../../types';
import { getCaptionStylePreset } from '../../utils/captionEngine';

interface AIChatEditorProps {
  short: ShortCandidate;
  currentTime: number;
  onUpdateShort: (updated: ShortCandidate) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  plan?: AIEditPlan;
  applied?: boolean;
}

export const AIChatEditor: React.FC<AIChatEditorProps> = ({
  short,
  currentTime,
  onUpdateShort,
}) => {
  const [inputCommand, setInputCommand] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hello! I am your AI Director. Tell me how you want to refine this short (e.g. "Make this more professional", "Add Hindi captions", "Add B-roll when I talk about AI"). I will generate a structured Edit Plan for your preview and approval before making any changes.',
    },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activePlanForPreview, setActivePlanForPreview] = useState<AIEditPlan | null>(null);

  const SUGGESTIONS = [
    'Make this more professional',
    'Add Hindi captions',
    'Use a male documentary voice',
    'Add B-roll when I talk about AI',
    'Make the opening stronger',
    'Use an AI presenter',
  ];

  const handleSendCommand = async (commandToSend?: string) => {
    const text = (commandToSend || inputCommand).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputCommand('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/director/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userCommand: text, short }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate plan');
      }

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: data.plan.summary,
        plan: data.plan,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setActivePlanForPreview(data.plan);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'ai',
          text: `Could not process command: ${err.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply structured AIEditPlan directly to the canonical RenderPlan (Section 16, 17)
  const handleApplyPlan = (plan: AIEditPlan) => {
    let updatedShort: ShortCandidate = { ...short };

    for (const item of plan.items) {
      if (item.type === 'change_caption_style') {
        const styleName = (item.details?.style || 'cinematic').toLowerCase();
        const basePreset = getCaptionStylePreset(styleName as any);
        updatedShort = {
          ...updatedShort,
          captionCustomization: {
            ...(updatedShort.captionCustomization || {}),
            ...basePreset,
            style: styleName as any,
          },
        };
      } else if (item.type === 'add_broll') {
        const newBRoll = {
          id: `broll_chat_${Date.now()}`,
          timestamp: Math.max(1, currentTime),
          duration: 3.5,
          concept: 'Cinematic creator workspace workflow',
          imageUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&auto=format&fit=crop&q=80',
          keyword: 'production',
          enabled: true,
          confidence: 0.94,
        };
        updatedShort = {
          ...updatedShort,
          brollSuggestions: [...(updatedShort.brollSuggestions || []), newBRoll],
        };
      } else if (item.type === 'translate') {
        // Translation should be reviewed in Voice Studio
        console.log('[AIChatEditor] Translation command flagged for review in Voice Studio');
      }
    }

    onUpdateShort(updatedShort);
    setActivePlanForPreview(null);
    setMessages((prev) =>
      prev.map((m) => (m.plan?.id === plan.id ? { ...m, applied: true } : m))
    );
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800 text-neutral-200 text-xs">
      {/* HEADER */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-purple-400 animate-pulse" />
          <span className="font-bold text-sm tracking-wide text-white uppercase">AI Chat Editor</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono">
          Structured Plan Preview
        </span>
      </div>

      {/* QUICK SUGGESTIONS */}
      <div className="p-2 border-b border-neutral-800 bg-neutral-950/60 overflow-x-auto flex gap-1.5 no-scrollbar">
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSendCommand(s)}
            className="flex-shrink-0 text-[10px] px-2.5 py-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            {s}
          </button>
        ))}
      </div>

      {/* MESSAGE THREAD */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`p-2.5 rounded-xl max-w-[88%] ${
                m.sender === 'user'
                  ? 'bg-purple-600 text-white font-medium'
                  : 'bg-neutral-950 border border-neutral-800 text-neutral-200'
              }`}
            >
              <p className="text-[11px] leading-relaxed">{m.text}</p>
            </div>

            {/* Plan Action Badge */}
            {m.plan && (
              <div className="mt-1.5 p-2 rounded-lg bg-purple-950/40 border border-purple-500/30 max-w-[88%] space-y-1.5">
                <div className="font-bold text-[10px] text-purple-300 flex items-center gap-1">
                  <FileEdit className="w-3 h-3" />
                  <span>AI Edit Plan ({m.plan.items.length} actions)</span>
                </div>
                {m.applied ? (
                  <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Applied to Sequence</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setActivePlanForPreview(m.plan!)}
                    className="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Command Preview</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-purple-400 text-[11px] font-mono animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Director analyzing sequence and formulating plan...</span>
          </div>
        )}
      </div>

      {/* COMMAND INPUT BOX */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-950/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendCommand();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            placeholder="Type command: 'Make opening stronger', 'Add Hindi captions'..."
            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-purple-400"
          />
          <button
            type="submit"
            disabled={!inputCommand.trim() || isLoading}
            className="px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center justify-center disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* COMMAND PREVIEW MODAL (Section 17: AI EDIT PLAN) */}
      {activePlanForPreview && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-purple-500/40 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-sm text-white">AI EDIT PLAN PREVIEW</span>
              </div>
              <button
                onClick={() => setActivePlanForPreview(null)}
                className="text-neutral-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-neutral-400">User Command</div>
              <div className="text-xs font-semibold text-purple-300 bg-purple-950/30 p-2 rounded-lg border border-purple-800/50">
                "{activePlanForPreview.userCommand}"
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] uppercase font-bold text-neutral-400">Proposed Modifications</div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {activePlanForPreview.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-start gap-2.5"
                  >
                    {it.type === 'add_broll' && <Film className="w-4 h-4 text-amber-400 mt-0.5" />}
                    {it.type === 'change_caption_style' && <Type className="w-4 h-4 text-cyan-400 mt-0.5" />}
                    {it.type === 'add_voiceover' && <Mic className="w-4 h-4 text-emerald-400 mt-0.5" />}
                    {it.type === 'translate' && <Languages className="w-4 h-4 text-rose-400 mt-0.5" />}
                    {it.type === 'remove_silence' && <Scissors className="w-4 h-4 text-amber-400 mt-0.5" />}
                    <div>
                      <div className="text-[11px] font-semibold text-white">{it.description}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        {JSON.stringify(it.details)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-neutral-800">
              <button
                onClick={() => setActivePlanForPreview(null)}
                className="flex-1 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApplyPlan(activePlanForPreview)}
                className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-lg shadow-purple-600/30"
              >
                Apply Edit Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
