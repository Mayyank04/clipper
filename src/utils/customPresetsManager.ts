import { CaptionStyleDefinition } from './captionEngine';
import { CaptionCustomization, CaptionStylePreset } from '../types';

const STORAGE_KEY_FAVORITES = 'viralclip_favorite_presets';
const STORAGE_KEY_RECENT = 'viralclip_recent_presets';
const STORAGE_KEY_CUSTOM = 'viralclip_custom_presets';

export function getFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FAVORITES);
    return raw ? JSON.parse(raw) : ['punch_pop', 'mr_beast_viral', 'hormozi_bold', 'desi_punch'];
  } catch {
    return ['punch_pop', 'mr_beast_viral'];
  }
}

export function toggleFavorite(presetId: string): string[] {
  try {
    const current = getFavorites();
    const updated = current.includes(presetId)
      ? current.filter((id) => id !== presetId)
      : [...current, presetId];
    localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function getRecentlyUsed(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECENT);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentlyUsed(presetId: string): string[] {
  try {
    const current = getRecentlyUsed().filter((id) => id !== presetId);
    const updated = [presetId, ...current].slice(0, 12);
    localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function getCustomPresets(): CaptionStyleDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomPreset(
  name: string,
  config: CaptionCustomization
): CaptionStyleDefinition {
  const id = `custom_${Date.now()}`;
  const newPreset: CaptionStyleDefinition = {
    id,
    name: name.trim() || 'My Custom Preset',
    desc: 'User created custom preset',
    category: 'custom',
    config: {
      ...config,
      preset: id as CaptionStylePreset,
      style: id,
    },
  };
  const list = getCustomPresets();
  const updated = [newPreset, ...list];
  localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(updated));
  return newPreset;
}

export function deleteCustomPreset(id: string): CaptionStyleDefinition[] {
  const list = getCustomPresets().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(list));
  return list;
}

export function exportPresetsJson(presets: CaptionStyleDefinition[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      type: 'viralclip_presets',
      count: presets.length,
      presets,
    },
    null,
    2
  );
}

export function importPresetsJson(jsonStr: string): CaptionStyleDefinition[] {
  try {
    const parsed = JSON.parse(jsonStr);
    const incoming: CaptionStyleDefinition[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.presets)
      ? parsed.presets
      : [];

    if (incoming.length === 0) throw new Error('No valid presets found in JSON file');

    const current = getCustomPresets();
    const existingIds = new Set(current.map((c) => c.id));
    const merged = [...current];

    for (const p of incoming) {
      if (!p.id || !p.name || !p.config) continue;
      const safeId = existingIds.has(p.id) ? `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` : p.id;
      merged.push({
        ...p,
        id: safeId,
        category: 'custom',
      });
      existingIds.add(safeId);
    }

    localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(merged));
    return merged;
  } catch (err: any) {
    throw new Error(err?.message || 'Failed to parse preset JSON file');
  }
}
