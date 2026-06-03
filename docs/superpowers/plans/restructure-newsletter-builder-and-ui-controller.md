# Plan — Restructure `newsletter_builder.js` and `ui_controller.js`, add template-readiness tiering

## Status (2026-05-23) — **Tier 1 + Tier 2 + Tier 3 all complete**

Everything in this plan that is not the "Future direction" agentic pipeline has shipped. Verified gates: lint 0 errors, unit 60/60 (8 seam tests), e2e 18/18.

Final file sizes:
- `js/newsletter_builder.js` 773 (was 3655) + `js/newsletter/bank_page.js` 1202 + `js/newsletter/core_templates.js` 1829
- `js/ai_summarizer.js` 1969 (was 2388) + `js/ai/prompts.js` 104 + `js/ai/local_fallbacks.js` 212 + `js/ai/bank_page_ensemble.js` 274
- `js/ui_controller.js` 2596 (was 3512) + `js/ui/translation.js` 525 + `js/ui/ai_experiment.js` 250 + `js/ui/generate_pipeline.js` 346
- `js/editor.js` 904 (was 1471) + `js/editor/iframe_script.js` 558

Ensemble logs remain on `http://127.0.0.1:4175/save` writing into `ensemble-logs/<session>/` exactly as before.

Only the **Future direction** section below remains as planned work.

---

## Context

Two JavaScript files in `js/` are now over 3000 lines and are the project's main editing-friction hotspots:

- `js/newsletter_builder.js` — 3655 lines, ~23 template functions plus all shared visual components.
- `js/ui_controller.js` — 3512 lines, the master orchestrator for home/build/translate/persist. CLAUDE.md flags this file as "broad and high-risk for regressions."

Editing either today means scrolling past unrelated code; merge-style conflicts are likely on any non-trivial change; and onboarding (human or agent) is slow because each file mixes many concerns.

A small product change is bundled with the restructure: the template picker should show only the three production-ready templates by default — **Corporate Alert** (`poster`), **bankpage1_static**, **bankpage1_dynamic** — and place every other template behind a collapsible "Beta / In Development" dropdown. This keeps the main flow focused on what is ship-quality while leaving the rest discoverable for testing.

**Constraints (unchanged from project rules):**

- No build step. Static vanilla JS, multi-page app.
- Zip-portable: everything functional stays under `awareness/`.
- `window.App.*` is the public surface; HTML script order is a runtime contract.
- AI ensemble, persistence (IndexedDB v4 + localStorage), route guards, translation, and the `App.UXContract.init(...)` calling convention are all preserved bit-for-bit.
- Behavior changes are limited to the template-tiering UI. Everything else is pure file movement.

**Out of scope this round:** `js/ai_summarizer.js` (per user direction); `git init` (user uses zip baselines); any visual redesign; any change to AI prompts, IndexedDB schema, or delivery flow. The agentic template-generation pipeline (see "Future direction" at end of this plan) is **deferred** until after this restructure ships and is evaluated.

---

## Confirmed template tiering

| Tier | Template id | Display name |
|---|---|---|
| **Ready** | `poster` | Corporate Alert |
| **Ready** | `bankpage1_static` | bankpage1_static |
| **Ready** | `bankpage1_dynamic` | bankpage1_dynamic |
| Beta | `phishingbrief` | Bank Page |
| Beta | `knowbe4` | Training Alert |
| Beta | `people` | Team Chat |
| Beta | `infographic` | Spot the Phish |
| Beta | `quicktips` | Quick Safety Rules |
| Beta | `redflags` | Red Flags Checklist |
| Beta | `stoplook` | Stop Look Report |
| Beta | `emaildissect` | Email Anatomy |
| Beta | `dodont` | Do vs Don't |
| Beta | `spotlight` | Threat Spotlight |
| Beta | `timeline` | Incident Timeline |
| Beta | `scorecard` | Awareness Scorecard |
| Beta | `cybertimes` | Cyber Security Times |
| Beta | `testbrief` | Security Dispatch (Test) |
| Beta | `poster1`..`poster5` | Impact Poster variants |
| Beta | `newspaper` | The Cyber Gazette |

