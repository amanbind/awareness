# Per-template folders + universal AI logging + tidy two big files

> Approved 2026-05-23.

---

## What this is for

You're getting ready for the future where you hand the app a reference and a topic and it generates a ready-to-go template. To make that future easy to debug — and to make manual fixes simple right now — every template should have its own folder that holds two things:

1. **Its design stuff** — the images that get pulled or AI-generated, plus any reference mocks the pipeline was shown.
2. **Its AI logs** — every prompt that gets sent to the AI for content and the result that comes back. So if a template comes out wrong, you can open one folder and read exactly what the AI was asked and what it said.

While I'm in there, I'll also tidy two of the largest JavaScript files by lifting out one cohesive chunk from each. Nothing breaks; the same buttons keep doing the same things.

---

## What the new template folders look like

Under the existing `templates/` folder, every one of the 23 templates currently in the app gets a folder of its own. Inside each template's folder there are just two subfolders:

- A **design** folder — for that template's images and reference mocks. Empty for now (each one gets a tiny README so the empty folder survives a zip — zips drop empty folders otherwise).
- An **ensemble-logs** folder — fills up automatically whenever that template is built. Each build drops the AI prompt(s) + the AI response(s) into a fresh timestamped subfolder inside it.

Same shape for every template — the three production-ready ones (Corporate Alert, the two bank-page templates) and the twenty beta templates. When the agentic pipeline eventually creates a brand-new template, it just picks an ID, makes a folder with the same two subfolders, drops generated images into design, and the logs appear in ensemble-logs as it works.

The existing `templates/imported-standalone/` and `templates/imported-email-safe/` folders stay untouched — those are reference HTML libraries, not per-template build folders.

---

## How the AI logging works after this change

Today only the bank-page templates log AI calls (they run nine parallel calls and dump everything to a project-root logs folder). Every other template — Corporate Alert, Spotlight, Do/Don't, Infographic, everything — currently sends prompts to the AI silently. So if one of them comes out wrong you have no record of what was asked.

After this change:

- **Every** AI content/text call across the whole app gets logged.
- Each log file shows the prompt that was sent and the response that came back, in one file, side by side, in plain text.
- The logs land in two places at once:
  1. The existing project-root logs folder (exactly where they go today — same path, same file names for the bank-page case). This means existing tools, scripts, and reviewers that read those logs keep working.
  2. A mirror copy inside the template's own ensemble-logs folder, under a fresh timestamped session.

So if you're debugging the Spotlight template, you go to `templates/spotlight/ensemble-logs/` and there's a folder for each time someone built a Spotlight newsletter, with every AI exchange inside.

Article curation (the step where the app summarises each news article before you pick which ones go in) doesn't belong to any one template — those logs go into a pseudo-template folder called `_article-curation` so they're still grouped and findable.

The bank-page templates keep their existing nine log files with the exact same names (combined, intro, the three sections, impact-org, next-steps, impact-general, remember, plus the scores file). No tool that reads those logs today needs to change.

---

## How the per-template tagging happens

When the app starts building a template, it briefly tells the logging system "we're building Spotlight now". Every AI call that runs during that build inherits the Spotlight tag automatically — nothing has to be passed around by hand. When the build finishes, the tag is cleared.

For the editor's Regenerate-with-AI button, the same thing: when you click regenerate, it tells the logger which template you're editing, so the three regen attempts land in that template's folder. (Today regen runs silently — no record at all.)

The local log server gains one small ability: if a log POST comes in with a template tag, it writes the file in both places (project root + template folder). If a tag is missing, it just writes to the project root like today. So nothing existing breaks.

---

## The two file-tidying jobs

The app already follows a pattern where big files get smaller by lifting a cohesive chunk out into its own sibling file. The big AI file and the big UI file each get one chunk lifted out this round. Both lifts are low-risk and leave the same buttons clicking the same things.

**AI file — lift out the prompt-building chunk.** The big AI file currently mixes prompt-builders (functions that turn articles into the text we send to the AI) with everything else. The prompt-builders are pure text formatting — they don't touch state, don't call the network. They go into their own sibling file. The main AI file gets ~190 lines smaller. The public list of things the AI module offers doesn't change.

**UI file — lift out the sidebar chunk.** The big UI file currently handles everything from page navigation to the sidebar that manages news feed sources and keyword lists. The sidebar piece is self-contained — it just renders some lists and lets you add/remove items. It goes into its own sibling file. The main UI file gets ~170 lines smaller. The sidebar buttons still work because the main file keeps thin "go ask the sidebar sibling" wrappers for any function the page HTML refers to by name.

The third big file (the editor) is already manageable in size after the previous restructure — leaving it alone this round.

---

## Where everything lives after this

- `templates/` — gains 23 new template folders, each with design and ensemble-logs subfolders inside.
- `templates/_article-curation/` — gains an ensemble-logs folder for per-article AI logs.
- `js/ai/` — gains two new files: one for the new logger module, one for the lifted-out prompt builders.
- `js/ui/` — gains one new file for the lifted-out sidebar manager.
- The existing logs folder at the project root — unchanged in path, in file names, in format.
- The local log server script — gains the "write a mirror copy if a template tag is present" ability.
- The HTML pages (six of them) — each gets three new script tags added in the right order so the new modules load before the things that use them.
- The project's main docs (the architecture context doc, the CLAUDE notes, and the restructure summary) — updated to mention the new template folders, the new logger, and the new sibling files.

---

## How we know nothing broke

Run the project's normal quality gate — the linter, the unit tests, the browser end-to-end tests, the baseline audit. All four must pass. Unit tests grow from 64 to 69 because we add 5 new ones that lock in the new contracts (the logger exists, the per-template tagging works, the bank-page log filenames are still byte-identical to today, the two new sibling files expose what's expected, the existing AI log URL hasn't moved).

Then a quick hands-on test:

1. Build a bank-page newsletter. Check the existing project-root logs folder has its usual files. Check the same files appear inside `templates/bankpage1_static/ensemble-logs/`.
2. Build a Corporate Alert poster. Check `templates/poster/ensemble-logs/` now has a folder with the AI prompt + response inside (this was silent before).
3. Open the editor on any newsletter, click Regenerate with AI on a bullet. Check `templates/<that-template>/ensemble-logs/` gets three log files (one per regen attempt).
4. Load the article list and let curation run. Check `templates/_article-curation/ensemble-logs/` collects per-article summary logs.
5. Open each of the six HTML pages in a browser. No console errors. The new script tags don't 404.
6. Zip the project up, unzip it somewhere else, install dependencies, run the gate. Same passes. (This catches a common mistake — empty folders don't survive a zip, which is why every empty subfolder gets a small README to keep the structure intact.)

---

## Why this order is safe

- The project-root logs folder is left exactly where it is. Anyone or anything reading from it today keeps working.
- The bank-page log file names don't change. Existing eyes on those logs see the same things.
- The per-template tag is optional from the server's perspective. If an older bit of code POSTs without a tag, the server quietly falls back to today's behaviour.
- The two file-tidying lifts are both low-risk chunks (pure-function prompt builders + a self-contained sidebar). The riskier bits the exploration flagged (long async loaders, tangled state) are explicitly left for a later round.
- The editor file is left as-is — already small enough.

Rollback is straightforward: each of the new files can be deleted and its contents pasted back into the main file; the template tag can be removed from the POST and everything falls back to today's logging.
