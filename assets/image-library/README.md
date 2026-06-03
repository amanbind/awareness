# assets/image-library

Pre-seeded image library for the editor's **Replace image** feature.

## How it works

The editor's Replace-image modal shows a "From library" grid, seeded into each
user's IndexedDB on first open. The **source of truth for portability** is the
committed bundle **`library.js`** — the listed images baked in as data URIs.
The editor loads `library.js` via a plain `<script>` tag, so the library is
available **with or without a server** (served over http *and* opened straight
from a zip via `file://`, where `fetch()` is blocked). A best-effort `fetch()` of
the raw files is kept only as a supplement for served environments.

This is what makes the library **permanent** — it ships inside `library.js` and
appears on any machine the zip/server lands on.

## How to add an image

1. Drop the file (jpg / png / gif / webp / svg) into this folder.
2. Add the filename to `manifest.json` (`"images": [ ... ]`).
3. **Regenerate the bundle:** `npm run build:image-library` (rewrites `library.js`).
4. Hard-refresh the editor (`Ctrl+Shift+R`).

## Uploads become permanent automatically (while authoring)

When you upload an image through the Replace-image modal **while running the dev
server** (`npm run serve`), the editor POSTs it to a local `/save-image` endpoint
that writes the file here, updates `manifest.json`, and regenerates `library.js`
for you. So uploads done during authoring ship with the zip/server like any
pre-staged image. On a recipient's static build (no dev server) uploads stay in
that browser only — re-add them on the authoring machine if they should ship.

> `library.js` is auto-generated — do not hand-edit it. Edit the files +
> `manifest.json`, then run `npm run build:image-library`.

## Constraints

- Max recommended size per image: **2 MB** (same cap as user uploads).
- Allowed MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`.
- Filenames must be unique within `manifest.json`.
- Files in this folder that are NOT listed in `manifest.json` are ignored — the manifest is the source of truth.

## Why a manifest instead of directory listing?

The app is a static-served vanilla-JS project (no backend) — there's no way for the browser to list files in a folder. The manifest is the contract.

## Dedupe

`App.DB.saveImage()` deduplicates by SHA-1, so re-running the seed (e.g. on every modal open) is safe. Once an image is in IndexedDB, the next seed pass becomes a no-op for that file.

## Removing a seeded image

The seed step never DELETES from IndexedDB. To remove an image from a user's library, they have to delete it from their own IndexedDB (DevTools → Application → IndexedDB → SecurityAwareness → images), OR you'd need to extend the editor with a "delete from library" UI (currently out of scope).

Keeping a file in `assets/image-library/` but removing it from `manifest.json` simply means: "stop pulling this into new users' libraries; existing users keep it."
