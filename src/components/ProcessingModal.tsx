import React, { useEffect, useState, useRef } from 'react';
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  ArrowRight,
  Circle,
  AlertTriangle,
  RotateCcw,
  Upload,
  X,
  Globe,
  Copy,
  Check,
  ChevronDown,
} from 'lucide-react';
import { parseSafeApiResponse, ApiError } from '../utils/safeResponseHelper';

interface ProcessingModalProps {
  isOpen: boolean;
  projectId: string | null;
  jobId?: string | null;
  videoUrl: string;
  initialError?: string | any | null;
  isDemoMode?: boolean;
  onComplete: (projectData: any) => void;
  onCancel: () => void;
  onUploadVideo?: () => void;
  onRetryWithDemo?: () => void;
  onRetry?: () => void;
}

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

const ERROR_DESCRIPTIONS: Record<string, { title: string; defaultMessage: string; defaultAction: string; retryable: boolean }> = {
  INVALID_YOUTUBE_URL: {
    title: 'Invalid YouTube URL',
    defaultMessage: 'The provided link is not a recognized YouTube URL. Supported formats: youtube.com/watch?v=..., youtu.be/..., or youtube.com/shorts/...',
    defaultAction: 'Please verify the link format or upload the video directly.',
    retryable: false,
  },
  VIDEO_NOT_FOUND: {
    title: 'YouTube Video Not Found',
    defaultMessage: 'This YouTube video was not found or has been removed. Check the link or upload the video directly.',
    defaultAction: 'Verify that the video is public on YouTube, or upload the MP4/MOV file.',
    retryable: false,
  },
  VIDEO_PRIVATE: {
    title: 'Private YouTube Video',
    defaultMessage: 'This YouTube video is set to Private or Members-Only by its owner and cannot be accessed publicly.',
    defaultAction: 'Change the video privacy on YouTube Studio or upload the video directly.',
    retryable: false,
  },
  VIDEO_RESTRICTED: {
    title: 'YouTube Video Restricted',
    defaultMessage: 'This video is restricted by YouTube (due to age restrictions, regional licensing, or channel membership).',
    defaultAction: 'Download the video in your authenticated browser and upload the video file directly.',
    retryable: false,
  },
  AUTHENTICATION_REQUIRED: {
    title: 'YouTube Authentication Required',
    defaultMessage: 'YouTube requires signed-in authentication credentials or session cookies to access this video.',
    defaultAction: 'Upload the video file directly using the button below.',
    retryable: false,
  },
  YOUTUBE_CHALLENGE_REQUIRED: {
    title: 'YouTube Bot Challenge Encountered',
    defaultMessage: 'YouTube triggered bot verification (Proof-of-Origin token or CAPTCHA) for this download stream.',
    defaultAction: 'Upload the video file directly from your device to proceed immediately.',
    retryable: false,
  },
  YOUTUBE_RATE_LIMITED: {
    title: 'YouTube Rate Limited',
    defaultMessage: 'YouTube has temporarily rate-limited download requests from this server.',
    defaultAction: 'Please wait a few minutes and click Retry, or upload the video directly.',
    retryable: true,
  },
  FORMAT_UNAVAILABLE: {
    title: 'Compatible Format Unavailable',
    defaultMessage: 'No compatible video stream format could be extracted from YouTube for this video.',
    defaultAction: 'Upload the video file directly as an MP4 or MOV.',
    retryable: false,
  },
  DOWNLOAD_TIMEOUT: {
    title: 'Download Timed Out',
    defaultMessage: 'The download process timed out before completion. The video may be too long or the network was interrupted.',
    defaultAction: 'Retry the download, or upload the video directly.',
    retryable: true,
  },
  NETWORK_ERROR: {
    title: 'Network Connectivity Error',
    defaultMessage: 'The server encountered a network or DNS error while connecting to YouTube servers.',
    defaultAction: 'Check your connection and click Retry, or upload the video directly.',
    retryable: true,
  },
  WORKER_UNAVAILABLE: {
    title: 'Downloader Worker Unavailable',
    defaultMessage: 'The media processing service is temporarily restarting or unreachable.',
    defaultAction: 'Wait 15 seconds and click Retry, or upload the video directly.',
    retryable: true,
  },
  STORAGE_UPLOAD_FAILED: {
    title: 'Media Storage Failed',
    defaultMessage: 'Failed to write downloaded media into server storage.',
    defaultAction: 'Click Retry in a moment, or check server disk permissions.',
    retryable: true,
  },
  MEDIA_VALIDATION_FAILED: {
    title: 'Media Validation Failed',
    defaultMessage: 'The downloaded media failed FFprobe validation (corrupted container or missing video stream).',
    defaultAction: 'Upload the video file directly in MP4 or MOV format.',
    retryable: false,
  },
  UNKNOWN_INGESTION_ERROR: {
    title: 'Media Ingestion Error',
    defaultMessage: 'An unexpected error occurred during media download or preparation.',
    defaultAction: 'Please retry processing or upload the video file directly.',
    retryable: true,
  },
};

