import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

export default defineManifest({
  manifest_version: 3,
  name: 'Bookmark Replacer',
  version: pkg.version,
  description: '__MSG_extDescription__',
  default_locale: 'en',
  permissions: ['bookmarks', 'storage', 'activeTab'],
  action: {
    default_title: '__MSG_actionTitle__',
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