`phishingbrief` is grouped as beta because the user named only the three other templates as ready; flag during Phase 2 review if it should join the ready tier.

---

## Target file layout

```
js/
  ai_summarizer.js                 (unchanged, 2388 lines)
  db.js                            (unchanged)
  delivery_helpers.js              (unchanged)
  editor.js                        (unchanged)
  feed_scoring.js                  (unchanged)
  graphics_engine.js               (unchanged)
  keyword_store.js                 (unchanged)
  project_store.js                 (unchanged)
  responsive_layout.js             (unchanged)
  router_nav.js                    (unchanged)
  rss_fetcher.js                   (unchanged)
  translation_metrics.js           (unchanged)
  utils.js                         (unchanged)
  ux_contract.js                   (unchanged)

  newsletter_builder.js            ~1000 lines  — core engine: shared helpers,
                                                  shared visual components,
                                                  TEMPLATE_CATALOG + status tier,
                                                  registerTemplate(), build(),
                                                  normalizeRenderOptions(),
                                                  applyRenderProfile()
  newsletter/
    bank_page.js                   ~800 lines   — phishingbrief, bankpage1_static,
                                                  bankpage1_dynamic
    awareness_pack.js              ~1500 lines  — poster, knowbe4, people,
                                                  infographic, quicktips, redflags,
                                                  stoplook, emaildissect, dodont,
                                                  spotlight, timeline, scorecard,
                                                  poster1..poster5
    digest.js                      ~350 lines   — cybertimes, testbrief, newspaper

  ui_controller.js                 ~800 lines   — init shell, App.UI public surface,
                                                  page wiring entry points
  ui/
    state.js                       ~600 lines   — App.UI._state (workspace,
                                                  allArticles, selectedArticleIndices,
                                                  selectedFormat), getConfig(),
                                                  getMetadata(), persistWorkspace()
    generate_pipeline.js           ~900 lines   — buildAndPreview(), AI chrome
                                                  + slot calls,
                                                  NewsletterBuilder.build() call,
                                                  preview render
    translation.js                 ~500 lines   — translateWorkspaceFromEnglish(),
                                                  translateHtmlAIFirst() orchestration,
                                                  per-language loop, metrics hooks
    event_wiring.js                ~700 lines   — DOM listeners, button handlers,
                                                  date-chip filters, keyword search,
                                                  template picker render (incl. new
                                                  Ready / Beta sections)
```

No JS file remains above ~1500 lines, except `awareness_pack.js`, which is naturally large because it holds 17 independent template functions that don't share state — adding a 24th template lands in one file with no cross-cutting impact.

---

## Critical files to be modified

