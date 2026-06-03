// Unit tests for App.Utils.inlineDataUriAttachments — rewrites inline
// <img src="data:image/...;base64,..."> to <img src="cid:..."> and returns
// matching inline attachments[] so classic Outlook / Gmail (which block data:
// images) render the QR + embedded illustrations. Send-path only.

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const rootDir = path.resolve(__dirname, "../..");

function loadUtils() {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "https://example.test/" });
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

test("inlineDataUriAttachments is exported on App.Utils", () => {
  const { inlineDataUriAttachments } = loadUtils();
  assert.equal(typeof inlineDataUriAttachments, "function");
});

test("rewrites a base64 png data: img to cid: and emits one attachment", () => {
  const { inlineDataUriAttachments } = loadUtils();
  const html = '<img src="data:image/png;base64,iVBORw0KGgo=" alt="qr">';
  const { html: out, attachments } = inlineDataUriAttachments(html);
  assert.match(out, /src="cid:[^"]+"/);
  assert.equal(attachments.length, 1);
  assert.equal(attachments[0].contentType, "image/png");
  assert.equal(attachments[0].base64, "iVBORw0KGgo=");
  const cid = out.match(/src="cid:([^"]+)"/)[1];
  assert.equal(cid, attachments[0].contentId);
  assert.match(attachments[0].contentId, /^[a-z0-9-]+$/);
});

test("maps jpeg subtype to image/jpeg and .jpg filename", () => {
  const { inlineDataUriAttachments } = loadUtils();
  const html = '<img src="data:image/jpeg;base64,/9j/4AAQ=">';
  const { attachments } = inlineDataUriAttachments(html);
  assert.equal(attachments.length, 1);
  assert.equal(attachments[0].contentType, "image/jpeg");
  assert.ok(attachments[0].filename.endsWith(".jpg"));
});

test("dedupes identical data: URIs to a single attachment", () => {
  const { inlineDataUriAttachments } = loadUtils();
  const uri = "data:image/png;base64,AAAA";
  const html = `<img src="${uri}"><img src="${uri}">`;
  const { html: out, attachments } = inlineDataUriAttachments(html);
  assert.equal(attachments.length, 1);
  const cids = [...out.matchAll(/src="cid:([^"]+)"/g)].map((m) => m[1]);
  assert.equal(cids.length, 2);
  assert.equal(cids[0], cids[1]);
});

test("handles single quotes around src", () => {
  const { inlineDataUriAttachments } = loadUtils();
  const html = "<img src='data:image/png;base64,ZZZ='>";
  const { html: out, attachments } = inlineDataUriAttachments(html);
  assert.equal(attachments.length, 1);
  assert.match(out, /src='cid:[^']+'/);
});

test("leaves assets/ and http(s) srcs untouched", () => {
  const { inlineDataUriAttachments } = loadUtils();
  const html =
    '<img src="assets/ABI.png"><img src="https://x.test/a.png">';
  const { html: out, attachments } = inlineDataUriAttachments(html);
  assert.equal(attachments.length, 0);
  assert.equal(out, html);
});

test("leaves non-base64 data: URIs untouched", () => {
  const { inlineDataUriAttachments } = loadUtils();
  const html = '<img src="data:image/svg+xml,%3Csvg%3E%3C/svg%3E">';
  const { html: out, attachments } = inlineDataUriAttachments(html);
  assert.equal(attachments.length, 0);
  assert.equal(out, html);
});

test("returns html unchanged when no data: images present", () => {
  const { inlineDataUriAttachments } = loadUtils();
  const html = "<p>no images</p>";
  const { html: out, attachments } = inlineDataUriAttachments(html);
  assert.equal(out, html);
  assert.equal(attachments.length, 0);
});
