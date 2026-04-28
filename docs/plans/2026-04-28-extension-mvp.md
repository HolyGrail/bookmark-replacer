# Bookmark Replacer Chrome 拡張 MVP

- **日付**: 2026-04-28
- **ステータス**: in-progress
- **slug**: extension-mvp
- **branch**: feat-extension-mvp

## 目的

特定のブックマーク 1 件を「最新タブの URL」に書き換える Chrome 拡張機能を実装する。
ピン留めしたツールバーアイコンをクリックすると、設定済みのブックマークの URL が、
現在アクティブなタブの URL で即時に上書きされる。日々最新版へリンクを差し替えたい
ようなブックマーク (社内ダッシュボード、リリースページなど) を 1 クリックで最新化
する用途を想定する。

## スコープ

新規プロジェクト初期化を含むため、リポジトリ全体に対して以下を追加する。

### 追加ファイル

- `package.json` / `package-lock.json` — npm 依存管理
- `tsconfig.json` — TypeScript 設定 (strict, target ES2022, module ESNext)
- `vite.config.ts` — Vite + `@crxjs/vite-plugin` 設定
- `.prettierrc` — Prettier 設定 (printWidth 100, semi true, singleQuote true)
- `.gitignore` — `node_modules/`, `dist/`, `.wt/` 等を除外
- `.prettierignore` — `dist/`, `node_modules/` 除外
- `manifest.json` — Manifest V3 マニフェスト
- `src/background/index.ts` — service worker (chrome.action.onClicked リスナー)
- `src/options/index.html` — オプションページ HTML
- `src/options/main.ts` — オプションロジック (ブックマーク取得・検索・保存)
- `src/options/style.css` — オプションページスタイル
- `src/lib/bookmarks.ts` — chrome.bookmarks API のフラット化ヘルパー
- `src/lib/storage.ts` — chrome.storage.sync の型付きラッパー
- `src/types.ts` — 共通型 (`StoredConfig`, `BookmarkLeaf` 等)
- `public/icons/icon-16.png` / `icon-48.png` / `icon-128.png` — 拡張アイコン
- `scripts/generate-icons.py` — Python 標準ライブラリのみで単色 PNG を生成
- `docs/plans/2026-04-28-extension-mvp.md` — 本計画

### 更新ファイル

- `README.md` — インストール / 使い方 / 開発手順を記載

## 実装ステップ

1. **プロジェクト初期化**
   - `package.json` (name, scripts: `dev` / `build` / `typecheck` / `format` / `format:check`)
   - `tsconfig.json` (strict, `@types/chrome` を types に追加)
   - `.gitignore` / `.prettierignore` / `.prettierrc`
   - 依存を `npm install` で導入: `vite`, `@crxjs/vite-plugin`, `typescript`, `@types/chrome`, `prettier`

2. **manifest.json 作成 (Manifest V3)**
   - permissions: `bookmarks`, `storage`, `activeTab`
   - `action`: `default_title` のみ設定 (`default_popup` は設定しないことで onClicked を発火させる)
   - `background.service_worker`: `src/background/index.ts`, `type: "module"`
   - `options_page`: `src/options/index.html`
   - `icons`: 16/48/128

3. **共通モジュール**
   - `src/types.ts`: `StoredConfig = { bookmarkId: string | null }`, `BookmarkLeaf = { id, title, url, path }`
   - `src/lib/storage.ts`: `getConfig()` / `setConfig(partial)` を `chrome.storage.sync` で実装、Promise ベース
   - `src/lib/bookmarks.ts`: `chrome.bookmarks.getTree()` を再帰で「URL を持つ leaf のみ」に flatten、フォルダ階層を `path` に格納

4. **Service Worker (`src/background/index.ts`)**
   - トップレベルで `chrome.action.onClicked.addListener(handleClick)` を登録 (MV3 のリスナーはトップレベル必須)
   - `handleClick(tab)`:
     1. 設定から `bookmarkId` を取得 → 未設定なら Badge `"!"` (赤) を 2 秒表示し、`chrome.runtime.openOptionsPage()` で options を開く
     2. `tab.url` が `http(s)` でなければ Badge `"!"` (赤) で終了
     3. `chrome.bookmarks.update(bookmarkId, { url: tab.url })` を呼ぶ
     4. 成功 → Badge `"✓"` (緑) を 1.5 秒表示後クリア
     5. 失敗 (例: 削除済み ID) → Badge `"!"` で options を開く

