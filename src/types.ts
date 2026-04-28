export interface StoredConfig {
  bookmarkId: string | null;
}

export interface BookmarkLeaf {
  id: string;
  title: string;
  url: string;
  path: string;
}