| Path | Reason |
|---|---|
| [js/newsletter_builder.js](../../../js/newsletter_builder.js) | Slim to core engine; add `status: 'ready' \| 'beta'` field to each TEMPLATE_CATALOG entry; expose `registerTemplate(id, fn)` + `getTemplatesByTier(tier)` |
| [js/newsletter/bank_page.js](../../../js/newsletter/bank_page.js) | New — extract the 3 bank-page templates |
| [js/newsletter/awareness_pack.js](../../../js/newsletter/awareness_pack.js) | New — extract Templates 1–12 + poster variants |
| [js/newsletter/digest.js](../../../js/newsletter/digest.js) | New — extract digest, test, newspaper variants |
| [js/ui_controller.js](../../../js/ui_controller.js) | Slim to public surface + init; remove state object, generate, translate, events |
| [js/ui/state.js](../../../js/ui/state.js) | New — `App.UI._state`, `getConfig`, `getMetadata`, persistence helpers |
| [js/ui/generate_pipeline.js](../../../js/ui/generate_pipeline.js) | New — `buildAndPreview`, AI-fill orchestration |
| [js/ui/translation.js](../../../js/ui/translation.js) | New — per-language translate loop |
| [js/ui/event_wiring.js](../../../js/ui/event_wiring.js) | New — DOM wiring + new template picker render with Ready / Beta sections |
| [index.html](../../../index.html) | Add `<script>` tags for `js/newsletter/*` and `js/ui/*` in correct order |
| [preview.html](../../../preview.html) | Add `<script>` tags for `js/newsletter/*` and `js/ui/*` |
| [editor.html](../../../editor.html) | Add `<script>` tags for `js/newsletter/*` and `js/ui/*` |
| [send.html](../../../send.html) | Add `<script>` tags for `js/newsletter/*` and `js/ui/*` |
| [curation-lab.html](../../../curation-lab.html) | Add `<script>` tags for `js/newsletter/*` and `js/ui/*` |
| [config.html](../../../config.html) | Add `<script>` tags for `js/newsletter/*` (loads newsletter_builder.js today); add `js/ui/*` only if it currently loads `ui_controller.js` |
| [keywords.html](../../../keywords.html) | Add `<script>` tags for `js/ui/*` only if it currently loads `ui_controller.js` |
| [projects.html](../../../projects.html) | Add `<script>` tags for `js/ui/*` only if it currently loads `ui_controller.js` |
| [CLAUDE.md](../../../CLAUDE.md) | Update the architecture-notes section to reference the new `js/newsletter/` and `js/ui/` folders; soften or replace the "broad and high-risk" note on `ui_controller.js` once it is no longer monolithic |
| [AGENTS.md](../../../AGENTS.md) | Fix stale absolute path (`c:\Users\manka\Downloads\awareness` → "the repository root" — generic) |
| [CONTEXT.md](../../../CONTEXT.md) | New at repo root — restored from `docs/superpowers/plans/system_summary.md`; CLAUDE.md already lists this as authoritative but the file is missing today |

---

## Existing utilities to reuse (do not reinvent)

- `App.NewsletterBuilder.build(format, cfg, arts, opts)` — public surface stays identical. Implementation moves to the slimmed `newsletter_builder.js` and dispatches via the `TEMPLATE_CATALOG` registry that sibling files push into.
- Token-substitution loop already in `newsletter_builder.js` (`for (const k of Object.keys(tokens))`) — keep where it is, in the core file, since every template uses it.
- All visual primitives (`tbl`, `tbc`, `escapeHtml`, `escAttr`, `mastheadKicker`, `foot`, `darkMasthead`, `goldBannerStrip`, `goldGradientBar`, `gradientFade`, `sectionBand`, `classificationBar`, `intelligenceMasthead`, `editorialDivider`, `executivePullQuote`, `statBlock`, `briefingPanel`, `campaignStep`, `articleCard`, `stoneSpacerTr`, `trainingPackReportCta`, `screenSafeStyle`, `animFadeIn`, `animSlideUp`, `animSlideLeft`, `animSlideRight`, `pickUniqueSlotLines`, `nlEmojiIcon`, `nlHeroRaster`, `nlOuterOpen`, `nlOuterClose`, `spotlightLine`, `corporateTopicIntroHtml`) — stay in the core `newsletter_builder.js` and are exposed on `App.NewsletterBuilder._components` so sibling template files can reach them.
- `App.UXContract.init({pageId, flowStepId, guard?})` — unchanged. All page-level init still calls it before page-specific UI init.
- `App.RouterNav.*` — unchanged. Cross-page handoff is read by `js/ui/state.js` exactly as `ui_controller.js` does today.
- `App.AISummarizer.*` — unchanged. `js/ui/generate_pipeline.js` calls it the same way `ui_controller.js` does.
- `App.DB.*` — unchanged. `js/ui/state.js` calls it for project hydration.

---

## Cross-file mechanics

### Newsletter side

`newsletter_builder.js` defines `App.NewsletterBuilder` and exposes:

