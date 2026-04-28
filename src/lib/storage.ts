import type { StoredConfig } from '../types';

const STORAGE_KEY = 'config';
const DEFAULT_CONFIG: StoredConfig = { bookmarkId: null };

export async function getConfig(): Promise<StoredConfig> {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Partial<StoredConfig> | undefined;
  return { ...DEFAULT_CONFIG, ...stored };
}

export async function setConfig(patch: Partial<StoredConfig>): Promise<StoredConfig> {
  const current = await getConfig();
  const next: StoredConfig = { ...current, ...patch };
  await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  return next;
}
