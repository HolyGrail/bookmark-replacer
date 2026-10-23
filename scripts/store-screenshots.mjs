// Chrome Web Store 用スクリーンショット (1280x800) を en / ja で、小さいプロモーション タイル (440x280) を
// en で生成する。
// dist/ のビルド済み拡張を Playwright の Chromium に読み込み、options ページの実画面を撮って
// ブラウザ枠とキャプションを描いた HTML に合成する。ツールバーのバッジはページ外なので枠側で描く。
//
// playwright は依存に入れない (devDependencies を増やさない方針)。グローバルの playwright-core を
// NODE_PATH 経由で解決する。手順は docs/store/README.md。

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const outRoot = join(root, 'docs/store/screenshots');
const promoDir = join(root, 'docs/store/promo');
const iconDataUri = `data:image/png;base64,${readFileSync(join(root, 'public/icons/icon-128.png')).toString('base64')}`;

const WIDTH = 1280;
const HEIGHT = 800;
// frameHtml の .window (左右 72px, 上 140px) から toolbar 48px を除いた表示領域
const CONTENT_W = WIDTH - 72 * 2;
const CONTENT_H = HEIGHT - 140 - 48;

const LOCALES = {
  en: {
    lang: 'en-US',
    bookmarks: [
      {
        folder: 'Work',
        title: 'Weekly team notes',
        url: 'https://notes.example.com/team/2026-10-16',
      },
      {
        folder: 'Work',
        title: 'Release notes (latest)',
        url: 'https://example.com/releases/v2.3.0',
      },
      {
        folder: 'Work',
        title: 'Sprint dashboard',
        url: 'https://dashboard.example.com/sprints/41',
      },
      {
        folder: 'Reading',
        title: 'Web comic — where I left off',
        url: 'https://comic.example.net/chapter/57',
      },
      {
        folder: 'Reading',
        title: 'Podcast: latest episode',
        url: 'https://podcast.example.org/episodes/118',
      },
    ],
    target: 'Weekly team notes',
    newUrl: 'https://notes.example.com/team/2026-10-23',
    page: {
      heading: 'Team notes — Oct 23, 2026',
      lines: ['Agenda', 'Release v2.4 status', 'On-call handover', 'Action items'],
    },

    scenes: {
      hero: [
        'One click keeps a bookmark on the latest page',
        'Open the newest page and click the icon. A green ✓ badge means the bookmark now points here.',
      ],
      pick: [
        'Pick the one bookmark to keep fresh',
        'Filter by title or URL and choose it on the settings page.',
      ],
      saved: [
        'Always see which bookmark is the target',
        'The current setting shows its title and URL.',
      ],
      unset: [
        'Not set up yet? Settings open for you',
        'A red badge means nothing was changed — the settings page opens automatically.',
      ],
    },
  },
  ja: {
    lang: 'ja',
    bookmarks: [
      {
        folder: '仕事',
        title: '週次チームノート',
        url: 'https://notes.example.com/team/2026-10-16',
      },
      {
        folder: '仕事',
        title: 'リリースノート (最新)',
        url: 'https://example.com/releases/v2.3.0',
      },
      {
        folder: '仕事',
        title: 'スプリントダッシュボード',
        url: 'https://dashboard.example.com/sprints/41',
      },
      {
        folder: '読み物',
        title: 'Web 漫画 (続きから)',
        url: 'https://comic.example.net/chapter/57',
      },
      {
        folder: '読み物',
        title: 'ポッドキャスト最新回',
        url: 'https://podcast.example.org/episodes/118',
      },
    ],
    target: '週次チームノート',
    newUrl: 'https://notes.example.com/team/2026-10-23',
    page: {
      heading: 'チームノート — 2026/10/23',
      lines: ['アジェンダ', 'v2.4 リリース状況', 'オンコール引き継ぎ', 'アクションアイテム'],
    },

    scenes: {
      hero: [
        'ワンクリックで、ブックマークを最新ページへ',
        '最新のページを開いてアイコンを押すだけ。緑の ✓ バッジが出たら書き換え完了です。',
      ],
      pick: [
        '最新に保つブックマークを 1 件選ぶ',
        '設定ページでタイトルや URL から絞り込んで選びます。',
      ],
      saved: [
        '対象のブックマークはいつでも確認できる',
        '現在の設定に、タイトルと URL が表示されます。',
      ],
      unset: ['未設定なら、設定ページが開きます', '赤いバッジは「何も変更していない」の合図です。'],
    },
  },
};

