// H1 regression lock — the article list (renderArticles) must HTML-escape every
// externally-sourced article field before it is interpolated into innerHTML, and
// must route the article link through a scheme-sanitizing helper. Article data
// comes from third-party RSS feeds via public proxies, so it is untrusted.
//
// Source-scan style (matches tests/unit/security.test.js): renderArticles is
// DOM-coupled and not factored into a pure helper, so we assert against the
// source rather than executing it.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..", "..");
const source = readFileSync(path.join(rootDir, "js/ui_controller.js"), "utf8");

test("renderArticles escapes every external article field", () => {
  for (const field of ["title", "source", "summary", "type"]) {
    assert.match(
      source,
      new RegExp(`escapeHtml\\(art\\?\\.${field}`),
      `article ${field} must be wrapped in escapeHtml() before innerHTML`
    );
  }
});

test("renderArticles escapes watchout list items and type-filter chips", () => {
  assert.match(
    source,
    /map\(w\s*=>\s*`<li>\$\{escapeHtml\(w\)\}<\/li>`/,
    "each watchout item must be escaped"
  );
  assert.match(
    source,
    /escapeHtml\(t\)/,
    "type-filter chip text/onclick must escape the type value"
  );
});

test("renderArticles routes the article href through a scheme-sanitizing safeUrl()", () => {
  assert.match(
    source,
    /function safeUrl\(/,
    "a safeUrl() helper must exist"
  );
  assert.match(
    source,
    /href="\$\{safeUrl\(art\?\.url\)\}"/,
    "the article link href must use safeUrl(), not raw art.url"
  );
  // safeUrl must block javascript:/vbscript:/data: schemes.
  assert.match(
    source,
    /javascript:|vbscript:|data:/,
    "safeUrl should reject dangerous URL schemes"
  );
});
