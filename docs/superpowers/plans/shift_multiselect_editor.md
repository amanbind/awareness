# Plan — Bug fix: `findBulletWrapper` over-deletes the whole section

## Context (this update)

After shipping shift-multi-select with a `findBulletWrapper` helper that climbs to the bullet-row `<tr>`, pressing **Remove** on a selection sometimes wipes the **entire section**, not just the picked bullets.

Root cause: the original heuristic in [js/editor.js](../../../js/editor.js) walked up to the nearest `<tr>` and accepted it as a bullet wrapper as long as it had any `border-radius:50%` descendant anywhere in its subtree. When the user clicked a non-bullet thing (a section heading like "Impact", a paragraph) and that thing lived inside an outer section-wrapping `<tr>` which contained bullet rows below, the helper returned the whole-section `<tr>`. Delete then removed heading + every bullet below.

Fix: tighten the heuristic to recognise only **genuine 2-cell bullet rows**, and only when the clicked element is inside the text cell (or the dot cell) of one such row.

## New test for "this is a bullet row"

Walk up to the nearest enclosing `<tr>`. Accept the climb **only if all of these hold**:

1. That `<tr>` has **exactly 2 direct `<td>` children**.
2. **One** of those direct `<td>` children has exactly **one** child element, which is a `<div>` whose inline style matches `/border-radius:\s*50%/i` (the gold dot).
3. The clicked element is contained inside the **other** `<td>` (the text cell) or the dot cell — not just any descendant of the `<tr>`.

If any of these fail, return the originally-selected element unchanged.

When the test passes, optionally climb one more level to the outer wrapper `<tr>` if:
- The inner-bullet `<tr>`'s parent is a `<table>`.
- That `<table>`'s parent is a `<td>` with exactly one element-child (the inner table).
- That outer `<td>`'s parent is a `<tr>` with exactly one `<td>` child.

Otherwise use the inner `<tr>` as the deletion target.

## Why this is safe

- Section headings ("Impact", "Stay safe") are `<p>` elements outside the bullet `<table>`, inside a different `<tr>` cell. Walking up from them hits a `<tr>` whose direct `<td>` children do not match the dot-cell pattern → no wrapping → only the heading paragraph is deleted.
- Section-wrapping `<tr>`s have a single `<td>` child containing everything, not two `<td>`s.
- Genuine bullet rows match exactly: 2 `<td>`s, one with a single dot div, one with text. Real bullets still climb correctly and the gold dot disappears with the text.

## Files touched

- [js/editor.js](../../../js/editor.js) — replace the body of `findBulletWrapper` with the tighter check + an `isGoldDotCell` helper. `doDelete`, `getDomPath`, `getDomPaths` all call this helper, so the bug fix flows automatically.

No other file changes. No tests change (editor has no unit-test coverage). No persistence or AI changes.

## Verification

1. `npm run lint` → 0 errors.
2. `npm run test:unit` → 52/52 pass.
3. Manual checks in the browser (hard-refresh after the change):
   - Multi-select 3 bullets across two sections → press **Remove** → only those 3 bullets disappear (with their gold dots). Section headings and other bullets stay.
   - Click on a section heading "Impact" → press **Remove** → only that heading disappears.
   - Click on the intro paragraph → press **Remove** → only the paragraph goes.
   - Click on the gold-dot cell itself → press **Remove** → still removes the whole bullet (dot cell IS inside the bullet row pattern).
   - **Remove in all languages** with a bullet selected → confirms the same bullet is gone in every translated variant; surrounding sections intact.
   - Single-click (no shift) → single bullet still deletes correctly.
4. Regression: the previous bug (dot left behind after text deletion) must remain fixed for real bullets.

---

# Plan — Shift-click multi-select in the newsletter editor (original)

## Context

In the modal newsletter editor today, a single click selects one element. The Remove button on the right panel deletes only that element. To delete five bullets and a heading, the user has to click → Remove → click → Remove × 6.

Goal: hold **Shift** and click multiple elements to add them to a selection set; pressing **Remove** (or the **Delete** / **Backspace** key) removes all of them in one shot. Same idea applies to **Remove in all languages** — it removes the equivalent elements from every translated variant.

This is a UX upgrade only. No data-model change, no AI change, no persistence change.

## Where it lives

The whole selection-and-delete loop lives inside the sandboxed iframe at [js/editor.js](../../../js/editor.js) (around lines 510-1015). The iframe holds:

- `_sel` — currently the single selected DOM node.
- `doSelect(t)` — applies the highlight, posts a `select` message to the parent.
- `doDelete()` — calls `_sel.remove()`, posts a `deleted` message.
- Click handler (lines ~603-609) — always calls `doSelect(t)`, no shift handling.
- Keyboard handler (lines ~624-628) — Delete/Backspace triggers `doDelete()`.

The parent window's "Remove" button calls `App.Editor._delete()` which `_post('delete', null)` into the iframe.

`deleteSelectedInAllLanguages` currently:
1. Asks the iframe for the DOM path of the single selected element.
2. Walks every language variant, removes the element at the equivalent mirror path.

## Approach

Inside the iframe, replace the single `_sel` with a primary-plus-set selection model:

- `_sel` — the most recently clicked element (kept for backward compatibility with property-panel commands).
- `_selSet` — a `Set<Element>` of all currently selected elements. Always contains `_sel` if `_sel` is non-null.

### Selection rules

