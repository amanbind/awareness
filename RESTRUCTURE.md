# Restructure + New Features — Summary

A short reference for what's new in the awareness codebase. For full detail, see [CLAUDE.md](CLAUDE.md), [docs/CONTEXT.md](docs/CONTEXT.md), and [docs/superpowers/plans/restructure-newsletter-builder-and-ui-controller.md](docs/superpowers/plans/restructure-newsletter-builder-and-ui-controller.md).

---

## 1. File split (no functionality changes — just organisation)

Four heavy files were broken into sibling modules. The main file owns the public API + shared state; sibling files attach feature blocks via `App.X*` namespaces and read shared closure data through `App.X._state` / `App.X._internals`.

| Module family | Main file (was → now) | Sibling files |
|---|---|---|
| **Newsletter templates** | `js/newsletter_builder.js` (3655 → **773**) | `js/newsletter/bank_page.js` (1202), `js/newsletter/core_templates.js` (1829) |
| **AI** | `js/ai_summarizer.js` (2388 → **1969**) | `js/ai/prompts.js` (104), `js/ai/local_fallbacks.js` (212), `js/ai/bank_page_ensemble.js` (274) |
| **UI controller** | `js/ui_controller.js` (3512 → **2596**) | `js/ui/translation.js` (525), `js/ui/ai_experiment.js` (250), `js/ui/generate_pipeline.js` (346) |
| **Editor** | `js/editor.js` (1471 → **904**) | `js/editor/iframe_script.js` (558) |

**Total reduction in main-file size: ~4,800 lines.**

Functionality, AI ensemble logs (`http://127.0.0.1:4175/save` → `ensemble-logs/<session>/`), IndexedDB schema, and the no-build static-app model are all preserved bit-for-bit.

---

## 2. HTML script load order (runtime contract — don't reorder casually)

```
js/ai/prompts.js            ← FIRST (main file's template literals interpolate these)
js/ai/local_fallbacks.js
js/ai_summarizer.js
js/ai/bank_page_ensemble.js
...
js/newsletter_builder.js    ← FIRST (defines registerTemplate API)
js/newsletter/bank_page.js
js/newsletter/core_templates.js
...
js/ui_controller.js         ← FIRST (defines App.UI._state / _internals)
js/ui/translation.js
js/ui/ai_experiment.js
js/ui/generate_pipeline.js

js/editor/iframe_script.js  ← FIRST (main reads window.App.EditorIframeScript.fn)
js/editor.js
```

---

## 3. Seam tests

`tests/unit/seam-contracts.test.js` has **11 tests** guarding the cross-file contracts. If a future refactor renames a public function or drops a registration, these fire before any feature test catches the regression.

Current gate: **lint 0 errors, unit 64/64, e2e 18/18**.

---

## 4. New feature: Regenerate-with-AI (editor)

Two buttons in the editor's right-panel action grid (next to Lock / Remove):

- **↻ Regenerate** — re-runs the AI on the selected element(s) in the language you're currently previewing. Other languages stay as-is.
- **↻ All languages** — re-runs the AI in English, then auto-translates to every other language. Works from any preview language.

How it works:
- Multi-select any combination of bullets / paragraphs (shift-click).
- Click a regen button → optional instruction textarea opens (e.g. *"make these punchier"*, *"focus on phishing"*). Leave blank to just re-run the call.
- **Ensemble:** each click fires **3 parallel AI calls**, scores each response (length-band fit, no duplicates, meaningful rewrite), and applies the best one. Matches the bank-page ensemble pattern.
- **Preserves inline styling.** The iframe walks down to the deepest text-bearing leaf (skipping gold-bullet sibling cells), so the gold dots and inline colours survive a regen.
- **Works on any newsletter** — English-only or with full translations.
- Both buttons are disabled when no AI key is set in Config (with a tooltip).

The existing **Undo** button rolls back any regeneration.

Spec: [docs/superpowers/specs/2026-05-23-editor-regenerate-selection-design.md](docs/superpowers/specs/2026-05-23-editor-regenerate-selection-design.md).

---

## 5. New feature: Tiered template picker

The home picker shows only the three production-ready templates by default:

- **Corporate Alert** (`poster`)
- **bankpage1_static**
- **bankpage1_dynamic**

Every other template is tucked behind a collapsible *"Beta / In development"* group. Each `TEMPLATE_CATALOG` entry carries `status: 'ready' | 'beta'`.

---

## 6. Where to add things

| Task | Where |
|---|---|
| New template | `App.NewsletterBuilder.registerTemplate(id, fn)` call in the right sibling file under `js/newsletter/` — shared visuals via `App.NewsletterBuilder._components` |
| New AI prompt | Add to `js/ai/prompts.js` (`window.AIPrompts`) and destructure in the main file |
| New local fallback content | `js/ai/local_fallbacks.js` (`window.AILocalFallbacks`) |
| New editor action | `js/editor.js` parent-side, or `js/editor/iframe_script.js` if it must run inside the iframe |
| New UI feature block | New sibling file under `js/ui/`; expose helpers on `App.UI._internals` first |

---

## 7. Tier 4 (2026-05-23) — Per-template folders + universal AI logging + two more splits

### Per-template folders

Every template in `TEMPLATE_CATALOG` now has its own folder under `templates/<template-id>/`. Each holds two subfolders:

