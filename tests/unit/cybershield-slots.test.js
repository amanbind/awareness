const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "../..");

function loadScript(context, relativePath) {
  vm.runInContext(readFileSync(path.join(rootDir, relativePath), "utf8"), context, {
    filename: path.join(rootDir, relativePath),
  });
}

// ── Harness A: AISummarizer (for fillNewsletterTextSlots + local slot helpers) ──
function aiContext() {
  const context = {
    window: {},
    fetch: async () => ({ ok: false }),
    TextDecoder,
    TextEncoder,
    Uint8Array,
    console,
    setTimeout,
    clearTimeout,
  };
  context.window = context;
  context.App = {
    Utils: {
      log() {},
      truncate(v, n) { return String(v || "").slice(0, n); },
      wait(ms) { return new Promise((r) => setTimeout(r, ms)); },
    },
  };
  return vm.createContext(context);
}

function loadAISummarizer(context) {
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  return context.App.AISummarizer;
}

// ── Harness B: NewsletterBuilder (for build('gen_cybershield', ...)) ──
function builderContext() {
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

function loadBuilder(context) {
  loadScript(context, "js/feed_scoring.js");
  loadScript(context, "js/rss_fetcher.js");
  loadScript(context, "js/newsletter_builder.js");
  loadScript(context, "js/newsletter/bank_page.js");
  loadScript(context, "js/newsletter/core_templates.js");
  return context.App.NewsletterBuilder;
}

const SMISHING_ARTS = [
  { type: "Smishing", title: "Fake missed delivery text messages target staff", description: "Smishing on the rise; SMS links steal logins.", source: "X", url: "https://x/s" },
  { type: "Phishing", title: "QR phishing harvests payroll credentials", description: "Spoofed login pages.", source: "Y", url: "https://y/s" },
];

test.describe("gen_cybershield article-driven threat + red-flag slots", () => {
  test("fillNewsletterTextSlots(local) returns threat, 4 red-flags, and the unchanged impact", async () => {
    const AIS = loadAISummarizer(aiContext());
    const slots = await AIS.fillNewsletterTextSlots("gen_cybershield", SMISHING_ARTS, { forceLocal: true, mode: "balanced" });
    assert.equal(typeof slots.nlCybershieldThreat, "string");
    assert.ok(slots.nlCybershieldThreat.length > 20, "threat overview should be a real paragraph");
    assert.ok(Array.isArray(slots.nlCybershieldRedFlags), "red flags should be an array");
    assert.equal(slots.nlCybershieldRedFlags.length, 4, "always exactly 4 red flags");
    // Impact slot is still produced exactly as before (Why-it-matters untouched).
    assert.equal(typeof slots.nlCybershieldImpact, "string");
    assert.ok(slots.nlCybershieldImpact.length > 20);
  });

  test("local slots adapt to the picked articles' threat types (smishing)", async () => {
    const AIS = loadAISummarizer(aiContext());
    const threat = AIS.localCybershieldThreat(SMISHING_ARTS);
    const flags = AIS.localCybershieldRedFlags(SMISHING_ARTS);
    assert.match(threat, /smishing|sms|text/i);
    assert.equal(flags.length, 4);
    assert.match(flags.join(" "), /sms|text|smishing/i, "a smishing indicator should appear");
  });

  test("empty/undetectable article set yields the 4 default indicators and the default overview", async () => {
    const AIS = loadAISummarizer(aiContext());
    const slots = await AIS.fillNewsletterTextSlots("gen_cybershield", [], { forceLocal: true });
    assert.equal(slots.nlCybershieldRedFlags.length, 4);
    assert.match(slots.nlCybershieldRedFlags.join(" "), /Sender address|Urgent language|attachments|Mismatched URLs/);
    assert.match(slots.nlCybershieldThreat, /Cybercriminals are increasingly targeting/);
  });
});

test.describe("buildGenCybershield consumes the new slots", () => {
  test("renders the provided threat overview + 4 red flags, keeps impact and stat tiles", () => {
    const NB = loadBuilder(builderContext());
    const cfg = {
      org: "ACME", soc: "soc@acme.test", portal: "https://portal.example", pname: "Phishing Maestro",
      nlCybershieldThreat: "CUSTOM THREAT OVERVIEW for the edition.",
      nlCybershieldRedFlags: ["RF alpha indicator", "RF bravo indicator", "RF charlie indicator", "RF delta indicator"],
      nlCybershieldImpact: "CUSTOM IMPACT SUMMARY about consequences.",
    };
    const html = NB.build("gen_cybershield", cfg, SMISHING_ARTS, { useLinks: false, usePoster: false, useQR: false, useIllus: false });
    assert.ok(html.includes('data-template-id="gen_cybershield"'));
    assert.ok(html.includes("CUSTOM THREAT OVERVIEW for the edition."), "threat overview rendered");
    for (const rf of cfg.nlCybershieldRedFlags) {
      assert.ok(html.includes(rf), `red flag rendered: ${rf}`);
    }
    // Why-it-matters + stat tiles untouched.
    assert.ok(html.includes("CUSTOM IMPACT SUMMARY about consequences."), "impact still rendered");
    assert.ok(html.includes("91%") && html.includes("$4.9M") && html.includes("3.4B"), "stat tiles still static");
  });

  test("removes the full-bleed image and moves Why it matters into its place (before Recognizing)", () => {
    const NB = loadBuilder(builderContext());
    const html = NB.build("gen_cybershield", { org: "ACME", soc: "soc@acme.test", nlCybershieldImpact: "IMPACT XYZ" }, SMISHING_ARTS, { useLinks: false, usePoster: false, useQR: false, useIllus: false });
    // The full-bleed image is gone.
    assert.ok(!html.includes("assets/temp_img.jpeg"), "full-bleed image removed");
    // Order: What's the threat? → Why it matters → Recognizing Security Threats.
    const whatsThreat = html.indexOf("What's the threat?");
    const why = html.indexOf("Why it matters");
    const recognizing = html.indexOf("Recognizing Security Threats");
    assert.ok(whatsThreat > -1 && why > -1 && recognizing > -1, "all three sections present");
    assert.ok(whatsThreat < why, "Why it matters should come after What's the threat");
    assert.ok(why < recognizing, "Why it matters should come before Recognizing Security Threats");
    // Stat tiles travelled with the Why-it-matters block.
    assert.ok(html.includes("91%") && html.includes("$4.9M") && html.includes("3.4B"), "stat tiles still present");
  });

  test("article cards show each article's published date under the source", () => {
    const NB = loadBuilder(builderContext());
    const arts = [
      { type: "Phishing", title: "Kali365 phishing kit bypasses MFA", source: "Malwarebytes Blog", url: "https://a/s", pubDate: "2026-05-23" },
      { type: "Phishing", title: "Fake LinkedIn emails abuse Adobe", source: "Malwarebytes Blog", url: "https://b/s", pubDate: "2026-05-22" },
    ];
    const html = NB.build("gen_cybershield", { org: "ACME", soc: "soc@acme.test" }, arts, { useLinks: false, usePoster: false, useQR: false, useIllus: false });
    assert.ok(html.includes("2026-05-23"), "card 1 date rendered");
    assert.ok(html.includes("2026-05-22"), "card 2 date rendered");
    // The date sits after the source line within card 1.
    const src = html.indexOf("Malwarebytes Blog");
    const date = html.indexOf("2026-05-23");
    assert.ok(src > -1 && date > src, "date appears after the source");
  });

  test("undated article omits the date line (no empty gap)", () => {
    const NB = loadBuilder(builderContext());
    const html = NB.build("gen_cybershield", { org: "ACME", soc: "soc@acme.test" }, [{ type: "Phishing", title: "Undated", source: "S", url: "https://a/s" }], { useLinks: false, usePoster: false, useQR: false, useIllus: false });
    assert.ok(!html.includes("Invalid Date"), "no Invalid Date for an undated article");
  });

  test("footer QR is sized 90x90 like the bank page", () => {
    const NB = loadBuilder(builderContext());
    const html = NB.build("gen_cybershield", { org: "ACME", soc: "soc@acme.test", portal: "https://p" }, SMISHING_ARTS, { useLinks: false, usePoster: false, useQR: true, useIllus: false });
    assert.ok(html.includes('id="nl-qr" data-qr-size="90"'), "QR cell carries data-qr-size=90");
  });

  test("article cards are uniform: both titles clamped to a fixed height and boxes fill the column", () => {
    const NB = loadBuilder(builderContext());
    const arts = [
      { type: "Phishing", title: "A very long three line headline that wraps across multiple lines in the card", source: "S1", url: "https://a/s", pubDate: "2026-05-26" },
      { type: "Phishing", title: "Short title", source: "S2", url: "https://b/s", pubDate: "2026-05-25" },
    ];
    const html = NB.build("gen_cybershield", { org: "ACME", soc: "soc@acme.test" }, arts, { useLinks: false, usePoster: false, useQR: false, useIllus: false });
    // Both card titles share the same fixed-height clamp → equal title blocks.
    assert.equal(html.split("max-height:57px").length - 1, 2, "both card titles clamped to the same height");
    // Both inner card boxes fill their column height so they end up equal.
    assert.ok(html.split('height="100%"').length - 1 >= 2, "both card boxes use height:100%");
  });

  test("logos: emits self-contained data URIs when the template-assets bundle is loaded", () => {
    const ctx = builderContext();
    // Simulate assets/template_assets.js having been loaded.
    ctx.App.TemplateAssets = {
      "ABI.png": "data:image/png;base64,AAAA",
      "mascot_mug.png": "data:image/png;base64,BBBB",
      "4.png": "data:image/png;base64,CCCC",
    };
    const NB = loadBuilder(ctx);
    const html = NB.build("gen_cybershield", { org: "ACME", soc: "soc@acme.test" }, SMISHING_ARTS, { useLinks: false, usePoster: false, useQR: false, useIllus: false });
    assert.ok(html.includes("data:image/png;base64,AAAA"), "ABI logo inlined as a data URI");
    assert.ok(html.includes("data:image/png;base64,BBBB"), "mascot inlined as a data URI");
    assert.ok(!html.includes('src="assets/ABI.png"'), "no relative logo path remains");
    assert.ok(!html.includes('src="assets/mascot_mug.png"'), "no relative mascot path remains");
  });

  test("logos: fall back to relative asset paths when the bundle is absent (e.g. Node)", () => {
    const NB = loadBuilder(builderContext());
    const html = NB.build("gen_cybershield", { org: "ACME", soc: "soc@acme.test" }, SMISHING_ARTS, { useLinks: false, usePoster: false, useQR: false, useIllus: false });
    assert.ok(html.includes('src="assets/ABI.png"'), "relative fallback when no bundle is loaded");
  });

  test("falls back to the 4 default indicators + default overview when no slots in cfg", () => {
    const NB = loadBuilder(builderContext());
    const cfg = { org: "ACME", soc: "soc@acme.test" };
    const html = NB.build("gen_cybershield", cfg, [], { useLinks: false, usePoster: false, useQR: false, useIllus: false });
    assert.ok(html.includes("Sender address doesn't match"), "default red flag rendered");
    assert.ok(html.includes("Cybercriminals are increasingly targeting"), "default threat overview rendered");
  });
});