| User action | Behaviour |
|---|---|
| **Click** an element (no modifier) | Clear `_selSet`, set `_sel = t`, add `t` to `_selSet`. |
| **Shift-click** an unselected element | Add it to `_selSet`, update `_sel = t`. Do not deselect existing members. |
| **Shift-click** an already-selected element | Remove it from `_selSet`. If it was `_sel`, point `_sel` at the most recent remaining member (or null). |
| **Click on body / outside** | Clear `_selSet` and `_sel`. |
| **Esc** | Same as click-outside. |
| **Delete / Backspace** | Remove every element in `_selSet` (skip locked ones). |
| **Double-click** for inline edit | Force single-select first, then enter edit mode. Multi-select doesn't combine with text-edit. |
| **Locked elements** (`data-nl-lock="1"`) | Cannot be added to the set. Shift-click on a locked element is a no-op. |
| **Body / documentElement** | Cannot be added to the set. |

### Visual feedback

- Add a `data-nl-multisel="1"` attribute to every element in `_selSet` except `_sel`.
- One new CSS rule in the iframe stylesheet: `[data-nl-multisel="1"] { outline: 2px dashed #D4A420; outline-offset: 2px; }` — dashed outline distinguishes secondary picks from the primary (solid).
- `_sel` keeps its existing solid outline.

### Property-panel behaviour when multi-selected

The right-side property panel still operates on `_sel` (most recent click). When `_selSet.size > 1`:
- Single-element edits (font size, bold, colour) still affect only the primary.
- A banner at the top of the panel reads: **"N elements selected. Remove acts on all; other edits affect the primary."**
- **Remove** and **Remove in all languages** act on the whole set.

### postMessage protocol changes

- Existing `select` message gains a `multiCount` field. All other fields unchanged.
- New `getDomPaths` / `domPaths` sibling commands for the all-languages delete to report an array of paths. The old `getDomPath` / `domPath` remains intact.
- `delete` command stays — iframe-side `doDelete` now iterates `_selSet`.

### Undo / redo

The undo stack snapshots `body.innerHTML` before/after each mutation. Multi-delete is one mutation = one snapshot. `_pushUndo` works unchanged.

## Files touched

- [js/editor.js](../../../js/editor.js) — all changes live here.
  - Iframe `srcdoc` script (~lines 510-1015): introduce `_selSet`, update `doSelect` to accept an `additive` flag, update click/Esc/dblclick handlers, update `doDelete`, add `getDomPaths`, add CSS for `[data-nl-multisel]`.
  - Parent-side (top half): `_msgHandler` reads `multiCount`, `_updatePanel` renders the "N selected" banner, `deleteSelectedInAllLanguages` switches to `getDomPaths` and loops.

**No other file changes anywhere in the codebase.**

## Hard guarantees

**1. Unlimited selection size.** `_selSet` is a JavaScript `Set<Element>` with no cap. Shift-click 1, 5, 20, 200 elements — every shift-click adds another entry. The only filters are the same ones single-click respects (locked elements, `<body>`, the iframe document root). When the user presses **Remove**, every element in the set is deleted in one pass.

**2. Nothing else changes anywhere in the codebase.** Purely additive inside `js/editor.js`:
- No edits to `js/ui_controller.js`, `js/newsletter_builder.js`, `js/ai_summarizer.js`, `editor.html`, `preview.html`, `index.html`, or any other file.
- No changes to workspace persistence format, IndexedDB schema, project store format.
- No changes to multi-language sync (`updateNewsletterNodeTextByMirrorPath`, `syncNewsletterElementTextToAllLanguages`).
- No changes to AI prompts, ensemble pipeline, or log server.

**3. Single-click flow is byte-identical to today** when the user never holds Shift. First click with no shift clears `_selSet` and adds just `t`, leaving `_sel === t` exactly as before. `_selSet.size === 1` → property panel renders normally.

**4. Message protocols stay backward-compatible.** `select`, `deselect`, `delete`, `deleted`, `update`, `domPath`, `getDomPath` — all kept, all carry original payloads. `multiCount` is an additive field. New `getDomPaths` is a sibling, not a replacement.

**5. Property panel, drag-and-drop, undo/redo, lock toggle, duplicate, move up/down, add element, presets, text edit** — all still operate on `_sel` only. None iterate `_selSet`. Only **Remove** and **Remove in all languages** fan out.

**6. Save, Close, Send, language switching, preview rendering** — read from workspace HTML, not from editor selection state. Completely untouched.

## Edge cases handled

- **Locked elements** filtered out of `_selSet`; `doDelete` skips them.
- **Ancestor + descendant in the set** — `el.remove()` on an already-detached node is a no-op, so the loop is safe.
- **Double-click on a multi-selected element** collapses multi-select to just that one and enters edit mode.
- **Drag-to-reorder** only operates on the primary `_sel`. Multi-drag out of scope.

## Verification

1. `npm run lint` → 0 errors.
2. `npm run test:unit` → 52/52 still pass.
3. Manual checks (`npm run serve`, open editor on a generated newsletter, click **Open Newsletter Editor**):
   - Click a bullet → solid outline; right panel shows DIV props.
   - Shift-click more bullets → all outlined (primary solid, rest dashed); banner reads "N elements selected".
   - Shift-click an already-selected bullet → it deselects; count drops.
   - Press **Remove** → all currently selected elements disappear; undo restores them in one Ctrl+Z.
   - Multi-select across sections, press keyboard **Delete** → same result.
   - Multi-select, press **Remove in all languages**, switch preview language → confirm all gone from that variant too.
   - Lock a bullet, shift-click it → not added to the set.
   - Click outside / press **Esc** → selection clears.
   - Double-click a multi-selected bullet → collapses to single-select and enters edit mode.
4. Regression: no-Shift single edit + property panel + Save → identical to today.
