import type { StoredConfig } from '../types';

const STORAGE_KEY = 'config';
const DEFAULT_CONFIG: StoredConfig = { bookmarkId: null };

// ブックマーク ID は端末ごとに振られるので storage.local に置く。
// sync に置くと別端末で選んだ ID が同期で届き、この端末の無関係なブックマークを書き換えうる。
export async function getConfig(): Promise<StoredConfig> {
  const local = await chrome.storage.local.get(STORAGE_KEY);
  const stored = local[STORAGE_KEY] as Partial<StoredConfig> | undefined;
  if (stored === undefined) await discardSyncedConfig();
  return { ...DEFAULT_CONFIG, ...stored };
}

export async function setConfig(patch: Partial<StoredConfig>): Promise<StoredConfig> {
  const current = await getConfig();
  const next: StoredConfig = { ...current, ...patch };
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

// 0.1.x は storage.sync に保存していた。その ID は別端末で選ばれたものかもしれないので
// local へは引き継がずに消し、端末ごとに選び直してもらう。
// remove は sync の書き込みクォータを消費するので、キーが残っているときだけ呼ぶ。
async function discardSyncedConfig(): Promise<void> {
  const synced = await chrome.storage.sync.get(STORAGE_KEY);
  if (synced[STORAGE_KEY] === undefined) return;
  await chrome.storage.sync.remove(STORAGE_KEY);
}
