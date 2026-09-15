/**
 * VIRALCLIP STUDIO — UNIFIED API CLIENT
 * Ensures all API calls use same-origin relative `/api/...` paths in production
 * or optional VITE_API_BASE_URL when frontend and backend are hosted on separate domains.
 */

export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const envBase = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) ||
    '';
  const baseUrl = envBase.replace(/\/+$/, '');
  return baseUrl ? `${baseUrl}${cleanEndpoint}` : cleanEndpoint;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = getApiUrl(endpoint);
  const headers = new Headers(options?.headers || {});

  if (!headers.has('Content-Type') && !(options?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.message || errorData.error || `Request to ${endpoint} failed with HTTP ${res.status}`;
    const error: any = new Error(message);
    error.status = res.status;
    error.code = errorData.code;
    error.details = errorData;
    throw error;
  }

  return res.json();
}
