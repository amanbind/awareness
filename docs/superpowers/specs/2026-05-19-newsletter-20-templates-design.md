# Newsletter Template Overhaul — 20-Template Design Spec
**Date:** 2026-05-19  
**Approach:** Option B — Shared design system first, then build  
**Status:** Approved by user

---

## 1. Constraints & Ground Rules

- **Palette:** `#0A0A0A` (near-black), `#D4A420` / `#C09010` (gold), `#F5F1EA` (cream), `#C5BEAF` (stone), `#FFFFFF` (white). No new colours except threat-level spectrum (green → amber → red) for badges only.
- **Typography:** Georgia/Times serif for display headings; Arial/Helvetica for body. No web fonts (email-safe).
- **Email-safe:** All layouts are table-based, inline styles, no external resources. `px` units only (no `rem` in email context).
- **Animations:** Only in `screen-safe` render channel. Wrapped in `@media (prefers-reduced-motion: reduce)` off-switch. Email-safe channel renders static fallback.
- **Corporate Alert (`poster`):** No changes. Preserved exactly as-is.
- **No emoji in formal headers.** Emoji permitted only in Team Chat (`people`) conversational bubbles.
- **All templates** end with: `stoneSpacerTr()` → `trainingPackReportCta(c)` → `stoneSpacerTr()` → `foot(c, qr)`.

---

## 2. Shared Primitive Functions

These are the building blocks used across all templates. All are pure string-returning functions inside the `window.App.NewsletterBuilder` IIFE.

### Already-existing primitives (keep, do not change)
- `nlOuterOpen()` / `nlOuterClose()` — stone-field wrapper, 640px white card with shadow
- `tbl()` / `tblx()` / `tbc()` — table wrappers
- `stoneSpacerTr()` — 24px `#C5BEAF` band
- `trainingPackReportCta(c)` — dark SOC strip with rounded gold button
- `foot(c, qr)` — footer
- `badge(lv)` — threat level badge
- `corporateTopicIntroHtml(c)` — edition focus card

### New / replaced primitives

#### `goldGradientBar()`
5px height, `background: linear-gradient(135deg, #C09010, #D4A420)`. Used as the very first row inside every newsletter-type template.

#### `darkMasthead(c, subtitle)`
Near-black (`#0A0A0A`) header block. Contains:
- Gold uppercase kicker: `c.freq + ' ' + (subtitle || 'Security Alert')`
- Serif white title: `c.title`
- Dim white date line: formatted date + `· Staff security briefing`
- Optional logo slot (if `c.logoDataUri` is set)

#### `goldBannerStrip(text)`
Full-width `#C09010` band, white bold uppercase text. Used beneath masthead.

#### `gradientFade()`
40px row with `background: linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)`. Stone/cream background below.

#### `articleCard(a, idx, c)`
White rounded-10px card with `border: 1px solid #E8E2D8`. Contains:
- **Title bar** (`#0A0A0A`, rounded top): gold icon circle (30px, `#B8860B`), gold type badge, serif white article title
- **Cream bubble** (`#FFF8E7`, rounded `12px 12px 12px 4px`): **"What Happened:"** + article summary
- **Dark bubble** (`#0A0A0A`, rounded `12px 12px 4px 12px`): gold "What to do" label + watchout; green IT circle (30px) beside it

#### `posterHero(c, variant)`
Large-format hero for poster templates. `variant` is `'centred' | 'split' | 'stacked' | 'command' | 'minimal'`. See Section 4 for per-poster layout detail.

#### `sectionBand(label, bg, fg)`
Full-width labelled divider. `bg` defaults to `#0A0A0A`, `fg` to `#D4A420`. Bold uppercase label, 12px, letter-spaced.

#### `screenSafeStyle(cssBlock)`
Returns `<style>...</style>` wrapped in `<!--[if !mso]><!--> ... <!--<![endif]-->` so animations only load in non-Outlook clients. Always includes `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }`.

