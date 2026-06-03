/**
 * Reads HTML from templates/imported-standalone/, strips <head> (Google Fonts),
 * normalizes font stacks and main card width for email-safe comparison copies.
 * Output: templates/imported-email-safe/*.html
 *
 * Usage: node scripts/normalize-imported-templates.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'templates', 'imported-standalone');
const OUT = path.join(ROOT, 'templates', 'imported-email-safe');

function normalizeHtml(raw) {
  let s = raw.replace(/<head[\s\S]*?<\/head>/gi, '');
  s = s.replace(/<!DOCTYPE[^>]*>/gi, '');
  s = s.replace(/<\/?html[^>]*>/gi, '');
  s = s.replace(/<body([^>]*)>/gi, '<div data-nl-import-body="1"$1>');
  s = s.replace(/<\/body>/gi, '</div>');
  s = s.replace(/'DM Sans', Helvetica, Arial, sans-serif/gi, 'Arial, Helvetica, sans-serif');
  s = s.replace(/font-family:\s*'DM Sans'/gi, 'font-family: Arial, Helvetica, sans-serif');
  s = s.replace(/'DM Serif Display', Georgia, serif/gi, 'Georgia, "Times New Roman", Times, serif');
  s = s.replace(/font-family:\s*'DM Serif Display'/gi, 'font-family: Georgia, "Times New Roman", Times, serif');
  s = s.replace(/font-family:\s*'DM Serif Display',\s*serif/gi, 'font-family: Georgia, "Times New Roman", Times, serif');
  s = s.replace(/width="700"/g, 'width="640"');
  return s.trim() + '\n';
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('Missing folder:', SRC);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.html'));
  if (!files.length) {
    console.error('No .html files in', SRC);
    process.exit(1);
  }
  for (const f of files) {
    const raw = fs.readFileSync(path.join(SRC, f), 'utf8');
    const out = normalizeHtml(raw);
    fs.writeFileSync(path.join(OUT, f), out, 'utf8');
    console.log('Wrote', path.relative(ROOT, path.join(OUT, f)));
  }
  console.log('Done:', files.length, 'file(s).');
}

main();
