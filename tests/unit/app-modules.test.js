const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "../..");

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
  };
}

function loadScript(context, relativePath) {
  const filename = path.join(rootDir, relativePath);
  const code = readFileSync(filename, "utf8");
  vm.runInContext(code, context, { filename });
}

function createContext() {
  const context = {
    window: {},
    localStorage: createStorage(),
    URL,
    Date,
    console,
    setTimeout,
    clearTimeout,
    AbortController,
    navigator: { hardwareConcurrency: 4 },
    performance: { now: () => 0 },
  };
  context.window = context;
  context.App = {
    Utils: {
      log() {},
      fmtDate(value) {
        return value || "";
      },
      stripTags(value) {
        return String(value || "").replace(/<[^>]*>/g, "");
      },
      truncate(value, limit) {
        return String(value || "").slice(0, limit);
      },
      normalizeWebUrl(value) {
        const s = String(value || "").trim();
        if (!s) return "";
        const lower = s.toLowerCase();
        if (lower.startsWith("mailto:") || lower.startsWith("tel:") || lower.startsWith("sms:")) return s;
        if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
        if (lower.startsWith("//")) return `https:${s}`;
        if (s.startsWith("#") || s.startsWith("/") || s.startsWith("\\")) return s;
        if (/\s/.test(s)) return s;
        return `https://${s.replace(/^\/+/, "")}`;
      },
    },
    Graphics: {},
  };
  return vm.createContext(context);
}

test("App.DB exposes image library API (saveImage/getImage/getAllImages/deleteImage/findImageBySha1)", () => {
  const context = createContext();
  loadScript(context, "js/db.js");
  for (const fnName of ["saveImage", "getImage", "getAllImages", "deleteImage", "findImageBySha1"]) {
    assert.equal(typeof context.App.DB[fnName], "function", `App.DB.${fnName} should be a function`);
  }
  // Confirm the four existing core methods still exist (regression guard for the schema bump).
  for (const fnName of ["open", "saveDraft", "saveProject", "getAllArticles"]) {
    assert.equal(typeof context.App.DB[fnName], "function", `App.DB.${fnName} should still exist after v4->v5 bump`);
  }
  // Per-article delete backs the feed card ✕ button (App.UI.deleteArticle).
  assert.equal(typeof context.App.DB.deleteArticleByUrl, "function", "App.DB.deleteArticleByUrl should be a function");
});

test("KeywordStore normalizes, deduplicates, suggests, and removes scoring keywords", () => {
  const context = createContext();
  loadScript(context, "js/keyword_store.js");

  context.App.KeywordStore.setCriticalKeywords([" Breach ", "breach", "outage"]);
  assert.deepEqual(Array.from(context.App.KeywordStore.getCriticalKeywords()), ["breach", "outage"]);
  assert.deepEqual(Array.from(context.App.KeywordStore.suggestKeywords("critical", "bre")), ["breach"]);

  context.App.KeywordStore.removeKeyword("critical", "BREACH");
  assert.deepEqual(Array.from(context.App.KeywordStore.getCriticalKeywords()), ["outage"]);
});

test("RouterNav setHandoff strips project fields when clearProjectContext", () => {
  const context = createContext();
  loadScript(context, "js/router_nav.js");

  context.App.RouterNav.setHandoff({
    source: "preview",
    projectId: "p1",
    projectSnapshotVersion: 2,
    activeDraftId: "d1",
    clearProjectContext: true
  });
  const h = context.App.RouterNav.getHandoff();
  assert.equal(h.source, "preview");
  assert.equal(h.projectId, undefined);
  assert.equal(h.projectSnapshotVersion, undefined);
  assert.equal(h.activeDraftId, undefined);
});