const CHECKLIST_STAGES = [
  {
    id: 'validate',
    label: 'Validate source',
    activeStatuses: ['validating'],
    completedStatuses: [
      'ingesting',
      'probing',
      'extracting_audio',
      'transcribing',
      'analyzing',
      'detecting_moments',
      'generating_shorts',
      'preparing_editor',
      'completed',
    ],
  },
  {
    id: 'ingest',
    label: 'Ingest media',
    activeStatuses: ['ingesting', 'probing'],
    completedStatuses: [
      'extracting_audio',
      'transcribing',
      'analyzing',
      'detecting_moments',
      'generating_shorts',
      'preparing_editor',
      'completed',
    ],
  },
  {
    id: 'transcribe',
    label: 'Analyze transcript',
    activeStatuses: ['extracting_audio', 'transcribing', 'analyzing'],
    completedStatuses: ['detecting_moments', 'generating_shorts', 'preparing_editor', 'completed'],
  },
  {
    id: 'generate',
    label: 'Generate Shorts',
    activeStatuses: ['detecting_moments', 'generating_shorts'],
    completedStatuses: ['preparing_editor', 'completed'],
  },
  {
    id: 'prepare',
    label: 'Prepare editor',
    activeStatuses: ['preparing_editor'],
    completedStatuses: ['completed'],
  },
];

