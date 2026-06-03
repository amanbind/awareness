const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "../..");

// Load js/graphics_engine.js in an isolated context. The module only touches
// window.App (no DOM), so a minimal sandbox is enough.
function loadGraphics() {
  const context = { window: {}, console };
  context.window = context;
  vm.createContext(context);
  const filename = path.join(rootDir, "js/graphics_engine.js");
  vm.runInContext(readFileSync(filename, "utf8"), context, { filename });
  return context.App.Graphics;
}

test("formatThumb returns an <img> for a template with a registered image", () => {
  const G = loadGraphics();
  const html = G.formatThumb("gen_cybershield");
  assert.match(html, /^<img\b/, "expected an <img> tag");
  assert.match(
    html,
    /src="templates\/gen_cybershield\/design\/thumb\.png"/,
    "expected the registered image path",
  );
  assert.match(html, /onerror="App\.Graphics\.thumbFallback\(this\)"/, "expected an onerror fallback");
  assert.match(html, /data-thumb-id="gen_cybershield"/, "expected the id carried for the fallback");
});

test("thumbFallback swaps a broken <img> for the template's SVG thumbnail", () => {
  const G = loadGraphics();
  let replacement;
  const fakeImg = {
    getAttribute: () => "gen_cybershield",
    set outerHTML(value) {
      replacement = value;
    },
  };
  G.thumbFallback(fakeImg);
  assert.match(replacement, /^<svg\b/, "expected the SVG thumbnail as the fallback");
});

test("formatThumb falls back to the SVG thumbnail when no image is registered", () => {
  const G = loadGraphics();
  // knowbe4 has an SVG thumbnail but no registered image.
  const html = G.formatThumb("knowbe4");
  assert.match(html, /^<svg\b/, "expected the SVG fallback");
});

test("formatThumb falls back to the poster SVG for an unknown id", () => {
  const G = loadGraphics();
  const html = G.formatThumb("does-not-exist");
  assert.equal(html, G.FORMAT_THUMBS.poster);
});