const escapeHtml = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

async function main() {
  mkdirSync(outRoot, { recursive: true });
  for (const [locale, l] of Object.entries(LOCALES)) {
    await shootLocale(locale, l);
  }
  await renderPromoTile();
}

// 一覧で縮小表示されるので、アイコン・名前・一行の説明だけにする。拡張は読み込まない
async function renderPromoTile() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(),
    headless: true,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 440, height: 280 } });
    await page.setContent(promoTileHtml());
    await page.evaluate(() => document.fonts.ready);
    mkdirSync(promoDir, { recursive: true });
    const file = join(promoDir, 'small-tile-440x280.png');
    await page.screenshot({ path: file, type: 'png' });
    console.log(file);
  } finally {
    await browser.close();
  }
}

function promoTileHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 440px; height: 280px; overflow: hidden; }
  body {
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #e8f0fe 0%, #f5f7fb 60%, #eef6ee 100%);
    color: #111;
    display: flex; flex-direction: column; justify-content: center; padding: 0 36px;
  }
  .head { display: flex; align-items: center; gap: 16px; }
  .icon { position: relative; width: 72px; height: 72px; }
  .icon img { width: 72px; height: 72px; display: block; }
  .badge {
    position: absolute; right: -8px; bottom: -6px; width: 28px; height: 24px; border-radius: 6px;
    background: #22c55e; color: #fff; font: 700 16px/24px system-ui, sans-serif; text-align: center;
  }
  h1 { margin: 0; font-size: 34px; line-height: 1.1; letter-spacing: -0.01em; }
  p { margin: 22px 0 0; font-size: 21px; line-height: 1.35; color: #374151; font-weight: 500; }
</style>
</head>
<body>
  <div class="head">
    <div class="icon"><img src="${iconDataUri}" alt="" /><span class="badge">✓</span></div>
    <h1>Bookmark<br />Replacer</h1>
  </div>
  <p>Keep a bookmark on the latest page — in one click.</p>
</body>
</html>`;
}

async function shootLocale(locale, l) {
  const profile = mkdtempSync(join(tmpdir(), 'bmr-shots-'));
  const executablePath = process.env.CHROMIUM_PATH || chromium.executablePath();
  const restoreLanguages = overrideAppleLanguages(executablePath, l.lang);
  // Ctrl-C などのシグナルでは finally が走らないので、ここでも defaults を戻す
  const onSignal = (signal) => {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    restoreLanguages();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      executablePath,
      headless: true,
      locale: l.lang,
      colorScheme: 'light',
      args: [
        `--disable-extensions-except=${distDir}`,
        `--load-extension=${distDir}`,
        `--lang=${l.lang}`,
      ],
    });

    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const extId = new URL(worker.url()).host;
    const optionsUrl = `chrome-extension://${extId}/src/options/index.html`;

    const page = await context.newPage();
    await page.goto(optionsUrl);

    const resolved = await page.evaluate(() => chrome.i18n.getMessage('locale'));
    if (resolved !== locale) {
      throw new Error(
        `UI locale is "${resolved}", expected "${locale}" (see docs/store/README.md)`,
      );
    }

    const targetId = await page.evaluate(
      async (bookmarks) => {
        const folders = new Map();
        let target = null;
        for (const b of bookmarks) {
          if (!folders.has(b.folder)) {
            const f = await chrome.bookmarks.create({ parentId: '1', title: b.folder });
            folders.set(b.folder, f.id);
          }
          const node = await chrome.bookmarks.create({
            parentId: folders.get(b.folder),
            title: b.title,
            url: b.url,
          });
          if (b.target) target = node.id;
        }
        await chrome.storage.local.clear();
        return target;
      },
      l.bookmarks.map((b) => ({ ...b, target: b.title === l.target })),
    );

    // ページ全体が枠の表示領域 (CONTENT_W x CONTENT_H) にちょうど収まる縦横比で、2x で撮って縮小表示する
    const cdp = await context.newCDPSession(page);
    const capture = async () => {
      await page.mouse.move(0, 0);
      await page.waitForTimeout(300); // .bookmark-item の background transition を待つ
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      const width = Math.ceil((height * CONTENT_W) / CONTENT_H);
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 2,
        mobile: false,
      });
      const png = await page.screenshot({ type: 'png' });
      await cdp.send('Emulation.clearDeviceMetricsOverride');
      return `data:image/png;base64,${png.toString('base64')}`;
    };

    // 未設定
    await page.reload();
    await page.waitForSelector('.bookmark-item');
    const unsetShot = await capture();

    // 対象を選択 (未保存)
    await page.click(`li[data-id="${targetId}"]`);
    const pickShot = await capture();

    // 保存直後 ("保存しました" は 2 秒で消える)
    await page.click('#save');
    await page.waitForSelector('.current-display:not(.current-display--unset)');
    const savedShot = await capture();

    const outDir = join(outRoot, locale);
    mkdirSync(outDir, { recursive: true });
    const scenes = [
      ['1-hero', l.scenes.hero, { url: l.newUrl, badge: 'success', body: heroBody(l) }],
      ['2-pick', l.scenes.pick, { url: optionsUrl, body: shotBody(pickShot) }],
      ['3-saved', l.scenes.saved, { url: optionsUrl, body: shotBody(savedShot) }],
      ['4-unset', l.scenes.unset, { url: optionsUrl, badge: 'error', body: shotBody(unsetShot) }],
    ];
    const composer = await context.newPage();
    await composer.setViewportSize({ width: WIDTH, height: HEIGHT });
    for (const [name, [title, subtitle], frame] of scenes) {
      await composer.setContent(frameHtml(locale, title, subtitle, frame));
      await composer.evaluate(() => document.fonts.ready);
      const file = join(outDir, `${name}.png`);
      await composer.screenshot({ path: file, type: 'png', omitBackground: false });
      console.log(file);
    }
  } finally {
    await context?.close();
    restoreLanguages();
    rmSync(profile, { recursive: true, force: true });
  }
}

