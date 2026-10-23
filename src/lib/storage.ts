import type { StoredConfig } from '../types';

const STORAGE_KEY = 'config';
const DEFAULT_CONFIG: StoredConfig = { bookmarkId: null };

// ブックマーク ID は端末ごとに振られるので storage.local に置く。
// sync に置くと別端末で選んだ ID が同期で届き、この端末の無関係なブックマークを書き換えうる。
export async function getConfig(): Promise<StoredConfig> {
  const local = await chrome.storage.local.get(STORAGE_KEY);
  const stored =
    (local[STORAGE_KEY] as Partial<StoredConfig> | undefined) ?? (await migrateFromSync());
  return { ...DEFAULT_CONFIG, ...stored };
}

export async function setConfig(patch: Partial<StoredConfig>): Promise<StoredConfig> {
  const current = await getConfig();
  const next: StoredConfig = { ...current, ...patch };
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

// 0.1.x は storage.sync に保存していた。初回だけ local へ移し、sync 側は消す。
async function migrateFromSync(): Promise<Partial<StoredConfig> | undefined> {
  const synced = await chrome.storage.sync.get(STORAGE_KEY);
  const stored = synced[STORAGE_KEY] as Partial<StoredConfig> | undefined;
  if (stored === undefined) return undefined;
  await chrome.storage.local.set({ [STORAGE_KEY]: stored });
  await chrome.storage.sync.remove(STORAGE_KEY);
  return stored;
}
