# Bookmark Replacer

特定の Chrome ブックマーク 1 件の URL を、現在表示しているタブの URL で
ワンクリックで上書きする Chrome 拡張機能 (Manifest V3)。

「日々最新版を追いかけたいリンク (社内ダッシュボード、リリースページ、
週次ノートなど)」をひとつ登録しておき、最新ページを開いた状態で
ピン留めしたアイコンをクリックするだけで、そのブックマークの URL が
最新化されます。

## 主な特徴

- 対象は **1 件のブックマーク** (シンプル運用)
- アイコンクリックで **即時上書き** (確認ダイアログなし)
- 設定 (対象のブックマーク ID) は端末ごとに `chrome.storage.local` へ保存。ブックマーク ID は
  端末ごとに振られるため同期はせず、端末ごとに対象を選ぶ
- 結果はバッジ表示でフィードバック (成功 `✓` / 未設定・失敗 `!`)
- 未設定 / 削除済みブックマーク ID 検出時はオプションページを自動で開く
- UI は英語と日本語に対応 (Chrome の表示言語に追従)

## 必要要件

- Node.js 18 以上
- npm 9 以上
- Python 3 (アイコン PNG を再生成する場合のみ)
- Google Chrome (Manifest V3 対応版)

## 開発手順

```sh
npm install        # 依存をインストール
npm run typecheck  # TypeScript 型チェック
npm run format     # Prettier で整形 (--check は format:check)
npm run build      # dist/ にビルド
npm run dev        # Vite dev (HMR) を起動 (任意)
npm run package    # build → release/bookmark-replacer-v{version}.zip を生成 (Web Store 提出用)
```

ビルドすると `dist/` 以下に展開されます。

## Chrome へのインストール (パッケージ化されていない拡張機能)

1. `npm run build` を実行
2. Chrome で `chrome://extensions/` を開く
3. 右上の「デベロッパーモード」を ON
4. 「パッケージ化されていない拡張機能を読み込む」をクリックし、本リポジトリの
   `dist/` ディレクトリを選択
5. 拡張機能一覧に表示されたら、ツールバーのパズルアイコンから本拡張を
   ピン留めしておく

## 使い方

1. 拡張アイコンを **右クリック → 「オプション」** を開く
2. 検索ボックスでブックマークを絞り込み、対象 1 件をクリックして選択
3. 「選択したブックマークを保存」を押下
4. 任意のページを開いた状態で、拡張アイコンをクリック
5. 緑色の `✓` バッジが表示され、選択しておいたブックマークの URL が
   現在のタブの URL に書き換わる

未設定の状態でアイコンをクリックすると、赤色 `!` バッジが表示されてから
オプションページが自動で開きます。

## Chrome Web Store への提出

1. `package.json` の `version` を上げる (`manifest.json` に自動連動)
2. `npm run package` を実行
3. `release/bookmark-replacer-v{version}.zip` が生成される
4. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) からこの zip をアップロード
5. 掲載情報 (説明文・スクリーンショット・プライバシー欄) は [docs/store/listing.md](docs/store/listing.md) を元に更新する

zip は `dist/` の中身を zip ルートに展開した形 (`manifest.json` が直下) で、
Web Store の標準フォーマットに準拠しています。`.crx` の作成は不要 (Store 側で署名されます)。

## ファイル構成

```
src/
├── background/index.ts   service worker (chrome.action.onClicked)
├── options/              設定ページ (HTML / TS / CSS)
├── lib/
│   ├── i18n.ts           chrome.i18n ラッパーと options ページの翻訳適用
│   ├── bookmarks.ts      chrome.bookmarks API ヘルパー (フラット化)
│   └── storage.ts        chrome.storage.local の型付きラッパー
└── types.ts              共通型

public/icons/             16/48/128px のアイコン PNG
public/_locales/          en / ja の messages.json
manifest.config.ts        @crxjs/vite-plugin の defineManifest
vite.config.ts            Vite 設定
scripts/generate-icons.py アイコン PNG 生成 (zlib のみ使用)
scripts/package.mjs       dist/ → release/*.zip パッケージング
scripts/store-screenshots.mjs  Web Store 用スクリーンショットの生成
docs/plans/               Dev workflow の計画ファイル
docs/store/               Web Store の掲載文とスクリーンショット
release/                  Web Store 提出用 zip 出力先 (zip 自体は git 管理外)
```

## ライセンス

MIT
