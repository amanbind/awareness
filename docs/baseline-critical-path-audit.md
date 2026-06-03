# Baseline Critical-Path Audit

Date: 2026-04-29  
Environment: local static serve at `http://127.0.0.1:4173`  
Execution method: automated browser run via Playwright (`npm run audit:baseline`)

## Test Matrix (Executed)

| ID | Path | Result | Evidence |
|---|---|---|---|
| CP-01 | Fetch feeds -> progress/status -> article render (`index.html`) | **Pass** | Fetch completed with `39` articles ready while individual upstream proxy/feed errors were captured |
| CP-02 | Curate/select -> Generate newsletter (`index.html`) | **Pass** | `39` cards available from DB/live state; selected card generated visible preview and newsletter output |
| CP-03 | Edit flow page load (`editor.html`) | **Pass** | Editor page rendered, heading present, editor iframe present |
| CP-04 | Send flow page load + send actions (`send.html`) | **Pass** | SMTP fields and send buttons rendered; delivery log updated after send actions |
| CP-05 | Route/page handoff smoke (`projects.html`, `keywords.html`) | **Pass** | Both pages loaded with expected core controls present |
| CP-06 | Date sort control (`index.html`) | **Pass** | Sort changed the first visible card date from `29 Apr 2026` to `23 Apr 2026`; `5` distinct visible dates observed |
| CP-07 | Keyword search/suggest/delete (`keywords.html`) | **Pass** | Suggestions rendered, injected keyword was searchable, reset restored defaults |
| CP-08 | Config feed source and persistence (`config.html` -> `index.html`) | **Pass** | Custom source add/delete path worked and org config propagated to Home |

## Defect Log

### 1) [closed] Feed fetch path failed to produce usable article set

- **Area:** `index.html` + `js/rss_fetcher.js` feed ingestion chain
- **Severity rationale:** Blocks the first critical workflow stage (fetch), which blocks curate/build downstream.
- **Reproduction:**
  1. Start local app and open `index.html`.
  2. Click `Fetch Live News`.
  3. Wait 20+ seconds.
  4. Observe status remains in fetching state and no article cards are rendered.
- **Expected:** At least some feeds should resolve (or resilient fallback should still provide usable articles), with article cards shown and fetch phase completed.
- **Current result:** Cards render and the flow continues. Live upstream/proxy errors are still captured as environmental evidence, but they no longer block the workflow.
- **Evidence source:** `baseline-critical-path-audit-results.json` (`index-load-and-fetch` check and captured console errors).

### 2) [closed] Curate/build path had no recoverable baseline when feed set is empty

- **Area:** `index.html` curate/build flow (`App.UI.buildAndPreview()` entry path)
- **Severity rationale:** Core flow cannot continue once fetch returns no usable articles; no baseline content path is available in this run.
- **Reproduction:**
  1. Run CP-01 and reach state with zero fetched articles.
  2. Attempt curate/build flow using `Load from DB` and `Generate Newsletter`.
  3. Observe there are no selectable cards and no preview/output generated.
- **Expected:** Either (a) persisted fallback articles are available, or (b) clear recoverable guidance is provided to unblock build.
- **Current result:** `Load from DB` and empty feed paths can use baseline fallback articles, render cards, and generate newsletter output.
- **Evidence source:** `baseline-critical-path-audit-results.json` (`curate-select-build-flow` check) plus deterministic E2E tests in `tests/e2e/critical-flow.spec.js`.

### 3) [closed] Date sort audit previously lacked distinct visible dates

- **Area:** `index.html` date sort control.
- **Severity rationale:** The control is present, but the baseline audit cannot prove a visible reorder when all currently visible article dates render identically.
- **Expected:** At least two visible cards with distinct dates, or a fixture-backed deterministic assertion.
- **Current result:** The audit saw `5` distinct visible dates and verified the first visible date changed after selecting oldest-first sorting.
- **Evidence source:** `baseline-critical-path-audit-results.json` (`date-sort-control` check).

## Notes

- Deterministic E2E tests cover mocked feed success, no-article fallback, empty DB fallback, keyword UI, config persistence, route guards, projects navigation, and workflow shell behavior.
- Live RSS/proxy errors still appear during audit runs and should be treated as environmental signals unless deterministic fixture tests also fail.
- Date sorting now has both deterministic E2E coverage and live-audit evidence with distinct visible dates.
