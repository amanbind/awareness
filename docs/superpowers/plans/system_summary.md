# Awareness Newsletter — Compact System Summary (for restructuring)

A reference snapshot of how the system works today. Read top-to-bottom to understand what each piece does and where it lives, then decide what to restructure.

---

## 1. Product, in one paragraph

A static vanilla-JS, no-backend, multi-page browser app that fetches security news RSS feeds, lets the user curate articles, generates branded newsletter HTML (one of ~23 templates), translates it into many languages, lets the user edit it visually in a sandboxed iframe, then optionally sends via SMTP. Distribution = zip the folder and the recipient runs `npm run serve`. **Everything must live inside the `awareness/` folder** (including `node_modules`) so the zip is self-contained.

---

## 2. Pages (HTML entrypoints at repo root)

| Page | Role | Flow step |
|---|---|---|
| `index.html` | **Home** — fetch, curate, template select, generate | fetch |
| `keywords.html` | Allow/block keyword editor | curate |
| `curation-lab.html` | Single-article prompt inspector + template preview | curate |
| `preview.html` | Per-language preview, save versioned project | preview |
| `editor.html` | Visual WYSIWYG editor in sandboxed iframe | edit |
| `projects.html` | Project list / restore | approve |
| `send.html` | SMTP profile, test send, send, delivery log | send |
| `config.html` | Org / AI / feed-source central settings | curate |
| `builder.html` | Legacy redirect → `index.html#section-home` | n/a |

**Every page calls** `App.UXContract.init({ pageId, flowStepId, guard? })` from [js/ux_contract.js](../../../js/ux_contract.js) which injects the sticky global menu and flow stepper. Pages that require a workspace (`preview`, `editor`, `send`) enforce the same route guard.

---

## 3. JS modules (all attach to `window.App.*`, no bundler — HTML script order matters)

| Module | File | Surface | Responsibility |
|---|---|---|---|
| UXContract | `js/ux_contract.js` | `App.UXContract` | Global menu, flow stepper, route guards, state cards |
| DB | `js/db.js` | `App.DB` | IndexedDB CRUD for articles/projects/drafts/SMTP/logs |
| RouterNav | `js/router_nav.js` | `App.RouterNav` | Cross-page handoff via `localStorage` |
| RSS | `js/rss_fetcher.js` | (calls into App.DB) | Feed fetch via CORS proxies, parse, classify, dedupe |
| KeywordStore | `js/keyword_store.js` | `App.KeywordStore` | Allow/block keyword persistence |
| ProjectStore | `js/project_store.js` | `App.ProjectStore` | Project CRUD + version snapshots |
| NewsletterBuilder | `js/newsletter_builder.js` | `App.NewsletterBuilder` | Build HTML from `{{TOKEN}}` templates; `TEMPLATE_CATALOG` |
| AISummarizer | `js/ai_summarizer.js` | `App.AISummarizer` | All Claude/OpenAI calls + ensemble bank-page fill |
| UI | `js/ui_controller.js` | `App.UI` | **Master orchestration** of home/build workflow — broad and regression-prone |
| Editor | `js/editor.js` | `App.Editor` | Iframe WYSIWYG editor + postMessage protocol |
| ResponsiveLayout | `js/responsive_layout.js` | `App.ResponsiveLayout` | Viewport tier metadata |

---

## 4. Data flow (one Generate cycle)

```
RSS proxies → rss_fetcher → IndexedDB(articles)
                              │
                              ▼
                       state.allArticles  (state in ui_controller)
                              │  (filter by date chip + keyword search)
                              ▼
                user selects → selectedArticleIndices
                              │
                              ▼  buildAndPreview() in ui_controller
            ┌─────────────────┴─────────────────┐
            │                                   │
   AISummarizer.newsletterChrome     AISummarizer.fillNewsletterTextSlots
   (chrome: title/subtitle/dateline)  → for bank-page: aiFillBankPageSlots
                                         (9 parallel calls: 1 combined + 4 sections × 2 prompts)
            └─────────────────┬─────────────────┘
                              ▼
                       cfg = { …getConfig(), …getMetadata(), …nlChrome, …textSlots }
                              ▼
              NewsletterBuilder.build(format, cfg, arts, opts)
                              ▼
                       English HTML in workspace.variants.en
                              ▼  (if NOT english-only)
                 translateWorkspaceFromEnglish()
                              ▼
                  translateHtmlAIFirst(html, lang) per non-EN lang
                              ▼
                  workspace.variants[lang].html populated
                              ▼
                       persistWorkspace() → localStorage
```

