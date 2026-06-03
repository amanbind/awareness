const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const rootDir = path.resolve(__dirname, "../..");

test("plainTextFromClipboardHtml preserves bullets and paragraph breaks", () => {
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
    console,
    URL,
    Blob,
    App: window.App,
    ClipboardItem: window.ClipboardItem,
  });
  vm.runInContext(readFileSync(path.join(rootDir, "js/utils.js"), "utf8"), context);

  const { plainTextFromClipboardHtml } = context.App.Utils;
  const html = `
    <style>.x{color:red}</style>
    <p>Intro line.</p>
    <ul><li>First action</li><li>Second action</li></ul>
    <p>Closing.</p>
  `;
  const plain = plainTextFromClipboardHtml(html);
  assert.match(plain, /Intro line/);
  assert.match(plain, /•\s*First action/);
  assert.match(plain, /•\s*Second action/);
  assert.match(plain, /Closing/);
  assert.ok(!plain.includes("<style"), "script/style content should not appear as tags in plain output");
});
