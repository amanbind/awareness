# Newsletter 20-Template Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand and redesign the newsletter builder from 14 to 20 corporate-formal, email-safe templates — rebuilding 13 existing templates with shared primitives, adding 5 impact poster formats and a broadsheet newspaper template.

**Architecture:** All changes are in a single IIFE (`js/newsletter_builder.js`). New shared primitive helpers are added first, then each template function is rewritten to use them. Six new template functions and catalog entries are appended. Screen-safe animations are injected via a new `screenSafeStyle()` helper only when `renderChannel === 'screen-safe'`.

**Tech Stack:** Vanilla JavaScript (ES5-compatible inside IIFE), table-based inline-style HTML, Node.js test runner (`node --test`).

---

## File Structure

- **Modify:** `js/newsletter_builder.js` — all changes confined to this file
- **Modify:** `tests/unit/app-modules.test.js` — update catalog count assertion from 14 → 20, add new assertions

---

## Task 1: Add shared primitive helpers

**Files:**
- Modify: `js/newsletter_builder.js` — insert helpers after `stoneSpacerTr()` (line ~220) and before the `badge()` function

### What to add

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/app-modules.test.js` — append after the last test:

```javascript
test("NewsletterBuilder catalog exposes 20 accessible template definitions", () => {
  const context = createContext();
  loadScript(context, "js/newsletter_builder.js");
  const catalog = context.App.NewsletterBuilder.getTemplateCatalog();
  assert.equal(catalog.length, 20);
  assert.ok(catalog.every((t) => t.id && t.name));
  assert.ok(catalog.every((t) => t.accessibility.contrastSafe));
});

test("NewsletterBuilder poster1 output contains title and SOC strip", () => {
  const context = createContext();
  loadScript(context, "js/newsletter_builder.js");
  const html = context.App.NewsletterBuilder.build(
    "poster1",
    { org: "ACME", soc: "soc@acme.test", freq: "Weekly", title: "Lock It Down" },
    [],
    { useLinks: false, usePoster: false, useQR: false, useIllus: false }
  );
  assert.ok(html.includes("Lock It Down"), "poster1 must embed c.title");
  assert.ok(html.includes("SEE SOMETHING SUSPICIOUS"), "poster1 must have SOC strip");
  assert.ok(!html.includes("@keyframes"), "email-safe poster1 must not have animations");
});

test("NewsletterBuilder poster1 screen-safe output contains keyframes", () => {
  const context = createContext();
  loadScript(context, "js/newsletter_builder.js");
  const html = context.App.NewsletterBuilder.build(
    "poster1",
    { org: "ACME", soc: "soc@acme.test", freq: "Weekly", title: "Zero Trust" },
    [],
    { renderChannel: "screen-safe", useLinks: false, usePoster: false, useQR: false, useIllus: false }
  );
  assert.ok(html.includes("@keyframes nlFadeIn"), "screen-safe poster1 must inject animations");
});

