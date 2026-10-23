# ストア掲載素材

- [listing.md](listing.md): 説明文、スクリーンショットの並び、プライバシー欄の記入内容
- `screenshots/{en,ja}/`: 1280×800 のスクリーンショット

## スクリーンショットの撮り直し

`scripts/store-screenshots.mjs` が `dist/` のビルド済み拡張を Chromium に読み込み、見本のブックマークを作って options ページを撮る。撮った画面を、ブラウザ枠とキャプションを描いた 1280×800 の画像に合成して `screenshots/{en,ja}/` に上書きする。ツールバーのバッジはページの外にあって撮れないので、枠の側に描いている。

Playwright は依存に入れていない。グローバルに入っている `playwright-core` を `NODE_PATH` で解決する。

```sh
npm run build
NODE_PATH="$(npm root -g)/@playwright/cli/node_modules" node scripts/store-screenshots.mjs
```

- `NODE_PATH` には `playwright-core` を含む `node_modules` を指定する。上の例は `@playwright/cli` (Homebrew の `playwright-cli`) に同梱されたもの
- `playwright-core` が想定する Chromium が未インストールなら、`CHROMIUM_PATH` に既存の Chromium の実行ファイルを指定する。代入の右辺ではワイルドカードが展開されないので、先にパスを解決してから渡す

  ```sh
  CHROMIUM_PATH="$(ls -d ~/Library/Caches/ms-playwright/chromium-*/chrome-mac-arm64/Google\ Chrome\ for\ Testing.app/Contents/MacOS/Google\ Chrome\ for\ Testing | tail -n 1)"
  export CHROMIUM_PATH
  ```

- macOS の Chromium は `--lang` を無視してシステム言語で表示する。そのためスクリプトは撮影中だけ、その Chromium のバンドルの `AppleLanguages` を `defaults write` で書き換え、終了時に元へ戻す。表示言語が想定と違えば `UI locale is ...` で止まる

キャプションと見本のブックマークは、スクリプト冒頭の `LOCALES` にある。
