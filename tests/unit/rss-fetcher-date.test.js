const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "../..");

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); },
  };
}

function loadRSSFetcher() {
  const context = {
    window: {},
    localStorage: createStorage(),
    URL,
    Date,
    console,
    setTimeout,
    clearTimeout,
    AbortController,
    navigator: { hardwareConcurrency: 4 },
    performance: { now: () => 0 },
  };
  context.window = context;
  context.App = {
    Utils: {
      log() {},
      stripTags(value) { return String(value || "").replace(/<[^>]*>/g, ""); },
      truncate(value, limit) { return String(value || "").slice(0, limit); },
    },
  };
  vm.createContext(context);
  const code = readFileSync(path.join(rootDir, "js/rss_fetcher.js"), "utf8");
  vm.runInContext(code, context, { filename: "js/rss_fetcher.js" });
  return context.App.RSSFetcher;
}

function isoDaysFromNow(days) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

test("isFutureDated rejects only genuine future-dated items", () => {
  const { isFutureDated } = loadRSSFetcher();
  assert.equal(typeof isFutureDated, "function");

  // Dates beyond the end of today are future events -> excluded.
  assert.equal(isFutureDated(isoDaysFromNow(3)), true, "3 days ahead is future");
  assert.equal(isFutureDated("2999-01-01"), true, "far-future date is future");

  // Past and present items are kept.
  assert.equal(isFutureDated(isoDaysFromNow(-1)), false, "yesterday is not future");
  assert.equal(isFutureDated("2000-01-01"), false, "old date is not future");
  assert.equal(isFutureDated(new Date().toISOString()), false, "now is not future");

  // Missing/invalid dates default to today downstream, so they must not be dropped.
  assert.equal(isFutureDated(""), false, "empty date is not future");
  assert.equal(isFutureDated("not a date"), false, "unparseable date is not future");
});
