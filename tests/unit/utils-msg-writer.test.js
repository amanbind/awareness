const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const rootDir = path.resolve(__dirname, "../..");

function loadMsgWriter() {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "https://example.test/" });
  const { window } = dom;
  window.App = window.App || {};
  const context = vm.createContext({
    window,
    document: window.document,
    App: window.App,
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
    btoa: (s) => Buffer.from(s, "binary").toString("base64"),
    TextEncoder,
    DataView,
    Uint8Array,
    Uint32Array,
    ArrayBuffer,
    unescape,
    encodeURIComponent,
    console,
  });
  vm.runInContext(readFileSync(path.join(rootDir, "js/msg_writer.js"), "utf8"), context);
  return context.App.MsgWriter;
}

// ── helpers ──
function utf16le(s) {
  const b = new Uint8Array(s.length * 2);
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); b[i * 2] = c & 0xff; b[i * 2 + 1] = (c >> 8) & 0xff; }
  return b;
}
function utf8(s) { return new Uint8Array(Buffer.from(s, "utf8")); }
function concatU8(list) { let n = 0; for (const x of list) n += x.length; const o = new Uint8Array(n); let p = 0; for (const x of list) { o.set(x, p); p += x.length; } return o; }
function bytesEqual(a, b) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }

// Minimal CFB reader — enough to pull any stream by name (regular + mini paths).
function readMsg(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const SSZ = 512, MSZ = 64;
  const ENDOFCHAIN = 0xFFFFFFFE, FREESECT = 0xFFFFFFFF;
  const u32 = (o) => dv.getUint32(o, true);
  const numFat = u32(44), firstDir = u32(48), cutoff = u32(56), firstMiniFat = u32(60), numMiniFat = u32(64);
  const fatSectors = []; for (let i = 0; i < numFat; i++) fatSectors.push(u32(76 + i * 4));
  const fat = [];
  for (const fs of fatSectors) { const base = SSZ * (1 + fs); for (let i = 0; i < 128; i++) fat.push(dv.getUint32(base + i * 4, true)); }
  const sectorBytes = (s) => bytes.subarray(SSZ * (1 + s), SSZ * (1 + s) + SSZ);
  function readChain(start) {
    const out = []; let s = start, g = 0;
    while (s !== ENDOFCHAIN && s !== FREESECT && g++ < 1e6) { out.push(sectorBytes(s)); s = fat[s]; }
    return concatU8(out);
  }
  const dirBytes = readChain(firstDir);
  const entries = [];
  for (let off = 0; off + 128 <= dirBytes.length; off += 128) {
    const ddv = new DataView(dirBytes.buffer, dirBytes.byteOffset + off, 128);
    const nameLen = ddv.getUint16(64, true);
    const type = dirBytes[off + 66];
    let name = "";
    const chars = nameLen > 0 ? nameLen / 2 - 1 : 0;
    for (let i = 0; i < chars && i < 32; i++) name += String.fromCharCode(ddv.getUint16(i * 2, true));
    entries.push({ name, type, start: ddv.getUint32(116, true), size: ddv.getUint32(120, true) });
  }
  const root = entries[0];
  const miniStream = readChain(root.start).subarray(0, root.size);
  const miniFat = [];
  if (numMiniFat) {
    const raw = readChain(firstMiniFat);
    const mdv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    for (let i = 0; i * 4 < raw.byteLength; i++) miniFat.push(mdv.getUint32(i * 4, true));
  }
  function readMini(start, size) {
    const out = []; let s = start, g = 0;
    while (s !== ENDOFCHAIN && s !== FREESECT && g++ < 1e6) { out.push(miniStream.subarray(s * MSZ, s * MSZ + MSZ)); s = miniFat[s]; }
    return concatU8(out).subarray(0, size);
  }
  function read(e) {
    if (!e || e.size === 0) return new Uint8Array(0);
    return e.size < cutoff ? readMini(e.start, e.size) : readChain(e.start).subarray(0, e.size);
  }
  return { entries, byName: (n) => entries.filter((e) => e.name === n), read };
}

test("buildMsgFile produces a valid CFB whose streams round-trip", () => {
  const MsgWriter = loadMsgWriter();
  // HTML > 4096 bytes so PR_HTML uses the regular (FAT) path, exercising sector chaining.
  const html = "<html><body>" + "<p>Security awareness line.</p>".repeat(400) + "</body></html>";
  const subject = "Monthly Bulletin (English)";
  const bytes = MsgWriter.buildMsgFile(html, [], { subject });

  // CFB signature.
  const sig = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
  for (let i = 0; i < 8; i++) assert.equal(bytes[i], sig[i], `signature byte ${i}`);

  const msg = readMsg(bytes);
  assert.ok(bytesEqual(msg.read(msg.byName("__substg1.0_10130102")[0]), utf8(html)), "PR_HTML round-trips (regular sector path)");
  assert.ok(bytesEqual(msg.read(msg.byName("__substg1.0_0037001F")[0]), utf16le(subject)), "PR_SUBJECT_W round-trips (mini path)");
  assert.ok(bytesEqual(msg.read(msg.byName("__substg1.0_001A001F")[0]), utf16le("IPM.Note")), "PR_MESSAGE_CLASS_W == IPM.Note");
});

test("buildMsgFile embeds inline image attachments as an __attach storage", () => {
  const MsgWriter = loadMsgWriter();
  const imgBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const imgBytes = new Uint8Array(Buffer.from(imgBase64, "base64"));
  const bytes = MsgWriter.buildMsgFile(
    "<html><body><img src=\"cid:aw-1\"></body></html>",
    [{ contentId: "aw-1", contentType: "image/png", base64: imgBase64, filename: "qr.png" }],
    { subject: "With image" }
  );
  const msg = readMsg(bytes);
  assert.ok(msg.entries.some((e) => e.name === "__attach_version1.0_#00000000" && e.type === 1), "attachment storage present");
  assert.ok(bytesEqual(msg.read(msg.byName("__substg1.0_37010102")[0]), imgBytes), "PR_ATTACH_DATA_BIN round-trips");
  assert.ok(bytesEqual(msg.read(msg.byName("__substg1.0_3712001F")[0]), utf16le("aw-1")), "PR_ATTACH_CONTENT_ID round-trips");
});

test("buildMsgFile is safe with empty/odd input", () => {
  const MsgWriter = loadMsgWriter();
  const bytes = MsgWriter.buildMsgFile("", [], {});
  assert.equal(bytes[0], 0xD0, "still a CFB");
  const msg = readMsg(bytes);
  assert.ok(bytesEqual(msg.read(msg.byName("__substg1.0_001A001F")[0]), utf16le("IPM.Note")), "message class still IPM.Note");
});