- `design/` — images (AI-generated or pulled), reference mocks (HTML/PNG/SVG), visual snippets. A 1-line README ships in each so the empty folder survives a zip.
- `ensemble-logs/` — per-template AI prompt+response logs, fills up as builds happen.

There's also a pseudo-template folder `templates/_article-curation/ensemble-logs/` for the upstream per-article summarisation AI logs (those aren't tied to any single template).

When the future agentic pipeline produces a brand-new template, it just picks an ID, creates `templates/<new-id>/design/` for its generated imagery, and ensemble-logs auto-fill as the AI calls run.

### Universal AI logging — `App.AILogger` (new `js/ai/logger.js`)

Every AI content/text-generation call across the app now logs its **prompt + response** as one plain-text file per call. Logs land in two places at once:

1. The canonical project-root `ensemble-logs/<session>/<name>` — **unchanged path, unchanged filenames** (the bank-page ensemble's 9 fixed names are byte-identical to before, so any tool reading those keeps working).
2. A mirror copy inside `templates/<template-id>/ensemble-logs/<session>/<name>` whenever the build is tagged with a template id.

The logger has three pieces:

- `App.AILogger.beginBuild({ templateId })` — call this before starting a template build. Returns a session ID and stores `templateId` as module-level state.
- `App.AILogger.endBuild()` — always called in a `finally` block. Clears state so a later unmanaged call doesn't accidentally tag the wrong template.
- `App.AILogger.log({ name, prompt, response })` — every AI call point in `js/ai_summarizer.js` and `js/ai/bank_page_ensemble.js` calls this. The payload composes prompt + response into one text file (separated by `=== PROMPT ===` / `=== RESPONSE ===` headers).

Call sites instrumented:

- `callTemplateSlotsAI` (covers Do/Don't, Spotlight, Corporate Alert via per-call `logName` opts)
- `aiFillBankPageSlots` + `validateArticleCoherence` (bank-page ensemble — preserves the 9 canonical filenames)
- `regenerateSelection` (editor regen — 3 attempts named `regen_0.txt`/`regen_1.txt`/`regen_2.txt`)
- `summarizeArticle` (per-article core + watchouts calls — tagged into `_article-curation`)
- `fetchNewsletterChromeMessage` (newsletter chrome — `chrome_frame.txt`, `chrome_takeaways.txt`)

Build orchestrators wrap their phases:

- `js/ui/generate_pipeline.js` → `beginBuild({ templateId: state.selectedFormat })` around the AI section of `buildAndPreview`.
- `js/editor.js` → `beginBuild({ templateId: _opts.templateId })` around the regen ensemble.
- `js/ui_controller.js` (article load) → `beginBuild({ templateId: '_article-curation' })` around the `summarizeAll` call.

### Server-side mirror

`scripts/ensemble_log_server.mjs` now reads an optional `template_id` field from each POST payload. If present and `templates/<template_id>/ensemble-logs/` exists (or can be created), the same file is written there in addition to the canonical path. Missing `template_id` → server silently behaves exactly like before. The `ENSEMBLE_LOG_URL` constant (`http://127.0.0.1:4175/save`) is untouched.

### Two more file splits

| Module family | Main file (was → now) | New sibling |
|---|---|---|
| **AI** | `js/ai_summarizer.js` (~2080 → **~1700**) | `js/ai/prompt_builders.js` (~260 lines) — all 10 bank-page prompt-construction functions |
| **UI** | `js/ui_controller.js` (~2580 → **~2440**) | `js/ui/sidebar_manager.js` (~170 lines) — sidebar feed list + keyword chip manager + add/remove custom feed source |

Both follow the existing `_state` + `_internals` sibling pattern. Main keeps thin wrappers for any function the HTML still calls by name on `App.UI.*`. Sidebar still works because main re-exports the wrappers; bank-page ensemble still works because `_internals` exposes the builders via live getters that proxy to `App.AIPromptBuilders`.

### Script load order (5 new tags across 6 HTML pages)

```
js/ai/prompts.js
js/ai/local_fallbacks.js
js/ai/logger.js              ← NEW (loaded first in ai family — main + ensemble depend on it)
js/ai_summarizer.js
js/ai/prompt_builders.js     ← NEW (after main)
js/ai/bank_page_ensemble.js
...
js/ui_controller.js
js/ui/translation.js
js/ui/ai_experiment.js
js/ui/generate_pipeline.js
js/ui/sidebar_manager.js     ← NEW (last in ui family)
```

### Seam tests

5 new tests in `tests/unit/seam-contracts.test.js` (total 12 → 17):

- `App.AIPromptBuilders exposes the prompt-builder surface`
- `App.AILogger exposes beginBuild/endBuild/log and ENSEMBLE_LOG_URL unchanged`
- `AILogger.log POST payload carries template_id only while a build is active`
- `Bank-page ensemble routes its 9 log POSTs through App.AILogger and preserves the canonical filenames`
- `App.UISidebar exposes sidebar surface + App.UI wrappers in main still delegate`

---

## 8. What's still on the roadmap (not started)

**Agentic template-generation pipeline.** User uploads an HTML or PNG reference → pipeline classifies regions → palette-swaps to the project's black/gold/cream → sources topic-relevant imagery → AI-fills the text → registers a fresh template into the catalog. Detailed plan to be written when you're ready to start. The Tier 4 per-template folder layout + universal AI logging are the groundwork for this — a brand-new template's design and logs will live in its own folder from day one.
