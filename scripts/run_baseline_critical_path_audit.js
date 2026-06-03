const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = "http://127.0.0.1:4173";
const OUT_FILE = path.join(process.cwd(), "baseline-critical-path-audit-results.json");

function nowIso() {
  return new Date().toISOString();
}

function safeString(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const report = {
    startedAt: nowIso(),
    baseUrl: BASE_URL,
    checks: [],
    errors: [],
  };

  page.on("pageerror", (err) => {
    report.errors.push({ type: "pageerror", message: err.message, at: nowIso() });
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      report.errors.push({ type: "console", message: msg.text(), at: nowIso() });
    }
  });

  async function check(name, fn) {
    const item = { name, status: "pass", notes: [], startedAt: nowIso() };
    try {
      await fn(item);
    } catch (err) {
      item.status = "fail";
      item.notes.push(`Unhandled error: ${safeString(err?.message || err)}`);
    }
    item.finishedAt = nowIso();
    report.checks.push(item);
  }

  await check("index-load-and-fetch", async (item) => {
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("#articles-area", { timeout: 10000 });
    item.notes.push("Loaded index.html and core article area.");

    const fetchButton = page.locator("button:has-text('Fetch Live News')");
    if ((await fetchButton.count()) === 0) throw new Error("Fetch Live News button missing.");

    await fetchButton.first().click();
    const fetchStatusNode = page.locator("#fetch-st");
    const start = Date.now();
    while (Date.now() - start < 90000) {
      const txt = ((await fetchStatusNode.textContent()) || "").trim();
      const stillFetching = /^Fetching\b/i.test(txt);
      if (!stillFetching) break;
      await page.waitForTimeout(1500);
    }

    const fetchStatus = ((await page.locator("#fetch-st").textContent()) || "").trim();
    const cardsCount = await page.locator(".a-card").count();
    const statusLogText = ((await page.locator("#status-log").textContent()) || "").trim();

    item.notes.push(`fetch-st: "${fetchStatus || "(empty)"}"`);
    item.notes.push(`article cards rendered: ${cardsCount}`);
    item.notes.push(`status-log has content: ${statusLogText.length > 0}`);

    const networkErrors = report.errors.filter(
      (e) => e.type === "console" && e.message.includes("Failed to load resource")
    ).length;
    item.notes.push(`network resource errors observed: ${networkErrors}`);

    if (/^Fetching\b/i.test(fetchStatus) && cardsCount === 0) {
      item.status = "blocked";
      item.notes.push("Fetch did not complete within the test window.");
    } else if (/^Fetching\b/i.test(fetchStatus) && cardsCount > 0) {
      item.status = "blocked";
      item.notes.push("Usable article cards rendered, but full fetch completion was not proven within the test window.");
    } else if (cardsCount === 0 && networkErrors > 0) {
      item.status = "blocked";
      item.notes.push("No article cards rendered while feed/network errors were occurring.");
    }
  });

  await check("curate-select-build-flow", async (item) => {
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("button:has-text('Load from DB')", { timeout: 10000 });
    await page.locator("button:has-text('Load from DB')").first().click();
    await page.waitForTimeout(4000);

    const cards = page.locator(".a-card");
    const count = await cards.count();
    item.notes.push(`cards available for curation: ${count}`);
    if (count > 0) {
      await cards.first().click();
      item.notes.push("Selected first article card.");
    } else {
      item.status = "blocked";
      item.notes.push("No cards available from DB for selection.");
    }

    const buildButton = page.locator("button:has-text('Generate Newsletter')");
    if ((await buildButton.count()) === 0) throw new Error("Generate Newsletter button missing.");
    await buildButton.first().click();
    await page.waitForTimeout(5000);

    const previewVisible = await page.locator("#preview-panel").isVisible().catch(() => false);
    const outputHtml = ((await page.locator("#nl-out").textContent()) || "").trim();
    item.notes.push(`preview visible: ${previewVisible}`);
    item.notes.push(`newsletter output text length: ${outputHtml.length}`);

    if (!previewVisible && outputHtml.length === 0) {
      if (count === 0) {
        item.status = "blocked";
        item.notes.push("Generate did not run because no selectable articles were available.");
      } else {
        item.status = "fail";
        item.notes.push("Generate action did not produce preview/output.");
      }
    }
  });

  await check("editor-page-load", async (item) => {
    await page.goto(`${BASE_URL}/editor.html`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2500);

    const editorTitle = await page.locator("h1:has-text('Editor')").count();
    const iframeCount = await page.locator("iframe").count();
    item.notes.push(`editor title found: ${editorTitle > 0}`);
    item.notes.push(`iframe count: ${iframeCount}`);
    if (editorTitle === 0) throw new Error("Editor heading not found.");
  });

  await check("send-page-load-and-actions", async (item) => {
    await page.goto(`${BASE_URL}/send.html`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("#smtp-test-to", { state: "attached", timeout: 10000 });
    await page.locator("#smtp-test-to").evaluate((el, value) => { el.value = value; }, "test@example.com");
    await page.locator("#smtp-send-to").evaluate((el, value) => { el.value = value; }, "team@example.com");

    const sendTest = page.locator("button:has-text('Send Test')");
    const sendNewsletter = page.locator("button:has-text('Send Newsletter')");
    if ((await sendTest.count()) === 0 || (await sendNewsletter.count()) === 0) {
      throw new Error("Send actions missing.");
    }

    await sendTest.first().click();
    await page.waitForTimeout(1500);
    await sendNewsletter.first().click();
    await page.waitForTimeout(1500);

    const deliveryLog = ((await page.locator("#delivery-log-list").textContent()) || "").trim();
    item.notes.push(`delivery log text length: ${deliveryLog.length}`);
  });

  await check("projects-and-keywords-routes", async (item) => {
    await page.goto(`${BASE_URL}/projects.html`, { waitUntil: "domcontentloaded", timeout: 20000 });
    const projectsTitle = await page.locator("h1:has-text('Projects')").count();
    item.notes.push(`projects title found: ${projectsTitle > 0}`);
    if (projectsTitle === 0) throw new Error("Projects heading not found.");

    await page.goto(`${BASE_URL}/keywords.html`, { waitUntil: "domcontentloaded", timeout: 20000 });
    const keywordsTitle = await page.locator("h1:has-text('Feed keyword scoring')").count();
    const criticalInput = await page.locator("#critical-input").count();
    item.notes.push(`keywords title found: ${keywordsTitle > 0}`);
    item.notes.push(`critical keyword input found: ${criticalInput > 0}`);
    if (keywordsTitle === 0) throw new Error("Feed keyword scoring heading not found.");
  });

  await check("date-sort-control", async (item) => {
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.evaluate(() => {
      const panel = document.getElementById("preview-panel");
      if (panel?.classList.contains("active")) window.App?.UI?.closePreview?.();
    });
    await page.waitForSelector("button:has-text('Load from DB')", { timeout: 10000 });
    await page.locator("button:has-text('Load from DB')").first().click();
    await page.waitForTimeout(2500);
    const sortSel = page.locator("#article-sort-select");
    if ((await sortSel.count()) === 0) throw new Error("Date sort control missing.");
    const before = ((await page.locator(".a-date").first().textContent()) || "").trim();
    await sortSel.selectOption("date_asc");
    await page.waitForTimeout(300);
    const after = ((await page.locator(".a-date").first().textContent()) || "").trim();
    const visibleDates = (await page.locator(".a-date").allTextContents()).map((value) => value.trim()).filter(Boolean);
    const distinctDates = new Set(visibleDates);
    item.notes.push(`first card date before: ${before || "(empty)"}`);
    item.notes.push(`first card date after asc: ${after || "(empty)"}`);
    item.notes.push(`distinct visible dates: ${distinctDates.size}`);
    if (!before || !after || before === after) {
      if (distinctDates.size < 2) {
        item.status = "blocked";
        item.notes.push("Sort control is present, but visible articles do not contain enough distinct dates to prove reordering.");
      } else {
        item.status = "fail";
        item.notes.push("Sort control did not reorder visible date ordering.");
      }
    }
  });

  await check("keywords-search-suggest-delete", async (item) => {
    await page.goto(`${BASE_URL}/keywords.html`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("#critical-input", { timeout: 10000 });
    await page.fill("#critical-input", "rans");
    await page.waitForTimeout(250);
    const suggCount = await page.locator("#critical-suggestions .sugg-btn").count();
    item.notes.push(`critical suggestions count: ${suggCount}`);

    await page.fill("#critical-input", "wave1testkeyword");
    await page.getByRole("button", { name: "Add critical keyword" }).click();
    await page.fill("#critical-search", "wave1testkeyword");
    await page.waitForTimeout(250);
    const hasKeyword = await page.locator("#critical-list").textContent();
    item.notes.push(`critical search contains injected keyword: ${String(hasKeyword || "").includes("wave1testkeyword")}`);

    await page.evaluate(() => {
      window.App?.KeywordStore?.clearAllKeywords?.();
      window.App?.KeywordStore?.resetDefaults?.();
    });
    const critAfterReset = await page.evaluate(() => window.App?.KeywordStore?.getCriticalKeywords?.().length || 0);
    const ctxAfterReset = await page.evaluate(() => window.App?.KeywordStore?.getContextKeywords?.().length || 0);
    item.notes.push(`counts after delete-all + reset: critical=${critAfterReset}, context=${ctxAfterReset}`);
    if (suggCount === 0 || !String(hasKeyword || "").includes("wave1testkeyword")) {
      item.status = "fail";
      item.notes.push("Keyword suggest/search flow failed.");
    }
  });

  await check("config-soc-persistence", async (item) => {
    await page.goto(`${BASE_URL}/config.html`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("#cfg-soc", { timeout: 10000 });
    const markerSoc = `wave1-soc-${Date.now()}@example.test`;
    await page.fill("#cfg-soc", markerSoc);
    await page.evaluate(() => window.saveAllConfig ? window.saveAllConfig(true) : null);
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(800);
    const loadedSoc = await page.locator("#cfg-soc").inputValue();
    item.notes.push(`config SOC propagated to index: ${loadedSoc === markerSoc}`);
    if (loadedSoc !== markerSoc) {
      item.status = "fail";
      item.notes.push("Config SOC persistence failed.");
    }
  });

  report.finishedAt = nowIso();
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2), "utf8");

  await context.close();
  await browser.close();
  console.log(`Wrote baseline audit report: ${OUT_FILE}`);

  const failures = report.checks.filter((item) => item.status === "fail");
  if (failures.length) {
    console.error(`Baseline audit failed checks: ${failures.map((item) => item.name).join(", ")}`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
