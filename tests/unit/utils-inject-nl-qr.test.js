const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const rootDir = path.resolve(__dirname, "../..");

test("injectNlQrImageIntoHtml fills #nl-qr with an img", () => {
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

  const { injectNlQrImageIntoHtml } = context.App.Utils;
  const body =
    '<div data-template-id="x"><table><tr><td><div id="nl-qr"></div></td></tr></table></div>';
  const uri = "data:image/png;base64,AAA";
  const out = injectNlQrImageIntoHtml(body, uri);

  assert.ok(out.includes('id="nl-qr"'));
  assert.ok(out.includes('src="data:image/png;base64,AAA"'));
  assert.ok(out.includes('width="144"'));
});
