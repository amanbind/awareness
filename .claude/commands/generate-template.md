---
description: Run the full Template Generation pipeline on a reference file in templates/reference/. Replicates → palette-maps → onboards into the Beta > Testing sub-group, all in one shot.
---

# /generate-template — One-command Template Generation pipeline

**Argument:** `$ARGUMENTS` = the reference filename inside `templates/reference/`, e.g. `team_briefing.html` or `it_alert.png`.

If the user invoked the command with no arguments, list the files in `templates/reference/` (excluding `README.md`, `replica_*.html`, `preview_gen_*.html`, the `images/` folder) and ask which one to convert. Do not proceed until you have a filename.

## What this command does

Runs the three-stage Template Generation pipeline end-to-end **with no intermediate `/approve` gate**. The final template is onboarded with `status: 'testing'` so it lands in the **Beta > Testing** collapsible sub-group on the home picker, ready to inspect at `http://127.0.0.1:4173`.

The three stages are independent subagents under `.claude/agents/`:
1. `awareness-replicator` — faithful HTML replica preserving the reference's original colours and fonts
2. `awareness-palette-converter` — gold/black/white palette + Arial/Georgia fonts + email-safe table HTML + `{{TOKEN}}` placeholders
3. `awareness-onboarder` — patches catalog/registry/thumbnail/tests, scaffolds `templates/gen_<slug>/`, runs `npm run lint && npm run test:unit`

## Execution

You are the **pipeline coordinator**. Execute these steps in order. Do not skip steps. Do not parallelise — each stage's output feeds the next.

### Step 1 — Sanity check

- Verify `templates/reference/$ARGUMENTS` exists (use `Bash: test -f "templates/reference/$ARGUMENTS" && echo OK`).
- If missing, stop and report. Suggest listing `templates/reference/` so the user can confirm the filename.

### Step 2 — Compute the slug

`slug = filename (without extension), lowercased, every non-alphanumeric run collapsed to a single underscore, trimmed of leading/trailing underscores.`

Examples:
- `Team Briefing.html` → `team_briefing`
- `IT-Alert v2.png` → `it_alert_v2`
- `Phishing Brief (ABC).html` → `phishing_brief_abc`

State the computed slug to the user before starting stage 1 so they can correct it if it looks wrong.

### Step 3 — Stage 1: Replicator

Dispatch the `awareness-replicator` subagent (via the `Agent` tool, `subagent_type: "awareness-replicator"`). Prompt:

```
Replicate the reference at templates/reference/$ARGUMENTS.

This is stage 1 of the /generate-template pipeline. Compute the slug, write
templates/reference/replica_<slug>.html, and report back per your spec.

Stay inside templates/reference/. Do not touch js/ or tests/.
```

When the agent returns, verify `templates/reference/replica_<slug>.html` exists. If it doesn't, stop the pipeline and surface the agent's report. Otherwise proceed.

### Step 4 — Stage 2: Palette converter

Dispatch the `awareness-palette-converter` subagent. Prompt:

```
Convert palette and apply email-safe rules for slug "<slug>".

This is stage 2 of the /generate-template pipeline. Read
templates/reference/replica_<slug>.html and write
templates/reference/preview_gen_<slug>.html with palette mapped to gold/black/white,
fonts mapped to Arial/Georgia, email-safe table HTML, and the 11-token contract embedded.

Report back per your spec.
```

When the agent returns, verify `templates/reference/preview_gen_<slug>.html` exists. If not, stop and surface the report. Otherwise proceed.

### Step 5 — Stage 3: Onboarder (auto-approved)

Dispatch the `awareness-onboarder` subagent. Prompt:

```
/approve gen_<slug>  —  pipeline auto-approval from /generate-template.

This is stage 3 of the /generate-template pipeline. Read
templates/reference/preview_gen_<slug>.html and integrate it into the production
catalog/registry/thumbnail/tests, scaffold templates/gen_<slug>/, and run the
quality gate.

The catalog row MUST use status: 'testing' (not 'beta') so the new template lands
in the Beta > Testing sub-group on the home picker.

Report back per your spec.
```

When the agent returns, capture its report (file paths, line counts, quality-gate result).

### Step 6 — Report

Produce a single consolidated summary to the user:

```
✓ /generate-template gen_<slug> complete

Reference:  templates/reference/$ARGUMENTS
Replica:    templates/reference/replica_<slug>.html
Preview:    templates/reference/preview_gen_<slug>.html

Onboarded into:
  - js/newsletter/core_templates.js  (buildGen<PascalSlug> + registerTemplate)
  - js/newsletter_builder.js          (TEMPLATE_CATALOG row, status: 'testing')
  - js/graphics_engine.js             (FORMAT_THUMBS entry)
  - tests/unit/app-modules.test.js    (catalog.length bumped to <N+1>)
  - templates/gen_<slug>/{design,ensemble-logs}/   (scaffolded)

Quality gate:
  - npm run lint:      <PASS/FAIL>
  - npm run test:unit: <PASS/FAIL>

The new template appears under Beta > Testing on the home picker.
To inspect: npm run serve → http://127.0.0.1:4173 → expand Beta → expand Testing.
```

## Failure handling

- If any subagent reports a failure or doesn't produce its output artifact, stop the pipeline immediately and surface the report. Do not advance to the next stage.
- Do not auto-revert partial state. Surface what was done and what remains so the user can decide.
- If stage 3 succeeds but the quality gate (lint / unit tests) fails, the onboarder is expected to have already retried and reported the root cause. Surface that — do not attempt to fix it yourself.

## Safety

- This command bypasses the manual `/approve gen_<slug>` review gate. Use it when the user trusts the pipeline to produce a usable starting point. They can still inspect the preview file after the run and request changes for the next iteration.
- Never invoke this command on a reference file outside `templates/reference/`.
- Never commit. The user owns the commit decision.
