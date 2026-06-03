// Unit tests for App.Utils.inlineCidAttachments — the helper that rewrites
// <img src="assets/X.png"> to <img src="cid:..."> and returns matching
// attachments[] (base64) for the Graph relay to send as inline
// multipart/related parts. Lets Outlook + Gmail render images automatically.

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

// Predictable fake fetcher — returns "BASE64<path>" so we can assert
// which asset went to which contentId. The real browser fetcher returns
// real base64; the contract is identical.
const fakeFetcher = async (p) => "BASE64<" + p + ">";

test("inlineCidAttachments is exported on App.Utils", () => {
  const { inlineCidAttachments } = loadUtils();
  assert.equal(typeof inlineCidAttachments, "function");
});

test('rewrites a single <img src="assets/..."> to cid: and emits one attachment', async () => {
  const { inlineCidAttachments } = loadUtils();
  const html = '<img src="assets/ABI.png" alt="logo">';
  const { html: out, attachments } = await inlineCidAttachments(html, fakeFetcher);
  assert.match(out, /src="cid:[^"]+"/);
  assert.equal(attachments.length, 1);
  assert.equal(attachments[0].filename, "ABI.png");
  assert.equal(attachments[0].contentType, "image/png");
  assert.equal(attachments[0].base64, "BASE64<assets/ABI.png>");
  const cidInHtml = out.match(/src="cid:([^"]+)"/)[1];
  assert.equal(cidInHtml, attachments[0].contentId);
});

test("dedupes when the same asset is referenced multiple times", async () => {
  const { inlineCidAttachments } = loadUtils();
  const html = '<img src="assets/beermug.png"><br><img src="assets/beermug.png">';
  const { html: out, attachments } = await inlineCidAttachments(html, fakeFetcher);
  assert.equal(attachments.length, 1, "one attachment for one unique asset");
  const cidMatches = [...out.matchAll(/src="cid:([^"]+)"/g)].map((m) => m[1]);
  assert.equal(cidMatches.length, 2, "both <img> tags get rewritten");
  assert.equal(cidMatches[0], cidMatches[1], "both reference the same CID");
});

test("leaves absolute http(s) and data: URIs untouched", async () => {
  const { inlineCidAttachments } = loadUtils();
  const html = [
    '<img src="https://example.com/img.png">',
    '<img src="http://example.com/x.jpg">',
    '<img src="data:image/png;base64,iVBORw0KGgo=">',
  ].join("");
  const { html: out, attachments } = await inlineCidAttachments(html, fakeFetcher);
  assert.equal(attachments.length, 0);
  assert.equal(out, html, "non-asset srcs are preserved verbatim");
});

test("returns original html unchanged when there are no asset images", async () => {
  const { inlineCidAttachments } = loadUtils();
  const html = "<p>Hello, no images here.</p>";
  const { html: out, attachments } = await inlineCidAttachments(html, fakeFetcher);
  assert.equal(out, html);
  assert.equal(attachments.length, 0);
});

test("handles single quotes around src attribute", async () => {
  const { inlineCidAttachments } = loadUtils();
  const html = "<img src='assets/ABI.png'>";
  const { html: out, attachments } = await inlineCidAttachments(html, fakeFetcher);
  assert.equal(attachments.length, 1);
  assert.match(out, /src=['"]cid:[^'"]+['"]/);
});

test("infers contentType from extension (png/jpg/gif/svg)", async () => {
  const { inlineCidAttachments } = loadUtils();
  const html = [
    '<img src="assets/a.png">',
    '<img src="assets/b.jpg">',
    '<img src="assets/c.jpeg">',
    '<img src="assets/d.gif">',
    '<img src="assets/e.svg">',
  ].join("");
  const { attachments } = await inlineCidAttachments(html, fakeFetcher);
  const byName = Object.fromEntries(attachments.map((a) => [a.filename, a.contentType]));
  assert.equal(byName["a.png"], "image/png");
  assert.equal(byName["b.jpg"], "image/jpeg");
  assert.equal(byName["c.jpeg"], "image/jpeg");
  assert.equal(byName["d.gif"], "image/gif");
  assert.equal(byName["e.svg"], "image/svg+xml");
});

test("skips assets that fail to fetch; never throws", async () => {
  const { inlineCidAttachments } = loadUtils();
  const html = '<img src="assets/good.png"><img src="assets/bad.png">';
  const flakyFetcher = async (p) => {
    if (p.endsWith("bad.png")) throw new Error("not found");
    return "BASE64<" + p + ">";
  };
  const { html: out, attachments } = await inlineCidAttachments(html, flakyFetcher);
  assert.equal(attachments.length, 1, "only the good asset becomes an attachment");
  assert.equal(attachments[0].filename, "good.png");
  assert.match(out, /src="cid:[^"]+"/);
  assert.ok(out.includes('src="assets/bad.png"'), "the un-fetchable asset is left as-is");
});

test("does not touch images outside the assets/ prefix", async () => {
  const { inlineCidAttachments } = loadUtils();
  const html = '<img src="other-folder/x.png"><img src="assets/y.png">';
  const { attachments } = await inlineCidAttachments(html, fakeFetcher);
  assert.equal(attachments.length, 1);
  assert.equal(attachments[0].filename, "y.png");
});

test("contentId is DNS-safe (lowercase alnum + hyphens)", async () => {
  const { inlineCidAttachments } = loadUtils();
  const html = '<img src="assets/Some_Weird Name.PNG">';
  const { attachments } = await inlineCidAttachments(html, fakeFetcher);
  assert.equal(attachments.length, 1);
  assert.match(attachments[0].contentId, /^[a-z0-9-]+$/);
});

test("non-function fetcher → returns html unchanged, no attachments", async () => {
  const { inlineCidAttachments } = loadUtils();
  const html = '<img src="assets/ABI.png">';
  const { html: out, attachments } = await inlineCidAttachments(html, null);
  assert.equal(out, html);
  assert.equal(attachments.length, 0);
});
