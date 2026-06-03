// Seam contract tests — guard against future refactors silently breaking the
// public surfaces of the three sibling-file split modules:
//   - js/newsletter/*.js  (template registry via App.NewsletterBuilder)
//   - js/ui/*.js          (App.UI._state + _internals → App.UITranslation)
//   - js/ai/*.js          (App.AISummarizer._internals → App.AIBankPageEnsemble)
// If a future move drops a registration or renames a public function, these
// tests fire before any feature test catches the regression.

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "../..");

function loadScript(context, relativePath) {
  const filename = path.join(rootDir, relativePath);
  const code = readFileSync(filename, "utf8");
  vm.runInContext(code, context, { filename });
}

function createContext() {
  const ctx = {
    window: {},
    localStorage: {
      _v: new Map(),
      getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
      setItem(k, v) { this._v.set(k, String(v)); },
      removeItem(k) { this._v.delete(k); },
      clear() { this._v.clear(); }
    },
    URL,
    Date,
    console,
    setTimeout,
    clearTimeout,
    fetch: () => Promise.reject(new Error("fetch not mocked in seam tests")),
    document: {
      getElementById: () => null,
      querySelectorAll: () => [],
      querySelector: () => null,
      createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {} }),
      body: { appendChild() {} },
      addEventListener() {},
      removeEventListener() {}
    },
    addEventListener() {},
    removeEventListener() {},
    NodeFilter: { SHOW_TEXT: 4, FILTER_REJECT: 2, FILTER_ACCEPT: 1 }
  };
  ctx.window = ctx;
  ctx.App = {
    Utils: {
      log() {},
      truncate(s, n) { return String(s || "").slice(0, n); },
      fmtDate(v) { return v || ""; },
      normalizeWebUrl(s) { return String(s || ""); },
      showToast() {},
      stripTags(s) { return String(s || "").replace(/<[^>]*>/g, ""); }
    },
    Graphics: {},
    TranslationMetrics: {
      splitDecorativeLead: (s) => ({ deco: "", rest: s }),
      hasTranslatableLetters: () => true,
      hasMeaningfulTextChangeAllowingLockedTerms: () => true
    }
  };
  return vm.createContext(ctx);
}

// ─── Seam 1: newsletter template registry ───────────────────────────────────

test("Seam: every TEMPLATE_CATALOG id has a registered builder function", () => {
  const ctx = createContext();
  loadScript(ctx, "js/newsletter_builder.js");
  loadScript(ctx, "js/newsletter/bank_page.js");
  loadScript(ctx, "js/newsletter/core_templates.js");

  const catalog = ctx.App.NewsletterBuilder.getTemplateCatalog();
  assert.ok(catalog.length >= 22, `expected at least 22 templates, got ${catalog.length}`);

  // Calling build() on a registered id should NOT silently fall back to the
  // default. We detect "registered" by checking the data-template-id marker
  // the build() dispatcher writes into the output.
  const cfg = { org: "T", soc: "t@t.test", freq: "Weekly", portal: "https://t", pname: "Portal" };
  for (const entry of catalog) {
    const html = ctx.App.NewsletterBuilder.build(entry.id, cfg, [], {});
    assert.ok(html, `build(${entry.id}) returned empty`);
    assert.ok(
      html.includes(`data-template-id="${entry.id}"`),
      `build(${entry.id}) did not emit data-template-id="${entry.id}" — registration missing or aliased`
    );
  }
});

test("Seam: App.NewsletterBuilder exposes registerTemplate + _components", () => {
  const ctx = createContext();
  loadScript(ctx, "js/newsletter_builder.js");

  const NB = ctx.App.NewsletterBuilder;
  assert.equal(typeof NB.registerTemplate, "function", "registerTemplate missing");
  assert.equal(typeof NB._components, "object", "_components namespace missing");
  // A handful of helpers sibling files rely on
  for (const helper of ["tbl", "tbc", "escapeHtml", "foot", "darkMasthead"]) {
    assert.equal(typeof NB._components[helper], "function", `_components.${helper} missing`);
  }
});

// ─── Seam 2: ui translation module ──────────────────────────────────────────

