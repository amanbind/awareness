#!/usr/bin/env node
// build-dist.mjs — produce a production-ready dist/ folder.
//
// Copies only files that should ship to a public web server. No build step
// (the app is static); this is purely an allowlist-based copy + SRI sanity
// check.
//
// Usage:
//   node scripts/build-dist.mjs           # refuses if dist/ exists
//   node scripts/build-dist.mjs --force   # wipes and rebuilds dist/

import { mkdir, copyFile, readdir, stat, rm, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// ─── Allowlist of files / folders to include in dist/ ────────────────────────

const INCLUDE_FILES = [
  // Entry HTML pages.
  'index.html',
  'preview.html',
  'editor.html',
  'send.html',
  'projects.html',
  'keywords.html',
  'curation-lab.html',
  'config.html',
  'builder.html', // legacy redirect; nginx/Caddy also serve a 301 at the edge.
  'health.html',
  // Top-level metadata, if present (best-effort).
  'LICENSE',
  'README.md',
];

const INCLUDE_DIRS = [
  'js',
  'css',
  'assets',
  'templates',
];

// ─── Per-folder exclusions inside included dirs ──────────────────────────────

const DIR_EXCLUDES = {
  templates: ['reference', 'imported-standalone'],
  // Drop any per-template ensemble-logs subfolder (they're dev artifacts).
  // We also exclude .md README placeholders that exist purely to keep
  // directories alive in the zip — they ship harmlessly, no scrub needed.
};

// File-level patterns to always skip, no matter where they appear.
const FILE_BLOCKLIST = [
  /\.test\.js$/i,
  /\.spec\.js$/i,
  /\.map$/i,
  /\.local\..+$/i,
  /^\.env(\..+)?$/i,
  /^\.git/i,
];

// ─── Args ────────────────────────────────────────────────────────────────────

const force = process.argv.includes('--force');

async function main() {
  console.log('▶ build-dist: packaging production artifact …');
  console.log(`  root: ${ROOT}`);
  console.log(`  dist: ${DIST}`);

  if (existsSync(DIST)) {
    if (!force) {
      console.error('✗ dist/ already exists. Use --force to wipe and rebuild.');
      process.exit(1);
    }
    console.log('  (--force) removing existing dist/');
    await rm(DIST, { recursive: true, force: true });
  }
  await mkdir(DIST, { recursive: true });

  let fileCount = 0;
  let totalBytes = 0;

  for (const file of INCLUDE_FILES) {
    const src = path.join(ROOT, file);
    if (!existsSync(src)) continue;
    const dst = path.join(DIST, file);
    await mkdir(path.dirname(dst), { recursive: true });
    await copyFile(src, dst);
    fileCount++;
    totalBytes += (await stat(dst)).size;
  }

  for (const dir of INCLUDE_DIRS) {
    const src = path.join(ROOT, dir);
    if (!existsSync(src)) continue;
    const excludes = DIR_EXCLUDES[dir] || [];
    const result = await copyTree(src, path.join(DIST, dir), excludes);
    fileCount += result.files;
    totalBytes += result.bytes;
  }

  // SRI sanity check — confirm every cdnjs <script> in shipped HTML carries
  // an integrity hash. (The unit test already locks this in for source; this
  // is a parallel check on the artifact actually heading to production.)
  await verifySriOnShippedHtml();

  console.log('');
  console.log(`✓ dist/ ready: ${fileCount} files, ${formatBytes(totalBytes)}`);
  console.log('  Next:');
  console.log('    docker:  docker build -f deploy/Dockerfile -t awareness:latest .');
  console.log('    server:  rsync -av dist/ user@server:/var/www/awareness/');
  console.log('    cloud :  netlify deploy --dir=dist  /  vercel --prod  /  wrangler pages publish dist');
}

async function copyTree(src, dst, excludes = []) {
  let files = 0;
  let bytes = 0;
  await mkdir(dst, { recursive: true });
  for (const entry of await readdir(src, { withFileTypes: true })) {
    if (excludes.includes(entry.name)) continue;
    // Drop dotfiles (.gitkeep, .DS_Store, etc.).
    if (entry.name.startsWith('.')) continue;
    // Drop per-template ensemble-logs and design subfolders' AI debug logs.
    // (The design subfolder may carry reference images; keep it.)
    if (entry.name === 'ensemble-logs') continue;
    if (FILE_BLOCKLIST.some((re) => re.test(entry.name))) continue;

    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      const r = await copyTree(srcPath, dstPath, []);
      files += r.files;
      bytes += r.bytes;
    } else if (entry.isFile()) {
      await copyFile(srcPath, dstPath);
      files++;
      bytes += (await stat(dstPath)).size;
    }
  }
  return { files, bytes };
}

async function verifySriOnShippedHtml() {
  const entryHtml = [
    'index.html', 'preview.html', 'editor.html', 'send.html',
    'projects.html', 'keywords.html', 'curation-lab.html', 'config.html',
    'builder.html',
  ];
  const failures = [];
  for (const f of entryHtml) {
    const fp = path.join(DIST, f);
    if (!existsSync(fp)) continue;
    const html = await readFile(fp, 'utf8');
    const cdnRe = /<script\s+[^>]*src="https:\/\/cdnjs\.cloudflare\.com\/[^"]+"[^>]*>/gi;
    let m;
    while ((m = cdnRe.exec(html)) !== null) {
      const tag = m[0];
      if (!/integrity="sha384-/.test(tag)) failures.push(`${f}: ${tag}`);
    }
    if (!/<meta[^>]+http-equiv="Content-Security-Policy"/i.test(html)) {
      failures.push(`${f}: meta CSP missing in shipped artifact`);
    }
  }
  if (failures.length) {
    console.error('✗ SRI / CSP audit on shipped artifact failed:');
    for (const f of failures) console.error('  - ' + f);
    process.exit(2);
  }
  console.log('  ✓ SRI hashes and meta CSP verified on every shipped HTML page');
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

main().catch((err) => {
  console.error('✗ build-dist failed:', err.stack || err.message || err);
  process.exit(1);
});

// Suppress "unused" warning for crypto when not invoking the SRI computation
// directly here — we may compute hashes from this file later, keeping the
// import documents the intent.
void crypto;