// macOS の Chromium は --lang を無視してシステム言語を使う。起動引数 -AppleLanguages は Playwright が
// 受け付けないので、そのバンドルの defaults に一時的に書き、撮影後に元へ戻す。
function overrideAppleLanguages(executablePath, lang) {
  if (process.platform !== 'darwin') return () => {};
  const plist = executablePath.replace(/\/Contents\/MacOS\/[^/]+$/, '/Contents/Info');
  const bundleId = execFileSync('defaults', ['read', plist, 'CFBundleIdentifier'])
    .toString()
    .trim();
  let saved = null;
  try {
    saved = execFileSync('defaults', ['export', bundleId, '-'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    // ドメインが存在しない
  }
  execFileSync('defaults', ['write', bundleId, 'AppleLanguages', '-array', lang]);
  return () => {
    // import は既存キーへのマージなので、元に無かった AppleLanguages を消すために先に delete する
    execFileSync('defaults', ['delete', bundleId, 'AppleLanguages']);
    if (saved) execFileSync('defaults', ['import', bundleId, '-'], { input: saved });
  };
}

const shotBody = (src) => `<img class="shot" src="${src}" alt="" />`;

function heroBody(l) {
  const old = l.bookmarks.find((b) => b.title === l.target).url;
  return `
    <div class="site">
      <h1>${escapeHtml(l.page.heading)}</h1>
      ${l.page.lines.map((s) => `<h2>${escapeHtml(s)}</h2><div class="bar"></div><div class="bar short"></div>`).join('')}
    </div>
    <div class="callout">
      <div class="callout-title"><span class="star">★</span>${escapeHtml(l.target)}</div>
      <div class="url old">${escapeHtml(old)}</div>
      <div class="arrow">↓</div>
      <div class="url new">${escapeHtml(l.newUrl)}</div>
    </div>`;
}

function frameHtml(locale, title, subtitle, { url, badge, body }) {
  const badgeHtml =
    badge === 'success'
      ? '<span class="badge ok">✓</span>'
      : badge === 'error'
        ? '<span class="badge err">!</span>'
        : '';
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }
  body {
    font-family: system-ui, -apple-system, 'Hiragino Sans', 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #e8f0fe 0%, #f5f7fb 60%, #eef6ee 100%);
    color: #111;
  }
  header { height: 128px; padding: 30px 72px 0; }
  header h1 { margin: 0; font-size: 34px; letter-spacing: -0.01em; }
  header p { margin: 10px 0 0; font-size: 19px; color: #4a5568; }
  .window {
    position: absolute; left: 72px; right: 72px; top: 140px; bottom: 0;
    background: #fff; border-radius: 12px 12px 0 0; overflow: hidden;
    box-shadow: 0 10px 40px rgba(30, 50, 90, 0.18);
  }
  .toolbar {
    height: 48px; display: flex; align-items: center; gap: 12px; padding: 0 14px;
    background: #f1f3f4; border-bottom: 1px solid #dadce0;
  }
  .dots { display: flex; gap: 7px; }
  .dots i { width: 12px; height: 12px; border-radius: 50%; background: #dadce0; display: block; }
  .dots i:nth-child(1) { background: #ff5f57; } .dots i:nth-child(2) { background: #febc2e; } .dots i:nth-child(3) { background: #28c840; }
  .omnibox {
    flex: 1; height: 32px; border-radius: 16px; background: #fff; border: 1px solid #dadce0;
    display: flex; align-items: center; padding: 0 16px; font-size: 14px; color: #3c4043;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ext { position: relative; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; }
  .ext.active { background: #dfe3e8; }
  .ext img { width: 20px; height: 20px; }
  .badge {
    position: absolute; right: -6px; bottom: -3px; min-width: 18px; height: 16px; padding: 0 4px;
    border-radius: 4px; color: #fff; font: 700 11px/16px system-ui, sans-serif; text-align: center;
  }
  .badge.ok { background: #22c55e; } .badge.err { background: #ef4444; }
  .cursor { position: absolute; left: -2px; top: 16px; width: 22px; height: 22px; }
  .content { position: absolute; top: 48px; left: 0; right: 0; bottom: 0; overflow: hidden; background: #fafafa; }
  .shot { display: block; width: 100%; }
  .site { padding: 36px 64px; background: #fff; height: 100%; }
  .site h1 { margin: 0 0 24px; font-size: 30px; }
  .site h2 { margin: 22px 0 10px; font-size: 18px; color: #333; }
  .bar { height: 10px; border-radius: 5px; background: #eceff3; width: 62%; margin-bottom: 8px; }
  .bar.short { width: 40%; }
  .callout {
    position: absolute; right: 36px; top: 28px; width: 460px; padding: 22px 24px;
    background: #fff; border: 1px solid #d6e4d9; border-radius: 12px;
    box-shadow: 0 12px 32px rgba(20, 60, 30, 0.16);
  }
  .callout-title { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 700; margin-bottom: 14px; }
  .star { color: #f5b301; font-size: 22px; }
  
  .url { font: 14px/1.4 ui-monospace, 'SF Mono', Menlo, monospace; padding: 8px 10px; border-radius: 6px; word-break: break-all; }
  .url.old { background: #f3f4f6; color: #6b7280; text-decoration: line-through; }
  .url.new { background: #dcfce7; color: #14532d; font-weight: 600; }
  .arrow { text-align: center; color: #9ca3af; font-size: 18px; margin: 4px 0; }
</style>
</head>
<body>
  <header><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></header>
  <div class="window">
    <div class="toolbar">
      <div class="dots"><i></i><i></i><i></i></div>
      <div class="omnibox">${escapeHtml(url)}</div>
      <div class="ext${badge ? ' active' : ''}"><img src="${iconDataUri}" alt="" />${badgeHtml}${
        badge === 'success'
          ? '<svg class="cursor" viewBox="0 0 24 24"><path d="M4 2l16 10-7 1.5L9.5 21z" fill="#111" stroke="#fff" stroke-width="1.5"/></svg>'
          : ''
      }</div>
    </div>
    <div class="content">${body}</div>
  </div>
</body>
</html>`;
}

await main();
