import { getBookmarkLeaf, listBookmarkLeaves } from '../lib/bookmarks';
import { localizeDocument, t } from '../lib/i18n';
import { getConfig, setConfig } from '../lib/storage';
import type { BookmarkLeaf } from '../types';

const $ = <T extends HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
};

const searchInput = $<HTMLInputElement>('#search');
const listEl = $<HTMLUListElement>('#bookmark-list');
const emptyEl = $<HTMLParagraphElement>('#empty-state');
const saveBtn = $<HTMLButtonElement>('#save');
const statusEl = $<HTMLSpanElement>('#status');
const currentEl = $<HTMLParagraphElement>('#current-display');

let allBookmarks: BookmarkLeaf[] = [];
let savedId: string | null = null;
let pendingId: string | null = null;

// UI 言語ではなく実際に解決されたロケール (未対応言語なら en) を使う
document.documentElement.lang = t('locale');
localizeDocument();

void init();

async function init(): Promise<void> {
  const [config, leaves] = await Promise.all([getConfig(), listBookmarkLeaves()]);
  allBookmarks = leaves;
  savedId = config.bookmarkId;
  pendingId = savedId;

  await renderCurrent();
  renderList(filter(''));

  searchInput.addEventListener('input', () => {
    renderList(filter(searchInput.value));
  });

  listEl.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLLIElement>('li[data-id]');
    if (!target) return;
    pendingId = target.dataset.id ?? null;
    updateSelectionUi();
  });

  saveBtn.addEventListener('click', () => {
    void handleSave();
  });
}

async function renderCurrent(): Promise<void> {
  if (!savedId) {
    currentEl.textContent = t('unset');
    currentEl.classList.add('current-display--unset');
    return;
  }
  const leaf = await getBookmarkLeaf(savedId);
  currentEl.classList.remove('current-display--unset');
  if (!leaf) {
    currentEl.textContent = t('bookmarkNotFound', savedId);
    return;
  }
  currentEl.textContent = `${leaf.title}  —  ${leaf.url}`;
}

function filter(query: string): BookmarkLeaf[] {
  const q = query.trim().toLowerCase();
  if (!q) return allBookmarks;
  return allBookmarks.filter(
    (b) => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q),
  );
}

function renderList(items: BookmarkLeaf[]): void {
  listEl.replaceChildren();
  emptyEl.hidden = items.length > 0;

  const fragment = document.createDocumentFragment();
  for (const item of items.slice(0, 500)) {
    const li = document.createElement('li');
    li.dataset.id = item.id;
    li.className = 'bookmark-item';
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(item.id === pendingId));

    const title = document.createElement('div');
    title.className = 'bookmark-item__title';
    title.textContent = item.title;

    const meta = document.createElement('div');
    meta.className = 'bookmark-item__meta';
    meta.textContent = item.path ? `${item.path}  ·  ${item.url}` : item.url;

    li.append(title, meta);
    fragment.appendChild(li);
  }
  listEl.appendChild(fragment);
  updateSelectionUi();
}

function updateSelectionUi(): void {
  for (const li of listEl.querySelectorAll<HTMLLIElement>('li[data-id]')) {
    const selected = li.dataset.id === pendingId;
    li.classList.toggle('bookmark-item--selected', selected);
    li.setAttribute('aria-selected', String(selected));
  }
  saveBtn.disabled = !pendingId || pendingId === savedId;
}

async function handleSave(): Promise<void> {
  if (!pendingId) return;
  saveBtn.disabled = true;
  statusEl.textContent = t('saving');
  try {
    await setConfig({ bookmarkId: pendingId });
    savedId = pendingId;
    statusEl.textContent = t('saved');
    await renderCurrent();
  } catch (err) {
    statusEl.textContent = t('saveFailed', err instanceof Error ? err.message : String(err));
  } finally {
    updateSelectionUi();
    setTimeout(() => {
      statusEl.textContent = '';
    }, 2000);
  }
}
