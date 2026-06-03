# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Companion Docs

These files are authoritative and should be read before non-trivial work:

- `AGENTS.md` — multi-agent workflow, local quality gate, test-first rules, safety rules.
- `docs/CONTEXT.md` — runtime architecture, module responsibilities, data flow, IndexedDB schema, sensitive storage keys.
- `docs/foundation_ux_contract.md` — page-to-flow mapping, route guard rules, state-card API. Every major page must conform.
- `docs/TESTING.md` — local commands, deterministic vs. live checks, manual QA checklist.
- `MEMORY.md` — durable goals, recurring cautions, latest verification snapshot.

See `docs/README.md` for the full documentation index.

Treat `docs/foundation_ux_contract.md` as a hard contract: changes to navigation labels, flow steps, guards, or `App.UXContract.init` callers must update the contract alongside the code.

## Commands

```bash
npm install              # one-time
npm run serve            # static server at http://127.0.0.1:4173
npm run lint
npm run test:unit        # node --test, all files under tests/unit/
npm run test:e2e         # Playwright (Chromium only); auto-starts npm run serve
npm run audit:baseline   # boots static server, then runs scripts/run_baseline_critical_path_audit.js
npm run verify           # lint + unit + e2e + audit (the full local gate)
npm run templates:normalize-imports  # regenerate templates/imported-email-safe/ from templates/imported-standalone/
```

Run a single unit test file:

```bash
node --test tests/unit/utils-clipboard.test.js
```

Run a single E2E spec (or filter by title):

```bash
npx playwright test tests/e2e/critical-flow.spec.js
npx playwright test -g "fetch fallback"
```

The Playwright config (`playwright.config.js`) auto-starts `npm run serve` and reuses an existing server locally. E2E specs assume `http://127.0.0.1:4173`.

## Architecture Notes Not Obvious From Files

- **No build step.** This is a static vanilla-JS multi-page app. `index.html`, `preview.html`, `editor.html`, `send.html`, `projects.html`, `keywords.html`, `curation-lab.html`, `config.html` are root entrypoints. `builder.html` is a legacy redirect to `index.html#section-home`.
- **`window.App` is the module surface.** Scripts in `js/` attach to `window.App.*` (e.g. `App.UXContract`, `App.UI`, `App.DB`, `App.RouterNav`). **HTML script order is part of the runtime contract** — do not reorder `<script>` tags casually.
- **Every major page must call `App.UXContract.init({ pageId, flowStepId, guard? })` before page-level UI init** to get the shared menu, flow stepper, and guard behavior. Required pages (`preview`, `editor`, `send`) rely on its guard to enforce a workspace.
- **Workspace state lives in `localStorage` (`awareness_newsletter_workspace_v1`) plus IndexedDB.** Cross-page handoff goes through `js/router_nav.js` (`awareness_nav_handoff_v1`). The **Home** link clears `projectId` / `projectSnapshotVersion` / `activeDraftId` from the handoff; other toolbars may deep-link to `#section-home`. Optional `projectSnapshotVersion` loads a saved snapshot instead of the live row.
- **IndexedDB:** database `SecurityAwareness`, version `4`, stores `articles`, `meta`, `drafts`, `projects`, `smtpProfiles`, `deliveryLogs`. Schema bumps require migration notes and regression tests (see `docs/CONTEXT.md`).
- **`js/ui_controller.js` is broad and high-risk for regressions** (~2440 lines after Tier 4 extraction; was 3512 before any split). Four feature blocks now live in siblings under `js/ui/`, each reached via its own `App.UI*` namespace, and all of them read shared mutable state from `App.UI._state` and helper functions from `App.UI._internals`:
  - `js/ui/translation.js` → `App.UITranslation` (translation pipeline). Wrappers `translateHtmlAIFirst`, `translateWorkspaceFromEnglish`, `autoTranslateNewsletter` remain in main and delegate.
  - `js/ui/ai_experiment.js` → `App.UIAIExperiment` (Gate D experiment controls: readiness pill, rollback banner, evidence export). Wrappers for the 8 public functions remain in main.
  - `js/ui/generate_pipeline.js` → `App.UIGeneratePipeline` (the entire `buildAndPreview` flow + draft save/load + project version save/load/restore). Wrappers for `buildAndPreview`, `buildAndPreviewEnglishOnly`, `saveDraft`, `saveCopy`, `saveProjectVersion`, `loadSelectedDraft`, `loadDraftById`, `editorLoadSelectedProjectVersion`, `editorRestoreSelectedVersionAsLatest` remain in main. This file is also where `beginBuild({templateId})`/`endBuild` wraps the build's AI section.
  - `js/ui/sidebar_manager.js` → `App.UISidebar` (sidebar feed list + keyword chip manager + add/remove custom feed source). Main keeps thin wrappers for the 11 functions called from HTML onclick handlers (`App.UI.addSidebarCriticalKeyword`, etc.) so the markup keeps working.
  - **Script order on every consuming page: `ui_controller.js` first, then `ui/translation.js`, `ui/ai_experiment.js`, `ui/generate_pipeline.js`, `ui/sidebar_manager.js`** — main must define `App.UI._state`/`_internals` before any sibling loads. Each sibling's contract is guarded by a test in `tests/unit/seam-contracts.test.js`. Prefer small test-backed fixes over further refactors here.