test("Seam: App.UITranslation exposes the translate surface after sibling loads", () => {
  const ctx = createContext();
  loadScript(ctx, "js/utils.js");
  loadScript(ctx, "js/translation_metrics.js");
  loadScript(ctx, "js/ui_controller.js");
  loadScript(ctx, "js/ui/translation.js");

  const UI = ctx.App.UI;
  assert.ok(UI, "App.UI missing");
  assert.equal(typeof UI._state, "object", "App.UI._state missing");
  assert.equal(typeof UI._internals, "object", "App.UI._internals missing");

  const UIT = ctx.App.UITranslation;
  assert.ok(UIT, "App.UITranslation missing — translation sibling did not register");
  for (const fn of ["translateWorkspace", "translateHtmlAIFirst", "autoTranslateNewsletter",
                    "protectTokens", "restoreTokens", "applyGlossaryLock", "qaCheckTranslatedHtml"]) {
    assert.equal(typeof UIT[fn], "function", `App.UITranslation.${fn} missing`);
  }
  assert.equal(typeof UIT.GLOSSARY_LOCK, "object", "GLOSSARY_LOCK missing");
  assert.ok(Array.isArray(UIT.GLOSSARY_LOCK_TERM_LIST), "GLOSSARY_LOCK_TERM_LIST not an array");
});

// ─── Seam 3: ai bank-page ensemble module ───────────────────────────────────

test("Seam: App.AIBankPageEnsemble exposes the ensemble surface + log URL unchanged", () => {
  const ctx = createContext();
  loadScript(ctx, "js/ai/prompts.js");
  loadScript(ctx, "js/ai_summarizer.js");
  loadScript(ctx, "js/ai/bank_page_ensemble.js");

  const AS = ctx.App.AISummarizer;
  assert.ok(AS, "App.AISummarizer missing");
  assert.equal(typeof AS._internals, "object", "App.AISummarizer._internals missing");
  // Helpers the bank-page sibling destructures
  for (const helper of ["callTemplateSlotsAI", "isAIAvailable",
                        "scoreBankPageIntro", "scoreBankPageBullets",
                        "BANKPAGE_SLOTS_SYSTEM", "buildBankPageUserPrompt"]) {
    assert.notEqual(AS._internals[helper], undefined, `_internals.${helper} missing`);
  }

  const BPE = ctx.App.AIBankPageEnsemble;
  assert.ok(BPE, "App.AIBankPageEnsemble missing — sibling did not register");
  assert.equal(typeof BPE.aiFillBankPageSlots, "function", "aiFillBankPageSlots missing");
  assert.equal(typeof BPE.validateArticleCoherence, "function", "validateArticleCoherence missing");

  // Ensemble log URL is load-bearing for content generation debugging.
  assert.equal(
    BPE.ENSEMBLE_LOG_URL,
    "http://127.0.0.1:4175/save",
    "ENSEMBLE_LOG_URL changed — verify ensemble-logs/ folder still receives writes"
  );

  // validateArticleCoherence is part of the public API and must keep
  // working via the thin wrapper in main that delegates to the sibling.
  // (aiFillBankPageSlots is internal — called by fillNewsletterTextSlots
  // inside the closure, not exposed on App.AISummarizer.)
  assert.equal(typeof AS.validateArticleCoherence, "function", "App.AISummarizer.validateArticleCoherence wrapper missing");
});

// ─── Seam 4: ai local fallbacks module ──────────────────────────────────────

test("Seam: App.AISummarizer surfaces generateTips + estimateLevel via the local_fallbacks sibling", () => {
  const ctx = createContext();
  loadScript(ctx, "js/ai/prompts.js");
  loadScript(ctx, "js/ai/local_fallbacks.js");
  loadScript(ctx, "js/ai_summarizer.js");

  const LF = ctx.window.AILocalFallbacks;
  assert.ok(LF, "window.AILocalFallbacks missing — sibling did not register");
  for (const fn of ["corpusForTips", "isSoftwareSupplyChainStory",
                    "editionHasSupplyChain", "defaultTipsForType",
                    "generateTips", "estimateLevel", "tryRepairMojibakeUtf8"]) {
    assert.equal(typeof LF[fn], "function", `AILocalFallbacks.${fn} missing`);
  }
  assert.ok(Array.isArray(LF.SUPPLY_CHAIN_CORPUS_MARKERS), "SUPPLY_CHAIN_CORPUS_MARKERS missing");
  assert.ok(Array.isArray(LF.SOFTWARE_SUPPLY_CHAIN_WATCHOUT_TIPS), "SOFTWARE_SUPPLY_CHAIN_WATCHOUT_TIPS missing");

  // generateTips re-exported via App.AISummarizer must still produce tips.
  const AS = ctx.App.AISummarizer;
  const tips = AS.generateTips({ title: "Phishing scam targets staff", description: "fake email asks employees to click" });
  assert.ok(Array.isArray(tips) && tips.length > 0, "generateTips returned empty");
});

