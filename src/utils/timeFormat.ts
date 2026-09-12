/**
 * Safe, robust time formatting for the ViralClip editor.
 * Guarantees that NaN, undefined, or Infinity are never rendered in the UI.
 */

export function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return '00:00';
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatTimeWithTenths(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return '00:00.0';
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  const tenths = Math.floor((value % 1) * 10);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}
