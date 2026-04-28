# Plan: devDependencies 最新化

- Date: 2026-04-28
- Slug: chore-update-deps
- Branch: chore/update-deps
- Worktree: .wt/chore/update-deps

## 目的

`devDependencies` を最新版に揃える。stable リリースが出ている開発系ツールチェーンを追従し、esbuild 経由の moderate vulnerability (GHSA-67mh-4wv8-2f99) を解消する。

## スコープ

| パッケージ           | 旧               | 新        | 種別          |
| -------------------- | ---------------- | --------- | ------------- |
| `@crxjs/vite-plugin` | `^2.0.0-beta.28` | `^2.4.0`  | beta → stable |
| `@types/chrome`      | `^0.0.270`       | `^0.1.40` | 型定義 major  |
| `prettier`           | `^3.3.3`         | `^3.8.3`  | minor         |
| `typescript`         | `^5.5.4`         | `^6.0.3`  | major         |
| `vite`               | `^5.4.6`         | `^8.0.10` | major (×3)    |

`archiver` / `@types/archiver` は既に最新の caret 範囲内 (^7.0.x)、`scripts/package.mjs` 関連の動作も維持する。

非対象:

- runtime dependency (このプロジェクトには無し)
- `scripts/generate-icons.py` の Python ランタイム
- `package.json` の `version` / `description`

## 設計判断

- **vite を v8 に上げる**: `@crxjs/vite-plugin@2.4.0` の peerDependency は `vite: ^3 || ^4 || ^5 || ^6 || ^7 || ^8`。最新の stable に揃えると esbuild 系 advisory が解消される。
- **`@crxjs/vite-plugin` を stable に切替**: beta から `2.4.0` (latest) へ。CRX manifest 構築・SW バンドル・options HTML 解決のフロー (CLAUDE.md 「ビルド: @crxjs/vite-plugin」節) は変わらない。
- **TypeScript v6 採用**: `tsconfig.json` の `noUnusedLocals` / `noUnusedParameters` / `noImplicitOverride` を維持したまま `tsc --noEmit` が通るかを Phase 3 で実証。
- **`@types/chrome` 型 major**: MV3 API しか使っておらず (`chrome.action`, `chrome.bookmarks`, `chrome.storage.sync`, `chrome.tabs`, `chrome.runtime`)、いずれも安定 API。Phase 3 で typecheck が PASS することで担保。
- **`rollup <2.80.0` の audit 警告は受容**: `@crxjs/vite-plugin@2.4.0` が内部で `rollup@2.79.2` を固定依存。devDependency に閉じるため production 配布物には影響しない (extension の本体は vite/rollup を経由しても署名済み Chrome ランタイム上で動作)。upstream 解消待ち。
- **stash は drop しない**: main 側に保持している `stash@{0}` (古い main ベースの未コミット差分) は worktree のコミットが PR 化されるまで保険として残す。Phase 5 完了後にユーザー確認の上で drop。

## 想定変更ファイル

- `package.json` — `devDependencies` 5 パッケージのバージョン更新
- `package-lock.json` — `npm install` で自動再生成

ソースコード (`src/**`, `manifest.config.ts`, `vite.config.ts`, `tsconfig.json`, `scripts/**`) は触らない。

## 実装手順 (Phase 2)

1. worktree 内で `package.json` の `devDependencies` を上記表の通り書き換え
2. `npm install` で lockfile を再生成
3. `npm audit` で残存警告を確認 (rollup のみが想定)

## 検証 (Phase 3)

| コマンド               | 期待                                                                          |
| ---------------------- | ----------------------------------------------------------------------------- |
| `npm run typecheck`    | エラーなし (TypeScript 6 + @types/chrome 0.1.x で MV3 API が解決可能)         |
| `npm run build`        | `dist/manifest.json`, `dist/service-worker-loader.js`, `dist/assets/*` が生成 |
| `npm run format:check` | "All matched files use Prettier code style!"                                  |
| `npm run package`      | `release/bookmark-replacer-v0.1.0.zip` が生成、zip 直下に manifest.json       |

`npm run dev` の HMR は MV3 SW では限定的にしか機能しないため、自動チェックの対象外。実機ロード確認はユーザー側で必要に応じて実施。

## ロールバック

問題が見つかった場合:

- 個別パッケージのみダウングレード可能 (例: typescript 5 系維持で他を最新化)
- Phase 5 で Draft PR にしてあるためマージ前に取り消せる

## リスク

| リスク                                       | 影響                      | 対応                                                               |
| -------------------------------------------- | ------------------------- | ------------------------------------------------------------------ |
| TypeScript 6 で `tsc --noEmit` が落ちる      | Phase 3 で発覚            | エラー内容に応じて型キャスト or typescript 5.9.x に戻す            |
| vite 8 で `@crxjs/vite-plugin` が build 失敗 | dist 生成失敗             | vite 7 に戻す (peerDependency 範囲内)                              |
| `@types/chrome` 0.1.x で MV3 型が変わる      | typecheck 失敗 / 実装影響 | 0.0.x の最新に戻す                                                 |
| archiver/zip 出力フォーマットの変動          | Web Store 提出に影響      | `npm run package` で zip ルートに `manifest.json` があることを確認 |

## 完了条件

- [ ] Phase 3 の 4 コマンドがすべて PASS
- [ ] `dist/manifest.json` が正しく生成される
- [ ] `release/bookmark-replacer-v0.1.0.zip` が生成され manifest.json が直下にある
- [ ] Draft PR が GitHub 上に作成される
