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

test("enforceEmailFont stamps Arial on text elements that lack a font-family", () => {
  const { enforceEmailFont } = loadUtils();
  const html = '<div style="font-size:14px; color:#fff">hi</div>';
  const out = enforceEmailFont(html);
  assert.ok(/font-family:\s*Arial/i.test(out), "div should get Arial");
  assert.ok(!out.includes("rgba("), "no rgba introduced");
});

test("enforceEmailFont adds a style attr to bare text elements", () => {
  const { enforceEmailFont } = loadUtils();
  const out = enforceEmailFont("<table><tr><td>cell</td></tr></table>");
  assert.ok(/<td style="[^"]*font-family:\s*Arial/i.test(out), "bare td should get Arial via new style attr");
});

test("enforceEmailFont preserves an element's existing font-family", () => {
  const { enforceEmailFont } = loadUtils();
  const html = '<span style="font-family:Georgia, serif; font-size:18px">x</span>';
  const out = enforceEmailFont(html);
  assert.equal((out.match(/font-family/gi) || []).length, 1, "must not add a second font-family");
  assert.ok(out.includes("Georgia"), "existing serif font preserved");
});

test("enforceEmailFont does not touch non-text tags like <img>", () => {
  const { enforceEmailFont } = loadUtils();
  const out = enforceEmailFont('<img src="x.png" style="display:block">');
  assert.ok(!/font-family/i.test(out), "img should not get a font-family");
});

test("enforceEmailFont preserves a full document and only edits the body", () => {
  const { enforceEmailFont } = loadUtils();
  const html =
    '<!DOCTYPE html><html lang="en"><head><style>a{color:red}</style></head>' +
    '<body style="margin:0"><p style="font-size:14px">hi</p></body></html>';
  const out = enforceEmailFont(html);
  assert.ok(/<html/i.test(out), "remains a full document");
  assert.ok(/<style>a\{color:red\}<\/style>/i.test(out), "head <style> untouched");
  assert.ok(/<p style="font-size:14px;\s*font-family:\s*Arial/i.test(out), "body <p> gets Arial");
});

test("enforceEmailFont is a safe no-op on empty input", () => {
  const { enforceEmailFont } = loadUtils();
  assert.equal(enforceEmailFont(""), "");
});