#### `animFadeIn(delayMs)`
Returns inline `style="animation: nlFadeIn 0.6s ease both; animation-delay: {delayMs}ms;"` — used on card wrappers in screen-safe mode. Animation keyframe defined in `screenSafeStyle()`.

#### `animSlideUp(delayMs)`
Returns inline `style="animation: nlSlideUp 0.4s ease both; animation-delay: {delayMs}ms;"` — used on article cards for staggered entrance.

#### `animShimmer()`
Gold shimmer on the gradient bar. 2s infinite subtle brightness pulse.

---

## 3. Restyled Existing Templates (13 templates — Corporate Alert untouched)

### Template 2: `knowbe4` — Training Alert
- Masthead: `darkMasthead(c, 'Training Alert')` + `goldBannerStrip()`
- Articles: Replace current card code with `articleCard()` primitive
- Screen-safe: `animSlideUp()` staggered on each card (100ms increments)
- Ends with standard SOC strip + footer

### Template 3: `people` — Team Chat
- Keep chat-bubble conversational structure (cream left / dark right bubbles)
- Apply `articleCard()` for consistent card chrome (dark title bar, rounded corners)
- Emoji permitted in bubbles only
- Screen-safe: fade-in on cards

### Template 4: `infographic` — Spot the Phish
- `statRow()` rebuilt using `statRow(stats[])` primitive
- Section bands via `sectionBand()`
- Red/green tip blocks stay but get `border-radius: 8px` and formal label typography
- Screen-safe: stat tiles get CSS count-up shimmer

### Template 5: `quicktips` — Quick Safety Rules
- Dark numbered tiles: each tip in a `#0A0A0A` card, gold number on left, rule text right
- `sectionBand('5 RULES EVERY EMPLOYEE MUST FOLLOW')`
- Threat brief in dark bottom band
- Screen-safe: staggered slide-up per tile

### Template 6: `redflags` — Red Flags Checklist
- Each flag: dark card, gold left-border stripe, icon + flag text + detail
- Remove emoji from headings; keep in icon circle
- `sectionBand('RED FLAG INDICATORS')`
- Screen-safe: staggered fade-in

### Template 7: `stoplook` — Stop Look Report
- 3-step structure: gold large step numbers (72px serif), dark card per step
- Steps: STOP / LOOK / REPORT — each with body copy
- `sectionBand('3-STEP RESPONSE PROTOCOL')`
- Screen-safe: each step slides in with 150ms stagger

### Template 8: `emaildissect` — Email Anatomy
- Annotated email mock: cream card with gold callout arrows and numbered labels
- Label cards below the mock in dark style
- `sectionBand('ANATOMY OF A PHISHING EMAIL')`
- Screen-safe: callout labels fade in sequentially

