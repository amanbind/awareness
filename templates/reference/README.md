# reference / staging

Staging area for the **Template Generation Agent** (see `AGENTS.md` → "Template Generation Agent").

Drop here:
- A single reference HTML file, or a single PNG/JPG mock, to be converted into a `gen_<slug>` template
- During Phase 1 the agent also writes here:
  - `preview_gen_<slug>.html` — pre-onboarding standalone preview (palette-mapped, `{{TOKEN}}` placeholders intact)
  - `images/<filename>` — images extracted from the reference (replaceable before approval)

Workflow:
1. Drop reference file → ask the agent to convert it.
2. Agent generates the preview + extracts images and **stops** for review.
3. Inspect the preview, swap images in `images/` if needed.
4. Type `/approve gen_<slug>` to onboard into the catalog/registry/thumbnail.

Hard rules (from `AGENTS.md`):
- Zero API calls during template generation.
- Only `js/newsletter_builder.js`, `js/graphics_engine.js`, `js/newsletter/core_templates.js`, and `tests/unit/app-modules.test.js` get edited at onboarding.
- Gold / black / white palette only. No Google Fonts. No external image URLs in the final template.
- New templates always ship as `status: 'beta'`.

Folder kept under version control via this README (zip strips empty folders).