```js
App.NewsletterBuilder = {
  TEMPLATE_CATALOG: [],                          // populated by registerTemplate calls
  registerTemplate(id, builderFn, metadata),     // appends to catalog
  getTemplatesByTier(tier),                      // 'ready' | 'beta' | 'all'
  build(format, cfg, arts, opts),                // dispatcher
  // ...internal _components exposed for sibling template files
};
```

Each sibling file ends with a series of `registerTemplate(...)` calls. Script load order on every consuming page:

```
js/newsletter_builder.js
js/newsletter/bank_page.js
js/newsletter/awareness_pack.js
js/newsletter/digest.js
```

### UI controller side

`ui_controller.js` becomes a slim shell that exposes `App.UI` and calls into siblings during `App.UI.initHomePage()` / `initPreviewPage()` / etc. The shared mutable state moves to `App.UI._state` so every sub-file can reach the same object reference.

```js
App.UI = {
  _state: { /* workspace, allArticles, selectedArticleIndices, selectedFormat, ... */ },
  initHomePage(), initPreviewPage(), initEditorPage(), initSendPage(),
  initKeywordsPage(), initProjectsPage(), initConfigPage(), initCurationLabPage(),
  // internal helpers exposed for siblings:
  _generate: { /* from generate_pipeline.js */ },
  _translate: { /* from translation.js */ },
  _events: { /* from event_wiring.js */ },
  _stateApi: { /* from state.js: getConfig, getMetadata, persistWorkspace, hydrateFromHandoff */ }
};
```

Script load order on every page that uses App.UI:

```
js/ui_controller.js           (defines App.UI = { _state, init*, ... } shell)
js/ui/state.js                (attaches _stateApi)
js/ui/translation.js          (attaches _translate)
js/ui/generate_pipeline.js    (attaches _generate; depends on _stateApi)
js/ui/event_wiring.js         (attaches _events; depends on everything else)
```

`event_wiring.js` is last because its handlers fire at user-action time and reach into all other sub-modules.

### Template-tiering UI

Picker render code (currently inside `ui_controller.js`) moves to `event_wiring.js`. After the move, it renders:

- A "Ready" group at the top, expanded by default, holding the three ready templates.
- A "Beta / In Development" section underneath, **collapsed by default**, holding the remaining ~20 templates. Click to expand.
- The selected-template indicator and the Generate button work identically regardless of which group the chosen template came from.
- `getTemplatesByTier('ready')` and `getTemplatesByTier('beta')` are queried at render time so the catalog stays the source of truth.

This is the only user-visible behavior change in the entire plan.

---

## Phased execution

Each phase is independently verifiable. Take a zip backup at the end of each phase that passes verification — that becomes the new safety baseline before the next phase begins.

### Phase 1 — Docs (no code changes)

1. Copy `docs/superpowers/plans/system_summary.md` to a new `CONTEXT.md` at repo root, lightly trimmed to remove the "for restructuring" framing.
2. Edit `AGENTS.md` line 7 to remove the stale absolute path (`c:\Users\manka\Downloads\awareness`) and replace with "the repository root."
3. No code touched, no script tags moved. Verifies cleanly: `npm run verify` should still pass.
4. Zip backup → `awareness-after-phase-1.zip`.

### Phase 2 — Template-readiness tiering (single behavior change, isolated)

1. Add `status: 'ready'` to the three named TEMPLATE_CATALOG entries in `newsletter_builder.js`. Add `status: 'beta'` to all other entries.
2. Add `App.NewsletterBuilder.getTemplatesByTier(tier)` helper next to the catalog.
3. Locate the template-picker render block in `ui_controller.js`. Replace its single-list render with two sections: a "Ready" group (default open) and a "Beta / In Development" group (default closed, click-to-expand).
4. CSS for the section headers and the collapse toggle: minimal, reuse existing `.btn` / `.crumb-btn` styles from `index.html`. Keep it visually consistent with the current picker.
5. Verify:
   - `npm run lint`, `npm run test:unit`, `npm run test:e2e`, `npm run audit:baseline` all green.
   - Manual: open `index.html`, picker shows three Ready cards immediately; the Beta section is collapsed and expands on click to reveal the rest.
   - Generate from each Ready template → identical output to pre-change.
   - Expand Beta → pick one → Generate → identical output to pre-change.