test("NewsletterBuilder newspaper output contains masthead and columns", () => {
  const context = createContext();
  loadScript(context, "js/newsletter_builder.js");
  const arts = [
    { type: "Phishing", title: "Staff targeted by invoice scam", summary: "Finance team received fake invoices.", threatLevel: 3, watchouts: ["Verify sender", "Call before paying"] },
    { type: "Malware", title: "Ransomware hits logistics sector", summary: "Three firms encrypted.", threatLevel: 4, watchouts: [] },
    { type: "Data Breach", title: "Supplier portal exposed records", summary: "10k records exposed.", threatLevel: 3, watchouts: [] }
  ];
  const html = context.App.NewsletterBuilder.build(
    "newspaper",
    { org: "ACME", soc: "soc@acme.test", freq: "Weekly", title: "Cyber Intelligence Report" },
    arts,
    { useLinks: false, usePoster: false, useQR: false, useIllus: false }
  );
  assert.ok(html.includes("THE CYBER GAZETTE"), "newspaper must have masthead");
  assert.ok(html.includes("EDITOR'S PICK"), "newspaper must have editor's pick column");
  assert.ok(html.includes("SEE SOMETHING SUSPICIOUS"), "newspaper must have SOC strip");
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
cd c:\Users\manka\Downloads\awareness
npm run test:unit
```

Expected: existing 41 pass, 4 new tests fail with function not found / catalog.length !== 20.

- [ ] **Step 3: Also update the existing catalog count test**

In `tests/unit/app-modules.test.js`, find:
```javascript
test("NewsletterBuilder catalog exposes the 14 accessible template definitions", () => {
```
Change `14` to `20` in both the test name and the assertion:
```javascript
test("NewsletterBuilder catalog exposes the 20 accessible template definitions", () => {
  // ...
  assert.equal(catalog.length, 20);
```

- [ ] **Step 4: Add `screenSafeStyle()`, `goldGradientBar()`, `darkMasthead()`, `goldBannerStrip()`, `gradientFade()`, `sectionBand()`, `articleCard()`, `animFadeIn()`, `animSlideUp()`, `animSlideLeft()`, `animSlideRight()` helpers to `newsletter_builder.js`**

Insert the following block in `js/newsletter_builder.js` immediately after the `trainingPackReportCta` function (after line ~248, before the `badge()` function):

```javascript
  // ── Animation helpers (screen-safe only) ──

  function screenSafeStyle() {
    return `<!--[if !mso]><!----><style>
@keyframes nlFadeIn{from{opacity:0}to{opacity:1}}
@keyframes nlSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes nlSlideLeft{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
@keyframes nlSlideRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@keyframes nlShimmer{0%,100%{filter:brightness(1)}50%{filter:brightness(1.18)}}
@keyframes nlPulse{0%,100%{opacity:1}50%{opacity:.7}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style><!----><![endif]-->`;
  }

  function animFadeIn(delayMs, dur) {
    return `animation:nlFadeIn ${dur||'0.6s'} ease both;animation-delay:${delayMs||0}ms;`;
  }
  function animSlideUp(delayMs) {
    return `animation:nlSlideUp 0.4s ease both;animation-delay:${delayMs||0}ms;`;
  }
  function animSlideLeft(delayMs) {
    return `animation:nlSlideLeft 0.5s ease both;animation-delay:${delayMs||0}ms;`;
  }
  function animSlideRight(delayMs) {
    return `animation:nlSlideRight 0.5s ease both;animation-delay:${delayMs||0}ms;`;
  }

  // ── Shared layout primitives ──

  /** 5px gold gradient top bar */
  function goldGradientBar() {
    return tbc('', 'height="5" style="height:5px;line-height:5px;font-size:1px;background:linear-gradient(135deg,#C09010,#D4A420);background-color:#D4A420;"');
  }

  /**
   * Standard dark masthead.
   * @param {object} c  — config (title, freq, issueDate, nlKicker)
   * @param {string} subtitle — kicker suffix e.g. 'Security Alert'
   * @param {boolean} screenSafe — inject animation styles
   */
  function darkMasthead(c, subtitle, screenSafe) {
    const kicker = escapeHtml(mastheadKicker(c, `${c.freq || 'Weekly'} ${subtitle || 'Security Alert'}`));
    const title  = escapeHtml(c.title || 'Stay Secure');
    const date   = escapeHtml(String(fmtDate(c.issueDate || new Date())).toUpperCase());
    const animH  = screenSafe ? `style="${animFadeIn(0)}"` : '';
    const animS  = screenSafe ? `style="${animFadeIn(150)}"` : '';
    return `${tbc(
      `${screenSafe ? screenSafeStyle() : ''}<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle">
        <span ${animH} style="font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(212,164,32,0.75);font-weight:bold;${NLFF}">${kicker}</span><br><br>
        <span ${animS} style="font-size:27px;font-weight:bold;color:#FFFFFF;line-height:1.1;${NLFF_SERIF}">${title}</span><br><br>
        <span style="font-size:9px;color:rgba(255,255,255,0.28);letter-spacing:0.1em;${NLFF}">${date} · Staff security briefing</span>
      </td></tr></table>`,
      'bgcolor="#0A0A0A" style="padding:29px 35px 24px;background-color:#0A0A0A;margin:0;"'
    )}`;
  }

  /** Full-width gold banner strip */
  function goldBannerStrip(text) {
    return tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#C09010" style="padding:10px;background-color:#C09010;font-size:11px;font-weight:bold;letter-spacing:0.16em;text-transform:uppercase;color:#FFFFFF;${NLFF}">${escapeHtml(text)}</td></tr></table>`,
      'style="padding:0;margin:0;"'
    );
  }

  /** 40px dark-to-transparent gradient beneath masthead */
  function gradientFade() {
    return tbc('', 'height="40" style="height:40px;font-size:1px;line-height:40px;background:linear-gradient(to bottom,rgba(0,0,0,0.9) 0%,rgba(0,0,0,0) 100%);background-color:#0A0A0A;"');
  }

  /** Full-width section label band */
  function sectionBand(label, bg, fg) {
    const _bg = bg || '#0A0A0A';
    const _fg = fg || '#D4A420';
    return `${tbl()}${tbc(
      `<span style="font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:${_fg};font-weight:bold;${NLFF}">${escapeHtml(label)}</span>`,
      `bgcolor="${_bg}" style="padding:10px 22px;background-color:${_bg};margin:0;"`
    )}${tblx()}`;
  }

  /**
   * Standard article card (chat-style bubbles, rounded corners).
   * Matches Template 3 (Team Chat) reference HTML.
   * @param {object} a   — article {type, title, summary, watchouts[]}
   * @param {number} idx — 0-based index for badge label
   * @param {object} c   — config
   * @param {boolean} screenSafe
   */
  function articleCard(a, idx, c, screenSafe) {
    const num      = String(idx + 1).padStart(2, '0');
    const anim     = screenSafe ? `style="${animSlideUp(idx * 100)}"` : '';
    const typeText = escapeHtml((a.type || 'Security').toUpperCase());
    const titleText= escapeHtml(a.title || '');
    const summary  = escapeHtml((a.summary || a.description || '').split('. ').slice(0, 3).join('. '));
    const wos      = Array.isArray(a.watchouts) ? a.watchouts.slice(0, 1) : [];
    const woText   = wos.length ? escapeHtml(wos[0]) : 'Stay vigilant and report anything suspicious to your IT team.';

    return `${tbl()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0" ${anim} style="background:white;border:1px solid #E8E2D8;border-radius:10px;overflow:hidden;">
        <tr><td bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:10px 16px;border-radius:10px 10px 0 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="36" valign="middle"><table cellpadding="0" cellspacing="0" border="0" width="36" height="36"><tr><td align="center" valign="middle" width="36" height="36" bgcolor="#B8860B" style="background-color:#B8860B;border-radius:50%;font-size:14px;color:#FFFFFF;font-weight:bold;${NLFF}">${num}</td></tr></table></td>
            <td style="padding-left:10px;">
              <span style="font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:#D4A420;font-weight:bold;${NLFF}">${typeText}</span><br>
              <span style="font-size:15px;font-weight:bold;color:#FFFFFF;line-height:1.2;${NLFF_SERIF}">${titleText}</span>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:14px 16px 10px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
            <tr><td align="left"><table border="0" cellpadding="0" cellspacing="0" style="max-width:85%;">
              <tr><td style="background:#FFF8E7;border:1px solid rgba(184,134,11,0.2);border-radius:12px 12px 12px 4px;padding:10px 14px;font-size:13px;color:#333333;line-height:1.55;${NLFF}">
                <strong>What Happened:</strong> ${summary}
              </td></tr>
            </table></td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="right"><table border="0" cellpadding="0" cellspacing="0" style="max-width:85%;">
              <tr>
                <td style="background:#0A0A0A;border-radius:12px 12px 4px 12px;padding:10px 14px;font-size:13px;color:#FFFFFF;line-height:1.55;${NLFF}">
                  <span style="font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:#D4A420;font-weight:bold;">&#10003; What to do</span><br>${woText}
                </td>
                <td width="30" valign="bottom" style="padding-left:8px;"><table cellpadding="0" cellspacing="0" border="0" width="30" height="30"><tr><td align="center" valign="middle" width="30" height="30" bgcolor="#27AE60" style="background-color:#27AE60;border-radius:50%;font-size:10px;font-weight:bold;color:#FFFFFF;${NLFF}">IT</td></tr></table></td>
              </tr>
            </table></td></tr>
          </table>
        </td></tr>
      </table>`,
      'style="padding:0 0 16px 0;margin:0;"'
    )}${tblx()}`;
  }
```

- [ ] **Step 5: Run tests**

```
cd c:\Users\manka\Downloads\awareness
npm run test:unit
```

Expected: same 41+1 original tests pass. New 4 still fail (templates not built yet). Zero errors on existing tests.

---

## Task 2: Restyle templates 2–5 using shared primitives

**Files:**
- Modify: `js/newsletter_builder.js` — `buildKnowBe4Style`, `buildPeopleTalking`, `buildSpotThePhish`, `buildQuickRules`

- [ ] **Step 1: Replace `buildKnowBe4Style` masthead + articles**

Find `function buildKnowBe4Style` (~line 468). Replace the header section (everything before article cards) and the article card loop with:

```javascript
  function buildKnowBe4Style(c, arts, wo, lk, poster, qr, illus) {
    const screenSafe = false; // controlled by applyRenderProfile; primitives inject per renderChannel
    const cards = arts.slice(0, 4).map((a, i) => articleCard(a, i, c, screenSafe)).join('');
    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${darkMasthead(c, 'Training Alert', screenSafe)}${goldBannerStrip('SECURITY AWARENESS — KNOW THE THREATS')}${gradientFade()}${tbc(
      cards,
      'bgcolor="#F5F1EA" style="padding:20px 28px 8px;background-color:#F5F1EA;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }
```

- [ ] **Step 2: Replace `buildPeopleTalking` masthead + articles**

Find `function buildPeopleTalking` (~line 560). Replace with:

```javascript
  function buildPeopleTalking(c, arts, wo, lk, poster, qr, illus) {
    const screenSafe = false;
    const cards = arts.slice(0, 4).map((a, i) => articleCard(a, i, c, screenSafe)).join('');
    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${darkMasthead(c, 'Team Security Briefing', screenSafe)}${goldBannerStrip('THINK BEFORE YOU CLICK · PROTECT YOUR TEAM')}${gradientFade()}${tbc(
      cards,
      'bgcolor="#F5F1EA" style="padding:20px 28px 8px;background-color:#F5F1EA;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }
```

- [ ] **Step 3: Add `sectionBand` to `buildSpotThePhish`**

Find `buildSpotThePhish` (~line 623). After the `statCells` row and before the red/green blocks, insert `${sectionBand('PHISHING AWARENESS — KNOW THE SIGNS')}`. Also change the green accent bar at the top from `#27AE60` to the gold gradient bar using `goldGradientBar()`. Change the masthead kicker colour from green to gold: replace `color:#27AE60` → `color:#D4A420`.

- [ ] **Step 4: Add `sectionBand` + `darkMasthead` to `buildQuickRules`**

Find `buildQuickRules` (~line 680). Replace the custom dark masthead block with `${goldGradientBar()}${darkMasthead(c, 'Quick Safety Rules', false)}`. Replace the green banner strip with `${goldBannerStrip(`${tips.length} RULES EVERY EMPLOYEE MUST FOLLOW`)}`.

- [ ] **Step 5: Run tests**

```
cd c:\Users\manka\Downloads\awareness
npm run test:unit
```

Expected: 45 tests pass (41 original + 4 new still failing for poster1/newspaper). Zero errors.

---

## Task 3: Restyle templates 6–9

**Files:**
- Modify: `js/newsletter_builder.js` — `buildRedFlags`, `buildStopLookReport`, `buildEmailAnatomy`, `buildDoVsDont`

- [ ] **Step 1: Update `buildRedFlags` masthead**

Find `buildRedFlags` (~line 752). Replace the opening `${tbc('', 'height="5" bgcolor="#E74C3C"...')}${tbc(header...)}${tbc(banner...)}` block with:

```javascript
    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${darkMasthead(c, 'Red Flags Checklist', false)}${goldBannerStrip('IF YOU SEE ANY OF THESE — STOP AND REPORT IT')}${gradientFade()}${tbc(
      flagList + bottomBanner,
      'bgcolor="#FFFFFF" style="padding:0;margin:0;background-color:#FFFFFF;"'
    )}${tbc(
      `${sectionBand('RECENT REAL-WORLD THREATS')}${artBlock}`,
      'bgcolor="#0A0A0A" style="padding:0 18px 18px;background-color:#0A0A0A;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
```

Where `bottomBanner` is the existing green "When in doubt" strip at the bottom of `flagList`.

- [ ] **Step 2: Update `buildStopLookReport` masthead**

Find `buildStopLookReport` (~line 807). Replace opening bar/masthead with:

```javascript
    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${darkMasthead(c, '3-Step Response Protocol', false)}${goldBannerStrip('STOP · LOOK · REPORT — YOUR 3-STEP DEFENCE')}${gradientFade()}${tbc(threeCol, 'style="padding:0;margin:0;"')}${sectionBand('THIS WEEK\'S REAL THREATS')}${tbc(
      artBrief,
      'bgcolor="#0A0A0A" style="padding:0 18px 18px;background-color:#0A0A0A;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
```

- [ ] **Step 3: Update `buildEmailAnatomy` masthead**

Find `buildEmailAnatomy` (~line 849). Replace red bar + header block with:

```javascript
    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${darkMasthead(c, 'Email Anatomy', false)}${goldBannerStrip('LEARN TO READ EMAILS LIKE A DETECTIVE')}${gradientFade()}${tbc(
      fakeEmail + defence + `${sectionBand('RECENT REAL THREATS (CREAM BG)')}` + realThreats,
      'bgcolor="#FAF8F5" style="padding:18px 22px;background-color:#FAF8F5;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
```

- [ ] **Step 4: Update `buildDoVsDont` masthead**

Find `buildDoVsDont`. Replace the custom masthead with:

```javascript
    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${darkMasthead(c, 'Security Behaviour Guide', false)}${goldBannerStrip('SECURITY BEHAVIOUR GUIDE — DO VS. DON\'T')}${gradientFade()}${tbc(
      splitTable,
      'bgcolor="#FFFFFF" style="padding:0;margin:0;background-color:#FFFFFF;"'
    )}${sectionBand('RECENT THREATS')}${tbc(
      artBrief,
      'bgcolor="#0A0A0A" style="padding:0 18px 18px;background-color:#0A0A0A;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
```

- [ ] **Step 5: Run tests**

```
cd c:\Users\manka\Downloads\awareness
npm run test:unit
```

Expected: 45 tests pass. Zero errors.

---

## Task 4: Restyle templates 10–14

**Files:**
- Modify: `js/newsletter_builder.js` — `buildThreatSpotlight`, `buildIncidentTimeline`, `buildAwarenessScorecard`, `buildCyberSecurityTimes`, `buildTestTemplate`

- [ ] **Step 1: Update `buildThreatSpotlight` masthead**

Find `buildThreatSpotlight`. Replace custom red/dark bar + header with:

```javascript
    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${darkMasthead(c, 'Threat Intelligence Briefing', false)}${goldBannerStrip('THREAT SPOTLIGHT — INTELLIGENCE BRIEFING')}${gradientFade()}${tbc(
      contentBlock,
      'bgcolor="#F5F1EA" style="padding:24px 32px;background-color:#F5F1EA;margin:0;"'
    )}${sectionBand('SECURITY RECOMMENDATIONS')}${tbc(
      recoBlock,
      'bgcolor="#0A0A0A" style="padding:16px 22px;background-color:#0A0A0A;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
```

- [ ] **Step 2: Update `buildIncidentTimeline` masthead**

Find `buildIncidentTimeline`. Replace custom masthead with `${goldGradientBar()}${darkMasthead(c, 'Incident Timeline', false)}${goldBannerStrip('INCIDENT RESPONSE TIMELINE')}${gradientFade()}`. Add `${sectionBand('INCIDENT SUMMARY')}` before the timeline events block.

- [ ] **Step 3: Update `buildAwarenessScorecard` masthead**

Find `buildAwarenessScorecard`. Replace custom masthead with `${goldGradientBar()}${darkMasthead(c, 'Awareness Scorecard', false)}${goldBannerStrip('SECURITY AWARENESS METRICS')}${gradientFade()}`.

- [ ] **Step 4: Full rebuild of `buildCyberSecurityTimes` as broadsheet newspaper**

Find `function buildCyberSecurityTimes` and replace the entire function body with the newspaper layout:

```javascript
  function buildCyberSecurityTimes(c, arts, wo, lk, poster, qr, illus) {
    const screenSafe = false;
    const topArt  = arts[0] || { type:'Security', title:'Weekly Security Briefing', summary:'Stay vigilant this week.', watchouts:[] };
    const colArts = arts.slice(1, 4);
    const orgEsc  = escapeHtml((c.org || '').trim());
    const socEsc  = escapeHtml((c.soc || '').trim());
    const socAttr = escAttr(`mailto:${(c.soc||'').trim()}`);
    const dateStr = String(fmtDate(c.issueDate || new Date())).toUpperCase();
    const portalLink = (c.portal && lk)
      ? `<a href="${escAttr(c.portal)}" style="color:#0A0A0A;text-decoration:none;${NLFF}">&#8599; ${escapeHtml(c.pname || 'Visit Portal')}</a>`
      : '';

    // Masthead
    const masthead = `${tbl()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding:24px 32px 8px;">
          <span style="font-size:34px;font-weight:bold;color:#0A0A0A;letter-spacing:0.04em;${NLFF_SERIF}">THE CYBER GAZETTE</span><br>
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="2" bgcolor="#D4A420" style="background-color:#D4A420;height:2px;font-size:1px;line-height:2px;">&nbsp;</td></tr></table>
          <br><span style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#555555;${NLFF}">${dateStr} &nbsp;·&nbsp; ${escapeHtml(c.org || 'Security Intelligence')} &nbsp;·&nbsp; Staff Edition</span>
        </td></tr>
      </table>`,
      'bgcolor="#FFFFFF" style="padding:0;margin:0;background-color:#FFFFFF;"'
    )}${tblx()}`;

    // Thick rule
    const rule = `${tbl()}${tbc('', 'height="3" bgcolor="#0A0A0A" style="background-color:#0A0A0A;height:3px;font-size:1px;line-height:3px;"')}${tblx()}`;
    const thinRule = `${tbl()}${tbc('', 'height="1" bgcolor="#CCCCCC" style="background-color:#CCCCCC;height:1px;font-size:1px;line-height:1px;"')}${tblx()}`;

    // Lead story (65% left + 35% right editor's pick)
    const topSummary = escapeHtml((topArt.summary || topArt.description || '').split('.').slice(0,4).join('.'));
    const editorPicks = (Array.isArray(topArt.watchouts) ? topArt.watchouts : []).slice(0,3)
      .map(w => `<li style="font-size:12px;color:#444444;line-height:1.6;margin-bottom:4px;${NLFF_SERIF}">${escapeHtml(w)}</li>`)
      .join('');
    const leadStory = `${tbl()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="65%" valign="top" style="padding:20px 20px 20px 24px;border-right:1px solid #DDDDDD;">
            <span style="font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#C09010;font-weight:bold;${NLFF}">${escapeHtml(topArt.type || 'SECURITY')}</span><br><br>
            <span style="font-size:22px;font-weight:bold;color:#0A0A0A;line-height:1.2;${NLFF_SERIF}">${escapeHtml(topArt.title)}</span><br><br>
            <span style="font-size:10px;color:#888888;font-style:italic;${NLFF_SERIF}">${orgEsc} Security Team &nbsp;·&nbsp; ${dateStr}</span><br><br>
            <span style="font-size:13px;color:#333333;line-height:1.7;${NLFF}">${topSummary}.</span>
          </td>
          <td width="35%" valign="top" style="padding:20px 24px 20px 16px;">
            <span style="font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:#C09010;font-weight:bold;${NLFF}">EDITOR'S PICK</span><br>
            <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" bgcolor="#C09010" style="background-color:#C09010;height:1px;font-size:1px;">&nbsp;</td></tr></table>
            <br>
            <span style="font-size:12px;color:#555555;font-style:italic;${NLFF_SERIF}">Key takeaways this week:</span><br><br>
            <ul style="margin:0;padding:0 0 0 16px;">${editorPicks || `<li style="font-size:12px;color:#444444;line-height:1.6;${NLFF_SERIF}">Stay vigilant and report suspicious emails promptly.</li>`}</ul>
          </td>
        </tr>
      </table>`,
      'bgcolor="#FFFFFF" style="padding:0;background-color:#FFFFFF;margin:0;"'
    )}${tblx()}`;

    // 3-column supporting stories
    const colWidth = Math.floor(100 / Math.max(colArts.length, 1));
    const cols = colArts.map(a => {
      const colSum = escapeHtml((a.summary||a.description||'').split('.').slice(0,2).join('.'));
      const readLink = (lk && a.url) ? `<br><br><a href="${escAttr(a.url)}" style="font-size:10px;color:#C09010;font-weight:bold;text-decoration:none;letter-spacing:0.06em;text-transform:uppercase;${NLFF}">READ MORE &#8599;</a>` : '';
      return `<td valign="top" width="${colWidth}%" style="padding:16px 14px;border-right:1px solid #EEEEEE;">
        <span style="font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#C09010;font-weight:bold;${NLFF}">${escapeHtml(a.type||'Security')}</span><br><br>
        <span style="font-size:14px;font-weight:bold;color:#0A0A0A;line-height:1.3;${NLFF_SERIF}">${escapeHtml(a.title)}</span><br><br>
        <span style="font-size:12px;color:#555555;line-height:1.6;${NLFF}">${colSum}.</span>${readLink}
      </td>`;
    }).join('');
    const threeCol = colArts.length ? `${tbl()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cols}</tr></table>`,
      'bgcolor="#FAFAF7" style="padding:0;background-color:#FAFAF7;margin:0;"'
    )}${tblx()}` : '';

    // Pull quote
    const pullQuote = wo[0] ? `${tbl()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="4" bgcolor="#D4A420" style="background-color:#D4A420;">&nbsp;</td>
        <td style="padding:16px 24px;">
          <span style="font-size:18px;color:#0A0A0A;font-style:italic;line-height:1.4;${NLFF_SERIF}">"${escapeHtml(wo[0])}"</span><br><br>
          <span style="font-size:10px;color:#888888;letter-spacing:0.1em;text-transform:uppercase;${NLFF}">${orgEsc} Security Team</span>
        </td>
      </tr></table>`,
      'bgcolor="#F5F1EA" style="padding:16px 24px;background-color:#F5F1EA;margin:0;"'
    )}${tblx()}` : '';

    return `${nlOuterOpen()}${tbl()}${masthead}${rule}${leadStory}${rule}${threeCol}${thinRule}${pullQuote}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }
```

- [ ] **Step 5: Add `screenSafeStyle()` to `buildTestTemplate`**

Find `buildTestTemplate`. At the very beginning of the returned HTML string, insert `${screenSafe ? screenSafeStyle() : ''}` where `screenSafe` is derived from `renderOpts` passed down. Since `buildTestTemplate` doesn't receive `renderOpts` directly, the simplest approach: add `sectionBand('SECURITY DISPATCH')` before the first article card, and leave animations to be added in a future pass.

- [ ] **Step 6: Run tests**

```
cd c:\Users\manka\Downloads\awareness
npm run test:unit
```

Expected: all 45 tests pass (including the newspaper test which now passes). Zero errors.

---

## Task 5: Add 5 poster templates (poster1–poster5)

**Files:**
- Modify: `js/newsletter_builder.js` — add 5 new build functions before the `build()` dispatcher, add 5 catalog entries, add 5 switch cases

- [ ] **Step 1: Add `buildPoster1` — Centred authority poster (IBM-style)**

Insert before `build()`:

```javascript
  // ══════════════════════════════════════════════════
  //  POSTER 1: IMPACT POSTER — CENTRED (IBM-style)
  // ══════════════════════════════════════════════════
  function buildPoster1(c, arts, wo, lk, poster, qr, illus) {
    const title   = escapeHtml(c.title || 'Protect What Matters');
    const kicker  = escapeHtml(`${c.freq || 'WEEKLY'} SECURITY NOTICE`);
    const tagline = escapeHtml((wo[0] || c.nlCorporateTopicBlurb || 'Your actions protect everyone.').slice(0, 120));
    const orgLine = escapeHtml((c.org || '').trim());
    const socEsc  = escapeHtml((c.soc || '').trim());
    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding:64px 48px;">
          <span style="font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(212,164,32,0.75);font-weight:bold;${NLFF}">${kicker}</span><br><br>
          <span style="font-size:42px;font-weight:bold;color:#FFFFFF;line-height:1.1;text-align:center;display:block;${NLFF_SERIF}">${title}</span><br>
          <table width="160" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td height="2" bgcolor="#D4A420" style="background-color:#D4A420;height:2px;font-size:1px;">&nbsp;</td></tr></table><br>
          <span style="font-size:14px;color:rgba(255,255,255,0.7);line-height:1.6;text-align:center;display:block;${NLFF}">${tagline}</span>
        </td></tr>
      </table>`,
      'bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:0;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(
      `<span style="font-size:10px;color:rgba(255,255,255,0.25);letter-spacing:0.06em;${NLFF}">${orgLine} · ${socEsc}</span>`,
      'align="center" bgcolor="#0A0A0A" style="padding:12px 24px 18px;background-color:#0A0A0A;margin:0;"'
    )}${tblx()}${nlOuterClose()}`;
  }
```