- **Templates are split across sibling files.** Core engine + shared visual helpers + `TEMPLATE_BUILDERS` registry live in `js/newsletter_builder.js` (~750 lines). Templates self-register from siblings: `js/newsletter/bank_page.js` (3 bank-page templates) and `js/newsletter/core_templates.js` (19 awareness / digest / poster templates). Each catalog entry carries `status: 'ready' | 'beta'`; the home picker shows Ready (`poster`, `bankpage1_static`, `bankpage1_dynamic`) by default and tucks Beta behind a collapsible group. **Script order on every page that uses templates: `newsletter_builder.js` → `newsletter/bank_page.js` → `newsletter/core_templates.js`** (the main file must load first because it defines the registration API). Adding a new template = a `App.NewsletterBuilder.registerTemplate(id, fn)` call in the right sibling file; shared visual helpers are reached via `App.NewsletterBuilder._components`.
- **Per-template folders.** Every catalog template has a folder at `templates/<template-id>/` with two subfolders: `design/` (for AI-generated or pulled imagery + reference mocks) and `ensemble-logs/` (per-template AI prompt+response logs, mirrored from the canonical project-root `ensemble-logs/`). A tiny README ships in each subfolder so empty directories survive a zip (project ships via zip, no git). Article-level curation logs go into the pseudo-template `templates/_article-curation/ensemble-logs/`.
- **AI module is split across five files.** `js/ai/prompts.js` (~100 lines) holds the 5 system-prompt constants on `window.AIPrompts`. `js/ai/local_fallbacks.js` (~210 lines) holds the rules-based local content engine on `window.AILocalFallbacks`. `js/ai/logger.js` (~125 lines) holds `App.AILogger` — the universal AI prompt+response logger with `beginBuild({templateId})`/`endBuild()`/`log({name, prompt, response})`/`logRaw({...})` plus the canonical `ENSEMBLE_LOG_URL = 'http://127.0.0.1:4175/save'`. Core AI lives in `js/ai_summarizer.js` (~1700 lines) — every AI call site (`callTemplateSlotsAI`, `summarizeArticle`, `fetchNewsletterChromeMessage`, `regenerateSelection`) routes through `App.AILogger.log`. `js/ai/prompt_builders.js` (~260 lines) holds the 10 bank-page prompt-construction functions as `App.AIPromptBuilders`; main re-exposes them via `_internals` live getters. `js/ai/bank_page_ensemble.js` (~280 lines) is `App.AIBankPageEnsemble` (9-call ensemble + `validateArticleCoherence`); its `postEnsembleLog` now routes through `App.AILogger.logRaw` so the canonical 9 filenames stay byte-identical. **Script order: `ai/prompts.js` → `ai/local_fallbacks.js` → `ai/logger.js` → `ai_summarizer.js` → `ai/prompt_builders.js` → `ai/bank_page_ensemble.js`.** Adding logging to a new template builder = wrap the build phase in `App.AILogger.beginBuild({templateId: '<id>'})` / `endBuild()`.
- **Editor module is split.** `js/editor.js` (~900 lines, down from 1471) owns the parent-side controller — CSS injection, chrome HTML, undo/redo, selection panel, save/export. The iframe-side script (the function serialised via `_nlEdFn.toString()` and embedded inside the editor iframe's srcdoc) lives in `js/editor/iframe_script.js` (~558 lines) as `App.EditorIframeScript.fn`. The iframe script is self-contained (no outer-scope refs; communicates with the parent via postMessage). **Script order on every consuming page: `editor/iframe_script.js` first → `editor.js`** — main reads `window.App.EditorIframeScript.fn` once at IIFE entry. A seam test in `tests/unit/seam-contracts.test.js` verifies the function still serializes with the expected iframe-side markers.
- **Templates pipeline:** canonical visual references live in `templates/imported-standalone/`. The script `scripts/normalize-imported-templates.mjs` emits email-font–sanitized copies under `templates/imported-email-safe/` for side-by-side QA. Don't hand-edit the email-safe folder.

## Testing Discipline

- **Deterministic E2E tests must use fixtures or route mocks** (`tests/fixtures/articles.js`). They must pass even when public RSS proxies and AI APIs are unreachable.
- **The baseline audit (`scripts/run_baseline_critical_path_audit.js`) may touch live integrations.** Treat upstream failures as `blocked` evidence — never rewrite a deterministic test to paper over a proxy/AI outage. Real `fail` checks exit non-zero; `blocked` is explicit and non-fatal.
- **Test-first for behavior changes.** Add or update a test, watch it fail for the expected reason, make the smallest scoped fix, then rerun the targeted test plus the relevant quality gate.
- **Preserve the empty-fetch and empty-DB fallback paths** in the curate/build flow — these unblock the workflow when feeds or storage are empty and are covered by deterministic E2E.

## Safety

- Don't commit `baseline-critical-path-audit-results.json`, `playwright-report/`, or `test-results/` unless the task explicitly updates audit evidence (these are gitignored).
- Never log or commit values from the sensitive `localStorage` keys listed in `docs/CONTEXT.md` (API keys, SMTP profile, AI settings, workspace dumps, delivery logs).
- Preserve the static, no-backend app model unless the user explicitly approves a larger architecture change.


