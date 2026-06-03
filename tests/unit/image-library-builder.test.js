const assert = require("node:assert/strict");
const test = require("node:test");
const os = require("node:os");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const LIB_URL = pathToFileURL(path.resolve(__dirname, "../../scripts/lib/image_library.mjs")).href;
// 1x1 transparent PNG
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function tmpLib() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "imglib-"));
  return dir;
}

test("isSafeImageName accepts images, rejects traversal/non-images", async () => {
  const lib = await import(LIB_URL);
  assert.equal(lib.isSafeImageName("photo.jpeg"), true);
  assert.equal(lib.isSafeImageName("a_b-c.png"), true);
  assert.equal(lib.isSafeImageName("../evil.png"), false);
  assert.equal(lib.isSafeImageName("evil.txt"), false);
  assert.equal(lib.isSafeImageName("with space.png"), false);
});

test("buildLibraryJs bakes listed images into a data-URI bundle", async () => {
  const lib = await import(LIB_URL);
  const dir = await tmpLib();
  await fs.writeFile(path.join(dir, "pic.png"), Buffer.from(PNG_B64, "base64"));
  await fs.writeFile(path.join(dir, "manifest.json"), JSON.stringify({ images: ["pic.png", "missing.png"] }));
  const res = await lib.buildLibraryJs(dir);
  assert.equal(res.count, 1, "only the existing image is baked");
  assert.ok(res.skipped.includes("missing.png"));
  const js = await fs.readFile(path.join(dir, "library.js"), "utf8");
  assert.ok(js.includes("window.App.ImageLibrary"), "defines the bundle global");
  assert.ok(js.includes(`"filename":"pic.png"`));
  assert.ok(js.includes(`data:image/png;base64,${PNG_B64}`), "embeds the exact data URI");
});

test("addImage writes the file, updates the manifest, and regenerates the bundle", async () => {
  const lib = await import(LIB_URL);
  const dir = await tmpLib();
  await fs.writeFile(path.join(dir, "manifest.json"), JSON.stringify({ images: [] }));
  await lib.addImage(dir, "new.png", Buffer.from(PNG_B64, "base64"));
  const onDisk = await fs.readFile(path.join(dir, "new.png"));
  assert.ok(onDisk.length > 0, "image written to disk");
  const manifest = JSON.parse(await fs.readFile(path.join(dir, "manifest.json"), "utf8"));
  assert.ok(manifest.images.includes("new.png"), "manifest updated");
  const js = await fs.readFile(path.join(dir, "library.js"), "utf8");
  assert.ok(js.includes(`"filename":"new.png"`), "bundle regenerated with the new image");
});

test("addImage rejects unsafe filenames", async () => {
  const lib = await import(LIB_URL);
  const dir = await tmpLib();
  await assert.rejects(() => lib.addImage(dir, "../escape.png", Buffer.from(PNG_B64, "base64")));
});