- [ ] **Step 2: Add `buildPoster2` — Split two-column poster (Cisco-style)**

```javascript
  // ══════════════════════════════════════════════════
  //  POSTER 2: IMPACT POSTER — SPLIT (Cisco-style)
  // ══════════════════════════════════════════════════
  function buildPoster2(c, arts, wo, lk, poster, qr, illus) {
    const title   = escapeHtml(c.title || 'Never Trust. Always Verify.');
    const kicker  = escapeHtml(`${c.freq || 'WEEKLY'} SECURITY NOTICE`);
    const body    = escapeHtml((wo[0] || 'Verify every request. Report every doubt.').slice(0, 150));
    const statLabel = escapeHtml((arts[0] && arts[0].type) ? arts[0].type.toUpperCase() : 'ZERO TRUST');
    const statNum   = escapeHtml((arts[0] && arts[0].threatLevel) ? `LEVEL ${arts[0].threatLevel}` : 'ALERT');
    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="55%" valign="middle" bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:48px 32px;">
            <span style="font-size:9px;letter-spacing:0.24em;text-transform:uppercase;color:rgba(212,164,32,0.7);font-weight:bold;${NLFF}">${kicker}</span><br><br>
            <span style="font-size:32px;font-weight:bold;color:#FFFFFF;line-height:1.15;${NLFF_SERIF}">${title}</span><br><br>
            <table width="48" cellpadding="0" cellspacing="0" border="0"><tr><td height="2" bgcolor="#D4A420" style="background-color:#D4A420;height:2px;font-size:1px;">&nbsp;</td></tr></table><br>
            <span style="font-size:13px;color:rgba(255,255,255,0.65);line-height:1.65;${NLFF}">${body}</span>
          </td>
          <td width="45%" valign="middle" align="center" bgcolor="#F5F1EA" style="background-color:#F5F1EA;padding:48px 24px;">
            <span style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#C09010;font-weight:bold;${NLFF}">${statLabel}</span><br><br>
            <span style="font-size:64px;font-weight:bold;color:#0A0A0A;line-height:1;${NLFF_SERIF}">${statNum}</span><br><br>
            <span style="font-size:11px;color:#888888;line-height:1.5;${NLFF}">Current threat classification</span>
          </td>
        </tr>
      </table>`,
      'style="padding:0;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }
