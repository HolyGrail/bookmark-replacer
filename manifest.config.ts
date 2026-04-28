import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

export default defineManifest({
  manifest_version: 3,
  name: 'Bookmark Replacer',
  version: pkg.version,
  description: pkg.description,
  permissions: ['bookmarks', 'storage', 'activeTab'],
  action: {
    default_title: 'ブックマーク URL を現在のタブで上書き',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  options_page: 'src/options/index.html',
  icons: {
    16: 'icons/icon-16.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
});