// ─── Seam 5: ui ai_experiment module ────────────────────────────────────────

test("Seam: App.UIAIExperiment exposes the experiment-controls surface", () => {
  const ctx = createContext();
  loadScript(ctx, "js/utils.js");
  loadScript(ctx, "js/translation_metrics.js");
  loadScript(ctx, "js/ui_controller.js");
  loadScript(ctx, "js/ui/ai_experiment.js");

  const AE = ctx.App.UIAIExperiment;
  assert.ok(AE, "App.UIAIExperiment missing — sibling did not register");
  for (const fn of ["defaultAIExperimentControl", "getAIExperimentControlFromUI",
                    "getAIExperimentReadiness", "renderAIExperimentReadiness",
                    "renderAIRollbackBanner", "applyAIExperimentControl",
                    "saveAIExperimentControl", "triggerAIRollback",
                    "exportAIExperimentEvidence"]) {
    assert.equal(typeof AE[fn], "function", `UIAIExperiment.${fn} missing`);
  }
  // Storage key is part of the contract (read by renderAIRollbackBanner from localStorage).
  assert.equal(AE.STORAGE_KEY, "awareness_ai_experiment_control_v1", "STORAGE_KEY changed");

  // The default object shape is load-bearing for migration logic.
  const def = AE.defaultAIExperimentControl();
  for (const key of ["enabled", "requireOptIn", "rollbackMode", "decision", "taxonomyCounts"]) {
    assert.notEqual(def[key], undefined, `default[${key}] missing`);
  }

  // Readiness is a pure function of the cfg shape — verify thresholds didn't drift.
  const ready = AE.getAIExperimentReadiness({
    roundsCompleted: 3, brandSafetyPassRate: 80, relevancePassRate: 80,
    mttdHours: 10, mttmHours: 1, taxonomyCoveragePct: 95,
    decision: "go", rationale: "ok", rollbackMode: true
  });
  assert.equal(ready.isReady, true, "expected ready with all gates passing");
  assert.equal(ready.gatesPassed, 5, "expected all 5 gates");
});

// ─── Seam 6: ui generate_pipeline module ────────────────────────────────────

test("Seam: App.UIGeneratePipeline exposes build + draft + project surface", () => {
  const ctx = createContext();
  loadScript(ctx, "js/utils.js");
  loadScript(ctx, "js/translation_metrics.js");
  loadScript(ctx, "js/ui_controller.js");
  loadScript(ctx, "js/ui/generate_pipeline.js");

  const GP = ctx.App.UIGeneratePipeline;
  assert.ok(GP, "App.UIGeneratePipeline missing — sibling did not register");
  for (const fn of ["buildAndPreview", "buildAndPreviewEnglishOnly",
                    "buildWorkspaceSnapshot", "beforeWorkspaceSnapshot",
                    "saveDraft", "saveCopy", "pickDraftToLoad",
                    "loadSelectedDraft", "loadDraftById",
                    "saveProjectVersion", "refreshEditorProjectVersionOptions",
                    "editorLoadSelectedProjectVersion", "editorRestoreSelectedVersionAsLatest"]) {
    assert.equal(typeof GP[fn], "function", `UIGeneratePipeline.${fn} missing`);
  }

  // The main file must still expose the same public functions via wrappers
  // so existing call sites (HTML onclick handlers, init flows) keep working.
  const UI = ctx.App.UI;
  for (const fn of ["buildAndPreview", "buildAndPreviewEnglishOnly",
                    "saveDraft", "saveCopy", "saveProjectVersion",
                    "loadSelectedDraft", "loadDraftById",
                    "editorLoadSelectedProjectVersion", "editorRestoreSelectedVersionAsLatest"]) {
    assert.equal(typeof UI[fn], "function", `App.UI.${fn} wrapper missing`);
  }
});

