const { test, expect } = require("@playwright/test");
const { fixtureArticles } = require("../fixtures/articles");

async function clearBrowserState(page) {
  await page.goto("/index.html", { waitUntil: "domcontentloaded" });
  await page.locator("#fetch-st").waitFor({ state: "attached" });
  await page.locator("#articles-area .a-card, #articles-area .empty-st").first().waitFor({ state: "visible" });
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await window.App.DB.clearAll();
  });
}

async function stubFeedFetch(page, articles = fixtureArticles) {
  await page.evaluate((items) => {
    window.App.RSSFetcher.fetchAllFeeds = async (_a, _b, onProgress) => {
      onProgress?.({ done: 1, total: 1, feedName: "Fixture Feed", ok: true, count: items.length, rawCount: items.length, elapsedMs: 5, newArticles: items });
      return { articles: items, stats: { fixture: { name: "Fixture Feed", count: items.length, rawCount: items.length, ok: true, via: "fixture", elapsedMs: 5, urlUsed: "x", finishedAt: new Date().toISOString() } }, telemetry: { totalElapsedMs: 5, feedCount: 1, successCount: 1 } };
    };
  }, articles);
}

// Hard-coded list mirrors js/newsletter_builder.js READY_TEMPLATE_IDS — kept
// inline so a future split of Ready vs Beta is caught by this list going out
// of date (the in-test catalog snapshot below asserts it).
const READY_IDS  = ["poster", "bankpage1_static", "bankpage1_dynamic"];

test.describe("template picker: every catalog card builds with its own builder", () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page);
    await stubFeedFetch(page);
    await page.getByRole("button", { name: /Fetch Live News/i }).click();
    await expect(page.locator("#articles-area .a-card")).toHaveCount(2);
  });

  test("clicking each Beta card sets state.selectedFormat and the generated HTML carries that template's data-template-id", async ({ page }) => {
    // Pull the live catalog so we don't drift if a new template is added.
    const catalog = await page.evaluate(() => window.App.NewsletterBuilder.getTemplateCatalog().map(t => ({ id: t.id, status: t.status })));
    expect(catalog.length).toBe(25);
    const betaIds = catalog.filter(t => t.status === "beta").map(t => t.id);
    expect(betaIds.length).toBe(22);
    expect(catalog.filter(t => t.status === "ready").map(t => t.id).sort()).toEqual(READY_IDS.slice().sort());

    // Expand the Beta details once.
    await page.locator("#fmt-beta-group > summary").click();

    for (const id of betaIds) {
      const card = page.locator(`#fmt-grid-beta .fmt-card[data-fmt="${id}"]`);
      await expect(card, `beta card for "${id}" must be visible`).toBeVisible();
      await card.click();

      const fmt = await page.evaluate(() => window.App?.UI?._state?.selectedFormat || null);
      expect(fmt, `clicking the "${id}" card should set state.selectedFormat`).toBe(id);
      await expect(card, `clicking the "${id}" card should add .sel`).toHaveClass(/sel/);

      // Build a fresh newsletter directly via the engine (don't navigate to
      // preview each time — that'd blow up the test runtime 20×). This still
      // exercises the same code path the home-page Generate button uses.
      const built = await page.evaluate((fid) => {
        const NB = window.App.NewsletterBuilder;
        return NB.build(fid, { org: "ACME", soc: "soc@acme.test", freq: "Weekly", portal: "https://p", pname: "P" }, [
          { type: "Phishing", title: "QR phish targets payroll", summary: "Staff duped by fake login.", source: "X", url: "https://x.com/s", pubDate: "2026-05-23", threatLevel: 3 },
          { type: "Malware",  title: "npm package backdoor",    summary: "Compromised dependency.",    source: "Y", url: "https://y.com/s", pubDate: "2026-05-22", threatLevel: 4 }
        ], { useLinks: false, usePoster: false, useQR: false, useIllus: false });
      }, id);
      expect(built.length, `build("${id}") returned empty HTML`).toBeGreaterThan(0);
      expect(built.includes(`data-template-id="${id}"`), `build("${id}") did NOT stamp data-template-id="${id}" — silent fallback to poster?`).toBe(true);
    }
  });

  test("end-to-end Generate flow for one beta template (spotlight) produces spotlight HTML in the saved workspace", async ({ page }) => {
    await page.locator("#fmt-beta-group > summary").click();
    await page.locator('#fmt-grid-beta .fmt-card[data-fmt="spotlight"]').click();
    await page.locator("#articles-area .a-card").first().click();
    await page.getByRole("button", { name: /Generate Newsletter/i }).click();
    // Post-generate routes to editor (preview reachable via direct URL).
    await expect(page).toHaveURL(/\/editor(?:\.html)?$/);
    const html = await page.evaluate(() => {
      const ws = JSON.parse(localStorage.getItem("awareness_newsletter_workspace_v1"));
      return ws?.variants?.en?.html || "";
    });
    expect(html).toContain('data-template-id="spotlight"');
    expect(html).toContain("THREAT SPOTLIGHT");
  });
});