test("RouterNav handoff round-trips payloads with an updated timestamp", () => {
  const context = createContext();
  loadScript(context, "js/router_nav.js");

  const saved = context.App.RouterNav.setHandoff({ source: "preview", projectId: "p1" });
  const loaded = context.App.RouterNav.getHandoff();

  assert.equal(saved.source, "preview");
  assert.equal(loaded.projectId, "p1");
  assert.match(loaded.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

  context.App.RouterNav.clearHandoff();
  assert.equal(context.App.RouterNav.getHandoff(), null);
});

test("ProjectStore appends a version snapshot on each workspace save", async () => {
  const context = createContext();
  const savedProjects = new Map();
  context.App.DB = {
    async open() {},
    async migrateDraftsToProjects() {
      return { migrated: 0, total: savedProjects.size };
    },
    async getProjectById(projectId) {
      return savedProjects.get(projectId) || null;
    },
    async saveProject(project) {
      const rec = { ...project };
      savedProjects.set(rec.projectId, rec);
      return rec;
    },
  };
  loadScript(context, "js/project_store.js");

  const first = await context.App.ProjectStore.saveFromWorkspace(
    { variants: { en: { html: "<h1>Version 1</h1>", css: "" } }, workflow: { state: "draft" } },
    { title: "newsletter_2026-04-29" },
    "project_newsletter"
  );
  const second = await context.App.ProjectStore.saveFromWorkspace(
    { variants: { en: { html: "<h1>Version 2</h1>", css: "" } }, workflow: { state: "review" } },
    { title: "newsletter_2026-04-29" },
    "project_newsletter"
  );

  assert.equal(first.version, 1);
  assert.equal(first.snapshots.length, 1);
  assert.equal(second.version, 2);
  assert.equal(second.snapshots.length, 2);
  assert.equal(second.snapshots[1].version, 2);
  assert.equal(second.snapshots[1].workspace.variants.en.html, "<h1>Version 2</h1>");
});

test("RSSFetcher filters feed items using TPRM-style scoring and CVE skip", () => {
  const context = createContext();
  loadScript(context, "js/feed_scoring.js");
  loadScript(context, "js/rss_fetcher.js");

  assert.equal(context.App.RSSFetcher.classify("qr phishing steals employee credentials"), "Phishing");
  assert.equal(context.App.RSSFetcher.classify("sms scam targets staff phones"), "Smishing");

  assert.equal(
    context.App.RSSFetcher.isPrivacyAwarenessRelevant("Hospital breach disclosed", "Law enforcement notified", null),
    true
  );
  assert.equal(
    context.App.RSSFetcher.isPrivacyAwarenessRelevant("Kernel vulnerability CVE-2026-0001", "Vendor compromise details", null),
    false
  );
  assert.equal(
    context.App.RSSFetcher.isPrivacyAwarenessRelevant("Daily cloud roundup", "General IT news without incidents", null),
    false
  );
  assert.equal(
    context.App.RSSFetcher.isPrivacyAwarenessRelevant("Ransomware trends", "Beginner tutorial for analysts", null),
    false
  );
  assert.equal(
    context.App.RSSFetcher.isPrivacyAwarenessRelevant("Ransomware hits region", "Major cloud outage story", null),
    true
  );

  const snapshot = {
    critical: ["breach"],
    context: [],
    noise: []
  };
  assert.equal(context.App.RSSFetcher.isPrivacyAwarenessRelevant("No match", "Still nothing", snapshot), false);
  assert.equal(context.App.RSSFetcher.isPrivacyAwarenessRelevant("Major breach", "", snapshot), true);

  const phishSnapshot = {
    critical: ["phishing", "password", "data privacy"],
    context: [],
    noise: []
  };
  assert.equal(
    context.App.RSSFetcher.isPrivacyAwarenessRelevant("Phishing drill", "Employees should report suspicious email", phishSnapshot),
    true
  );
  assert.equal(
    context.App.RSSFetcher.isPrivacyAwarenessRelevant("Kernel vulnerability CVE-2026-0001", "Patch details only", phishSnapshot),
    false
  );
});

test("NewsletterBuilder catalog exposes the 25 accessible template definitions", () => {
  const context = createContext();
  loadScript(context, "js/newsletter_builder.js");
  loadScript(context, "js/newsletter/bank_page.js");
  loadScript(context, "js/newsletter/core_templates.js");

  const catalog = context.App.NewsletterBuilder.getTemplateCatalog();
  assert.equal(catalog.length, 25);
  assert.ok(catalog.every((template) => template.id && template.name));
  assert.ok(catalog.every((template) => template.accessibility.contrastSafe));
  assert.ok(catalog.every((template) => template.a11yScore >= 2));
});

test("NewsletterBuilder resolveArticleVisualType maps AI labels and infers from story text", () => {
  const context = createContext();
  loadScript(context, "js/feed_scoring.js");
  loadScript(context, "js/rss_fetcher.js");
  loadScript(context, "js/newsletter_builder.js");
  loadScript(context, "js/newsletter/bank_page.js");
  loadScript(context, "js/newsletter/core_templates.js");
  const r = context.App.NewsletterBuilder.resolveArticleVisualType;

  assert.equal(r({ type: "Malware", title: "X", summary: "", description: "" }), "Malware");
  assert.equal(r({ type: "CVE-2026-0001 advisory", title: "Patch Tuesday", summary: "", description: "" }), "Vulnerability");
  assert.equal(
    r({ type: "Security News", title: "QR phishing targets payroll", summary: "Staff duped by fake login", description: "" }),
    "Phishing"
  );
  assert.equal(r({ type: "Social Engineering", title: "BEC wire fraud", summary: "", description: "" }), "Social Engineering");
});

test("NewsletterBuilder build embeds article pub date next to read-more links when links enabled", () => {
  const context = createContext();
  context.App.Graphics = {
    phishEmailCompact: () => "<svg data-g=\"phish\"></svg>",
    shieldLockCompact: () => "<svg data-g=\"shield\"></svg>",
    smishingCompact: () => "<svg data-g=\"sms\"></svg>",
    vishingCompact: () => "<svg data-g=\"vish\"></svg>",
    dataLeakCompact: () => "<svg data-g=\"leak\"></svg>",
    mfaCompact: () => "<svg data-g=\"mfa\"></svg>",
    peopleCompact: () => "<svg data-g=\"people\"></svg>",
    warningCompact: () => "<svg data-g=\"warn\"></svg>",
    fakeSiteCompact: () => "<svg data-g=\"fake\"></svg>"
  };
  loadScript(context, "js/feed_scoring.js");
  loadScript(context, "js/rss_fetcher.js");
  loadScript(context, "js/newsletter_builder.js");
  loadScript(context, "js/newsletter/bank_page.js");
  loadScript(context, "js/newsletter/core_templates.js");

  const html = context.App.NewsletterBuilder.build(
    "poster",
    { org: "ACME", soc: "soc@acme.test", freq: "Weekly", portal: "https://portal.example", pname: "Portal" },
    [
      {
        type: "Phishing",
        title: "Test phish",
        summary: "Summary",
        source: "Example News",
        url: "https://example.com/story",
        pubDate: "2026-04-15",
        threatLevel: 3
      }
    ],
    { useLinks: true, usePoster: false, useQR: false, useIllus: false }
  );
  assert.match(html, /Read more[\s\S]*2026/);
  assert.ok(html.includes("example.com/story"));
});

test("NewsletterBuilder.build dispatches every catalog id to its own builder (no silent poster fallback)", () => {
  const context = createContext();
  context.App.Graphics = {
    phishEmailCompact: () => "<svg/>", shieldLockCompact: () => "<svg/>", smishingCompact: () => "<svg/>",
    vishingCompact: () => "<svg/>", dataLeakCompact: () => "<svg/>", mfaCompact: () => "<svg/>",
    peopleCompact: () => "<svg/>", warningCompact: () => "<svg/>", fakeSiteCompact: () => "<svg/>"
  };
  loadScript(context, "js/feed_scoring.js");
  loadScript(context, "js/rss_fetcher.js");
  loadScript(context, "js/newsletter_builder.js");
  loadScript(context, "js/newsletter/bank_page.js");
  loadScript(context, "js/newsletter/core_templates.js");

  const arts = [
    { type: "Phishing", title: "QR phish targets payroll", summary: "Staff duped by fake login.", source: "X", url: "https://x.com/s", pubDate: "2026-05-23", threatLevel: 3 },
    { type: "Malware",  title: "npm package backdoor",    summary: "Compromised dependency steals tokens.", source: "Y", url: "https://y.com/s", pubDate: "2026-05-22", threatLevel: 4 }
  ];
  const cfg = { org: "ACME", soc: "soc@acme.test", freq: "Weekly", portal: "https://p", pname: "P" };

  const catalog = context.App.NewsletterBuilder.getTemplateCatalog();
  assert.equal(catalog.length, 25);

  for (const t of catalog) {
    const html = context.App.NewsletterBuilder.build(t.id, cfg, arts, { useLinks: false, usePoster: false, useQR: false, useIllus: false });
    assert.ok(typeof html === "string" && html.length > 0, `build('${t.id}') returned empty`);
    assert.ok(html.includes(`data-template-id="${t.id}"`), `build('${t.id}') did not stamp data-template-id="${t.id}" — likely fell back to poster (template not registered)`);
  }
});

test("TranslationMetrics reports translatable text, coverage, and meaningful changes", () => {
  const context = createContext();
  loadScript(context, "js/translation_metrics.js");

  const metrics = context.App.TranslationMetrics;
  assert.equal(metrics.hasTranslatableLetters("ALERT: Update password"), true);
  assert.equal(metrics.hasTranslatableLetters("2026-04-29"), false);
  assert.equal(metrics.hasTranslatableLetters("{{PORTAL_URL}}"), false);

  const coverage = metrics.coverageFromResults([
    { attempted: true, translatable: true, changed: true, failed: false },
    { attempted: true, translatable: true, changed: false, failed: false },
    { attempted: true, translatable: false, changed: false, failed: false },
    { attempted: true, translatable: true, changed: false, failed: true },
  ]);
  assert.equal(coverage.attempted, 3);
  assert.equal(coverage.succeeded, 1);
  assert.equal(coverage.failed, 1);
  assert.equal(coverage.unchanged, 1);
  assert.equal(coverage.ratio, 1 / 3);

  const src = "<div><p>Report suspicious emails</p><span>Portal: https://example.com</span></div>";
  const same = "<div>\n  <p>Report suspicious emails</p><span>Portal: https://example.com</span>\n</div>";
  const changed = "<div><p>Reporte correos sospechosos</p><span>Portal: https://example.com</span></div>";
  assert.equal(metrics.normalizedVisibleText(src), "report suspicious emails portal: https://example.com");
  assert.equal(metrics.hasMeaningfulTextChange(src, same), false);
  assert.equal(metrics.hasMeaningfulTextChange(src, changed), true);
});

test("TranslationMetrics coverage denominator, glossary-aware diff, and classify", () => {
  const context = createContext();
  loadScript(context, "js/translation_metrics.js");
  const m = context.App.TranslationMetrics;
  assert.equal(m.countsTowardCoverageProgress("MFA"), false);
  assert.equal(m.countsTowardCoverageProgress("Report phishing to the SOC now"), true);
  assert.equal(
    m.hasMeaningfulTextChangeAllowingLockedTerms(
      "<p>Report phishing</p>",
      "<p>Reporte phishing</p>",
      ["phishing"]
    ),
    true
  );
  assert.equal(m.classifyTranslationFailureKind("[gate:coverage] Low translation coverage"), "coverage");
  assert.equal(m.classifyTranslationFailureKind("OpenAI translate failed (429)"), "rateLimit");
  assert.equal(m.classifyTranslationFailureKind("[gate:qa] QA checks failed: link-count"), "qa");
  const cov = m.coverageFromResults([
    { attempted: true, translatable: true, countsForCoverage: false, changed: true, failed: false },
    { attempted: true, translatable: true, changed: true, failed: false }
  ]);
  assert.equal(cov.attempted, 1);
  assert.equal(cov.succeeded, 1);

  assert.equal(
    m.normalizeTranslatedTextSegment("- Never click links\n- Verify sender", "Never click links"),
    "Never click links - Verify sender"
  );
  assert.equal(
    m.normalizeTranslatedTextSegment("- Nunca haga clic", "Never click links"),
    "Nunca haga clic"
  );
  assert.equal(
    m.normalizeTranslatedTextSegment("Line one\nLine two", "One\nTwo"),
    "Line one\nLine two"
  );

  {
    const a = m.splitDecorativeLead("Verify sender");
    assert.equal(a.deco, "");
    assert.equal(a.rest, "Verify sender");
  }
  {
    const a = m.splitDecorativeLead("\u203AVerify unusual requests");
    assert.equal(a.deco, "\u203A");
    assert.equal(a.rest, "Verify unusual requests");
  }
  {
    const a = m.splitDecorativeLead("› Verify");
    assert.equal(a.deco, "›");
    assert.equal(a.rest, "Verify");
  }
});

test("NewsletterBuilder catalog exposes 25 accessible template definitions", () => {
  const context = createContext();
  loadScript(context, "js/newsletter_builder.js");
  loadScript(context, "js/newsletter/bank_page.js");
  loadScript(context, "js/newsletter/core_templates.js");
  const catalog = context.App.NewsletterBuilder.getTemplateCatalog();
  assert.equal(catalog.length, 25);
  assert.ok(catalog.every((t) => t.id && t.name));
  assert.ok(catalog.every((t) => t.accessibility.contrastSafe));
});

test("NewsletterBuilder poster1 output contains title and SOC strip", () => {
  const context = createContext();
  loadScript(context, "js/newsletter_builder.js");
  loadScript(context, "js/newsletter/bank_page.js");
  loadScript(context, "js/newsletter/core_templates.js");
  const html = context.App.NewsletterBuilder.build(
    "poster1",
    { org: "ACME", soc: "soc@acme.test", freq: "Weekly", title: "Lock It Down" },
    [],
    { useLinks: false, usePoster: false, useQR: false, useIllus: false }
  );
  assert.ok(html.includes("Lock It Down"), "poster1 must embed c.title");
  assert.ok(html.includes("SEE SOMETHING SUSPICIOUS"), "poster1 must have SOC strip");
  assert.ok(!html.includes("@keyframes"), "email-safe poster1 must not have animations");
});

test("NewsletterBuilder poster1 screen-safe output contains keyframes", () => {
  const context = createContext();
  loadScript(context, "js/newsletter_builder.js");
  loadScript(context, "js/newsletter/bank_page.js");
  loadScript(context, "js/newsletter/core_templates.js");
  const html = context.App.NewsletterBuilder.build(
    "poster1",
    { org: "ACME", soc: "soc@acme.test", freq: "Weekly", title: "Zero Trust" },
    [],
    { renderChannel: "screen-safe", useLinks: false, usePoster: false, useQR: false, useIllus: false }
  );
  assert.ok(html.includes("@keyframes nlFadeIn"), "screen-safe poster1 must inject animations");
});

test("NewsletterBuilder newspaper output contains masthead and columns", () => {
  const context = createContext();
  loadScript(context, "js/newsletter_builder.js");
  loadScript(context, "js/newsletter/bank_page.js");
  loadScript(context, "js/newsletter/core_templates.js");
  const arts = [
    { type: "Phishing", title: "Staff targeted by invoice scam", summary: "Finance team received fake invoices.", threatLevel: 3, watchouts: ["Verify sender", "Call before paying"] },
    { type: "Malware", title: "Ransomware hits logistics sector", summary: "Three firms encrypted.", threatLevel: 4, watchouts: [] },
    { type: "Data Breach", title: "Supplier portal exposed records", summary: "10k records exposed.", threatLevel: 3, watchouts: [] }
  ];
  const html = context.App.NewsletterBuilder.build(
    "newspaper",
    { org: "ACME", soc: "soc@acme.test", freq: "Weekly", title: "Cyber Intelligence Report" },
    arts,
    { useLinks: false, usePoster: false, useQR: false, useIllus: false }
  );
  assert.ok(html.includes("THE CYBER GAZETTE"), "newspaper must have masthead");
  assert.ok(html.includes("EDITOR'S PICK"), "newspaper must have editor's pick column");
  assert.ok(html.includes("SEE SOMETHING SUSPICIOUS"), "newspaper must have SOC strip");
});
