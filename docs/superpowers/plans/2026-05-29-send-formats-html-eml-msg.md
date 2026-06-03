# Plan: Export/send the newsletter as HTML, EML, or MSG

**Status: implemented 2026-05-29.**

## Context

The app could output the newsletter as an HTML file, an `.eml` (Outlook draft),
or a relay HTML send — all via `toStandaloneHtml()` (email-safe HTML: QR inject +
`flattenEmailColors` + `enforceEmailFont` + document wrap). The user wanted to
**add Outlook `.msg` export** and a **single provision to produce the newsletter
as HTML, EML, or MSG**. `.msg` is a binary OLE2 / Compound File (MS-CFB) container
holding MAPI property streams — no such capability existed, and the app is static,
no-build, zip-portable.

Decisions: **self-contained CFB writer** (no external dependency, works offline so
the zip runs identically anywhere) and **keep the email-safe transforms** for all
formats (so Outlook renders correctly — Outlook blocks `data:` images, so MSG/EML
both use cid attachments).

## What was built

### 1. `js/msg_writer.js` → `App.MsgWriter.buildMsgFile(html, attachments, { subject })`
Self-contained MS-CFB v3 writer (FAT + mini-FAT + directory BST) + MSG property
streams. Minimal draft message (no recipients — added in Outlook):
- `__substg1.0_001A001F` PR_MESSAGE_CLASS_W = `IPM.Note`
- `__substg1.0_0037001F` PR_SUBJECT_W, `__substg1.0_1000001F` PR_BODY_W (stripTags),
  `__substg1.0_10130102` PR_HTML (UTF-8)
- top `__properties_version1.0`: PR_MESSAGE_FLAGS=0x8 (UNSENT/draft), PR_INTERNET_CPID=65001
- per inline image → `__attach_version1.0_#XXXXXXXX` storage (PR_ATTACH_DATA_BIN,
  MIME tag, content-id, long filename; method=by-value, flags=ATT_MHTML_REF, hidden)
Reuses `App.Utils.stripTags`; pure `atob`/`TextEncoder`/`DataView`.

### 2. `downloadCurrentMsg()` in `js/ui_controller.js` (mirrors `downloadCurrentEml`)
`toStandaloneHtml` → `prepareImagesForRelay` (cid) → `App.MsgWriter.buildMsgFile`
→ `downloadBlob('newsletter-<lang>.msg', Blob[...], 'application/vnd.ms-outlook')`.
Exported on `App.UI`.

### 3. Unified format provision (HTML / EML / MSG)
- `editor.html` `.editor-file-group`: buttons **HTML / EML / MSG / All files**.
- `preview.html`: **HTML / EML / MSG / Download All**.
- `send.html`: relay "Send Newsletter" stays the HTML send; added a "Send-ready
  file: HTML / EML / MSG" download row for the open-in-Outlook flow.
- `js/msg_writer.js` script tag added to editor/preview/send before `ui_controller.js`.

## Verification

- Unit `tests/unit/utils-msg-writer.test.js`: a minimal CFB reader round-trips
  PR_HTML (regular sector path), PR_SUBJECT/PR_MESSAGE_CLASS (mini path), and an
  attachment storage; checks the CFB signature. 3/3 pass; full unit suite 130/130.
- E2E `tests/e2e/send-formats.spec.js`: generate → editor exposes HTML/EML/MSG and
  the browser builds a valid CFB (signature `D0CF11E0…`). Passes.
- `npm run lint`: 0 errors.
- **Manual (authoritative)**: open `newsletter-en.msg` in Outlook desktop → HTML
  renders with inline images, opens as an editable draft. Repeat for a non-English
  variant (UTF-8/cpid check).

## Notes / follow-ups
- CFB layout supports up to 109 FAT sectors (~7 MB) — throws beyond (fine for newsletters).
- If a byte-exact "raw" (no transforms) variant is later wanted, add a path that
  skips `flattenEmailColors`/`enforceEmailFont`.