### Template 9: `dodont` — Do vs Don't
- Split layout: left column cream `#F5F1EA` (DOs), right column dark `#0A0A0A` (DON'Ts)
- Each item: gold checkmark (DO) or red `✕` (DON'T) + formal body text
- `sectionBand('SECURITY BEHAVIOUR GUIDE')`
- Screen-safe: columns slide in from opposite sides

### Template 10: `spotlight` — Threat Spotlight
- Magazine cover feel: large serif headline (`font-size: 36px`), gold subtitle
- Single threat deep-dive: background, tactics, indicators, defence
- `sectionBand('THREAT INTELLIGENCE BRIEFING')`
- Screen-safe: headline fade-in, body stagger

### Template 11: `timeline` — Incident Timeline
- Vertical gold line (4px, `#C09010`) running the full height
- Event cards: dark, connected to the line with a gold circle node (14px)
- `sectionBand('INCIDENT TIMELINE')`
- Screen-safe: events reveal sequentially top-to-bottom

### Template 12: `scorecard` — Awareness Scorecard
- Dark metric cards: score number large serif, label below, progress bar in gold
- `sectionBand('SECURITY AWARENESS METRICS')`
- Screen-safe: progress bars animate width from 0 to value

### Template 13: `cybertimes` — Cyber Security Times
- **Full newspaper rebuild:**
  - Masthead: serif "CYBER SECURITY TIMES" in large black on white, gold rule below, date + edition number in small caps
  - Lead story: full-width, large headline, byline, body text, 2-column layout
  - Supporting columns: 3-column grid (table-based), each a mini story with headline + 2-line summary
  - Pull quote: gold left border, large italic serif quote, attribution
  - Black rule dividers between sections
  - Footer: broadsheet-style small-print
- Screen-safe: typewriter effect on masthead dateline

### Template 14: `testbrief` — Security Dispatch
- Formal polish only: apply `screenSafeStyle()` animations, ensure `sectionBand()` used consistently
- No structural changes

---

## 4. New Templates (6 templates)

### Template 15: `poster1` — Impact Poster: Centred
**Layout:** Full-width dark card. Vertically centred content.
- Gold gradient bar (top)
- 80px padding top/bottom
- Gold kicker: `c.freq + ' SECURITY NOTICE'` (9px, letter-spaced)
- Serif headline: `c.title` — 42px white, centred
- Gold 2px horizontal rule (160px wide, centred)
- Tagline: first watchout or `c.nlCorporateTopicBlurb` — 14px cream, centred, max 2 lines
- Bottom: org name + SOC email in dim white
- **Inspiration:** IBM Corporate Security posters — authority through whitespace and type scale
- Screen-safe: headline fades in, rule expands from centre

### Template 16: `poster2` — Impact Poster: Split
**Layout:** Two-column table, 50/50.
- Left column (`#0A0A0A`): gold kicker, serif headline `c.title`, gold rule, 2-line body
- Right column (`#F5F1EA`): large bold stat or icon (first article threat type), cream background
- Gold gradient bar spans full width at top
- Bottom: full-width dark SOC strip
- **Inspiration:** Cisco Cybersecurity awareness split-panel posters
- Screen-safe: left slides in from left, right from right

### Template 17: `poster3` — Impact Poster: Stacked
**Layout:** Three alternating full-width bands.
- Band 1 (`#0A0A0A`): gold kicker + serif headline `c.title`
- Band 2 (`#F5F1EA`): 3 gold-numbered points from `wo` (watchouts), horizontal layout
- Band 3 (`#0A0A0A`): "Report to" gold CTA button centred
- **Inspiration:** Microsoft Security "Protect What Matters" poster series
- Screen-safe: bands stagger in top-to-bottom

### Template 18: `poster4` — Impact Poster: Command
**Layout:** Urgent/incident style.
- Top band: `#C09010` gold, bold white `SECURITY ALERT` in all-caps
- Body: `#0A0A0A`, all-caps white serif headline `c.title` (48px)
- Sub-copy: 14px cream, first article summary truncated to 2 lines
- Bottom band: gold, bold white "REPORT IMMEDIATELY · " + SOC email
- **Inspiration:** Proofpoint / KnowBe4 incident response poster style
- Screen-safe: top/bottom bands slide in, headline pulses once

### Template 19: `poster5` — Impact Poster: Minimal
**Layout:** White card, thin 2px gold border.
- Centred layout, generous whitespace
- Small gold kicker (8px, letter-spaced)
- Single large number or stat — first item from `wo[]` truncated to 6 chars, falling back to `'100%'` — 96px, near-black, serif
- One sentence below in 16px `#333`
- Bottom: org name in 10px `#999`
- **Inspiration:** Google internal security posters / Apple design language
- Screen-safe: number counts up from 0, sentence fades in after

### Template 20: `newspaper` — The Cyber Gazette
**Layout:** Broadsheet newspaper email.
- **Masthead row:** White background. "THE CYBER GAZETTE" in 36px serif bold near-black, centred. Thin gold rule below. Date + "Vol. X · Security Intelligence Edition" in 10px small caps.
- **Thick black rule** (3px) full width
- **Lead story block:** Left 65% — large 24px serif headline, italic byline (`c.org + ' Security Team'`), body text from top article summary. Right 35% — "EDITOR'S PICK" label + 3 bullet watchouts in serif italic
- **Black rule**
- **3-column section:** Each column = mini article. Dark headline (14px bold), 2-line body, small gold "READ MORE →" link if `lk` enabled
- **Pull quote band:** Cream `#F5F1EA` background, gold left border 4px, large 20px italic serif quote from `wo[0]`, attribution line
- **Black rule**
- Standard `trainingPackReportCta()` + `foot()`
- Screen-safe: masthead typewriter dateline reveal (CSS `steps()` animation)

---

## 5. Animation Keyframes (screen-safe only)

```css
@keyframes nlFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes nlSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes nlSlideLeft {
  from { opacity: 0; transform: translateX(-20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes nlSlideRight {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes nlShimmer {
  0%, 100% { filter: brightness(1); }
  50%       { filter: brightness(1.18); }
}
@keyframes nlPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.7; }
}
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

---

## 6. TEMPLATE_CATALOG Updates

Six new entries to add:

```javascript
{ id: 'poster1',   name: 'Impact Poster: Centred',  tags: ['poster-first','display'],   channels: ['print-safe','screen-safe','email-safe'], visualProfile: 'poster-centred',  recommended: 'Centred authority poster. IBM-style.' },
{ id: 'poster2',   name: 'Impact Poster: Split',    tags: ['poster-first','display'],   channels: ['print-safe','screen-safe','email-safe'], visualProfile: 'poster-split',    recommended: 'Two-column split poster. Cisco-style.' },
{ id: 'poster3',   name: 'Impact Poster: Stacked',  tags: ['poster-first','display'],   channels: ['print-safe','screen-safe','email-safe'], visualProfile: 'poster-stacked',  recommended: 'Three-band stacked poster. Microsoft-style.' },
{ id: 'poster4',   name: 'Impact Poster: Command',  tags: ['poster-first','incident'],  channels: ['print-safe','screen-safe','email-safe'], visualProfile: 'poster-command',  recommended: 'High-urgency incident command poster.' },
{ id: 'poster5',   name: 'Impact Poster: Minimal',  tags: ['poster-first','minimal'],   channels: ['print-safe','screen-safe','email-safe'], visualProfile: 'poster-minimal',  recommended: 'Minimal stat poster. Apple/Google-style.' },
{ id: 'newspaper', name: 'The Cyber Gazette',       tags: ['newspaper','digest','editorial'], channels: ['email-safe','print-safe','screen-safe'], visualProfile: 'broadsheet', recommended: 'Full broadsheet newspaper layout.' },
```

---

## 7. Build Dispatcher Updates

Add to the `switch(format)` block in `build()`:
```javascript
case 'poster1':   html = buildPoster1(cfg,arts,wo,lk,p,qr,il); break;
case 'poster2':   html = buildPoster2(cfg,arts,wo,lk,p,qr,il); break;
case 'poster3':   html = buildPoster3(cfg,arts,wo,lk,p,qr,il); break;
case 'poster4':   html = buildPoster4(cfg,arts,wo,lk,p,qr,il); break;
case 'poster5':   html = buildPoster5(cfg,arts,wo,lk,p,qr,il); break;
case 'newspaper': html = buildNewspaper(cfg,arts,wo,lk,p,qr,il); break;
```

---

## 8. Test Coverage

For each new/changed template, unit tests must assert:
1. Output contains `trainingPackReportCta` marker string (SOC strip present)
2. Output contains the `c.title` value (headline rendered)
3. Output does NOT contain `reportCTA` (legacy helper fully removed)
4. Screen-safe output contains `@keyframes nlFadeIn` (animation injected)
5. Email-safe output does NOT contain `@keyframes` (animation suppressed)
6. TEMPLATE_CATALOG has exactly 20 entries

Existing 41 unit tests must continue to pass.

---

## 9. File Touched

- `js/newsletter_builder.js` — all changes confined here
