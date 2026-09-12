import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Global uncaught error listener to ensure console details are always logged and stored safely
window.addEventListener('error', (event) => {
  console.error('[Global window.onerror]:', event.error || event.message);
  (window as any).__LAST_ERROR__ = {
    message: event.message,
    error: event.error?.stack || String(event.error),
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    time: Date.now(),
  };
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global unhandledrejection]:', event.reason);
  (window as any).__LAST_PROMISE_REJECTION__ = {
    reason: event.reason instanceof Error ? event.reason.stack : String(event.reason),
    time: Date.now(),
  };
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary componentName="RootApplication" route="/">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
