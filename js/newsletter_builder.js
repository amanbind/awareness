/* ═══════════════════════════════════════════════════════════
   newsletter_builder.js — 20 email-safe newsletter layouts
   Visual shell and several templates follow the professional
   standalone pack in /templates/imported-standalone/ (email-safe
   fonts: Arial / Georgia stacks — no Google Fonts at send time).
   ═══════════════════════════════════════════════════════════ */
window.App = window.App || {};

App.NewsletterBuilder = (() => {
  'use strict';
  const { fmtDate, normalizeWebUrl } = App.Utils;

  /** Email-safe: Arial stack, no external fonts */
  const NLFF = 'font-family:Arial,Helvetica,sans-serif';
  /** Email-safe serif for display headings — present in every email client */
  const NLFF_SERIF = 'font-family:Georgia,"Times New Roman",Times,serif';

  function tbl(attrs = '') {
    return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"${attrs ? ` ${attrs}` : ''}>`;
  }
  function tbc(html, tdAttrs = '') {
    return `<tr><td${tdAttrs ? ` ${tdAttrs}` : ''}>${html}</td></tr>`;
  }
  function tblx() {
    return '</table>';
  }

  /** Masthead line: optional AI/local nlKicker from selected stories (replaces org name). */
  function mastheadKicker(c, prefix) {
    const k = (c.nlKicker || '').trim();
    const p = String(prefix || '').trim();
    if (k) return `${p} — ${k}`;
    return p;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /** Prefer cfg lines; pad with fallback; dedupe by normalized text. */
  function pickUniqueSlotLines(cfgArr, fallback, n) {
    const out = [];
    const seen = new Set();
    function pushLine(line) {
      const t = String(line || '').trim();
      if (!t) return;
      const k = t.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(k)) return;
      seen.add(k);
      out.push(t);
    }
    if (Array.isArray(cfgArr)) for (const x of cfgArr) pushLine(x);
    for (const f of fallback) {
      if (out.length >= n) break;
      pushLine(f);
    }
    let i = 0;
    while (out.length < n && fallback.length) {
      pushLine(fallback[i++ % fallback.length]);
    }
    return out.slice(0, n);
  }

  /** Corporate Alert (poster): fixed title "Edition focus"; body from cfg.nlCorporateTopicBlurb. */
  function corporateTopicIntroHtml(c) {
    // Fall back to generic topic blurb if the corporate-specific field is absent
    const raw = String(c.nlCorporateTopicBlurb || c.nlTopicBlurb || '').trim();
    if (!raw) return '';
    const body = escapeHtml(raw);
    return `${tbl()}${tbc(
      // Outer card: cream bg, gold border — matches reference edition-focus card
      `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E0DAD0;background-color:#FFFEFA;border-radius:8px;overflow:hidden;" bgcolor="#FFFEFA">`
      // 3px gold top accent bar (ref: height:3px gradient → solid gold for email safety)
      + `<tr><td height="3" bgcolor="#D4A420" style="background-color:#D4A420;height:3px;font-size:1px;line-height:3px;">&nbsp;</td></tr>`
      + `<tr><td style="padding:17px 22px 19px;">`
      // Title — ref: 1.02rem ≈ 16px, color:#2D2405 warm dark brown
      + `<span style="font-size:16px;font-weight:bold;color:#2D2405;line-height:1.3;${NLFF_SERIF}">Edition Focus</span>`
      // 8px gap (ref: margin-bottom:.5rem)
      + `${tbl()}${tbc('', 'height="8" style="font-size:1px;line-height:8px;"')}${tblx()}`
      // Body — ref: .875rem ≈ 14px, color:#3D3D3D
      + `<span style="font-size:14px;color:#3D3D3D;line-height:1.65;${NLFF}">${body}</span>`
      + `</td></tr></table>`,
      'style="padding:0 0 25px 0;margin:0;"'
    )}${tblx()}`;
  }

  function escAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  /**
   * Emoji-in-colored-table icon — fully inline, zero external dependencies.
   * Works in every email client (Unicode emoji render via system fonts).
   */
  function nlEmojiIcon(icon, bg, border, w, h, fz) {
    const fontSize = fz || Math.max(14, Math.round(Math.min(w, h) * 0.44));
    return `<table cellpadding="0" cellspacing="0" border="0" width="${w}" height="${h}"><tr><td align="center" valign="middle" width="${w}" height="${h}" bgcolor="${bg}" style="background-color:${bg};border:3px solid ${border};font-size:${fontSize}px;line-height:1;width:${w}px;height:${h}px;text-align:center;">${icon}</td></tr></table>`;
  }

  /** Hero icon for template headers — large emoji with themed frame */
  function nlHeroRaster(kind, w, h) {
    const m = {
      shield: ['&#128737;', '#1A1A1A', '#D4A420'],
      phish:  ['&#127907;', '#C0392B', '#7B241C'],
      people: ['&#128101;', '#0A0A0A', '#D4A420'],
      mfa:    ['&#128272;', '#1A5276', '#2980B9'],
      warn:   ['&#9888;',   '#C0392B', '#D4A420'],
      fake:   ['&#127917;', '#0A0A0A', '#D4A420'],
      vish:   ['&#128222;', '#6C3483', '#9B59B6'],
      leak:   ['&#128275;', '#922B21', '#C0392B'],
      sms:    ['&#128241;', '#7B241C', '#C0392B']
    };
    const [icon, bg, border] = m[kind] || m.shield;
    return nlEmojiIcon(icon, bg, border, w, h);
  }

  function nlOuterOpen() {
    // Outer band + card match /templates/imported-standalone/ (stone field, elevated white shell)
    return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td align="center" bgcolor="#C5BEAF" style="margin:0;padding:20px 12px;background-color:#C5BEAF;"><table width="640" cellpadding="0" cellspacing="0" border="0" align="center" bgcolor="#FFFFFF" style="max-width:640px;width:100%;background-color:#FFFFFF;box-shadow:0 2px 10px rgba(0,0,0,0.1);border-collapse:collapse;" role="presentation"><tr><td style="margin:0;padding:0;">`;
  }

  function nlOuterClose() {
    return `</td></tr></table></td></tr></table>`;
  }

  function spotlightLine(c) {
    const s = (c.nlSpotlight || '').trim();
    if (s) return s;
    return 'Curated threat themes from this week\'s headlines';
  }
  const TEMPLATE_CATALOG = [
    { id: 'poster', name: 'Corporate Alert', tags: ['executive', 'official'], channels: ['email-safe', 'print-safe', 'screen-safe'], visualProfile: 'classic', recommended: 'Leadership and broad staff notices.' },
    { id: 'phishingbrief', name: 'Bank Page', tags: ['bank', 'briefing', 'awareness'], channels: ['email-safe', 'screen-safe'], visualProfile: 'phishing-brief', recommended: 'Bank-themed awareness brief with three bullet sections.' },
    { id: 'bankpage1_static', name: 'bankpage1_static', tags: ['bank', 'briefing', 'awareness', 'centered-hero'], channels: ['email-safe', 'screen-safe'], visualProfile: 'phishing-brief', recommended: 'Bank-themed brief with centered Arial hero and content-width Report-to-SOC button.' },
    { id: 'bankpage1_dynamic', name: 'bankpage1_dynamic', tags: ['bank', 'briefing', 'awareness', 'dynamic-cards'], channels: ['email-safe', 'screen-safe'], visualProfile: 'phishing-brief', recommended: 'Bank page with two clickable article cards replacing the laptop illustration.' },
    { id: 'knowbe4', name: 'Training Alert', tags: ['training', 'awareness'], channels: ['email-safe', 'screen-safe'], visualProfile: 'high-contrast', recommended: 'Training cadence and simulation summaries.' },
    { id: 'people', name: 'Team Chat', tags: ['conversational', 'onboarding'], channels: ['email-safe', 'screen-safe'], visualProfile: 'friendly', recommended: 'Less formal, cross-team communication.' },
    { id: 'infographic', name: 'Spot the Phish', tags: ['poster-first', 'education'], channels: ['print-safe', 'screen-safe'], visualProfile: 'infographic', recommended: 'Posters and awareness walls.' },
    { id: 'quicktips', name: 'Quick Safety Rules', tags: ['poster-first', 'quick-reference'], channels: ['print-safe', 'screen-safe'], visualProfile: 'rules', recommended: 'Cheat sheets and quick desk references.' },
    { id: 'redflags', name: 'Red Flags Checklist', tags: ['poster-first', 'phishing'], channels: ['print-safe', 'screen-safe'], visualProfile: 'checklist', recommended: 'Visual checklist communication.' },
    { id: 'stoplook', name: 'Stop Look Report', tags: ['poster-first', 'campaign'], channels: ['print-safe', 'screen-safe'], visualProfile: 'campaign', recommended: 'Campaign moments and awareness drives.' },
    { id: 'emaildissect', name: 'Email Anatomy', tags: ['training', 'analysis'], channels: ['email-safe', 'screen-safe'], visualProfile: 'teardown', recommended: 'Teach red-flag identification with examples.' },
    { id: 'dodont', name: 'Do vs Don\'t', tags: ['guidance', 'comparison'], channels: ['email-safe', 'print-safe', 'screen-safe'], visualProfile: 'split-layout', recommended: 'Clear behavior reinforcement.' },
    { id: 'spotlight', name: 'Threat Spotlight', tags: ['briefing', 'weekly'], channels: ['email-safe', 'screen-safe'], visualProfile: 'magazine', recommended: 'Weekly threat intelligence style updates.' },
    { id: 'timeline', name: 'Incident Timeline', tags: ['incident', 'response'], channels: ['email-safe', 'screen-safe'], visualProfile: 'timeline', recommended: 'Incident summaries and response updates.' },
    { id: 'scorecard', name: 'Awareness Scorecard', tags: ['gamified', 'engagement'], channels: ['screen-safe', 'email-safe'], visualProfile: 'interactive-look', recommended: 'Engagement-focused awareness rounds.' },
    { id: 'cybertimes', name: 'Cyber Security Times', tags: ['digest', 'editorial', 'weekly'], channels: ['email-safe', 'print-safe', 'screen-safe'], visualProfile: 'newspaper', recommended: 'Classic digest layout with a lead story and three supporting columns.' },
    { id: 'testbrief', name: 'Security Dispatch (Test)', tags: ['executive', 'priority-list', 'ai-optimised'], channels: ['email-safe'], visualProfile: 'dispatch', recommended: 'Numbered priority cards with coloured threat stripes — optimised for AI-generated content.' },
    { id: 'poster1',   name: 'Impact Poster: Centred',  tags: ['poster-first', 'display'],        channels: ['print-safe', 'screen-safe', 'email-safe'], visualProfile: 'poster-centred',  recommended: 'Centred authority poster. IBM-style.' },
    { id: 'poster2',   name: 'Impact Poster: Split',    tags: ['poster-first', 'display'],        channels: ['print-safe', 'screen-safe', 'email-safe'], visualProfile: 'poster-split',    recommended: 'Two-column split poster. Cisco-style.' },
    { id: 'poster3',   name: 'Impact Poster: Stacked',  tags: ['poster-first', 'display'],        channels: ['print-safe', 'screen-safe', 'email-safe'], visualProfile: 'poster-stacked',  recommended: 'Three-band stacked poster. Microsoft-style.' },
    { id: 'poster4',   name: 'Impact Poster: Command',  tags: ['poster-first', 'incident'],       channels: ['print-safe', 'screen-safe', 'email-safe'], visualProfile: 'poster-command',  recommended: 'High-urgency incident command poster.' },
    { id: 'poster5',   name: 'Impact Poster: Minimal',  tags: ['poster-first', 'minimal'],        channels: ['print-safe', 'screen-safe', 'email-safe'], visualProfile: 'poster-minimal',  recommended: 'Minimal stat poster. Apple/Google-style.' },
    { id: 'newspaper', name: 'The Cyber Gazette',       tags: ['newspaper', 'digest', 'editorial'], channels: ['email-safe', 'print-safe', 'screen-safe'], visualProfile: 'broadsheet',    recommended: 'Full broadsheet newspaper layout.' },
    { id: 'gen_chase_email', name: 'Action Required Bulletin', tags: ['awareness', 'bulletin', 'action-required'], channels: ['email-safe', 'screen-safe'], visualProfile: 'generated', recommended: 'Branded monthly bulletin with hero call-to-action, two article cards, and a scam-alert block.' },
    { id: 'gen_cybershield', name: 'Phishing Maestro', tags: ['awareness', 'bulletin', 'generated'], channels: ['email-safe', 'screen-safe'], visualProfile: 'generated', recommended: 'Dark/gold security awareness bulletin with threat-alert hero, red-flag list, two article cards, and three stat tiles.' }
  ];

  // Tag each template with a readiness tier so the picker can group Ready vs Beta.
  // Ready   = ship-quality, default-visible in the home picker.
  // Beta    = in development / experimental, tucked behind a collapsible group.
  // Testing = auto-generated by the Template Generation pipeline, nested inside Beta
  //           (a row sets status: 'testing' explicitly; this loop preserves it).
  const READY_TEMPLATE_IDS = new Set(['poster', 'bankpage1_static', 'bankpage1_dynamic']);
  for (const t of TEMPLATE_CATALOG) {
    if (t.status === 'testing') continue;
    t.status = READY_TEMPLATE_IDS.has(t.id) ? 'ready' : 'beta';
  }

  function normalizeRenderOptions(raw = {}) {
    const renderChannel = ['email-safe', 'print-safe', 'screen-safe'].includes(raw.renderChannel)
      ? raw.renderChannel
      : 'email-safe';
    const preferReducedMotion = !!raw.preferReducedMotion;
    const useMotion = !!raw.useMotion && renderChannel === 'screen-safe' && !preferReducedMotion;
    return { ...raw, renderChannel, preferReducedMotion, useMotion };
  }

  function applyRenderProfile(html, format, renderOpts = {}) {
    if (renderOpts.renderChannel === 'screen-safe' && !html.includes('@keyframes nlFadeIn')) {
      // Inject animation stylesheet just after the outer table opening tag
      html = html.replace(/(<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">)/, '$1' + screenSafeStyle());
    }
    const info = TEMPLATE_CATALOG.find(t => t.id === format) || TEMPLATE_CATALOG[0];
    const enhancer =
      renderOpts.renderChannel === 'screen-safe'
        ? `${tbl()}${tbc(
            `<span style="font-size:11px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:#d4a420;${NLFF}">Enhanced Visual Mode · ${
              renderOpts.useMotion ? 'Motion Enabled' : 'Static Fallback Active'
            }</span>`,
            'align="center" bgcolor="#171717" style="padding:8px 12px;margin:0 0 8px 0;background-color:#171717;border:1px solid #3a3a3a"'
          )}${tblx()}`
        : '';
    const tplName = escapeHtml(info.name);
    return `${enhancer}${tbl(`data-template-id="${escAttr(info.id)}" data-template-name="${escAttr(tplName)}" data-render-channel="${escAttr(renderOpts.renderChannel)}"`)}${tbc(html)}${tblx()}`;
  }

  // ── Shared: Footer (table layout — matches legacy portal strip; safe for email clients) ──
  function foot(c, qr) {
    const portalHrefRaw = normalizeWebUrl((c.portal || c.portalUrl || '').trim());
    const soc = (c.soc || '').trim();
    const portalHref = portalHrefRaw || (soc ? `mailto:${soc}` : '#');
    const portalEsc = escAttr(portalHref);
    const pnameRaw = (c.pname || '').trim();
    const orgRaw = (c.org || '').trim();
    const pnameDisplay = pnameRaw || (orgRaw ? `${orgRaw} Security Awareness Portal` : 'Security Awareness Portal');
    const pnameHtml = escapeHtml(pnameDisplay);
    const orgLine = escapeHtml(orgRaw || 'ABC Corp');
    const socEsc = escapeHtml(soc);
    const socAttr = escAttr(soc);
    const qrCell = qr
      ? `<td width="160" valign="top" align="center" style="padding-left:16px;"><table cellpadding="0" cellspacing="0" border="0" style="border:2px solid #C09010;background-color:#FFFFFF;" bgcolor="#FFFFFF"><tr><td style="padding:4px;" id="nl-qr" data-qr-size="90"></td></tr></table><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding-top:6px;font-size:9px;color:#909090;letter-spacing:0.08em;text-transform:uppercase;${NLFF}">Scan for Portal</td></tr></table></td>`
      : '';
    return `${tbl()}${tbc(
      `${tbl()}${tbc(
        `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="${NLFF}"><tr>
        <td valign="top" style="padding:0 12px 0 0;"><a href="${portalEsc}" style="${NLFF};font-size:20px;font-weight:bold;color:#D4A420;text-decoration:none;" target="_blank" rel="noopener noreferrer"><font color="#D4A420">${pnameHtml}</font></a><br><br><span style="${NLFF};font-size:14px;color:#909090;line-height:1.5;">Training modules, policies, and past bulletins.</span><br><br><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;"><tr><td align="center" style="border:1px solid #C09010;border-radius:4px;padding:10px 22px;line-height:1;${NLFF};font-size:14px;font-weight:700;"><a href="${portalEsc}" style="color:#D4A420;text-decoration:none;" target="_blank" rel="noopener noreferrer">Visit Portal</a></td></tr></table></td>
        ${qrCell}
      </tr></table>`,
        'style="padding:0;margin:0"'
      )}${tbc(
        `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding-top:14px;margin-top:8px;border-top:1px solid #333333;font-size:10px;color:#999999;letter-spacing:0.06em;${NLFF}">${orgLine} · Security Awareness · <a href="mailto:${socAttr}" style="color:#BBBBBB;text-decoration:none;">${socEsc}</a></td></tr></table>`,
        'style="padding:0;margin:0"'
      )}${tblx()}`,
      'bgcolor="#0A0A0A" style="padding:24px 28px;margin:0;background-color:#0A0A0A;border-top:1px solid #5C4A10;"'
    )}${tblx()}`;
  }

  /** Full-width band between sections — matches spacer rows in imported templates */
  function stoneSpacerTr() {
    return `${tbl()}${tbc('&nbsp;', 'height="24" bgcolor="#C5BEAF" style="height:24px;font-size:0;line-height:0;background-color:#C5BEAF;"')}${tblx()}`;
  }

  /** Two-column SOC report strip (Training + Team Chat standalone layouts) */
  function trainingPackReportCta(c) {
    const mail = escAttr(`mailto:${(c.soc || '').trim()}`);
    const socShow = escapeHtml((c.soc || '').trim());
    return `${tbl()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>`
      + `<td style="background-color:#0A0A0A;border-left:6px solid #D4A420;">`
      + `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:32px 40px;">`
      + `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>`
      + `<td width="62%" valign="middle" style="padding-right:20px;">`
      + `<span style="font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#D4A420;font-weight:bold;${NLFF}">SEE SOMETHING SUSPICIOUS?</span><br><br>`
      + `<span style="font-size:16px;font-weight:bold;color:#FFFFFF;line-height:1.2;${NLFF_SERIF}">Don't Click. Don't Reply. Report It.</span><br><br>`
      + `<span style="font-size:13px;color:rgba(255,255,255,0.45);line-height:1.6;${NLFF}">Forward suspicious emails to the security team. Don't delete them. Every report helps protect everyone in the company.</span>`
      + `</td>`
      + `<td width="38%" valign="middle" align="right">`
      + `<table cellpadding="0" cellspacing="0" border="0" align="right"><tr>`
      + `<td bgcolor="#B8860B" style="background-color:#C09010;border-radius:5px;padding:12px 16px;text-align:center;">`
      + `<a href="${mail}" style="color:#FFFFFF;font-size:12px;font-weight:bold;text-decoration:none;${NLFF}">Report to ${socShow}</a>`
      + `</td></tr></table>`
      + `</td></tr></table>`
      + `</td></tr></table>`
      + `</td></tr></table>`,
      'style="padding:0;margin:0;"'
    )}${tblx()}`;
  }

  // ── Animation helpers (screen-safe only) ──

  function screenSafeStyle() {
    return `<!--[if !mso]><!-- --><style>
@keyframes nlFadeIn{from{opacity:0}to{opacity:1}}
@keyframes nlSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes nlSlideLeft{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
@keyframes nlSlideRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@keyframes nlShimmer{0%,100%{filter:brightness(1)}50%{filter:brightness(1.18)}}
@keyframes nlPulse{0%,100%{opacity:1}50%{opacity:.7}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style><!-- <![endif]-->`;
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
   * Standard dark masthead block.
   * @param {object} c  — config (title, freq, issueDate, nlKicker)
   * @param {string} subtitle — kicker suffix e.g. 'Security Alert'
   * @param {boolean} screenSafe — inject animation styles
   */
  function darkMasthead(c, subtitle, screenSafe) {
    const kicker = escapeHtml(mastheadKicker(c, `${c.freq || 'Weekly'} ${subtitle || 'Security Alert'}`));
    const title  = escapeHtml(c.title || 'Stay Secure');
    const date   = escapeHtml(String(fmtDate(c.issueDate || new Date())).toUpperCase());
    const animH  = screenSafe ? ` style="${animFadeIn(0)}"` : '';
    const animS  = screenSafe ? ` style="${animFadeIn(150)}"` : '';
    return `${tbc(
      `${screenSafe ? screenSafeStyle() : ''}<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle">
        <span${animH} style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(212,164,32,0.75);font-weight:bold;${NLFF}">${kicker}</span><br><br>
        <span${animS} style="font-size:27px;font-weight:bold;color:#FFFFFF;line-height:1.1;${NLFF_SERIF}">${title}</span><br><br>
        <span style="font-size:9px;color:rgba(255,255,255,0.28);letter-spacing:1px;${NLFF}">${date} · Staff security briefing</span>
      </td></tr></table>`,
      'bgcolor="#0A0A0A" style="padding:29px 35px 24px;background-color:#0A0A0A;margin:0;"'
    )}`;
  }

  /** Full-width gold banner strip */
  function goldBannerStrip(text) {
    return tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#C09010" style="padding:10px;background-color:#C09010;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#FFFFFF;${NLFF}">${escapeHtml(text)}</td></tr></table>`,
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
      `<span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:${_fg};font-weight:bold;${NLFF}">${escapeHtml(label)}</span>`,
      `bgcolor="${_bg}" style="padding:10px 22px;background-color:${_bg};margin:0;"`
    )}${tblx()}`;
  }

  /** Intelligence classification ribbon — narrow strip with severity bar + tracked metadata. */
  function classificationBar(level, channel) {
    const colors = ['#3A3A3A','#27AE60','#8BC34A','#F39C12','#E67E22','#E74C3C'];
    const names  = ['UNCLASSIFIED','LOW','MODERATE','ELEVATED','HIGH','CRITICAL'];
    const lvl = Math.min(Math.max(level || 0, 0), 5);
    const lc  = colors[lvl];
    const ln  = names[lvl];
    const ch  = (channel || 'INTERNAL // SECURITY AWARENESS // PROTECTIVE INTELLIGENCE');
    return `${tbl()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="110" bgcolor="${lc}" style="background-color:${lc};padding:6px 14px;text-align:center;"><span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#FFFFFF;font-weight:bold;${NLFF}">${ln}</span></td>
        <td bgcolor="#111111" style="background-color:#111111;padding:6px 16px;"><span style="font-size:8px;letter-spacing:3px;text-transform:uppercase;color:#888888;font-weight:bold;${NLFF}">${escapeHtml(ch)}</span></td>
      </tr></table>`,
      'style="padding:0;margin:0;"'
    )}${tblx()}`;
  }

  /** Premium intelligence masthead — dark, executive, with kicker / serif title / gold rule / subtitle. */
  function intelligenceMasthead(c, kicker, subtitle) {
    const orgLine  = escapeHtml((c.org || 'Your Organisation').trim());
    const dateStr  = escapeHtml(String(fmtDate(c.issueDate || c.date || new Date())).toUpperCase());
    const titleStr = escapeHtml(c.title || 'Security Briefing');
    const kStr     = escapeHtml(kicker || `${(c.freq || 'WEEKLY').toUpperCase()} INTELLIGENCE BRIEF`);
    const sStr     = escapeHtml(subtitle || 'Protective intelligence prepared for staff and leadership.');
    return tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:38px 36px 6px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="bottom"><span style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:rgba(212,164,32,0.78);font-weight:bold;${NLFF}">${kStr}</span></td>
            <td align="right" valign="bottom"><span style="font-size:9px;letter-spacing:2px;color:rgba(255,255,255,0.32);${NLFF}">${dateStr} &middot; ${orgLine}</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:14px 36px 4px;">
          <span style="font-size:40px;font-weight:bold;color:#FFFFFF;line-height:1.04;${NLFF_SERIF}">${titleStr}</span>
        </td></tr>
        <tr><td style="padding:6px 36px 12px;">
          <table width="80" cellpadding="0" cellspacing="0" border="0"><tr><td height="2" bgcolor="#D4A420" style="background-color:#D4A420;height:2px;font-size:1px;">&nbsp;</td></tr></table>
        </td></tr>
        <tr><td style="padding:8px 36px 30px;">
          <span style="font-size:13px;color:rgba(255,255,255,0.55);line-height:1.7;${NLFF}">${sStr}</span>
        </td></tr>
      </table>`,
      'bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:0;margin:0;"'
    );
  }

  /** Editorial divider — bold top rule + tracked label + thin sub-rule for section transitions. */
  function editorialDivider(label, bg, fg) {
    const _bg = bg || '#FFFFFF';
    const _fg = fg || '#0A0A0A';
    const tag = String(label || '').trim().split(/\s+/)[0].toLowerCase().slice(0, 4);
    return `${tbl()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td height="2" bgcolor="${_fg}" style="background-color:${_fg};height:2px;font-size:1px;">&nbsp;</td></tr>
        <tr><td style="padding:12px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td><span style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${_fg};font-weight:bold;${NLFF}">${escapeHtml(label)}</span></td>
            <td align="right"><span style="font-size:8px;color:#999999;letter-spacing:1px;${NLFF}">&sect; ${escapeHtml(tag)}</span></td>
          </tr></table>
        </td></tr>
        <tr><td height="1" bgcolor="#EDEAE3" style="background-color:#EDEAE3;height:1px;font-size:1px;">&nbsp;</td></tr>
      </table>`,
      `bgcolor="${_bg}" style="background-color:${_bg};padding:0;margin:0;"`
    )}${tblx()}`;
  }

  /** Executive pull quote — premium serif italic with gold rule. */
  function executivePullQuote(text, attribution, bg) {
    const _bg = bg || '#F8F5EF';
    return `${tbl()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="6" bgcolor="#D4A420" style="background-color:#D4A420;">&nbsp;</td>
        <td style="padding:22px 26px;background-color:${_bg};">
          <span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#B8860B;font-weight:bold;${NLFF}">From the Security Team</span><br><br>
          <span style="font-size:20px;color:#0A0A0A;font-style:italic;line-height:1.42;${NLFF_SERIF}">&ldquo;${escapeHtml(text)}&rdquo;</span><br><br>
          <span style="font-size:10px;color:#888888;letter-spacing:2px;text-transform:uppercase;${NLFF}">&mdash; ${escapeHtml(attribution)}</span>
        </td>
      </tr></table>`,
      `bgcolor="${_bg}" style="background-color:${_bg};padding:0;margin:0;"`
    )}${tblx()}`;
  }

  /** Typographic stat block — large serif number with gold rule + body label. */
  function statBlock(value, label, color) {
    const _c = color || '#D4A420';
    return `<table cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="middle" style="padding-right:20px;border-right:2px solid ${_c};">
        <span style="font-size:48px;font-weight:bold;color:${_c};line-height:1;${NLFF_SERIF}">${escapeHtml(value)}</span>
      </td>
      <td valign="middle" style="padding-left:20px;"><span style="font-size:11px;color:#555555;line-height:1.55;${NLFF}">${escapeHtml(label)}</span></td>
    </tr></table>`;
  }

  /** Premium briefing panel — uniform intelligence module, left-rule, structured, enterprise. */
  function briefingPanel(a, idx) {
    const num   = String(idx + 1).padStart(2, '0');
    const lv    = a.threatLevel || 0;
    const lvColors = ['#666666','#27AE60','#8BC34A','#F39C12','#E67E22','#E74C3C'];
    const lvNames  = ['ADVISORY','LOW','MODERATE','ELEVATED','HIGH','CRITICAL'];
    const lvC = lvColors[Math.min(lv, 5)];
    const lvN = lvNames[Math.min(lv, 5)];
    const typeText = escapeHtml((a.type || 'Security').toUpperCase());
    const title    = escapeHtml(a.title || '');
    const sumRaw   = (a.summary || a.description || '').split('. ').slice(0, 3).join('. ').trim().replace(/\.+$/, '');
    const summary  = escapeHtml(sumRaw ? sumRaw + '.' : 'Threat details remain under analysis. Apply standard caution until further notice.');
    const wos      = Array.isArray(a.watchouts) ? a.watchouts.slice(0, 2) : [];
    const actions  = (wos.length
      ? wos
      : ['Report any suspicious activity matching this pattern to the security team immediately.']
    ).map(w => `<tr><td width="16" valign="top" style="padding-top:4px;color:#D4A420;font-weight:bold;font-size:13px;line-height:1;">&rsaquo;</td><td valign="top" style="padding:1px 0 6px 0;font-size:13px;color:#1A1A1A;line-height:1.6;${NLFF}">${escapeHtml(w)}</td></tr>`).join('');
    return `${tbl()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E8E3D8;border-left:4px solid ${lvC};background-color:#FFFFFF;" bgcolor="#FFFFFF">
        <tr><td style="padding:16px 22px 4px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle">
              <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#B8860B;font-weight:bold;${NLFF}">Item No. ${num}</span>
              <span style="font-size:9px;color:#CCCCCC;padding:0 8px;${NLFF}">|</span>
              <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#666666;font-weight:bold;${NLFF}">${typeText}</span>
            </td>
            <td align="right" valign="middle">
              <span style="font-size:8px;padding:3px 9px;background-color:${lvC};color:#FFFFFF;letter-spacing:2px;text-transform:uppercase;font-weight:bold;${NLFF}">${lvN}</span>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:6px 22px 10px;">
          <span style="font-size:18px;font-weight:bold;color:#0A0A0A;line-height:1.28;${NLFF_SERIF}">${title}</span>
        </td></tr>
        <tr><td style="padding:0 22px 14px;">
          <span style="font-size:13px;color:#3A3A3A;line-height:1.7;${NLFF}">${summary}</span>
        </td></tr>
        <tr><td style="padding:0 22px 18px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #EDE8DC;">
            <tr><td style="padding-top:12px;padding-bottom:6px;">
              <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#888888;font-weight:bold;${NLFF}">Operational Guidance</span>
            </td></tr>
            <tr><td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">${actions}</table>
            </td></tr>
          </table>
        </td></tr>
      </table>`,
      'style="padding:0 0 14px 0;margin:0;"'
    )}${tblx()}`;
  }

  /** Numbered campaign step — used in poster/training sequences. */
  function campaignStep(num, label, headline, body, accent) {
    const _accent = accent || '#D4A420';
    return `<table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="86" valign="top" align="center" style="padding:8px 0;border-right:1px solid ${_accent}40;">
          <span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:${_accent};font-weight:bold;${NLFF}">Step</span><br>
          <span style="font-size:50px;font-weight:bold;color:${_accent};line-height:1;${NLFF_SERIF}">${escapeHtml(num)}</span>
        </td>
        <td valign="top" style="padding:10px 22px;">
          <span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:${_accent};font-weight:bold;${NLFF}">${escapeHtml(label)}</span><br><br>
          <span style="font-size:17px;font-weight:bold;color:#0A0A0A;line-height:1.3;${NLFF_SERIF}">${escapeHtml(headline)}</span><br><br>
          <span style="font-size:13px;color:#3A3A3A;line-height:1.65;${NLFF}">${escapeHtml(body)}</span>
        </td>
      </tr>
    </table>`;
  }

  /**
   * Intelligence briefing module — uniform, left-rule, structured.
   * Replaces legacy chat-bubble article card.
   * @param {object} a   — article {type, title, summary, watchouts[]}
   * @param {number} idx — 0-based index
   * @param {object} c   — config (reserved)
   * @param {boolean} screenSafe — inject motion on screen-safe channel
   */
  function articleCard(a, idx, c, screenSafe) {
    const num       = String(idx + 1).padStart(2, '0');
    const anim      = screenSafe ? ` style="${animSlideUp(idx * 90)}"` : '';
    const typeText  = escapeHtml((a.type || 'Security').toUpperCase());
    const titleText = escapeHtml(a.title || '');
    const summaryRaw = (a.summary || a.description || '').split('. ').slice(0, 3).join('. ').trim().replace(/\.+$/, '');
    const summary   = escapeHtml(summaryRaw ? summaryRaw + '.' : 'Threat details remain under analysis. Apply standard caution until further notice.');
    const wos       = Array.isArray(a.watchouts) ? a.watchouts.slice(0, 2) : [];
    const actionLines = (wos.length
      ? wos
      : ['Report any communication matching this pattern to the security team without responding or clicking.']
    );
    const lv        = a.threatLevel || 0;
    const lvColors  = ['#666666','#27AE60','#8BC34A','#F39C12','#E67E22','#E74C3C'];
    const lvNames   = ['ADVISORY','LOW','MODERATE','ELEVATED','HIGH','CRITICAL'];
    const lvC       = lvColors[Math.min(lv, 5)];
    const lvN       = lvNames[Math.min(lv, 5)];
    const actionsHtml = actionLines.map(w =>
      `<tr>
        <td width="16" valign="top" style="padding-top:4px;font-size:13px;color:#D4A420;font-weight:bold;line-height:1;${NLFF}">&rsaquo;</td>
        <td valign="top" style="padding:1px 0 6px 0;font-size:13px;color:#1A1A1A;line-height:1.6;${NLFF}">${escapeHtml(w)}</td>
      </tr>`).join('');

    return `${tbl()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"${anim} bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px solid #E8E3D8;border-left:4px solid ${lvC};">
        <tr><td style="padding:16px 22px 4px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle">
              <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#B8860B;font-weight:bold;${NLFF}">Item No. ${num}</span>
              <span style="font-size:9px;color:#CCCCCC;padding:0 8px;${NLFF}">|</span>
              <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#666666;font-weight:bold;${NLFF}">${typeText}</span>
            </td>
            <td align="right" valign="middle">
              <span style="font-size:8px;padding:3px 9px;background-color:${lvC};color:#FFFFFF;letter-spacing:2px;text-transform:uppercase;font-weight:bold;${NLFF}">${lvN}</span>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:6px 22px 10px;">
          <span style="font-size:18px;font-weight:bold;color:#0A0A0A;line-height:1.28;${NLFF_SERIF}">${titleText}</span>
        </td></tr>
        <tr><td style="padding:0 22px 14px;">
          <span style="font-size:13px;color:#3A3A3A;line-height:1.7;${NLFF}">${summary}</span>
        </td></tr>
        <tr><td style="padding:0 22px 18px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #EDE8DC;">
            <tr><td style="padding-top:12px;padding-bottom:6px;">
              <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#888888;font-weight:bold;${NLFF}">Operational Guidance</span>
            </td></tr>
            <tr><td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">${actionsHtml}</table>
            </td></tr>
          </table>
        </td></tr>
      </table>`,
      'style="padding:0 0 14px 0;margin:0;"'
    )}${tblx()}`;
  }

  // ── Shared: Danger badge ──
  function badge(lv) {
    if (!lv) return '';
    const c = ['','#27AE60','#8BC34A','#F39C12','#E67E22','#E74C3C'][Math.min(lv,5)];
    const l = ['','LOW','MODERATE','ELEVATED','HIGH','CRITICAL'][Math.min(lv,5)];
    return `<span style="font-size:9px;letter-spacing:0.08em;padding:2px 7px;border-radius:3px;background:${c}18;color:${c};border:1px solid ${c}40;font-weight:700;text-transform:uppercase;${NLFF}">${l}</span>`;
  }

  /** Localized story date for links/meta; empty when undated or invalid. */
  function fmtArticlePub(a) {
    const raw = a?.pubDate;
    if (raw == null || String(raw).trim() === '') return '';
    try {
      const t = new Date(raw).getTime();
      if (!Number.isFinite(t)) return '';
      return fmtDate(raw);
    } catch {
      return '';
    }
  }

  const CLASSIFIER_TYPES = new Set([
    'Phishing', 'Smishing', 'Vishing', 'Password & MFA', 'Data Breach', 'Social Engineering',
    'Scam & Fraud', 'Ransomware', 'Security Tips', 'Insider Threat', 'Security News'
  ]);

  /** Map AI or loose labels onto illustration buckets (aligned with RSSFetcher.classify where possible). */
  function mapLooseArticleCategory(typeStr) {
    const s = String(typeStr || '').trim().toLowerCase();
    if (!s) return '';
    if (s.includes('malware') || s.includes('trojan') || s.includes('infostealer') || s.includes('spyware')) return 'Malware';
    if (s.includes('vulnerab') || s.includes('advisory') || /\bcve\b/.test(s) || s.includes('zero-day') || s.includes('zeroday')) return 'Vulnerability';
    if (s.includes('insider')) return 'Insider Threat';
    if (s.includes('smish') || s.includes('sms scam') || s.includes('text scam')) return 'Smishing';
    if (s.includes('vish') || s.includes('voice scam') || s.includes('phone scam')) return 'Vishing';
    if (s.includes('ransom')) return 'Ransomware';
    if (s.includes('breach') || s.includes('data leak') || s.includes('leaked')) return 'Data Breach';
    if (s.includes('password') || s.includes('mfa') || s.includes('2fa') || s.includes('two-factor') || s.includes('multi-factor') || s.includes('passkey')) return 'Password & MFA';
    if (s.includes('scam') || s.includes('fraud')) return 'Scam & Fraud';
    if (s.includes('phish') || s.includes('quish')) return 'Phishing';
    if (s.includes('social engineer') || s.includes('bec') || s.includes('impersonat') || s.includes('deepfake')) return 'Social Engineering';
    if (s.includes('security tip') || s.includes('awareness tip') || s.includes('best practice') || s.includes('cyber hygiene')) return 'Security Tips';
    return '';
  }

  /**
   * Stable visual category for thumbnails: honor explicit classifier labels, normalize AI categories,
   * then infer from title+summary+description when type is generic.
   */
  function resolveArticleVisualType(a) {
    const raw = String(a?.type || '').trim();
    if (raw && CLASSIFIER_TYPES.has(raw) && raw !== 'Security News') return raw;
    const loose = mapLooseArticleCategory(raw);
    if (loose) return loose;
    const blob = `${a?.title || ''} ${a?.summary || ''} ${a?.description || ''}`.toLowerCase();
    if (App.RSSFetcher && typeof App.RSSFetcher.classify === 'function') {
      return App.RSSFetcher.classify(blob);
    }
    return raw || 'Security News';
  }

  // ── Shared: Emoji icon by resolved visual category — email-safe, no external deps ──
  function typeIllus(visualType) {
    // [emoji-char, bg-color, border-color]
    const m = {
      'Phishing':           ['&#127907;', '#C0392B', '#7B241C'],
      'Smishing':           ['&#128241;', '#7B241C', '#500000'],
      'Vishing':            ['&#128222;', '#6C3483', '#4A235A'],
      'Password & MFA':     ['&#128273;', '#1A5276', '#0E2F44'],
      'Data Breach':        ['&#128275;', '#922B21', '#641E16'],
      'Social Engineering': ['&#127917;', '#884EA0', '#6C3483'],
      'Scam & Fraud':       ['&#9888;',   '#D4A420', '#A07010'],
      'Ransomware':         ['&#128274;', '#1C2833', '#000000'],
      'Malware':            ['&#9760;',   '#922B21', '#641E16'],
      'Vulnerability':      ['&#9889;',   '#1A5276', '#0E2F44'],
      'Advisory':           ['&#128203;', '#2C3E50', '#1A252F'],
      'Insider Threat':     ['&#128100;', '#6C3483', '#4A235A'],
      'Security Tips':      ['&#128161;', '#1E8449', '#17643A'],
      'Security News':      ['&#128240;', '#2C3E50', '#1A252F']
    };
    const [icon, bg, border] = m[visualType] || m['Security News'];
    return nlEmojiIcon(icon, bg, border, 48, 44, 20);
  }



  // Template builder registry. Maps template id → builder function.
  // Starts empty; sibling files in js/newsletter/*.js populate it via
  // App.NewsletterBuilder.registerTemplate(id, fn) after this file loads.
  //   js/newsletter/core_templates.js → poster, people, knowbe4, infographic,
  //     quicktips, redflags, stoplook, emaildissect, dodont, spotlight,
  //     timeline, scorecard, cybertimes, newspaper, testbrief, poster1..5
  //   js/newsletter/bank_page.js      → phishingbrief, bankpage1_static, bankpage1_dynamic
  const TEMPLATE_BUILDERS = {};

  function registerTemplate(id, fn) {
    if (typeof id !== 'string' || !id) return;
    if (typeof fn !== 'function') return;
    TEMPLATE_BUILDERS[id] = fn;
  }

  function resolveEditionTakeaways(cfg, arts) {
    const fromCfg = Array.isArray(cfg?.nlTakeaways) ? cfg.nlTakeaways.filter(Boolean) : [];
    const localFn = window.App?.AISummarizer?.localNewsletterTakeaways;
    const local = typeof localFn === 'function' ? localFn(arts) : [];
    const seen = new Set();
    const tipKey = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ').trim();
    const out = [];
    for (const line of [...fromCfg, ...local]) {
      const k = tipKey(line);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(String(line).trim());
      if (out.length >= 6) break;
    }
    if (out.length >= 4) return out.slice(0, 6);
    for (const w of arts.flatMap(a => a.watchouts || [])) {
      const k = tipKey(w);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(String(w).trim());
      if (out.length >= 6) break;
    }
    return out.slice(0, 6);
  }

  function build(format, cfg, arts, opts) {
    const renderOpts = normalizeRenderOptions(opts || {});
    const wo = resolveEditionTakeaways(cfg, arts);
    const {useLinks:lk, usePoster:p, useQR:qr, useIllus:il} = renderOpts;
    const fn = TEMPLATE_BUILDERS[format] || TEMPLATE_BUILDERS.poster;
    // poster1 historically takes an 8th renderOpts arg; passing it to every
    // builder is harmless since the rest ignore trailing args.
    const html = fn(cfg, arts, wo, lk, p, qr, il, renderOpts);
    return applyRenderProfile(html, format, renderOpts);
  }

  function getTemplateCatalog() {
    return TEMPLATE_CATALOG.map(t => {
      const channels = Array.isArray(t.channels) ? t.channels : [];
      const accessibility = {
        contrastSafe: true,
        reducedMotionFallback: true,
        staticFallback: channels.includes('print-safe') || channels.includes('email-safe')
      };
      const a11yScore = [accessibility.contrastSafe, accessibility.reducedMotionFallback, accessibility.staticFallback]
        .filter(Boolean).length;
      return { ...t, accessibility, a11yScore };
    });
  }

  /**
   * Shared visual helpers exposed for sibling files in `js/newsletter/*.js`.
   * Sibling template files destructure from `App.NewsletterBuilder._components`
   * at IIFE entry and call helpers as locals.
   *
   * Contract:
   *   - Anything a future template file might need from inside the main IIFE
   *     closure MUST be listed in this object before the sibling can use it.
   *   - Keep additions appended; never reorder existing entries (sibling
   *     destructure order doesn't matter, but reads cleaner stable).
   *   - All entries are read-only from sibling files (visual helpers are
   *     stateless functions; constants are strings).
   *
   * Categories:
   *   Email-safe primitives:    tbl, tbc, tblx, escapeHtml, escAttr
   *   Visual building blocks:   mastheadKicker, foot, darkMasthead,
   *                             intelligenceMasthead, goldBannerStrip,
   *                             goldGradientBar, gradientFade, sectionBand,
   *                             classificationBar, editorialDivider,
   *                             executivePullQuote, statBlock, briefingPanel,
   *                             campaignStep, articleCard, stoneSpacerTr,
   *                             trainingPackReportCta
   *   Render-channel helpers:   screenSafeStyle, animFadeIn, animSlideUp,
   *                             animSlideLeft, animSlideRight
   *   Misc:                     pickUniqueSlotLines, nlEmojiIcon,
   *                             nlHeroRaster, nlOuterOpen, nlOuterClose,
   *                             spotlightLine, corporateTopicIntroHtml
   *   Article-derived helpers:  badge, fmtArticlePub, resolveArticleVisualType
   *   Constants:                NLFF, NLFF_SERIF (font-family stacks)
   */
  const _components = {
    // Email-safe primitives
    tbl, tbc, tblx,
    escapeHtml, escAttr,
    // Visual building blocks
    mastheadKicker, foot, darkMasthead, intelligenceMasthead,
    goldBannerStrip, goldGradientBar, gradientFade,
    sectionBand, classificationBar, editorialDivider, executivePullQuote,
    statBlock, briefingPanel, campaignStep, articleCard,
    stoneSpacerTr, trainingPackReportCta,
    // Render-channel helpers
    screenSafeStyle, animFadeIn, animSlideUp, animSlideLeft, animSlideRight,
    // Misc
    pickUniqueSlotLines, nlEmojiIcon, nlHeroRaster,
    nlOuterOpen, nlOuterClose,
    spotlightLine, corporateTopicIntroHtml,
    // Article-derived helpers
    badge, fmtArticlePub, resolveArticleVisualType,
    // Constants
    NLFF, NLFF_SERIF
  };

  return {
    build,
    getTemplateCatalog,
    resolveArticleVisualType,
    registerTemplate,
    _components
  };
})();
