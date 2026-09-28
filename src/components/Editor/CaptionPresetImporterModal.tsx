/**
 * VIRALCLIP STUDIO — CAPTION PRESET IMPORTER MODAL
 * Production-grade Google Drive & Local Preset Import Platform.
 * Matches existing dark editor UI, styling tokens, and typography.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  FolderDown,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Upload,
  Layers,
  FileCode,
  Type,
  Archive,
  ExternalLink,
  Trash2,
  Play,
  Check,
  AlertCircle,
  History,
  HardDrive,
  Sparkles,
} from 'lucide-react';
import {
  CaptionPresetSourceRecord,
  CaptionPresetRecord,
  CaptionImportJobRecord,
  CaptionImportErrorRecord,
  ScanReport,
} from '../../types';

interface CaptionPresetImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset?: (preset: CaptionPresetRecord) => void;
}

export const CaptionPresetImporterModal: React.FC<CaptionPresetImporterModalProps> = ({
  isOpen,
  onClose,
  onApplyPreset,
}) => {
  const [activeTab, setActiveTab] = useState<'sources' | 'scan' | 'importing' | 'library' | 'history' | 'upload'>('sources');
  const [sources, setSources] = useState<CaptionPresetSourceRecord[]>([]);
  const [importedPresets, setImportedPresets] = useState<CaptionPresetRecord[]>([]);
  const [historyJobs, setHistoryJobs] = useState<CaptionImportJobRecord[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  
  // Scanning & Job State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanReport, setScanReport] = useState<ScanReport | null>(null);
  const [activeJob, setActiveJob] = useState<CaptionImportJobRecord | null>(null);
  const [jobErrors, setJobErrors] = useState<CaptionImportErrorRecord[]>([]);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);

  // New Source Form
  const [newSourceName, setNewSourceName] = useState<string>('');
  const [newSourceUrl, setNewSourceUrl] = useState<string>('');
  const [newSourceCategory, setNewSourceCategory] = useState<string>('Beginner');
  const [showAddSource, setShowAddSource] = useState<boolean>(false);

  // Search & Filter in Library
  const [librarySearch, setLibrarySearch] = useState<string>('');
  const [libraryCategory, setLibraryCategory] = useState<string>('ALL');

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      fetchSources();
      fetchImportedPresets();
      fetchHistory();
    }
  }, [isOpen]);

  // Polling active import job
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeJob && ['QUEUED', 'SCANNING', 'DOWNLOADING', 'ANALYZING', 'CONVERTING', 'VALIDATING', 'PREVIEWING', 'IMPORTING'].includes(activeJob.status)) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/caption-import/jobs/${activeJob.id}`);
          const data = await res.json();
          if (data.success && data.job) {
            setActiveJob(data.job);
            if (data.job.status === 'COMPLETED' || data.job.status === 'FAILED' || data.job.status === 'CANCELLED') {
              fetchImportedPresets();
              fetchSources();
              fetchHistory();
              // Load errors if any
              if (data.job.failureCount > 0 || data.job.partialCount > 0) {
                fetchJobErrors(data.job.id);
              }
            }
          }
        } catch {}
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [activeJob]);

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/caption-import/sources');
      const data = await res.json();
      if (data.success) {
        setSources(data.sources || []);
        if (data.sources.length > 0 && !selectedSourceId) {
          setSelectedSourceId(data.sources[0].id);
        }
      }
    } catch {}
  };

  const fetchImportedPresets = async () => {
    try {
      const res = await fetch('/api/caption-import/presets');
      const data = await res.json();
      if (data.success) {
        setImportedPresets(data.presets || []);
      }
    } catch {}
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/caption-import/history');
      const data = await res.json();
      if (data.success) {
        setHistoryJobs(data.jobs || []);
      }
    } catch {}
  };

  const fetchJobErrors = async (jobId: string) => {
    try {
      const res = await fetch(`/api/caption-import/jobs/${jobId}/errors`);
      const data = await res.json();
      if (data.success) {
        setJobErrors(data.errors || []);
      }
    } catch {}
  };

  const handleAddSource = async () => {
    if (!newSourceUrl.trim()) return;
    try {
      const res = await fetch('/api/caption-import/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSourceName.trim() || 'New Preset Source',
          category: newSourceCategory,
          sourceUrl: newSourceUrl.trim(),
          provider: 'google_drive',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewSourceName('');
        setNewSourceUrl('');
        setShowAddSource(false);
        fetchSources();
      }
    } catch {}
  };

  const handleDeleteSource = async (id: string) => {
    try {
      await fetch(`/api/caption-import/sources/${id}`, { method: 'DELETE' });
      fetchSources();
    } catch {}
  };

  const handleScanSource = async (sourceId: string) => {
    setIsScanning(true);
    setScanReport(null);
    try {
      const res = await fetch('/api/caption-import/sources/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId }),
      });
      const data = await res.json();
      if (data.success && data.report) {
        setScanReport(data.report);
        setActiveTab('scan');
      }
    } catch (err: any) {
      alert(`Scan failed: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleStartImport = async (sourceId: string) => {
    try {
      const res = await fetch('/api/caption-import/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId }),
      });
      const data = await res.json();
      if (data.success && data.job) {
        setActiveJob(data.job);
        setActiveTab('importing');
      }
    } catch (err: any) {
      alert(`Import start failed: ${err.message}`);
    }
  };

  const handleCancelJob = async () => {
    if (!activeJob) return;
    try {
      await fetch(`/api/caption-import/jobs/${activeJob.id}/cancel`, { method: 'POST' });
    } catch {}
  };

  const handleSyncSources = async () => {
    try {
      const res = await fetch('/api/caption-import/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (data.jobs && data.jobs.length > 0) {
          setActiveJob(data.jobs[0]);
          setActiveTab('importing');
        }
      }
    } catch {}
  };

  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('category', 'Imported');

    try {
      const res = await fetch('/api/caption-import/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.jobId) {
        const jobRes = await fetch(`/api/caption-import/jobs/${data.jobId}`);
        const jobData = await jobRes.json();
        if (jobData.success) {
          setActiveJob(jobData.job);
          setActiveTab('importing');
        }
      }
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  const categoriesList = [
    'ALL',
    'BEGINNER',
    'INTERMEDIATE',
    'PRO',
    '3D',
    'PRESET PACK 1',
    'PRESET PACK 2',
    'PRESET PACK 3',
    'IMPORTED',
    'MY STYLES',
  ];

  const filteredPresets = importedPresets.filter((p) => {
    if (libraryCategory !== 'ALL' && p.category.toUpperCase() !== libraryCategory) {
      return false;
    }
    if (librarySearch.trim()) {
      const q = librarySearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sourceFile && p.sourceFile.toLowerCase().includes(q)) ||
        (p.presetJson?.config?.fontFamily && p.presetJson.config.fontFamily.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="p-4 px-6 border-b border-neutral-800/80 flex items-center justify-between bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-400/10">
              <FolderDown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-wide">Caption Preset Importer</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono font-bold border border-amber-400/30">
                  PRODUCTION ENGINE
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Google Drive & Multi-Format Preset Ingestion, Normalization & Native Typography Registry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-neutral-800 bg-neutral-950 text-xs font-bold">
          {[
            { id: 'sources' as const, label: 'Preset Sources', icon: Cloud, badge: sources.length },
            { id: 'scan' as const, label: 'Scan Report', icon: Search, badge: scanReport ? scanReport.totalFiles : null },
            { id: 'importing' as const, label: 'Live Import', icon: RefreshCw, badge: activeJob && activeJob.status !== 'COMPLETED' ? 'Active' : null },
            { id: 'library' as const, label: 'Preset Library', icon: Layers, badge: importedPresets.length },
            { id: 'history' as const, label: 'Sync & History', icon: History, badge: historyJobs.length },
            { id: 'upload' as const, label: 'Local Files', icon: Upload },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-neutral-900 text-amber-300 border-t-2 border-amber-400'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : ''}`} />
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-amber-400/20 text-amber-300' : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ==================== TAB 1: PRESET SOURCES ==================== */}
          {activeTab === 'sources' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Configured Preset Sources</h3>
                  <p className="text-xs text-neutral-400">
                    Pre-configured Google Drive folders and custom links with recursive scanning & deduplication.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSyncSources}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs font-bold transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sync All Sources</span>
                  </button>
                  <button
                    onClick={() => setShowAddSource(!showAddSource)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-black transition cursor-pointer shadow-md shadow-amber-400/20"
                  >
                    <span>+ Add Another Source</span>
                  </button>
                </div>
              </div>

              {/* Add Source Form Drawer */}
              {showAddSource && (
                <div className="p-4 rounded-2xl bg-neutral-900 border border-amber-400/40 space-y-3 animate-scale-in">
                  <span className="text-xs font-bold text-amber-300 block">Add Google Drive Preset Source</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Source Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Viral Kinetic Pack 4"
                        value={newSourceName}
                        onChange={(e) => setNewSourceName(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Category</label>
                      <select
                        value={newSourceCategory}
                        onChange={(e) => setNewSourceCategory(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      >
                        {categoriesList.filter((c) => c !== 'ALL').map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Google Drive Folder / File URL</label>
                      <input
                        type="text"
                        placeholder="https://drive.google.com/drive/folders/..."
                        value={newSourceUrl}
                        onChange={(e) => setNewSourceUrl(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowAddSource(false)}
                      className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddSource}
                      className="px-4 py-1.5 rounded-xl bg-amber-400 text-neutral-950 font-bold text-xs hover:bg-amber-300"
                    >
                      Save Source
                    </button>
                  </div>
                </div>
              )}

              {/* Sources Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {sources.map((src) => {
                  const isScanningThis = isScanning && selectedSourceId === src.id;
                  return (
                    <div
                      key={src.id}
                      className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800/80 hover:border-neutral-700 transition flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-white flex items-center gap-2">
                            <Cloud className="w-3.5 h-3.5 text-amber-400" />
                            {src.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 font-mono font-bold">
                            {src.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 font-mono truncate" title={src.sourceUrl}>
                          {src.sourceUrl}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60 text-[11px] text-neutral-400">
                        <div>
                          <span>Imported: </span>
                          <span className="text-amber-400 font-bold">{src.importedCount || 0} presets</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedSourceId(src.id);
                              handleScanSource(src.id);
                            }}
                            disabled={isScanningThis}
                            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Search className="w-3 h-3 text-amber-400" />
                            {isScanningThis ? 'Scanning...' : 'Scan'}
                          </button>
                          <button
                            onClick={() => handleStartImport(src.id)}
                            className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-neutral-950" />
                            Import All
                          </button>
                          {!src.metadata?.isSeed && (
                            <button
                              onClick={() => handleDeleteSource(src.id)}
                              className="p-1 rounded-lg text-neutral-500 hover:text-rose-400 transition cursor-pointer"
                              title="Delete source"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== TAB 2: SCAN REPORT ==================== */}
          {activeTab === 'scan' && (
            <div className="space-y-6 animate-fade-in">
              {!scanReport ? (
                <div className="text-center py-16 space-y-3">
                  <Search className="w-10 h-10 text-neutral-600 mx-auto" />
                  <span className="text-sm font-bold text-neutral-400 block">No scan report loaded</span>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                    Select a source from the Preset Sources tab and click "Scan" to discover and classify files.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Header */}
                  <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{scanReport.sourceName}</h3>
                        <span className="text-xs text-amber-400 font-mono font-bold">
                          {scanReport.totalFiles} files detected
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 font-mono truncate max-w-xl">
                        {scanReport.sourceUrl}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartImport(scanReport.sourceId)}
                        className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-xs transition cursor-pointer shadow-lg shadow-amber-400/20 flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-neutral-950" />
                        <span>Import All Detected</span>
                      </button>
                    </div>
                  </div>

                  {/* Classification Metrics Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                    {Object.entries(scanReport.categories).map(([k, count]) => (
                      <div key={k} className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-center">
                        <span className="text-[10px] text-neutral-500 uppercase block font-bold">{k}</span>
                        <span className="text-base font-black text-white font-mono">{count}</span>
                      </div>
                    ))}
                  </div>

                  {/* Compatibility Status Banner */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-emerald-300 block">Fully Supported</span>
                        <span className="text-xs text-neutral-400 font-mono">{scanReport.supportedCount} files</span>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-amber-300 block">Partially Supported</span>
                        <span className="text-xs text-neutral-400 font-mono">{scanReport.partiallySupportedCount} files</span>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5">
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-rose-300 block">Unsupported</span>
                        <span className="text-xs text-neutral-400 font-mono">{scanReport.unsupportedCount} files</span>
                      </div>
                    </div>
                  </div>

                  {/* Discovered Items Table */}
                  <div className="rounded-2xl border border-neutral-800 overflow-hidden bg-neutral-900/40">
                    <div className="p-3 bg-neutral-950 font-bold text-xs text-neutral-400 border-b border-neutral-800">
                      Discovered Resources ({scanReport.items.length})
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-neutral-800/60">
                      {scanReport.items.map((item) => (
                        <div key={item.id} className="p-3 flex items-center justify-between text-xs hover:bg-neutral-900/60">
                          <div className="flex items-center gap-3">
                            {item.detectedType === 'xml' && <FileCode className="w-4 h-4 text-amber-400" />}
                            {item.detectedType === 'font' && <Type className="w-4 h-4 text-emerald-400" />}
                            {item.detectedType === 'zip' && <Archive className="w-4 h-4 text-blue-400" />}
                            {item.detectedType === 'json' && <FileCode className="w-4 h-4 text-purple-400" />}
                            <div>
                              <span className="text-white font-bold block">{item.name}</span>
                              <span className="text-[10px] text-neutral-400 font-mono">{item.details}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                              item.compatibility === 'SUPPORTED'
                                ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                                : item.compatibility === 'PARTIAL'
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                : 'bg-rose-400/20 text-rose-300 border border-rose-400/40'
                            }`}>
                              {item.compatibility}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 3: LIVE IMPORT ==================== */}
          {activeTab === 'importing' && (
            <div className="space-y-6 animate-fade-in">
              {!activeJob ? (
                <div className="text-center py-16 space-y-3">
                  <RefreshCw className="w-10 h-10 text-neutral-600 mx-auto" />
                  <span className="text-sm font-bold text-neutral-400 block">No active import job</span>
                  <p className="text-xs text-neutral-500">
                    Click "Import All" on any source to trigger the background conversion worker.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Progress Header */}
                  <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-3 w-3 relative">
                          {activeJob.status !== 'COMPLETED' && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          )}
                          <span className={`relative inline-flex rounded-full h-3 w-3 ${
                            activeJob.status === 'COMPLETED' ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}></span>
                        </span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                          {activeJob.stage}
                        </h3>
                      </div>
                      {activeJob.status !== 'COMPLETED' && activeJob.status !== 'FAILED' && (
                        <button
                          onClick={handleCancelJob}
                          className="px-3 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-rose-300 text-xs font-bold transition cursor-pointer"
                        >
                          Cancel Import
                        </button>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {(() => {
                      const total = activeJob.totalFiles || 1;
                      const done = activeJob.processedFiles || 0;
                      const pct = Math.min(100, Math.round((done / total) * 100));

                      return (
                        <div className="space-y-2">
                          <div className="w-full bg-neutral-950 rounded-full h-3 overflow-hidden border border-neutral-800 p-0.5">
                            <div
                              className="bg-gradient-to-r from-amber-500 to-yellow-300 h-full rounded-full transition-all duration-300 shadow-sm"
                              style={{ width: `${Math.max(5, pct)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                            <span>Current: <strong className="text-white">{activeJob.currentFile || 'Initializing pipeline...'}</strong></span>
                            <span className="text-amber-300 font-bold">{pct}% ({done} / {total})</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Realtime Status Metrics */}
                  <div className="grid grid-cols-4 gap-3 text-center font-mono">
                    <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
                      <span className="text-[10px] text-neutral-500 uppercase block">✓ Imported</span>
                      <span className="text-lg font-black text-emerald-400">{activeJob.successCount}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
                      <span className="text-[10px] text-neutral-500 uppercase block">⚠ Partial</span>
                      <span className="text-lg font-black text-amber-400">{activeJob.partialCount}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
                      <span className="text-[10px] text-neutral-500 uppercase block">✕ Failed</span>
                      <span className="text-lg font-black text-rose-400">{activeJob.failureCount}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
                      <span className="text-[10px] text-neutral-500 uppercase block">⚠ Unsupported</span>
                      <span className="text-lg font-black text-neutral-400">{activeJob.unsupportedCount}</span>
                    </div>
                  </div>

                  {/* Actions Bar on Complete */}
                  {activeJob.status === 'COMPLETED' && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between animate-fade-in">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <div>
                          <span className="text-xs font-bold text-white block">Import Completed Successfully</span>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            {activeJob.successCount} native presets registered into ViralClip Studio library
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeJob.partialCount > 0 && (
                          <button
                            onClick={() => setShowErrorModal(true)}
                            className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-300 border border-amber-400/30 text-xs font-bold transition cursor-pointer"
                          >
                            View Partial Conversions ({activeJob.partialCount})
                          </button>
                        )}
                        <button
                          onClick={() => setActiveTab('library')}
                          className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-xs transition cursor-pointer shadow-md shadow-amber-400/20"
                        >
                          View Imported Presets
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 4: PRESET LIBRARY ==================== */}
          {activeTab === 'library' && (
            <div className="space-y-4 animate-fade-in">
              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Search imported presets, fonts, source files..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
                  {['ALL', 'PRO', 'BEGINNER', 'INTERMEDIATE', '3D', 'PRESET PACK 1'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setLibraryCategory(cat)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                        libraryCategory === cat
                          ? 'bg-amber-400 text-neutral-950 shadow-sm'
                          : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Presets Grid */}
              {filteredPresets.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <Layers className="w-10 h-10 text-neutral-600 mx-auto" />
                  <span className="text-sm font-bold text-neutral-400 block">No presets found</span>
                  <p className="text-xs text-neutral-500">
                    Import a Google Drive folder or local preset pack to populate this library.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredPresets.map((p) => {
                    const cfg = p.presetJson?.config || {};
                    return (
                      <div
                        key={p.id}
                        className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden flex flex-col justify-between group/card hover:border-neutral-700 transition"
                      >
                        {/* SVG Preview Card */}
                        <div className="h-32 bg-neutral-950 relative overflow-hidden flex items-center justify-center border-b border-neutral-800/80">
                          {p.previewUrl ? (
                            <img
                              src={p.previewUrl}
                              alt={p.name}
                              className="w-full h-full object-contain p-2"
                              onError={(e) => {
                                (e.target as any).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="text-center">
                              <span
                                style={{
                                  fontFamily: cfg.fontFamily || 'Montserrat, sans-serif',
                                  fontSize: '22px',
                                  fontWeight: cfg.fontWeight || 800,
                                  color: cfg.primaryColor || '#FFFFFF',
                                }}
                              >
                                {p.name}
                              </span>
                            </div>
                          )}

                          {/* Compatibility Badge */}
                          <div className="absolute top-2 right-2">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              p.conversionStatus === 'FULL'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}>
                              {p.conversionStatus === 'FULL' ? '✓ Fully Compatible' : '⚠ Partial'}
                            </span>
                          </div>
                        </div>

                        {/* Card Info & Actions */}
                        <div className="p-3.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-white truncate max-w-[200px]" title={p.name}>
                              {p.name}
                            </h4>
                            <span className="text-[10px] px-2 py-0.2 rounded bg-neutral-800 text-neutral-300 font-mono">
                              {p.category}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-neutral-400">
                            <span className="truncate">Font: <strong className="text-neutral-200">{cfg.fontFamily?.split(',')[0]}</strong></span>
                            <span className="truncate">Anim: <strong className="text-amber-300">{cfg.animationType || 'pop'}</strong></span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                            <span className="text-[10px] text-neutral-500 truncate max-w-[140px]">
                              {p.sourceFile || 'Google Drive'}
                            </span>
                            <button
                              onClick={() => {
                                onApplyPreset?.(p);
                                onClose();
                              }}
                              className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <Check className="w-3 h-3" />
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 5: SYNC & HISTORY ==================== */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Import History & Audit Log</h3>
                  <p className="text-xs text-neutral-400">
                    Track previous background ingestion runs, duration, and conversion health.
                  </p>
                </div>
                <button
                  onClick={handleSyncSources}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-xs transition cursor-pointer shadow-md shadow-amber-400/20 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Drive Sources</span>
                </button>
              </div>

              <div className="rounded-2xl border border-neutral-800 overflow-hidden bg-neutral-900/40">
                <div className="grid grid-cols-6 p-3 bg-neutral-950 font-bold text-[11px] text-neutral-400 border-b border-neutral-800">
                  <span>Job ID</span>
                  <span>Started</span>
                  <span>Files</span>
                  <span>Imported</span>
                  <span>Partial / Failed</span>
                  <span>Status</span>
                </div>
                <div className="divide-y divide-neutral-800/60 max-h-96 overflow-y-auto">
                  {historyJobs.map((job) => (
                    <div key={job.id} className="grid grid-cols-6 p-3 text-xs items-center hover:bg-neutral-900/60 font-mono">
                      <span className="text-neutral-300 font-bold truncate">{job.id}</span>
                      <span className="text-neutral-400">{job.startedAt ? new Date(job.startedAt).toLocaleTimeString() : '-'}</span>
                      <span className="text-white">{job.processedFiles} / {job.totalFiles}</span>
                      <span className="text-emerald-400 font-bold">{job.successCount}</span>
                      <span className="text-amber-400">{job.partialCount} / {job.failureCount}</span>
                      <div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          job.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : job.status === 'FAILED'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 6: LOCAL FILES UPLOAD ==================== */}
          {activeTab === 'upload' && (
            <div className="space-y-6 animate-fade-in text-center py-8">
              <div className="max-w-md mx-auto p-8 rounded-3xl bg-neutral-900 border-2 border-dashed border-neutral-700 hover:border-amber-400 transition space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Upload Local Preset Resources</h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Select .xml, .json, .zip, .ttf, or .otf files from your computer to convert into native ViralClip presets.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-xs cursor-pointer shadow-lg shadow-amber-400/20 transition">
                  <HardDrive className="w-4 h-4" />
                  <span>Browse Local Files</span>
                  <input
                    type="file"
                    multiple
                    accept=".xml,.json,.zip,.ttf,.otf,.woff,.woff2"
                    onChange={handleLocalUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

        </div>

        {/* ERROR / PARTIAL CONVERSIONS MODAL */}
        {showErrorModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-scale-in">
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[70vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Conversion Inspection & Unsupported Properties Report
                </span>
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-3">
                {jobErrors.map((err) => (
                  <div key={err.id} className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <strong className="text-white">{err.sourceFile}</strong>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono">
                        {err.stage}
                      </span>
                    </div>
                    <p className="text-neutral-400 text-[11px]">{err.message}</p>
                    {err.suggestedAction && (
                      <span className="text-[10px] text-emerald-400 block font-mono">
                        Action: {err.suggestedAction}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
