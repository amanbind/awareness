const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "../..");

let JSDOMParser = null;
try {
  JSDOMParser = new (require("jsdom").JSDOM)("", { contentType: "text/html" }).window.DOMParser;
} catch {
  JSDOMParser = null;
}

function loadScript(context, relativePath) {
  const filename = path.join(rootDir, relativePath);
  vm.runInContext(readFileSync(filename, "utf8"), context, { filename });
}

function createContext() {
  const context = {
    window: {},
    console,
    DOMParser: JSDOMParser || (typeof globalThis.DOMParser !== 'undefined' ? globalThis.DOMParser : undefined),
    document: {
      getElementById() {
        return null;
      },
      createElement() {
        return {};
      },
      body: { appendChild() {} },
    },
  };
  context.window = context;
  return vm.createContext(context);
}

test("updateNewsletterNodeTextByMirrorPath updates text via template-relative path", (t) => {
  if (!JSDOMParser) {
    t.skip('Install jsdom devDependency to run DOMParser-based utils tests');
    return;
  }
  const context = createContext();
  loadScript(context, "js/utils.js");
  const { updateNewsletterNodeTextByMirrorPath } = context.App.Utils;

  const html = '<div data-template-id="x"><section><p>Alpha</p></section></div>';
  const relPath = [0, 0];
  const r = updateNewsletterNodeTextByMirrorPath(html, null, relPath, "Beta", 5);
  assert.equal(r.updated, true);
  assert.ok(r.html.includes("Beta"));
  assert.ok(!r.html.includes("Alpha"));
});

test("updateNewsletterNodeTextByMirrorPath falls back to body child path", (t) => {
  if (!JSDOMParser) {
    t.skip('Install jsdom devDependency to run DOMParser-based utils tests');
    return;
  }
  const context = createContext();
  loadScript(context, "js/utils.js");
  const { updateNewsletterNodeTextByMirrorPath } = context.App.Utils;

  const html = '<style></style><div><span>Old</span></div>';
  const path = [1, 0];
  const r = updateNewsletterNodeTextByMirrorPath(html, path, null, "New", 5);
  assert.equal(r.updated, true);
  assert.ok(r.html.includes("New"));
});

test("updateNewsletterNodeImageSrcByMirrorPath swaps <img> src via template-relative path", (t) => {
  if (!JSDOMParser) {
    t.skip('Install jsdom devDependency to run DOMParser-based utils tests');
    return;
  }
  const context = createContext();
  loadScript(context, "js/utils.js");
  const { updateNewsletterNodeImageSrcByMirrorPath } = context.App.Utils;

  const html = '<div data-template-id="x"><section><img src="old.png"></section></div>';
  const relPath = [0, 0];
  const r = updateNewsletterNodeImageSrcByMirrorPath(html, null, relPath, "data:image/png;base64,NEW", 5);
  assert.equal(r.updated, true);
  assert.ok(r.html.includes('src="data:image/png;base64,NEW"'));
  assert.ok(!r.html.includes('old.png'));
});

test("updateNewsletterNodeImageSrcByMirrorPath refuses to set src on non-IMG nodes", (t) => {
  if (!JSDOMParser) {
    t.skip('Install jsdom devDependency to run DOMParser-based utils tests');
    return;
  }
  const context = createContext();
  loadScript(context, "js/utils.js");
  const { updateNewsletterNodeImageSrcByMirrorPath } = context.App.Utils;

  // Target is a <span>, not an <img> — must not mutate.
  const html = '<div data-template-id="x"><section><span>Alpha</span></section></div>';
  const relPath = [0, 0];
  const r = updateNewsletterNodeImageSrcByMirrorPath(html, null, relPath, "data:image/png;base64,NEW", 5);
  assert.equal(r.updated, false);
  assert.ok(r.html.includes('Alpha'));
});
