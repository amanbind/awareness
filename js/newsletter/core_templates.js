/* ═══════════════════════════════════════════════════════════
   newsletter/core_templates.js — awareness pack + digest variants
   Extracted from newsletter_builder.js. Registers 19 templates:
     Awareness pack: poster, knowbe4, people, infographic, quicktips,
                     redflags, stoplook, emaildissect, dodont, spotlight,
                     timeline, scorecard, poster1..poster5
     Digest:         cybertimes, newspaper (alias), testbrief
   Depends on App.NewsletterBuilder._components (loaded by the main file).
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const NB = window.App && window.App.NewsletterBuilder;
  if (!NB || !NB._components) {
    console.error('[core_templates] App.NewsletterBuilder._components is not available; check script load order.');
    return;
  }
  const { fmtDate, normalizeWebUrl } = (window.App && window.App.Utils) || {};
  const {
    tbl, tbc, tblx,
    escapeHtml, escAttr,
    mastheadKicker, foot, darkMasthead, intelligenceMasthead,
    goldBannerStrip, goldGradientBar, gradientFade,
    sectionBand, classificationBar, editorialDivider, executivePullQuote,
    statBlock, briefingPanel, campaignStep, articleCard,
    stoneSpacerTr, trainingPackReportCta,
    screenSafeStyle, animFadeIn, animSlideUp, animSlideLeft, animSlideRight,
    pickUniqueSlotLines, nlEmojiIcon, nlHeroRaster,
    nlOuterOpen, nlOuterClose,
    spotlightLine, corporateTopicIntroHtml,
    badge, fmtArticlePub, resolveArticleVisualType,
    NLFF, NLFF_SERIF
  } = NB._components;

  // Resolve a bundled brand/hero image to a self-contained data URI (from
  // assets/template_assets.js) so generated newsletters render the logos over
  // http, file://, and email. Falls back to the relative path when the bundle
  // isn't loaded (e.g. Node unit tests) — same behaviour as before.
  function assetSrc(name) {
    try {
      const map = (typeof window !== 'undefined' && window.App && window.App.TemplateAssets) ? window.App.TemplateAssets : null;
      if (map && map[name]) return map[name];
    } catch (_e) { /* fall through */ }
    return 'assets/' + name;
  }

  // ══════════════════════════════════════════════════
  //  TEMPLATE 1: CORPORATE ALERT (JPMorgan/Barclays style)
  //  Clean, authoritative, dark header, gold accents
  // ══════════════════════════════════════════════════
  function buildCorporateAlert(c, arts, wo, lk, poster, qr, illus) {
    // Email-safe icon: PNG data-URI img for modern clients, compact table for Outlook/Windows
    function corpIcon(pngUri, w, h, msoChar) {
      const msoTbl = `<table cellpadding="0" cellspacing="0" border="0" width="${w}" height="${h}"><tr><td align="center" valign="middle" width="${w}" height="${h}" bgcolor="#0D0D0D" style="background-color:#0D0D0D;border:1px solid #C09010;font-size:${Math.round(Math.min(w, h) * 0.52)}px;color:#D4A420;font-family:Arial;">${msoChar}</td></tr></table>`;
      return `<!--[if mso]>${msoTbl}<![endif]--><!--[if !mso]><!--><img src="${pngUri}" width="${w}" height="${h}" border="0" alt="" style="display:block;border:0;width:${w}px;height:${h}px;"><!--<![endif]-->`;
    }

    const WARN_PNG_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABICAYAAABhlHJbAAAB5UlEQVR4nO2b3U3DMBRGXcQ7yUBIrNBBkNgAdYNIDMIKkVgIJghPFwqtEyef74/T70h9aSs1PTrOtVQ3JUIIIWEZh27yvoZmGYdu6vt+iizxzvsCiBJSnzyiVsgC98j/+iJXyAL3Rq6+qBWGKnAcuul4Osy+53g6hNobhhLYImEEltQnRKowjMBWCSFwTX1ClArdBW6RJ0SQ6C6wdVwFIvUJ3hWyQBA3gTXqEzwrvPf40BI+3h6uPv/4/GV8JfO4FFizPsGrQnOBGvIED4kcIiCmAjXrE6wrZIEgZgIt6hMsKzQRaClPsJLIJQyiLtCjPsGiQhYIoirQsz5Bu0IWCKImMEJ9gmaFKgIjyRO0JHIJg1QXGLE+QaNCFghSVWDk+oTaFbJAkGoCW6hPqFlhFYEtyRNqSeQSBoGzabG+c95fp/T08rn5C7BAEEhg6/WlhN8LNwvcgzwBkRj2aEdKf493RDvSIWxKSLu+3LmYlHRFbhkoHCIgqwV61lfyOsKWeyELBFklcE+TN8faCosFWslbGhIW03iNRC5hkKKkvJau9z6wZFsTeiMddfN8zuISvoXBkaPkXjgr8JblCUsSOURAsgJZ3y9zFbJAkKsCWd8luQpZIMhFZt5/YG4B5EcoQggh5IdvtIsIiGjVb+IAAAAASUVORK5CYII=';
    const SHIELD_PNG_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAG4AAAB9CAYAAABDGVbOAAAEo0lEQVR4nO2dO3LbMBCG15lUqVjlKK59jhxAtSsfIpXqHMDncJ2jqGLlVikyUDAIKeGxj3/B/WYyIycSucTHfwUwEk0UBEEQBEEAxJN1AVJ8nJdrevzyuk53nF+tC+AmCfvx81v2d3QlmkvgFAeSpysXVvL+9nl77F2i2+JrZe3hXaK7grda4ShJoieBLgodTVctnlIIW5yWrD3QJcIVJNEKR0FspRCFWKerFqQUmu3ci6w9rCWq71CzFa7rSsuyiO/HopWq7EgzXeu67v6btETNFIptXLsV3hNWoplCIhmJ7BvUboWjeG2lLBtCaYWjeGql3S9GboWjeGilzS/w1gpHQW2l1U/UEsYl6/ev77fHz6cLyza1WmmNwC8tG5aStq7r7Q8HubStn3vhrrOkZXybxHEjMQh7krjkJSQF1qD+0QWE9y1O8uPReD9MqIibTdYemhJFW6VFO9mbiHBNUGqRPnZ2cdJv4DWUkrSl5UiNx3Qfz0tYytLAdFYZ9BPinALTKiWudHCCVh9E4qSudHCBWJ954u5d6eg5s+8NKuf2euvjwlwcFzUpSM9BaHWjuBfX07ZmEGgu7vl02Rz8mkFtfd3We9Wj/YzUJwnE5KTnSkc5mM+nS5WE8jk1iUW6EpMwT1yiZTC2pLXuK99GbfKQgEjcCL0DiiaiFXfiOBfC+esR1mYtuBMX/MWVOInLTl5T50pc8I8Q55QQ5xSYdVwNUlN4j0uDSJxTQpxTQpxTQpxTQpxTQpxTQpxTXKzjLK4hoq/t4BNndeEX/YIztDjrwbPe/z1gW+XoxxO49m39+ck9oBOX0B44RFElLsQF/wPbKkdA/BwkN9MlTuuuC9ZMJe6RnJnkVYt7eV2f8vtP7aF5y4icWilW8mrG5f3ts/q2UFMl7kg0iUNPHSrcaSOKxLmlWVxt6oJ6WtNGJJg47XZZu07TXs9JjcNUrdLbV6VG6BKH3C5R7uVVS0+bJBJO3NFnl5LH3y3OU+pmSxuRwkXmZVlM7qRnLQv6fpXIqUNnJG1Ek80qj4SKuKNNUjSOd1icRrvUvqIvvb/RNkmk+D/grZOUrXuRWNA6ydHqLiytUip11jNDif1zpI3IweTESp71SfMI1Q8L9a7p0AcxoTkJY0tcrOkew9UmiRy0ymAbVnE1qZt1TffouDjTRhSJcwu7uCOmTjttRJE4t5h9dyCdpZ5/RZll5xBJXMvSwGvbrK1bok0SgXxbx1P6UE40sfe4ngU5yqDs0VqfVNqIQBKXg5g+xBNKdFY5chkMZbB665BMGxFg4nIs04dy4uwhdkbkfJyXK9H4L4DXEDgqLHUYybQRKYlLcAiUlDciTUtYQlVc4uO8XJHSx5EyLWEJE3FEOOnzlLIcM3EJq/R5TFmOuTgi/fR5TVkOhLiEtMAZhCUgiigZbZ9b8kaloQhLQBWTw5W+mVKWA1dQCdfivQVkYQnYwko4Zp81ILbFLeALzJFMn4eU5bgosoRToDdhCVfFloy2Ty9tcQuXRef0pM9rynLcFl5Smz7PKctxfwA599I3Q8pypjiIklzgbMIOQRIYBEEQBEEQBEEQBEEQHIk/QJ6jsuZuZ0IAAAAASUVORK5CYII=';

    const SHIELD_TYPES = new Set(['Password & MFA', 'Ransomware', 'Vulnerability', 'Malware', 'Insider Threat']);
    function artIcon(visualType) {
      if (SHIELD_TYPES.has(visualType)) return corpIcon(SHIELD_PNG_URI, 48, 55, '&#128737;');
      return corpIcon(WARN_PNG_URI, 38, 34, '&#9888;');
    }

    // Header hero — full SVG shield for modern clients, compact badge for Outlook
    const heroBadge = illus ? `<td valign="top" align="right" width="104" style="padding-left:16px;">`
      + `<!--[if mso]><table cellpadding="0" cellspacing="0" border="0" width="88" height="100"><tr>`
      + `<td align="center" valign="middle" width="88" height="100" bgcolor="#0D0D0D" style="background-color:#0D0D0D;border:2px solid #C09010;font-size:46px;color:#D4A420;font-family:Arial;">&#128737;</td>`
      + `</tr></table><![endif]-->`
      + `<!--[if !mso]><!--><img src="${SHIELD_PNG_URI}" width="88" height="100" border="0" alt="" style="display:block;border:0;width:88px;height:100px;"><!--<![endif]-->`
      + `</td>` : '';

    // Article cards — icon aligned to headline (type label sits above icon+title row)
    const incidents = arts.map((a) => {
      const vtype = resolveArticleVisualType(a);
      const isShield = SHIELD_TYPES.has(vtype);
      // Icon column width = icon width + 14px visual gap (gap:.9rem equivalent)
      const iconColW = isShield ? 62 : 52;
      // 12px spacer before read-more (ref: margin-bottom:.75rem on body text)
      const readLink = lk && a.url
        ? `${tbl()}${tbc('', 'height="12" style="font-size:1px;line-height:12px;"')}${tblx()}`
          + `<a href="${escAttr(a.url)}" target="_blank" style="display:inline-block;font-size:11px;color:#B8860B;font-weight:bold;text-decoration:none;border:1px solid rgba(184,134,11,.35);padding:3px 10px;${NLFF}">&#8599; Read more — ${escapeHtml(a.source)}${fmtArticlePub(a) ? ` · ${escapeHtml(fmtArticlePub(a))}` : ''}</a>`
        : '';
      // What You Should Do — matches reference border-top + label style
      const watchoutsHtml = a.watchouts?.length
        ? `${tbl()}${tbc('', 'height="13" style="font-size:1px;line-height:13px;"')}${tblx()}`
          + `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #EDE8DE;">`
          + `<tr><td style="padding-top:11px;">`
          + `<span style="font-size:8px;letter-spacing:.13em;text-transform:uppercase;color:#888888;font-weight:bold;${NLFF}">What You Should Do</span>`
          + `${tbl()}${tbc('', 'height="6" style="font-size:1px;line-height:6px;"')}${tblx()}`
          + a.watchouts.map((w) =>
              `${tbl()}${tbc(
                `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="14" valign="top" style="font-size:13px;color:#B8860B;font-weight:bold;line-height:1.45;">&#8250;</td><td valign="top" style="font-size:13px;color:#222222;line-height:1.45;font-weight:500;${NLFF}">${escapeHtml(w)}</td></tr></table>`,
                'style="padding:0 0 4px 0;"'
              )}${tblx()}`
            ).join('')
          + `</td></tr></table>`
        : '';
      const metaRow = `<div style="margin-bottom:5px;">`
        + `<span style="font-size:8px;letter-spacing:0.14em;text-transform:uppercase;color:#B8860B;font-weight:bold;${NLFF}">${escapeHtml(a.type)}</span>`
        + `${badge(a.threatLevel) ? ` <span style="margin-left:5px;">${badge(a.threatLevel)}</span>` : ''}`
        + `</div>`;
      return `${tbl()}${tbc(
        metaRow
        + `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:11px;">`
        + `<tr>`
        + (illus ? `<td valign="middle" width="${iconColW}" style="padding-right:8px;">${artIcon(vtype)}</td>` : '')
        + `<td valign="middle"><span style="font-size:17px;font-weight:600;color:#0A0A0A;line-height:1.3;${NLFF_SERIF}">${escapeHtml(a.title)}</span></td>`
        + `</tr></table>`
        // Body text (ref: font-size:.86rem, line-height:1.65)
        + `<span style="font-size:14px;color:#333333;line-height:1.65;${NLFF}">${escapeHtml(a.summary || a.description || '')}</span>`
        + readLink + watchoutsHtml,
        // Article card bottom: 1.6rem = 26px (ref: padding-bottom:1.6rem + border-bottom)
        'style="padding:0 0 26px 0;margin:0;border-bottom:1px solid #E8E2D6;"'
      )}${tblx()}`;
    }).join('');

    // Key Takeaways — 3-column grid, spacing matches reference (1.6rem outer / 1.3rem inner)
    let alertStripRow = '';
    if (poster && wo.length) {
      const woArr = wo.slice(0, 6);
      let gridRows = '';
      for (let i = 0; i < woArr.length; i += 3) {
        const chunk = woArr.slice(i, i + 3);
        const cells = chunk.map((w, j) => {
          const num = String(i + j + 1).padStart(2, '0');
          return `<td valign="top" width="33%" style="padding:4px;">`
            // Card styling aligned with Template 1 — Key Takeaways (imported standalone pack)
            + `<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#141414" style="background-color:#141414;border:1px solid rgba(255,255,255,0.08);height:122px;border-radius:5px;" height="122">`
            + `<tr><td valign="top" style="padding:16px 13px;height:122px;background-color:rgba(255,255,255,0.03);" height="122">`
            + `<span style="font-size:21px;font-weight:bold;color:#D4A420;line-height:1;${NLFF_SERIF}">${num}</span>`
            + `${tbl()}${tbc('', 'height="6" style="font-size:1px;line-height:6px;"')}${tblx()}`
            + `<span style="font-size:12px;color:rgba(255,255,255,0.85);line-height:1.4;font-weight:500;${NLFF}">${escapeHtml(w)}</span>`
            + `</td></tr></table></td>`;
        });
        while (cells.length < 3) cells.push(`<td width="33%" style="padding:4px;"></td>`);
        gridRows += `<tr>${cells.join('')}</tr>`;
      }
      // Outer: 1.6rem 2rem = 26px 32px (ref). Inner box border + 1.3rem = 21px padding (ref)
      alertStripRow = tbc(
        `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(184,134,11,0.22);border-radius:6px;">`
        + `<tr><td height="3" bgcolor="#D4A420" style="background-color:#D4A420;height:3px;font-size:1px;line-height:3px;">&nbsp;</td></tr>`
        + `<tr><td style="padding:21px;">`
        + `<span style="font-size:18px;font-weight:bold;color:#D4A420;${NLFF_SERIF}">Key Takeaways This Edition</span>`
        + `${tbl()}${tbc('', 'height="11" style="font-size:1px;line-height:11px;"')}${tblx()}`
        + `<table width="100%" cellpadding="0" cellspacing="8" border="0"><tbody>${gridRows}</tbody></table>`
        + `${tbl()}${tbc('', 'height="14" style="font-size:1px;line-height:14px;"')}${tblx()}`
        + `<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#C09010" style="background-color:#C09010;border-radius:5px;">`
        + `<tr><td align="center" style="padding:10px;font-size:12px;font-weight:bold;letter-spacing:.1em;text-transform:uppercase;color:#FFFFFF;${NLFF}">STOP · THINK · REPORT — ${escapeHtml((c.soc || '').trim())}</td></tr></table>`
        + `</td></tr></table>`,
        'data-nl-nav="nl-key-takeaways" bgcolor="#0A0A0A" style="padding:26px 35px;background-color:#0A0A0A;margin:0;"'
      );
    }

    // CTA — inset dark box inside light row, matches reference (padding:1.5rem 2rem / margin:1.5rem 0)
    const mail = escAttr(`mailto:${(c.soc || '').trim()}`);
    const socShow = escapeHtml((c.soc || '').trim());
    const corpReportCTA = tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0A0A0A" style="background-color:#0A0A0A;border-left:4px solid #C09010;">`
      + `<tr><td style="padding:24px 32px;">`
      + `<span style="font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#D4A420;font-weight:bold;${NLFF}">See Something Suspicious?</span>`
      + `${tbl()}${tbc('', 'height="4" style="font-size:1px;line-height:4px;"')}${tblx()}`
      + `<span style="font-size:17px;font-weight:bold;color:#FFFFFF;line-height:1.25;${NLFF_SERIF}">Don't Click. Don't Reply. Report It.</span>`
      + `${tbl()}${tbc('', 'height="5" style="font-size:1px;line-height:5px;"')}${tblx()}`
      + `<span style="font-size:12px;color:rgba(255,255,255,0.45);line-height:1.5;${NLFF}">Forward suspicious emails to the security team. Every report helps protect our entire organization.</span>`
      + `${tbl()}${tbc('', 'height="16" style="font-size:1px;line-height:16px;"')}${tblx()}`
      + `<table border="0" cellpadding="0" cellspacing="0"><tr>`
      + `<td bgcolor="#C09010" style="background-color:#C09010;border-radius:5px;">`
      + `<a href="${mail}" style="display:inline-block;color:#FFFFFF;font-weight:bold;font-size:12px;padding:11px 22px;text-decoration:none;${NLFF}">Report to ${socShow}</a>`
      + `</td></tr></table>`
      + `</td></tr></table>`,
      'data-nl-nav="nl-cta" bgcolor="#F8F5EF" style="padding:24px 35px;background-color:#F8F5EF;"'
    );

    return `${nlOuterOpen()}${tbl()}`
      + tbc('', 'height="5" style="height:5px;line-height:5px;font-size:1px;background:linear-gradient(135deg,#C09010,#D4A420);background-color:#D4A420;"')
      // Dark header — ref: padding:2.2rem 2.5rem 1.8rem = 35px 40px 29px
      + tbc(
          `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>`
          + `<td valign="top" style="padding-right:16px;">`
          + `<span style="font-size:8px;letter-spacing:.28em;text-transform:uppercase;color:rgba(212,164,32,.7);font-weight:bold;${NLFF}">${escapeHtml((c.freq || 'Weekly').trim())} Security Bulletin · ${escapeHtml((c.org || '').trim() || 'ABC Corp')}</span>`
          + `${tbl()}${tbc('', 'height="9" style="font-size:1px;line-height:9px;"')}${tblx()}`
          + `<span style="font-size:35px;font-weight:bold;color:#FFFFFF;line-height:1.08;${NLFF_SERIF}">Stay Safe<br><span style="color:#D4A420;font-style:italic;">Online</span></span>`
          + `${tbl()}${tbc('', 'height="5" style="font-size:1px;line-height:5px;"')}${tblx()}`
          + `<span style="font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.28);${NLFF}">${fmtDate(c.issueDate || new Date())}</span></td>`
          + heroBadge + `</tr></table>`,
          'data-nl-nav="nl-header" bgcolor="#0A0A0A" style="padding:35px 40px 29px;background-color:#0A0A0A;margin:0;"'
        )
      // Gold announcement bar — ref: padding:.5rem 2rem = 8px 32px
      + tbc(
          `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#C09010" style="padding:8px 32px;background-color:#C09010;font-size:10px;font-weight:bold;letter-spacing:.18em;text-transform:uppercase;color:#FFFFFF;${NLFF}">&#9888; THINK BEFORE YOU CLICK — PROTECT YOURSELF AND YOUR TEAM</td></tr></table>`,
          'style="padding:0;margin:0;"'
        )
      // 48px transition bar (ref: height:48px gradient dark→light)
      + tbc('', 'height="48" bgcolor="#0A0A0A" style="background-color:#0A0A0A;font-size:1px;line-height:48px;height:48px;"')
      // Content area — ref: padding:1.8rem 2.2rem = 29px 35px
      + tbc(`${corporateTopicIntroHtml(c)}${incidents}`, 'data-nl-nav="nl-articles" bgcolor="#F8F5EF" style="padding:29px 35px 0;background-color:#F8F5EF;margin:0;"')
      + alertStripRow
      + corpReportCTA
      + tbc(foot(c, qr), 'data-nl-nav="nl-footer" style="padding:0;margin:0;"')
      + `${tblx()}${nlOuterClose()}`;
  }

  // ══════════════════════════════════════════════════
  //  TEMPLATE 2: OPERATIONAL TRAINING DISPATCH
  //  Tiered intelligence brief — masthead + threat dossier + training summary
  // ══════════════════════════════════════════════════
  function buildKnowBe4Style(c, arts, wo, lk, poster, qr, illus) {
    const top      = arts.slice(0, 4);
    const highest  = top.reduce((m, a) => Math.max(m, a.threatLevel || 0), 0);
    const cards    = top.map((a, i) => articleCard(a, i, c, false)).join('');
    const summary  = escapeHtml((wo[0] || (arts[0] && arts[0].summary) || 'This dispatch consolidates the most material protective intelligence for the workforce. Review each item and apply the operational guidance to your daily workflow.').slice(0, 220));
    const trainingSteps = (wo.length ? wo.slice(0, 3) : [
      'Verify the sender and link target before acting on any unsolicited request.',
      'Apply multi-factor authentication and rotate compromised credentials immediately.',
      'Escalate suspected social-engineering attempts to the security team without delay.'
    ]);
    const stepCards = trainingSteps.map((t, i) => `
      <td valign="top" width="33%" style="padding:0 6px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0F0F0F" style="background-color:#0F0F0F;border-top:3px solid #D4A420;height:130px;" height="130">
          <tr><td valign="top" style="padding:14px 16px;">
            <span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#D4A420;font-weight:bold;${NLFF}">Action ${String(i+1).padStart(2,'0')}</span><br><br>
            <span style="font-size:12px;color:rgba(255,255,255,0.86);line-height:1.55;${NLFF}">${escapeHtml(String(t).slice(0, 120))}</span>
          </td></tr>
        </table>
      </td>`).join('');
    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${classificationBar(highest, 'INTERNAL // TRAINING DISPATCH // FOR ALL STAFF')}${intelligenceMasthead(c, `${c.freq || 'Weekly'} Training Dispatch`, summary)}${tbc('',
      'height="6" bgcolor="#0A0A0A" style="background-color:#0A0A0A;font-size:1px;line-height:6px;height:6px;border-bottom:1px solid #D4A420;"'
    )}${editorialDivider('Threat Dossier · Items Under Review', '#F5F1EA', '#0A0A0A')}${tbc(
      cards,
      'bgcolor="#F5F1EA" style="padding:18px 28px 6px;background-color:#F5F1EA;margin:0;"'
    )}${editorialDivider('Training Directive · Apply This Cycle', '#0A0A0A', '#D4A420')}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${stepCards}</tr></table>`,
      'bgcolor="#0A0A0A" style="padding:22px 22px 22px;background-color:#0A0A0A;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }

  // ══════════════════════════════════════════════════
  //  TEMPLATE 3: INSIDER BRIEFING (editorial light)
  //  Magazine-toned briefing — cream masthead, pull quote, intelligence panels
  // ══════════════════════════════════════════════════
  function buildPeopleTalking(c, arts, wo, lk, poster, qr, illus) {
    const top      = arts.slice(0, 4);
    const highest  = top.reduce((m, a) => Math.max(m, a.threatLevel || 0), 0);
    const cards    = top.map((a, i) => articleCard(a, i, c, false)).join('');
    const orgLine  = escapeHtml((c.org || 'Your Organisation').trim());
    const dateStr  = escapeHtml(String(fmtDate(c.issueDate || new Date())).toUpperCase());
    const titleStr = escapeHtml(c.title || 'This Week from the Security Team');
    const opening  = escapeHtml((wo[0] || (arts[0] && arts[0].summary) || 'Each week we surface the protective intelligence most relevant to the workforce. Treat this brief as a working document — read it, share the operational guidance, and report any matching activity to the security team.').slice(0, 260));
    const quoteText = (wo[1] || wo[0] || 'The fastest control your organisation has is a trained colleague who pauses before acting.').replace(/\.+$/, '');
    const closingLines = (wo.slice(0, 3).length ? wo.slice(0, 3) : [
      'Read each item and adopt the operational guidance into your routine.',
      'Forward this brief to one colleague who would benefit from it.',
      'Report anomalies — your reports are the most reliable signal we have.'
    ]).map((w, i) => `<tr>
      <td width="22" valign="top" align="center" style="padding:6px 8px 6px 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="20" height="20"><tr><td align="center" valign="middle" width="20" height="20" bgcolor="#0A0A0A" style="background-color:#0A0A0A;font-size:10px;color:#D4A420;font-weight:bold;${NLFF_SERIF}">${i+1}</td></tr></table>
      </td>
      <td valign="middle" style="padding:6px 0;font-size:13px;color:#1A1A1A;line-height:1.6;${NLFF}">${escapeHtml(w)}</td>
    </tr>`).join('');
    return `${nlOuterOpen()}${tbl()}${tbc('',
      'height="6" style="height:6px;line-height:6px;font-size:1px;background:linear-gradient(90deg,#B8860B 0%,#D4A420 50%,#C09010 100%);background-color:#D4A420;"'
    )}${classificationBar(highest, 'INTERNAL // INSIDER BRIEFING // STAFF DISTRIBUTION')}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:36px 36px 8px;">
          <span style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#B8860B;font-weight:bold;${NLFF}">${escapeHtml((c.freq || 'Weekly').toUpperCase())} INSIDER BRIEFING &middot; ${dateStr}</span>
        </td></tr>
        <tr><td style="padding:8px 36px 14px;">
          <span style="font-size:38px;font-weight:bold;color:#0A0A0A;line-height:1.04;${NLFF_SERIF}">${titleStr}</span>
        </td></tr>
        <tr><td style="padding:0 36px 12px;">
          <table width="64" cellpadding="0" cellspacing="0" border="0"><tr><td height="3" bgcolor="#D4A420" style="background-color:#D4A420;height:3px;font-size:1px;">&nbsp;</td></tr></table>
        </td></tr>
        <tr><td style="padding:8px 36px 0;">
          <span style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#888888;${NLFF}">From the desk of ${orgLine} Security</span>
        </td></tr>
        <tr><td style="padding:14px 36px 30px;">
          <span style="font-size:60px;float:left;line-height:0.85;color:#D4A420;font-weight:bold;padding:6px 12px 0 0;${NLFF_SERIF}">&ldquo;</span>
          <span style="font-size:15px;color:#2A2A2A;line-height:1.78;${NLFF}">${opening}</span>
        </td></tr>
      </table>`,
      'bgcolor="#FAF8F2" style="background-color:#FAF8F2;padding:0;margin:0;"'
    )}${editorialDivider('Items Selected For This Issue', '#FFFFFF', '#0A0A0A')}${tbc(
      cards,
      'bgcolor="#FAF8F2" style="padding:18px 28px 6px;background-color:#FAF8F2;margin:0;"'
    )}${executivePullQuote(quoteText, `${orgLine} Security Awareness`, '#FFFFFF')}${editorialDivider('How to Use This Brief', '#FAF8F2', '#0A0A0A')}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">${closingLines}</table>`,
      'bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:22px 32px;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }

  // ══════════════════════════════════════════════════
  //  TEMPLATE 4: PHISHING ANATOMY DIAGRAM
  //  Educational anatomy — hook SVG hero, anatomical callouts, real specimens
  // ══════════════════════════════════════════════════
  function buildSpotThePhish(c, arts, wo, lk, poster, qr, illus) {
    const highest  = arts.reduce((m, a) => Math.max(m, a.threatLevel || 0), 0);
    const hookSvg  = `<!--[if !mso]><!-- --><svg width="120" height="160" viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg"><path d="M60 8 L60 70 Q60 100 84 100 Q104 100 104 82" fill="none" stroke="#D4A420" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="6" r="4" fill="#D4A420"/><path d="M104 82 Q104 70 92 70 Q80 70 80 84 Q80 96 92 96" fill="none" stroke="#D4A420" stroke-width="3" stroke-linecap="round"/><path d="M92 96 L98 102 M92 96 L86 102" stroke="#D4A420" stroke-width="3" stroke-linecap="round"/><rect x="20" y="118" width="80" height="32" fill="none" stroke="rgba(212,164,32,0.4)" stroke-width="1.5"/><text x="60" y="139" font-family="Georgia,serif" font-size="11" fill="#D4A420" text-anchor="middle" letter-spacing="2">PHISH</text></svg><!--<![endif]--><!--[if mso]><table width="120" height="160" border="0" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" bgcolor="#0A0A0A" style="background:#0A0A0A;border:2px solid #D4A420;font-family:Arial;font-size:60px;color:#D4A420;">&#9888;</td></tr></table><![endif]-->`;
    const stats = [
      { n: '91%',  l: 'of confirmed breaches begin with a phishing email reaching an inbox.', col: '#E74C3C' },
      { n: '1 in 4', l: 'employees who receive a sophisticated phish will engage with it.',     col: '#D4A420' },
      { n: '< 60s', l: 'is the median time from delivery to first click on a successful phish.', col: '#27AE60' }
    ];
    const statRow = `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${stats.map(s => `
      <td valign="top" width="33%" style="padding:0 6px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0F0F0F" style="background-color:#0F0F0F;border-left:3px solid ${s.col};height:124px;" height="124">
          <tr><td valign="top" style="padding:14px 16px;">
            <span style="font-size:32px;font-weight:bold;color:${s.col};line-height:1;${NLFF_SERIF}">${s.n}</span><br><br>
            <span style="font-size:11px;color:rgba(255,255,255,0.65);line-height:1.55;${NLFF}">${escapeHtml(s.l)}</span>
          </td></tr>
        </table>
      </td>`).join('')}</tr></table>`;

    const anatomy = [
      { label: 'A. Spoofed Origin',  body: 'Sender displays a trusted name but the underlying domain has substituted, inserted, or homoglyph characters — e.g. amaz0n.com or rnicrosoft.com.' },
      { label: 'B. Manufactured Urgency', body: 'Subject lines and copy invent deadlines, threats, or loss to push the reader past their normal verification habits.' },
      { label: 'C. Mismatched Link Target', body: 'Visible link text differs from the underlying URL. Hover the link in the desktop client; the true destination renders in the status bar.' },
      { label: 'D. Authority Impersonation', body: 'Attackers borrow leadership, IT, payroll, or vendor identities. Verify all financial or credential requests on a second channel.' }
    ];
    const anatRows = anatomy.map(a => `<tr>
      <td width="48" valign="top" align="center" style="padding:14px 0 14px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="32" height="32"><tr><td align="center" valign="middle" width="32" height="32" style="border:1.5px solid #D4A420;font-size:13px;font-weight:bold;color:#D4A420;letter-spacing:1px;${NLFF_SERIF}">${a.label.charAt(0)}</td></tr></table>
      </td>
      <td valign="top" style="padding:14px 22px 14px 16px;border-bottom:1px solid #EDE8DC;">
        <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#0A0A0A;font-weight:bold;${NLFF}">${escapeHtml(a.label)}</span><br><br>
        <span style="font-size:13px;color:#3A3A3A;line-height:1.7;${NLFF}">${escapeHtml(a.body)}</span>
      </td>
    </tr>`).join('');

    const specimens = arts.slice(0, 4).map((a, i) => articleCard(a, i, c, false)).join('');

    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${classificationBar(highest, 'INTERNAL // PHISHING AWARENESS DIAGRAM // STAFF DISTRIBUTION')}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="140" valign="top" align="center" style="padding:32px 12px 32px 28px;">${hookSvg}</td>
          <td valign="middle" style="padding:32px 28px 32px 8px;">
            <span style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:rgba(212,164,32,0.78);font-weight:bold;${NLFF}">${escapeHtml((c.freq || 'Weekly').toUpperCase())} ANATOMY BRIEF</span><br><br>
            <span style="font-size:34px;font-weight:bold;color:#FFFFFF;line-height:1.05;${NLFF_SERIF}">${escapeHtml(c.title || 'Anatomy of a Phish')}</span><br><br>
            <table width="60" cellpadding="0" cellspacing="0" border="0"><tr><td height="2" bgcolor="#D4A420" style="background-color:#D4A420;height:2px;font-size:1px;">&nbsp;</td></tr></table><br>
            <span style="font-size:13px;color:rgba(255,255,255,0.62);line-height:1.7;${NLFF}">${escapeHtml((wo[0] || 'Most phishing emails share four anatomical features. Learn the diagram and you will catch them before they catch you.').slice(0, 180))}</span>
          </td>
        </tr>
      </table>`,
      'bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:0;margin:0;"'
    )}${tbc(
      statRow,
      'bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:0 22px 26px;margin:0;"'
    )}${editorialDivider('The Anatomy · Four Diagnostic Features', '#FFFFFF', '#0A0A0A')}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">${anatRows}</table>`,
      'bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:0;margin:0;"'
    )}${editorialDivider('Verified Specimens · This Cycle', '#F5F1EA', '#0A0A0A')}${tbc(
      specimens,
      'bgcolor="#F5F1EA" style="background-color:#F5F1EA;padding:18px 28px 6px;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }

  // ══════════════════════════════════════════════════
  //  TEMPLATE 5: FIELD REFERENCE CARD (printable rules)
  //  Two-column directive layout — serif headlines + supporting body
  // ══════════════════════════════════════════════════
  function buildQuickRules(c, arts, wo, lk, poster, qr, illus) {
    const allTips = [...wo];
    const defaults = [
      'Think before you click any link',
      "Check the sender's email address carefully",
      "Don't share your password with anyone",
      'Turn on two-step login (MFA) on all accounts',
      'Report suspicious emails to IT immediately',
      "Don't open unexpected attachments",
      'Use a different password for each website',
      'Lock your screen when you leave your desk'
    ];
    while (allTips.length < 6) allTips.push(defaults[allTips.length] || 'Stay alert');
    const tips = allTips.slice(0, 6);
    const detail = (t) => {
      const k = t.toLowerCase();
      if (k.includes('click')) return 'Scammers hide dangerous links in emails, texts, and pop-ups. Always hover over a link to see where it really goes before clicking.';
      if (k.includes('sender') || k.includes('email address')) return 'Scammers make emails look like they come from your boss, your bank, or IT. Always check the FULL email address — not just the name.';
      if (k.includes('password') && k.includes('share')) return "IT will NEVER ask for your password by email, text, or phone. If someone does — it's a scam, every time.";
      if (k.includes('mfa') || k.includes('two-step')) return "Two-step login adds a second lock to your account. Even if someone steals your password, they still can't get in.";
      if (k.includes('report')) return 'When you report a suspicious email, you could stop a scam from reaching hundreds of your colleagues. Never be embarrassed — reporting is heroic.';
      if (k.includes('attachment')) return "Unexpected attachments can contain viruses that lock all your files. If you weren't expecting it, DON'T open it — forward to IT.";
      if (k.includes('different password')) return 'If a hacker cracks one password, they try it everywhere. Different passwords keep your other accounts safe. Use a password manager.';
      if (k.includes('lock')) return 'Anyone walking by could access your accounts in seconds. Press Win+L (Windows) or Ctrl+Cmd+Q (Mac) every time you stand up.';
      return 'This one small action protects you AND every colleague in the company. Cyber safety is a team sport.';
    };

    // Render rules as two-column field reference; each cell has serif rule headline + supporting body
    const ruleCell = (t, i) => {
      const num = String(i + 1).padStart(2, '0');
      return `<td valign="top" width="50%" style="padding:0 8px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px solid #E8E3D8;border-top:3px solid #D4A420;height:172px;" height="172">
          <tr><td valign="top" style="padding:16px 18px 14px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td valign="middle"><span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#B8860B;font-weight:bold;${NLFF}">Rule ${num}</span></td>
              <td align="right" valign="middle"><span style="font-size:9px;letter-spacing:1px;color:#BBBBBB;${NLFF}">${i + 1}/${tips.length}</span></td>
            </tr></table>
            <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="10" style="font-size:1px;line-height:10px;">&nbsp;</td></tr></table>
            <span style="font-size:16px;font-weight:bold;color:#0A0A0A;line-height:1.3;${NLFF_SERIF}">${escapeHtml(t)}</span>
            <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="8" style="font-size:1px;line-height:8px;">&nbsp;</td></tr></table>
            <span style="font-size:12px;color:#555555;line-height:1.6;${NLFF}">${escapeHtml(detail(t))}</span>
          </td></tr>
        </table>
      </td>`;
    };
    const ruleRows = [];
    for (let i = 0; i < tips.length; i += 2) {
      const left  = ruleCell(tips[i], i);
      const right = i + 1 < tips.length ? ruleCell(tips[i + 1], i + 1) : '<td width="50%" style="padding:0 8px;"></td>';
      ruleRows.push(`<tr>${left}${right}</tr>`);
    }
    const grid = `<table width="100%" cellpadding="0" cellspacing="0" border="0">${ruleRows.join('')}</table>`;

    const briefCards = arts.slice(0, 2).map(a => {
      const lv  = a.threatLevel || 0;
      const lvC = ['#666666','#27AE60','#8BC34A','#F39C12','#E67E22','#E74C3C'][Math.min(lv, 5)];
      const sum = escapeHtml((a.summary || a.description || '').split('. ').slice(0, 2).join('. ').replace(/\.+$/, '') + '.');
      return `<td valign="top" width="50%" style="padding:0 6px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#141414" style="background-color:#141414;border-left:3px solid ${lvC};">
          <tr><td style="padding:14px 16px;">
            <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:${lvC};font-weight:bold;${NLFF}">${escapeHtml(a.type || 'Advisory')}</span><br><br>
            <span style="font-size:14px;font-weight:bold;color:#FFFFFF;line-height:1.3;${NLFF_SERIF}">${escapeHtml(a.title || '')}</span><br><br>
            <span style="font-size:12px;color:rgba(255,255,255,0.62);line-height:1.55;${NLFF}">${sum}</span>
          </td></tr>
        </table>
      </td>`;
    }).join('');

    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${classificationBar(0, 'INTERNAL // FIELD REFERENCE CARD // DESK-SIDE GUIDANCE')}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:32px 32px 6px;">
          <span style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:rgba(212,164,32,0.78);font-weight:bold;${NLFF}">FIELD REFERENCE &middot; ${escapeHtml((c.freq || 'Weekly').toUpperCase())} ISSUE</span>
        </td></tr>
        <tr><td style="padding:12px 32px 8px;">
          <span style="font-size:36px;font-weight:bold;color:#FFFFFF;line-height:1.05;${NLFF_SERIF}">${escapeHtml(c.title || 'Quick Safety Rules')}</span>
        </td></tr>
        <tr><td style="padding:0 32px 18px;">
          <table width="80" cellpadding="0" cellspacing="0" border="0"><tr><td height="2" bgcolor="#D4A420" style="background-color:#D4A420;height:2px;font-size:1px;">&nbsp;</td></tr></table>
        </td></tr>
        <tr><td style="padding:6px 32px 30px;">
          <span style="font-size:13px;color:rgba(255,255,255,0.6);line-height:1.7;${NLFF}">Print or pin these ${tips.length} directives. They cover the controls that stop the majority of attacks against staff and contractors.</span>
        </td></tr>
      </table>`,
      'bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:0;margin:0;"'
    )}${editorialDivider('Standing Directives · Apply Daily', '#F8F5EF', '#0A0A0A')}${tbc(
      grid,
      'bgcolor="#F8F5EF" style="padding:18px 14px 4px;background-color:#F8F5EF;margin:0;"'
    )}${editorialDivider('Why This Matters · Active Threats', '#0A0A0A', '#D4A420')}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${briefCards}</tr></table>`,
      'bgcolor="#0A0A0A" style="padding:18px 22px;background-color:#0A0A0A;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }

  // ══════════════════════════════════════════════════
  //  TEMPLATE 6: INVESTIGATION CHECKLIST DOSSIER
  //  Case-file aesthetic — file number masthead, indicator entries, evidence panels
  // ══════════════════════════════════════════════════
  function buildRedFlags(c, arts, wo, lk, poster, qr, illus) {
    const dateStr = String(fmtDate(c.issueDate || c.date || new Date())).toUpperCase();
    const fileNo  = 'DOS-' + String(new Date(c.issueDate || c.date || Date.now()).getFullYear()) + '-' + String((arts[0] && arts[0].title ? arts[0].title.length : 7) % 10) + String(arts.length || 4).padStart(2, '0');
    const flags = [
      { code: 'IND-01', flag: 'Sender domain has substituted characters',          detail: 'Display name is trusted but the underlying domain uses look-alike characters (e.g. amaz0n-help.com, rnicrosoft.com).' },
      { code: 'IND-02', flag: 'Subject manufactures urgency or threat',            detail: 'Language pressures the recipient with deadlines, account closure, or financial loss to bypass normal verification.' },
      { code: 'IND-03', flag: 'Request for credentials or authentication codes',   detail: 'No internal or vendor process requires users to share passwords, MFA codes, or recovery keys by email or chat.' },
      { code: 'IND-04', flag: 'Link target does not match link text',              detail: 'Hover over the link in a desktop client; the destination shown in the status bar differs from what the email claims.' },
      { code: 'IND-05', flag: 'Unsolicited attachment from external party',        detail: 'Documents, archives, or scripts arriving without prior business context are a primary delivery channel for malware.' },
      { code: 'IND-06', flag: 'Tone mismatch from a known correspondent',          detail: 'Compromised accounts retain access to history. Watch for changes in greeting, signature, or phrasing in an otherwise familiar thread.' },
      { code: 'IND-07', flag: 'Unexpected reward, refund, or prize',               detail: 'Communications announcing winnings, refunds, or financial windfalls that the recipient did not initiate are virtually always fraudulent.' },
      { code: 'IND-08', flag: 'Executive request for a financial action',          detail: 'Treat any senior-leadership request for transfer, gift cards, or vendor change as suspect until verified out-of-band by phone.' }
    ];

    const flagRows = flags.map((f, i) => `<tr>
      <td width="92" valign="top" style="padding:14px 0 14px 22px;border-bottom:1px solid #EDE8DC;">
        <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#B8860B;font-weight:bold;${NLFF}">${escapeHtml(f.code)}</span><br>
        <span style="font-size:22px;font-weight:bold;color:#0A0A0A;line-height:1;${NLFF_SERIF}">${String(i + 1).padStart(2, '0')}</span>
      </td>
      <td valign="top" style="padding:14px 22px 14px 14px;border-bottom:1px solid #EDE8DC;">
        <span style="font-size:15px;font-weight:bold;color:#0A0A0A;line-height:1.32;${NLFF_SERIF}">${escapeHtml(f.flag)}</span><br>
        <span style="font-size:12px;color:#555555;line-height:1.6;${NLFF}">${escapeHtml(f.detail)}</span>
      </td>
      <td width="80" align="right" valign="middle" style="padding:14px 22px 14px 0;border-bottom:1px solid #EDE8DC;">
        <span style="font-size:8px;padding:3px 9px;background-color:#FCEDED;color:#C0392B;border:1px solid #F2C6C6;letter-spacing:2px;text-transform:uppercase;font-weight:bold;${NLFF}">FLAG</span>
      </td>
    </tr>`).join('');

    const evidence = arts.slice(0, 2).map((a, i) => articleCard(a, i, c, false)).join('');

    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${classificationBar(2, `INTERNAL // INVESTIGATION CHECKLIST // FILE ${fileNo}`)}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:34px 32px 4px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="bottom"><span style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:rgba(212,164,32,0.78);font-weight:bold;${NLFF}">SECURITY DOSSIER &middot; ${escapeHtml(c.freq || 'Weekly').toUpperCase()} ISSUE</span></td>
            <td align="right" valign="bottom"><span style="font-size:9px;letter-spacing:2px;color:rgba(255,255,255,0.32);${NLFF}">${escapeHtml(dateStr)} &middot; FILE ${escapeHtml(fileNo)}</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:14px 32px 6px;">
          <span style="font-size:38px;font-weight:bold;color:#FFFFFF;line-height:1.04;${NLFF_SERIF}">${escapeHtml(c.title || 'Red Flag Checklist')}</span>
        </td></tr>
        <tr><td style="padding:0 32px 16px;">
          <table width="80" cellpadding="0" cellspacing="0" border="0"><tr><td height="2" bgcolor="#D4A420" style="background-color:#D4A420;height:2px;font-size:1px;">&nbsp;</td></tr></table>
        </td></tr>
        <tr><td style="padding:6px 32px 28px;">
          <span style="font-size:13px;color:rgba(255,255,255,0.6);line-height:1.72;${NLFF}">${escapeHtml((wo[0] || 'These eight indicators appear in nearly every successful phishing case. Treat any single match as grounds to slow down, verify out-of-band, and report.').slice(0, 200))}</span>
        </td></tr>
      </table>`,
      'bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:0;margin:0;"'
    )}${editorialDivider('Indicators of Suspicious Activity', '#FFFFFF', '#0A0A0A')}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">${flagRows}</table>`,
      'bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:0;margin:0;"'
    )}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="6" bgcolor="#D4A420" style="background-color:#D4A420;">&nbsp;</td>
        <td bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:18px 22px;">
          <span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#D4A420;font-weight:bold;${NLFF}">Standing Order</span><br><br>
          <span style="font-size:16px;font-weight:bold;color:#FFFFFF;line-height:1.35;${NLFF_SERIF}">If any indicator is present — do not click, do not reply. Forward to ${escapeHtml((c.soc || 'security').trim())} without modifying the message.</span>
        </td>
      </tr></table>`,
      'style="padding:0;margin:0;"'
    )}${editorialDivider('Linked Cases · Verified Specimens', '#F5F1EA', '#0A0A0A')}${tbc(
      evidence,
      'bgcolor="#F5F1EA" style="background-color:#F5F1EA;padding:18px 28px 6px;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }

  // ══════════════════════════════════════════════════
  //  TEMPLATE 7: MISSION CAMPAIGN POSTER
  //  Three-phase mission protocol — vertical pillars with SVG sentinels
  // ══════════════════════════════════════════════════
  function buildStopLookReport(c, arts, wo, lk, poster, qr, illus) {
    const stopSvg   = `<!--[if !mso]><!-- --><svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><polygon points="14,4 34,4 44,14 44,34 34,44 14,44 4,34 4,14" fill="none" stroke="#FFFFFF" stroke-width="2.5"/><line x1="14" y1="14" x2="34" y2="34" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/><line x1="34" y1="14" x2="14" y2="34" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/></svg><!--<![endif]--><!--[if mso]><span style="font-family:Arial;font-size:30px;color:#FFFFFF;">&#10007;</span><![endif]-->`;
    const lookSvg   = `<!--[if !mso]><!-- --><svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="22" r="14" fill="none" stroke="#FFFFFF" stroke-width="2.5"/><circle cx="22" cy="22" r="6" fill="#FFFFFF"/><line x1="32" y1="32" x2="42" y2="42" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/></svg><!--<![endif]--><!--[if mso]><span style="font-family:Arial;font-size:30px;color:#FFFFFF;">&#128269;</span><![endif]-->`;
    const reportSvg = `<!--[if !mso]><!-- --><svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M8 8 L8 40" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/><path d="M8 8 L36 8 L30 16 L36 24 L8 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/></svg><!--<![endif]--><!--[if mso]><span style="font-family:Arial;font-size:30px;color:#FFFFFF;">&#9873;</span><![endif]-->`;

    const phases = [
      { bg: '#7F1F18', accent: '#FFFFFF', tag: 'PHASE 01', verb: 'STOP', svg: stopSvg,
        head: 'Halt the action.',
        lines: [
          'Do not click links from unexpected senders.',
          'Do not reply with credentials or personal data.',
          'Do not open unverified attachments or archives.'
        ]},
      { bg: '#8B5A0E', accent: '#FFFFFF', tag: 'PHASE 02', verb: 'LOOK', svg: lookSvg,
        head: 'Inspect the artefact.',
        lines: [
          'Verify the sender domain — full address, not display name.',
          'Hover every link; confirm the destination matches.',
          'Cross-check unusual requests on a separate channel.'
        ]},
      { bg: '#1E5C3B', accent: '#FFFFFF', tag: 'PHASE 03', verb: 'REPORT', svg: reportSvg,
        head: 'Escalate the signal.',
        lines: [
          `Forward the email to ${(c.soc || 'security@company.com').trim()} without modification.`,
          'Preserve attachments and headers — they are evidence.',
          'If you already engaged, call IT immediately.'
        ]}
    ];

    const pillarRow = phases.map((p, i) => `<td valign="top" width="33%" bgcolor="${p.bg}" style="background-color:${p.bg};padding:32px 22px 30px;border-right:${i < phases.length - 1 ? '1px solid rgba(255,255,255,0.18)' : 'none'};">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom:14px;">${p.svg}</td></tr>
        <tr><td align="center" style="padding-bottom:6px;">
          <span style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.6);font-weight:bold;${NLFF}">${escapeHtml(p.tag)}</span>
        </td></tr>
        <tr><td align="center" style="padding-bottom:10px;">
          <span style="font-size:36px;font-weight:bold;color:${p.accent};line-height:1;letter-spacing:3px;${NLFF_SERIF}">${escapeHtml(p.verb)}</span>
        </td></tr>
        <tr><td align="center" style="padding-bottom:14px;">
          <table width="42" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td height="2" bgcolor="${p.accent}" style="background-color:${p.accent};height:2px;font-size:1px;">&nbsp;</td></tr></table>
        </td></tr>
        <tr><td align="center" style="padding-bottom:18px;">
          <span style="font-size:15px;font-style:italic;color:rgba(255,255,255,0.92);line-height:1.4;${NLFF_SERIF}">${escapeHtml(p.head)}</span>
        </td></tr>
        <tr><td style="padding:0 6px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">${p.lines.map(l => `
            <tr>
              <td width="16" valign="top" style="font-size:12px;color:${p.accent};font-weight:bold;line-height:1;padding-top:3px;">&rsaquo;</td>
              <td valign="top" style="padding:2px 0 9px 0;font-size:12px;color:rgba(255,255,255,0.86);line-height:1.55;text-align:left;${NLFF}">${escapeHtml(l)}</td>
            </tr>`).join('')}
          </table>
        </td></tr>
      </table>
    </td>`).join('');

    const realThreats = arts.slice(0, 3).map((a, i) => articleCard(a, i, c, false)).join('');

    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${classificationBar(3, 'INTERNAL // MISSION PROTOCOL // STAFF AWARENESS')}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding:40px 32px 14px;">
          <span style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(212,164,32,0.78);font-weight:bold;${NLFF}">${escapeHtml((c.freq || 'Weekly').toUpperCase())} MISSION PROTOCOL</span>
        </td></tr>
        <tr><td align="center" style="padding:0 32px 12px;">
          <span style="font-size:42px;font-weight:bold;color:#FFFFFF;line-height:1.04;${NLFF_SERIF}">${escapeHtml(c.title || 'Stop. Look. Report.')}</span>
        </td></tr>
        <tr><td align="center" style="padding:0 32px 16px;">
          <table width="80" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td height="2" bgcolor="#D4A420" style="background-color:#D4A420;height:2px;font-size:1px;">&nbsp;</td></tr></table>
        </td></tr>
        <tr><td align="center" style="padding:6px 40px 32px;">
          <span style="font-size:13px;color:rgba(255,255,255,0.6);line-height:1.7;${NLFF}">${escapeHtml((wo[0] || 'Every member of staff has three actions available against a suspected attack. Execute them in order. Speed and discipline contain incidents before they escalate.').slice(0, 200))}</span>
        </td></tr>
      </table>`,
      'bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:0;margin:0;"'
    )}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${pillarRow}</tr></table>`,
      'style="padding:0;margin:0;"'
    )}${editorialDivider('Threats Encountered This Cycle', '#F5F1EA', '#0A0A0A')}${tbc(
      realThreats,
      'bgcolor="#F5F1EA" style="padding:18px 28px 6px;background-color:#F5F1EA;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }

  // ══════════════════════════════════════════════════
  //  TEMPLATE 8: FORENSIC EMAIL TEARDOWN REPORT
  //  Annotated specimen, indicator findings table, verified incidents
  // ══════════════════════════════════════════════════
  function buildEmailAnatomy(c, arts, wo, lk, poster, qr, illus) {
    const dateStr = String(fmtDate(c.issueDate || c.date || new Date())).toUpperCase();
    const caseNo  = 'CASE-' + String(new Date(c.issueDate || c.date || Date.now()).getFullYear()) + '-' + String((arts.length || 4) * 17).padStart(3, '0');
    // Annotated specimen — minimalist forensic layout: each row paired with an "evidence note"
    const specimen = `<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px solid #D8D2C4;">
      <tr><td bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:10px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="middle"><span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#D4A420;font-weight:bold;${NLFF}">EXHIBIT A &middot; INTERCEPTED SPECIMEN</span></td>
          <td align="right" valign="middle"><span style="font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:1px;${NLFF}">${escapeHtml(caseNo)}</span></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:14px 18px;border-bottom:1px solid #EDE8DC;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="68" valign="top" style="font-size:10px;color:#888888;letter-spacing:1px;text-transform:uppercase;${NLFF}">From</td>
          <td valign="top" style="font-size:13px;color:#C0392B;font-weight:bold;${NLFF}">support@amaz0n-security.com</td>
          <td width="120" align="right" valign="top"><span style="font-size:8px;padding:3px 8px;background-color:#FCEDED;color:#C0392B;border:1px solid #F2C6C6;letter-spacing:1px;text-transform:uppercase;font-weight:bold;${NLFF}">[1] Spoofed Domain</span></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:12px 18px;border-bottom:1px solid #EDE8DC;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="68" valign="top" style="font-size:10px;color:#888888;letter-spacing:1px;text-transform:uppercase;${NLFF}">Subject</td>
          <td valign="top" style="font-size:14px;color:#1A1A1A;font-weight:bold;${NLFF}">URGENT: Account suspension in 24 hours</td>
          <td width="130" align="right" valign="top"><span style="font-size:8px;padding:3px 8px;background-color:#FCEDED;color:#C0392B;border:1px solid #F2C6C6;letter-spacing:1px;text-transform:uppercase;font-weight:bold;${NLFF}">[2] Coercive Urgency</span></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:16px 18px 14px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="top" style="font-size:13px;color:#333333;line-height:1.7;${NLFF}">Dear Customer,<br><br>We have detected unusual activity on your account. You must verify your identity immediately or the account will be permanantly closed.</td>
          <td width="140" align="right" valign="top" style="padding-left:14px;">
            <span style="font-size:8px;padding:3px 8px;background-color:#FCEDED;color:#C0392B;border:1px solid #F2C6C6;letter-spacing:1px;text-transform:uppercase;font-weight:bold;${NLFF}">[3] Generic Salutation</span><br><br>
            <span style="font-size:8px;padding:3px 8px;background-color:#FCEDED;color:#C0392B;border:1px solid #F2C6C6;letter-spacing:1px;text-transform:uppercase;font-weight:bold;${NLFF}">[4] Orthographic Error</span>
          </td>
        </tr></table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="14" style="font-size:1px;line-height:14px;">&nbsp;</td></tr></table>
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td bgcolor="#C0392B" style="background-color:#C0392B;padding:10px 18px;">
            <span style="color:#FFFFFF;font-size:12px;font-weight:bold;${NLFF}">Verify your account &rarr;</span>
          </td>
        </tr></table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="10" style="font-size:1px;line-height:10px;">&nbsp;</td></tr></table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="top" style="font-size:11px;color:#888888;${NLFF}">Target URL &mdash; <span style="color:#C0392B;font-weight:bold;">http://amaz0n-verify.scam-site.xyz/login</span></td>
          <td width="110" align="right" valign="top"><span style="font-size:8px;padding:3px 8px;background-color:#FCEDED;color:#C0392B;border:1px solid #F2C6C6;letter-spacing:1px;text-transform:uppercase;font-weight:bold;${NLFF}">[5] Mismatched URL</span></td>
        </tr></table>
      </td></tr>
    </table>`;

    // Findings table — analyst-style indicator + finding + recommended action
    const findings = [
      { id: '[1]', ind: 'Spoofed origin domain',        finding: 'Domain substitutes &ldquo;0&rdquo; for &ldquo;o&rdquo;; not aligned with brand SPF/DKIM.', action: 'Quarantine sender. Block parent domain at gateway.' },
      { id: '[2]', ind: 'Coercive language',            finding: '24-hour suspension threat designed to suppress verification behaviour.', action: 'Treat as social-engineering attempt; surface to awareness team.' },
      { id: '[3]', ind: 'Generic salutation',           finding: 'No personalisation despite implied account context.', action: 'Compare against vendor templates; reject on mismatch.' },
      { id: '[4]', ind: 'Spelling artefact',            finding: '&ldquo;permanantly&rdquo; — non-standard form, common indicator of low-quality generation.', action: 'Tag indicator; correlate against known phishing kits.' },
      { id: '[5]', ind: 'Link redirection',             finding: 'Anchor text mimics brand; URL resolves to unrelated TLD.', action: 'Submit URL to threat-intel feed; block in proxy.' }
    ];
    const findingRows = findings.map(f => `<tr>
      <td width="40" valign="top" style="padding:12px 0 12px 18px;border-bottom:1px solid #EDE8DC;">
        <span style="font-size:10px;color:#B8860B;font-weight:bold;${NLFF}">${escapeHtml(f.id)}</span>
      </td>
      <td width="200" valign="top" style="padding:12px 16px;border-bottom:1px solid #EDE8DC;">
        <span style="font-size:13px;color:#0A0A0A;font-weight:bold;line-height:1.4;${NLFF_SERIF}">${f.ind}</span>
      </td>
      <td valign="top" style="padding:12px 16px;border-bottom:1px solid #EDE8DC;">
        <span style="font-size:12px;color:#3A3A3A;line-height:1.6;${NLFF}">${f.finding}</span>
      </td>
      <td width="230" valign="top" style="padding:12px 18px 12px 8px;border-bottom:1px solid #EDE8DC;">
        <span style="font-size:12px;color:#1B5E20;line-height:1.55;${NLFF}">${f.action}</span>
      </td>
    </tr>`).join('');

    const realThreats = arts.slice(0, 3).map((a, i) => articleCard(a, i, c, false)).join('');

    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${classificationBar(3, `INTERNAL // FORENSIC TEARDOWN // ${caseNo}`)}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:32px 32px 4px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="bottom"><span style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:rgba(212,164,32,0.78);font-weight:bold;${NLFF}">FORENSIC EMAIL TEARDOWN</span></td>
            <td align="right" valign="bottom"><span style="font-size:9px;letter-spacing:2px;color:rgba(255,255,255,0.32);${NLFF}">${escapeHtml(dateStr)} &middot; ${escapeHtml(caseNo)}</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:14px 32px 6px;">
          <span style="font-size:36px;font-weight:bold;color:#FFFFFF;line-height:1.04;${NLFF_SERIF}">${escapeHtml(c.title || 'How to Read a Phish')}</span>
        </td></tr>
        <tr><td style="padding:0 32px 14px;">
          <table width="80" cellpadding="0" cellspacing="0" border="0"><tr><td height="2" bgcolor="#D4A420" style="background-color:#D4A420;height:2px;font-size:1px;">&nbsp;</td></tr></table>
        </td></tr>
        <tr><td style="padding:6px 32px 28px;">
          <span style="font-size:13px;color:rgba(255,255,255,0.6);line-height:1.72;${NLFF}">${escapeHtml((wo[0] || spotlightLine(c) || 'This teardown walks through a real intercepted specimen and the five forensic indicators that confirmed it as malicious. Apply the same questioning to every unexpected message.').slice(0, 220))}</span>
        </td></tr>
      </table>`,
      'bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:0;margin:0;"'
    )}${editorialDivider('Exhibit A · Annotated Specimen', '#FAF8F2', '#0A0A0A')}${tbc(
      specimen,
      'bgcolor="#FAF8F2" style="padding:18px 28px 22px;background-color:#FAF8F2;margin:0;"'
    )}${editorialDivider('Findings · Analyst Determinations', '#FFFFFF', '#0A0A0A')}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="40" style="padding:10px 0 10px 18px;background-color:#0A0A0A;"><span style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#D4A420;font-weight:bold;${NLFF}">REF</span></td>
          <td width="200" style="padding:10px 16px;background-color:#0A0A0A;"><span style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#D4A420;font-weight:bold;${NLFF}">Indicator</span></td>
          <td style="padding:10px 16px;background-color:#0A0A0A;"><span style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#D4A420;font-weight:bold;${NLFF}">Finding</span></td>
          <td width="230" style="padding:10px 18px 10px 8px;background-color:#0A0A0A;"><span style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#D4A420;font-weight:bold;${NLFF}">Recommended Action</span></td>
        </tr>
        ${findingRows}
      </table>`,
      'bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:0;margin:0;"'
    )}${editorialDivider('Linked Cases · Active Specimens', '#F5F1EA', '#0A0A0A')}${tbc(
      realThreats,
      'bgcolor="#F5F1EA" style="padding:18px 28px 6px;background-color:#F5F1EA;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }

  // ══════════════════════════════════════════════════
  //  TEMPLATE 9: BEHAVIORAL COMPARISON MATRIX
  //  Paired-row matrix — same situation, contrasted approaches
  // ══════════════════════════════════════════════════
  function buildDoVsDont(c, arts, wo, lk, poster, qr, illus) {
    const dontFb = ['Click links in unexpected emails or texts', 'Share your password with anyone — ever', "Open attachments you weren't expecting", 'Trust caller ID alone — scammers fake it', 'Rush — scammers want you to panic and act fast', 'Use the same password on multiple sites'];
    const doFb   = ["Check the sender's FULL email address", 'Hover over links to see the real URL', 'Use a different password for every account', 'Turn on two-step login (MFA) everywhere', 'Report suspicious messages to IT immediately', 'Call the person to verify unusual requests'];
    const donts = pickUniqueSlotLines(c.nlDoDontDonts, dontFb, 6);
    const dos   = pickUniqueSlotLines(c.nlDoDontDos,   doFb,   6);
    const labels = ['Sender Verification','Credential Handling','Attachments','Caller Identity','Tempo Discipline','Password Hygiene'];

    const matrixHeader = `<tr>
      <td width="60" valign="middle" align="center" style="padding:10px 0;background-color:#0A0A0A;">
        <span style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#666666;font-weight:bold;${NLFF}">No.</span>
      </td>
      <td valign="middle" style="padding:10px 16px;background-color:#0A0A0A;">
        <span style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#888888;font-weight:bold;${NLFF}">Behavioural Domain</span>
      </td>
      <td width="36%" valign="middle" style="padding:10px 18px;background-color:#7F1F18;">
        <span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#FFFFFF;font-weight:bold;${NLFF}">&#10007; Don't &middot; Risk Behaviour</span>
      </td>
      <td width="36%" valign="middle" style="padding:10px 18px;background-color:#1E5C3B;">
        <span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#FFFFFF;font-weight:bold;${NLFF}">&#10003; Do &middot; Operational Standard</span>
      </td>
    </tr>`;

    const matrixRows = donts.map((dontL, i) => {
      const doL = dos[i] || '';
      const label = labels[i] || `Domain ${i+1}`;
      const altBg = i % 2 === 0 ? '#FFFFFF' : '#FAF8F2';
      return `<tr>
        <td valign="middle" align="center" style="padding:18px 0;background-color:${altBg};border-bottom:1px solid #EDE8DC;">
          <span style="font-size:24px;font-weight:bold;color:#D4A420;line-height:1;${NLFF_SERIF}">${String(i+1).padStart(2,'0')}</span>
        </td>
        <td valign="middle" style="padding:18px 16px;background-color:${altBg};border-bottom:1px solid #EDE8DC;">
          <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#0A0A0A;font-weight:bold;${NLFF}">${escapeHtml(label)}</span>
        </td>
        <td valign="middle" style="padding:18px 18px;background-color:#FDF5F4;border-left:3px solid #C0392B;border-bottom:1px solid #F2C6C6;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="18" valign="top" style="padding-top:3px;font-size:13px;color:#C0392B;font-weight:bold;${NLFF}">&#10007;</td>
            <td valign="top" style="font-size:13px;color:#721C24;line-height:1.55;${NLFF}">${escapeHtml(dontL)}</td>
          </tr></table>
        </td>
        <td valign="middle" style="padding:18px 18px;background-color:#F2F8F0;border-left:3px solid #27AE60;border-bottom:1px solid #C3E6CB;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="18" valign="top" style="padding-top:3px;font-size:13px;color:#27AE60;font-weight:bold;${NLFF}">&#10003;</td>
            <td valign="top" style="font-size:13px;color:#155724;line-height:1.55;${NLFF}">${escapeHtml(doL)}</td>
          </tr></table>
        </td>
      </tr>`;
    }).join('');

    const matrix = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E0D8C8;">${matrixHeader}${matrixRows}</table>`;

    const realThreats = arts.slice(0, 3).map((a, i) => articleCard(a, i, c, false)).join('');

    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${classificationBar(1, 'INTERNAL // BEHAVIOURAL STANDARDS // STAFF GUIDANCE')}${intelligenceMasthead(
      c,
      `${c.freq || 'Weekly'} Behavioural Standards`,
      'Each domain has a known risk behaviour and a documented operational standard. Apply the right-hand column without exception.'
    )}${editorialDivider('Behavioural Comparison Matrix', '#FFFFFF', '#0A0A0A')}${tbc(
      matrix,
      'bgcolor="#FFFFFF" style="padding:0;background-color:#FFFFFF;margin:0;"'
    )}${editorialDivider('Apply the Standard · Live Threats', '#F5F1EA', '#0A0A0A')}${tbc(
      realThreats,
      'bgcolor="#F5F1EA" style="padding:18px 28px 6px;background-color:#F5F1EA;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }

  // ══════════════════════════════════════════════════
  //  TEMPLATE 10: MAGAZINE FEATURE SPREAD
  //  Hero feature + tactic taxonomy + defence playbook
  // ══════════════════════════════════════════════════
  function buildThreatSpotlight(c, arts, wo, lk, poster, qr, illus) {
    const tacticsFb = [
      { letter: 'A', tactic: 'Identity Impersonation', detail: 'Attackers borrow trusted identities — leadership, IT, vendors, banks — often with accurate branding and signatures.' },
      { letter: 'B', tactic: 'Urgency &amp; Loss Framing', detail: 'Subject lines invent deadlines and account-loss threats so the reader bypasses normal verification.' },
      { letter: 'C', tactic: 'Concealed Link Targets', detail: 'Anchor text mimics a brand domain; the actual URL resolves to an unrelated, adversary-controlled host.' },
      { letter: 'D', tactic: 'Synthetic Authoring', detail: 'Generative tooling produces fluent, on-brand copy at scale, eroding the value of grammar as a tell.' }
    ];
    const rawT = Array.isArray(c.nlSpotlightTactics) ? c.nlSpotlightTactics : [];
    const tactics = tacticsFb.map((fb, i) => {
      const t = rawT[i] && typeof rawT[i] === 'object' ? rawT[i] : {};
      const letter = escapeHtml(String(fb.letter));
      const tactic = escapeHtml(String(t.tactic || fb.tactic));
      const detail = escapeHtml(String(t.detail || fb.detail));
      return { letter, tactic, detail };
    });
    const defenceFb = ["Check sender's full email address", 'Hover over links before clicking', 'Call to verify unusual requests', 'Report suspicious messages to IT', 'Use MFA on all accounts', 'Never share passwords by email'];
    const defenceLines = pickUniqueSlotLines(c.nlSpotlightDefenceLines, defenceFb, 6).map((d) => escapeHtml(d));

    // Magazine masthead — typographic, light cream, with classification ribbon above
    const highest = arts.reduce((m, a) => Math.max(m, a.threatLevel || 0), 0);
    const dateStr = String(fmtDate(c.issueDate || c.date || new Date())).toUpperCase();
    const orgLine = escapeHtml((c.org || 'Your Organisation').trim());
    const leadArt = arts[0] || {};
    const leadSummary = escapeHtml((leadArt.summary || leadArt.description || wo[0] || 'This week\'s threat spotlight is reserved for the most material trend across the workforce. Reading time is intentional — invest five minutes here to save the organisation hours of remediation later.').split('. ').slice(0, 4).join('. ').replace(/\.+$/, '') + '.');
    const featureKicker = escapeHtml((leadArt.type || 'THREAT SPOTLIGHT').toUpperCase());
    const featureTitle  = escapeHtml(c.title || leadArt.title || 'The Anatomy of This Week\'s Attack');

    // Tactic taxonomy — 4 lettered modules with serif label numbers
    const tacticGrid = `<table width="100%" cellpadding="0" cellspacing="0" border="0">${[
      [0, 1], [2, 3]
    ].map(pair => `<tr>${pair.map(idx => {
      const t = tactics[idx];
      return `<td valign="top" width="50%" style="padding:0 6px 12px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px solid #E8E3D8;height:142px;" height="142">
          <tr><td valign="top" style="padding:16px 18px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="42" valign="top">
                <table cellpadding="0" cellspacing="0" border="0" width="34" height="34"><tr><td align="center" valign="middle" width="34" height="34" bgcolor="#0A0A0A" style="background-color:#0A0A0A;font-size:14px;color:#D4A420;font-weight:bold;letter-spacing:1px;${NLFF_SERIF}">${t.letter}</td></tr></table>
              </td>
              <td valign="top" style="padding-left:10px;">
                <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#B8860B;font-weight:bold;${NLFF}">Tactic</span><br>
                <span style="font-size:15px;font-weight:bold;color:#0A0A0A;line-height:1.32;${NLFF_SERIF}">${t.tactic}</span><br><br>
                <span style="font-size:12px;color:#555555;line-height:1.6;${NLFF}">${t.detail}</span>
              </td>
            </tr></table>
          </td></tr>
        </table>
      </td>`;
    }).join('')}</tr>`).join('')}</table>`;

    // Defence playbook — numbered serif list
    const defenceList = defenceLines.slice(0, 6).map((line, i) => `<tr>
      <td width="48" valign="top" align="center" style="padding:14px 6px;border-bottom:1px solid #EDE8DC;">
        <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#888888;${NLFF}">No.</span><br>
        <span style="font-size:20px;font-weight:bold;color:#D4A420;line-height:1;${NLFF_SERIF}">${String(i + 1).padStart(2, '0')}</span>
      </td>
      <td valign="middle" style="padding:14px 18px;border-bottom:1px solid #EDE8DC;">
        <span style="font-size:13px;color:#1A1A1A;line-height:1.65;${NLFF}">${escapeHtml(line)}</span>
      </td>
    </tr>`).join('');

    // Specimens via uniform briefing card
    const specimens = arts.slice(0, 3).map((a, i) => articleCard(a, i, c, false)).join('');

    return `${nlOuterOpen()}${tbl()}${tbc('',
      'height="6" style="height:6px;line-height:6px;font-size:1px;background:linear-gradient(90deg,#B8860B 0%,#D4A420 50%,#C09010 100%);background-color:#D4A420;"'
    )}${classificationBar(highest, 'INTERNAL // MAGAZINE FEATURE // THREAT SPOTLIGHT')}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:34px 32px 6px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="bottom"><span style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:#B8860B;font-weight:bold;${NLFF}">${featureKicker}</span></td>
            <td align="right" valign="bottom"><span style="font-size:9px;letter-spacing:2px;color:#999999;${NLFF}">${escapeHtml(dateStr)} &middot; ${orgLine}</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:14px 32px 4px;">
          <span style="font-size:44px;font-weight:bold;color:#0A0A0A;line-height:1.02;${NLFF_SERIF}">${featureTitle}</span>
        </td></tr>
        <tr><td style="padding:8px 32px 18px;">
          <table width="80" cellpadding="0" cellspacing="0" border="0"><tr><td height="3" bgcolor="#D4A420" style="background-color:#D4A420;height:3px;font-size:1px;">&nbsp;</td></tr></table>
        </td></tr>
        <tr><td style="padding:12px 32px 32px;">
          <span style="font-size:36px;float:left;line-height:0.84;color:#D4A420;font-weight:bold;padding:6px 12px 0 0;${NLFF_SERIF}">${(leadSummary || 'T').charAt(0)}</span>
          <span style="font-size:15px;color:#2A2A2A;line-height:1.78;${NLFF}">${leadSummary.slice(1)}</span>
        </td></tr>
      </table>`,
      'bgcolor="#FAF8F2" style="background-color:#FAF8F2;padding:0;margin:0;"'
    )}${editorialDivider('Tactic Taxonomy &middot; How Operators Engineer the Attack', '#FFFFFF', '#0A0A0A')}${tbc(
      tacticGrid,
      'bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:18px 22px;margin:0;"'
    )}${editorialDivider('Defence Playbook &middot; Six Standing Controls', '#F5F1EA', '#0A0A0A')}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px solid #E8E3D8;">${defenceList}</table>`,
      'bgcolor="#F5F1EA" style="background-color:#F5F1EA;padding:18px 28px;margin:0;"'
    )}${executivePullQuote(
      (wo[0] || 'The control with the highest return on training investment is the colleague who hesitates and verifies before acting.').replace(/\.+$/, ''),
      `${orgLine} Security Awareness`,
      '#FAF8F2'
    )}${editorialDivider('Specimens · Trending This Cycle', '#F5F1EA', '#0A0A0A')}${tbc(
      specimens,
      'bgcolor="#F5F1EA" style="background-color:#F5F1EA;padding:18px 28px 6px;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }

  // ══════════════════════════════════════════════════
  //  TEMPLATE 11: OPERATIONAL TIMELINE CHRONOLOGY
  //  Vertical chronology — date stamp, escalation bar, response action
  // ══════════════════════════════════════════════════
  function buildIncidentTimeline(c, arts, wo, lk, poster, qr, illus) {
    const highest = arts.reduce((m, a) => Math.max(m, a.threatLevel || 0), 0);
    const baseDate = new Date(c.issueDate || c.date || Date.now());
    const lvColors = ['#666666','#27AE60','#8BC34A','#F39C12','#E67E22','#E74C3C'];
    const lvNames  = ['ADVISORY','LOW','MODERATE','ELEVATED','HIGH','CRITICAL'];
    const status   = lv => (lv >= 4 ? 'ACTIVE' : lv >= 3 ? 'MONITORING' : lv >= 1 ? 'TRACKED' : 'CLOSED');

    const entryRows = arts.slice(0, 6).map((a, i) => {
      const lv  = a.threatLevel || 2;
      const lvC = lvColors[Math.min(lv, 5)];
      const lvN = lvNames[Math.min(lv, 5)];
      const st  = status(lv);
      const d   = new Date(baseDate.getTime() - i * 86400000);
      const dStr = String(fmtDate(d)).toUpperCase();
      const timeStr = `${String((9 + i * 3) % 24).padStart(2, '0')}:${String((17 + i * 11) % 60).padStart(2, '0')}Z`;
      const sumRaw  = (a.summary || a.description || '').split('. ').slice(0, 2).join('. ').trim().replace(/\.+$/, '');
      const summary = escapeHtml(sumRaw ? sumRaw + '.' : 'Activity under continued review by the security operations team.');
      const wos     = Array.isArray(a.watchouts) ? a.watchouts.slice(0, 2) : [];
      const actionLines = (wos.length ? wos : ['Surface any matching observations to the security desk.']).map(w => `<tr>
        <td width="14" valign="top" style="padding-top:3px;font-size:12px;color:${lvC};font-weight:bold;line-height:1;${NLFF}">&rsaquo;</td>
        <td valign="top" style="padding:1px 0 4px 0;font-size:12px;color:#1A1A1A;line-height:1.55;${NLFF}">${escapeHtml(w)}</td>
      </tr>`).join('');
      return `<tr>
        <td width="120" valign="top" style="padding:18px 12px 18px 22px;border-right:2px solid ${lvC};">
          <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:${lvC};font-weight:bold;${NLFF}">T-${String(i).padStart(2, '0')}</span><br>
          <span style="font-size:11px;color:#0A0A0A;letter-spacing:1px;${NLFF_SERIF}">${escapeHtml(dStr)}</span><br>
          <span style="font-size:10px;color:#888888;letter-spacing:1px;${NLFF}">${escapeHtml(timeStr)}</span><br><br>
          <table cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${lvC}" style="background-color:${lvC};padding:3px 8px;"><span style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#FFFFFF;font-weight:bold;${NLFF}">${escapeHtml(lvN)}</span></td></tr></table>
          <br>
          <span style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#666666;font-weight:bold;${NLFF}">${escapeHtml(st)}</span>
        </td>
        <td valign="top" style="padding:18px 22px;">
          <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#B8860B;font-weight:bold;${NLFF}">${escapeHtml((a.type || 'Security').toUpperCase())}</span><br><br>
          <span style="font-size:17px;font-weight:bold;color:#0A0A0A;line-height:1.3;${NLFF_SERIF}">${escapeHtml(a.title || '')}</span><br><br>
          <span style="font-size:13px;color:#3A3A3A;line-height:1.7;${NLFF}">${summary}</span>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;border-top:1px solid #EDE8DC;">
            <tr><td style="padding-top:10px;padding-bottom:4px;">
              <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#888888;font-weight:bold;${NLFF}">Response Action</span>
            </td></tr>
            <tr><td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">${actionLines}</table>
            </td></tr>
          </table>
        </td>
      </tr>
      <tr><td colspan="2" height="1" bgcolor="#EDE8DC" style="background-color:#EDE8DC;height:1px;font-size:1px;">&nbsp;</td></tr>`;
    }).join('');

    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${classificationBar(highest, 'INTERNAL // OPERATIONAL TIMELINE // CHRONOLOGICAL VIEW')}${intelligenceMasthead(
      c,
      `${c.freq || 'Weekly'} Operational Timeline`,
      `Chronological log of significant activity tracked by the security operations team. Entries are ordered from most recent. Threat status reflects current assessment.`
    )}${editorialDivider('Chronology &middot; Most Recent First', '#FAFAFA', '#0A0A0A')}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px solid #E8E3D8;">${entryRows}</table>`,
      'bgcolor="#FAFAFA" style="padding:22px 24px;background-color:#FAFAFA;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }

  // ══════════════════════════════════════════════════
  //  TEMPLATE 12: EXECUTIVE METRICS DASHBOARD
  //  Quantitative metrics row, decision-matrix scenarios, standing controls
  // ══════════════════════════════════════════════════
  function buildAwarenessScorecard(c, arts, wo, lk, poster, qr, illus) {
    const highest = arts.reduce((m, a) => Math.max(m, a.threatLevel || 0), 0);
    const trackedCount = arts.length || 0;
    const criticalCount = arts.filter(a => (a.threatLevel || 0) >= 4).length;
    const watchoutCount = arts.reduce((s, a) => s + (Array.isArray(a.watchouts) ? a.watchouts.length : 0), 0);
    const orgLine = escapeHtml((c.org || 'Your Organisation').trim());

    // Top metrics strip — 4 quantitative cards
    const metricCards = [
      { label: 'Items Tracked',     val: String(trackedCount).padStart(2, '0'),      sub: 'verified threats reviewed this cycle', col: '#D4A420' },
      { label: 'High / Critical',   val: String(criticalCount).padStart(2, '0'),     sub: 'tier-1 incidents requiring attention', col: '#E67E22' },
      { label: 'Operational Actions', val: String(watchoutCount).padStart(2, '0'),   sub: 'specific guidance points issued',      col: '#27AE60' },
      { label: 'Reporting Channel', val: '24/7',                                     sub: 'security desk availability',           col: '#FFFFFF' }
    ];
    const metricRow = `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${metricCards.map((m, i) => `
      <td valign="top" width="25%" style="padding:0 ${i < 3 ? '6px' : '0'} 0 ${i > 0 ? '6px' : '0'};">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0F0F0F" style="background-color:#0F0F0F;border-top:3px solid ${m.col};height:148px;" height="148">
          <tr><td valign="top" style="padding:16px 16px 14px;">
            <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.5);font-weight:bold;${NLFF}">${escapeHtml(m.label)}</span><br>
            <span style="font-size:44px;font-weight:bold;color:${m.col};line-height:1;${NLFF_SERIF}">${escapeHtml(m.val)}</span><br><br>
            <span style="font-size:11px;color:rgba(255,255,255,0.65);line-height:1.5;${NLFF}">${escapeHtml(m.sub)}</span>
          </td></tr>
        </table>
      </td>`).join('')}</tr></table>`;

    // Decision Matrix — scenario / signal / correct action
    const decisionRows = arts.slice(0, 4).map((a, i) => {
      const lv  = a.threatLevel || 2;
      const lvC = ['#666666','#27AE60','#8BC34A','#F39C12','#E67E22','#E74C3C'][Math.min(lv, 5)];
      const lvN = ['ADVISORY','LOW','MODERATE','ELEVATED','HIGH','CRITICAL'][Math.min(lv, 5)];
      const summary = escapeHtml((a.summary || a.description || '').split('. ').slice(0, 2).join('. ').replace(/\.+$/, '') + '.');
      const action  = Array.isArray(a.watchouts) && a.watchouts.length
        ? escapeHtml(a.watchouts[0])
        : 'Report any matching activity to the security desk without engaging the sender.';
      return `<tr>
        <td width="60" valign="top" align="center" style="padding:18px 0;background-color:${i % 2 === 0 ? '#FFFFFF' : '#FAF8F2'};border-bottom:1px solid #EDE8DC;">
          <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#888888;${NLFF}">No.</span><br>
          <span style="font-size:22px;font-weight:bold;color:#D4A420;line-height:1;${NLFF_SERIF}">${String(i + 1).padStart(2, '0')}</span>
        </td>
        <td width="38%" valign="top" style="padding:18px 18px;background-color:${i % 2 === 0 ? '#FFFFFF' : '#FAF8F2'};border-bottom:1px solid #EDE8DC;border-left:3px solid ${lvC};">
          <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:${lvC};font-weight:bold;${NLFF}">${escapeHtml(lvN)}</span><br><br>
          <span style="font-size:14px;font-weight:bold;color:#0A0A0A;line-height:1.32;${NLFF_SERIF}">${escapeHtml(a.title || '')}</span>
        </td>
        <td valign="top" style="padding:18px 18px;background-color:${i % 2 === 0 ? '#FFFFFF' : '#FAF8F2'};border-bottom:1px solid #EDE8DC;">
          <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#888888;font-weight:bold;${NLFF}">Signal</span><br>
          <span style="font-size:12px;color:#3A3A3A;line-height:1.6;${NLFF}">${summary}</span>
        </td>
        <td width="32%" valign="top" style="padding:18px 18px;background-color:#F2F8F0;border-bottom:1px solid #C3E6CB;border-left:3px solid #27AE60;">
          <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#27AE60;font-weight:bold;${NLFF}">Correct Action</span><br>
          <span style="font-size:12px;color:#155724;line-height:1.6;${NLFF}">${action}</span>
        </td>
      </tr>`;
    }).join('');

    // Standing controls — 4 disciplined cards
    const controls = [
      { tag: 'CTL-01', tip: 'Sender Verification', detail: 'Confirm the full email domain before acting on any unusual request.' },
      { tag: 'CTL-02', tip: 'Link Inspection',     detail: 'Hover every link in the desktop client; compare anchor text to the resolved URL.' },
      { tag: 'CTL-03', tip: 'Credential Boundary', detail: 'No internal or vendor process requires credentials, MFA codes, or recovery keys by email.' },
      { tag: 'CTL-04', tip: 'MFA Coverage',        detail: 'Enable multi-factor authentication on every account that supports it — including personal.' }
    ];
    const controlGrid = `<table width="100%" cellpadding="0" cellspacing="0" border="0">${[[0,1],[2,3]].map(pair => `<tr>${pair.map(i => `
      <td valign="top" width="50%" style="padding:0 6px 12px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px solid #E8E3D8;border-left:3px solid #D4A420;height:114px;" height="114">
          <tr><td valign="top" style="padding:14px 16px;">
            <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#B8860B;font-weight:bold;${NLFF}">${escapeHtml(controls[i].tag)}</span><br>
            <span style="font-size:14px;font-weight:bold;color:#0A0A0A;line-height:1.32;${NLFF_SERIF}">${escapeHtml(controls[i].tip)}</span><br><br>
            <span style="font-size:12px;color:#555555;line-height:1.55;${NLFF}">${escapeHtml(controls[i].detail)}</span>
          </td></tr>
        </table>
      </td>`).join('')}</tr>`).join('')}</table>`;

    return `${nlOuterOpen()}${tbl()}${goldGradientBar()}${classificationBar(highest, `INTERNAL // EXECUTIVE METRICS // ${orgLine.toUpperCase()}`)}${intelligenceMasthead(
      c,
      `${c.freq || 'Weekly'} Awareness Metrics`,
      `Quantitative summary of protective intelligence reviewed this cycle. Use the decision matrix to assess scenario response.`
    )}${tbc(
      metricRow,
      'bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:0 22px 28px;margin:0;"'
    )}${editorialDivider('Decision Matrix &middot; Scenario / Signal / Correct Action', '#FFFFFF', '#0A0A0A')}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">${decisionRows}</table>`,
      'bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:0;margin:0;"'
    )}${editorialDivider('Standing Controls &middot; Apply Daily', '#F5F0E8', '#0A0A0A')}${tbc(
      controlGrid,
      'bgcolor="#F5F0E8" style="background-color:#F5F0E8;padding:18px 16px 4px;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }

  // ══════════════════════════════════════════════════
  //  TEMPLATE 13: BROADSHEET CYBER GAZETTE
  //  Newspaper masthead, drop-cap lead, four-column digest, pull quote
  // ══════════════════════════════════════════════════
  function buildCyberSecurityTimes(c, arts, wo, lk, poster, qr, _illus) {
    const topArt  = arts[0] || { type: 'Security', title: 'Weekly Security Briefing', summary: 'Stay vigilant this week.', watchouts: [] };
    const colArts = arts.slice(1, 4);
    const orgEsc  = escapeHtml((c.org || 'Your Organisation').trim());
    const dateStr = escapeHtml(String(fmtDate(c.issueDate || new Date())).toUpperCase());
    const issueNo = 'VOL. ' + (new Date(c.issueDate || new Date()).getFullYear() - 2000) + ' &middot; NO. ' + String(((arts[0] && arts[0].title) || '').length + arts.length || 7).padStart(2, '0');
    const wxLine = escapeHtml((wo[0] || 'Steady vigilance across the workforce. Phishing pressure remains the dominant external risk.').slice(0, 70));

    const thinRule  = `${tbl()}${tbc('', 'height="1" bgcolor="#CCCCCC" style="background-color:#CCCCCC;height:1px;font-size:1px;line-height:1px;"')}${tblx()}`;
    const doubleRule = `${tbl()}${tbc('', 'height="3" bgcolor="#0A0A0A" style="background-color:#0A0A0A;height:3px;font-size:1px;line-height:3px;"')}${tbc('', 'height="2" style="height:2px;font-size:1px;line-height:2px;background-color:#FFFFFF;"')}${tbc('', 'height="1" bgcolor="#0A0A0A" style="background-color:#0A0A0A;height:1px;font-size:1px;line-height:1px;"')}${tblx()}`;

    // Broadsheet masthead — typographic, with weather line + edition info
    const masthead = `${tbl()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:18px 32px 6px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle"><span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#888888;font-style:italic;${NLFF_SERIF}">${escapeHtml(issueNo)}</span></td>
            <td align="right" valign="middle"><span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#888888;font-style:italic;${NLFF_SERIF}">${dateStr} &middot; STAFF EDITION</span></td>
          </tr></table>
        </td></tr>
        <tr><td align="center" style="padding:6px 24px 8px;">
          <span style="font-size:54px;font-weight:bold;color:#0A0A0A;letter-spacing:6px;line-height:1;${NLFF_SERIF}">THE CYBER GAZETTE</span>
        </td></tr>
        <tr><td align="center" style="padding:0 32px 8px;">
          <table width="60%" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td height="2" bgcolor="#D4A420" style="background-color:#D4A420;height:2px;font-size:1px;">&nbsp;</td></tr></table>
        </td></tr>
        <tr><td align="center" style="padding:0 32px 8px;">
          <span style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#555555;font-style:italic;${NLFF_SERIF}">Published for ${orgEsc} &middot; Protective Intelligence for the Workforce</span>
        </td></tr>
        <tr><td style="padding:14px 32px 12px;border-top:1px solid #0A0A0A;border-bottom:1px solid #0A0A0A;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle"><span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#0A0A0A;font-weight:bold;${NLFF}">Threat Outlook &middot; ${wxLine}</span></td>
            <td align="right" valign="middle"><span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#888888;${NLFF}">Price: Vigilance &middot; Pages 1&ndash;${Math.max(4, arts.length)}</span></td>
          </tr></table>
        </td></tr>
      </table>`,
      'bgcolor="#FFFFFF" style="padding:0;margin:0;background-color:#FFFFFF;"'
    )}${tblx()}`;

    const topSummary = escapeHtml((topArt.summary || topArt.description || '').split('.').slice(0, 5).join('.').trim().replace(/\.+$/, '') + '.');
    const editorPicks = (Array.isArray(topArt.watchouts) ? topArt.watchouts : []).slice(0, 3);
    const picksHtml = (editorPicks.length ? editorPicks : ['Stay vigilant and report suspicious emails promptly.']).map((w, i) => `
      <tr><td valign="top" style="padding:6px 0;border-bottom:${i < editorPicks.length - 1 ? '1px solid #EDE8DC' : 'none'};">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="14" valign="top" style="font-size:12px;color:#D4A420;font-weight:bold;line-height:1;${NLFF_SERIF}">&rsaquo;</td>
          <td valign="top" style="font-size:12px;color:#3A3A3A;line-height:1.6;${NLFF_SERIF}">${escapeHtml(w)}</td>
        </tr></table>
      </td></tr>`).join('');

    const leadStory = `${tbl()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="65%" valign="top" style="padding:26px 22px 26px 28px;border-right:1px solid #0A0A0A;">
            <span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#C09010;font-weight:bold;${NLFF}">${escapeHtml((topArt.type || 'Security').toUpperCase())} &middot; LEAD STORY</span><br><br>
            <span style="font-size:30px;font-weight:bold;color:#0A0A0A;line-height:1.08;${NLFF_SERIF}">${escapeHtml(topArt.title)}</span><br><br>
            <span style="font-size:10px;color:#888888;font-style:italic;letter-spacing:1px;${NLFF_SERIF}">By the ${orgEsc} Security Desk &middot; ${dateStr}</span>
            <table width="80" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;"><tr><td height="2" bgcolor="#0A0A0A" style="background-color:#0A0A0A;height:2px;font-size:1px;">&nbsp;</td></tr></table>
            <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="14" style="font-size:1px;line-height:14px;">&nbsp;</td></tr></table>
            <span style="font-size:48px;float:left;line-height:0.86;color:#0A0A0A;font-weight:bold;padding:4px 10px 0 0;${NLFF_SERIF}">${(topSummary || 'T').charAt(0)}</span>
            <span style="font-size:14px;color:#1A1A1A;line-height:1.78;${NLFF_SERIF}">${topSummary.slice(1)}</span>
          </td>
          <td width="35%" valign="top" style="padding:26px 28px 26px 22px;">
            <span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#C09010;font-weight:bold;${NLFF}">EDITOR'S PICK</span>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;"><tr><td height="2" bgcolor="#C09010" style="background-color:#C09010;height:2px;font-size:1px;">&nbsp;</td></tr></table>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">${picksHtml}</table>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;"><tr><td bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:14px 16px;">
              <span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#D4A420;font-weight:bold;${NLFF}">Reporting Desk</span><br><br>
              <span style="font-size:12px;color:rgba(255,255,255,0.85);line-height:1.6;${NLFF}">Forward suspicious activity to <strong style="color:#D4A420;">${escapeHtml((c.soc || 'security').trim())}</strong> without modification.</span>
            </td></tr></table>
          </td>
        </tr>
      </table>`,
      'bgcolor="#FAFAF5" style="padding:0;background-color:#FAFAF5;margin:0;"'
    )}${tblx()}`;

    // Section heading for digest
    const digestHeader = `${tbl()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle" style="padding:14px 28px;border-bottom:1px solid #0A0A0A;">
          <span style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#0A0A0A;font-weight:bold;${NLFF_SERIF}">Page 02 &middot; Digest of Active Threats</span>
        </td>
      </tr></table>`,
      'bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:0;margin:0;"'
    )}${tblx()}`;

    const colWidth = Math.floor(100 / Math.max(colArts.length, 1));
    const cols = colArts.map((a, i) => {
      const colSum  = escapeHtml((a.summary || a.description || '').split('.').slice(0, 2).join('.').trim().replace(/\.+$/, '') + '.');
      const readLink = (lk && a.url) ? `<br><br><a href="${escAttr(a.url)}" style="font-size:10px;color:#C09010;font-weight:bold;text-decoration:none;letter-spacing:2px;text-transform:uppercase;${NLFF}">READ FULL DISPATCH &rsaquo;</a>` : '';
      return `<td valign="top" width="${colWidth}%" style="padding:20px 18px;${i < colArts.length - 1 ? 'border-right:1px solid #DDDDDD;' : ''}">
        <span style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#C09010;font-weight:bold;${NLFF}">${escapeHtml((a.type || 'Security').toUpperCase())}</span><br><br>
        <span style="font-size:17px;font-weight:bold;color:#0A0A0A;line-height:1.22;${NLFF_SERIF}">${escapeHtml(a.title)}</span>
        <table width="40" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;"><tr><td height="1" bgcolor="#0A0A0A" style="background-color:#0A0A0A;height:1px;font-size:1px;">&nbsp;</td></tr></table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="12" style="font-size:1px;line-height:12px;">&nbsp;</td></tr></table>
        <span style="font-size:12px;color:#3A3A3A;line-height:1.72;${NLFF_SERIF}">${colSum}</span>${readLink}
      </td>`;
    }).join('');

    const threeCol = colArts.length ? `${tbl()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cols}</tr></table>`,
      'bgcolor="#FFFFFF" style="padding:0;background-color:#FFFFFF;margin:0;"'
    )}${tblx()}` : '';

    const pullQuote = wo[0] ? `${tbl()}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="6" bgcolor="#D4A420" style="background-color:#D4A420;">&nbsp;</td>
        <td style="padding:24px 28px;background-color:#F5F1EA;">
          <span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#B8860B;font-weight:bold;${NLFF}">From the Editor</span><br><br>
          <span style="font-size:22px;color:#0A0A0A;font-style:italic;line-height:1.42;${NLFF_SERIF}">&ldquo;${escapeHtml(wo[0])}&rdquo;</span><br><br>
          <span style="font-size:10px;color:#888888;letter-spacing:2px;text-transform:uppercase;${NLFF}">${orgEsc} Security Awareness</span>
        </td>
      </tr></table>`,
      'bgcolor="#F5F1EA" style="padding:0;background-color:#F5F1EA;margin:0;"'
    )}${tblx()}` : '';

    return `${nlOuterOpen()}${tbl()}${masthead}${doubleRule}${leadStory}${doubleRule}${digestHeader}${threeCol}${thinRule}${pullQuote}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }

  // ══════════════════════════════════════════════════
  //  TEST TEMPLATE: SECURITY DISPATCH
  //  Clean priority-list format optimised for AI content
  //  Numbered cards, left accent stripes, gold CTA
  // ══════════════════════════════════════════════════
  function buildTestTemplate(c, arts, wo, lk, poster, qr, illus) {
    // PNG data-URI helpers for better email-client compatibility
    function dispIcon(pngUri, w, h, msoChar) {
      const msoTbl = `<table cellpadding="0" cellspacing="0" border="0" width="${w}" height="${h}"><tr><td align="center" valign="middle" width="${w}" height="${h}" bgcolor="#111111" style="background-color:#111111;border:1px solid #C09010;font-size:${Math.round(Math.min(w,h)*0.5)}px;color:#D4A420;font-family:Arial;">${msoChar}</td></tr></table>`;
      return `<!--[if mso]>${msoTbl}<![endif]--><!--[if !mso]><!--><img src="${pngUri}" width="${w}" height="${h}" border="0" alt="" style="display:block;border:0;"><!--<![endif]-->`;
    }
    const WARN_PNG_D_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABICAYAAABhlHJbAAAB5UlEQVR4nO2b3U3DMBRGXcQ7yUBIrNBBkNgAdYNIDMIKkVgIJghPFwqtEyef74/T70h9aSs1PTrOtVQ3JUIIIWEZh27yvoZmGYdu6vt+iizxzvsCiBJSnzyiVsgC98j/+iJXyAL3Rq6+qBWGKnAcuul4Osy+53g6hNobhhLYImEEltQnRKowjMBWCSFwTX1ClArdBW6RJ0SQ6C6wdVwFIvUJ3hWyQBA3gTXqEzwrvPf40BI+3h6uPv/4/GV8JfO4FFizPsGrQnOBGvIED4kcIiCmAjXrE6wrZIEgZgIt6hMsKzQRaClPsJLIJQyiLtCjPsGiQhYIoirQsz5Bu0IWCKImMEJ9gmaFKgIjyRO0JHIJg1QXGLE+QaNCFghSVWDk+oTaFbJAkGoCW6hPqFlhFYEtyRNqSeQSBoGzabG+c95fp/T08rn5C7BAEEhg6/WlhN8LNwvcgzwBkRj2aEdKf493RDvSIWxKSLu+3LmYlHRFbhkoHCIgqwV61lfyOsKWeyELBFklcE+TN8faCosFWslbGhIW03iNRC5hkKKkvJau9z6wZFsTeiMddfN8zuISvoXBkaPkXjgr8JblCUsOURAsgJZ3y9zFbJAkKsCWd8luQpZIMhFZt5/YG4B5EcoQggh5IdvtIsIiGjVb+IAAAAASUVORK5CYII=';
    const SHIELD_PNG_D_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAG4AAAB9CAYAAABDGVbOAAAEo0lEQVR4nO2dO3LbMBCG15lUqVjlKK59jhxAtSsfIpXqHMDncJ2jqGLlVikyUDAIKeGxj3/B/WYyIycSucTHfwUwEk0UBEEQBEEAxJN1AVJ8nJdrevzyuk53nF+tC+AmCfvx81v2d3QlmkvgFAeSpysXVvL+9nl77F2i2+JrZe3hXaK7grda4ShJoieBLgodTVctnlIIW5yWrD3QJcIVJNEKR0FspRCFWKerFqQUmu3ci6w9rCWq71CzFa7rSsuyiO/HopWq7EgzXeu67v6btETNFIptXLsV3hNWoplCIhmJ7BvUboWjeG2lLBtCaYWjeGql3S9GboWjeGilzS/w1gpHQW2l1U/UEsYl6/ev77fHz6cLyza1WmmNwC8tG5aStq7r7Q8HubStn3vhrrOkZXybxHEjMQh7krjkJSQF1qD+0QWE9y1O8uPReD9MqIibTdYemhJFW6VFO9mbiHBNUGqRPnZ2cdJv4DWUkrSl5UiNx3Qfz0tYytLAdFYZ9BPinALTKiWudHCCVh9E4qSudHCBWJ954u5d6eg5s+8NKuf2euvjwlwcFzUpSM9BaHWjuBfX07ZmEGgu7vl02Rz8mkFtfd3We9Wj/YzUJwnE5KTnSkc5mM+nS5WE8jk1iUW6EpMwT1yiZTC2pLXuK99GbfKQgEjcCL0DiiaiFXfiOBfC+esR1mYtuBMX/MWVOInLTl5T50pc8I8Q55QQ5xSYdVwNUlN4j0uDSJxTQpxTQpxTQpxTQpxTQpxTQpxTXKzjLK4hoq/t4BNndeEX/YIztDjrwbPe/z1gW+XoxxO49m39+ck9oBOX0B44RFElLsQF/wPbKkdA/BwkN9MlTuuuC9ZMJe6RnJnkVYt7eV2f8vtP7aF5y4icWilW8mrG5f3ts/q2UFMl7kg0iUNPHSrcaSOKxLmlWVxt6oJ6WtNGJJg47XZZu07TXs9JjcNUrdLbV6VG6BKH3C5R7uVVS0+bJBJO3NFnl5LH3y3OU+pmSxuRwkXmZVlM7qRnLQv6fpXIqUNnJG1Ek80qj4SKuKNNUjSOd1icRrvUvqIvvb/RNkmk+D/grZOUrXuRWNA6ydHqLiytUip11jNDif1zpI3IweTESp71SfMI1Q8L9a7p0AcxoTkJY0tcrOkew9UmiRy0ymAbVnE1qZt1TffouDjTRhSJcwu7uCOmTjttRJE4t5h9dyCdpZ5/RZll5xBJXMvSwGvbrK1bok0SgXxbx1P6UE40sfe4ngU5yqDs0VqfVNqIQBKXg5g+xBNKdFY5chkMZbB665BMGxFg4nIs04dy4uwhdkbkfJyXK9H4L4DXEDgqLHUYybQRKYlLcAiUlDciTUtYQlVc4uO8XJHSx5EyLWEJE3FEOOnzlLIcM3EJq/R5TFmOuTgi/fR5TVkOhLiEtMAZhCUgiigZbZ9b8kaloQhLQBWTw5W+mVKWA1dQCdfivQVkYQnYwko4Zp81ILbFLeALzJFMn4eU5bgosoRToDdhCVfFloy2Ty9tcQuXRef0pM9rynLcFl5Smz7PKctxfwA599I3Q8pypjiIklzgbMIOQRIYBEEQBEEQBEEQBEEQHIk/QJ6jsuZuZ0IAAAAASUVORK5CYII=';
    const SHIELD_D = new Set(['Password & MFA', 'Ransomware', 'Vulnerability', 'Malware', 'Insider Threat']);

    // Threat level → left stripe colour (visual signal)
    function stripeColor(lv) {
      const colors = ['#555555','#4CAF50','#8BC34A','#FF9800','#E64A19','#D32F2F'];
      return colors[Math.min(Number(lv) || 0, 5)] || '#C09010';
    }

    // Each article rendered as a numbered priority card
    const cards = arts.map((a, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      const vtype = resolveArticleVisualType(a);
      const stripe = stripeColor(a.threatLevel);
      const iconHtml = illus
        ? (SHIELD_D.has(vtype)
            ? dispIcon(SHIELD_PNG_D_URI, 36, 41, '&#128737;')
            : dispIcon(WARN_PNG_D_URI, 30, 27, '&#9888;'))
        : '';
      const iconCell = illus
        ? `<td valign="top" width="44" style="padding-right:14px;">${iconHtml}</td>`
        : '';
      const readLink = lk && a.url
        ? `${tbl()}${tbc('', 'height="10" style="font-size:1px;line-height:10px;"')}${tblx()}`
          + `<a href="${escAttr(a.url)}" target="_blank" style="display:inline-block;font-size:11px;color:#B8860B;font-weight:bold;text-decoration:none;border:1px solid rgba(184,134,11,.35);padding:3px 10px;${NLFF}">&#8599; Read more — ${escapeHtml(a.source)}${fmtArticlePub(a) ? ` · ${escapeHtml(fmtArticlePub(a))}` : ''}</a>`
        : '';
      const actionItems = a.watchouts?.length
        ? `${tbl()}${tbc('', 'height="12" style="font-size:1px;line-height:12px;"')}${tblx()}`
          + `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #EADFC8;">`
          + `<tr><td style="padding-top:10px;">`
          + `<span style="font-size:8px;letter-spacing:.13em;text-transform:uppercase;color:#999;font-weight:bold;${NLFF}">Action Items</span>`
          + `${tbl()}${tbc('', 'height="5" style="font-size:1px;line-height:5px;"')}${tblx()}`
          + a.watchouts.map((w) =>
              `${tbl()}${tbc(
                `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>`
                + `<td width="16" valign="top" style="font-size:13px;color:#C09010;font-weight:bold;line-height:1.4;">&#8250;</td>`
                + `<td valign="top" style="font-size:13px;color:#2D2D2D;line-height:1.4;font-weight:500;${NLFF}">${escapeHtml(w)}</td>`
                + `</tr></table>`,
                'style="padding:0 0 4px 0;"'
              )}${tblx()}`
            ).join('')
          + `</td></tr></table>`
        : '';

      return `${tbl()}${tbc(
        // Card layout: left priority-number block | right content column
        `<table width="100%" cellpadding="0" cellspacing="0" border="0">`
        + `<tr>`
        // Priority number block — coloured top stripe signals threat level
        + `<td valign="top" width="64" style="padding-right:18px;">`
        + `<table cellpadding="0" cellspacing="0" border="0" width="52" bgcolor="#0A0A0A" style="background-color:#0A0A0A;">`
        + `<tr><td height="3" bgcolor="${stripe}" style="background-color:${stripe};height:3px;font-size:1px;line-height:3px;">&nbsp;</td></tr>`
        + `<tr><td align="center" style="padding:8px 6px 10px;">`
        + `<span style="font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:rgba(212,164,32,.7);${NLFF}">PRIORITY</span><br>`
        + `<span style="font-size:26px;font-weight:bold;color:#FFFFFF;line-height:1;${NLFF_SERIF}">${num}</span>`
        + `</td></tr></table></td>`
        // Right column: type label row, then icon aligned to headline row
        + `<td valign="top">`
        // Type label sits above the headline (full-width, no icon competing)
        + `<table width="100%" cellpadding="0" cellspacing="0" border="0">`
        + `<tr><td style="padding-bottom:6px;"><span style="font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:#B8860B;font-weight:bold;${NLFF}">${escapeHtml(a.type)}</span> ${badge(a.threatLevel)}</td></tr></table>`
        // Icon + headline — icon aligned to the title text, not the tiny type label
        + `<table width="100%" cellpadding="0" cellspacing="0" border="0">`
        + `<tr>${iconCell}<td valign="middle"><span style="font-size:16px;font-weight:bold;color:#1A1A1A;line-height:1.3;${NLFF_SERIF}">${escapeHtml(a.title)}</span></td></tr>`
        + `</table>`
        + `${tbl()}${tbc('', 'height="10" style="font-size:1px;line-height:10px;"')}${tblx()}`
        + `<span style="font-size:14px;color:#333333;line-height:1.6;${NLFF}">${escapeHtml(a.summary || a.description || '')}</span>`
        + readLink + actionItems
        + `</td></tr></table>`,
        'style="padding:22px 0;border-bottom:1px solid #E5DFD5;margin:0;"'
      )}${tblx()}`;
    }).join('');

    // Key Actions — 2-column grid (better for longer AI-generated text)
    let keyActionsRow = '';
    if (poster && wo.length) {
      const woArr = wo.slice(0, 6);
      let rows2 = '';
      for (let i = 0; i < woArr.length; i += 2) {
        const chunk = woArr.slice(i, i + 2);
        const cells2 = chunk.map((w, j) => {
          const n = String(i + j + 1).padStart(2, '0');
          return `<td valign="top" width="50%" style="padding:5px;">`
            + `<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#1A1A1A" style="background-color:#1A1A1A;border-left:3px solid #C09010;">`
            + `<tr><td style="padding:12px 14px;">`
            + `<span style="font-size:18px;font-weight:bold;color:#D4A420;line-height:1;${NLFF_SERIF}">${n}</span>`
            + `${tbl()}${tbc('', 'height="5" style="font-size:1px;line-height:5px;"')}${tblx()}`
            + `<span style="font-size:12px;color:#E0E0E0;line-height:1.45;font-weight:400;${NLFF}">${escapeHtml(w)}</span>`
            + `</td></tr></table></td>`;
        });
        while (cells2.length < 2) cells2.push(`<td width="50%" style="padding:5px;"></td>`);
        rows2 += `<tr>${cells2.join('')}</tr>`;
      }
      keyActionsRow = tbc(
        `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tbody>${rows2}</tbody></table>`
        + `${tbl()}${tbc('', 'height="14" style="font-size:1px;line-height:14px;"')}${tblx()}`
        + `<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#C09010" style="background-color:#C09010;">`
        + `<tr><td align="center" style="padding:10px 20px;font-size:11px;font-weight:bold;letter-spacing:.1em;text-transform:uppercase;color:#FFFFFF;${NLFF}">STOP · THINK · REPORT — ${escapeHtml((c.soc || '').trim())}</td></tr></table>`,
        'bgcolor="#0A0A0A" style="padding:24px 32px;background-color:#0A0A0A;margin:0;"'
      );
      keyActionsRow = `${tbl()}${tbc(
        `<span style="font-size:13px;font-weight:bold;letter-spacing:.16em;text-transform:uppercase;color:#0A0A0A;${NLFF}">Key Actions This Edition</span>`,
        'bgcolor="#D4A420" style="padding:10px 32px;background-color:#D4A420;margin:0;"'
      )}${tblx()}` + `${tbl()}${keyActionsRow}${tblx()}`;
    }

    // CTA — gold background (visually distinct from Corporate Alert dark CTA)
    const mail = escAttr(`mailto:${(c.soc || '').trim()}`);
    const socShow = escapeHtml((c.soc || '').trim());
    const dispatchCTA = tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>`
      + `<td valign="top" style="padding-right:20px;">`
      + `<span style="font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#0A0A0A;font-weight:bold;${NLFF}">See Something Suspicious?</span>`
      + `${tbl()}${tbc('', 'height="4" style="font-size:1px;line-height:4px;"')}${tblx()}`
      + `<span style="font-size:16px;font-weight:bold;color:#0A0A0A;line-height:1.25;${NLFF_SERIF}">Don't Click. Don't Reply. Report It.</span>`
      + `${tbl()}${tbc('', 'height="4" style="font-size:1px;line-height:4px;"')}${tblx()}`
      + `<span style="font-size:11px;color:rgba(0,0,0,.55);line-height:1.5;${NLFF}">Forward suspicious emails to the security team. Don't delete them — every report helps protect the company.</span>`
      + `</td>`
      + `<td valign="middle" align="right" style="padding-left:14px;white-space:nowrap;">`
      + `<a href="${mail}" style="display:inline-block;background-color:#0A0A0A;color:#FFFFFF;font-weight:bold;font-size:12px;padding:10px 18px;text-decoration:none;border:1px solid #000000;word-break:break-all;${NLFF}">Report to ${socShow}</a>`
      + `</td></tr></table>`,
      'data-nl-nav="nl-cta" bgcolor="#D4A420" style="padding:22px 32px;background-color:#D4A420;"'
    );

    const highestLv = arts.reduce((m, a) => Math.max(m, a.threatLevel || 0), 0);
    return `${nlOuterOpen()}${tbl()}`
      + tbc('', 'height="4" bgcolor="#0A0A0A" style="background-color:#0A0A0A;font-size:1px;line-height:4px;height:4px;"')
      + classificationBar(highestLv, 'INTERNAL // SECURITY DISPATCH // PRIORITY BRIEFING')
      + tbc(
          `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>`
          + `<td valign="middle" style="padding-right:16px;">`
          + `<span style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:rgba(212,164,32,.78);font-weight:bold;${NLFF}">${escapeHtml((c.org || 'ABC Corp').trim())} &middot; ${escapeHtml(String(fmtDate(c.issueDate || new Date())).toUpperCase())}</span>`
          + `${tbl()}${tbc('', 'height="12" style="font-size:1px;line-height:12px;"')}${tblx()}`
          + `<span style="font-size:42px;font-weight:bold;color:#FFFFFF;letter-spacing:0.04em;line-height:1;${NLFF_SERIF}">SECURITY <span style="color:#D4A420;font-style:italic;">DISPATCH</span></span>`
          + `${tbl()}${tbc('', 'height="14" style="font-size:1px;line-height:14px;"')}${tblx()}`
          + `<table width="80" cellpadding="0" cellspacing="0" border="0"><tr><td height="2" bgcolor="#D4A420" style="background-color:#D4A420;height:2px;font-size:1px;">&nbsp;</td></tr></table>`
          + `${tbl()}${tbc('', 'height="12" style="font-size:1px;line-height:12px;"')}${tblx()}`
          + `<span style="font-size:13px;color:rgba(255,255,255,0.6);line-height:1.7;${NLFF}">${escapeHtml((c.title || 'Priority briefing on the most material threats observed this cycle.').slice(0, 160))}</span>`
          + `</td>`
          + (illus ? `<td valign="middle" align="right" width="100">`
              + `<!--[if mso]><table cellpadding="0" cellspacing="0" border="0" width="80" height="88"><tr><td align="center" valign="middle" bgcolor="#0D0D0D" style="background-color:#0D0D0D;border:2px solid #C09010;font-size:42px;color:#D4A420;font-family:Arial;">&#128737;</td></tr></table><![endif]-->`
              + `<!--[if !mso]><!--><img src="${SHIELD_PNG_D_URI}" width="80" height="88" border="0" alt="" style="display:block;border:0;width:80px;height:88px;"><!--<![endif]-->`
              + `</td>` : '')
          + `</tr></table>`,
          'data-nl-nav="nl-header" bgcolor="#0A0A0A" style="padding:34px 36px 30px;background-color:#0A0A0A;margin:0;"'
        )
      + editorialDivider('Priority Briefing &middot; Items Under Review', '#FAFAF7', '#0A0A0A')
      + tbc(`${corporateTopicIntroHtml(c)}${cards}`, 'data-nl-nav="nl-articles" bgcolor="#FAFAF7" style="padding:18px 32px 4px;background-color:#FAFAF7;margin:0;"')
      + (keyActionsRow ? `${tbl()}${tbc(keyActionsRow, 'data-nl-nav="nl-key-actions" bgcolor="#FAFAF7" style="padding:0;background-color:#FAFAF7;margin:0;"')}${tblx()}` : '')
      + `${tbl()}${dispatchCTA}${tblx()}`
      + tbc(foot(c, qr), 'data-nl-nav="nl-footer" style="padding:0;margin:0;"')
      + `${tblx()}${nlOuterClose()}`;
  }

  // resolveEditionTakeaways(cfg, arts) lives in the main newsletter_builder.js
  // because build() calls it before dispatching to a template builder.

  // ══════════════════════════════════════════════════
  //  POSTER 1: EXECUTIVE AUTHORITY · SHIELD CAMPAIGN
  //  Centred sentinel composition — Microsoft Security / IBM X-Force authority
  // ══════════════════════════════════════════════════
  function buildPoster1(c, arts, wo, lk, poster, qr, illus, ro) {
    const screenSafe = ro && ro.renderChannel === 'screen-safe';
    const title    = escapeHtml(c.title || 'Protect What Matters');
    const kicker   = escapeHtml(`${c.freq || 'WEEKLY'} SECURITY NOTICE`);
    const orgLine  = escapeHtml((c.org || 'Your Organisation').trim());
    const socEsc   = escapeHtml((c.soc || 'security@company.com').trim());
    const socAttr  = escAttr(`mailto:${(c.soc || '').trim()}`);
    const dateStr  = escapeHtml(fmtDate(c.issueDate || c.date || new Date().toISOString()));
    const tagline  = escapeHtml((wo[0] || 'Your decisions are the organisation\'s most reliable line of defence. Verify every request. Report every suspicion. Act without hesitation.').slice(0, 160));
    const lvColors = ['#666666','#27AE60','#8BC34A','#F39C12','#E67E22','#E74C3C'];
    const lvNames  = ['ADVISORY','LOW','MODERATE','ELEVATED','HIGH','CRITICAL'];
    const highest  = arts.reduce((m, a) => Math.max(m, a.threatLevel || 0), 0);
    const trackedCount = String(Math.max(arts.length, 0)).padStart(2, '0');
    const reportCount  = String(arts.reduce((s, a) => s + (Array.isArray(a.watchouts) ? a.watchouts.length : 0), 0)).padStart(2, '0');
    const threatArts = arts.slice(0, 3);
    const threatRows = threatArts.length
      ? threatArts.map((a, i) => {
          const aType  = escapeHtml((a.type || 'Advisory').toUpperCase().slice(0, 22));
          const aTitle = escapeHtml((a.title || '').slice(0, 68));
          const lv     = a.threatLevel || 0;
          const lvC    = lvColors[Math.min(lv, 5)];
          const lvN    = lvNames[Math.min(lv, 5)];
          const pill   = `<span style="font-size:8px;padding:3px 9px;background-color:${lvC};color:#FFFFFF;letter-spacing:2px;text-transform:uppercase;font-weight:bold;${NLFF}">${lvN}</span>`;
          return `<tr>
            <td width="50" valign="middle" align="center" style="padding:14px 0 14px 14px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <span style="font-size:9px;letter-spacing:2px;color:#B8860B;font-weight:bold;${NLFF}">${String(i + 1).padStart(2, '0')}</span>
            </td>
            <td width="4" bgcolor="${lvC}" style="background-color:${lvC};border-bottom:1px solid rgba(255,255,255,0.06);">&nbsp;</td>
            <td style="padding:13px 18px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td valign="middle">
                  <span style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#B8860B;font-weight:bold;${NLFF}">${aType}</span><br>
                  <span style="font-size:13px;color:rgba(255,255,255,0.86);line-height:1.45;${NLFF_SERIF}">${aTitle}</span>
                </td>
                <td width="100" align="right" valign="middle" style="padding-left:10px;">${pill}</td>
              </tr></table>
            </td>
          </tr>`;
        }).join('')
      : `<tr>
          <td width="4" bgcolor="#2A2A2A" style="background-color:#2A2A2A;">&nbsp;</td>
          <td style="padding:14px 16px;">
            <span style="font-size:12px;color:rgba(255,255,255,0.42);${NLFF}">${escapeHtml((wo[1] || 'Monitor all access points. Report unusual account activity immediately to your security team.').slice(0, 100))}</span>
          </td>
        </tr>`;
    // Architectural shield SVG — concentric authority emblem with serif initial
    const shieldSvg = `<!--[if !mso]><!-- --><svg width="120" height="138" viewBox="0 0 120 138" xmlns="http://www.w3.org/2000/svg"><path d="M60 6L112 24L112 64Q112 102 60 132Q8 102 8 64L8 24Z" fill="none" stroke="rgba(212,164,32,0.22)" stroke-width="1"/><path d="M60 14L104 30L104 64Q104 96 60 122Q16 96 16 64L16 30Z" fill="none" stroke="rgba(212,164,32,0.4)" stroke-width="1.5"/><path d="M60 22L96 36L96 64Q96 90 60 112Q24 90 24 64L24 36Z" fill="rgba(212,164,32,0.06)" stroke="#D4A420" stroke-width="2"/><path d="M60 32L86 42L86 64Q86 82 60 100Q34 82 34 64L34 42Z" fill="rgba(212,164,32,0.1)"/><text x="60" y="78" font-family="Georgia,serif" font-size="34" font-weight="bold" fill="#D4A420" text-anchor="middle">${escapeHtml(orgLine.charAt(0).toUpperCase() || 'S')}</text><line x1="38" y1="92" x2="82" y2="92" stroke="#D4A420" stroke-width="1.5"/></svg><!--<![endif]--><!--[if mso]><table width="120" height="138" border="0" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" bgcolor="#1A1A1A" style="background:#1A1A1A;border:2px solid #D4A420;font-family:Georgia,serif;font-size:54px;color:#D4A420;text-align:center;font-weight:bold;">${escapeHtml(orgLine.charAt(0).toUpperCase() || 'S')}</td></tr></table><![endif]-->`;
    return `${nlOuterOpen()}${tbl()}${tbc('',
      'height="6" style="height:6px;line-height:6px;font-size:1px;background:linear-gradient(90deg,#B8860B 0%,#D4A420 45%,#C09010 100%);background-color:#D4A420;"'
    )}${classificationBar(highest, `INTERNAL // EXECUTIVE BULLETIN // ${dateStr.toUpperCase()}`)}${tbc(
      `${screenSafe ? screenSafeStyle() : ''}<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding:48px 48px 24px;">${shieldSvg}</td></tr>
        <tr><td align="center" style="padding:0 52px 14px;">
          <span style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(212,164,32,0.78);font-weight:bold;${NLFF}">${kicker}</span>
        </td></tr>
        <tr><td align="center" style="padding:0 36px 22px;">
          <span style="font-size:52px;font-weight:bold;color:#FFFFFF;line-height:1.02;letter-spacing:-0.5px;${NLFF_SERIF}">${title}</span>
        </td></tr>
        <tr><td align="center" style="padding:0 48px 18px;">
          <table width="140" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td height="2" bgcolor="#D4A420" style="background-color:#D4A420;height:2px;font-size:1px;">&nbsp;</td></tr></table>
        </td></tr>
        <tr><td align="center" style="padding:6px 56px 36px;">
          <span style="font-size:15px;color:rgba(255,255,255,0.6);line-height:1.78;${NLFF}">${tagline}</span>
        </td></tr>
        <tr><td style="padding:0 36px 38px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle" width="50%" align="center" style="padding:14px;border-right:1px solid rgba(212,164,32,0.22);">
              <span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.4);font-weight:bold;${NLFF}">Items Tracked</span><br>
              <span style="font-size:36px;font-weight:bold;color:#D4A420;line-height:1;${NLFF_SERIF}">${trackedCount}</span>
            </td>
            <td valign="middle" width="50%" align="center" style="padding:14px;">
              <span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.4);font-weight:bold;${NLFF}">Actions Issued</span><br>
              <span style="font-size:36px;font-weight:bold;color:#D4A420;line-height:1;${NLFF_SERIF}">${reportCount}</span>
            </td>
          </tr></table>
        </td></tr>
      </table>`,
      'bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:0;margin:0;"'
    )}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #D4A420;">
        <tr><td bgcolor="#111111" style="background-color:#111111;padding:14px 22px;border-bottom:1px solid rgba(212,164,32,0.15);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle"><span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#D4A420;font-weight:bold;${NLFF}">Active Threat Intelligence</span></td>
            <td align="right" valign="middle"><span style="font-size:9px;color:rgba(255,255,255,0.32);letter-spacing:1px;${NLFF}">${dateStr}</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">${threatRows}</table>
        </td></tr>
      </table>`,
      'bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:0 28px 0;margin:0;"'
    )}${tbc(
      `<table cellpadding="0" cellspacing="0" border="0" align="center"><tr>
        <td bgcolor="#C09010" style="background-color:#C09010;padding:16px 44px;text-align:center;">
          <a href="${socAttr}" style="color:#0A0A0A;font-size:11px;font-weight:bold;text-decoration:none;letter-spacing:4px;text-transform:uppercase;${NLFF}">REPORT AN INCIDENT &rarr;</a>
        </td>
      </tr></table>`,
      'align="center" bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:30px 28px 30px;margin:0;"'
    )}${tbc(
      `<span style="font-size:9px;color:rgba(255,255,255,0.22);letter-spacing:2px;text-transform:uppercase;${NLFF}">${orgLine} &nbsp;&middot;&nbsp; Security Operations Centre &nbsp;&middot;&nbsp; ${socEsc}</span>`,
      'align="center" bgcolor="#0A0A0A" style="padding:0 28px 18px;background-color:#0A0A0A;margin:0;border-top:1px solid #1A1A1A;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tblx()}${nlOuterClose()}`;
  }

  // ══════════════════════════════════════════════════
  //  POSTER 2: THREAT DOSSIER · INTELLIGENCE BRIEFING
  //  Asymmetric split — Mandiant / CrowdStrike intelligence-report aesthetic
  // ══════════════════════════════════════════════════
  function buildPoster2(c, arts, wo, lk, poster, qr, illus) {
    const title    = escapeHtml(c.title || 'Never Trust. Always Verify.');
    const kicker   = escapeHtml(`${c.freq || 'WEEKLY'} THREAT DOSSIER`);
    const orgLine  = escapeHtml((c.org || 'Your Organisation').trim());
    const socEsc   = escapeHtml((c.soc || 'security@company.com').trim());
    const socAttr  = escAttr(`mailto:${(c.soc || '').trim()}`);
    const dateStr  = escapeHtml(fmtDate(c.issueDate || c.date || new Date().toISOString()));
    const dossierNo = 'DOS-' + String(new Date(c.issueDate || c.date || Date.now()).getFullYear()) + '-' + String(((arts[0] && arts[0].title ? arts[0].title.length : 7) + arts.length) * 11 % 1000).padStart(3, '0');
    const art0     = arts[0] || {};
    const art1     = arts[1] || {};
    const bodyText = escapeHtml((art0.summary || wo[0] || 'Every access request must be independently verified. Threats do not announce themselves — impersonation, credential theft, and phishing are your primary attack surfaces. Vigilance is your most reliable control.').slice(0, 240));
    const action1  = escapeHtml((wo[1] || (art0.watchouts && art0.watchouts[0]) || 'Verify identity before sharing credentials, data, or access with any party.').slice(0, 105));
    const action2  = escapeHtml((wo[2] || (art0.watchouts && art0.watchouts[1]) || 'Report unusual logins, access requests, or account changes immediately to your SOC.').slice(0, 105));
    const threatType  = escapeHtml((art0.type || 'THREAT ADVISORY').toUpperCase());
    const threatLevel = art0.threatLevel || 0;
    const highest     = arts.reduce((m, a) => Math.max(m, a.threatLevel || 0), 0);
    const lvColors    = ['#666666','#27AE60','#8BC34A','#F39C12','#E67E22','#E74C3C'];
    const lvNames     = ['ADVISORY','LOW','MODERATE','ELEVATED','HIGH','CRITICAL'];
    const lvC = lvColors[Math.min(threatLevel, 5)];
    const lvN = lvNames[Math.min(threatLevel, 5)];
    const also = art1.title ? escapeHtml(art1.title.slice(0, 80)) : '';
    // Padlock + intelligence grid SVG — architectural composition
    const dossierSvg = `<!--[if !mso]><!-- --><svg width="84" height="108" viewBox="0 0 84 108" xmlns="http://www.w3.org/2000/svg"><g opacity="0.18"><line x1="0" y1="20" x2="84" y2="20" stroke="#C09010" stroke-width="0.6"/><line x1="0" y1="40" x2="84" y2="40" stroke="#C09010" stroke-width="0.6"/><line x1="0" y1="60" x2="84" y2="60" stroke="#C09010" stroke-width="0.6"/><line x1="0" y1="80" x2="84" y2="80" stroke="#C09010" stroke-width="0.6"/><line x1="0" y1="100" x2="84" y2="100" stroke="#C09010" stroke-width="0.6"/><line x1="20" y1="0" x2="20" y2="108" stroke="#C09010" stroke-width="0.6"/><line x1="40" y1="0" x2="40" y2="108" stroke="#C09010" stroke-width="0.6"/><line x1="60" y1="0" x2="60" y2="108" stroke="#C09010" stroke-width="0.6"/></g><rect x="22" y="48" width="40" height="44" rx="3" fill="none" stroke="#C09010" stroke-width="2.5"/><path d="M30 48L30 32Q30 14 42 14Q54 14 54 32L54 48" fill="none" stroke="#C09010" stroke-width="2.5"/><circle cx="42" cy="66" r="5.5" fill="#D4A420"/><rect x="39.5" y="69" width="5" height="11" rx="2.5" fill="#D4A420"/><circle cx="42" cy="14" r="3" fill="#D4A420"/></svg><!--<![endif]--><!--[if mso]><table width="84" height="108" border="0" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" style="font-family:Arial;font-size:46px;color:#C09010;text-align:center;">&#9632;</td></tr></table><![endif]-->`;
    return `${nlOuterOpen()}${tbl()}${tbc('',
      'height="6" style="height:6px;line-height:6px;font-size:1px;background:linear-gradient(90deg,#B8860B 0%,#D4A420 45%,#C09010 100%);background-color:#D4A420;"'
    )}${classificationBar(highest, `INTERNAL // THREAT DOSSIER // ${dossierNo}`)}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="60%" valign="top" bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:42px 32px 38px;border-right:2px solid #D4A420;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td valign="middle"><span style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:rgba(212,164,32,0.78);font-weight:bold;${NLFF}">${kicker}</span></td>
              <td align="right" valign="middle"><span style="font-size:9px;letter-spacing:2px;color:rgba(255,255,255,0.32);${NLFF}">${dossierNo}</span></td>
            </tr></table>
            <br>
            <span style="font-size:40px;font-weight:bold;color:#FFFFFF;line-height:1.04;letter-spacing:-0.5px;${NLFF_SERIF}">${title}</span><br><br>
            <table width="60" cellpadding="0" cellspacing="0" border="0"><tr><td height="2" bgcolor="#D4A420" style="background-color:#D4A420;height:2px;font-size:1px;">&nbsp;</td></tr></table>
            <br>
            <span style="font-size:36px;float:left;line-height:0.86;color:#D4A420;font-weight:bold;padding:6px 12px 0 0;${NLFF_SERIF}">${(bodyText || 'T').charAt(0)}</span>
            <span style="font-size:14px;color:rgba(255,255,255,0.68);line-height:1.78;${NLFF}">${bodyText.slice(1)}</span>
            ${also ? `<br><br><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="3" bgcolor="#6A5010" style="background-color:#6A5010;">&nbsp;</td><td style="padding:10px 14px;background:rgba(212,164,32,0.06);"><span style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#B8860B;font-weight:bold;${NLFF}">Also in this dossier</span><br><br><span style="font-size:12px;color:rgba(255,255,255,0.7);line-height:1.5;${NLFF_SERIF}">${also}</span></td></tr></table>` : ''}
            <br><br>
            <span style="font-size:8px;letter-spacing:3px;text-transform:uppercase;color:rgba(212,164,32,0.7);font-weight:bold;${NLFF}">Operational Guidance</span>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
              <tr><td width="16" valign="top" style="padding-top:3px;padding-right:8px;"><span style="font-size:13px;color:#D4A420;font-weight:bold;line-height:1;">&rsaquo;</span></td><td><span style="font-size:13px;color:rgba(255,255,255,0.78);line-height:1.65;${NLFF}">${action1}</span></td></tr>
              <tr><td height="9" style="font-size:1px;">&nbsp;</td></tr>
              <tr><td width="16" valign="top" style="padding-top:3px;padding-right:8px;"><span style="font-size:13px;color:#D4A420;font-weight:bold;line-height:1;">&rsaquo;</span></td><td><span style="font-size:13px;color:rgba(255,255,255,0.78);line-height:1.65;${NLFF}">${action2}</span></td></tr>
            </table>
          </td>
          <td width="40%" valign="top" bgcolor="#F5F1EA" style="background-color:#F5F1EA;padding:42px 24px 38px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td align="center" style="padding-bottom:26px;">${dossierSvg}</td></tr>
              <tr><td align="center" style="padding-bottom:16px;">
                <table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td bgcolor="${lvC}" style="background-color:${lvC};padding:6px 22px;"><span style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#FFFFFF;font-weight:bold;${NLFF}">${lvN}</span></td></tr></table>
              </td></tr>
              <tr><td align="center" style="padding-bottom:6px;">
                <span style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#666666;font-weight:bold;${NLFF}">${threatType}</span>
              </td></tr>
              <tr><td align="center" style="padding-bottom:4px;">
                <span style="font-size:10px;color:#999999;font-style:italic;${NLFF_SERIF}">Current threat classification</span>
              </td></tr>
              <tr><td style="padding:22px 8px 18px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" bgcolor="#D8D0C4" style="background-color:#D8D0C4;height:1px;font-size:1px;">&nbsp;</td></tr></table></td></tr>
              <tr><td align="center" style="padding-bottom:8px;">
                <span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#B8860B;font-weight:bold;${NLFF}">Reporting Channel</span>
              </td></tr>
              <tr><td align="center" style="padding-bottom:18px;">
                <span style="font-size:13px;color:#0A0A0A;font-weight:bold;line-height:1.5;${NLFF_SERIF}">${socEsc}</span>
              </td></tr>
              <tr><td style="padding-bottom:22px;">
                <table cellpadding="0" cellspacing="0" border="0" align="center"><tr>
                  <td bgcolor="#C09010" style="background-color:#C09010;padding:13px 28px;text-align:center;">
                    <a href="${socAttr}" style="color:#FFFFFF;font-size:11px;font-weight:bold;text-decoration:none;letter-spacing:3px;text-transform:uppercase;${NLFF}">REPORT &rarr;</a>
                  </td>
                </tr></table>
              </td></tr>
              <tr><td align="center" style="border-top:1px solid #D8D0C4;padding-top:14px;">
                <span style="font-size:9px;color:#888888;letter-spacing:2px;text-transform:uppercase;${NLFF}">${orgLine} &middot; ${dateStr}</span>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>`,
      'style="padding:0;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }

  // ══════════════════════════════════════════════════
  //  POSTER 3: HUMAN-ERROR TRAINING SEQUENCE
  //  Alternating bands with SVG sentinels per step — procedural campaign
  // ══════════════════════════════════════════════════
  function buildPoster3(c, arts, wo, lk, poster, qr, illus) {
    const title   = escapeHtml(c.title || 'Three Habits That Stop The Attack');
    const kicker  = escapeHtml(`${c.freq || 'WEEKLY'} BEHAVIOURAL CAMPAIGN`);
    const orgLine = escapeHtml((c.org || 'Your Organisation').trim());
    const socEsc  = escapeHtml((c.soc || 'security@company.com').trim());
    const socAttr = escAttr(`mailto:${(c.soc || '').trim()}`);
    const dateStr = escapeHtml(fmtDate(c.issueDate || c.date || new Date().toISOString()));
    const highest = arts.reduce((m, a) => Math.max(m, a.threatLevel || 0), 0);
    const briefLine = escapeHtml((wo[0] || 'Most breaches do not exploit broken software — they exploit a broken moment. These three habits eliminate the moments attackers depend on.').slice(0, 200));
    // SVG sentinels — one per step
    const pauseSvg = `<!--[if !mso]><!-- --><svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="24" fill="none" stroke="#D4A420" stroke-width="2.5"/><rect x="20" y="18" width="5" height="20" rx="1" fill="#D4A420"/><rect x="31" y="18" width="5" height="20" rx="1" fill="#D4A420"/></svg><!--<![endif]--><!--[if mso]><table width="56" height="56" border="0" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" style="font-family:Arial;font-size:38px;color:#D4A420;">&#9209;</td></tr></table><![endif]-->`;
    const verifySvg = `<!--[if !mso]><!-- --><svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="22" r="14" fill="none" stroke="#C09010" stroke-width="2.5"/><circle cx="22" cy="22" r="5" fill="#C09010"/><line x1="32" y1="32" x2="48" y2="48" stroke="#C09010" stroke-width="3" stroke-linecap="round"/></svg><!--<![endif]--><!--[if mso]><table width="56" height="56" border="0" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" style="font-family:Arial;font-size:38px;color:#C09010;">&#128269;</td></tr></table><![endif]-->`;
    const reportSvg = `<!--[if !mso]><!-- --><svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><path d="M12 8 L12 48" stroke="#D4A420" stroke-width="3" stroke-linecap="round"/><path d="M12 8 L42 8 L34 18 L42 28 L12 28" fill="rgba(212,164,32,0.16)" stroke="#D4A420" stroke-width="2.5" stroke-linejoin="round"/></svg><!--<![endif]--><!--[if mso]><table width="56" height="56" border="0" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" style="font-family:Arial;font-size:38px;color:#D4A420;">&#9873;</td></tr></table><![endif]-->`;
    const steps = [
      {
        num: '01', bg: '#0A0A0A', numFg: '#D4A420', fg: 'rgba(255,255,255,0.8)', labelFg: '#D4A420', divColor: '#D4A420', svg: pauseSvg,
        verb: 'Pause',
        label: escapeHtml((arts[0] && arts[0].type ? arts[0].type.toUpperCase() : 'BEFORE YOU ACT')),
        text:  escapeHtml((wo[0] || (arts[0] && arts[0].watchouts && arts[0].watchouts[0]) || 'Before clicking any link or opening an attachment, pause and verify the sender through a known, trusted channel. Impersonation is the primary attack vector today.').slice(0, 160))
      },
      {
        num: '02', bg: '#F5F1EA', numFg: '#C09010', fg: '#1A1A1A', labelFg: '#C09010', divColor: '#C09010', svg: verifySvg,
        verb: 'Verify',
        label: escapeHtml((arts[1] && arts[1].type ? arts[1].type.toUpperCase() : 'CONFIRM ON A SECOND CHANNEL')),
        text:  escapeHtml((wo[1] || (arts[1] && arts[1].watchouts && arts[1].watchouts[0]) || 'Apply zero-trust principles to every interaction. Verify every access request and credential change regardless of how familiar the source appears.').slice(0, 160))
      },
      {
        num: '03', bg: '#111111', numFg: '#D4A420', fg: 'rgba(255,255,255,0.8)', labelFg: '#D4A420', divColor: '#D4A420', svg: reportSvg,
        verb: 'Report',
        label: escapeHtml((arts[2] && arts[2].type ? arts[2].type.toUpperCase() : 'ESCALATE THE SIGNAL')),
        text:  escapeHtml((wo[2] || (arts[2] && arts[2].watchouts && arts[2].watchouts[0]) || 'If something feels wrong — a strange email, unusual login, irregular payment request — report it to the security team immediately. Speed is critical to containment.').slice(0, 160))
      }
    ];
    return `${nlOuterOpen()}${tbl()}${tbc('',
      'height="6" style="height:6px;line-height:6px;font-size:1px;background:linear-gradient(90deg,#B8860B 0%,#D4A420 45%,#C09010 100%);background-color:#D4A420;"'
    )}${classificationBar(highest, `INTERNAL // BEHAVIOURAL CAMPAIGN // ${dateStr.toUpperCase()}`)}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:38px 36px 30px;">
            <span style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(212,164,32,0.8);font-weight:bold;${NLFF}">${kicker}</span>
            <br><br>
            <span style="font-size:42px;font-weight:bold;color:#FFFFFF;line-height:1.05;${NLFF_SERIF}">${title}</span>
            <br><br>
            <table width="80" cellpadding="0" cellspacing="0" border="0"><tr><td height="2" bgcolor="#D4A420" style="background-color:#D4A420;height:2px;font-size:1px;">&nbsp;</td></tr></table>
            <br>
            <span style="font-size:13px;color:rgba(255,255,255,0.58);line-height:1.78;${NLFF}">${briefLine}</span>
          </td>
        </tr>
      </table>`,
      'bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:0;margin:0;"'
    )}${steps.map(s => tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="100" valign="middle" align="center" style="padding:34px 0 34px 30px;">
          ${s.svg}
        </td>
        <td width="100" valign="middle" align="center" style="padding:32px 0;border-right:1px solid ${s.divColor}45;">
          <span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:${s.labelFg};font-weight:bold;${NLFF}">Step</span><br>
          <span style="font-size:62px;font-weight:bold;color:${s.numFg};line-height:1;${NLFF_SERIF}">${s.num}</span>
        </td>
        <td valign="middle" style="padding:30px 32px;">
          <span style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:${s.labelFg};font-weight:bold;${NLFF}">${s.label}</span><br><br>
          <span style="font-size:24px;font-weight:bold;color:${s.bg === '#F5F1EA' ? '#0A0A0A' : '#FFFFFF'};line-height:1.2;letter-spacing:-0.5px;${NLFF_SERIF}">${escapeHtml(s.verb)}.</span><br><br>
          <span style="font-size:14px;color:${s.fg};line-height:1.72;${NLFF}">${s.text}</span>
        </td>
      </tr></table>`,
      `bgcolor="${s.bg}" style="background-color:${s.bg};padding:0;margin:0;border-bottom:1px solid rgba(0,0,0,0.12);"`
    )).join('')}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle" style="padding:18px 28px;">
          <span style="font-size:9px;color:rgba(255,255,255,0.5);letter-spacing:2px;text-transform:uppercase;${NLFF}">${orgLine} &middot; ${dateStr}</span>
        </td>
        <td align="right" valign="middle" style="padding:18px 28px;">
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td bgcolor="#C09010" style="background-color:#C09010;padding:12px 24px;text-align:center;">
              <a href="${socAttr}" style="color:#0A0A0A;font-size:10px;font-weight:bold;text-decoration:none;letter-spacing:3px;text-transform:uppercase;${NLFF}">REPORT &rarr; ${socEsc}</a>
            </td>
          </tr></table>
        </td>
      </tr></table>`,
      'bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:0;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }

  // ══════════════════════════════════════════════════
  //  POSTER 4: HIGH-URGENCY INCIDENT ESCALATION
  //  Command-centre — radar SVG, timestamped urgency bar, escalation panel
  // ══════════════════════════════════════════════════
  function buildPoster4(c, arts, wo, lk, poster, qr, illus) {
    const title    = escapeHtml((c.title || 'Active Security Incident').toUpperCase());
    const art0     = arts[0] || {};
    const art1     = arts[1] || {};
    const socEsc   = escapeHtml((c.soc || 'security@company.com').trim());
    const socAttr  = escAttr(`mailto:${(c.soc || '').trim()}`);
    const orgLine  = escapeHtml((c.org || 'Security Operations').trim());
    const dateStr  = escapeHtml(fmtDate(c.issueDate || c.date || new Date().toISOString()));
    const baseTime = new Date(c.issueDate || c.date || Date.now());
    const timeStr  = `${String(baseTime.getUTCHours()).padStart(2, '0')}:${String(baseTime.getUTCMinutes()).padStart(2, '0')}Z`;
    const socRef   = 'SOC-' + String(baseTime.getFullYear()) + '-' + String((arts.length + 11) * 17 % 1000).padStart(3, '0');
    const highest  = arts.reduce((m, a) => Math.max(m, a.threatLevel || 0), 0);
    const brief    = escapeHtml(((art0.summary || wo[0] || 'An active security incident requires immediate staff awareness and heightened caution with all unsolicited communications and access requests.')).split('.').slice(0, 2).join('. ').trim().replace(/\.$/, '') + '.');
    const inc1Title  = art0.title ? escapeHtml(art0.title.slice(0, 70)) : '';
    const inc1Type   = escapeHtml((art0.type || 'INCIDENT').toUpperCase());
    const inc1Action = escapeHtml((art0.watchouts && art0.watchouts[0] ? art0.watchouts[0] : (wo[1] || 'Do not click unsolicited links or attachments. Verify all requests via phone before acting.')).slice(0, 115));
    const inc2Title  = art1.title ? escapeHtml(art1.title.slice(0, 70)) : '';
    const inc2Type   = escapeHtml((art1.type || 'ADVISORY').toUpperCase());
    const inc2Action = escapeHtml((art1.watchouts && art1.watchouts[0] ? art1.watchouts[0] : (wo[2] || 'Report any suspicious account activity, unusual system behaviour, or anomalous requests immediately.')).slice(0, 115));
    const lvColors   = ['#666666','#27AE60','#8BC34A','#F39C12','#E67E22','#E74C3C'];
    // Radar/warning composite SVG — command-centre aesthetic
    const radarSvg   = `<!--[if !mso]><!-- --><svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg"><circle cx="48" cy="48" r="44" fill="none" stroke="rgba(232,76,60,0.18)" stroke-width="1"/><circle cx="48" cy="48" r="34" fill="none" stroke="rgba(232,76,60,0.3)" stroke-width="1"/><circle cx="48" cy="48" r="24" fill="none" stroke="rgba(232,76,60,0.45)" stroke-width="1.2"/><circle cx="48" cy="48" r="14" fill="rgba(232,76,60,0.16)" stroke="#E74C3C" stroke-width="1.5"/><line x1="48" y1="48" x2="78" y2="22" stroke="#E74C3C" stroke-width="2" stroke-linecap="round"/><path d="M48 22L52 32L44 32Z" fill="#E74C3C"/><circle cx="48" cy="48" r="3" fill="#E74C3C"/><path d="M30 8L66 8L60 16L66 24L30 24Z" fill="#E74C3C" opacity="0.92"/><text x="48" y="20" font-family="Arial,sans-serif" font-size="9" font-weight="bold" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">ALERT</text></svg><!--<![endif]--><!--[if mso]><table width="96" height="96" border="0" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" bgcolor="#1A1A1A" style="background:#1A1A1A;border:2px solid #E74C3C;font-family:Arial;font-size:54px;color:#E74C3C;">&#9888;</td></tr></table><![endif]-->`;
    const incCard = (iType, iTitle, iAction, lv) => {
      const barColor = lvColors[Math.min(lv || 0, 5)];
      const lvN = ['ADVISORY','LOW','MODERATE','ELEVATED','HIGH','CRITICAL'][Math.min(lv || 0, 5)];
      return `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="4" bgcolor="${barColor}" style="background-color:${barColor};">&nbsp;</td>
          <td style="padding:14px 18px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-left:none;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td valign="middle">
                <span style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:${barColor};font-weight:bold;${NLFF}">${iType}</span>
              </td>
              <td align="right" valign="middle">
                <span style="font-size:8px;padding:2px 8px;background-color:${barColor};color:#FFFFFF;letter-spacing:2px;text-transform:uppercase;font-weight:bold;${NLFF}">${lvN}</span>
              </td>
            </tr></table>
            <br>
            <span style="font-size:14px;color:#FFFFFF;line-height:1.35;font-weight:bold;${NLFF_SERIF}">${iTitle}</span><br><br>
            <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.5);font-weight:bold;${NLFF}">Required Action</span><br>
            <span style="font-size:12px;color:rgba(255,255,255,0.75);line-height:1.6;${NLFF}">${iAction}</span>
          </td>
        </tr>
      </table>`;
    };
    return `${nlOuterOpen()}${tbl()}${classificationBar(Math.max(highest, 4), `INTERNAL // INCIDENT ESCALATION // ${socRef}`)}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" style="padding:14px 24px;">
          <span style="font-size:10px;font-weight:bold;letter-spacing:6px;text-transform:uppercase;color:#0A0A0A;${NLFF}">&#9632; CRITICAL SECURITY ALERT &middot; ${dateStr} &middot; ${timeStr} &#9632;</span>
        </td>
      </tr></table>`,
      'bgcolor="#E74C3C" style="background-color:#E74C3C;padding:0;margin:0;"'
    )}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding:42px 44px 18px;">${radarSvg}</td></tr>
        <tr><td align="center" style="padding:0 36px 12px;">
          <span style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(232,76,60,0.9);font-weight:bold;${NLFF}">ESCALATION NOTICE &middot; ${socRef}</span>
        </td></tr>
        <tr><td align="center" style="padding:0 36px 20px;">
          <span style="font-size:42px;font-weight:bold;color:#FFFFFF;line-height:1.02;letter-spacing:2px;${NLFF_SERIF}">${title}</span>
        </td></tr>
        <tr><td align="center" style="padding:0 52px 14px;">
          <table width="100" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td height="2" bgcolor="#E74C3C" style="background-color:#E74C3C;height:2px;font-size:1px;">&nbsp;</td></tr></table>
        </td></tr>
        <tr><td align="center" style="padding:0 56px 32px;">
          <span style="font-size:15px;color:rgba(255,255,255,0.68);line-height:1.75;${NLFF}">${brief}</span>
        </td></tr>
      </table>`,
      'bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:0;margin:0;"'
    )}${(inc1Title || inc2Title) ? tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:4px 28px 14px;border-top:1px solid rgba(255,255,255,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle" style="padding-top:18px;"><span style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#E74C3C;font-weight:bold;${NLFF}">Active Incidents &middot; Required Action</span></td>
            <td align="right" valign="middle" style="padding-top:18px;"><span style="font-size:9px;color:rgba(255,255,255,0.32);letter-spacing:1px;${NLFF}">${timeStr}</span></td>
          </tr></table>
        </td></tr>
        ${inc1Title ? `<tr><td style="padding:0 28px 12px;">${incCard(inc1Type, inc1Title, inc1Action, art0.threatLevel)}</td></tr>` : ''}
        ${inc2Title ? `<tr><td style="padding:0 28px 18px;">${incCard(inc2Type, inc2Title, inc2Action, art1.threatLevel)}</td></tr>` : ''}
      </table>`,
      'bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:0;margin:0;"'
    ) : ''}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle" style="padding:16px 24px;">
          <span style="font-size:10px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:#0A0A0A;${NLFF}">${orgLine} &middot; SOC OPERATIONS</span>
        </td>
        <td align="right" valign="middle" style="padding:16px 24px;">
          <a href="${socAttr}" style="font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:#0A0A0A;text-decoration:none;border-bottom:2px solid #0A0A0A;${NLFF}">REPORT NOW &rarr; ${socEsc}</a>
        </td>
      </tr></table>`,
      'bgcolor="#E74C3C" style="background-color:#E74C3C;padding:0;margin:0;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }

  // ══════════════════════════════════════════════════
  //  POSTER 5: MINIMAL EXECUTIVE BREACH STATEMENT
  //  Restrained typographic authority — annual-report aesthetic
  // ══════════════════════════════════════════════════
  function buildPoster5(c, arts, wo, lk, poster, qr, illus) {
    const art0 = arts[0] || {};
    const art1 = arts[1] || {};
    const extractStat = (str) => {
      // eslint-disable-next-line security/detect-unsafe-regex -- reviewed: each (?:[,\.]\d{3})* step consumes mandatory progress (sep + 3 digits); no overlapping unbounded quantifiers, so not ReDoS-prone.
      const m = String(str || '').match(/\b(\d{1,3}(?:[,\.]\d{3})*(?:\.\d+)?%?[BMKx]?|\d{1,3}%)\b/);
      return m ? m[1] : null;
    };
    const statRaw   = extractStat(art0.summary) || extractStat(wo[0]) || extractStat(art1.summary) || extractStat(c.title) || '91%';
    const stat      = escapeHtml(statRaw);
    const sentence  = escapeHtml((art0.summary || wo[0] || 'of confirmed security incidents involve a human element. Your awareness training is the most reliable defence your organisation has.').slice(0, 130));
    const subLine   = escapeHtml((wo[1] || 'Recognise. Resist. Report. Every time.').slice(0, 80));
    const kicker    = escapeHtml(`${c.freq || 'WEEKLY'} EXECUTIVE STATEMENT`);
    const orgLine   = escapeHtml((c.org || 'Your Organisation').trim());
    const socEsc    = escapeHtml((c.soc || 'security@company.com').trim());
    const socAttr   = escAttr(`mailto:${(c.soc || '').trim()}`);
    const dateStr   = escapeHtml(fmtDate(c.issueDate || c.date || new Date().toISOString()));
    const stat2Raw  = extractStat(art1.summary) || extractStat(wo[2]) || null;
    const stat2     = stat2Raw ? escapeHtml(stat2Raw) : null;
    const stat2Line = stat2 ? escapeHtml(((art1.summary || '').replace(stat2Raw, '').trim().split('.')[0].trim() || (wo[2] || 'of attacks are preventable with proper security awareness training').trim()).slice(0, 90)) : null;
    const docNo     = 'EXEC-' + String(new Date(c.issueDate || c.date || Date.now()).getFullYear()) + '-' + String((arts.length + 7) * 13 % 1000).padStart(3, '0');
    return `${nlOuterOpen()}${tbl()}${tbc('',
      'height="4" style="height:4px;line-height:4px;font-size:1px;background:linear-gradient(90deg,#B8860B 0%,#D4A420 45%,#C09010 100%);background-color:#D4A420;"'
    )}${tbc(
      `<table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:36px 56px 8px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle"><span style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:#C09010;font-weight:bold;${NLFF}">${kicker}</span></td>
            <td align="right" valign="middle"><span style="font-size:9px;letter-spacing:2px;color:#999999;${NLFF}">${docNo}</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:4px 56px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" bgcolor="#0A0A0A" style="background-color:#0A0A0A;height:1px;font-size:1px;">&nbsp;</td></tr></table>
        </td></tr>
        <tr><td align="left" style="padding:40px 56px 4px;">
          <span style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#666666;font-weight:bold;${NLFF}">Headline Figure</span>
        </td></tr>
        <tr><td align="left" style="padding:8px 56px 0;">
          <span style="font-size:128px;font-weight:bold;color:#0A0A0A;line-height:0.95;letter-spacing:-4px;${NLFF_SERIF}">${stat}</span>
        </td></tr>
        <tr><td style="padding:6px 56px 14px;">
          <table width="100" cellpadding="0" cellspacing="0" border="0"><tr><td height="3" bgcolor="#D4A420" style="background-color:#D4A420;height:3px;font-size:1px;">&nbsp;</td></tr></table>
        </td></tr>
        <tr><td align="left" style="padding:18px 56px 6px;">
          <span style="font-size:20px;color:#0A0A0A;line-height:1.45;${NLFF_SERIF}">${sentence}</span>
        </td></tr>
        <tr><td align="left" style="padding:8px 56px 30px;">
          <span style="font-size:13px;color:#666666;font-style:italic;line-height:1.6;${NLFF_SERIF}">${subLine}</span>
        </td></tr>
        ${stat2 && stat2Line ? `
        <tr><td style="padding:0 56px 12px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" bgcolor="#EDEBE7" style="background-color:#EDEBE7;height:1px;font-size:1px;">&nbsp;</td></tr></table>
        </td></tr>
        <tr><td style="padding:18px 56px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle" width="60" align="left">
              <span style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#888888;font-weight:bold;${NLFF}">No. 2</span>
            </td>
            <td valign="middle" width="130" style="padding:0 22px;border-right:2px solid #D4A420;">
              <span style="font-size:48px;font-weight:bold;color:#C09010;line-height:1;${NLFF_SERIF}">${stat2}</span>
            </td>
            <td valign="middle" style="padding-left:22px;">
              <span style="font-size:13px;color:#444444;line-height:1.65;${NLFF}">${stat2Line}</span>
            </td>
          </tr></table>
        </td></tr>` : ''}
        <tr><td style="padding:0 56px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td height="1" bgcolor="#0A0A0A" style="background-color:#0A0A0A;height:1px;font-size:1px;">&nbsp;</td></tr>
            <tr><td style="padding-top:16px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td valign="middle"><span style="font-size:9px;color:#0A0A0A;letter-spacing:2px;text-transform:uppercase;font-weight:bold;${NLFF}">${orgLine}</span><br><span style="font-size:9px;color:#999999;letter-spacing:1px;${NLFF}">${dateStr} &middot; Executive Brief</span></td>
                <td align="right" valign="middle">
                  <table cellpadding="0" cellspacing="0" border="0"><tr>
                    <td bgcolor="#0A0A0A" style="background-color:#0A0A0A;padding:10px 22px;">
                      <a href="${socAttr}" style="font-size:10px;color:#FFFFFF;text-decoration:none;letter-spacing:3px;text-transform:uppercase;font-weight:bold;${NLFF}">REPORT &rarr; ${socEsc}</a>
                    </td>
                  </tr></table>
                </td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>
      </table>`,
      'bgcolor="#FFFFFF" style="padding:0;background-color:#FFFFFF;margin:0;"'
    )}${tbc('',
      'height="4" style="height:4px;line-height:4px;font-size:1px;background:linear-gradient(90deg,#B8860B 0%,#D4A420 45%,#C09010 100%);background-color:#D4A420;"'
    )}${stoneSpacerTr()}${trainingPackReportCta(c)}${stoneSpacerTr()}${tbc(foot(c, qr), 'style="padding:0;margin:0;"')}${tblx()}${nlOuterClose()}`;
  }

  // ══════════════════════════════════════════════════
  //  GENERATED: gen_chase_email — Chase Email (verbatim onboard)
  //  Source: templates/reference/preview_gen_chase_email.html (user-supplied standalone HTML).
  //  Original verbatim onboard has been email-safe-rewritten: divs+flex → tables,
  //  CSS variables → inline hex colors, pseudo-bullets → table-row bullets,
  //  clip-path badge → plain rectangle. The visual design is preserved.
  //  Article-slot tokens ({{ARTICLE1_TITLE/SOURCE/LINK}}, {{ARTICLE2_*}}) and
  //  the dynamic Scam Alert content remain populated at build time.
  //  Per-template ensemble logs land at templates/gen_chase_email/ensemble-logs/<session>/.
  // ══════════════════════════════════════════════════
  function buildGenChaseEmail(c, arts, wo, lk, poster, qr, illus) {
    const titleOf  = (a) => String((a && a.title)  || '').trim();
    const sourceOf = (a) => String((a && a.source) || '').trim();
    const urlOf    = (a) => String((a && a.url)    || '').trim();

    const a0 = arts && arts[0] ? arts[0] : null;
    const a1 = arts && arts[1] ? arts[1] : null;

    const titleTokens = {
      ARTICLE1_TITLE:  titleOf(a0)  || 'New Phishing Scam Impersonates IT Department – Asks Staff to "Verify" Passwords',
      ARTICLE1_SOURCE: sourceOf(a0) || 'Bleeping Computer',
      ARTICLE2_TITLE:  titleOf(a1)  || 'Employees Tricked by Fake "Missed Delivery" Text Messages – Smishing on the Rise',
      ARTICLE2_SOURCE: sourceOf(a1) || 'The Hacker News'
    };
    const linkTokens = {
      ARTICLE1_LINK: urlOf(a0) || '#',
      ARTICLE2_LINK: urlOf(a1) || '#'
    };

    // Dynamic Scam Alert content (filled by AISummarizer.aiFillChasePrecautions,
    // keyed off the user's selected articles). Each precaution maps to a
    // SPECIFIC attack type detected in the articles above (phishing, MFA
    // bypass, ransomware, smishing, BEC, deepfake, supply-chain, etc.) — not
    // a generic theme. See CHASE_ATTACK_PROFILES in js/ai_summarizer.js.
    const alertIntro   = String((c && c.nlChaseAlertIntro)   || 'Each measure below targets a specific attack covered in the articles above:').trim();
    let precautions = Array.isArray(c && c.nlChasePrecautions) ? c.nlChasePrecautions.filter(Boolean).map(String) : [];
    if (precautions.length < 3) {
      precautions = [
        'Pause before acting on any unexpected message — urgency is the single most common pressure tactic across these attacks.',
        'Verify the request through an official channel you already trust, not the one that contacted you.',
        'Report suspicious messages, calls, or transactions to IT/security immediately — early reporting limits damage.'
      ];
    }
    precautions = precautions.slice(0, 3);
    const precautionsHtml = precautions.map((p) => `              <tr>
                <td valign="top" width="18" style="width:18px; padding:4px 8px 4px 0; color:#C9A84C; font-family:Arial,Helvetica,sans-serif; font-size:18px; line-height:1.2; font-weight:700;">&#9656;</td>
                <td valign="top" style="padding:4px 0; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#cccccc; line-height:1.5;">${escapeHtml(p)}</td>
              </tr>`).join('\n');
    const alertIntroEsc   = escapeHtml(alertIntro);

    // Verbatim HTML from the user's design — only the 6 {{TOKEN}} positions
    // (2 article titles + 2 sources + 2 links) are populated from arts[0..1].
    // Bankpage1_dynamic-style footer (Key takeaways pill / Pause → Don't engage → Report
    // headline / Report-to-SOC button / Security Awareness Portal block / QR) is appended
    // inside the .email-wrap container, after the existing "We're here to help" section.
    const socEsc      = escapeHtml(String((c && c.soc) || '').trim());
    const portalTitle = escapeHtml(String((c && (c.pname || c.title)) || '').trim());
    const normalizeUrl = (typeof normalizeWebUrl === 'function') ? normalizeWebUrl : (u => String(u || '').trim());
    const portalRaw   = String((c && (c.portal || c.portalUrl)) || '').trim();
    const portalHref  = escAttr(normalizeUrl(portalRaw) || ((c && c.soc) ? ('mailto:' + String(c.soc).trim()) : '#'));

    const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Action Requested: Your Awareness Is The First Line of Defense</title>
  <!--[if mso]>
  <style type="text/css">
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic; }
  </style>
  <![endif]-->
  <style>
    /* Screen-only enhancements. Email clients that ignore <style> simply skip
       these; every visual is also inlined on the element itself. */
    @media screen {
      a.btn-link:hover { color:#E8C96A !important; border-color:#E8C96A !important; }
    }
    @media only screen and (max-width: 640px) {
      table.email-wrap { width:100% !important; }
      td.hero-pad     { padding:36px 20px 28px !important; }
      td.story-pad    { padding:20px !important; }
      td.story-icon   { width:64px !important; padding-right:14px !important; }
      td.banner-pad   { padding:18px 20px !important; }
      img.banner-logo { height:56px !important; }
      img.alert-icon-img { width:280px !important; height:158px !important; }
      img.story-icon-img { width:64px !important; height:43px !important; }
      h1.hero-headline { font-size:24px !important; line-height:1.25 !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#111111;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#111111" style="background:#111111; padding:32px 12px;">
  <tr>
    <td align="center" valign="top">

      <table role="presentation" class="email-wrap" cellpadding="0" cellspacing="0" border="0" width="640" bgcolor="#1a1a1a" style="width:640px; max-width:640px; background:#1a1a1a; border:1px solid #A07C30; border-collapse:separate; font-family:Arial,Helvetica,sans-serif; color:#FFFFFF;">

        <!-- Banner -->
        <tr>
          <td class="banner-pad" bgcolor="#0d0d0d" style="background:#0d0d0d; padding:24px 28px; border-bottom:1px solid #2a2a2a;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td valign="middle" align="left">
                  <!-- Hardcoded ABInBev logo -->
                  <img class="banner-logo" src="${assetSrc('ABI.png')}" alt="ABInBev" height="72" style="height:72px; width:auto; display:block; border:0;">
                </td>
                <td valign="middle" align="right" style="font-family:Arial,Helvetica,sans-serif; line-height:1.4;">
                  <div style="font-family:Arial,Helvetica,sans-serif; font-size:10px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:#C9A84C;">Security &amp; Compliance Awareness</div>
                  <div style="font-family:Arial,Helvetica,sans-serif; font-size:10px; font-weight:400; letter-spacing:3px; text-transform:uppercase; color:#888888;">Monthly Bulletin</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td class="hero-pad" align="center" bgcolor="#0d0d0d" style="background:#0d0d0d; padding:12px 36px 40px; border-bottom:1px solid #3a3a3a; text-align:center;">
            <img class="alert-icon-img" src="${assetSrc('4.png')}" alt="" width="440" height="248" style="width:440px; height:248px; max-width:100%; display:block; margin:0 auto 9px; border:0;">
            <h1 class="hero-headline" style="font-family:Arial,Helvetica,sans-serif; font-size:30px; font-weight:700; line-height:1.25; color:#FFFFFF; letter-spacing:0.3px; margin:0 0 16px;">Action Requested: Your Awareness Is The First Line of Defense</h1>
            <p style="font-family:Arial,Helvetica,sans-serif; font-size:15px; color:#bbbbbb; line-height:1.6; margin:0;">New threats detected. Your action is required today.</p>
          </td>
        </tr>

        <!-- Section label (Key-takeaways pill style) -->
        <tr>
          <td bgcolor="#0d0d0d" style="background:#0d0d0d; padding:22px 30px 16px; border-bottom:1px solid #3a3a3a;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="background:rgba(192,144,16,.12); border:1px solid rgba(212,164,32,.4); border-radius:20px; padding:6px 14px;">
                  <span style="font-family:Arial,Helvetica,sans-serif; font-size:10px; color:#D4A420; font-weight:700; letter-spacing:2px; text-transform:uppercase;">&#9679; How it can happen</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Article 1 (elevated card) -->
        <tr>
          <td bgcolor="#0d0d0d" style="background:#0d0d0d; padding:20px 30px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#151515" style="background:#151515; border:1px solid rgba(201,168,76,0.65); box-shadow:0 0 18px rgba(201,168,76,0.45), 0 0 40px rgba(201,168,76,0.25);">
              <tr>
                <td class="story-pad" style="padding:22px 24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td class="story-icon" valign="top" width="96" style="width:96px; padding-right:20px;">
                        <img class="story-icon-img" src="${assetSrc('mascot_mug.png')}" alt="" width="96" height="64" style="width:96px; height:64px; display:block; border:0;">
                      </td>
                      <td valign="top" style="font-family:Arial,Helvetica,sans-serif;">
                        <div style="font-family:Arial,Helvetica,sans-serif; font-size:10px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:#C9A84C; margin:0 0 10px;">Article 1</div>
                        <h2 style="font-family:Arial,Helvetica,sans-serif; font-size:17px; font-weight:700; color:#bbbbbb; line-height:1.4; margin:0 0 12px;">{{ARTICLE1_TITLE}}</h2>
                        <div style="font-family:Arial,Helvetica,sans-serif; font-size:10px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:#666666; margin:0 0 14px;">Source: {{ARTICLE1_SOURCE}}</div>
                        <a href="{{ARTICLE1_LINK}}" class="btn-link" style="font-family:Arial,Helvetica,sans-serif; font-size:13px; font-weight:700; color:#C9A84C; text-decoration:none; letter-spacing:1.5px; text-transform:uppercase; border-bottom:1.5px solid #A07C30; padding-bottom:3px; display:inline-block;">Read article &rarr;</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Article 2 (elevated card) -->
        <tr>
          <td bgcolor="#0d0d0d" style="background:#0d0d0d; padding:36px 30px 24px; border-bottom:1px solid #3a3a3a;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#151515" style="background:#151515; border:1px solid rgba(201,168,76,0.65); box-shadow:0 0 18px rgba(201,168,76,0.45), 0 0 40px rgba(201,168,76,0.25);">
              <tr>
                <td class="story-pad" style="padding:22px 24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td class="story-icon" valign="top" width="96" style="width:96px; padding-right:20px;">
                        <img class="story-icon-img" src="${assetSrc('mascot_mug.png')}" alt="" width="96" height="64" style="width:96px; height:64px; display:block; border:0;">
                      </td>
                      <td valign="top" style="font-family:Arial,Helvetica,sans-serif;">
                        <div style="font-family:Arial,Helvetica,sans-serif; font-size:10px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:#C9A84C; margin:0 0 10px;">Article 2</div>
                        <h2 style="font-family:Arial,Helvetica,sans-serif; font-size:17px; font-weight:700; color:#bbbbbb; line-height:1.4; margin:0 0 12px;">{{ARTICLE2_TITLE}}</h2>
                        <div style="font-family:Arial,Helvetica,sans-serif; font-size:10px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:#666666; margin:0 0 14px;">Source: {{ARTICLE2_SOURCE}}</div>
                        <a href="{{ARTICLE2_LINK}}" class="btn-link" style="font-family:Arial,Helvetica,sans-serif; font-size:13px; font-weight:700; color:#C9A84C; text-decoration:none; letter-spacing:1.5px; text-transform:uppercase; border-bottom:1.5px solid #A07C30; padding-bottom:3px; display:inline-block;">Read article &rarr;</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Gold divider -->
        <tr>
          <td bgcolor="#A07C30" style="background:#A07C30; height:1px; line-height:1px; font-size:1px;">&nbsp;</td>
        </tr>

        <!-- Scam Alert (heading + 3 precautionary measures generated from the
             user's selected articles by App.AISummarizer.aiFillChasePrecautions) -->
        <tr>
          <td bgcolor="#0d0d0d" style="background:#0d0d0d; padding:30px; border-bottom:1px solid #3a3a3a; font-family:Arial,Helvetica,sans-serif;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 14px;">
              <tr>
                <td style="background:rgba(192,144,16,.12); border:1px solid rgba(212,164,32,.4); border-radius:20px; padding:6px 14px;">
                  <span style="font-family:Arial,Helvetica,sans-serif; font-size:10px; color:#D4A420; font-weight:700; letter-spacing:2px; text-transform:uppercase;">&#9679; Precautionary Measures</span>
                </td>
              </tr>
            </table>
            <p style="font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#aaaaaa; line-height:1.6; margin:0 0 14px;">${alertIntroEsc}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
${precautionsHtml}
            </table>
          </td>
        </tr>

        <!-- ───── Bankpage1_dynamic-style footer (appended) ───── -->
        <tr>
          <td style="padding:0;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" bgcolor="#0A0A0A" style="background:#0A0A0A; font-family:Arial,Helvetica,sans-serif;">
    <tr>
      <td style="background:#0A0A0A; padding:0 36px;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
          <tr><td style="background:#C09010; height:1px; line-height:1px; font-size:1px;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0; background:#0A0A0A;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="background:#0A0A0A; padding:28px 36px 28px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 16px;">
                <tr>
                  <td style="background:rgba(192,144,16,.12); border:1px solid rgba(212,164,32,.4); border-radius:20px; padding:6px 14px;">
                    <span style="font-size:10px; color:#D4A420; font-weight:700; letter-spacing:2px; text-transform:uppercase;">● Key takeaways</span>
                  </td>
                </tr>
              </table>
              <div style="font-family:Arial,Helvetica,sans-serif; font-size:32px; line-height:1.1; color:#FFFFFF; font-weight:700; text-align:center; margin:22px 0 32px;">
                Pause <span style="color:#D4A420;">&rarr;</span> Don't engage <span style="color:#D4A420;">&rarr;</span> Report
              </div>
              <p style="margin:0 0 22px; font-size:13px; color:rgba(255,255,255,.65); line-height:1.6;">
                Forward suspicious emails to the security team. Every report helps protect the entire organisation and enables the SOC to act faster.
              </p>
              <table align="center" role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="background:#D4A420; border-radius:6px; text-align:center;">
                    <div style="display:block; padding:13px 22px; color:#0A0A0A; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:700; line-height:1.3; text-align:center; cursor:default;">
                      Report to SOC&nbsp;Now &rarr; <span style="font-family:Arial,Helvetica,sans-serif; font-weight:700; font-size:15px;">${socEsc}</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background:#0A0A0A; padding:0 36px;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
          <tr><td style="background:#C09010; height:1px; line-height:1px; font-size:1px;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background:#0A0A0A; padding:28px 36px 22px;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td valign="top">
              <p style="margin:0 0 14px; font-family:Arial,Helvetica,sans-serif; font-size:20px; color:#D4A420; font-weight:700;">${portalTitle}</p>
              <p style="margin:0 0 22px; font-size:14px; color:rgba(255,255,255,.55); line-height:1.5;">Training modules, policies, and past bulletins.</p>
              <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="border:1px solid rgba(212,164,32,.5); border-radius:4px;">
                    <a href="${portalHref}" style="display:inline-block; padding:10px 22px; font-size:14px; color:#D4A420; text-decoration:none; font-weight:500;">Visit Portal</a>
                  </td>
                </tr>
              </table>
            </td>
            <td width="160" valign="top" align="center" style="padding-left:16px;">
              <table cellpadding="0" cellspacing="0" border="0" style="border:2px solid #C09010;background-color:#FFFFFF;" bgcolor="#FFFFFF">
                <tr><td style="padding:4px;" id="nl-qr" data-qr-size="90"></td></tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center" style="padding-top:6px;font-size:9px;color:rgba(255,255,255,.55);letter-spacing:0.08em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Scan for Portal</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background:#C09010; height:5px; line-height:5px; font-size:1px;">&nbsp;</td>
    </tr>
            </table>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>`;

    let HTML = HTML_TEMPLATE;
    for (const k of Object.keys(titleTokens)) {
      HTML = HTML.split('{{' + k + '}}').join(escapeHtml(titleTokens[k]));
    }
    for (const k of Object.keys(linkTokens)) {
      HTML = HTML.split('{{' + k + '}}').join(escAttr(linkTokens[k]));
    }
    return HTML;
  }

  // ══════════════════════════════════════════════════
  //  GENERATED: gen_cybershield — CyberShield Bulletin
  //  Source: templates/reference/preview_gen_cybershield.html (user-supplied standalone HTML).
  //  Dynamic slots:
  //    - Two article cards → {{ARTICLE1_*}} / {{ARTICLE2_*}} from arts[0..1]
  //      (title + source + link), identical to gen_chase_email.
  //    - "Why it matters" intro → {{IMPACT_SUMMARY}}, filled by
  //      AISummarizer.fillNewsletterTextSlots('gen_cybershield', ...) (AI when
  //      available, local fallback otherwise) via c.nlCybershieldImpact.
  //    - "What's the threat?" overview → c.nlCybershieldThreat (article-derived).
  //    - "Recognizing Security Threats" → c.nlCybershieldRedFlags (4 indicators,
  //      article-derived, padded to 4). Both from the same fillNewsletterTextSlots
  //      call. The three stat tiles stay static.
  //  Two image placeholders (YOUR_IMAGE_1.jpg, YOUR_IMAGE_2.jpg) are left for
  //  the user to swap with real assets.
  //  Per-template ensemble logs land at templates/gen_cybershield/ensemble-logs/<session>/.
  // ══════════════════════════════════════════════════
  function buildGenCybershield(c, arts, wo, lk, poster, qr, illus) {
    // Footer-block bindings — same shape as buildGenChaseEmail so the
    // shared "Pause → Don't engage → Report" block can substitute them.
    const socEsc      = escapeHtml(String((c && c.soc) || '').trim());
    const portalTitle = escapeHtml(String((c && (c.pname || c.title)) || '').trim());
    const normalizeUrl = (typeof normalizeWebUrl === 'function') ? normalizeWebUrl : (u => String(u || '').trim());
    const portalRaw   = String((c && (c.portal || c.portalUrl)) || '').trim();
    const portalHref  = escAttr(normalizeUrl(portalRaw) || ((c && c.soc) ? ('mailto:' + String(c.soc).trim()) : '#'));

    // Article slot tokens — pulled directly from the user's selected articles.
    const titleOf  = (a) => String((a && a.title)  || '').trim();
    const sourceOf = (a) => String((a && a.source) || '').trim();
    const urlOf    = (a) => String((a && a.url)    || '').trim();
    const a0 = arts && arts[0] ? arts[0] : null;
    const a1 = arts && arts[1] ? arts[1] : null;
    const DEFAULT_IMPACT = 'A single compromised credential can give attackers access to entire systems. The damage goes beyond data — it affects trust, operations, and finances.';
    const titleTokens = {
      ARTICLE1_TITLE:  titleOf(a0)  || 'New Phishing Scam Impersonates IT Department – Asks Staff to "Verify" Passwords',
      ARTICLE1_SOURCE: sourceOf(a0) || 'Bleeping Computer',
      ARTICLE2_TITLE:  titleOf(a1)  || 'Employees Tricked by Fake "Missed Delivery" Text Messages – Smishing on the Rise',
      ARTICLE2_SOURCE: sourceOf(a1) || 'The Hacker News',
      IMPACT_SUMMARY:  String((c && c.nlCybershieldImpact) || '').trim() || DEFAULT_IMPACT
    };
    const linkTokens = {
      ARTICLE1_LINK: urlOf(a0) || '#',
      ARTICLE2_LINK: urlOf(a1) || '#'
    };

    // Article published date (under the source line, like bankpage1_dynamic).
    // Rendered only when the article carries a valid date — no empty gap otherwise.
    const pubOf = (a) => (a && typeof fmtArticlePub === 'function') ? (fmtArticlePub(a) || '') : '';
    const dateLineHtml = (d) => d
      ? `<div style="font-family:Arial,Helvetica,sans-serif; font-size:9px; font-weight:700; letter-spacing:0.5px; color:rgba(255,255,255,0.3); margin:0 0 10px;">${escapeHtml(d)}</div>`
      : '';
    const article1DateHtml = dateLineHtml(pubOf(a0));
    const article2DateHtml = dateLineHtml(pubOf(a1));

    // "What's the threat?" overview + "Recognizing Security Threats" list — both
    // article-derived (filled by AISummarizer.fillNewsletterTextSlots, AI when
    // available, local fallback otherwise). The list always renders exactly 4
    // numbered indicators, padded with the evergreen defaults below.
    const CYBERSHIELD_THREAT_DEFAULT = 'Cybercriminals are increasingly targeting employees through spear phishing, social engineering, and credential theft. These attacks are highly personalised and designed to bypass standard security filters.';
    const CYBERSHIELD_REDFLAG_DEFAULTS = [
      "Sender address doesn't match the company domain — look closely at spelling.",
      'Urgent language pressuring you to act immediately or risk consequences.',
      'Unexpected attachments or links asking for login credentials.',
      'Mismatched URLs — hover before you click to see the real destination.'
    ];
    const threatSummary = String((c && c.nlCybershieldThreat) || '').trim() || CYBERSHIELD_THREAT_DEFAULT;
    const redFlags = (typeof pickUniqueSlotLines === 'function')
      ? pickUniqueSlotLines(Array.isArray(c && c.nlCybershieldRedFlags) ? c.nlCybershieldRedFlags : [], CYBERSHIELD_REDFLAG_DEFAULTS, 4)
      : CYBERSHIELD_REDFLAG_DEFAULTS.slice(0, 4);
    const redFlagsRowsHtml = redFlags.map((t, i) => {
      const n = String(i + 1).padStart(2, '0');
      const last = i === redFlags.length - 1;
      return `              <tr>
                <td valign="top" width="34" style="width:34px; padding:0 12px ${last ? '0' : '10px'} 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="22"><tr>
                    <td bgcolor="#D4AF37" align="center" valign="middle" width="22" height="22" style="background:#D4AF37; color:#000000; font-family:Arial,Helvetica,sans-serif; font-size:10px; font-weight:900; line-height:22px;">${n}</td>
                  </tr></table>
                </td>
                <td valign="top" style="padding:0 0 ${last ? '0' : '10px'}; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#bbbbbb; line-height:1.6;">
                  ${escapeHtml(t)}
                </td>
              </tr>`;
    }).join('\n');

    const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phishing Maestro &middot; Security Awareness Newsletter</title>
  <!--[if mso]>
  <style type="text/css">
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic; }
  </style>
  <![endif]-->
  <style>
    /* Screen-only enhancements. Email clients that ignore <style> simply skip
       these; every visual is also inlined on the element itself. */
    @media only screen and (max-width: 640px) {
      table.email-wrap    { width:100% !important; }
      td.banner-pad       { padding:18px 20px !important; }
      img.banner-logo     { height:56px !important; }
      td.hero-cell-text   { display:block !important; width:100% !important; padding:0 0 16px !important; }
      td.hero-cell-image  { display:block !important; width:100% !important; padding:0 !important; }
      img.hero-shield     { width:100% !important; height:auto !important; max-width:320px !important; }
      td.article-cell     { display:block !important; width:100% !important; padding:0 0 12px !important; }
      td.stat-cell        { display:block !important; width:100% !important; padding:0 0 10px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#0a0a0a;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#0a0a0a" style="background:#0a0a0a;">
  <tr>
    <td align="center" valign="top" style="padding:30px 12px;">

      <table role="presentation" class="email-wrap" cellpadding="0" cellspacing="0" border="0" width="640" bgcolor="#0f0f0f" style="width:640px; max-width:640px; background:#0f0f0f; border-collapse:separate; font-family:Arial,Helvetica,sans-serif; color:#ffffff;">

        <!-- ───── HEADER ───── -->
        <tr>
          <td class="banner-pad" bgcolor="#0d0d0d" style="background:#0d0d0d; padding:24px 28px; border-bottom:1px solid #2a2a2a;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td valign="middle" align="left">
                  <!-- Hardcoded ABInBev logo -->
                  <img class="banner-logo" src="${assetSrc('ABI.png')}" alt="ABInBev" height="72" style="height:72px; width:auto; display:block; border:0;">
                </td>
                <td valign="middle" align="right" style="font-family:Arial,Helvetica,sans-serif; line-height:1.4;">
                  <div style="font-family:Arial,Helvetica,sans-serif; font-size:10px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:#C9A84C;">Security &amp; Compliance Awareness</div>
                  <div style="font-family:Arial,Helvetica,sans-serif; font-size:10px; font-weight:400; letter-spacing:3px; text-transform:uppercase; color:#888888;">Monthly Bulletin</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ───── HERO ───── -->
        <tr>
          <td bgcolor="#0f0f0f" style="background:#0f0f0f; padding:28px 32px 24px; border-bottom:1px solid #1e1e1e;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td class="hero-cell-text" valign="middle" align="left" style="padding-right:18px;">
                  <div style="display:inline-block; font-family:Arial,Helvetica,sans-serif; font-size:10px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#000000; background:#D4AF37; padding:3px 10px; margin-bottom:10px;">
                    &#9888; Threat Alert
                  </div>
                  <h1 style="font-family:Arial,Helvetica,sans-serif; font-size:30px; font-weight:900; line-height:1.1; color:#ffffff; text-transform:uppercase; margin:0;">
                    Stay Safe<br>From <span style="color:#D4AF37;">Rising</span><br>Cyber Threats
                  </h1>
                </td>
                <td class="hero-cell-image" valign="middle" align="right" width="200" style="width:200px;">
                  <img class="hero-shield" src="${assetSrc('mascot_mug.png')}" alt="Security Awareness Mascot" width="200" height="133" style="width:200px; height:133px; display:block; border:0; margin-left:auto;">
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ───── WHAT'S THE THREAT ───── -->
        <tr>
          <td bgcolor="#0f0f0f" style="background:#0f0f0f; padding:24px 32px 12px; border-top:1px solid #1e1e1e;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 12px;">
              <tr>
                <td style="background:rgba(212,175,55,.12); border:1px solid rgba(212,175,55,.4); border-radius:20px; padding:6px 14px;">
                  <span style="font-family:Arial,Helvetica,sans-serif; font-size:10px; color:#D4AF37; font-weight:700; letter-spacing:2px; text-transform:uppercase;">&#9679; What's the threat?</span>
                </td>
              </tr>
            </table>
            <p style="font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.75; color:#bbbbbb; margin:0;">
              ${escapeHtml(threatSummary)}
            </p>
          </td>
        </tr>

        <!-- ───── WHY IT MATTERS ───── -->
        <tr>
          <td bgcolor="#0f0f0f" style="background:#0f0f0f; padding:12px 32px 24px; border-top:1px solid #1e1e1e;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 12px;">
              <tr>
                <td style="background:rgba(212,175,55,.12); border:1px solid rgba(212,175,55,.4); border-radius:20px; padding:6px 14px;">
                  <span style="font-family:Arial,Helvetica,sans-serif; font-size:10px; color:#D4AF37; font-weight:700; letter-spacing:2px; text-transform:uppercase;">&#9679; Why it matters</span>
                </td>
              </tr>
            </table>
            <p style="font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.75; color:#bbbbbb; margin:0;">
              {{IMPACT_SUMMARY}}
            </p>
          </td>
        </tr>

        <!-- ───── BY THE NUMBERS — stat tiles in their own section so they stand out ───── -->
        <tr>
          <td bgcolor="#0f0f0f" style="background:#0f0f0f; padding:28px 32px; border-top:1px solid #1e1e1e;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td class="stat-cell" valign="top" width="33%" style="width:33%; padding-right:6px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#1a1a1a" style="background:#1a1a1a; border:1px solid #2a2a2a; border-top:2px solid #D4AF37;">
                    <tr><td align="center" style="padding:18px 12px;">
                      <div style="font-family:Arial,Helvetica,sans-serif; font-size:26px; font-weight:900; color:#D4AF37; line-height:1; margin:0 0 4px;">91%</div>
                      <div style="font-family:Arial,Helvetica,sans-serif; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:rgba(255,255,255,0.4); line-height:1.4;">Of breaches start with phishing</div>
                    </td></tr>
                  </table>
                </td>
                <td class="stat-cell" valign="top" width="34%" style="width:34%; padding:0 6px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#1a1a1a" style="background:#1a1a1a; border:1px solid #2a2a2a; border-top:2px solid #D4AF37;">
                    <tr><td align="center" style="padding:18px 12px;">
                      <div style="font-family:Arial,Helvetica,sans-serif; font-size:26px; font-weight:900; color:#D4AF37; line-height:1; margin:0 0 4px;">$4.9M</div>
                      <div style="font-family:Arial,Helvetica,sans-serif; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:rgba(255,255,255,0.4); line-height:1.4;">Average cost of a data breach</div>
                    </td></tr>
                  </table>
                </td>
                <td class="stat-cell" valign="top" width="33%" style="width:33%; padding-left:6px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#1a1a1a" style="background:#1a1a1a; border:1px solid #2a2a2a; border-top:2px solid #D4AF37;">
                    <tr><td align="center" style="padding:18px 12px;">
                      <div style="font-family:Arial,Helvetica,sans-serif; font-size:26px; font-weight:900; color:#D4AF37; line-height:1; margin:0 0 4px;">3.4B</div>
                      <div style="font-family:Arial,Helvetica,sans-serif; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:rgba(255,255,255,0.4); line-height:1.4;">Phishing emails sent daily</div>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ───── HOW TO SPOT A PHISHING EMAIL ───── -->
        <tr>
          <td bgcolor="#0f0f0f" style="background:#0f0f0f; padding:24px 32px; border-top:1px solid #1e1e1e;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 12px;">
              <tr>
                <td style="background:rgba(212,175,55,.12); border:1px solid rgba(212,175,55,.4); border-radius:20px; padding:6px 14px;">
                  <span style="font-family:Arial,Helvetica,sans-serif; font-size:10px; color:#D4AF37; font-weight:700; letter-spacing:2px; text-transform:uppercase;">&#9679; Recognizing Security Threats</span>
                </td>
              </tr>
            </table>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
${redFlagsRowsHtml}
            </table>
          </td>
        </tr>

        <!-- ───── NEWS ARTICLE CARDS ───── -->
        <tr>
          <td bgcolor="#0a0a0a" style="background:#0a0a0a; padding:24px 32px; border-top:1px solid #1e1e1e;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
              <tr>
                <td style="background:rgba(212,175,55,.12); border:1px solid rgba(212,175,55,.4); border-radius:20px; padding:6px 14px;">
                  <span style="font-family:Arial,Helvetica,sans-serif; font-size:10px; color:#D4AF37; font-weight:700; letter-spacing:2px; text-transform:uppercase;">&#9679; Global Insights: What's Happening Out There</span>
                </td>
              </tr>
            </table>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td class="article-cell" valign="top" width="50%" style="width:50%; padding-right:6px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" height="100%" bgcolor="#1a1500" style="height:100%; background:#1a1500; border:1px solid rgba(212,175,55,0.25); border-top:2px solid #D4AF37;">
                    <tr><td valign="top" style="padding:16px;">
                      <div style="font-family:Arial,Helvetica,sans-serif; font-size:9px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#D4AF37; margin:0 0 10px;">Article 1</div>
                      <div style="font-family:Arial,Helvetica,sans-serif; font-size:13px; font-weight:700; color:#ffffff; line-height:1.45; height:57px; max-height:57px; overflow:hidden; margin:0 0 10px;">{{ARTICLE1_TITLE}}</div>
                      <div style="font-family:Arial,Helvetica,sans-serif; font-size:9px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,255,255,0.3); margin:0 0 10px;">Source: {{ARTICLE1_SOURCE}}</div>
                      ${article1DateHtml}
                      <a href="{{ARTICLE1_LINK}}" style="font-family:Arial,Helvetica,sans-serif; font-size:12px; font-weight:700; color:#D4AF37; text-decoration:none;">Read article &rarr;</a>
                    </td></tr>
                  </table>
                </td>
                <td class="article-cell" valign="top" width="50%" style="width:50%; padding-left:6px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" height="100%" bgcolor="#1a1500" style="height:100%; background:#1a1500; border:1px solid rgba(212,175,55,0.25); border-top:2px solid #D4AF37;">
                    <tr><td valign="top" style="padding:16px;">
                      <div style="font-family:Arial,Helvetica,sans-serif; font-size:9px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#D4AF37; margin:0 0 10px;">Article 2</div>
                      <div style="font-family:Arial,Helvetica,sans-serif; font-size:13px; font-weight:700; color:#ffffff; line-height:1.45; height:57px; max-height:57px; overflow:hidden; margin:0 0 10px;">{{ARTICLE2_TITLE}}</div>
                      <div style="font-family:Arial,Helvetica,sans-serif; font-size:9px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,255,255,0.3); margin:0 0 10px;">Source: {{ARTICLE2_SOURCE}}</div>
                      ${article2DateHtml}
                      <a href="{{ARTICLE2_LINK}}" style="font-family:Arial,Helvetica,sans-serif; font-size:12px; font-weight:700; color:#D4AF37; text-decoration:none;">Read article &rarr;</a>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ───── FOOTER: Key takeaways / SOC button / Portal + QR ───── -->
        <tr>
          <td style="padding:0;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" bgcolor="#0A0A0A" style="background:#0A0A0A; font-family:Arial,Helvetica,sans-serif;">
    <tr>
      <td style="background:#0A0A0A; padding:0 36px;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
          <tr><td style="background:#C09010; height:1px; line-height:1px; font-size:1px;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0; background:#0A0A0A;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="background:#0A0A0A; padding:28px 36px 28px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 16px;">
                <tr>
                  <td style="background:rgba(192,144,16,.12); border:1px solid rgba(212,164,32,.4); border-radius:20px; padding:6px 14px;">
                    <span style="font-size:10px; color:#D4A420; font-weight:700; letter-spacing:2px; text-transform:uppercase;">● Key takeaways</span>
                  </td>
                </tr>
              </table>
              <div style="font-family:Arial,Helvetica,sans-serif; font-size:32px; line-height:1.1; color:#FFFFFF; font-weight:700; text-align:center; margin:22px 0 32px;">
                Pause <span style="color:#D4A420;">&rarr;</span> Don't engage <span style="color:#D4A420;">&rarr;</span> Report
              </div>
              <p style="margin:0 0 22px; font-size:13px; color:rgba(255,255,255,.65); line-height:1.6;">
                Forward suspicious emails to the security team. Every report helps protect the entire organisation and enables the SOC to act faster.
              </p>
              <table align="center" role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="background:#D4A420; border-radius:6px; text-align:center;">
                    <div style="display:block; padding:13px 22px; color:#0A0A0A; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:700; line-height:1.3; text-align:center; cursor:default;">
                      Report to SOC&nbsp;Now &rarr; <span style="font-family:Arial,Helvetica,sans-serif; font-weight:700; font-size:15px;">${socEsc}</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background:#0A0A0A; padding:0 36px;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
          <tr><td style="background:#C09010; height:1px; line-height:1px; font-size:1px;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background:#0A0A0A; padding:28px 36px 22px;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td valign="top">
              <p style="margin:0 0 14px; font-family:Arial,Helvetica,sans-serif; font-size:20px; color:#D4A420; font-weight:700;">${portalTitle}</p>
              <p style="margin:0 0 22px; font-size:14px; color:rgba(255,255,255,.55); line-height:1.5;">Training modules, policies, and past bulletins.</p>
              <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="border:1px solid rgba(212,164,32,.5); border-radius:4px;">
                    <a href="${portalHref}" style="display:inline-block; padding:10px 22px; font-size:14px; color:#D4A420; text-decoration:none; font-weight:500;">Visit Portal</a>
                  </td>
                </tr>
              </table>
            </td>
            <td width="160" valign="top" align="center" style="padding-left:16px;">
              <table cellpadding="0" cellspacing="0" border="0" style="border:2px solid #C09010;background-color:#FFFFFF;" bgcolor="#FFFFFF">
                <tr><td style="padding:4px;" id="nl-qr" data-qr-size="90"></td></tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center" style="padding-top:6px;font-size:9px;color:rgba(255,255,255,.55);letter-spacing:0.08em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Scan for Portal</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background:#C09010; height:5px; line-height:5px; font-size:1px;">&nbsp;</td>
    </tr>
            </table>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>`;

    let HTML = HTML_TEMPLATE;
    for (const k of Object.keys(titleTokens)) {
      HTML = HTML.split('{{' + k + '}}').join(escapeHtml(titleTokens[k]));
    }
    for (const k of Object.keys(linkTokens)) {
      HTML = HTML.split('{{' + k + '}}').join(escAttr(linkTokens[k]));
    }
    return HTML;
  }

  NB.registerTemplate('poster',       buildCorporateAlert);
  NB.registerTemplate('people',       buildPeopleTalking);
  NB.registerTemplate('knowbe4',      buildKnowBe4Style);
  NB.registerTemplate('infographic',  buildSpotThePhish);
  NB.registerTemplate('quicktips',    buildQuickRules);
  NB.registerTemplate('redflags',     buildRedFlags);
  NB.registerTemplate('stoplook',     buildStopLookReport);
  NB.registerTemplate('emaildissect', buildEmailAnatomy);
  NB.registerTemplate('dodont',       buildDoVsDont);
  NB.registerTemplate('spotlight',    buildThreatSpotlight);
  NB.registerTemplate('timeline',     buildIncidentTimeline);
  NB.registerTemplate('scorecard',    buildAwarenessScorecard);
  NB.registerTemplate('cybertimes',   buildCyberSecurityTimes);
  NB.registerTemplate('newspaper',    buildCyberSecurityTimes);
  NB.registerTemplate('testbrief',    buildTestTemplate);
  NB.registerTemplate('poster1',      buildPoster1);
  NB.registerTemplate('poster2',      buildPoster2);
  NB.registerTemplate('poster3',      buildPoster3);
  NB.registerTemplate('poster4',      buildPoster4);
  NB.registerTemplate('poster5',      buildPoster5);
  NB.registerTemplate('gen_chase_email', buildGenChaseEmail);
  NB.registerTemplate('gen_cybershield', buildGenCybershield);
})();
