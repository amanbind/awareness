# Project Context

## Product

This is a phishing and security awareness newsletter generator. It turns curated security news into employee-ready newsletter HTML that can be previewed, edited, exported, and optionally sent from the browser.

The project is designed to run without a backend. Live network features call third-party RSS proxies and optional AI APIs directly from the browser.

## Runtime Architecture

The app is a multi-page static site with root HTML entrypoints:

- `index.html`: primary **Home** page (feed fetch, article curation, newsletter generation). The shell **Home** link opens this page; toolbars and Projects deep-link to `#section-home` for the compose workflow.
- `builder.html`: optional bookmark; redirects to `index.html#section-home` (legacy `#section-builder` still scrolls to the same block). Handoff in `localStorage` is preserved.
- `keywords.html`: keyword allow/block list management.
- `preview.html`: generated newsletter preview, language selection, project save/versioning, and post-build actions.
- `editor.html`: rich editor and workspace guard behavior.
- `send.html`: SMTP profile, test send, newsletter send, and delivery log UI.
- `projects.html`: project listing and restore workflow.
- `config.html`: central organization, AI, and feed-source settings.

JavaScript files live in `js` and attach modules to `window.App`. There is no bundler, so page script order matters.

Important modules:

- `js/ux_contract.js`: global menu, flow stepper, route guards, and state cards.
- `js/db.js`: IndexedDB persistence for articles, metadata, drafts, projects, SMTP profiles, and delivery logs.
- `js/router_nav.js`: cross-page handoff through `localStorage`.
- `js/rss_fetcher.js`: RSS source list, CORS/proxy fetches, parsing, filtering, and classification.
- `js/keyword_store.js`: allow/block keyword persistence in `localStorage`.
- `js/project_store.js`: project CRUD, version snapshots, and migration helpers.
- `js/newsletter_builder.js` (~750 lines, core engine) + sibling files in `js/newsletter/`: newsletter HTML generation. The core file holds the shared visual helpers, `TEMPLATE_CATALOG`, the `TEMPLATE_BUILDERS` registry, `registerTemplate(id, fn)`, `build(format, cfg, arts, opts)`, and the public `_components` namespace that siblings destructure from. Sibling files self-register their templates after the core loads: `js/newsletter/bank_page.js` registers `phishingbrief`, `bankpage1_static`, `bankpage1_dynamic`; `js/newsletter/core_templates.js` registers the 19 awareness / digest / poster templates. **Script load order on every page that uses templates is part of the runtime contract: `newsletter_builder.js` first, then `newsletter/bank_page.js`, then `newsletter/core_templates.js`.** Canonical visual reference HTML for most layouts lives in `templates/imported-standalone/`; `node scripts/normalize-imported-templates.mjs` emits email-font–sanitized copies under `templates/imported-email-safe/`. Templates are JS functions returning HTML with `{{TOKEN}}` placeholders that are HTML-escaped during substitution; `phishingbrief` and `bankpage1_static` share an 11-token contract (`INTRO` + `SECTION{1,2,3}_BULLET{1..N}` sourced from `arts[]` titles/summaries), and `bankpage1_dynamic` extends that contract with four card tokens (`CARD1_HEADING`, `CARD1_URL`, `CARD2_HEADING`, `CARD2_URL`) sourced from `arts[0..1]`. Each catalog entry carries `status: 'ready' | 'beta'`; the home picker shows Ready templates (`poster`, `bankpage1_static`, `bankpage1_dynamic`) by default and tucks Beta entries behind a collapsible group. To onboard a new template, add the function + `registerTemplate` call in the right sibling file and follow [TEMPLATE_ONBOARDING.md](TEMPLATE_ONBOARDING.md).
- `js/ai/prompts.js` (~100 lines) + `js/ai/local_fallbacks.js` (~210 lines) + `js/ai/logger.js` (~125 lines) + `js/ai_summarizer.js` (~1700 lines) + `js/ai/prompt_builders.js` (~260 lines) + `js/ai/bank_page_ensemble.js` (~280 lines): all Claude / OpenAI calls, their local rules-based fallbacks, and the universal AI prompt+response logger. `prompts.js` holds the 5 system-prompt constants on `window.AIPrompts`. `local_fallbacks.js` holds the rules-based local content engine on `window.AILocalFallbacks`. `logger.js` exposes `App.AILogger` with `beginBuild({templateId})` / `endBuild()` / `log({name, prompt, response})` / `logRaw({...})` plus the canonical `ENSEMBLE_LOG_URL = 'http://127.0.0.1:4175/save'`; build orchestrators wrap their AI phases with `beginBuild`/`endBuild` so every nested AI call automatically gets a template tag. The main file destructures from prompts + local_fallbacks at IIFE entry, owns summarization + watchout sanitization, instruments every AI round-trip site (`callTemplateSlotsAI`, `summarizeArticle`, `fetchNewsletterChromeMessage`, `regenerateSelection`) with `App.AILogger.log` calls, and exposes `App.AISummarizer._internals` so sibling AI files can reach `config`, `callTemplateSlotsAI`, `isAIAvailable`, scoring helpers, and the bank-page prompt builders (via live getters that delegate to `App.AIPromptBuilders`). `prompt_builders.js` is the 10 bank-page prompt-construction functions as `App.AIPromptBuilders`. The bank-page ensemble lives in `js/ai/bank_page_ensemble.js` as `App.AIBankPageEnsemble`: `aiFillBankPageSlots` fires nine parallel calls (one combined + four per-section + three legacy + one validation), and `postEnsembleLog` now routes through `App.AILogger.logRaw` so the 9 canonical filenames (`combined.txt`, `intro.txt`, the three sections, `impact_organisation.txt`, `next_steps.txt`, `impact_general.txt`, `remember.txt`, `scores.json`) stay byte-identical. The log server (`scripts/ensemble_log_server.mjs`) writes the canonical copy to `ensemble-logs/<session>/<name>` (unchanged); when a payload carries `template_id`, it also writes a mirror to `templates/<template_id>/ensemble-logs/<session>/<name>`. `App.AISummarizer.validateArticleCoherence` and `App.AISummarizer.generateTips` remain as thin wrappers / re-exports. **Script load order on every consuming page: `ai/prompts.js` → `ai/local_fallbacks.js` → `ai/logger.js` → `ai_summarizer.js` → `ai/prompt_builders.js` → `ai/bank_page_ensemble.js`.**
- **Per-template folders:** `templates/<template-id>/design/` (images, reference mocks, visual snippets) + `templates/<template-id>/ensemble-logs/` (per-template AI prompt+response mirror). Every catalog template id has the layout pre-scaffolded; `templates/_article-curation/ensemble-logs/` collects per-article curation AI logs (those aren't tied to any one template). Each leaf folder ships with a 1-line README so the empty directory survives a project zip (project is versioned via zip, not git).
- `js/editor.js` (~900 lines, parent-side controller) + `js/editor/iframe_script.js` (~558 lines, iframe-side script): the Newsletter Studio editor. `editor.js` owns CSS injection, chrome HTML, undo/redo, selection panel, save/export. The iframe-side script — the function serialised via `.toString()` and embedded inside the editor iframe's srcdoc — lives in `js/editor/iframe_script.js` as `App.EditorIframeScript.fn`. The iframe script is self-contained (no outer-scope refs; communicates with the parent via `postMessage`). **Script order on every consuming page: `editor/iframe_script.js` first → `editor.js`** — main reads `window.App.EditorIframeScript.fn` once at IIFE entry. A seam test (`tests/unit/seam-contracts.test.js`) verifies the function still serializes with the expected iframe-side markers.
- `js/ui_controller.js` (~2440 lines after Tier 4; was 3512): main orchestration for the home/build workflow. Exposes `App.UI._state` (shared mutable state) and `App.UI._internals` (helper functions) so sibling files in `js/ui/` can reach the same closure data. Four feature blocks live in siblings:
  - `js/ui/translation.js` → `App.UITranslation` — full translation pipeline (`translateWorkspace`, `translateHtmlAIFirst`, `qaCheckTranslatedHtml`, glossary lock). `App.UI` keeps wrappers `translateHtmlAIFirst`, `translateWorkspaceFromEnglish`, `autoTranslateNewsletter` that delegate.
  - `js/ui/ai_experiment.js` → `App.UIAIExperiment` — Gate D experiment controls (readiness pill, rollback banner, evidence export, storage-key handling). `App.UI` keeps wrappers for the 8 public functions.
  - `js/ui/generate_pipeline.js` → `App.UIGeneratePipeline` — the entire `buildAndPreview` flow (article curation → AI chrome/slots → newsletter HTML → workspace persist → translation kickoff), draft save/load, and project version save/load/restore. The AI section is wrapped with `App.AILogger.beginBuild({templateId: state.selectedFormat})` / `endBuild()` so every nested AI call mirrors logs into the template's folder. `App.UI` keeps wrappers for `buildAndPreview`, `buildAndPreviewEnglishOnly`, `saveDraft`, `saveCopy`, `saveProjectVersion`, `loadSelectedDraft`, `loadDraftById`, `editorLoadSelectedProjectVersion`, `editorRestoreSelectedVersionAsLatest`.
  - `js/ui/sidebar_manager.js` → `App.UISidebar` — sidebar feed list (`renderSidebarFeeds`), keyword chip manager (critical/context/noise + add/remove/reset), and add/remove custom feed source (used by both the sidebar and the config page's feed-source manager). Main keeps 11 thin wrappers on `App.UI` so HTML onclick handlers (`App.UI.addSidebarCriticalKeyword`, `App.UI.addFeedSource`, etc.) keep working.
  - **Script order on every consuming page: `ui_controller.js` first, then `ui/translation.js`, `ui/ai_experiment.js`, `ui/generate_pipeline.js`, `ui/sidebar_manager.js`** — main must define `App.UI._state` / `_internals` before any sibling loads. Each sibling's surface is guarded by a test in `tests/unit/seam-contracts.test.js`.
- `js/responsive_layout.js`: viewport tier metadata.

## Data Flow

1. RSS feeds are fetched through browser-accessible proxies.
2. Articles are filtered and classified using keyword rules and source metadata.
3. Articles and enriched summaries are stored in IndexedDB.
4. Selected articles, organization settings, and generated variants form the newsletter workspace.
5. Cross-page navigation uses a local handoff payload, and guarded pages recover users to Projects or Home.
6. Newsletter HTML is previewed by language, saved as versioned projects, edited, exported, copied, printed, or passed to the send flow.

## Storage

IndexedDB database: `SecurityAwareness`, version `4`.

Stores:

- `articles`
- `meta`
- `drafts`
- `projects`
- `smtpProfiles`
- `deliveryLogs`

Important browser storage keys:

- `awareness_newsletter_workspace_v1`
- `awareness_nav_handoff_v1`
- `awareness_custom_feed_sources_v1`
- `awareness_keywords_v1`
- `awareness_smtp_profile_v1` — SMTP delivery profile. **Password field is always `''` here.** The actual password lives in sessionStorage (`awareness_smtp_password_session_v1`) — see Session-only keys below.
- `awareness_ai_settings_v1` — AI provider + model selection. **Does not contain `aiKey`.** The key lives in sessionStorage (`awareness_ai_key_session_v1`).
- `awareness_ai_experiment_control_v1`
- `awareness_central_config_v1`

### Session-only credential keys (sessionStorage; tab-scoped; cleared on tab close)

These hold the only copies of user credentials anywhere in the app. They are never written to localStorage or IndexedDB.

- `awareness_ai_key_session_v1` — the user's AI API key, restored into the `#ai-key` field by `applyAISettings` on every page that loads `ui_controller.js`.
- `awareness_smtp_password_session_v1` — the user's SMTP password, restored into the `#smtp-password` field by `applySMTPConfig`.

Both follow the same pattern: `saveAISettings` / `saveSMTPConfig` split the credential into sessionStorage and persist a sanitized object (`{ ...cfg, aiKey: '' }` / `{ ...cfg, password: '' }`) to localStorage and IndexedDB. The init code in `ui_controller.js` scrubs any legacy plaintext credential left over from older builds. See `docs/SECURITY.md` for the full policy and `tests/unit/security.test.js` + `tests/e2e/security-smoke.spec.js` for the regression locks.

Treat every key on this list as potentially sensitive. **Never log or commit values from any of them.**

## Current Risks

- Public RSS proxies can fail with CORS, 403, 404, 408, 500, or 520 responses.
- A live feed failure can block article curation unless deterministic fixtures or fallback data are used for tests.
- `js/ui_controller.js` is broad and high-risk for regressions (mitigated once Phase 4 of the restructure plan splits it into `js/ui/*.js`).
- Duplicate/stale folders can drift from the root implementation.
- IndexedDB schema changes require explicit migration notes and regression tests.

## Testing Strategy

Local deterministic tests should use fixtures and route mocks. Live feed behavior should be tested separately as an audit that can report blocked external dependencies without failing deterministic correctness checks.

