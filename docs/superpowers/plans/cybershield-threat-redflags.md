# Plan: Make Phishing Maestro's "What's the threat?" + "Recognizing Security Threats" article-driven

## Context

Phishing Maestro (`gen_cybershield`, built by `buildGenCybershield` in
`js/newsletter/core_templates.js`) previously AI-drove **only** the "Why it
matters" impact paragraph (`nlCybershieldImpact`). Two other sections shipped as
**hardcoded static copy**:
- **"What's the threat?"** — a fixed paragraph.
- **"Recognizing Security Threats"** — a fixed 4-item numbered list.

The user asked for both to be populated from the **picked articles "as in other
templates"** (AI when a key is set, local fallback otherwise). Confirmed scope:
- **AI + local fallback** for both (matches Why-it-matters / Chase precautions / Spotlight).
- **Recognizing list stays exactly 4 items**, each indicator adapting to the
  picked articles' threat types, **padded with the existing generic phishing
  indicators** to always fill 4.
- **"Why it matters" left unchanged** (impact path untouched) and **stat tiles static**.

## Implementation (done)

### `js/ai_summarizer.js`
- Added `CYBERSHIELD_THREAT_DEFAULT`, `CYBERSHIELD_REDFLAG_DEFAULTS`, and a
  `CYBERSHIELD_SPOT_BY_ID` map (recognition indicator per `CHASE_ATTACK_PROFILES`
  id — chosen over editing the aligned profiles array; additive and lower-risk).
- `localCybershieldThreat(articles)` — overview naming up to 3 `ranked` threat
  labels from `detectChaseAttacksPerArticle`; default sentence when nothing detected.
- `localCybershieldRedFlags(articles)` — primary-per-article `spot`, then ranked,
  then pad with `CYBERSHIELD_REDFLAG_DEFAULTS`; dedup, slice to exactly 4.
- `buildCybershieldThreatRedFlagsUserPrompt` + `aiFillCybershieldThreatRedFlags`
  — one AI call returning `{ nlCybershieldThreat, nlCybershieldRedFlags[4] }`,
  sanitize + clamp to 4, local fallback on failure. `logName: 'cybershield_threat_redflags.txt'`.
- Extended the `gen_cybershield` branch of `fillNewsletterTextSlots`: impact stays
  produced exactly as before; threat + red-flags run alongside (`Promise.all` when AI on).
- Exported `localCybershieldThreat`, `localCybershieldRedFlags`.

### `js/newsletter/core_templates.js` (`buildGenCybershield`)
- Computed `threatSummary` (from `c.nlCybershieldThreat` or default) and
  `redFlagsRowsHtml` from `pickUniqueSlotLines(c.nlCybershieldRedFlags, DEFAULT_REDFLAGS, 4)`
  (reused the shared `NB._components` helper), reusing the existing gold `01`-badge row markup.
- Replaced the static paragraph with `${escapeHtml(threatSummary)}` and the 4 static
  rows with `${redFlagsRowsHtml}`. `IMPACT_SUMMARY` + the 3 stat tiles untouched.
  Header comment updated.

Pipeline auto-wires the result (`fillNewsletterTextSlots` → merged into `cfg` in
`js/ui/generate_pipeline.js`, under `AILogger.beginBuild({ templateId })`).

## Verification

- **Unit** — `tests/unit/cybershield-slots.test.js`: dispatcher local path returns
  `nlCybershieldThreat` + `nlCybershieldRedFlags` (len 4) + unchanged
  `nlCybershieldImpact`; article-adaptive (smishing); empty set → 4 defaults +
  default overview; `build('gen_cybershield', cfg)` renders provided slots and keeps
  impact + stat tiles; empty cfg → default indicators + overview.
- **Gate**: `npm run lint` (0 errors), `npm run test:unit` (incl. app-modules
  "build dispatches every catalog id" — no fallback).
- **Manual**: `npm run serve` → build Phishing Maestro with mixed article types,
  AI on/off → both sections adapt, Why-it-matters + tiles unchanged, numbered
  badges render (Outlook-safe). AI on → confirm
  `templates/gen_cybershield/ensemble-logs/<session>/cybershield_threat_redflags.txt`.

## Notes

- Cybershield now makes two AI calls (impact + threat/redflags), run in parallel;
  impact path byte-for-byte unchanged.
- Red-flag rows are raw HTML but every item's text is `escapeHtml`-escaped.
- The default threat paragraph drops the gold-italic emphasis on "spear phishing"
  (the paragraph is now dynamic plain text); shows only when no articles/slot.