interface TranscriptionMetrics {
  backend?: string;
  device?: string;
  workerPid?: number;
  audioProcessed?: number;
  audioTotal?: number;
  words?: number;
  segments?: number;
  realtimeSpeed?: number;
  etaSeconds?: number;
  currentChunk?: number;
  totalChunks?: number;
  stallWarning?: boolean;
  stallDiagnostic?: boolean;
  stallUnhealthy?: boolean;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({
  isOpen,
  projectId,
  jobId,
  videoUrl,
  initialError,
  isDemoMode = false,
  onComplete,
  onCancel,
  onUploadVideo,
  onRetryWithDemo,
  onRetry,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [currentStageText, setCurrentStageText] = useState<string>('Validating source...');
  const [status, setStatus] = useState<string>('validating');
  const [transcriptionMetrics, setTranscriptionMetrics] = useState<TranscriptionMetrics | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [failedStage, setFailedStage] = useState<string>('validating');
  const [retryable, setRetryable] = useState<boolean>(true);
  const [suggestedAction, setSuggestedAction] = useState<string | null>(null);
  const [technicalDetails, setTechnicalDetails] = useState<any | null>(null);
  const [diagnosticId, setDiagnosticId] = useState<string | null>(null);
  const [copiedDiag, setCopiedDiag] = useState<boolean>(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [languageConfidence, setLanguageConfidence] = useState<number | null>(null);
  const [authConfigured, setAuthConfigured] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(jobId || null);
  const isPollingRef = useRef<boolean>(false);

  useEffect(() => {
    if (initialError) {
      if (typeof initialError === 'object' && initialError !== null) {
        setErrorMessage(initialError.message || 'Processing failed.');
        setErrorCode(initialError.code || 'UNKNOWN_INGESTION_ERROR');
        setFailedStage(initialError.stage || 'validating');
        setRetryable(initialError.retryable ?? true);
        setSuggestedAction(initialError.suggestedAction || null);
        setTechnicalDetails(initialError.details || initialError.rawResponseExcerpt || initialError.stack);
        setDiagnosticId(initialError.diagnosticId || null);
      } else {
        const str = String(initialError);
        setErrorMessage(str);
        setErrorCode(str.includes('not found') ? 'VIDEO_NOT_FOUND' : 'UNKNOWN_INGESTION_ERROR');
      }
      setLogs((prev) => {
        if (prev.length === 0) {
          const now = new Date().toLocaleTimeString('en-US', { hour12: false });
          return [
            { time: now, message: `Started pipeline validation for: ${videoUrl || 'submitted source'}`, type: 'info' },
            { time: now, message: `Pipeline stopped: ${typeof initialError === 'object' ? initialError.message : initialError}`, type: 'error' },
          ];
        }
        return prev;
      });
    }
  }, [initialError, videoUrl]);

  useEffect(() => {
    if (jobId) {
      setActiveJobId(jobId);
    }
  }, [jobId]);

  // Polling loop
  const pollJobStatus = (targetJobId: string, targetProjId: string | null) => {
    isPollingRef.current = true;
    const pollInterval = setInterval(async () => {
      if (!isPollingRef.current) {
        clearInterval(pollInterval);
        return;
      }

      try {
        const endpoint = targetJobId ? `/api/process/${targetJobId}` : `/api/projects/${targetProjId}/status`;
        const statusRes = await fetch(endpoint);
        const statusData = await parseSafeApiResponse<any>(statusRes);

        setProgress(statusData.progress ?? 0);
        setStatus(statusData.status || 'validating');
        if (statusData.currentStage) {
          setCurrentStageText(statusData.currentStage);
        }
        if (statusData.transcriptionMetrics) {
          setTranscriptionMetrics(statusData.transcriptionMetrics);
        }
        if (statusData.detectedLanguage) {
          setDetectedLanguage(statusData.detectedLanguage);
        }
        if (statusData.languageConfidence !== undefined && statusData.languageConfidence !== null) {
          setLanguageConfidence(statusData.languageConfidence);
        }
        if (Array.isArray(statusData.logs) && statusData.logs.length > 0) {
          setLogs(statusData.logs);
        }

        if (statusData.status === 'completed') {
          clearInterval(pollInterval);
          isPollingRef.current = false;
          if (statusData.project && statusData.project.shorts && statusData.project.shorts.length > 0) {
            onComplete(statusData.project);
          } else {
            const finalProjId = statusData.projectId || targetProjId;
            const projRes = await fetch(`/api/projects/${finalProjId}`);
            if (projRes.ok) {
              const projData = await parseSafeApiResponse<any>(projRes);
              onComplete(projData.project);
            }
          }
        } else if (statusData.status === 'failed' || statusData.success === false) {
          clearInterval(pollInterval);
          isPollingRef.current = false;
          const errObj = typeof statusData.error === 'object' && statusData.error !== null ? statusData.error : null;
          const resolvedMsg = errObj?.message || (typeof statusData.error === 'string' ? statusData.error : null) || statusData.message || 'Video processing failed.';
          const resolvedCode = errObj?.code || statusData.errorCode || (statusData.classifiedError?.code) || 'UNKNOWN_INGESTION_ERROR';
          const resolvedRetryable = typeof errObj?.retryable === 'boolean' ? errObj.retryable : (statusData.classifiedError ? statusData.classifiedError.retryable : true);
          const resolvedAction = errObj?.suggestedAction || statusData.classifiedError?.suggestedAction;

          setErrorMessage(resolvedMsg);
          setErrorCode(resolvedCode);
          setFailedStage(statusData.stage || statusData.status || 'ingesting');
          setRetryable(resolvedRetryable);
          setSuggestedAction(resolvedAction || null);
          setTechnicalDetails(statusData.classifiedError || statusData.error || statusData);
          setAuthConfigured(Boolean(statusData.authConfigured));
        } else if (statusData.status === 'cancelled') {
          clearInterval(pollInterval);
          isPollingRef.current = false;
          setCurrentStageText('Processing cancelled.');
        }
      } catch (pollErr: any) {
        console.warn('Status polling notice:', pollErr);
        if (pollErr instanceof ApiError) {
          setLogs((prev) => [
            ...prev,
            { time: new Date().toLocaleTimeString('en-US', { hour12: false }), message: `Notice: ${pollErr.message}`, type: 'warn' },
          ]);
        }
      }
    }, 600);

    return pollInterval;
  };

  // Observe or resume processing
  useEffect(() => {
    if (!isOpen) {
      isPollingRef.current = false;
      setActiveJobId(null);
      setProgress(0);
      setLogs([]);
      setErrorMessage(null);
      setErrorCode(null);
      setTechnicalDetails(null);
      setDiagnosticId(null);
      return;
    }

    if (activeJobId) {
      pollJobStatus(activeJobId, projectId);
    } else if (!initialError) {
      setCurrentStageText('Connecting to server processing pipeline...');
      setStatus('validating');
      const now = new Date().toLocaleTimeString('en-US', { hour12: false });
      setLogs([
        { time: now, message: `Connecting to server pipeline for: ${videoUrl || 'media source'}`, type: 'info' },
      ]);
    }

    return () => {
      isPollingRef.current = false;
    };
  }, [isOpen, activeJobId, projectId, initialError]);

  if (!isOpen) return null;

  const handleCopyDiagnostics = () => {
    const diagData = {
      jobId: activeJobId,
      projectId,
      url: videoUrl,
      errorCode,
      failedStage,
      errorMessage,
      retryable,
      suggestedAction,
      diagnosticId,
      timestamp: new Date().toISOString(),
      logs,
      technicalDetails,
    };
    navigator.clipboard?.writeText(JSON.stringify(diagData, null, 2)).then(() => {
      setCopiedDiag(true);
      setTimeout(() => setCopiedDiag(false), 2000);
    }).catch(() => {});
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setErrorMessage(null);
    setErrorCode(null);
    setTechnicalDetails(null);
    setActiveJobId(null);
    if (onRetry) {
      onRetry();
    } else if (isDemoMode && onRetryWithDemo) {
      onRetryWithDemo();
    }
    setIsRetrying(false);
  };

  const handleCancelJob = async () => {
    isPollingRef.current = false;
    try {
      if (activeJobId) {
        await fetch(`/api/process/${activeJobId}/cancel`, { method: 'POST' });
      }
      if (projectId) {
        await fetch(`/api/projects/${projectId}/cancel`, { method: 'POST' });
      }
    } catch (e) {
      console.warn('Error cancelling job:', e);
    }
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                errorMessage
                  ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                  : 'bg-amber-400/10 border border-amber-400/30 text-amber-400'
              }`}
            >
              {errorMessage ? (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              ) : (
                <Sparkles className="w-5 h-5 animate-spin" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                {errorMessage ? 'PROCESSING FAILED' : 'PROCESSING'}
                {!errorMessage && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                    {progress}%
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400">
                {errorMessage
                  ? 'The pipeline stopped because the input could not be processed'
                  : 'Real server-side media processing and AI moment detection'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="text-neutral-500 hover:text-neutral-300 p-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real Progress Bar */}
        <div className="w-full bg-neutral-950 h-2 relative overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ease-out ${
              errorMessage
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400'
            }`}
            style={{ width: `${errorMessage ? 100 : progress}%` }}
          />
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {/* Error Banner if Failed */}
          {errorMessage ? (() => {
            const mappedInfo = errorCode && ERROR_DESCRIPTIONS[errorCode]
              ? ERROR_DESCRIPTIONS[errorCode]
              : null;

            const isAuthError =
              errorCode === 'AUTHENTICATION_REQUIRED' ||
              errorCode === 'VIDEO_RESTRICTED' ||
              errorCode === 'YOUTUBE_AGE_RESTRICTED' ||
              errorCode === 'YOUTUBE_LOGIN_REQUIRED';

            const displayTitle = mappedInfo?.title || 'Media Ingestion Error';
            const displayExplanation = errorMessage || mappedInfo?.defaultMessage || 'The pipeline stopped because the input could not be processed.';
            const actionText = suggestedAction || mappedInfo?.defaultAction || 'Please retry or upload the video directly.';
            const canRetry = retryable && (!isAuthError || authConfigured);

            return (
              <div className="p-5 rounded-2xl bg-neutral-950 border border-rose-500/30 text-rose-200 space-y-4 shadow-xl">
                {/* Header & Badges */}
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-rose-100">{displayTitle}</h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {errorCode && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                            {errorCode}
                          </span>
                        )}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                          Stage: {failedStage}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            canRetry
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                          }`}
                        >
                          {canRetry ? 'Retryable' : 'Non-Retryable'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-rose-300/90 leading-relaxed font-mono">
                      {displayExplanation}
                    </p>
                  </div>
                </div>

                {/* Job ID Bar if available */}
                {activeJobId && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono">
                    <span className="text-neutral-400">
                      Job ID: <span className="text-amber-400 font-bold">{activeJobId}</span>
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(activeJobId);
                      }}
                      className="text-[11px] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy Job ID"
                    >
                      Copy ID
                    </button>
                  </div>
                )}

                {/* Suggested Action Box */}
                <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-200/90 space-y-1 text-xs">
                  <div className="font-bold text-amber-300 text-[11px] uppercase tracking-wide">
                    Suggested Action
                  </div>
                  <div className="text-amber-200 leading-relaxed">
                    {actionText}
                  </div>
                </div>

                {/* Expandable Technical Details */}
                {(technicalDetails || diagnosticId || errorCode) && (
                  <details className="group rounded-xl bg-neutral-900/90 border border-neutral-800 overflow-hidden">
                    <summary className="px-3.5 py-2.5 text-xs text-neutral-400 hover:text-neutral-200 cursor-pointer select-none flex items-center justify-between font-mono">
                      <span>Technical Diagnostic Details</span>
                      <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="p-3.5 pt-1 text-[11px] font-mono text-neutral-300 border-t border-neutral-800/80 space-y-2 bg-neutral-950/40">
                      {diagnosticId && (
                        <div>
                          <span className="text-neutral-500">Diagnostic ID: </span>
                          <span className="text-amber-400">{diagnosticId}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-neutral-500">Pipeline Stage: </span>
                        <span>{failedStage}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Target Source: </span>
                        <span className="break-all">{videoUrl}</span>
                      </div>
                      {technicalDetails && (
                        <div>
                          <div className="text-neutral-500 mb-1">Server Diagnostics / Stack:</div>
                          <pre className="p-2 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400 overflow-x-auto whitespace-pre-wrap max-h-40">
                            {typeof technicalDetails === 'string'
                              ? technicalDetails
                              : JSON.stringify(technicalDetails, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-neutral-800">
                  {onUploadVideo && (
                    <button
                      onClick={onUploadVideo}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold transition-all shadow-md shadow-amber-400/20 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Video Instead</span>
                    </button>
                  )}
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying || (isAuthError && !authConfigured)}
                    title={isAuthError && !authConfigured ? 'Authentication required to retry.' : 'Retry processing'}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                      isAuthError && !authConfigured
                        ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                        : 'bg-rose-500 hover:bg-rose-600 text-white cursor-pointer'
                    }`}
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                    <span>{isAuthError && !authConfigured ? 'Auth Required to Retry' : 'Retry'}</span>
                  </button>
                  <button
                    onClick={handleCopyDiagnostics}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-colors cursor-pointer border border-neutral-700"
                    title="Copy diagnostic information to clipboard"
                  >
                    {copiedDiag ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
                    <span>{copiedDiag ? 'Copied Diagnostics' : 'Copy Diagnostics'}</span>
                  </button>
                  {isDemoMode && onRetryWithDemo && (
                    <button
                      onClick={onRetryWithDemo}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Try Demo</span>
                    </button>
                  )}
                  <button
                    onClick={handleCancelJob}
                    className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white text-xs font-bold transition-colors cursor-pointer ml-auto"
                  >
                    Cancel Job
                  </button>
                </div>
              </div>
            );
          })() : (
            <>
            {/* Detected Language Notification Card */}
            {detectedLanguage && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-400/10 border border-amber-400/30">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-xs text-neutral-300">
                    Detected Language: <span className="text-amber-300 font-bold capitalize">{detectedLanguage}</span>
                  </span>
                </div>
                {languageConfidence !== null && (
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    {Math.round(languageConfidence * 100)}% Confidence
                  </span>
                )}
              </div>
            )}

