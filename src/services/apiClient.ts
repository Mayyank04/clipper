/**
 * VIRALCLIP STUDIO / CIPHER — UNIFIED API CLIENT
 * Supports same-origin relative `/api/...` paths or optional VITE_API_BASE_URL.
 * Provides authenticated workspace namespaces (/api/v1/workspaces/:workspaceId).
 */

import { parseSafeApiResponse } from '../utils/safeResponseHelper';

let activeWorkspaceId = 'ws_default';
let activeAuthToken: string | null = null;

export function getActiveWorkspaceId(): string {
  return activeWorkspaceId;
}

export function setActiveWorkspaceId(wsId: string): void {
  activeWorkspaceId = wsId;
}

export function getAuthToken(): string | null {
  return activeAuthToken;
}

export function setAuthToken(token: string | null): void {
  activeAuthToken = token;
}

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

  if (activeAuthToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${activeAuthToken}`);
  }

  if (activeWorkspaceId && !headers.has('x-workspace-id')) {
    headers.set('x-workspace-id', activeWorkspaceId);
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  return parseSafeApiResponse<T>(res);
}

/**
 * Strongly-typed API v1 workspace client (Master Plan Section 8)
 */
export const v1 = {
  getCapabilities: () => apiRequest('/api/v1/capabilities'),

  projects: {
    list: (wsId = activeWorkspaceId) =>
      apiRequest<{ success: boolean; workspaceId: string; projects: any[] }>(
        `/api/v1/workspaces/${wsId}/projects`
      ),

    get: (id: string, wsId = activeWorkspaceId) =>
      apiRequest<{ success: boolean; project: any }>(
        `/api/v1/workspaces/${wsId}/projects/${id}`
      ),

    create: (project: any, wsId = activeWorkspaceId) =>
      apiRequest<{ success: boolean; project: any }>(
        `/api/v1/workspaces/${wsId}/projects`,
        {
          method: 'POST',
          body: JSON.stringify({ project }),
        }
      ),

    update: (id: string, updates: any, wsId = activeWorkspaceId) =>
      apiRequest<{ success: boolean; project: any }>(
        `/api/v1/workspaces/${wsId}/projects/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ project: updates }),
        }
      ),

    delete: (id: string, wsId = activeWorkspaceId) =>
      apiRequest<{ success: boolean; deleted: boolean }>(
        `/api/v1/workspaces/${wsId}/projects/${id}`,
        {
          method: 'DELETE',
        }
      ),
  },

  media: {
    get: (id: string, wsId = activeWorkspaceId) =>
      apiRequest<{ success: boolean; media: any }>(
        `/api/v1/workspaces/${wsId}/media/${id}`
      ),
  },

  revisions: {
    save: (data: { projectId: string; clipId?: string; manifest: any; compositionHash?: string }, wsId = activeWorkspaceId) =>
      apiRequest<{ success: boolean; revisionId: string; revision: any }>(
        `/api/v1/workspaces/${wsId}/revisions`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      ),
  },
};
