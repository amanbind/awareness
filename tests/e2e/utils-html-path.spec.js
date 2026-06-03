const { test, expect } = require("@playwright/test");

test.describe("Newsletter HTML path helper", () => {
  test("removeNewsletterNodeByBodyChildPath removes nested element", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    const out = await page.evaluate(() => {
      const html =
        '<div id="a"><div id="b"><span id="c">remove-me</span><span>keep</span></div></div>';
      const path = [0, 0, 0];
      return window.App.Utils.removeNewsletterNodeByBodyChildPath(html, path);
    });
    expect(out.removed).toBe(true);
    expect(out.html).not.toContain("remove-me");
    expect(out.html).toContain("keep");
  });

  test("removeNewsletterNodeByBodyChildPath returns removed false for bad path", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    const out = await page.evaluate(() => {
      const html = "<div><p>x</p></div>";
      return window.App.Utils.removeNewsletterNodeByBodyChildPath(html, [0, 9]);
    });
    expect(out.removed).toBe(false);
    expect(out.html).toContain("<p>x</p>");
  });

  test("removeNewsletterNodeByTemplateChildPath ignores leading boilerplate", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    const out = await page.evaluate(() => {
      const html =
        '<style data-x>/*a*/</style><div data-template-id="poster"><div><span id="t">bye</span></div></div>';
      return window.App.Utils.removeNewsletterNodeByTemplateChildPath(html, [0, 0]);
    });
    expect(out.removed).toBe(true);
    expect(out.html).not.toContain("bye");
  });

  test("removeNewsletterNodeByMirrorPath uses relPath when body path prefix differs", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    const out = await page.evaluate(() => {
      const html = '<div data-template-id="poster"><div><span id="t">x</span></div></div>';
      const pathBody = [1, 0, 0, 0];
      const relPath = [0, 0];
      return window.App.Utils.removeNewsletterNodeByMirrorPath(html, pathBody, relPath, 4);
    });
    expect(out.removed).toBe(true);
    expect(out.html).not.toContain(">x<");
  });

  // The in-iframe "Remove" prunes wrapper tables/cards that become empty after a
  // delete (pruneEmptyAncestors). The cross-language remove must do the same so
  // "Remove in all languages" leaves no hollow wrappers / vertical gaps behind.
  test("removeNewsletterNodeByTemplateChildPath prunes ancestors that become empty", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    const out = await page.evaluate(() => {
      const html =
        '<div data-template-id="poster">' +
          '<table class="card"><tbody><tr><td class="card-body"><span id="only">remove-me</span></td></tr></tbody></table>' +
          '<p>keep</p>' +
        '</div>';
      const relPath = [0, 0, 0, 0, 0]; // card → tbody → tr → td → span#only
      return window.App.Utils.removeNewsletterNodeByTemplateChildPath(html, relPath);
    });
    expect(out.removed).toBe(true);
    expect(out.html).not.toContain("remove-me");
    expect(out.html).not.toContain("card-body");
    expect(out.html).not.toContain("<table");
    expect(out.html).toContain("keep");
  });

  test("removeNewsletterNodeByBodyChildPath prunes ancestors that become empty", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    const out = await page.evaluate(() => {
      const html =
        '<div id="wrap"><table class="card"><tbody><tr><td class="cell"><span id="only">gone</span></td></tr></tbody></table></div>' +
        '<p id="sib">stay</p>';
      const path = [0, 0, 0, 0, 0, 0]; // wrap → table → tbody → tr → td → span#only
      return window.App.Utils.removeNewsletterNodeByBodyChildPath(html, path);
    });
    expect(out.removed).toBe(true);
    expect(out.html).not.toContain("gone");
    expect(out.html).not.toContain("<table");
    expect(out.html).not.toContain('id="wrap"');
    expect(out.html).toContain("stay");
  });

  test("ancestor pruning stops at wrappers that still hold content", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    const out = await page.evaluate(() => {
      const html =
        '<div data-template-id="poster"><table class="card"><tbody><tr><td class="card-body">' +
          '<span id="gone">remove-me</span><span id="stay">keep-me</span>' +
        '</td></tr></tbody></table></div>';
      const relPath = [0, 0, 0, 0, 0]; // span#gone
      return window.App.Utils.removeNewsletterNodeByTemplateChildPath(html, relPath);
    });
    expect(out.removed).toBe(true);
    expect(out.html).not.toContain("remove-me");
    expect(out.html).toContain("keep-me");
    expect(out.html).toContain("card-body");
  });

  test("ancestor pruning keeps wrappers that still hold meaningful elements", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    const out = await page.evaluate(() => {
      const html =
        '<div data-template-id="poster"><div class="hold"><span id="gone">remove-me</span><img src="a.png"></div></div>';
      const relPath = [0, 0]; // hold → span#gone
      return window.App.Utils.removeNewsletterNodeByTemplateChildPath(html, relPath);
    });
    expect(out.removed).toBe(true);
    expect(out.html).not.toContain("remove-me");
    expect(out.html).toContain("hold");
    expect(out.html).toContain("<img");
  });
});
