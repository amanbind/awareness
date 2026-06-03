const { test, expect } = require("@playwright/test");

const workspaceFixture = {
  id: "workspace-fixture",
  createdAt: "2026-04-20T00:00:00.000Z",
  format: "executive",
  cfg: {
    org: "Fixture Org",
    soc: "soc@example.test",
    portal: "https://example.test/report",
    freq: "Weekly",
    max: 2,
  },
  opts: {},
  articles: [],
  variants: {
    en: {
      html: "<h1>Fixture newsletter</h1>",
      css: "",
      meta: { translatedFrom: null },
    },
  },
  currentLanguage: "en",
};

async function resetStorage(page, path = "/index.html") {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

test.describe("pages, guards, and storage", () => {
  test("feed scoring keywords can be added, searched, and reset through the UI", async ({ page }) => {
    await resetStorage(page, "/keywords.html");
    page.on("dialog", (dialog) => dialog.accept());

    await page.locator("#critical-input").fill("wave keyword");
    await page.locator("#critical-input + button").click();
    await page.locator("#critical-search").fill("wave keyword");

    await expect(page.locator("#critical-list")).toContainText("wave keyword");

    await page.getByRole("button", { name: /Reset to Defaults/i }).click();
    await expect.poll(async () => page.evaluate(() => App.KeywordStore.getCriticalKeywords().length)).toBeGreaterThan(0);
  });

  test("config SOC email persists locally", async ({ page }) => {
    await resetStorage(page, "/config.html");

    await page.locator("#cfg-soc").fill("wave-soc@example.test");

    await page.evaluate(() => window.saveAllConfig?.(true));
    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page.locator("#cfg-soc")).toHaveValue("wave-soc@example.test");
  });

  test("preview, editor, and send pages guard empty workspaces and open with a valid workspace", async ({ page }) => {
    await resetStorage(page, "/preview.html");
    await expect(page.locator(".ux-guard")).toContainText("requires an active newsletter workspace");

    await resetStorage(page, "/editor.html");
    await expect(page.locator(".ux-guard")).toContainText("requires an active newsletter workspace");

    await page.goto("/send.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".ux-guard")).toContainText("requires an active newsletter workspace");

    await page.evaluate((workspace) => {
      localStorage.setItem("awareness_newsletter_workspace_v1", JSON.stringify(workspace));
    }, workspaceFixture);

    await page.goto("/preview.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".ux-guard")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Preview" })).toBeVisible();
    await expect(page.locator("#project-title")).toHaveValue(/newsletter_\d{4}-\d{2}-\d{2}/);
    await page.locator("#project-title").fill("newsletter_preview_save");
    await page.getByRole("button", { name: /^Save Project$/i }).click();
    await expect(page.locator("#project-version-label")).toContainText("Version 1");
    await page.getByRole("button", { name: /^Save Project$/i }).click();
    await expect(page.locator("#project-version-label")).toContainText("Version 2");
    await expect
      .poll(async () => page.evaluate(async () => (await App.ProjectStore.list())[0]?.snapshots?.length || 0))
      .toBe(2);
    await page.getByRole("button", { name: /Open in Editor/i }).click();
    await expect(page).toHaveURL(/\/editor(?:\.html)?$/);
    await expect(
      page.getByRole("group", { name: /Save and download/i }).getByRole("button", { name: /^Save$/i })
    ).toBeVisible();
    // Preview button no longer lives in the editor; Send still does.
    await page.getByRole("button", { name: /^Send$/i }).click();
    await expect(page).toHaveURL(/\/send(?:\.html)?$/);

    await page.goto("/editor.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".ux-guard")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Editor" })).toBeVisible();

    await page.goto("/send.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".ux-guard")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Send Test" })).toBeVisible();
    await expect(page.locator("#delivery-log-list")).toBeVisible();
  });

  test("projects page and global shell expose the agreed workflow navigation", async ({ page }) => {
    await resetStorage(page, "/projects.html");

    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    await expect(page.locator("#ux-shell")).toBeVisible();

    // Preview was removed from the top nav (still reachable by direct URL / Editor's Preview button).
    for (const label of ["Home", "Keywords", "Curation lab", "Editor", "Send", "Projects", "Config"]) {
      await expect(page.locator("#ux-shell").getByRole("link", { name: label })).toBeVisible();
    }

    await expect(page.locator("#ux-shell .ux-step.active")).toContainText("Approve");
  });

  test("editor lists saved versions after multiple project saves", async ({ page }) => {
    await resetStorage(page, "/preview.html");
    await page.evaluate((workspace) => {
      localStorage.setItem("awareness_newsletter_workspace_v1", JSON.stringify(workspace));
    }, workspaceFixture);
    await page.goto("/preview.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".ux-guard")).toHaveCount(0);
    await page.locator("#project-title").fill("versioned_editor_proj");
    await page.getByRole("button", { name: /^Save Project$/i }).click();
    await expect(page.locator("#project-version-label")).toContainText("Version 1");
    await page.getByRole("button", { name: /^Save Project$/i }).click();
    await expect(page.locator("#project-version-label")).toContainText("Version 2");
    const projectId = await page.evaluate(() => window.App?.UI?.state?.activeProjectId);
    expect(projectId).toBeTruthy();
    await page.evaluate((pid) => {
      App.RouterNav.setHandoff({ projectId: pid, source: "preview" });
    }, projectId);
    await page.goto("/editor.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".ux-guard")).toHaveCount(0);
    await expect(page.locator("#editor-version-row")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#editor-project-version-select option")).toHaveCount(3);
  });

  test("open project from projects handoff loads on preview page", async ({ page }) => {
    await resetStorage(page, "/projects.html");
    await page.evaluate(async () => {
      await App.DB.saveProject({
        projectId: "project_handoff_keep_preview",
        title: "Handoff Preview",
        status: "draft",
        metadata: {},
        languageVariants: {
          en: {
            html: "<p id='handoff-proj-marker'>Loaded from IndexedDB</p>",
            css: "",
            projectData: null,
            updatedAt: new Date().toISOString(),
          },
        },
        workflow: null,
        snapshots: [],
      });
      App.RouterNav.setHandoff({ projectId: "project_handoff_keep_preview", source: "projects" });
    });

    await page.goto("/preview.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".ux-guard")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Preview" })).toBeVisible();
    await expect(page.locator("#handoff-proj-marker")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#handoff-proj-marker")).toContainText("Loaded from IndexedDB");
  });

  test("home restores poster even when a linked project has empty variants", async ({ page }) => {
    await resetStorage(page, "/preview.html");
    await page.evaluate(async (workspace) => {
      localStorage.setItem("awareness_newsletter_workspace_v1", JSON.stringify(workspace));
      await App.DB.saveProject({ projectId: "project_empty", title: "Empty Project", status: "draft", metadata: {}, languageVariants: {}, workflow: null, snapshots: [] });
      App.RouterNav.setHandoff({ projectId: "project_empty", source: "projects" });
    }, workspaceFixture);

    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#nl-out")).toContainText("Fixture newsletter");
    await expect(page.locator("#preview-panel")).not.toHaveClass(/active/);
  });

  test("curation lab loads and displays live summarize user prompt", async ({ page }) => {
    await resetStorage(page, "/curation-lab.html");
    await expect(page.getByRole("heading", { name: "Curation lab" })).toBeVisible();
    await expect(page.locator("#lab-user-per-article")).toContainText("internal security bulletin");
    await expect(page.locator("#lab-template")).toBeVisible();
  });
});

