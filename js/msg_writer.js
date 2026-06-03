/* ═══════════════════════════════════════════════════════════
   msg_writer.js — Self-contained Outlook .msg writer (App.MsgWriter)

   Builds a minimal Outlook .msg file ENTIRELY in the browser — no external
   library, so the feature works offline and ships identically inside the zip.

   A .msg is an OLE2 / Compound File Binary (MS-CFB) container holding MAPI
   property streams (MS-OXMSG / MS-OXPROPS). We write:
     - PR_MESSAGE_CLASS_W = "IPM.Note"          (__substg1.0_001A001F)
     - PR_SUBJECT_W                              (__substg1.0_0037001F)
     - PR_BODY_W (plain-text fallback)           (__substg1.0_1000001F)
     - PR_HTML  (the email-safe HTML, UTF-8)     (__substg1.0_10130102)
     - top-level __properties_version1.0 with PR_MESSAGE_FLAGS=UNSENT (draft,
       mirrors the .eml X-Unsent) and PR_INTERNET_CPID=65001 (UTF-8)
     - one __attach_version1.0_#XXXXXXXX storage per inline (cid) image, so the
       HTML renders with images (Outlook blocks data: URIs — cid is required).

   Outlook is the authoritative validator; the unit test round-trips streams
   with a tiny CFB reader to catch structural regressions.
   ═══════════════════════════════════════════════════════════ */
window.App = window.App || {};

