const { test, expect } = require("@playwright/test");

// bankpage1_dynamic renders the two "Global insights" article cards. Each card
// must show the article's published date directly under its Source line.
test.describe("bankpage1_dynamic article cards", () => {
  test("render the article published date under the source", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    const built = await page.evaluate(() => {
      const NB = window.App.NewsletterBuilder;
      return NB.build("bankpage1_dynamic", { org: "ACME", soc: "soc@acme.test", freq: "Weekly", portal: "https://p", pname: "P" }, [
        { type: "Phishing", title: "QR phish targets payroll", summary: "Staff duped by fake login.", source: "Palo Alto Unit 42", url: "https://x.com/s", pubDate: "2026-05-23", threatLevel: 3 },
        { type: "Malware",  title: "Go ransomware self-propagates", summary: "Compromised dependency.", source: "Microsoft Security", url: "https://y.com/s", pubDate: "2026-05-22", threatLevel: 4 }
      ], { useLinks: false, usePoster: false, useQR: false, useIllus: false });
    });
    expect(built).toContain('data-template-id="bankpage1_dynamic"');
    // Sources still present.
    expect(built).toContain("Palo Alto Unit 42");
    expect(built).toContain("Microsoft Security");
    // Published dates, formatted via fmtDate ("23 May 2026" / "22 May 2026").
    expect(built).toContain("23 May 2026");
    expect(built).toContain("22 May 2026");
    // Date must sit AFTER its source line in card 1.
    const card1Source = built.indexOf("Palo Alto Unit 42");
    const card1Date = built.indexOf("23 May 2026");
    expect(card1Source).toBeGreaterThan(-1);
    expect(card1Date).toBeGreaterThan(card1Source);
  });

  test("omit the date line gracefully when an article has no pubDate", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    const built = await page.evaluate(() => {
      const NB = window.App.NewsletterBuilder;
      return NB.build("bankpage1_dynamic", { org: "ACME", soc: "soc@acme.test" }, [
        { type: "Phishing", title: "Undated story", summary: "x.", source: "Source A", url: "https://x.com/s" }
      ], { useLinks: false, usePoster: false, useQR: false, useIllus: false });
    });
    // Builds without throwing and without a stray "Invalid Date".
    expect(built).toContain('data-template-id="bankpage1_dynamic"');
    expect(built).not.toContain("Invalid Date");
  });

  // Outlook (Word engine) repaints EVERY descendant of a block <a> with the
  // anchor's own colour and ignores inner <font color>/inline colours. So a
  // single card-wide anchor (colour #FFFFFF) turned the grey source/date and the
  // gold "Read article" white. The Outlook-safe model: control colour at the
  // anchor level — heading is its own white link, the non-link source/date sit
  // OUTSIDE any anchor (so they keep their grey), and "Read article" is its own
  // gold link. The eyebrow pill also stays outside any <a> (Word mis-sizes it).
  test("cards are Outlook-safe: source/date outside the link, read-article its own gold link", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      const html = window.App.NewsletterBuilder.build("bankpage1_dynamic", { org: "ACME", soc: "soc@acme.test" }, [
        { type: "Phishing", title: "Card one", summary: "x.", source: "Source A", url: "https://card1.example/s", pubDate: "2026-05-23" },
        { type: "Malware",  title: "Card two", summary: "y.", source: "Source B", url: "https://card2.example/s", pubDate: "2026-05-22" }
      ], { useLinks: false, usePoster: false, useQR: false, useIllus: false });
      document.body.innerHTML = html;
    });
    // 1) The card still links to the article (heading + read-article both link to it).
    const cardLink = page.locator('a[href="https://card1.example/s"]');
    await expect(cardLink).toHaveCount(2);
    // 2) The "Article 1" eyebrow pill must NOT be inside any <a> (else Word mis-sizes it).
    const pillInsideAnchor = await page.evaluate(() => {
      const span = Array.from(document.querySelectorAll('span')).find(s => /Article\s*1/.test(s.textContent || ''));
      return !!(span && span.closest('a'));
    });
    expect(pillInsideAnchor).toBe(false);
    // 3) The heading IS its own white link.
    const heading = await page.evaluate(() => {
      const a = Array.from(document.querySelectorAll('a')).find(n => (n.textContent || '').trim() === 'Card one');
      if (!a) return null;
      return {
        href: a.getAttribute('href'),
        colour: ((a.getAttribute('style') || '').match(/color:\s*(#[0-9a-f]{3,6})/i) || [])[1] || ''
      };
    });
    expect(heading).not.toBeNull();
    expect(heading.href).toBe('https://card1.example/s');
    expect(heading.colour.toUpperCase()).toBe('#FFFFFF');
    // 4) Source + date must NOT be inside any <a> — otherwise Outlook repaints
    //    them with the anchor colour and the grey is lost.
    const sourceInsideAnchor = await page.evaluate(() => {
      const d = Array.from(document.querySelectorAll('div')).find(n => /Source:\s*Source A/.test((n.textContent || '').replace(/ /g, ' ')));
      return !!(d && d.closest('a'));
    });
    expect(sourceInsideAnchor).toBe(false);
    const dateInsideAnchor = await page.evaluate(() => {
      const d = Array.from(document.querySelectorAll('div')).find(n => (n.textContent || '').trim() === '23 May 2026');
      return !!(d && d.closest('a'));
    });
    expect(dateInsideAnchor).toBe(false);
    // 5) "Read article" is its OWN anchor coloured gold (anchor colour drives
    //    Outlook), and forces the same colour via <font> for good measure.
    const readArticle = await page.evaluate(() => {
      const a = Array.from(document.querySelectorAll('a')).find(n => /Read article/.test(n.textContent || ''));
      if (!a) return null;
      const font = a.querySelector('font[color]');
      return {
        href: a.getAttribute('href'),
        anchorColour: ((a.getAttribute('style') || '').match(/color:\s*(#[0-9a-f]{3,6})/i) || [])[1] || '',
        fontColour: font ? (font.getAttribute('color') || '') : ''
      };
    });
    expect(readArticle).not.toBeNull();
    expect(readArticle.href).toBe('https://card1.example/s');
    expect(readArticle.anchorColour.toUpperCase()).toBe('#D4A420');
    expect(readArticle.fontColour.toUpperCase()).toBe('#D4A420');
  });

  // enforceEmailFont must stamp Arial on every text element so Outlook doesn't
  // fall back to Times. Verified end-to-end through the email-safe transforms.
  test("email-safe transform gives every text element a font-family (Arial)", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    const offenders = await page.evaluate(() => {
      const raw = window.App.NewsletterBuilder.build("bankpage1_dynamic", { org: "ACME", soc: "soc@acme.test" }, [
        { type: "Phishing", title: "A", summary: "x.", source: "S", url: "https://x/s", pubDate: "2026-05-23" }
      ], { useLinks: false, usePoster: false, useQR: false, useIllus: false });
      const safe = window.App.Utils.enforceEmailFont(window.App.Utils.flattenEmailColors(raw));
      const doc = new DOMParser().parseFromString(safe, "text/html");
      // Any text element carrying a font-size but no font-family would render serif in Outlook.
      return Array.from(doc.querySelectorAll('div,p,span,td,th,h1,h2,h3,h4,h5,h6,li,a'))
        .filter(el => {
          const s = el.getAttribute('style') || '';
          return /font-size\s*:/i.test(s) && !/font-family\s*:/i.test(s);
        }).length;
    });
    expect(offenders).toBe(0);
  });
});
