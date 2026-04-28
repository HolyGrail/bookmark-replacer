# Chrome Web Store 提出用 zip 自動生成

- **日付**: 2026-04-28
- **ステータス**: in-progress
- **slug**: package-zip
- **branch**: feat-package-zip

## 目的

`npm run package` で Chrome Web Store にアップロードできる zip ファイルを 1 コマンドで生成する。zip は `dist/` の中身を展開した形 (manifest.json が zip ルート) で、ファイル名は `bookmark-replacer-v{version}.zip`。

`.crx` は自己ホスト/エンタープライズ配布用で、Web Store 提出には不要 (Store 側で署名される)。本タスクでは zip のみ対応。

## スコープ

### 追加ファイル

- `scripts/package.mjs` — `archiver` で `dist/` を zip 化する Node スクリプト
- `release/.gitkeep` — 出力先ディレクトリのプレースホルダ (中身の zip は無視)
- `docs/plans/2026-04-28-package-zip.md` — 本計画

### 更新ファイル

- `package.json` — `scripts.package` 追加、`archiver` を devDependencies に追加
- `package-lock.json` — `archiver` のロック更新
- `.gitignore` — `release/*.zip` を追加 (zip 自体は git 管理しない)
- `.prettierignore` — `release/` を追加 (zip / バイナリ系を整形対象から外す)
- `README.md` — 「Web Store 提出手順」節を追加
- `CLAUDE.md` — 「Commands」に `npm run package`、「Architecture」に release プロセスを追記

## 実装ステップ

1. **依存追加**
   - `npm install --save-dev archiver @types/archiver`
   - `archiver` は Node の zip ライブラリ。クロスプラットフォーム動作

2. **`scripts/package.mjs`**
   - `package.json` を読み `version` を取得
   - `dist/manifest.json` の存在確認 (なければ `npm run build を先に実行してください` で exit 1)
   - `release/` を作成 (なければ)
   - 出力パス: `release/bookmark-replacer-v{version}.zip`
   - 既存ファイルがあれば上書き (削除してから書き込む方が分かりやすい)
   - `archiver('zip', { zlib: { level: 9 } })` で `dist/` の中身を `directory(distDir, false)` (第 2 引数 false で zip ルートに展開) で追加
   - 完了後にファイルサイズと中身件数をログ出力 (`Created release/... (XXX KB, N files)`)
   - エラー時は exit 1

3. **`package.json` scripts 追加**
   - `"package": "npm run build && node scripts/package.mjs"` — build を毎回先行させる (古い dist で zip を作らないように)
   - `"package:no-build": "node scripts/package.mjs"` — build 済み前提で zip だけ作るバリアント (CI 想定の分離が将来欲しい場合用、今回は迷ったので入れない方針 → 結局 `npm run package` のみとする)

   **決定**: `package` 1 本のみ。サブバリアントは必要になったら追加。

4. **`.gitignore` / `.prettierignore` 更新**
   - `.gitignore`: `release/*.zip` を追加 (`.gitkeep` は残す)
   - `.prettierignore`: `release/` を追加

5. **`release/.gitkeep`** を新規追加して空ディレクトリを git で追跡

6. **README に「Chrome Web Store 提出」節**
   - `npm run package` を実行
   - `release/bookmark-replacer-v{version}.zip` を [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) からアップロード
   - バージョン更新は `package.json` の `version` を上げる (manifest の version も自動連動)

7. **CLAUDE.md 更新**
   - `## Commands` の表に `npm run package` を追加
   - `## Architecture` に release プロセスの 1 段落追加 (「`scripts/package.mjs` が `archiver` で `dist/` 中身を zip ルートに展開、ファイル名は `package.json` version 由来」)

## 検証方法

- `npm run typecheck` PASS
- `npm run format:check` PASS (新規スクリプトを Prettier で整形済み)
- `npm run build` PASS
- `npm run package` を実行 → `release/bookmark-replacer-v0.1.0.zip` が生成される
- 生成された zip を `unzip -l` でリスト表示し、以下を確認:
  - `manifest.json` が zip ルートにある (パスに `dist/` が含まれない)
  - `service-worker-loader.js`, `icons/icon-{16,48,128}.png`, `assets/...`, `src/options/index.html` が含まれる
- (任意) zip を `chrome://extensions/` で「パッケージ化されていない拡張機能」として展開 → load → 動作するか確認

## リスク

- **`archiver` の Node 18 互換性**: archiver v7 系は Node 14+ をサポート。問題なし
- **`dist/` がビルドされていない状態で `package` を実行**: `npm run package` は `npm run build` を前段に挟むので通常は問題ないが、何らかの理由で `dist/` が空のまま zip を作るとアップロード時に Web Store で reject される。スクリプト内で `dist/manifest.json` の存在チェックを入れる
- **ファイル名の既存衝突**: 同バージョンを再ビルドすると上書き。これは意図動作 (CI の重複作成も同じ理由で許容)
- **macOS の `.DS_Store` 混入**: `dist/` は Vite 生成物なので通常 `.DS_Store` は入らないが、Finder で開いたあとに残るケースがある。`archiver` の glob で `.DS_Store` を除外しておく (ignore オプション)

## 設計判断

- **zip 一択 (crx 不要)** — Web Store 提出は zip。crx はストアが署名して配布するので開発者が作る必要なし
- **`archiver` で Node スクリプト** — クロスプラットフォーム、ロジック (バージョン取得、ファイル名生成、エラー処理) を JS で書ける
- **ファイル名にバージョンを含む** — 履歴を残しやすい。CI 側で artifacts を集める際にも便利
- **`dist/` 中身を zip ルートに展開** — Web Store の標準。`dist/` ディレクトリごと zip にするとアップロード時にエラー
- **`npm run package` は build を先行実行** — 古い dist で zip を作る事故を防ぐ
- **CI / GitHub Actions は今回はスコープ外** — ローカル script だけで MVP。`v*` タグでの自動ビルドは別 PR で必要に応じて

## ADR

軽微なため新規 ADR は作成しない。

## 結果

(Phase 5 完了時に記入)