// ─── Seam 7b: editor regenerate selection contract ────────────────────────

test("Seam: editor iframe script exposes regen message cases", () => {
  const ctx = createContext();
  loadScript(ctx, "js/editor/iframe_script.js");
  const src = ctx.App.EditorIframeScript.fn.toString();
  // The editor's Regenerate-with-AI flow depends on these three message cases.
  // If a refactor drops one, the parent <-> iframe handshake breaks silently
  // (the AI call fires but nothing is collected or applied).
  for (const marker of ["case 'getSelectionTexts'", "case 'applySelectionTexts'",
                        "case 'clearRegenPending'", "data-nl-regen-pending"]) {
    assert.ok(src.includes(marker),
      `iframe script missing regen marker '${marker}' — editor.js _regenRun() will hang`);
  }
});

test("Seam: App.AISummarizer.regenerateSelection is exported and length-checks", async () => {
  const ctx = createContext();
  loadScript(ctx, "js/ai/prompts.js");
  loadScript(ctx, "js/ai/local_fallbacks.js");
  loadScript(ctx, "js/ai_summarizer.js");
  const AS = ctx.App.AISummarizer;
  assert.equal(typeof AS.regenerateSelection, "function",
    "App.AISummarizer.regenerateSelection missing — editor regen will fail");
  // Empty input must reject (the editor relies on this to surface 'select first').
  await assert.rejects(
    () => AS.regenerateSelection({ texts: [], articles: [], provider: "claude", apiKey: "k" }),
    /Nothing selected/i
  );
  // Missing API key must reject (the editor disables the button but defends in depth).
  await assert.rejects(
    () => AS.regenerateSelection({ texts: ["a"], articles: [], provider: "claude", apiKey: "" }),
    /API key/i
  );
});

test("Seam: regenerateSelection passes target language into the AI system prompt for non-English regens", async () => {
  const ctx = createContext();
  loadScript(ctx, "js/ai/prompts.js");
  loadScript(ctx, "js/ai/local_fallbacks.js");
  loadScript(ctx, "js/ai_summarizer.js");
  const AS = ctx.App.AISummarizer;

  let capturedSystem = "";
  ctx.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    capturedSystem = body.system || "";
    return {
      ok: true, status: 200,
      async json() { return { content: [{ text: JSON.stringify({ items: ["bonjour"] }) }] }; }
    };
  };

  await AS.regenerateSelection({
    texts: ["hello"],
    articles: [],
    instruction: "",
    provider: "claude",
    apiKey: "fake-key",
    attempts: 1,
    languageId: "fr",
    languageLabel: "French"
  });
  assert.ok(/FRENCH/.test(capturedSystem),
    "system prompt should tell the model to write in French when languageId='fr'");
  assert.ok(/language code: fr/i.test(capturedSystem),
    "system prompt should include the language code");
});

test("Seam: regenerateSelection runs an ensemble and picks the best when one attempt is malformed", async () => {
  const ctx = createContext();
  loadScript(ctx, "js/ai/prompts.js");
  loadScript(ctx, "js/ai/local_fallbacks.js");
  loadScript(ctx, "js/ai_summarizer.js");
  const AS = ctx.App.AISummarizer;

  // Drive callTemplateSlotsAI via the live config getter on _internals; the
  // network adapter only triggers fetch when called. We replace the public
  // network surface here by spying on ctx.fetch instead — three calls fire,
  // first returns wrong-length, second returns good, third returns dup → the
  // ensemble must drop calls 1 and 3 and apply call 2.
  let n = 0;
  ctx.fetch = async () => {
    n += 1;
    let body;
    if (n === 1) body = JSON.stringify({ items: ["only one"] });           // length mismatch
    else if (n === 2) body = JSON.stringify({ items: ["rewritten alpha", "rewritten beta"] }); // good
    else body = JSON.stringify({ items: ["dup", "dup"] });                  // duplicate items
    return {
      ok: true,
      status: 200,
      async json() {
        // Mimic Claude shape — callTemplateSlotsAI reads d.content[0].text.
        return { content: [{ text: body }] };
      }
    };
  };

  const items = await AS.regenerateSelection({
    texts: ["original alpha", "original beta"],
    articles: [{ title: "T", summary: "S" }],
    instruction: "",
    provider: "claude",
    apiKey: "fake-key",
    attempts: 3
  });
  // Cross-realm: `items` was constructed inside ctx, so use JSON for comparison.
  assert.equal(JSON.stringify(items), JSON.stringify(["rewritten alpha", "rewritten beta"]),
    "ensemble should pick the good response and drop length-mismatch + duplicate ones");
});