            {/* Live Whisper ASR Engine Card */}
            {(transcriptionMetrics || status === 'transcribing' || status === 'analyzing') && (
              <div className="p-4 rounded-xl bg-neutral-950 border border-amber-500/20 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-bold text-neutral-200">
                      {transcriptionMetrics?.backend === 'mlx-whisper' ? 'MLX Whisper (Metal GPU)' : 'Whisper ASR Engine'}
                    </span>
                    {transcriptionMetrics?.device && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 font-mono">
                        {transcriptionMetrics.device}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-400">
                    {transcriptionMetrics?.workerPid && <span>PID {transcriptionMetrics.workerPid}</span>}
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                      ACTIVE
                    </span>
                  </div>
                </div>

                {/* Sub-progress bar for transcription audio stream */}
                {transcriptionMetrics?.audioTotal && transcriptionMetrics.audioTotal > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                      <span>Audio Processed</span>
                      <span className="text-amber-400 font-bold">
                        {Math.round(transcriptionMetrics.audioProcessed || 0)}s / {Math.round(transcriptionMetrics.audioTotal)}s (
                        {Math.round(((transcriptionMetrics.audioProcessed || 0) / transcriptionMetrics.audioTotal) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden border border-neutral-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(((transcriptionMetrics.audioProcessed || 0) / transcriptionMetrics.audioTotal) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Live Performance Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
                  <div className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-800/80">
                    <div className="text-[10px] text-neutral-500 uppercase">Words</div>
                    <div className="text-neutral-200 font-bold">
                      {transcriptionMetrics?.words?.toLocaleString() || '0'}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-800/80">
                    <div className="text-[10px] text-neutral-500 uppercase">Segments</div>
                    <div className="text-neutral-200 font-bold">
                      {transcriptionMetrics?.segments?.toLocaleString() || '0'}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-800/80">
                    <div className="text-[10px] text-neutral-500 uppercase">Speed</div>
                    <div className="text-emerald-400 font-bold">
                      {transcriptionMetrics?.realtimeSpeed ? `${transcriptionMetrics.realtimeSpeed.toFixed(1)}x realtime` : 'Calculating...'}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-800/80">
                    <div className="text-[10px] text-neutral-500 uppercase">ETA</div>
                    <div className="text-amber-400 font-bold">
                      {typeof transcriptionMetrics?.etaSeconds === 'number'
                        ? `${Math.round(transcriptionMetrics.etaSeconds)}s`
                        : '--'}
                    </div>
                  </div>
                </div>

                {/* Stall Warning & Diagnostics if slow */}
                {transcriptionMetrics?.stallUnhealthy ? (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                    <span>Worker stalled (&gt;60s without heartbeat).</span>
                    <button
                      onClick={handleRetry}
                      className="px-2 py-1 rounded bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold"
                    >
                      Restart Worker
                    </button>
                  </div>
                ) : transcriptionMetrics?.stallDiagnostic ? (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
                    Whisper processing is taking longer than expected... (Backend: {transcriptionMetrics.backend || 'Local'}, chunk {transcriptionMetrics.currentChunk || 1}/{transcriptionMetrics.totalChunks || 1})
                  </div>
                ) : transcriptionMetrics?.stallWarning ? (
                  <div className="p-1.5 rounded bg-neutral-900 text-neutral-400 text-[10px] italic">
                    Transcribing dense audio sequence...
                  </div>
                ) : null}
              </div>
            )}

            {/* Active Observable Checklist */}
            <div className="space-y-2.5 p-4 rounded-xl bg-neutral-950/70 border border-neutral-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Pipeline Stages
              </div>
              {CHECKLIST_STAGES.map((step) => {
                const isDone = step.completedStatuses.includes(status);
                const isActive = step.activeStatuses.includes(status);

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-amber-400/10 border border-amber-400/30 text-amber-300 font-semibold'
                        : isDone
                        ? 'text-neutral-200'
                        : 'text-neutral-500'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : isActive ? (
                      <ArrowRight className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-neutral-600 flex-shrink-0" />
                    )}
                    <span className="text-xs">{step.label}</span>
                    {isActive && (
                      <span className="ml-auto text-[10px] text-amber-400/80 font-mono">
                        {currentStageText}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            </>
          )}

          {/* Real Backend Logs Console */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
              <span>SYSTEM EVENT LOGS</span>
              <span className="text-[11px] text-amber-400/80">{logs.length} events logged</span>
            </div>
            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 font-mono text-xs max-h-36 overflow-y-auto space-y-1.5">
              {logs.length === 0 ? (
                <div className="text-neutral-500 italic">Initializing pipeline on server...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-neutral-500 text-[10px] mt-0.5">{log.time}</span>
                    <span
                      className={`text-xs ${
                        log.type === 'success'
                          ? 'text-emerald-400'
                          : log.type === 'warn'
                          ? 'text-amber-400'
                          : log.type === 'error'
                          ? 'text-rose-400'
                          : 'text-neutral-300'
                      }`}
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between">
          <span className="text-xs text-neutral-500">
            {status === 'completed'
              ? 'Shorts ready for review'
              : errorMessage
              ? 'Action required to proceed'
              : 'Processing actual media on server'}
          </span>
          <button
            onClick={handleCancelJob}
            className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition-colors cursor-pointer"
          >
            Cancel Job
          </button>
        </div>
      </div>
    </div>
  );
};
