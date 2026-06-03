# Documentation Index

All documentation for the awareness newsletter app. This folder is included in any zip of the project — recipients see the full doc tree in VS Code.

## Reference docs (in this folder)

- [CONTEXT.md](CONTEXT.md) — runtime architecture, module responsibilities, data flow, IndexedDB schema, sensitive storage keys. The authoritative companion to `CLAUDE.md` for understanding what each piece does.
- [foundation_ux_contract.md](foundation_ux_contract.md) — hard contract for page navigation, flow steps, route guards, and the shared state-card API. Every major page must conform.
- [TESTING.md](TESTING.md) — local commands, deterministic vs. live checks, manual QA checklist.
- [TEMPLATE_ONBOARDING.md](TEMPLATE_ONBOARDING.md) — step-by-step guide for adding a new newsletter template (either path A: independent template, or path B: phishing-brief sibling).
- [baseline-critical-path-audit.md](baseline-critical-path-audit.md) — definition of the baseline audit's critical-path checks, plus the `blocked` vs `fail` semantics used by `npm run audit:baseline`.

## Plans and specs (`superpowers/`)

- [superpowers/plans/](superpowers/plans/) — implementation plans for major changes:
  - `restructure-newsletter-builder-and-ui-controller.md` — the five-phase restructure that produced the current `js/newsletter/`, `js/ui/`, and `js/ai/` sibling-file layout.
  - `system_summary.md` — earlier compact reference snapshot of the system (now largely superseded by `CONTEXT.md`).
  - `prompt_for_banktemplate.md`, `shift_multiselect_editor.md` — feature-specific design notes.
- [superpowers/specs/](superpowers/specs/) — design specs (currently: the 20-templates spec).

## Agent-discovery files (live at repo root, not here)

These four stay at the repo root because tools auto-discover them:

- `../CLAUDE.md` — Claude Code automatically loads this on session start. Project rules, architecture pointers, safety constraints.
- `../AGENTS.md` — Codex and other agent platforms auto-discover this. Defines the multi-agent workflow and local quality gate.
- `../README.md` — GitHub renders this on the repository home; conventional landing page.
- `../MEMORY.md` — durable project goals, recurring cautions, latest verification snapshot. Referenced by `CLAUDE.md` as authoritative.

## How to use this folder

- **Reading docs:** open any `.md` file in VS Code. Right-click → "Open Preview" for rendered Markdown.
- **Adding a doc:** put new reference docs here (`docs/`); new implementation plans go in `superpowers/plans/<topic>.md` per the team preference.
- **Updating a doc:** if you change a path or rename a file, grep the repo for old references and update them — markdown links are not auto-checked.