6. Zip backup → `awareness-after-phase-2.zip`.

### Phase 3 — Split `newsletter_builder.js`

1. Create `js/newsletter/` folder.
2. **Move templates only — leave all helpers and shared components in the core file** to minimize cross-file dependencies in the first iteration. The split is by template family, not by component layer.
3. Create `js/newsletter/bank_page.js` — move `phishingbrief`, `bankpage1_static`, `bankpage1_dynamic` template functions and their per-template-only helpers. End the file with three `App.NewsletterBuilder.registerTemplate(...)` calls.
4. Create `js/newsletter/awareness_pack.js` — move `poster`, `knowbe4`, `people`, `infographic`, `quicktips`, `redflags`, `stoplook`, `emaildissect`, `dodont`, `spotlight`, `timeline`, `scorecard`, `poster1`..`poster5`. End with `registerTemplate(...)` calls.
5. Create `js/newsletter/digest.js` — move `cybertimes`, `testbrief`, `newspaper`. End with `registerTemplate(...)` calls.
6. In core `newsletter_builder.js`: remove the moved template functions; remove their static entries from `TEMPLATE_CATALOG` (catalog now starts empty and is filled by sibling files); expose the `_components` namespace so siblings can call `App.NewsletterBuilder._components.tbl(...)` etc.
7. Add `<script src="js/newsletter/bank_page.js"></script>` etc. to all six consuming HTML files (`index.html`, `preview.html`, `editor.html`, `send.html`, `curation-lab.html`, `config.html`), placed directly after the existing `<script src="js/newsletter_builder.js"></script>` line.
8. Verify (see verification section below).
9. Zip backup → `awareness-after-phase-3.zip`.

### Phase 4 — Split `ui_controller.js`

Highest-risk phase. Move in small commits, verifying after each.

1. Create `js/ui/` folder.
2. **Sub-phase 4a — `state.js`:** Move the `state` object literal and its read/write helpers (`getConfig`, `getMetadata`, `persistWorkspace`, `hydrateFromHandoff`) to `js/ui/state.js`. Replace direct closure references in `ui_controller.js` with `App.UI._state.X` access. Verify before continuing.
3. **Sub-phase 4b — `translation.js`:** Move `translateWorkspaceFromEnglish`, `translateHtmlAIFirst`, the per-language loop, and the metrics hooks. Verify generate-with-multi-language still produces correct variants.
4. **Sub-phase 4c — `generate_pipeline.js`:** Move `buildAndPreview`, the AI chrome / slot orchestration, and the `NewsletterBuilder.build` call. Verify Generate from index.html produces identical HTML to Phase 3.
5. **Sub-phase 4d — `event_wiring.js`:** Move all DOM listeners, button handlers, date-chip filters, keyword search, and the template picker render (already updated in Phase 2). Verify every interactive element on every page still works.
6. Slim `ui_controller.js` to the `App.UI` namespace declaration, `_state` initialization, and the `init*Page()` entry points. Each `init*Page()` is a short coordinator calling into `_stateApi`, `_events`, etc.
7. Add `<script>` tags for the four new sibling files to every HTML page that currently loads `ui_controller.js`, in the documented order.
8. Verify (see verification section below).
9. Zip backup → `awareness-after-phase-4.zip`.

### Phase 5 — Docs refresh

1. Edit `CLAUDE.md`: replace the "broad and high-risk" caution on `ui_controller.js` with a short note about the new `js/ui/` layout. Add a one-paragraph "Template tiering" entry describing Ready vs Beta.
2. Update `CONTEXT.md` (from Phase 1) to reflect the new layout.
3. Add short `README.md` files inside `js/newsletter/` and `js/ui/` (one screen each) explaining the registration / dispatch model and the load order.
4. Zip backup → `awareness-final.zip`.

