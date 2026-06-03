# Plan: Real-image thumbnails for picker cards

## Context

The home template picker (`index.html`) renders each card's thumbnail from hand-authored SVG strings in `App.Graphics.FORMAT_THUMBS` (`js/graphics_engine.js`). We want a card to instead show a **real supplied image** (YouTube-thumbnail style), while the **👁 Preview** button keeps rendering the live template — which it already does via `App.NewsletterBuilder.build()` in `js/ui_controller.js` (`previewTemplate`), so the preview side is untouched.

First image: a black/gold "keyboard-as-mask face" illustration on the **Phishing Maestro** card (`id: gen_cybershield`). The mechanism is **generic and incremental** — any template we later register an image for gets it; every other template keeps its current SVG as fallback.

Constraint: this is a static, no-backend app and image files can't be materialized from a pasted image. As with the editor's image library (`assets/image-library/README.md`), the user **drops the file into the folder**; the code references it by relative path.

## Manual step (user)

Save the image to `templates/gen_cybershield/design/thumb.png` (folder already exists). Any web format works — if the extension differs, update the map entry to match.

## Code

**1. `js/graphics_engine.js`** — add inside the `App.Graphics` IIFE and export:

```js
const FORMAT_THUMB_IMAGES = {
  gen_cybershield: 'templates/gen_cybershield/design/thumb.png',
};
function formatThumb(id) {
  if (FORMAT_THUMB_IMAGES[id]) {
    return `<img src="${FORMAT_THUMB_IMAGES[id]}" alt="" loading="lazy" style="width:100%;height:auto;display:block">`;
  }
  return FORMAT_THUMBS[id] || FORMAT_THUMBS.poster;
}
```

**2. `index.html`** (~line 1196) — render via the helper:

```diff
- <div class="fmt-thumb">${App.Graphics.FORMAT_THUMBS[f.id] || App.Graphics.FORMAT_THUMBS.poster}</div>
+ <div class="fmt-thumb">${App.Graphics.formatThumb(f.id)}</div>
```

`.fmt-thumb` already clips with `overflow:hidden; border-radius:4px`. Relative path keeps it zip-portable.

**3. Test-first — `tests/unit/graphics-thumbs.test.js`** (new): load `js/graphics_engine.js` in a vm context (pattern from `app-modules.test.js`) and assert:
- `formatThumb('gen_cybershield')` → `<img>` with the registered `src`.
- `formatThumb('poster')` → SVG string (no registered image).
- `formatThumb('does-not-exist')` → poster SVG fallback.

## Out of scope

- Mojibake corruption in existing `FORMAT_THUMBS` SVGs (separate pre-existing encoding bug).
- No change to `previewTemplate` / the Preview modal.

## Verification

1. `node --test tests/unit/graphics-thumbs.test.js`
2. `npm run test:unit` (full suite green)
3. `npm run lint`
4. Manual: drop `thumb.png` → `npm run serve` → Phishing Maestro card shows the image; Preview still opens the live render; other cards unchanged.
