const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const rootDir = path.resolve(__dirname, "../..");

test("htmlToSvgExport wraps standalone HTML in svg foreignObject", () => {
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

  const { htmlToSvgExport } = context.App.Utils;
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>T</title></head><body><p class="x">Hello &amp; welcome</p></body></html>`;
  const svg = htmlToSvgExport(html, { width: 600, height: 900 });

  assert.ok(svg.includes('<?xml version="1.0"'), "xml declaration");
  assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'), "svg ns");
  assert.ok(svg.includes('<foreignObject'), "foreignObject");
  assert.ok(svg.includes('xmlns="http://www.w3.org/1999/xhtml"'), "xhtml ns on inner div");
  assert.ok(svg.includes('width="600"'), "custom width");
  assert.ok(svg.includes('height="900"'), "custom height");
  assert.ok(svg.includes("Hello"), "body content preserved");
});
