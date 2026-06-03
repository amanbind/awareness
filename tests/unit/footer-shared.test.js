const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "../..");

function loadScript(context, relativePath) {
  const filename = path.join(rootDir, relativePath);
  vm.runInContext(readFileSync(filename, "utf8"), context, { filename });
}

// Minimal VM context mirroring tests/unit/app-modules.test.js.
function createContext() {
  const context = {
    window: {},
    URL,
    Date,
    console,
    setTimeout,
    clearTimeout,
    navigator: { hardwareConcurrency: 4 },
    performance: { now: () => 0 },
  };
  context.window = context;
  context.App = {
    Utils: {
      log() {},
      fmtDate(v) { return v || ""; },
      stripTags(v) { return String(v || "").replace(/<[^>]*>/g, ""); },
      truncate(v, n) { return String(v || "").slice(0, n); },
      normalizeWebUrl(v) {
        const s = String(v || "").trim();
        if (!s) return "";
        if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
        return `https://${s.replace(/^\/+/, "")}`;
      },
    },
    Graphics: {
      phishEmailCompact: () => "<svg/>", shieldLockCompact: () => "<svg/>", smishingCompact: () => "<svg/>",
      vishingCompact: () => "<svg/>", dataLeakCompact: () => "<svg/>", mfaCompact: () => "<svg/>",
      peopleCompact: () => "<svg/>", warningCompact: () => "<svg/>", fakeSiteCompact: () => "<svg/>",
    },
  };
  return vm.createContext(context);
}

function buildPosterFooter() {
  const context = createContext();
  loadScript(context, "js/feed_scoring.js");
  loadScript(context, "js/rss_fetcher.js");
  loadScript(context, "js/newsletter_builder.js");
  loadScript(context, "js/newsletter/bank_page.js");
  loadScript(context, "js/newsletter/core_templates.js");
  return context.App.NewsletterBuilder.build(
    "poster",
    { org: "ACME", soc: "soc@acme.test", freq: "Weekly", portal: "https://portal.example", pname: "Security & Compliance Awareness Portal" },
    [{ type: "Phishing", title: "T", summary: "S", source: "X", url: "https://x/s", pubDate: "2026-05-23", threatLevel: 3 }],
    { useLinks: false, usePoster: false, useQR: true, useIllus: false }
  );
}

// The shared footer (js/newsletter_builder.js → foot()) backs every core
// template. It was unified to match the polished bank-page portal footer:
// 20px gold heading, 14px sub-line, an Outlook-safe Visit Portal button
// (padding on the TD, not an inline-block anchor that Word balloons), a 90px
// gold-bordered QR + "Scan for Portal", and the bottom org/contact line kept.
test.describe("shared footer matches the bank-page portal footer", () => {
  test("heading renders at 20px gold and forces its colour for Outlook", () => {
    const html = buildPosterFooter();
    // Portal name link sized 20px, gold, with a <font color> so Outlook keeps gold.
    assert.match(html, /font-size:20px;font-weight:bold;color:#D4A420;[^"]*"[^>]*>\s*<font color="#D4A420">Security &amp; Compliance Awareness Portal<\/font>/);
  });

  test("sub-line renders at 14px (was 11px)", () => {
    const html = buildPosterFooter();
    assert.match(html, /font-size:14px;color:#[0-9A-Fa-f]{6};line-height:1.5;">Training modules, policies, and past bulletins\.<\/span>/);
  });

  test("Visit Portal is an Outlook-safe TD-padding button, not an inline-block anchor", () => {
    const html = buildPosterFooter();
    // The padded, bordered TD wraps a plain anchor.
    assert.match(html, /<td align="center" style="border:1px solid #C09010;border-radius:4px;padding:10px 22px;[^"]*">\s*<a [^>]*>Visit Portal<\/a>/);
    // The old inline-block button is gone.
    assert.ok(!/display:inline-block;[^"]*>Visit Portal/.test(html), "old inline-block Visit Portal anchor must be removed");
  });

  test("QR is sized 90x90 via data-qr-size and labelled Scan for Portal", () => {
    const html = buildPosterFooter();
    assert.match(html, /id="nl-qr" data-qr-size="90"/);
    assert.ok(html.includes("Scan for Portal"));
    // The dark, hard-to-read label colour is replaced with a lighter grey.
    assert.ok(!html.includes("color:#555555"), "scan label should no longer use the dark #555555");
  });

  test("bottom org / contact line is preserved", () => {
    const html = buildPosterFooter();
    assert.match(html, /Security Awareness · <a href="mailto:soc@acme\.test"/);
  });
});
