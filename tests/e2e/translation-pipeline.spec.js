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
    window.App.RSSFetcher.fetchAllFeeds = async (_enabledFeedIds, _maxPerFeed, onProgress) => {
      onProgress?.({
        done: 1,
        total: 1,
        feedName: "Fixture Feed",
        ok: true,
        count: items.length,
        rawCount: items.length,
        elapsedMs: 5,
        newArticles: items,
      });
      return {
        articles: items,
        stats: {
          fixture: {
            name: "Fixture Feed",
            count: items.length,
            rawCount: items.length,
            ok: true,
            via: "fixture",
            elapsedMs: 5,
            urlUsed: "https://example.test/feed.xml",
            finishedAt: new Date().toISOString(),
          },
        },
        telemetry: { totalElapsedMs: 5, feedCount: 1, successCount: 1 },
      };
    };
  }, articles);
}

test.describe("translation pipeline (E2E segment hook)", () => {
  test.describe.configure({ timeout: 120000 });

  test("index exposes translation pipeline state container", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#translation-pipeline-state")).toBeAttached();
  });

  // Regression lock for Pipeline-1: confirms saveProjectVersion no longer
  // clobbers translated variants. Before the fix in generate_pipeline.js, the
  // freshly-translated Spanish HTML was overwritten with English via the stale
  // #nl-out DOM read inside syncVariantFromPreviewDom.
  test("build reaches editor and Spanish variant carries the E2E segment marker", async ({ page }) => {
    await page.addInitScript(() => {
      window.__AWARENESS_E2E_SEG_TRANSLATE = "1";
    });
    await clearBrowserState(page);
    await stubFeedFetch(page);

    await page.getByRole("button", { name: /Fetch Live News/i }).click();
    await expect(page.locator("#fetch-st")).toContainText("articles ready");
    await page.locator("#articles-area .a-card").first().click();

    await page.evaluate(() => {
      const k = document.getElementById("ai-key");
      if (k) k.value = "sk-ant-api03-e2e-test-key";
      const p = document.getElementById("ai-provider");
      if (p) p.value = "claude";
    });

    await page.getByRole("button", { name: /Generate Newsletter/i }).click();
    await expect(page).toHaveURL(/\/editor(?:\.html)?$/, { timeout: 90000 });
    const workspace = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("awareness_newsletter_workspace_v1") || "null")
    );
    expect(workspace?.variants?.es?.html || "").toContain("⟨e2e⟩");
  });

  test("shows blocked translation state when E2E hook echoes source segments", async ({ page }) => {
    await page.addInitScript(() => {
      window.__AWARENESS_E2E_SEG_TRANSLATE = "echo";
    });
    await clearBrowserState(page);
    await stubFeedFetch(page);

    await page.getByRole("button", { name: /Fetch Live News/i }).click();
    await expect(page.locator("#fetch-st")).toContainText("articles ready");
    await page.locator("#articles-area .a-card").first().click();

    await page.evaluate(() => {
      const k = document.getElementById("ai-key");
      if (k) k.value = "sk-ant-api03-e2e-test-key";
      const p = document.getElementById("ai-provider");
      if (p) p.value = "claude";
    });

    await page.getByRole("button", { name: /Generate Newsletter/i }).click();
    await expect(page).not.toHaveURL(/\/preview(?:\.html)?$/);
    await expect(page.locator("#translation-pipeline-state .ux-state-card.error")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("#translation-pipeline-state")).toContainText(/Translation blocked|\[gate:coverage\]/i);
  });
});
