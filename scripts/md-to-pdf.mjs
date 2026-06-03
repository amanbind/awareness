#!/usr/bin/env node
// md-to-pdf.mjs — convert a Markdown file to a print-quality PDF.
// Uses `marked` for MD→HTML and headless Microsoft Edge for HTML→PDF.
// Usage: node scripts/md-to-pdf.mjs <input.md> [output.pdf]

import { readFile, writeFile, unlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { marked } from 'marked';

const args = process.argv.slice(2);
if (!args[0]) {
  console.error('Usage: node scripts/md-to-pdf.mjs <input.md> [output.pdf]');
  process.exit(1);
}
const input = path.resolve(args[0]);
const output = path.resolve(args[1] || input.replace(/\.md$/i, '.pdf'));

const md = await readFile(input, 'utf8');
const bodyHtml = marked.parse(md);

const css = `
  @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, Helvetica, Arial, sans-serif;
    color: #1b1b1b;
    line-height: 1.55;
    font-size: 11.5pt;
    margin: 0;
  }
  h1 { font-size: 22pt; margin: 0 0 6pt; color: #111; letter-spacing: -0.01em; }
  h2 { font-size: 14pt; margin: 18pt 0 6pt; color: #111; border-bottom: 1px solid #d8d8d8; padding-bottom: 3pt; }
  h3 { font-size: 12pt; margin: 12pt 0 4pt; color: #222; }
  p  { margin: 4pt 0 8pt; }
  ul, ol { margin: 4pt 0 8pt; padding-left: 22pt; }
  li { margin-bottom: 3pt; }
  strong { color: #111; }
  hr { border: 0; border-top: 1px solid #d8d8d8; margin: 14pt 0; }
  blockquote {
    margin: 8pt 0; padding: 8pt 12pt;
    border-left: 3px solid #8b6f1a;
    background: #faf6e8;
    color: #222;
    font-style: normal;
  }
  blockquote p { margin: 0; }
  code {
    font-family: 'Cascadia Mono', Consolas, 'Courier New', monospace;
    background: #f4f4f4;
    padding: 1pt 4pt;
    border-radius: 3pt;
    font-size: 10pt;
  }
  pre {
    background: #f4f4f4;
    border: 1px solid #e6e6e6;
    border-radius: 4pt;
    padding: 8pt 10pt;
    overflow: hidden;
    font-size: 10pt;
    page-break-inside: avoid;
  }
  pre code { background: transparent; padding: 0; }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 8pt 0 12pt;
    font-size: 10.5pt;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #d8d8d8;
    padding: 6pt 8pt;
    text-align: left;
    vertical-align: top;
  }
  th { background: #f0ece1; font-weight: 600; color: #2a2a2a; }
  tr:nth-child(even) td { background: #fafaf7; }
  em { color: #555; }
  a { color: #8b6f1a; text-decoration: none; }
`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${path.basename(input)}</title>
<style>${css}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

const tmpHtml = path.join(os.tmpdir(), `md-to-pdf-${Date.now()}.html`);
await writeFile(tmpHtml, html, 'utf8');

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const fileUrl = 'file:///' + tmpHtml.replace(/\\/g, '/');

console.log(`▶ Rendering ${path.basename(input)} → ${path.basename(output)} ...`);
execFileSync(edge, [
  '--headless',
  '--disable-gpu',
  '--no-pdf-header-footer',
  `--print-to-pdf=${output}`,
  fileUrl
], { stdio: 'inherit' });

try { await unlink(tmpHtml); } catch (_e) { /* cleanup */ }

console.log(`✓ Wrote ${output}`);
