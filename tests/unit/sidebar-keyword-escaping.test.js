// M1 regression lock — the sidebar keyword chips must HTML-escape the keyword
// text and must NOT build an inline onclick by interpolating the raw keyword
// into a JS string (the old `'${k.replace(/'/g,...)}'` pattern). Removal is wired
// through a data-attribute + delegated listener instead.
//
// Also guards that the module installs a REAL escapeHtml (the previous
// `Utils.escapeHtml || (s => String(s))` fallback was a no-op because
// Utils.escapeHtml is never defined).

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..", "..");
const source = readFileSync(path.join(rootDir, "js/ui/sidebar_manager.js"), "utf8");

test("sidebar keyword chips escape the keyword text", () => {
  assert.match(
    source,
    /data-keyword="\$\{escapeHtml\(k\)\}"/,
    "the remove button must carry an escaped data-keyword attribute"
  );
  assert.match(
    source,
    /sb-kword-chip">\$\{escapeHtml\(k\)\}/,
    "the chip label must be escaped"
  );
});

test("sidebar keyword manager no longer interpolates the raw keyword into an onclick string", () => {
  assert.doesNotMatch(
    source,
    /k\.replace\(\/'\/g/,
    "the unsafe `k.replace(/'/g, ...)` onclick pattern must be gone"
  );
  assert.doesNotMatch(
    source,
    /onclick="App\.UI\.removeSidebar\w+Keyword\('\$\{/,
    "no inline onclick should embed an interpolated keyword"
  );
});

test("sidebar_manager installs a real HTML escaper (not the no-op fallback)", () => {
  assert.match(
    source,
    /&lt;/,
    "the escapeHtml fallback must actually escape < to &lt;"
  );
});
