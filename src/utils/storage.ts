import { VideoProject, BrandKit, ExportSettings } from '../types';
import { SAMPLE_PROJECTS } from '../data/sampleProjects';

const PROJECTS_STORAGE_KEY = 'viralclip_projects_v4';
const BRAND_KIT_STORAGE_KEY = 'viralclip_brandkit_v4';
const EXPORT_HISTORY_KEY = 'viralclip_exports_v4';

export const DEFAULT_BRAND_KIT: BrandKit = {
  brandName: '',
  primaryColor: '#facc15',
  secondaryColor: '#38bdf8',
  accentColor: '#f43f5e',
  fontFamily: 'Lemon Milk',
  watermarkPosition: 'top-right',
  watermarkOpacity: 80,
  watermarkText: '',
  enabled: false,
};

export function loadStoredProjects(): VideoProject[] {
  try {
    // Clear out old legacy keys if present
    localStorage.removeItem('viralclip_projects_v1');
    localStorage.removeItem('viralclip_projects_v2');
    localStorage.removeItem('viralclip_projects_v3');

    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Sanitize URLs without destroying real user uploads or substituting fake demo media
        return parsed.map((p) => {
          let updatedUrl = p.videoUrl;
          if (updatedUrl && updatedUrl.startsWith('/public/')) {
            updatedUrl = updatedUrl.replace('/public/', '/');
          }

          const isEphemeralBlob = updatedUrl?.startsWith('blob:');
          const isUnavailable = !updatedUrl || isEphemeralBlob;

          const updatedShorts = (p.shorts || []).map((s: any) => {
            let proxy = s.videoProxyUrl || updatedUrl;
            if (proxy && proxy.startsWith('/public/')) {
              proxy = proxy.replace('/public/', '/');
            }
            const sStart = Number.isFinite(s.startTime) ? s.startTime : 0;
            const sEnd = Number.isFinite(s.endTime) ? s.endTime : (sStart + (s.duration || 28));
            const sDur = Number.isFinite(s.duration) && s.duration > 0 ? s.duration : Math.max(1, sEnd - sStart);

            return {
              ...s,
              videoProxyUrl: proxy,
              duration: sDur,
              startTime: sStart,
              endTime: sEnd,
              mediaUnavailable: p.demoMode ? false : isUnavailable,
            };
          });

          return {
            ...p,
            videoUrl: updatedUrl,
            mediaUnavailable: p.demoMode ? false : isUnavailable,
            shorts: updatedShorts,
          };
        });
      }
      if (Array.isArray(parsed) && parsed.length === 0) {
        return [];
      }
    }
  } catch (err) {
    console.warn('Could not load stored projects:', err);
  }
  return [];
}

export function saveStoredProjects(projects: VideoProject[]): void {
  try {
    // Persist projects as-is without mutating source URLs into demo media
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch (err) {
    console.warn('Failed to save projects to localStorage:', err);
  }
}

export function loadStoredBrandKit(): BrandKit {
  try {
    const raw = localStorage.getItem(BRAND_KIT_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_BRAND_KIT, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Could not load brand kit, using default:', err);
  }
  return DEFAULT_BRAND_KIT;
}

export function saveStoredBrandKit(kit: BrandKit): void {
  try {
    localStorage.setItem(BRAND_KIT_STORAGE_KEY, JSON.stringify(kit));
  } catch (err) {
    console.warn('Failed to save brand kit to localStorage:', err);
  }
}

export interface StoredExport {
  id: string;
  shortId: string;
  title: string;
  resolution: string;
  fps: number;
  timestamp: string;
  downloadUrl: string;
}

export function loadExportHistory(): StoredExport[] {
  try {
    const raw = localStorage.getItem(EXPORT_HISTORY_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load export history:', err);
  }
  return [];
}

export function recordExport(exp: StoredExport): void {
  try {
    const current = loadExportHistory();
    const updated = [exp, ...current.slice(0, 49)];
    localStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to record export in history:', err);
  }
}
