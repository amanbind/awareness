// Unit tests for App.Utils.buildEmlMime — assembles a send-ready .eml
// (multipart/related, X-Unsent:1) from cid-rewritten HTML + inline attachments.
// Opening the .eml in classic Outlook gives an editable draft with images inline.

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

// Pull the base64 body of the text/html MIME part and decode it back to HTML.
function decodeHtmlPart(eml) {
  const m = eml.match(/Content-Type: text\/html[^]*?\r\n\r\n([A-Za-z0-9+/=\r\n]+?)(?:\r\n--|\r\n*$)/);
  if (!m) return null;
  return Buffer.from(m[1].replace(/[\r\n]/g, ""), "base64").toString("utf8");
}

test("buildEmlMime is exported on App.Utils", () => {
  const { buildEmlMime } = loadUtils();
  assert.equal(typeof buildEmlMime, "function");
});

test("with attachments: multipart/related, X-Unsent draft, inline CID image", () => {
  const { buildEmlMime } = loadUtils();
  const html = '<html><body><img src="cid:aw-inline-1"></body></html>';
  const atts = [
    { contentId: "aw-inline-1", contentType: "image/png", base64: "AAAA", filename: "inline-1.png" },
  ];
  const eml = buildEmlMime(html, atts, { subject: "Weekly Bulletin" });

  assert.match(eml, /^MIME-Version: 1\.0\r\n/);
  assert.ok(eml.includes("X-Unsent: 1"), "X-Unsent makes Outlook open an editable draft");
  assert.ok(eml.includes("Subject: Weekly Bulletin"));
  assert.ok(eml.includes("multipart/related"));
  assert.ok(eml.includes("Content-ID: <aw-inline-1>"));
  assert.ok(eml.includes("Content-Disposition: inline; filename=\"inline-1.png\""));
  assert.ok(eml.includes("Content-Type: image/png"));
  assert.equal(decodeHtmlPart(eml), html, "the HTML part round-trips");
});

test("without attachments: single text/html part, no multipart", () => {
  const { buildEmlMime } = loadUtils();
  const html = "<p>hi &amp; bye</p>";
  const eml = buildEmlMime(html, [], { subject: "X" });
  assert.ok(eml.includes("X-Unsent: 1"));
  assert.ok(!eml.includes("multipart/related"));
  assert.ok(eml.includes("Content-Type: text/html"));
  assert.equal(decodeHtmlPart(eml), html);
});

test("non-ASCII subject is RFC 2047 encoded", () => {
  const { buildEmlMime } = loadUtils();
  const eml = buildEmlMime("<p>x</p>", [], { subject: "Sécurité" });
  assert.match(eml, /Subject: =\?utf-8\?B\?[A-Za-z0-9+/=]+\?=/);
});

test("skips attachments missing contentId/base64", () => {
  const { buildEmlMime } = loadUtils();
  const html = '<img src="cid:ok">';
  const atts = [
    { contentId: "ok", contentType: "image/png", base64: "AAAA", filename: "a.png" },
    { contentId: "", base64: "BBBB" },
    { contentId: "nob64", contentType: "image/png" },
  ];
  const eml = buildEmlMime(html, atts, {});
  assert.ok(eml.includes("Content-ID: <ok>"));
  assert.ok(!eml.includes("Content-ID: <nob64>"));
});