```

- [ ] **Step 3: Add `buildPoster3` — Stacked three-band poster (Microsoft-style)**

```javascript
  // ══════════════════════════════════════════════════
  //  POSTER 3: IMPACT POSTER — STACKED (Microsoft-style)
  // ══════════════════════════════════════════════════
  function buildPoster3(c, arts, wo, lk, poster, qr, illus) {
    const title  = escapeHtml(c.title || 'Protect What Matters');
    const kicker = escapeHtml(`${c.freq || 'WEEKLY'} SECURITY NOTICE`);
    const points = [
      escapeHtml((wo[0] || 'Think before you click any link.').slice(0,80)),
      escapeHtml((wo[1] || 'Verify senders before you share anything.').slice(0,80)),
      escapeHtml((wo[2] || 'Report suspicious messages immediately.').slice(0,80))
    ];
    const socAttr = escAttr(`mailto:${(c.soc||'').trim()}`);
    const socEsc  = escapeHtml((c.soc||'').trim());
    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${tbc(
      `<span style="font-size:9px;letter-spacing:0.24em;text-transform:uppercase;color:rgba(212,164,32,0.75);font-weight:bold;${NLFF}">${kicker}</span><br><br>
       <span style="font-size:36px;font-weight:bold;color:#FFFFFF;line-height:1.1;${NLFF_SERIF}">${title}</span>`,
      'bgcolor="#0A0A0A" style="padding:40px 40px 32px;background-color:#0A0A0A;margin:0;"'
    )}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">${points.map((p,i)=>`<tr><td style="padding:14px 40px;border-bottom:1px solid #E0DAD0;"><span style="font-size:13px;color:#0A0A0A;font-weight:bold;${NLFF_SERIF}"><span style="color:#C09010;font-size:22px;vertical-align:middle;">${i+1}. </span>${p}</span></td></tr>`).join('')}</table>`,
      'bgcolor="#F5F1EA" style="padding:0;background-color:#F5F1EA;margin:0;"'
    )}${tbc(
      `<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td bgcolor="#C09010" style="background-color:#C09010;border-radius:5px;padding:14px 24px;text-align:center;">
        <a href="${socAttr}" style="color:#FFFFFF;font-size:13px;font-weight:bold;text-decoration:none;letter-spacing:0.06em;${NLFF}">REPORT TO ${socEsc}</a>
      </td></tr></table>`,
      'bgcolor="#0A0A0A" style="padding:28px;background-color:#0A0A0A;text-align:center;margin:0;"'
    )}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }
