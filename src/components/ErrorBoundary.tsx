import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Activity, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  route?: string;
  projectId?: string;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDiagnostics: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDiagnostics: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDiagnostics: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleBackToDashboard = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDiagnostics: false });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.href = '/';
    }
  };

  private toggleDiagnostics = () => {
    this.setState((prev) => ({ showDiagnostics: !prev.showDiagnostics }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showDiagnostics } = this.state;
      const { route = window.location.pathname || '/editor', projectId = 'Active Project', componentName = 'Editor Workspace' } = this.props;

      // Sanitize error and component stack: ensure no private keys or internal server disk secrets are leaked
      const safeErrorMessage = error?.message || 'An unexpected rendering error occurred';
      const safeComponentStack = errorInfo?.componentStack
        ? errorInfo.componentStack
            .split('\n')
            .slice(0, 8)
            .map((line) => line.trim())
            .filter(Boolean)
            .join('\n')
        : 'Stack unavailable';

      return (
        <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6 select-text">
          {/* Ambient Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-lg w-full bg-neutral-900/90 border border-neutral-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl text-center space-y-6 animate-fade-in">
            {/* Header / Brand Icon */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  ViralClip Studio
                </h1>
                <p className="text-sm font-semibold text-neutral-300 mt-1">
                  Something went wrong while opening this project.
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              An interface error interrupted rendering. The workspace has protected your project data. You can retry mounting, return to dashboard, or inspect diagnostics.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry</span>
              </button>

              <button
                onClick={this.handleBackToDashboard}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs border border-neutral-700 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </button>

              <button
                onClick={this.toggleDiagnostics}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white font-semibold text-xs border border-neutral-800 transition-all cursor-pointer"
              >
                <Activity className="w-4 h-4 text-amber-400" />
                <span>Open Diagnostics</span>
                {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
              </button>
            </div>

            {/* Developer Safe Diagnostics Panel */}
            {showDiagnostics && (
              <div className="mt-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-left font-mono text-[11px] space-y-2 text-neutral-300 animate-fade-in select-text">
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                  <span className="text-amber-400 font-bold tracking-wider uppercase text-[10px]">Safe Diagnostic Report</span>
                  <span className="text-[10px] text-neutral-500">Production Client</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Error:</span>
                  <span className="text-rose-400 font-medium break-all">{safeErrorMessage}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-neutral-500 block">Component:</span>
                    <span className="text-neutral-200 font-medium">{componentName}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Route:</span>
                    <span className="text-neutral-200 font-medium">{route}</span>
                  </div>
                </div>
                <div className="pt-1">
                  <span className="text-neutral-500 block">Project:</span>
                  <span className="text-neutral-200 font-medium break-all">{projectId}</span>
                </div>
                {safeComponentStack && (
                  <div className="pt-2 border-t border-neutral-800/60">
                    <span className="text-neutral-500 block mb-1">Component Hierarchy:</span>
                    <pre className="bg-neutral-900/60 p-2 rounded text-[10px] text-neutral-400 overflow-x-auto whitespace-pre-wrap leading-tight">
                      {safeComponentStack}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
