# Chrome Web Store 掲載情報

Developer Dashboard の「ストアの掲載情報」に貼る内容。

## 名前と概要

manifest から自動で入るので Dashboard では編集しない。

| 項目 | 参照元                                         | en                                                                              | ja                                                                                |
| ---- | ---------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 名前 | `manifest.config.ts` の `name`                 | Bookmark Replacer                                                               | Bookmark Replacer                                                                 |
| 概要 | `_locales/*/messages.json` の `extDescription` | Overwrite a chosen bookmark's URL with the current tab's URL in a single click. | 選んだブックマーク 1 件の URL を、ワンクリックで現在のタブの URL に上書きします。 |

## 説明

英語を先に、日本語を後ろに併記した 1 本の説明文。既定言語 (English) の説明欄に下のブロックをそのまま貼る。Dashboard の説明欄はプレーンテキストなので Markdown 記法は使わない。

```text
Bookmark Replacer keeps one bookmark on the newest version of a page whose URL changes every week, every release, or every chapter.

Choose the bookmark once on the settings page. When you open a newer page — this week's team notes, the latest release notes, the next chapter of a web comic — click the toolbar icon. The bookmark's URL is replaced with the current tab's URL. No dialog, no popup.

HOW TO USE
• Pin the icon to the toolbar, right-click it, and choose "Options".
• Filter by title or URL, pick the one bookmark to keep up to date, and save.
• On any http(s) page, click the icon. A green ✓ badge means the bookmark was updated.
• A red ! badge means nothing was changed. It appears when no bookmark is set or the chosen bookmark was deleted (the settings page opens in both cases), and on pages that are not regular web pages, such as chrome:// pages.

GOOD TO KNOW
• It works on exactly one bookmark. Its title and folder stay the same; only the URL changes.
• The interface is available in English and Japanese and follows Chrome's display language.

PRIVACY
• bookmarks: to update the bookmark you chose.
• storage: to remember which bookmark you chose, on this device only.
• activeTab: to read the current tab's URL, only when you click the icon.
The extension itself sends nothing to the developer or any other server, and has no analytics. If Chrome sync is on, Chrome syncs the updated bookmark to your Google Account like any other bookmark.

――――――――――――――――――――

【日本語】

Bookmark Replacer は、週ごと・リリースごと・連載の回ごとに URL が変わるページを、ブックマーク 1 件で追いかけるための拡張機能です。

対象のブックマークは、設定ページで一度選ぶだけです。今週のチームノート、最新のリリースノート、Web 漫画の次の話。新しいページを開いたら、ツールバーのアイコンをクリックします。ブックマークの URL が、いま開いているタブの URL に置き換わります。確認ダイアログもポップアップも出ません。

使い方
・アイコンをツールバーに固定し、右クリックして「オプション」を開きます。
・タイトルか URL で絞り込み、最新に保ちたいブックマークを 1 件選んで保存します。
・http(s) のページでアイコンをクリックします。緑の ✓ バッジが出たら更新済みです。
・赤い ! バッジは、何も変更しなかったという合図です。ブックマークが未設定のときと、選んだブックマークが削除されていたとき（どちらも設定ページが開きます）、そして chrome:// のような通常の Web ページ以外を開いているときに出ます。

補足
・対象は 1 件だけです。タイトルやフォルダはそのままで、URL だけが変わります。
・表示は英語と日本語に対応しており、Chrome の表示言語に合わせて切り替わります。

プライバシー
・bookmarks：選んだブックマークを更新するため
・storage：どのブックマークを選んだかを、この端末に覚えておくため
・activeTab：アイコンをクリックしたときに限り、現在のタブの URL を読むため
この拡張機能が開発者や外部のサーバーへデータを送ることはなく、アクセス解析もしていません。Chrome の同期をオンにしている場合は、更新したブックマークもほかのブックマークと同じく Google アカウントへ同期されます。
```

## スクリーンショット

1280×800 の PNG (アルファなし)。`docs/store/screenshots/` 配下にあり、既定言語 (English) の欄に `en/`、日本語の欄に `ja/` を番号順でアップロードする。

| ファイル      | 内容                                                                               |
| ------------- | ---------------------------------------------------------------------------------- |
| `1-hero.png`  | アイコンをクリックし、緑の ✓ バッジとともにブックマークの URL が最新ページへ変わる |
| `2-pick.png`  | 設定ページで対象のブックマークを 1 件選ぶ                                          |
| `3-saved.png` | 保存後、現在の設定にタイトルと URL が表示される                                    |
| `4-unset.png` | 未設定のまま押すと赤い ! バッジが出て、設定ページが開く                            |

## プロモーション タイル

`promo/small-tile-440x280.png` を「小さいプロモーション タイル」にアップロードする。英語の 1 枚だけで、日本語の欄にも同じものを使う。マーキー (1400×560) は作っていない。

撮り直しの手順は [README.md](README.md)。

## プライバシーへの取り組み

Dashboard の「プライバシーへの取り組み」タブ用 (英語で入力)。

**Single purpose**

```text
Overwrite the URL of one bookmark chosen by the user with the URL of the current tab when the toolbar icon is clicked.
```

**Permission justification**

| 権限        | 記入内容                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| `bookmarks` | Lists bookmarks on the settings page so the user can choose one, and updates the URL of the chosen bookmark. |
| `storage`   | Stores the ID of the chosen bookmark in chrome.storage.local.                                                |
| `activeTab` | Reads the URL of the active tab only when the user clicks the toolbar icon.                                  |

**Data usage**: 収集するユーザーデータはなし。リモートコードは使わない。
