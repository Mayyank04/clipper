import React, { useState, useRef } from 'react';
import { Sparkles, X, Film, Play, Upload, Music, Globe } from 'lucide-react';
import { SAMPLE_PROJECTS } from '../data/sampleProjects';
import { VideoProject } from '../types';

export const MULTILINGUAL_LANGUAGES = [
  { code: 'auto', name: 'Auto-Detect Language (Recommended)' },
  { code: 'en', name: 'English (EN)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'hinglish', name: 'Hinglish (Conversational Hindi-English)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'as', name: 'Assamese (অসমীয়া)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml', name: 'Malayalam (മലയാളം)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'ur', name: 'Urdu (اردو)' },
  { code: 'ne', name: 'Nepali (नेपाली)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'id', name: 'Indonesian (Bahasa)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'zh', name: 'Chinese (中文)' },
];

interface NewShortModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string, language?: string) => void;
  onSelectSample: (project: VideoProject) => void;
  onStartDemo?: () => void;
  onImportVideoFile?: (file: File, language?: string) => void;
  onImportAudioFile?: (file: File, language?: string) => void;
}

export const NewShortModal: React.FC<NewShortModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onSelectSample,
  onStartDemo,
  onImportVideoFile,
  onImportAudioFile,
}) => {
  const [url, setUrl] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(file.name)) {
      if (onImportAudioFile) {
        onImportAudioFile(file, selectedLanguage);
        onClose();
        return;
      }
    }

    if (onImportVideoFile) {
      onImportVideoFile(file, selectedLanguage);
      onClose();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportVideoFile) {
      onImportVideoFile(file, selectedLanguage);
      onClose();
    }
  };

  const handleAudioFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportAudioFile) {
      onImportAudioFile(file, selectedLanguage);
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please paste a valid YouTube video link');
      return;
    }
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!ytRegex.test(trimmed)) {
      setError('Please enter a valid YouTube URL (e.g., https://youtube.com/watch?v=...)');
      return;
    }
    setError('');
    onSubmit(trimmed, selectedLanguage);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Create New Shorts</h2>
              <p className="text-xs text-neutral-400">Multilingual AI analysis, captions, B-roll & render</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Spoken Language / Multilingual Selector */}
          <div className="space-y-1.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span>Spoken Language</span>
              </label>
              <span className="text-[10px] text-amber-400/90 font-mono font-bold">
                {selectedLanguage === 'auto' ? 'AUTO-DETECT' : selectedLanguage.toUpperCase()}
              </span>
            </div>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg p-2 focus:border-amber-400 focus:outline-none cursor-pointer"
            >
              {MULTILINGUAL_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-neutral-500">
              Auto analyzes speech & detects language with confidence scoring. Supports Hinglish mixed Latin script without corruption.
            </p>
          </div>

          {/* File Dropzone */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.webm,.m4v"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/mp3,audio/wav,audio/m4a,audio/aac,audio/flac,audio/ogg,audio/x-m4a,.mp3,.wav,.m4a,.aac,.flac,.ogg"
              onChange={handleAudioFileInputChange}
              className="hidden"
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-4 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center group ${
                isDragging
                  ? 'border-amber-400 bg-amber-400/10'
                  : 'border-neutral-800 bg-neutral-950/70'
              }`}
            >
              <Upload className="w-6 h-6 text-amber-400 mb-1.5 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-white">
                Drop your video or audio file here
              </p>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                MP4, MOV, WebM, or MP3, WAV, M4A, FLAC, OGG
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Film className="w-3.5 h-3.5 text-amber-400" />
                  <span>Choose Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Music className="w-3.5 h-3.5 text-amber-400" />
                  <span>Choose Audio</span>
                </button>
              </div>
            </div>
          </div>

          <div className="relative my-2 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800" />
            </div>
            <div className="relative inline-block px-3 bg-neutral-900 text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
              Or YouTube Link
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300">YouTube Video URL</label>
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl focus-within:border-amber-400 transition-colors">
              <Film className="w-4 h-4 text-neutral-500 flex-shrink-0" />
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError('');
                }}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
          </div>

          {/* Quick-Pick Samples */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Or pick instant demo stream
            </span>
            <div className="grid grid-cols-1 gap-2">
              {SAMPLE_PROJECTS.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    onSelectSample(s);
                    onClose();
                  }}
                  className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-400/50 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Play className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-neutral-200 truncate">
                      {s.originalTitle}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 flex-shrink-0">
                    {s.shorts.length} Shorts
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between gap-2">
            <div>
              {onStartDemo && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartDemo();
                  }}
                  className="px-3 py-2 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Try Demo Mode</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Start Analysis
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