---

## Verification

Run after Phase 3 and again after Phase 4. Both runs must pass before zipping.

### Automated gate

```bash
npm run lint              # warnings allowed; errors fail
npm run test:unit         # 4+ tests, all pass
npm run test:e2e          # 7 tests, all pass — auto-starts npm run serve
npm run audit:baseline    # baseline checks pass; blocked != fail
npm run verify            # full local gate (chains all of the above)
```

### Manual QA matrix

Open each page in a fresh browser tab against `npm run serve` (http://127.0.0.1:4173) and run the listed checks. Failing any single line means do not zip; investigate.

**index.html — Home / Fetch / Curate / Build**
- Page loads without console errors.
- Global menu, flow stepper, breadcrumb render via `App.UXContract.init`.
- Fetch Live News → articles appear; Load from DB also works on a populated DB.
- Date filter chips, keyword search, category chips all filter correctly.
- **Template picker shows three Ready cards by default, Beta section collapsed below them.**
- Expand Beta → all remaining templates are listed.
- Select each of the three Ready templates → Generate → preview HTML opens and renders without raw `{{TOKEN}}` text and without missing components.
- Expand Beta → spot-check at least four templates from different families (one poster, one digest, one training, one infographic) → Generate works identically.
- Refresh after Generate → workspace persists.

**preview.html**
- Direct visit without a workspace → route guard panel appears.
- Visit after generating on home → preview renders English variant.
- Per-language tabs switch correctly; saved project snapshot loads via `projectSnapshotVersion` handoff.
- Save Project → success toast → projects page lists it.

**editor.html**
- Route guard appears without a workspace.
- With a workspace: iframe loads, single-click selection, shift-click multi-select, double-click text edit all behave as before.
- Property panel B/I/U/Color/Size apply to highlighted text inside `_sel` (selection-aware formatting).
- Remove and Remove-in-all-languages iterate `_selSet`.
- Bullet-row deletion only removes the targeted bullet, not the whole section (regression check from `findBulletWrapper` fix).

**send.html**
- Route guard without a workspace.
- With a workspace: send-controls UI loads; SMTP profile and delivery-log UI render.

**projects.html**
- Lists saved projects; Open hands off to `preview.html` with `projectId` (and `projectSnapshotVersion` if a version is selected).

**keywords.html, curation-lab.html, config.html**
- Each page loads, global menu renders, flow stepper highlights the expected step.
- Keywords: add / search / reset / persist.
- Config: org name, SOC email, portal URL, custom feeds persist after refresh.
- Curation lab: single-article prompt inspection works.

**Translation**
- On any Generate, select two non-English languages → both variants populated.
- Check `App.TranslationMetrics` console hook (if enabled) for normal call counts.

**AI ensemble**
- With Claude or OpenAI key configured: bank-page Generate produces filled bullets in all sections.
- Without keys: local-summary fallback fills bullets — no console errors, no empty cards.

### Build-time evidence to capture

- A `verify-output.txt` (manually saved, optional) listing the `npm run verify` output after Phase 3 and Phase 4.
- The five zip backups, one per phase.

---

## Failure handling

If verification fails at any sub-phase:

1. **Loud failure (console error, missing element, route-guard panel where none expected):** identify the missing helper or wrong script-tag order; fix in place; re-verify before moving to the next sub-phase. Do not stack changes on top of a failing state.
2. **Silent failure (output looks wrong but no error):** restore the previous phase's zip backup and re-attempt the sub-phase with a narrower extraction. Common silent-failure pattern is a sub-file IIFE capturing a stale reference to a state value that lives in another sub-file; the fix is to access via `App.UI._state.X` rather than via a captured local.
3. **Template missing from picker after Phase 3:** the `registerTemplate` call was either dropped during the move or executed before the catalog array existed. Confirm the script tag for the sibling file is present and after `newsletter_builder.js`.
4. **Generate crashes after Phase 4 with `... is not a function`:** a helper that lived in a closure now lives across files but wasn't exposed on `App.UI._generate` / `_events` / `_stateApi`. Add the missing export.

---

## What ships

After all five phases pass verification:

- `newsletter_builder.js` is ~1000 lines (was 3655) and contains only the engine + shared components.
- `ui_controller.js` is ~800 lines (was 3512) and contains only the public surface + page init.
- Eight new focused sibling files (three under `js/newsletter/`, four under `js/ui/`, plus the optional `CONTEXT.md` and two folder READMEs) make every template and every UI seam findable in under a screen of scrolling.
- The template picker shows three production-ready templates by default with the rest tucked behind a "Beta / In Development" toggle — a clearer signal of what is ship-quality to anyone using the app.
- Generated newsletter output, AI prompts, persistence, route guards, and zip portability are bit-for-bit identical to today.
- A series of zip baselines makes any phase independently revertable.

---

## Future direction (deferred — captured here so intent is not lost)

After the five-phase restructure ships and is evaluated, the next initiative shifts the product away from hand-authored hardcoded templates and toward an **agentic template-generation pipeline**. This section is intent-only; the detailed plan will be written as a separate doc once the restructure output is in hand.

**User goal:** Stop hard-coding new templates. Instead, the user supplies a reference layout; the system extracts its structure, repaints it into the project's black/gold/cream palette, sources topic-relevant imagery, and uses API key calls to fill the text — producing a fresh, on-brand template for each edition.

**Inputs accepted:**
- **HTML upload** — user drops a `.html` file; pipeline parses the DOM, classifies regions (masthead, hero, sections, footer), and uses the structure as the layout skeleton.
- **PNG / image upload** — user drops an image of a layout; a vision-capable model interprets the structure into an equivalent skeleton. Both input paths feed the same downstream stages.

**Pipeline stages (each stage is a candidate for its own "agent"):**

1. **Reference ingestion** — accept HTML or PNG; produce a normalized layout description (region tree, approximate hierarchy, image-slot positions).
2. **Palette swap** — replace the reference's colors with the project's `--blk` / `--gold` / `--gold-hi` / `--cream` palette, preserving contrast hierarchy. Email-safe: no CSS variables in output HTML; resolved hex values only.
3. **Image selection** — for the edition's topic, source one or more relevant images. Source TBD when planned (article hero images already in `state.allArticles` are the obvious first source; stock APIs and AI image generation are open options).
4. **Text generation** — API call (Claude or OpenAI, using the existing `App.AISummarizer` infrastructure and user-configured keys) to fill headlines, intro, bullets, and CTAs for the selected articles.
5. **Render + register** — emit the final email-safe HTML, register it into `App.NewsletterBuilder` under a generated id (e.g. `agentic-2026-05-23-phishing`), and make it selectable from the picker.

**Configuration to plan when the time comes:**
- Where each stage's "agent" runs (in-browser AI call vs. relay-server call, given the static no-backend constraint).
- Whether each stage is one API call or an ensemble (the existing bank-page flow already runs 9 parallel calls per Generate; the pipeline may follow that pattern per stage).
- Image source selection (article-extracted vs. stock API vs. generated).
- Storage: are agentically-generated templates one-shot per edition, or saved into the catalog for reuse?
- UI: where does the user trigger this — a new "Generate Custom Template" button on the home picker, or as the default Generate flow?

**Why deferred:** the agentic pipeline lands cleanly only if `newsletter_builder.js` already exposes `registerTemplate(id, fn, metadata)` (Phase 3 of this plan) and if `ui_controller.js` has a clear `_generate` / `_events` seam where a pipeline trigger can hook in (Phase 4 of this plan). Doing the restructure first means the pipeline plugs into clean joints instead of into a 3500-line monolith.
