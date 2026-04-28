#!/usr/bin/env node
import archiver from 'archiver';
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = join(ROOT, 'dist');
const RELEASE_DIR = join(ROOT, 'release');
const IGNORE_PATTERNS = ['**/.DS_Store', '**/Thumbs.db'];

function loadVersion() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  if (!pkg.version) throw new Error('package.json has no "version"');
  return pkg.version;
}

function ensureBuilt() {
  if (!existsSync(join(DIST_DIR, 'manifest.json'))) {
    console.error('dist/manifest.json not found. Run `npm run build` first.');
    process.exit(1);
  }
}

async function pack(zipPath) {
  if (existsSync(zipPath)) rmSync(zipPath);
  mkdirSync(dirname(zipPath), { recursive: true });

  const output = createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  const done = new Promise((resolveDone, rejectDone) => {
    output.on('close', resolveDone);
    output.on('error', rejectDone);
    archive.on('error', rejectDone);
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') console.warn(err);
      else rejectDone(err);
    });
  });

  archive.pipe(output);
  archive.glob('**/*', { cwd: DIST_DIR, dot: false, ignore: IGNORE_PATTERNS });
  await archive.finalize();
  await done;

  return { bytes: archive.pointer(), entries: archive.pointer() > 0 ? undefined : 0 };
}

async function main() {
  ensureBuilt();
  const version = loadVersion();
  const zipPath = join(RELEASE_DIR, `bookmark-replacer-v${version}.zip`);

  const { bytes } = await pack(zipPath);
  const sizeKb = (bytes / 1024).toFixed(1);
  const rel = zipPath.replace(`${ROOT}/`, '');
  console.log(`Created ${rel} (${sizeKb} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
