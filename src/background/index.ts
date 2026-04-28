import { getConfig } from '../lib/storage';

const BADGE_SUCCESS = '✓';
const BADGE_ERROR = '!';
const COLOR_SUCCESS = '#22c55e';
const COLOR_ERROR = '#ef4444';
const SUCCESS_DURATION_MS = 1500;
const ERROR_DURATION_MS = 2000;

chrome.action.onClicked.addListener((tab) => {
  void handleClick(tab);
});

async function handleClick(tab: chrome.tabs.Tab): Promise<void> {
  const tabId = tab.id;
  const url = tab.url;

  const { bookmarkId } = await getConfig();
  if (!bookmarkId) {
    await flashBadge(tabId, BADGE_ERROR, COLOR_ERROR, ERROR_DURATION_MS);
    await chrome.runtime.openOptionsPage();
    return;
  }

  if (!url || !/^https?:\/\//.test(url)) {
    await flashBadge(tabId, BADGE_ERROR, COLOR_ERROR, ERROR_DURATION_MS);
    return;
  }

  try {
    await chrome.bookmarks.update(bookmarkId, { url });
  } catch {
    await flashBadge(tabId, BADGE_ERROR, COLOR_ERROR, ERROR_DURATION_MS);
    await chrome.runtime.openOptionsPage();
    return;
  }

  await flashBadge(tabId, BADGE_SUCCESS, COLOR_SUCCESS, SUCCESS_DURATION_MS);
}

async function flashBadge(
  tabId: number | undefined,
  text: string,
  color: string,
  durationMs: number,
): Promise<void> {
  const target = tabId !== undefined ? { tabId } : {};
  await chrome.action.setBadgeBackgroundColor({ color, ...target });
  await chrome.action.setBadgeText({ text, ...target });
  setTimeout(() => {
    void chrome.action.setBadgeText({ text: '', ...target });
  }, durationMs);
}
