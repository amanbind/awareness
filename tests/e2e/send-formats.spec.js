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
      return { articles: items, stats: { fixture: { name: "Fixture Feed", count: items.length, ok: true, via: "fixture", elapsedMs: 5, urlUsed: "x", finishedAt: new Date().toISOString() } }, telemetry: { totalElapsedMs: 5, feedCount: 1, successCount: 1 } };
    };
  }, articles);
}

test.describe("send/export formats: HTML, EML, MSG", () => {
  test("editor exposes HTML/EML/MSG and the browser builds a valid .msg (CFB)", async ({ page }) => {
    await clearBrowserState(page);
    await stubFeedFetch(page);
    await page.getByRole("button", { name: /Fetch Live News/i }).click();
    await expect(page.locator("#articles-area .a-card")).toHaveCount(2);

    // Pick a Ready template (bankpage1_dynamic), select an article, generate → editor.
    await page.locator('.fmt-card[data-fmt="bankpage1_dynamic"]').click();
    await page.locator("#articles-area .a-card").first().click();
    await page.getByRole("button", { name: /Generate Newsletter/i }).click();
    await page.waitForURL(/\/editor(?:\.html)?$/);
    // Wait for the editor's end-of-body scripts to finish loading.
    await page.waitForFunction(() => !!(window.App && window.App.MsgWriter && window.App.MsgWriter.buildMsgFile && window.App.UI && window.App.UI.downloadCurrentMsg));

    // The unified provision is present.
    await expect(page.locator('.editor-file-group button', { hasText: /^HTML$/ })).toBeVisible();
    await expect(page.locator('.editor-file-group button', { hasText: /^EML$/ })).toBeVisible();
    await expect(page.locator('.editor-file-group button', { hasText: /^MSG$/ })).toBeVisible();

    // The MSG writer is loaded in-browser and emits a valid Compound File.
    const check = await page.evaluate(() => {
      const okFn = typeof window.App?.UI?.downloadCurrentMsg === "function";
      const bytes = window.App.MsgWriter.buildMsgFile("<html><body><p>hi</p></body></html>", [], { subject: "t" });
      const sig = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
      const sigOk = sig.every((b, i) => bytes[i] === b);
      return { okFn, sigOk, len: bytes.length };
    });
    expect(check.okFn).toBe(true);
    expect(check.sigOk).toBe(true);
    expect(check.len).toBeGreaterThan(512);
  });
});
