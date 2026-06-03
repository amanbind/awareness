# Testing And Local QA

## Local Commands

Install dependencies:

```bash
npm install
```

Run the local quality gate:

```bash
npm run verify
```

Current lint policy is conservative: warnings are visible for cleanup, while errors fail the gate.

Individual commands:

```bash
npm run serve
npm run lint
npm run test:unit
npm run test:e2e
npm run audit:baseline
```

The app and browser tests use `http://127.0.0.1:4173`.

## Deterministic Vs Live Checks

Deterministic E2E tests must use fixtures or route mocks. They should verify app behavior even when public RSS proxies are unavailable.

The baseline audit may touch live integrations. If a third-party proxy or upstream feed fails, record that as blocked external behavior rather than rewriting deterministic expectations.

## Manual QA Checklist

Use this checklist before calling a hardening pass complete.

- Home: page loads, global menu renders, flow stepper highlights Fetch, fetch controls are visible; `#section-home` deep-links into the compose workflow (legacy `#section-builder` still works).
- Feed fallback: mocked or fallback articles can render when live feeds are unavailable.
- Curate: article selection respects the configured incident limit.
- Build: Generate Newsletter creates preview/output from selected articles.
- Keywords: allow/block keywords can be added, searched, reset, and persisted.
- Editor: route guard appears without a workspace; editor loads with a valid workspace.
- Send: route guard appears without a workspace; send controls and delivery log UI load with a valid workspace.
- Projects: projects page loads and offers a recovery path into an existing workspace.
- Config: organization settings and custom feed sources persist locally.
- Responsive: core pages remain navigable at mobile, tablet, and desktop widths.
- Export: copy/download/print controls do not throw runtime errors.

## Artifacts

Expected local artifacts may include:

- `baseline-critical-path-audit-results.json`
- Playwright reports under `playwright-report`
- Test results under `test-results`

Only commit generated artifacts when the task explicitly updates audit evidence.

## Current Evidence

The latest local hardening run verified:

- `npm run lint`: exits successfully with existing unused-variable warnings.
- `npm run test:unit`: 4 tests passed.
- `npm run test:e2e`: 7 tests passed.
- `npm run audit:baseline`: completed and refreshed `baseline-critical-path-audit-results.json`.

The baseline audit exits non-zero for any `fail` checks. `blocked` checks remain explicit evidence for external or insufficient-data conditions and should be reviewed before release.

