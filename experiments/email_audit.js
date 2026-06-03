const fs = require('fs');
const html = fs.readFileSync('corp_preview2.html', 'utf8');

const checks = [
  ['No <div> for layout',             () => !/<div/i.test(html)],
  ['No <style> blocks',               () => !/<style[\s>]/i.test(html)],
  ['No <svg> elements',               () => !/<svg[\s>]/i.test(html)],
  ['No display:flex',                 () => !/display\s*:\s*flex/i.test(html)],
  ['No display:grid',                 () => !/display\s*:\s*grid/i.test(html)],
  ['No position:fixed/absolute',      () => !/position\s*:\s*(fixed|absolute)/i.test(html)],
  ['No animation/transition props',   () => !/\banimation\s*:|transition\s*:/i.test(html)],
  ['No @media queries',               () => !/@media/i.test(html)],
  ['No Google Fonts link tag',        () => !/<link[^>]+fonts\.google/i.test(html)],
  ['No @font-face',                   () => !/@font-face/i.test(html)],
  ['All CSS is inline (no class=)',   () => !/ class="/i.test(html)],
  ['Tables use cellpadding attr',     () => /cellpadding="0"/i.test(html)],
  ['Tables use cellspacing attr',     () => /cellspacing="0"/i.test(html)],
  ['bgcolor on dark rows present',    () => /bgcolor="#0A0A0A"/i.test(html)],
  ['No border-radius (Outlook risk)', () => !/border-radius/i.test(html)],
  ['No box-shadow (Outlook risk)',    () => !/box-shadow/i.test(html)],
  ['Data URI SVGs (img not svg tag)', () => /data:image\/svg\+xml/i.test(html)],
  ['MSO conditional comments present',() => /<!--\[if mso\]>/i.test(html)],
];

let pass = 0, fail = 0;
checks.forEach(([name, fn]) => {
  const ok = fn();
  console.log((ok ? '✓ PASS' : '✗ FAIL') + '  ' + name);
  ok ? pass++ : fail++;
});
console.log('');
console.log(pass + '/' + checks.length + ' checks passed' + (fail ? '  —  ' + fail + ' issue(s)' : '  —  fully email-safe!'));