App.MsgWriter = (function () {
  'use strict';

  var SSZ = 512;            // sector size (CFB v3)
  var MSZ = 64;             // mini sector size
  var CUTOFF = 4096;        // mini-stream cutoff
  var ENTRY = 128;          // directory entry size
  var FREESECT = 0xFFFFFFFF;
  var ENDOFCHAIN = 0xFFFFFFFE;
  var FATSECT = 0xFFFFFFFD;
  var NOSTREAM = 0xFFFFFFFF;

  // ── byte helpers ──
  function utf16le(s) {
    s = String(s);
    var b = new Uint8Array(s.length * 2);
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      b[i * 2] = c & 0xff;
      b[i * 2 + 1] = (c >> 8) & 0xff;
    }
    return b;
  }
  function utf8(s) {
    s = String(s);
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    var esc = unescape(encodeURIComponent(s));
    var b = new Uint8Array(esc.length);
    for (var i = 0; i < esc.length; i++) b[i] = esc.charCodeAt(i) & 0xff;
    return b;
  }
  function b64bytes(b64) {
    var bin = atob(String(b64 || ''));
    var a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }
  function concat(list) {
    var n = 0, i;
    for (i = 0; i < list.length; i++) n += list[i].length;
    var out = new Uint8Array(n), o = 0;
    for (i = 0; i < list.length; i++) { out.set(list[i], o); o += list[i].length; }
    return out;
  }
  function hex8(n) {
    var s = (n >>> 0).toString(16).toUpperCase();
    while (s.length < 8) s = '0' + s;
    return s;
  }
  function stripTagsLocal(html) {
    if (window.App && App.Utils && typeof App.Utils.stripTags === 'function') return App.Utils.stripTags(html);
    return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // ── MAPI property-entry helpers (16 bytes each in __properties) ──
  function pInt(tag, val) {
    var v = new Uint8Array(8);
    v[0] = val & 0xff; v[1] = (val >>> 8) & 0xff; v[2] = (val >>> 16) & 0xff; v[3] = (val >>> 24) & 0xff;
    return { tag: tag >>> 0, flags: 6, val: v };
  }
  function pBool(tag, b) {
    var v = new Uint8Array(8);
    v[0] = b ? 1 : 0;
    return { tag: tag >>> 0, flags: 6, val: v };
  }
  function pVar(tag, size) {
    var v = new Uint8Array(8);
    v[0] = size & 0xff; v[1] = (size >>> 8) & 0xff; v[2] = (size >>> 16) & 0xff; v[3] = (size >>> 24) & 0xff;
    return { tag: tag >>> 0, flags: 6, val: v };
  }
  function propertiesStream(props, header) {
    props = props.slice().sort(function (a, b) { return (a.tag >>> 0) - (b.tag >>> 0); });
    var parts = [header];
    for (var i = 0; i < props.length; i++) {
      var p = props[i];
      var e = new Uint8Array(16);
      e[0] = p.tag & 0xff; e[1] = (p.tag >>> 8) & 0xff; e[2] = (p.tag >>> 16) & 0xff; e[3] = (p.tag >>> 24) & 0xff;
      e[4] = p.flags & 0xff; e[5] = (p.flags >>> 8) & 0xff; e[6] = (p.flags >>> 16) & 0xff; e[7] = (p.flags >>> 24) & 0xff;
      e.set(p.val, 8);
      parts.push(e);
    }
    return concat(parts);
  }
  function topHeader(attachCount) {
    var h = new Uint8Array(32);
    var dv = new DataView(h.buffer);
    dv.setUint32(12, attachCount >>> 0, true); // next attachment id
    dv.setUint32(20, attachCount >>> 0, true); // attachment count
    return h;
  }

  // ── CFB directory-entry name ordering (MS-CFB 2.6.4): shorter first, then uppercase ordinal ──
  function cfbCompare(a, b) {
    if (a.length !== b.length) return a.length - b.length;
    var A = a.toUpperCase(), B = b.toUpperCase();
    return A < B ? -1 : (A > B ? 1 : 0);
  }

  /**
   * buildMsgFile(html, attachments, opts) -> Uint8Array (.msg bytes)
   *   html: email-safe HTML string (already cid-rewritten for images)
   *   attachments: [{ contentId, contentType, base64, filename }]
   *   opts: { subject }
   */
  function buildMsgFile(html, attachments, opts) {
    var subject = (opts && opts.subject) || 'Security Awareness Newsletter';
    var htmlBytes = utf8(html || '');
    var bodyBytes = utf16le(stripTagsLocal(html));
    var atts = (Array.isArray(attachments) ? attachments : []).filter(function (a) { return a && a.contentId && a.base64; });

    // Entry table. id 0 = Root Entry.
    var E = [];
    function add(name, type, data) {
      E.push({
        name: name, type: type, data: data || null,
        size: data ? data.length : 0,
        start: (type === 2 ? ENDOFCHAIN : 0), // streams default empty; storages 0
        left: NOSTREAM, right: NOSTREAM, child: NOSTREAM, color: 1, kids: [], mini: false
      });
      return E.length - 1;
    }
    var root = add('Root Entry', 5, null);

    var topKids = [];
    topKids.push(add('__substg1.0_001A001F', 2, utf16le('IPM.Note')));
    topKids.push(add('__substg1.0_0037001F', 2, utf16le(subject)));
    topKids.push(add('__substg1.0_1000001F', 2, bodyBytes));
    topKids.push(add('__substg1.0_10130102', 2, htmlBytes));

    var topProps = [
      pVar(0x001A001F, utf16le('IPM.Note').length + 2),
      pVar(0x0037001F, utf16le(subject).length + 2),
      pVar(0x1000001F, bodyBytes.length + 2),
      pVar(0x10130102, htmlBytes.length),
      pInt(0x0E070003, 0x8),       // PR_MESSAGE_FLAGS = MSGFLAG_UNSENT (draft)
      pInt(0x3FDE0003, 65001)      // PR_INTERNET_CPID = UTF-8
    ];
    topKids.push(add('__properties_version1.0', 2, propertiesStream(topProps, topHeader(atts.length))));

    for (var ai = 0; ai < atts.length; ai++) {
      var a = atts[ai];
      var data = b64bytes(a.base64);
      var cid = String(a.contentId).replace(/[<>]/g, '');
      var mime = a.contentType || 'application/octet-stream';
      var fname = a.filename || cid;
      var stId = add('__attach_version1.0_#' + hex8(ai), 1, null);
      var ck = [];
      ck.push(add('__substg1.0_37010102', 2, data));         // PR_ATTACH_DATA_BIN
      ck.push(add('__substg1.0_370E001F', 2, utf16le(mime))); // PR_ATTACH_MIME_TAG
      ck.push(add('__substg1.0_3712001F', 2, utf16le(cid)));  // PR_ATTACH_CONTENT_ID
      ck.push(add('__substg1.0_3707001F', 2, utf16le(fname)));// PR_ATTACH_LONG_FILENAME
      var ap = [
        pVar(0x37010102, data.length),
        pVar(0x370E001F, utf16le(mime).length + 2),
        pVar(0x3712001F, utf16le(cid).length + 2),
        pVar(0x3707001F, utf16le(fname).length + 2),
        pInt(0x37050003, 1),            // PR_ATTACH_METHOD = ATTACH_BY_VALUE
        pInt(0x370B0003, 0xFFFFFFFF),   // PR_RENDERING_POSITION = none
        pInt(0x37140003, 0x4),          // PR_ATTACH_FLAGS = ATT_MHTML_REF (inline cid)
        pBool(0x7FFE000B, 1)            // PR_ATTACHMENT_HIDDEN
      ];
      ck.push(add('__properties_version1.0', 2, propertiesStream(ap, new Uint8Array(8))));
      E[stId].kids = ck;
      topKids.push(stId);
    }
    E[root].kids = topKids;

    // Build the red-black-ish BST (balanced, all-black) for each storage's children.
    function buildTree(kids) {
      kids = kids.slice().sort(function (x, y) { return cfbCompare(E[x].name, E[y].name); });
      function bt(arr) {
        if (!arr.length) return NOSTREAM;
        var m = arr.length >> 1, id = arr[m];
        E[id].left = bt(arr.slice(0, m));
        E[id].right = bt(arr.slice(m + 1));
        E[id].color = 1;
        return id;
      }
      return bt(kids);
    }
    for (var i = 0; i < E.length; i++) {
      if (E[i].kids.length) E[i].child = buildTree(E[i].kids);
    }

    // ── Mini stream: small (size>0 && size<CUTOFF) streams ──
    var miniBlocks = [], miniFat = [], miniSectors = 0;
    for (i = 0; i < E.length; i++) {
      var e = E[i];
      if (e.type !== 2 || e.size === 0 || e.size >= CUTOFF) continue;
      var n = Math.ceil(e.size / MSZ);
      e.mini = true;
      e.start = miniSectors;
      for (var k = 0; k < n; k++) miniFat.push(miniSectors + k + 1);
      miniFat[miniFat.length - 1] = ENDOFCHAIN;
      var blk = new Uint8Array(n * MSZ);
      blk.set(e.data);
      miniBlocks.push(blk);
      miniSectors += n;
    }
    var miniStreamBytes = concat(miniBlocks);
    var miniFatBytes = new Uint8Array(miniFat.length * 4);
    (function () { var dv = new DataView(miniFatBytes.buffer); for (var j = 0; j < miniFat.length; j++) dv.setUint32(j * 4, miniFat[j] >>> 0, true); })();

    // ── Regular (FAT) sector blocks: large streams, mini stream, mini FAT, directory ──
    var blocks = []; // { bytes, setStart(s) }
    for (i = 0; i < E.length; i++) {
      var le = E[i];
      if (le.type === 2 && le.size >= CUTOFF) {
        (function (entry) { blocks.push({ bytes: entry.data, set: function (s) { entry.start = s; } }); })(le);
      }
    }
    // mini stream (owned by Root)
    blocks.push({ bytes: miniStreamBytes, set: function (s) { E[root].start = miniStreamBytes.length ? s : ENDOFCHAIN; E[root].size = miniStreamBytes.length; } });
    var miniFatStart = ENDOFCHAIN, miniFatSecs = 0;
    if (miniFatBytes.length) {
      miniFatSecs = Math.ceil(miniFatBytes.length / SSZ);
      blocks.push({ bytes: miniFatBytes, set: function (s) { miniFatStart = s; } });
    }
    // directory (size known from entry count; bytes filled after start sectors assigned)
    var numEntries = E.length;
    var dirSecs = Math.ceil(numEntries / 4);
    var dirBytes = new Uint8Array(dirSecs * SSZ);
    var dirStart = ENDOFCHAIN;
    blocks.push({ bytes: dirBytes, set: function (s) { dirStart = s; } });

    // Assign regular sector numbers.
    var sector = 0, blockSpans = [];
    for (i = 0; i < blocks.length; i++) {
      var len = blocks[i].bytes.length;
      var secs = Math.max(1, Math.ceil(len / SSZ)); // every block gets at least its own sector (dir always >=1; ministream may be 0)
      if (len === 0) { secs = 0; }
      blocks[i].set(secs ? sector : ENDOFCHAIN);
      if (secs) { blockSpans.push({ start: sector, secs: secs }); sector += secs; }
    }
    var D = sector;

    // FAT sizing (no DIFAT sectors; supports up to 109 FAT sectors ≈ 7MB).
    var fatSecs = 1;
    while (true) {
      var totalTmp = D + fatSecs;
      var need = Math.ceil(totalTmp / 128);
      if (need <= fatSecs) { fatSecs = need; break; }
      fatSecs = need;
    }
    if (fatSecs > 109) throw new Error('MSG too large for single-DIFAT layout');
    var fatStart = D;
    var total = D + fatSecs;

    // Build FAT.
    var fat = new Uint32Array(fatSecs * 128);
    for (i = 0; i < fat.length; i++) fat[i] = FREESECT;
    for (i = 0; i < blockSpans.length; i++) {
      var span = blockSpans[i];
      for (k = 0; k < span.secs - 1; k++) fat[span.start + k] = span.start + k + 1;
      fat[span.start + span.secs - 1] = ENDOFCHAIN;
    }
    for (i = 0; i < fatSecs; i++) fat[fatStart + i] = FATSECT;

    // ── Directory bytes ──
    function writeDirEntry(off, e2) {
      var nb = utf16le(e2.name);
      var nbytes = Math.min(nb.length, 62);
      dirBytes.set(nb.subarray(0, nbytes), off);
      var dv = new DataView(dirBytes.buffer, off, ENTRY);
      dv.setUint16(64, Math.min(e2.name.length, 31) * 2 + 2, true); // name length incl null
      dirBytes[off + 66] = e2.type;
      dirBytes[off + 67] = e2.color;
      dv.setUint32(68, e2.left >>> 0, true);
      dv.setUint32(72, e2.right >>> 0, true);
      dv.setUint32(76, e2.child >>> 0, true);
      dv.setUint32(116, e2.start >>> 0, true);
      dv.setUint32(120, e2.size >>> 0, true);
      dv.setUint32(124, 0, true);
    }
    for (i = 0; i < numEntries; i++) writeDirEntry(i * ENTRY, E[i]);
    // Pad trailing directory slots with free entries.
    for (i = numEntries; i < dirSecs * 4; i++) {
      var o = i * ENTRY;
      var dv2 = new DataView(dirBytes.buffer, o, ENTRY);
      dv2.setUint32(68, NOSTREAM, true);
      dv2.setUint32(72, NOSTREAM, true);
      dv2.setUint32(76, NOSTREAM, true);
    }

    // ── Assemble file ──
    var out = new Uint8Array(SSZ * (1 + total));
    var hdr = new DataView(out.buffer, 0, SSZ);
    var SIG = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
    for (i = 0; i < 8; i++) out[i] = SIG[i];
    hdr.setUint16(24, 0x003E, true); // minor version
    hdr.setUint16(26, 0x0003, true); // major version (v3)
    hdr.setUint16(28, 0xFFFE, true); // byte order
    hdr.setUint16(30, 0x0009, true); // sector shift (512)
    hdr.setUint16(32, 0x0006, true); // mini sector shift (64)
    hdr.setUint32(40, 0, true);                       // num directory sectors (0 for v3)
    hdr.setUint32(44, fatSecs, true);                 // num FAT sectors
    hdr.setUint32(48, dirStart >>> 0, true);          // first directory sector
    hdr.setUint32(52, 0, true);                       // transaction signature
    hdr.setUint32(56, CUTOFF, true);                  // mini stream cutoff
    hdr.setUint32(60, miniFatStart >>> 0, true);      // first mini FAT sector
    hdr.setUint32(64, miniFatSecs, true);             // num mini FAT sectors
    hdr.setUint32(68, ENDOFCHAIN, true);              // first DIFAT sector
    hdr.setUint32(72, 0, true);                       // num DIFAT sectors
    for (i = 0; i < 109; i++) hdr.setUint32(76 + i * 4, (i < fatSecs ? (fatStart + i) : FREESECT) >>> 0, true);

    function putAt(startSector, bytes) {
      if (!bytes.length) return;
      out.set(bytes, SSZ * (1 + startSector));
    }
    for (i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (!b.bytes.length) continue;
      // find this block's assigned start via blockSpans order (same order as non-empty blocks)
    }
    // Re-derive non-empty block order to place bytes (blockSpans aligns with non-empty blocks in order).
    var spanIdx = 0;
    for (i = 0; i < blocks.length; i++) {
      if (!blocks[i].bytes.length) continue;
      putAt(blockSpans[spanIdx].start, blocks[i].bytes);
      spanIdx++;
    }
    // FAT sectors.
    var fatOut = new Uint8Array(fat.length * 4);
    var fdv = new DataView(fatOut.buffer);
    for (i = 0; i < fat.length; i++) fdv.setUint32(i * 4, fat[i] >>> 0, true);
    putAt(fatStart, fatOut);

    return out;
  }

  return { buildMsgFile: buildMsgFile };
})();