// ─── Seam 8: AI prompt builders sibling ─────────────────────────────────────

test("Seam: App.AIPromptBuilders exposes the prompt-builder surface", () => {
  const ctx = createContext();
  loadScript(ctx, "js/ai/prompts.js");
  loadScript(ctx, "js/ai_summarizer.js");
  loadScript(ctx, "js/ai/prompt_builders.js");

  const PB = ctx.App.AIPromptBuilders;
  assert.ok(PB, "App.AIPromptBuilders missing — sibling did not register");
  for (const fn of ["bankPageCompactArticles",
                    "buildBankPageUserPrompt",
                    "buildBankPageIntroPrompt",
                    "buildBankPageSection1Prompt",
                    "buildBankPageSection2Prompt",
                    "buildBankPageSection3Prompt",
                    "buildBankPageImpactOrgPrompt",
                    "buildBankPageNextStepsPrompt",
                    "buildBankPageImpactGeneralPrompt",
                    "buildBankPageRememberPrompt"]) {
    assert.equal(typeof PB[fn], "function", `AIPromptBuilders.${fn} missing`);
  }

  // Each builder produces a non-empty string for a fixture article set.
  const articles = [{ title: "Test breach", source: "Example", type: "data breach", pubDate: "2026-05-23", summary: "An attacker exfiltrated emails." }];
  for (const fn of ["buildBankPageUserPrompt",
                    "buildBankPageIntroPrompt",
                    "buildBankPageSection1Prompt"]) {
    const out = PB[fn](articles, "balanced");
    assert.equal(typeof out, "string", `${fn} should return a string`);
    assert.ok(out.length > 100, `${fn} produced suspiciously short prompt (${out.length} chars)`);
  }

  // Sibling functions accessible via the main file's _internals live getters.
  const I = ctx.App.AISummarizer._internals;
  const live = I.buildBankPageIntroPrompt(articles, "balanced");
  assert.equal(typeof live, "string", "_internals live getter for buildBankPageIntroPrompt should delegate");
  assert.ok(live.includes('"intro"'), "intro prompt should mention its output key");
});

// ─── Seam 9: AI logger sibling ──────────────────────────────────────────────

test("Seam: App.AILogger exposes beginBuild/endBuild/log and ENSEMBLE_LOG_URL unchanged", () => {
  const ctx = createContext();
  loadScript(ctx, "js/ai/logger.js");

  const AIL = ctx.App.AILogger;
  assert.ok(AIL, "App.AILogger missing — sibling did not register");
  for (const fn of ["beginBuild", "endBuild", "log", "logRaw",
                    "getActiveTemplateId", "getActiveSession", "makeSessionId"]) {
    assert.equal(typeof AIL[fn], "function", `AILogger.${fn} missing`);
  }
  // ENSEMBLE_LOG_URL is the canonical write endpoint — must not move.
  assert.equal(AIL.ENSEMBLE_LOG_URL, "http://127.0.0.1:4175/save",
    "ENSEMBLE_LOG_URL changed — canonical ensemble-logs path would break");

  // Begin/end build context behaves correctly.
  assert.equal(AIL.getActiveTemplateId(), null, "active templateId should start null");
  const sess = AIL.beginBuild({ templateId: "poster" });
  assert.equal(typeof sess, "string", "beginBuild should return a session id");
  assert.equal(AIL.getActiveTemplateId(), "poster", "active templateId should follow beginBuild");
  AIL.endBuild();
  assert.equal(AIL.getActiveTemplateId(), null, "endBuild should clear templateId");
});

