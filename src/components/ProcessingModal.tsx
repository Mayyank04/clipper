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
} from 'lucide-react';

interface ProcessingModalProps {
  isOpen: boolean;
  projectId: string | null;
  jobId?: string | null;
  videoUrl: string;
  initialError?: string | null;
  isDemoMode?: boolean;
  onComplete: (projectData: any) => void;
  onCancel: () => void;
  onUploadVideo?: () => void;
  onRetryWithDemo?: () => void;
}

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

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
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [currentStageText, setCurrentStageText] = useState<string>('Validating source...');
  const [status, setStatus] = useState<string>('validating');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [authConfigured, setAuthConfigured] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(jobId || null);
  const isPollingRef = useRef<boolean>(false);

  useEffect(() => {
    if (initialError) {
      setErrorMessage(initialError);
    }
  }, [initialError]);

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
        if (!statusRes.ok) {
          const errJson = await statusRes.json().catch(() => ({}));
          throw new Error(errJson.error || errJson.message || 'Could not fetch job status');
        }

        const statusData = await statusRes.json();
        setProgress(statusData.progress ?? 0);
        setStatus(statusData.status || 'validating');
        if (statusData.currentStage) {
          setCurrentStageText(statusData.currentStage);
        }
        if (Array.isArray(statusData.logs)) {
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
              const projData = await projRes.json();
              onComplete(projData.project);
            }
          }
        } else if (statusData.status === 'failed') {
          clearInterval(pollInterval);
          isPollingRef.current = false;
          setErrorMessage(statusData.error || 'The video processing job failed on the backend.');
          setErrorCode(statusData.errorCode || null);
          setAuthConfigured(Boolean(statusData.authConfigured));
        } else if (statusData.status === 'cancelled') {
          clearInterval(pollInterval);
          isPollingRef.current = false;
          setCurrentStageText('Processing cancelled.');
        }
      } catch (pollErr: any) {
        console.warn('Status polling error:', pollErr);
      }
    }, 500);

    return pollInterval;
  };

  // Kick off or resume processing
  const initiateProcessing = async () => {
    setErrorMessage(null);
    setErrorCode(null);
    setProgress(0);
    setStatus('validating');
    setCurrentStageText('Validating source input...');

    try {
      if (activeJobId) {
        pollJobStatus(activeJobId, projectId);
        return;
      }

      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          youtubeUrl: videoUrl,
          isDemo: isDemoMode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || data.message || 'Failed to initiate processing job on backend');
        setErrorCode(data.code || null);
        setAuthConfigured(Boolean(data.authConfigured));
        return;
      }

      const newJobId = data.jobId;
      setActiveJobId(newJobId);
      pollJobStatus(newJobId, data.projectId || projectId);
    } catch (err: any) {
      console.error('Job initiation error:', err);
      setErrorMessage(err.message || 'Failed to initiate processing job on backend');
    }
  };

  useEffect(() => {
    if (!isOpen) {
      isPollingRef.current = false;
      return;
    }

    if (initialError) {
      return;
    }

    initiateProcessing();

    return () => {
      isPollingRef.current = false;
    };
  }, [isOpen, activeJobId, projectId]);

  if (!isOpen) return null;

  const handleRetry = async () => {
    setIsRetrying(true);
    setErrorMessage(null);
    setActiveJobId(null);
    await initiateProcessing();
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
            const isAuthError =
              errorCode === 'YOUTUBE_AGE_RESTRICTED' ||
              errorCode === 'YOUTUBE_LOGIN_REQUIRED' ||
              errorCode === 'YOUTUBE_COOKIE_REQUIRED' ||
              Boolean(errorMessage && (
                errorMessage.toLowerCase().includes('age-restricted') ||
                errorMessage.toLowerCase().includes('confirm your age') ||
                errorMessage.toLowerCase().includes('requires authentication')
              ));

            let errorTitle = 'Media Ingestion Error';
            let errorDisplayMsg = errorMessage;

            if (errorCode === 'YOUTUBE_AGE_RESTRICTED' || (errorMessage && errorMessage.toLowerCase().includes('confirm your age'))) {
              errorTitle = 'YouTube Video Requires Authentication';
              errorDisplayMsg = 'This video is age-restricted or requires a signed-in YouTube session. ViralClip Studio could not access it with the current server configuration.';
            } else if (errorCode === 'YOUTUBE_PRIVATE' || (errorMessage && errorMessage.toLowerCase().includes('private video'))) {
              errorTitle = 'Private YouTube Video';
              errorDisplayMsg = 'This video is private or members-only. Upload the video file instead.';
            } else if (errorCode === 'YOUTUBE_NOT_FOUND' || (errorMessage && (errorMessage.toLowerCase().includes('unavailable') || errorMessage.toLowerCase().includes('not exist')))) {
              errorTitle = 'Video Unavailable';
              errorDisplayMsg = 'This YouTube video was not found or has been removed. Check the link or upload the video directly.';
            } else if (errorCode === 'YOUTUBE_GEO_BLOCKED') {
              errorTitle = 'Geographically Restricted';
              errorDisplayMsg = 'This YouTube video is geographically restricted in this server’s region. Upload the video file instead.';
            } else if (errorCode === 'YOUTUBE_RATE_LIMITED') {
              errorTitle = 'YouTube Rate Limited';
              errorDisplayMsg = 'YouTube has temporarily rate-limited requests from this server. Please try again later or upload the video file directly.';
            } else if (errorCode === 'YOUTUBE_PO_TOKEN_REQUIRED') {
              errorTitle = 'YouTube Stream Verification Required';
              errorDisplayMsg = 'YouTube restricted download stream due to Proof-of-Origin token verification. Upload the video file instead.';
            }

            return (
              <div className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <div className="text-sm font-bold text-rose-100 flex items-center justify-between">
                      <span>{errorTitle}</span>
                      {errorCode && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                          {errorCode}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-rose-300 leading-relaxed font-mono">{errorDisplayMsg}</div>
                    {!authConfigured && isAuthError && (
                      <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-amber-500/30 text-[11px] text-amber-300/90 font-mono">
                        Authenticated YouTube import is not configured on this server.
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-500/20">
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
                    title={isAuthError && !authConfigured ? 'Authentication is required before retrying.' : 'Retry processing'}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                      isAuthError && !authConfigured
                        ? 'bg-neutral-800/80 text-neutral-500 cursor-not-allowed border border-neutral-700'
                        : 'bg-rose-500 hover:bg-rose-600 text-white cursor-pointer'
                    }`}
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                    <span>{isAuthError && !authConfigured ? 'Auth Required to Retry' : 'Retry'}</span>
                  </button>
                  {isDemoMode && onRetryWithDemo && (
                    <button
                      onClick={onRetryWithDemo}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Try Demo Mode</span>
                    </button>
                  )}
                  <button
                    onClick={handleCancelJob}
                    className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white text-xs font-bold transition-colors cursor-pointer ml-auto"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          })() : (
            /* Active Observable Checklist */
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