5. **Options ページ**
   - `index.html`: 検索ボックス + リスト + 現在の選択表示 + 保存ボタン
   - `main.ts`:
     - 起動時に `getConfig()` で現在選択を表示
     - `bookmarks.ts` で全フラット化した leaf を取得
     - 検索ボックスの `input` イベントでタイトル + URL 部分一致 (case-insensitive) で絞り込み (debounce 不要、件数が現実的に数百〜数千)
     - リスト項目クリックで選択状態を切り替え
     - 「保存」ボタンで `setConfig({ bookmarkId })` → 「保存しました」をインライン表示
   - `style.css`: 最低限の見栄え (max-width 720px, list は固定高さ + scroll)

6. **アイコン生成**
   - `scripts/generate-icons.py`: struct + zlib のみで青系 (#4F8EF7) の角丸風単色 PNG を 16/48/128 で生成
   - 一度だけ実行して `public/icons/*.png` をコミット (CI 不要、ランタイム依存ゼロ)

7. **README 更新**
   - 概要、Manifest V3 前提
   - 開発: `npm install` → `npm run build` → `chrome://extensions/` で「パッケージ化されていない拡張機能を読み込む」で `dist/` を選択
   - 使い方: 拡張アイコン右クリック → オプション → 対象ブックマーク選択・保存 → ピン留め → アイコンクリックで上書き

8. **動作確認 (手動)**
   - `npm run build` → `dist/` を Chrome に load unpacked
   - options でブックマーク選択・保存
   - 任意のページでアイコンクリック → Chrome のブックマークマネージャーで URL が変わっていることを確認
   - Badge 表示 / 未設定時 / `chrome://` ページでのクリック / 削除済みブックマーク ID のフォールバックも確認

## 検証方法

- `npm run typecheck` (`tsc --noEmit`) が PASS
- `npm run format:check` (`prettier --check .`) が PASS
- `npm run build` (`vite build`) が PASS、`dist/manifest.json` 生成
- 手動: 上記ステップ 8 のシナリオを全て確認

## リスク

- **`@crxjs/vite-plugin` の互換性**: MV3 + Vite 統合の事実上の標準だが、メジャーバージョン更新で破壊的変更が入りやすい。導入時に最新安定版のドキュメントを `context7` で確認してから固定する
- **Service Worker のリスナー登録タイミング**: `chrome.action.onClicked` のリスナーは必ずトップレベル同期で登録する。`await` 後の登録は SW ライフサイクルで失敗する
- **`default_popup` を設定すると onClicked が発火しない**: manifest で popup を設定しないことを実装中に確認
- **storage.sync の遅延**: `getConfig()` は非同期。options 画面で値を表示する前に `await` していることを確認
- **PNG 生成の冪等性**: scripts を再実行しても同じバイト列を出すよう、PIL は使わずに固定パレット + 固定 IDAT で生成
- **`.wt/` の gitignore 漏れ**: 本リポジトリは `.gitignore` がそもそも無いので、Step 1 で必ず `.wt/` を含める

## 設計判断

- **ビルド: TypeScript + Vite + @crxjs/vite-plugin** — 型安全と MV3 ビルドのまとまりを優先。素の esbuild より設定行数が少ない
- **対象ブックマーク: 単一固定** — MVP の最小スコープ。複数対応は popup UI の必要性を生むので将来 PR で対応
- **クリック時: 確認ダイアログなし即時更新** — 即時性を優先。誤クリックリスクは Badge による視覚フィードバックと未設定時のフォールバック (options を開く) で緩和
- **選択 UI: 検索可能フラットリスト** — フォルダ階層ツリーよりコード量が少なく、検索で十分速く目的のブックマークに到達できる
- **ストレージ: chrome.storage.sync** — 端末間同期。データは ID 1 件 + メタなのでクォータ余裕あり
- **フィードバック: Badge のみ** — `chrome.notifications` 権限を増やさない最小構成。成功 `✓` (緑) / 失敗 `!` (赤) を色で区別
- **品質: tsc + Prettier のみ** — ESLint / Vitest はスコープ外。chrome.bookmarks API はモック化が重く、MVP では手動確認で十分
- **アイコン: Python 単独で PNG 生成** — sharp / canvas を入れない。生成スクリプトはコミット、PNG もコミットして冪等性を担保

## ADR

軽微な設計判断のみのため、現時点で個別 ADR は作成しない。実装中に以下の判断が出た場合は ADR-0001 として起こす:

- @crxjs/vite-plugin の代替プラグインを選んだ場合
- ストレージスキーマの拡張余地を将来取りたい場合 (例: `bookmarkId` を `bookmarkIds[]` に変えるなど)

## 結果

(Phase 5 完了時に記入)