// ─── Seam 10: AILogger.log includes template_id in POST payload ─────────────

test("Seam: AILogger.log POST payload carries template_id only while a build is active", async () => {
  const ctx = createContext();
  const posts = [];
  // Override fetch to capture payloads.
  ctx.fetch = (url, opts) => {
    let parsed;
    try { parsed = JSON.parse(opts && opts.body || "{}"); } catch { parsed = null; }
    posts.push({ url, payload: parsed });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
  };
  loadScript(ctx, "js/ai/logger.js");
  const AIL = ctx.App.AILogger;

  // Without a build context, log() is a no-op (no POST).
  AIL.log({ name: "test.txt", prompt: "p", response: "r" });
  assert.equal(posts.length, 0, "log() with no active build should not POST");

  // With a build context, POST carries template_id.
  AIL.beginBuild({ templateId: "spotlight" });
  AIL.log({ name: "spotlight_tactics.txt", prompt: "P", response: "R" });
  await Promise.resolve(); // let the fetch promise settle
  assert.equal(posts.length, 1, "log() inside beginBuild should POST exactly once");
  assert.equal(posts[0].payload.template_id, "spotlight", "payload should include active template_id");
  assert.equal(posts[0].payload.name, "spotlight_tactics.txt", "payload.name should match log name");
  assert.ok(/=== PROMPT ===/.test(posts[0].payload.content), "payload.content should include PROMPT section header");
  assert.ok(/=== RESPONSE ===/.test(posts[0].payload.content), "payload.content should include RESPONSE section header");

  // After endBuild, logRaw with no explicit templateId omits the field.
  AIL.endBuild();
  posts.length = 0;
  AIL.logRaw({ session: "2026-05-23-test", name: "intro.txt", content: "x" });
  await Promise.resolve();
  assert.equal(posts.length, 1, "logRaw should POST regardless of active build");
  assert.equal(posts[0].payload.template_id, undefined, "logRaw without context or arg should omit template_id");
  assert.equal(posts[0].payload.name, "intro.txt", "logRaw filename preserved");
});

// ─── Seam 11: bank-page ensemble routes through AILogger ────────────────────

test("Seam: bank-page ensemble routes its 9 log POSTs through App.AILogger and preserves the canonical filenames", async () => {
  const ctx = createContext();
  const postedNames = [];
  ctx.fetch = (url, opts) => {
    try {
      const parsed = JSON.parse(opts && opts.body || "{}");
      if (parsed && parsed.name) postedNames.push(parsed.name);
    } catch { /* ignore */ }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
  };
  loadScript(ctx, "js/ai/prompts.js");
  loadScript(ctx, "js/ai/local_fallbacks.js");
  loadScript(ctx, "js/ai/logger.js");
  loadScript(ctx, "js/ai_summarizer.js");
  loadScript(ctx, "js/ai/prompt_builders.js");
  loadScript(ctx, "js/ai/bank_page_ensemble.js");

  // Stub helpers so the ensemble can finish without retrying or sleeping.
  ctx.App.Utils.wait = async () => {};
  ctx.App.Utils.truncate = (s, n) => String(s || "").slice(0, n || 0);

  // Stub callTemplateSlotsAI on the internals so we don't need network — the
  // ensemble still does its 9 POSTs of prompt+response logs.
  const I = ctx.App.AISummarizer._internals;
  // Force retryAttempts to 0 so a thin stub doesn't trigger the retry path.
  ctx.App.AISummarizer.configure({ retryAttempts: 0, retryDelayMs: 0, provider: "claude", claudeKey: "fake" });
  const longIntro = "This is a deliberately long intro sentence about phishing attackers who target staff inboxes today.";
  const longBullet = (n) => "Bullet " + n + " with enough words to satisfy the bank-page scoring band, mentioning attackers and phishing.";
  I.callTemplateSlotsAI = async () => ({
    intro: longIntro,
    section1Bullets: [longBullet(1), longBullet(2), longBullet(3), longBullet(4)],
    section2Bullets: [longBullet("a"), longBullet("b"), longBullet("c")],
    section3Bullets: [longBullet("p"), longBullet("q"), longBullet("r")],
    bullets: [longBullet("x"), longBullet("y"), longBullet("z")]
  });

  ctx.App.AILogger.beginBuild({ templateId: "bankpage1_static" });
  await ctx.App.AIBankPageEnsemble.aiFillBankPageSlots([
    { title: "T1", type: "phishing", summary: "S1", source: "x" },
    { title: "T2", type: "phishing", summary: "S2", source: "y" }
  ], "balanced");
  ctx.App.AILogger.endBuild();

  // The 9 canonical filenames must all appear among the POSTs (order may
  // vary because Promise.all resolves in parallel, but the names are fixed).
  const expected = ["combined.txt", "intro.txt", "section1.txt", "section2.txt", "section3.txt",
                    "impact_organisation.txt", "next_steps.txt", "impact_general.txt", "remember.txt",
                    "scores.json"];
  for (const name of expected) {
    assert.ok(postedNames.includes(name), `expected POST for '${name}' — got [${postedNames.join(", ")}]`);
  }
});