**Workspace key in localStorage**: `awareness_newsletter_workspace_v1`. Cross-page handoff: `awareness_nav_handoff_v1`.

---

## 5. Templates (newsletter_builder.js)

- Each template is a JS function `buildX(c, arts, wo, lk, poster, qr, illus)` returning an HTML string with `{{TOKEN}}` placeholders.
- Tokens are filled from `arts[]` (article titles/summaries) and AI overrides in `cfg.nlBankPage*`, then HTML-escaped via the `for (const k of Object.keys(tokens))` substitution loop.
- `TEMPLATE_CATALOG` registers each template under an id (e.g. `phishingbrief`, `bankpage1_dynamic`, `bankpage1_static`, `do_vs_dont`, etc. — ~23 total).
- The three **bank-page templates** share an 11-token contract (`INTRO` + `SECTION{1..7}_BULLET{1..N}`) and `bankpage1_dynamic` adds 4 card tokens (`CARD{1,2}_HEADING`, `CARD{1,2}_URL`, recently extended with `CARD{1,2}_SOURCE`).
- Visual reference HTML lives in `templates/imported-standalone/`; `scripts/normalize-imported-templates.mjs` emits `templates/imported-email-safe/` sanitized copies for Outlook compatibility.
- Onboarding a new template: see [TEMPLATE_ONBOARDING.md](../../TEMPLATE_ONBOARDING.md).

### Bank-page section layout (after recent additions)

1. INTRO paragraph
2. **How to spot** (SECTION1) — 4 bullets, AI: `nlBankPageRedFlags`
3. **What you should remember** (SECTION2) — 3 bullets, AI: `nlBankPageRemember`
4. **Impact on our organisation** (SECTION4) — 3 bullets, AI: `nlBankPageImpactOrg`
5. **Next Steps (If Affected)** (SECTION5) — 3 bullets, AI: `nlBankPageNextSteps`
6. **Impact** (SECTION6) — 3 bullets, AI: `nlBankPageImpactGeneral`
7. **What you should remember** (fresh, SECTION7) — 3 bullets, AI: `nlBankPageRememberFresh`
8. **Stay safe** (SECTION3) — 3 bullets, AI: `nlBankPageStaySafe`
9. **Global insights** pill + 2 article cards (only in `bankpage1_dynamic`)
10. "Don't Click / Don't Reply / Report It" panel
11. Security Awareness Portal block (uses `c.title || c.pname`)
12. **Frequency strap** (was "Monthly Bulletin", now `${c.freq} Bulletin`)

### AI ensemble flow inside aiFillBankPageSlots

`aiFillBankPageSlots(articles, mode)` fires **9 parallel `Promise.all`** calls:
1. One combined prompt covering the whole page
2. Four dedicated per-section prompts: Impact-Org, Next-Steps, Impact-General, Remember-Fresh
3. (Older trio retained: Red Flags, Remember, Stay Safe)

Each section prompt has a **STEP 1 (identify threat type)** + **STEP 2 (write specific)** + **SWAP TEST** structure. All AI responses are scored by deterministic heuristics; the best per-section is merged into the cfg object.

Raw model responses are written to `ensemble-logs/` (gitignored) via the log server.

---

## 6. Editor (js/editor.js)

- The right-hand property panel lives in the parent window; the canvas is a **sandboxed iframe** populated via `srcdoc`.
- Communication = `postMessage` with `{ _nlEd: true, cmd, v }`.
- Selection model:
  - `_sel`: most recently clicked element (primary).
  - `_selSet: Set<Element>`: full multi-select set (unlimited).
  - Shift-click adds/removes from `_selSet`; double-click collapses to single and enters text-edit.