```

- [ ] **Step 4: Add `buildPoster4` — Command / high-urgency poster (Proofpoint-style)**

```javascript
  // ══════════════════════════════════════════════════
  //  POSTER 4: IMPACT POSTER — COMMAND (High-urgency)
  // ══════════════════════════════════════════════════
  function buildPoster4(c, arts, wo, lk, poster, qr, illus) {
    const title   = escapeHtml((c.title || 'Security Alert').toUpperCase());
    const sub     = escapeHtml((arts[0] && arts[0].summary ? arts[0].summary : (wo[0] || 'Immediate action required. Stay vigilant.')).split('.').slice(0,2).join('.'));
    const socEsc  = escapeHtml((c.soc||'').trim());
    return `${nlOuterOpen()}${tbl()}${tbc(
      `<span style="font-size:13px;font-weight:bold;letter-spacing:0.24em;text-transform:uppercase;color:#FFFFFF;${NLFF}">SECURITY ALERT</span>`,
      'align="center" bgcolor="#C09010" style="padding:14px;background-color:#C09010;margin:0;"'
    )}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding:52px 40px 40px;">
          <span style="font-size:44px;font-weight:bold;color:#FFFFFF;line-height:1.05;text-align:center;display:block;letter-spacing:0.03em;${NLFF_SERIF}">${title}</span><br><br>
          <span style="font-size:14px;color:rgba(255,255,255,0.65);line-height:1.6;text-align:center;display:block;${NLFF}">${sub}.</span>
        </td></tr>
      </table>`,
      'bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:0;margin:0;"'
    )}${tbc(
      `<span style="font-size:12px;font-weight:bold;letter-spacing:0.18em;text-transform:uppercase;color:#FFFFFF;${NLFF}">REPORT IMMEDIATELY · ${socEsc}</span>`,
      'align="center" bgcolor="#C09010" style="padding:16px;background-color:#C09010;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }
```

- [ ] **Step 5: Add `buildPoster5` — Minimal stat poster (Apple/Google-style)**

```javascript
  // ══════════════════════════════════════════════════
  //  POSTER 5: IMPACT POSTER — MINIMAL (Apple-style)
  // ══════════════════════════════════════════════════
  function buildPoster5(c, arts, wo, lk, poster, qr, illus) {
    const statRaw  = (wo[0] || '').replace(/[^0-9A-Za-z%+\-]/g, '').slice(0, 6) || '100%';
    const stat     = escapeHtml(statRaw);
    const sentence = escapeHtml((wo[1] || wo[0] || c.title || 'Every click is a security decision.').slice(0, 100));
    const kicker   = escapeHtml(`${c.freq || 'WEEKLY'} SECURITY NOTICE`);
    const orgLine  = escapeHtml((c.org || '').trim());
    return `${nlOuterOpen()}${tbl()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #D4A420;">
        <tr><td align="center" style="padding:56px 48px 48px;">
          <span style="font-size:8px;letter-spacing:0.32em;text-transform:uppercase;color:#C09010;font-weight:bold;${NLFF}">${kicker}</span><br><br>
          <span style="font-size:96px;font-weight:bold;color:#0A0A0A;line-height:1;${NLFF_SERIF}">${stat}</span><br><br>
          <span style="font-size:16px;color:#333333;line-height:1.5;${NLFF}">${sentence}</span><br><br>
          <span style="font-size:10px;color:#AAAAAA;${NLFF}">${orgLine}</span>
        </td></tr>
      </table>`,
      'bgcolor="#FFFFFF" style="padding:24px;background-color:#FFFFFF;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }
```

- [ ] **Step 6: Add 6 new catalog entries to `TEMPLATE_CATALOG`**

Find `const TEMPLATE_CATALOG = [` and append before the closing `];`:

```javascript
    { id: 'poster1',   name: 'Impact Poster: Centred',  tags: ['poster-first','display'],        channels: ['print-safe','screen-safe','email-safe'], visualProfile: 'poster-centred',  recommended: 'Centred authority poster. IBM-style.' },
    { id: 'poster2',   name: 'Impact Poster: Split',    tags: ['poster-first','display'],        channels: ['print-safe','screen-safe','email-safe'], visualProfile: 'poster-split',    recommended: 'Two-column split poster. Cisco-style.' },
    { id: 'poster3',   name: 'Impact Poster: Stacked',  tags: ['poster-first','display'],        channels: ['print-safe','screen-safe','email-safe'], visualProfile: 'poster-stacked',  recommended: 'Three-band stacked poster. Microsoft-style.' },
    { id: 'poster4',   name: 'Impact Poster: Command',  tags: ['poster-first','incident'],       channels: ['print-safe','screen-safe','email-safe'], visualProfile: 'poster-command',  recommended: 'High-urgency incident command poster.' },
    { id: 'poster5',   name: 'Impact Poster: Minimal',  tags: ['poster-first','minimal'],        channels: ['print-safe','screen-safe','email-safe'], visualProfile: 'poster-minimal',  recommended: 'Minimal stat poster. Apple/Google-style.' },
    { id: 'newspaper', name: 'The Cyber Gazette',       tags: ['newspaper','digest','editorial'],channels: ['email-safe','print-safe','screen-safe'], visualProfile: 'broadsheet',      recommended: 'Full broadsheet newspaper layout.' },
```

- [ ] **Step 7: Add 6 new switch cases to `build()`**

Find `case 'testbrief':` and add before the `default:` case:

```javascript
      case 'poster1':   html = buildPoster1(cfg,arts,wo,lk,p,qr,il); break;
      case 'poster2':   html = buildPoster2(cfg,arts,wo,lk,p,qr,il); break;
      case 'poster3':   html = buildPoster3(cfg,arts,wo,lk,p,qr,il); break;
      case 'poster4':   html = buildPoster4(cfg,arts,wo,lk,p,qr,il); break;
      case 'poster5':   html = buildPoster5(cfg,arts,wo,lk,p,qr,il); break;
      case 'newspaper': html = buildCyberSecurityTimes(cfg,arts,wo,lk,p,qr,il); break;
```

Wait — `newspaper` and `cybertimes` should both route to the rebuilt `buildCyberSecurityTimes` since the newspaper IS the rebuilt cybertimes. Adjust: keep `case 'cybertimes'` pointing to `buildCyberSecurityTimes`, and add `case 'newspaper': html = buildCyberSecurityTimes(cfg,arts,wo,lk,p,qr,il); break;` as an alias.

- [ ] **Step 8: Run full test suite**

```
cd c:\Users\manka\Downloads\awareness
npm run test:unit
```

Expected: **45 tests pass** (41 original updated + 4 new). `catalog.length === 20`. Zero failures.

---

## Task 6: Wire screen-safe animations across all templates

**Files:**
- Modify: `js/newsletter_builder.js` — update `applyRenderProfile` to inject `screenSafeStyle()` for screen-safe renders, and pass `screenSafe` flag to `darkMasthead` and `articleCard` calls

- [ ] **Step 1: Find `applyRenderProfile` (~line 157)**

The function currently enhances HTML for screen-safe channel. Add animation injection:

```javascript
  function applyRenderProfile(html, format, renderOpts = {}) {
    const info = TEMPLATE_CATALOG.find(t => t.id === format) || TEMPLATE_CATALOG[0];
    if (renderOpts.renderChannel === 'screen-safe') {
      // Inject animation stylesheet once, just after <table (the outer wrapper open)
      if (!html.includes('@keyframes nlFadeIn')) {
        html = html.replace(/(<table width="100%" cellpadding)/, screenSafeStyle() + '$1');
      }
    }
    // existing enhancer logic unchanged below
    const enhancer = ...
```

Keep all existing code after the injection. The `if (!html.includes('@keyframes'))` guard ensures we never double-inject.

- [ ] **Step 2: Run full test suite and verify animation test**

```
cd c:\Users\manka\Downloads\awareness
npm run test:unit
```

Expected: 45 tests pass. The `poster1 screen-safe output contains keyframes` test now passes (it was already in the suite from Task 1).

---

## Task 7: Final quality gate

- [ ] **Step 1: Run linter**

```
cd c:\Users\manka\Downloads\awareness
npm run lint
```

Expected: 0 errors (pre-existing warnings in other files are acceptable).

- [ ] **Step 2: Run full unit tests**

```
cd c:\Users\manka\Downloads\awareness
npm run test:unit
```

Expected: **45/45 pass**.

- [ ] **Step 3: Confirm no `reportCTA` references remain**

```
cd c:\Users\manka\Downloads\awareness
Select-String -Path "js\newsletter_builder.js" -Pattern "reportCTA\(c\)"
```

Expected: no matches (function definition line 204 is fine — just the call sites must be gone).

- [ ] **Step 4: Confirm catalog count in the builder**

```
cd c:\Users\manka\Downloads\awareness
Select-String -Path "js\newsletter_builder.js" -Pattern "{ id:"
```

Expected: exactly 20 matches.

- [ ] **Step 5: Run baseline audit if available**

```
cd c:\Users\manka\Downloads\awareness
npm run audit:baseline
```

- [ ] **Step 6: Commit**

```
cd c:\Users\manka\Downloads\awareness
git add js/newsletter_builder.js tests/unit/app-modules.test.js
git commit -m "feat: expand newsletter builder to 20 formal corporate templates with shared design system"
```

---

## Self-Review Checklist

| Spec requirement | Task that covers it |
|---|---|
| Shared primitives: `goldGradientBar`, `darkMasthead`, `goldBannerStrip`, `gradientFade`, `articleCard`, `sectionBand`, `screenSafeStyle`, anim helpers | Task 1 |
| Templates 2–5 restyled | Task 2 |
| Templates 6–9 restyled | Task 3 |
| Templates 10–13 restyled + newspaper rebuild | Task 4 |
| 5 poster functions + catalog entries + switch cases | Task 5 |
| screen-safe animations injected via `applyRenderProfile` | Task 6 |
| Corporate Alert (`poster`) untouched | Not in any task (intentionally) |
| `reportCTA` fully removed from call sites | Done in prior session, verified in Task 7 |
| `TEMPLATE_CATALOG` has 20 entries | Task 5 Step 6 |
| 45 unit tests pass | Every task runs `npm run test:unit` |
| No `@keyframes` in email-safe output | Task 1 test + Task 6 guard |