// ─── Seam 12: UI sidebar sibling ────────────────────────────────────────────

test("Seam: App.UISidebar exposes sidebar surface + App.UI wrappers in main still delegate", () => {
  const ctx = createContext();
  // Sidebar sibling needs App.RSSFetcher + App.KeywordStore stubs to load.
  ctx.App.RSSFetcher = {
    getFeeds: () => [],
    getCustomFeeds: () => [],
    addCustomFeed: () => null,
    removeCustomFeed: () => false
  };
  ctx.App.KeywordStore = {
    getCriticalKeywords: () => [],
    getContextKeywords: () => [],
    getNoiseKeywords: () => [],
    addKeyword: () => null,
    removeKeyword: () => null,
    resetDefaults: () => null
  };
  loadScript(ctx, "js/ui_controller.js");
  loadScript(ctx, "js/ui/sidebar_manager.js");

  const SB = ctx.App.UISidebar;
  assert.ok(SB, "App.UISidebar missing — sibling did not register");
  for (const fn of ["renderSidebarFeeds", "renderSidebarKeywordManager",
                    "addSidebarCriticalKeyword", "addSidebarContextKeyword", "addSidebarNoiseKeyword",
                    "removeSidebarCriticalKeyword", "removeSidebarContextKeyword", "removeSidebarNoiseKeyword",
                    "resetSidebarKeywords", "addFeedSource", "removeFeedSource"]) {
    assert.equal(typeof SB[fn], "function", `UISidebar.${fn} missing`);
  }

  // The HTML onclick handlers reference App.UI.<name> — the wrappers in main
  // must still exist and delegate to the sibling. We can't easily verify a
  // delegation runtime here without DOM, but we can verify the public surface.
  const UI = ctx.App.UI;
  assert.ok(UI, "App.UI missing");
  for (const fn of ["addSidebarCriticalKeyword", "addSidebarContextKeyword", "addSidebarNoiseKeyword",
                    "removeSidebarCriticalKeyword", "removeSidebarContextKeyword", "removeSidebarNoiseKeyword",
                    "resetSidebarKeywords", "addFeedSource", "removeFeedSource"]) {
    assert.equal(typeof UI[fn], "function", `App.UI.${fn} wrapper missing in main`);
  }
});

// ─── Seam 7: editor iframe script module ────────────────────────────────────

test("Seam: App.EditorIframeScript.fn is a serialisable function (used via .toString)", () => {
  const ctx = createContext();
  loadScript(ctx, "js/editor/iframe_script.js");

  const EIS = ctx.App.EditorIframeScript;
  assert.ok(EIS, "App.EditorIframeScript missing");
  assert.equal(typeof EIS.fn, "function", "EditorIframeScript.fn missing");

  // editor.js injects the function into the iframe via `'(' + _nlEdFn.toString() + ')();'`
  // so the function MUST be a plain function literal (not an arrow that bound `this`
  // or anything that depends on closure scope from this file). A simple smoke check:
  // its serialized body should still mention key iframe-side identifiers.
  const src = EIS.fn.toString();
  for (const marker of ["postMessage", "_nlEd", "getCleanHtml", "addEventListener"]) {
    assert.ok(src.includes(marker), `iframe script missing marker '${marker}' — extraction may have dropped a section`);
  }
});