- Multi-select rules tabulated in [shift_multiselect_editor.md](shift_multiselect_editor.md).
- **Remove** and **Remove in all languages** iterate `_selSet`; everything else (property panel, drag, undo) operates on `_sel` only.
- For multi-language delete: `getDomPaths` returns an array of `{ path, relPath }` and the parent walks each language variant deleting in DESCENDING order to avoid path-index shifts.
- Bullet-row "wrap" helper: `findBulletWrapper` recognises only **genuine 2-cell bullet rows** (one cell = single gold-dot div, other cell = text) — prevents the historic "delete heading wipes whole section" bug.
- **Selection-aware formatting** (recent): `getActiveRangeInside` + `wrapRangeWithStyle` helpers let B/I/U/Color/Size apply to highlighted text inside an element, wrapping it in a `<span style="…">`. Falls back to whole-element styling when no text is highlighted. Alignment + background stay element-level.

---

## 7. Translation

- `translateWorkspaceFromEnglish` in `js/ui_controller.js` feeds the **entire rendered English HTML** through `translateHtmlAIFirst(html, lang)` once per non-EN language.
- HTML-level translation → all template-emitted strings (section headings, bullets, button labels, source line, freq strap) are auto-translated.
- One round trip per language; the four new bank-page sections need no extra translation wiring.

---

## 8. IndexedDB schema (`SecurityAwareness` v4)

Stores: `articles`, `meta`, `drafts`, `projects`, `smtpProfiles`, `deliveryLogs`.

- Articles are dedup'd by URL hash; `saveArticles` is **add-only** (no deletion).
- Articles invisible in the list = either filtered by date-chip / search, or on a different origin (IndexedDB is per-origin: `127.0.0.1:4173` ≠ `127.0.0.1:3000` ≠ `file://`).

Sensitive `localStorage` keys to never log/commit:
`awareness_newsletter_workspace_v1`, `awareness_nav_handoff_v1`, `awareness_smtp_profile_v1`, `awareness_ai_settings_v1`, `awareness_central_config_v1`.

---

## 9. Local commands

```bash
npm install                             # one-time
npm run serve                           # static (4173) + ensemble-log server (4175) in one Node process
npm run lint
npm run test:unit
npm run test:e2e                        # Playwright, auto-starts serve
npm run audit:baseline                  # live RSS + AI smoke; `blocked` ≠ `fail`
npm run verify                          # full local gate
npm run templates:normalize-imports     # regenerate email-safe templates
```

Combined dev server: [scripts/dev_servers.mjs](../../../scripts/dev_servers.mjs) (only Node built-ins, so `node_modules` is not strictly required at runtime but is shipped in the zip for zero-friction recipients).

---

## 10. Cross-cutting rules (load-bearing)

- **No build step.** Edit JS/HTML, refresh browser, done.
- **HTML script order is a runtime contract** — don't reorder without checking dependents.
- **`js/ui_controller.js` is broad** — prefer small test-backed fixes over refactors.
- **Test-first** for behavior changes (see AGENTS.md). Deterministic E2E must not depend on live RSS/AI.
- **Empty-fetch / empty-DB fallback** paths in curate/build are deliberate — preserve them.
- **Zip portability**: everything inside `awareness/`. Plans go in `docs/superpowers/plans/<topic>.md`.

---

## 11. Recent changes (last working session, on top of the above)

- `c.title` (Newsletter Title) now drives the portal card title in all 3 bank-page templates; literal-string fallback removed → empty config = empty title.
- "Monthly Bulletin" strap replaced by `${c.freq} Bulletin` in all 3 bank-page templates.
- Article cards in `bankpage1_dynamic` now show `Source: {{SOURCE}}` between heading and Read article.
- Editor: selection-aware B/I/U/Color/Size — wraps highlighted text in a `<span>` when there's a non-collapsed selection inside `_sel`.
- Big ✕ close button added top-center of both `#tpl-preview-modal` and `#preview-panel` (currently gold-tinted, translucent, 40px).

That's the system. Restructure away.
