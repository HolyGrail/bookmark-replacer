import type { BookmarkLeaf } from '../types';

export async function listBookmarkLeaves(): Promise<BookmarkLeaf[]> {
  const tree = await chrome.bookmarks.getTree();
  const leaves: BookmarkLeaf[] = [];
  for (const root of tree) {
    walk(root, [], leaves);
  }
  return leaves;
}

export async function getBookmarkLeaf(id: string): Promise<BookmarkLeaf | null> {
  try {
    const [node] = await chrome.bookmarks.get(id);
    if (!node || !node.url) return null;
    return { id: node.id, title: node.title, url: node.url, path: '' };
  } catch {
    return null;
  }
}

function walk(
  node: chrome.bookmarks.BookmarkTreeNode,
  parentPath: string[],
  out: BookmarkLeaf[],
): void {
  if (node.url) {
    out.push({
      id: node.id,
      title: node.title || node.url,
      url: node.url,
      path: parentPath.join(' / '),
    });
    return;
  }
  const nextPath = node.title ? [...parentPath, node.title] : parentPath;
  for (const child of node.children ?? []) {
    walk(child, nextPath, out);
  }
}
