# Project Memory

## Durable Goal

Build a smooth, interlinked, locally verifiable newsletter workflow for security awareness teams: configure, fetch, curate, build, edit, approve, send, and export with reliable recovery between pages.

## Stable Product Positioning

Credible sources become people-focused awareness content that is ready to send. The app should stay transparent about what is local, what touches third-party services, and what depends on optional API keys.

## Known History

- `docs/baseline-critical-path-audit.md` previously recorded `CP-01` and `CP-02` as blocked because live feed fetching produced no usable article set.
- The 2026-04-29 local hardening pass closed those blockers with baseline fallback behavior for live fetch and empty DB restore paths.
- The audit runner now treats actual `fail` checks as process failures, while external-data `blocked` checks remain explicit and non-fatal.
- Date sorting has deterministic E2E coverage with distinct fixture dates and current live-audit evidence with distinct visible dates.
- Resolved-product notes that lived in ad hoc markdown files were folded into this memory and baseline audit docs as needed.
- `docs/foundation_ux_contract.md` defines the active flow as `Fetch -> Curate -> Build -> Edit -> Approve -> Send`.
- Backlog themes (SMTP/send reliability, autosave/project restore, page linkage, AI curation, feed performance, templates) remain fair game for issue tracking outside this repo.

## Recurring Cautions

- Do not treat live feed proxy failures as deterministic app failures without checking mocked fixture behavior.
- Do not hide empty article states; users need a recoverable path.
- Preserve the baseline fallback path for empty live fetches and empty IndexedDB restores so curate/build remains usable.
- Do not change page script ordering casually.
- Archived duplicate app trees were removed; only the root static app is maintained here.
- Do not commit browser storage dumps, API keys, SMTP credentials, or real delivery logs.

## Agent Handoff Notes

When an agent finishes work, record:

- Files touched.
- Tests run and exact outcomes.
- Open failures or blocked external services.
- Any new durable lesson that should remain in this file.

Future agents should prefer small test-backed fixes over broad rewrites, especially in `js/ui_controller.js`.

## Latest Local Verification

Last verified with `npm run verify` on 2026-04-29:

- ESLint completed with warnings only.
- Unit tests: 4 passed.
- Deterministic E2E tests: 7 passed.
- Baseline audit completed and wrote `baseline-critical-path-audit-results.json`.
- Baseline audit checks all passed in the latest run, despite live proxy/resource errors being recorded as environmental evidence.

