# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Chrome 拡張機能 (Manifest V3)。ピン留めしたツールバーアイコンをワンクリックすると、設定済みのブックマーク 1 件の URL を現在のタブの URL で上書きする。

## Commands

```sh
npm install        # 依存をインストール
npm run typecheck  # tsc --noEmit
npm run build      # vite build → dist/
npm run dev        # vite (HMR、Chrome に load unpacked して使う)
npm run format     # prettier --write .
npm run format:check
npm run icons      # python3 scripts/generate-icons.py で public/icons/*.png を再生成
npm run package    # build → release/bookmark-replacer-v{version}.zip (Chrome Web Store 提出用)
```

Pre-PR チェックは `npm run typecheck` と `npm run format:check` が通ること、`npm run build` が成功して `dist/manifest.json` が生成されること。Lint / 単体テストは MVP スコープ外で導入していない。

Chrome へのロードは `dist/` を `chrome://extensions/` の「パッケージ化されていない拡張機能を読み込む」で読み込む。Vite の HMR は Service Worker / options ページに対しては部分的にしか効かないので、コード変更後は `npm run build` し直して拡張をリロードするのが確実。

## Architecture

### Manifest V3 ＋ Service Worker パターン

`src/background/index.ts` がツールバーアイコンクリックの起点。`chrome.action.onClicked.addListener` を **モジュールのトップレベルで同期登録** する必要がある (MV3 の Service Worker は短命でランタイム中に再起動するため、`await` 後に登録するとリスナーが取りこぼされる)。

意図的な設計判断:

- `manifest.config.ts` で `action.default_popup` を **設定していない**。`default_popup` を設定すると `chrome.action.onClicked` は発火しなくなる。クリック時に popup を出さず即時更新する仕様のためこの構成は必須。
- `permissions: ['bookmarks', 'storage', 'activeTab']` のみ。`tabs` や `host_permissions` は付けない (`activeTab` で `tab.url` が読めれば十分)。
- 通知系の権限 (`notifications`) は使わず、フィードバックは `chrome.action.setBadgeText` のみ。インストール時の追加同意ダイアログを避けるため。

### モジュール境界

```
src/
├── types.ts              StoredConfig, BookmarkLeaf
├── lib/
│   ├── storage.ts        chrome.storage.sync の薄い型付きラッパー
│   └── bookmarks.ts      chrome.bookmarks.getTree() を leaf だけに flatten
├── background/index.ts   Service Worker (action.onClicked → lib/storage + chrome.bookmarks.update)
└── options/              設定ページ (HTML / TS / CSS)
```

`src/lib/` は副作用を持たない単純ラッパー。Service Worker と options ページの両方から同じ API を使う。`background` から `options` モジュールへの依存は無い (逆もない)。

### ストレージスキーマ

`chrome.storage.sync` のキーは `'config'` 1 本のみ。値は `StoredConfig = { bookmarkId: string | null }`。スキーマを拡張する場合は `src/lib/storage.ts` の `DEFAULT_CONFIG` と `src/types.ts` を同時に更新する。`getConfig()` は常にデフォルトをマージして返すので、新フィールド追加時の後方互換は自動で確保される。

### ビルド: @crxjs/vite-plugin

`manifest.config.ts` で `defineManifest` を使い、`vite.config.ts` で `crx({ manifest })` を呼ぶ構成。CRXJS が以下を自動でやってくれる:

- `service_worker` の ESM バンドル化 + `service-worker-loader.js` の生成
- `options_page` HTML の処理と参照スクリプトのバンドル化
- `manifest.json` を `dist/` に生成

`manifest.config.ts` の `icons` パスは `icons/icon-XX.png` のように **`public/` プレフィックスを付けない**。Vite の慣習で `public/` 配下は dist のルートにフラットにコピーされるため、`public/icons/...` と書くと CRXJS がリテラル解決して二重コピーになる (`dist/icons/` と `dist/public/icons/` の両方が出現する不具合に過去なった)。

### Web Store パッケージング

`scripts/package.mjs` が `archiver` で `dist/` 中身を zip ルートに展開してパッケージ化する (`manifest.json` が zip 直下に来る形が Web Store の要件)。出力先は `release/bookmark-replacer-v{version}.zip` で、ファイル名のバージョンは `package.json` 由来 (manifest と同じ参照源)。`.crx` 生成は実装しない (Web Store 側が署名するため不要、自己ホスト配布をサポートしない方針)。`release/*.zip` は git 管理外、`release/.gitkeep` だけ追跡。

### アイコン生成

`scripts/generate-icons.py` は Python 標準ライブラリ (`struct` + `zlib`) のみで決定論的に PNG を出力する。`sharp` / `canvas` / Pillow 等は導入しない方針。生成された PNG はコミットして配布、スクリプトは差し替え時にだけ実行。デザインを変更する場合は `make_pixels()` を編集して `npm run icons`。

## Dev Workflow Conventions

- 計画ファイルは `docs/plans/{YYYY-MM-DD}-{slug}.md` に保存される (`/dev` ワークフロー由来)
- `.wt/` は `.gitignore` 済み (タスクごとの worktree 用ディレクトリ)
- コミットは Conventional Commits (`feat:` / `fix:` / `refactor:` / `chore:` / `docs:`)

## Caveats

- **`default_popup` を絶対に追加しない**。追加すると `onClicked` リスナーが沈黙する。
- **リスナー登録は同期トップレベルで**。`async function init() { ... chrome.action.onClicked.addListener(...) }` のような書き方は SW 再起動時に失敗する。
- **`chrome://`, `edge://`, `about:` 等のページでアイコンクリックされた場合は何もしない**。`tab.url` が `http(s):` 始まりかをチェック済み。仕様変更時もこの分岐を維持する。
- **`chrome.bookmarks.update()` は ID が削除済みだと reject する**。`background/index.ts` で try/catch + 赤バッジ + options 自動オープンで救済している。
- **アイコン PNG をテキストエディタや自動整形対象から外す**。`.prettierignore` に `public/icons/` と `*.png` を登録済み。
- **`tsconfig.json` は `noUnusedLocals` / `noUnusedParameters` / `noImplicitOverride` が ON**。書き捨ての一時変数を残すと `npm run typecheck` が落ちる。Pre-PR ゲートで必ず引っかかるので、未使用は `_` プレフィックスではなく削除する。
- **`manifest.config.ts` は `package.json` を import attributes (`with { type: 'json' }`) で取り込む**。`name` (manifest 上は固定文字列) を除き `version` / `description` は `package.json` 由来なので、バージョン更新は `package.json` 1 箇所だけ触ればよい。
