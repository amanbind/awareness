const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const rootDir = path.resolve(__dirname, "../..");

function loadUtils() {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "https://example.test/",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  window.App = window.App || {};
  const context = vm.createContext({
    window,
    document: window.document,
    navigator: window.navigator,
    DOMParser: window.DOMParser,
    XMLSerializer: window.XMLSerializer,
    console,
    URL,
    Blob,
    App: window.App,
  });
  vm.runInContext(readFileSync(path.join(rootDir, "js/utils.js"), "utf8"), context);
  return context.App.Utils;
}

test("compositeRgbaOverHex composites over the backdrop", () => {
  const { compositeRgbaOverHex } = loadUtils();
  // 85% white over near-black → light grey (Outlook-readable, not invisible)
  assert.equal(compositeRgbaOverHex(255, 255, 255, 0.85, "#0a0a0a"), "#dadada");
  // 50% black over white → mid grey
  assert.equal(compositeRgbaOverHex(0, 0, 0, 0.5, "#ffffff"), "#808080");
  // fully opaque → the colour itself, regardless of backdrop
  assert.equal(compositeRgbaOverHex(212, 164, 32, 1, "#111111"), "#d4a420");
  // fully transparent → the backdrop shows through
  assert.equal(compositeRgbaOverHex(255, 255, 255, 0, "#112233"), "#112233");
});

test("flattenEmailColors rewrites rgba text colour over an ancestor bgcolor", () => {
  const { flattenEmailColors } = loadUtils();
  const html =
    '<table bgcolor="#0a0a0a"><tr><td style="color:rgba(255,255,255,.85)">Hi</td></tr></table>';
  const out = flattenEmailColors(html);
  assert.ok(!out.includes("rgba("), "no rgba() should remain");
  assert.ok(out.includes("#dadada"), "white .85 over #0a0a0a → #dadada");
});

test("flattenEmailColors uses the element's own background for its backdrop", () => {
  const { flattenEmailColors } = loadUtils();
  const html =
    '<table><tr><td bgcolor="#ffffff" style="color:rgba(0,0,0,.5)">x</td></tr></table>';
  const out = flattenEmailColors(html);
  assert.ok(out.includes("#808080"), "black .5 over own white bg → #808080");
});

test("flattenEmailColors preserves a full document and flattens within it", () => {
  const { flattenEmailColors } = loadUtils();
  const html =
    '<!DOCTYPE html><html lang="en"><head><style>a{color:red}</style></head>' +
    '<body style="background:#111111"><p style="color:rgba(255,255,255,.7)">hi</p></body></html>';
  const out = flattenEmailColors(html);
  assert.ok(/<html/i.test(out), "remains a full document");
  assert.ok(/<style>/i.test(out), "head <style> preserved");
  assert.ok(!out.includes("rgba("), "no rgba() should remain");
  assert.ok(out.includes("#b8b8b8"), "white .7 over #111111 → #b8b8b8");
});

test("flattenEmailColors is a no-op when there is no rgba()", () => {
  const { flattenEmailColors } = loadUtils();
  const html = '<td style="color:#ffffff">x</td>';
  assert.equal(flattenEmailColors(html), html);
});
