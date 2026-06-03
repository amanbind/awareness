# Spec — Editor: Regenerate Selection with AI

## Goal

Let the user select one or more elements inside the editor's iframe and re-run the AI call to rewrite them, with an optional custom instruction. Replace the selected text in place, then auto-translate other languages.

## Approved decisions (from brainstorming)

- **AI input:** articles (from current workspace) + optional custom instruction. "Run the call again" mental model — same article context as the original Generate.
- **Multi-select handling:** one combined AI call for the whole selection, with the AI told to return exactly N items in the same order. Bullets stay coherent as a group.
- **Translation:** after English regen completes, auto-translate to all non-English languages (same flow as original Generate).

## Two buttons (v1.1)

The action grid now exposes **two** regen buttons, mirroring the existing Remove / Remove-in-all-languages pattern:

- **Regenerate** — current preview language only. AI is told to write in the language the user is currently viewing (`languageId` passed through to `regenerateSelection`). Other-language variants are untouched.
- **All languages** — AI always writes in English (regardless of current preview); the result is applied to the English variant in workspace, then `App.UITranslation.translateWorkspace({overwrite: true})` fans the new EN content out to every non-EN variant. If the user is previewing in a non-EN language, the iframe is reloaded from the freshly-translated variant so they see the change immediately.

Both buttons are always present and enabled whenever an AI key is set. No language gate.

## Locked defaults for unasked questions

- **Cross-variant edit (all-langs from non-EN preview):** uses `App.Utils.updateNewsletterNodeTextByMirrorPath` against the EN variant in workspace storage. The iframe's `getSelectionTexts` now returns `{idx, text, path, relPath}` per item so the path can be reused against any language variant (DOM structure mirrors across translations).
- **Length contract:** AI must return exactly the same number of items as selections. Length mismatch → that candidate is dropped from the ensemble. If every candidate is dropped, toast surfaces failure and the selection is left untouched. No partial-apply.
- **Inline formatting:** plain text in / plain text out, but the iframe replaces text on the **deepest text-bearing leaf** (gold-bullet sibling cells and styled wrappers are preserved). Bold/italic inside the leaf is still lost.
- **Ensemble of N parallel calls (default 3):** matches the bank-page ensemble pattern. Each call is scored against the originals (length-band fit, non-duplicate, meaningfully different from source). Highest-scoring response wins and is applied. Cost: ~3× per regen but markedly better and resilient to one malformed response.
- **No API key:** button disabled with tooltip "Add an AI API key in Configuration".
- **Cost guard:** none for v1 — each regen is `attempts` AI calls + the existing per-non-EN-language translation calls.

## Architecture

### Files touched

- `js/ai_summarizer.js` — new method `App.AISummarizer.regenerateSelection({ texts, articles, instruction, provider, apiKey, mode })`. Returns `Promise<string[]>` of same length as `texts`. Throws on length mismatch or upstream errors.
- `js/editor/iframe_script.js` — two new postMessage `cmd` cases:
  - `getSelectionTexts` — collects plain text from each currently-selected element (uses existing `findBulletWrapper`), tags each with `data-nl-regen-pending="<idx>"`, posts back `selectionTexts { items: [{idx, text}] }`.
  - `applySelectionTexts` — receives `{ items: [{idx, text}] }`, walks `[data-nl-regen-pending]` nodes, sets `textContent` on each in order, removes the marker, fires `reportHeight()`, posts back `selectionApplied`.
- `js/editor.js` — UI + handler:
  - New action button "Regenerate with AI" inside the existing right-panel action grid.
  - Inline expanding area with a textarea (optional instruction) + Cancel/Regenerate buttons.
  - Functions: `_regenOpen`, `_regenCancel`, `_regenRun`.
  - Message handler cases for `selectionTexts` (drives the AI call) and `selectionApplied` (kicks off translation + workspace flush).
  - Disabled state logic: no AI key OR not English.

### Flow

```
User clicks Regenerate
  ↓
editor.js posts {cmd:'getSelectionTexts'} to iframe
  ↓
iframe tags selected nodes with data-nl-regen-pending="0..N-1",
collects plaintext, posts back {type:'selectionTexts', items:[...]}
  ↓
editor.js calls App.AISummarizer.regenerateSelection({...})
  ↓ (on success)
editor.js posts {cmd:'applySelectionTexts', items:[...]} to iframe
  ↓
iframe sets textContent on each tagged node, removes marker,
reports height, posts {type:'selectionApplied'}
  ↓
editor.js flushes iframe HTML → state.newsletterWorkspace.variants.en
calls window.App.UITranslation.translateWorkspace({overwrite:true})
shows toast on completion
```

### Failure handling

- `regenerateSelection` throws → editor shows error toast, posts `{cmd:'clearRegenPending'}` to iframe to remove markers without changes.
- AI returns wrong item count → `regenerateSelection` throws `length mismatch` error (visible in toast).
- Translation failure after successful EN regen → use the existing `recordTranslationFailure` path so the rollback banner / preview UI already handles it. EN content stays regenerated; other languages stay on their old text until user retries.

## Out of scope (v1)

- Per-element re-translation (v1 retranslates the full workspace, same as Generate).
- Regenerate from inside a non-English preview.
- Cost preview / per-call budget warnings.
- Preserving inline formatting (bold/italic) inside regenerated bullets.
- Undo via the editor's existing undo stack (v1: regen is a one-step replacement; existing Undo button will roll back the post-regen state to the pre-regen state because we push to the undo stack before applying).

## Test plan (manual smoke)

1. Generate a newsletter with API key set, current language English.
2. Open editor → multi-select 3 bullets in a section.
3. Click "Regenerate with AI" → leave instruction empty → click Regenerate.
4. Verify: new 3 bullets appear, other-language variants auto-translate (visible if you switch preview language after save).
5. Repeat with a non-empty instruction ("make these punchier"). Verify output reflects the instruction.
6. Negative: clear API key in Config → button is disabled.
7. Negative: switch preview to French → button is disabled with tooltip.
