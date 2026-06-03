# Foundation UX Contract

This contract defines universal navigation, workflow progression, route guard behavior, and state patterns for all major pages:

- `index.html` (primary **Home** page: feed fetch, curation, and newsletter generation; workflow anchor `#section-home`)
- `builder.html` (redirect only; lands on `index.html#section-home`; `#section-builder` is accepted as a legacy alias)
- `keywords.html`
- `preview.html`
- `editor.html`
- `send.html`
- `projects.html`
- `curation-lab.html` (prompt inspection and single-article curation + template preview; no translation)
- `config.html`

## 1) Universal Menu Contract

- A sticky global shell is rendered at the top of every major page.
- The shell includes one-click links to all major pages.
- The active page is visually highlighted.
- Navigation labels are stable and consistent: `Home`, `Keywords`, `Curation lab`, `Preview`, `Editor`, `Send`, `Projects`, `Config`. **Home** targets `index.html` and clears **`projectId` / `projectSnapshotVersion` / `activeDraftId`** from the nav handoff so the compose page does not auto-reopen a project preview from a previous hop. **Projects → Open** loads the selected project on `preview.html` (handoff `projectId`, optional `projectSnapshotVersion` from the per-project version dropdown); other toolbars may still deep-link to `index.html#section-home` for compose.

Implementation: `js/ux_contract.js` (`App.UXContract.init`).

## 2) Primary Flow Stepper Contract

- A single flow is used across pages: `Fetch -> Curate -> Build -> Preview -> Edit -> Approve -> Send`.
- The stepper appears in the same global shell on every major page.
- Pages map to one active flow step:
  - `index`: `fetch` (template selection, article sourcing, and generation also live here)
  - `keywords`: `curate`
  - `curation-lab`: `curate`
  - `preview`: `preview`
  - `editor`: `edit`
  - `projects`: `approve`
  - `send`: `send`
  - `config`: `curate`
- Steps before the active step render as completed, current step renders as active.

## 3) Route Guard Contract

- Pages that require an existing workspace enforce the same guard logic.
- Required pages: `preview`, `editor`, `send`.
- Guard condition: `awareness_newsletter_workspace_v1` must exist and include variants, **or** the navigation handoff (`RouterNav`) includes a `projectId` so `App.UI` can hydrate the workspace from IndexedDB on init.
- Optional handoff `projectSnapshotVersion` (integer): load a specific saved snapshot from `project.snapshots` instead of the live `languageVariants` row (used from **Projects** version dropdown and preserved across Preview/Editor/Send when set).
- On guard failure:
  - a reusable guard panel appears with a clear reason,
  - recovery actions are provided (`Projects`, `Home`),
  - users are never left on a dead-end state.

## 4) State Pattern Contract

- Reusable state card utility exists for predictable UI states:
  - `loading`
  - `empty/default`
  - `error`
- Utility API: `App.UXContract.renderStateCard(containerId, variant, title, message)`.
- Cards share consistent visual semantics and can be used by all pages/features.

## 5) Integration Rule

Every major page must:

1. Load `js/ux_contract.js`.
2. Call `App.UXContract.init({ pageId, flowStepId, guard? })` before page-level UI init.
3. Use shared route guards and state patterns rather than ad hoc copies.
