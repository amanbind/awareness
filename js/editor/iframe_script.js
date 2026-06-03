/* ═══════════════════════════════════════════════════════════
   editor/iframe_script.js — IFRAME INJECTED SCRIPT
   Serialised via .toString() — executes inside the editor iframe.
   No outer-scope references; communicates with the parent via
   postMessage. Loaded before js/editor.js, which reads the function
   off App.EditorIframeScript.fn and serialises it into the iframe srcdoc.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const W = typeof window !== 'undefined' ? window : globalThis;
  W.App = W.App || {};

  const fn = function () {
    var _sel = null, _edEl = null, _dragEl = null, _dropLine = null, _hoverEl = null, _insideTarget = null;
    // Extra wrappers (shift-multi) that should land beside _dragEl on drop.
    var _dragEntourage = [];
    var _selSet = new Set();

    function post(t, d) {
      try { parent.postMessage(Object.assign({ _nlEd: true, type: t }, d || {}), '*'); } catch (e) {}
    }

    function rgb2hex(s) {
      if (!s || s === 'transparent' || s.indexOf('rgba(0, 0, 0, 0)') !== -1) return '';
      var m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return s.charAt(0) === '#' ? s : '';
      return '#' + [m[1], m[2], m[3]].map(function (v) { return (+v).toString(16).padStart(2, '0'); }).join('');
    }

    function getProps(el) {
      if (!el) return {};
      var cs = window.getComputedStyle(el);
      var fw = el.style.fontWeight || cs.fontWeight;
      var rect = el.getBoundingClientRect();
      var fullText = el.textContent || '';
      // For <img>, also report intrinsic dimensions so the parent can decide
      // whether the Replace-image button should be enabled (hero-image threshold).
      var imgWidth = 0, imgHeight = 0;
      if (el.tagName === 'IMG') {
        imgWidth = el.naturalWidth || el.clientWidth || parseInt(el.getAttribute('width'), 10) || 0;
        imgHeight = el.naturalHeight || el.clientHeight || parseInt(el.getAttribute('height'), 10) || 0;
      }
      return {
        tag: el.tagName,
        text: fullText.replace(/\s+/g, ' ').trim().slice(0, 100),
        textFull: fullText,
        color: el.style.color || rgb2hex(cs.color) || '',
        bgColor: el.style.backgroundColor || rgb2hex(cs.backgroundColor) || '',
        fontSize: parseInt(el.style.fontSize || cs.fontSize) || 14,
        bold: fw === 'bold' || fw === '700' || +fw >= 600,
        italic: (el.style.fontStyle || cs.fontStyle) === 'italic',
        underline: (el.style.textDecoration || cs.textDecoration || '').indexOf('underline') !== -1,
        align: el.style.textAlign || cs.textAlign || 'left',
        width: parseInt(el.style.width) || 0,
        padding: parseInt(el.style.padding) || 0,
        locked: el.getAttribute('data-nl-lock') === '1',
        imgWidth: imgWidth,
        imgHeight: imgHeight,
        rectTop: rect.top, rectLeft: rect.left, rectWidth: rect.width, rectHeight: rect.height
      };
    }

    var _hl = document.createElement('style');
    // Visual contract:
    //   - SELECTION (single or multi) = bold solid gold outline + faint gold bg.
    //     Single and multi look the same so the user can trust "anything gold-
    //     boxed will be acted on" — the right panel shows the count.
    //   - HOVER = thin grey/white solid outline, NO gold, NO dashes. Removed
    //     the dashed-gold style that used to collide visually with selection.
    //   - Drop-inside, lock, contenteditable: unchanged.
    _hl.textContent =
      '[data-nl-sel="1"]{outline:2.5px solid #D4A420!important;outline-offset:3px!important;background:rgba(212,164,32,.08)!important;border-radius:2px}' +
      '[data-nl-multisel="1"]{outline:2.5px solid #D4A420!important;outline-offset:3px!important;background:rgba(212,164,32,.08)!important;border-radius:2px}' +
      '[data-nl-hover="1"]{outline:1px solid rgba(255,255,255,.32)!important;outline-offset:1px!important;background:rgba(255,255,255,.02)!important}' +
      '[data-nl-drop-inside="1"]{box-shadow:inset 0 0 0 2px rgba(212,164,32,.6)!important}' +
      '[data-nl-lock="1"]{position:relative}' +
      '[data-nl-lock="1"]::after{content:"LOCKED";position:absolute;top:4px;right:4px;font-size:10px;background:#8b6b06;color:#fff;padding:1px 4px;border-radius:3px;letter-spacing:.06em}' +
      '[contenteditable="true"]{outline:2px solid rgba(212,164,32,.9)!important;caret-color:#D4A420}' +
      '.nl-drag-ghost{opacity:.35!important;pointer-events:none}';
    document.head.appendChild(_hl);

    function setHl(el, on) {
      if (!el) return;
      if (on) el.setAttribute('data-nl-sel', '1');
      else el.removeAttribute('data-nl-sel');
    }

    function computeDomPathForEl(localEl) {
      if (!localEl || localEl === document.body) return { path: null, relPath: null, locked: false };
      if (localEl.getAttribute('data-nl-lock') === '1') return { path: null, relPath: null, locked: true };
      var path = [];
      var n = localEl;
      while (n && n !== document.body) {
        var p = n.parentElement;
        if (!p) { path = null; break; }
        path.unshift(Array.prototype.indexOf.call(p.children, n));
        n = p;
      }
      var tplRoot = document.querySelector('[data-template-id]');
      var relPath = null;
      if (tplRoot && tplRoot !== localEl && tplRoot.contains(localEl)) {
        relPath = [];
        n = localEl;
        while (n && n !== tplRoot) {
          p = n.parentElement;
          if (!p) { relPath = null; break; }
          relPath.unshift(Array.prototype.indexOf.call(p.children, n));
          n = p;
        }
      }
      return { path: path, relPath: relPath, locked: false };
    }

    function setMulti(el, on) {
      if (!el) return;
      if (on) el.setAttribute('data-nl-multisel', '1');
      else el.removeAttribute('data-nl-multisel');
    }

    function clearMultiSet() {
      _selSet.forEach(function (el) { setMulti(el, false); });
      _selSet.clear();
    }

    function isSelectable(el) {
      if (!el || el === document.body || el === document.documentElement) return false;
      if (el.getAttribute && el.getAttribute('data-nl-lock') === '1') return false;
      return true;
    }

    function isGoldDotCell(td) {
      if (!td || td.tagName !== 'TD') return false;
      if (td.children.length !== 1) return false;
      var c = td.children[0];
      if (c.tagName !== 'DIV') return false;
      var st = c.getAttribute('style') || '';
      return /border-radius:\s*50%/i.test(st);
    }

    function findBulletWrapper(el) {
      if (!el || el === document.body) return el;
      var tr = el;
      while (tr && tr !== document.body && tr.tagName !== 'TR') tr = tr.parentElement;
      if (!tr || tr === document.body) return el;
      var directTds = [];
      for (var i = 0; i < tr.children.length; i++) {
        if (tr.children[i].tagName === 'TD') directTds.push(tr.children[i]);
      }
      if (directTds.length !== 2) return el;
      var dotCell = null, textCell = null;
      if (isGoldDotCell(directTds[0])) { dotCell = directTds[0]; textCell = directTds[1]; }
      else if (isGoldDotCell(directTds[1])) { dotCell = directTds[1]; textCell = directTds[0]; }
      if (!dotCell || !textCell) return el;
      if (textCell !== el && !textCell.contains(el) && dotCell !== el && !dotCell.contains(el)) return el;
      var innerTable = tr.parentElement;
      if (innerTable && innerTable.tagName === 'TABLE') {
        var tdWrap = innerTable.parentElement;
        if (tdWrap && tdWrap.tagName === 'TD' && tdWrap.children.length === 1) {
          var outerTr = tdWrap.parentElement;
          if (outerTr && outerTr.tagName === 'TR') {
            var outerTds = [];
            for (var j = 0; j < outerTr.children.length; j++) {
              if (outerTr.children[j].tagName === 'TD') outerTds.push(outerTr.children[j]);
            }
            if (outerTds.length === 1 && outerTds[0] === tdWrap) return outerTr;
          }
        }
      }
      return tr;
    }

    function doSelect(el, additive) {
      if (!additive) {
        if (_selSet.size) clearMultiSet();
        if (_sel === el) {
          if (_sel) { setHl(_sel, true); _selSet.add(_sel); }
          if (_sel) post('select', Object.assign(getProps(_sel), { multiCount: 1 }));
          return;
        }
        setHl(_sel, false); _sel = el; setHl(_sel, true);
        if (_sel) {
          _selSet.add(_sel);
          post('select', Object.assign(getProps(_sel), { multiCount: 1 }));
        } else {
          post('deselect');
        }
        return;
      }
      if (!isSelectable(el)) return;
      if (_selSet.has(el)) {
        if (el === _sel) {
          setHl(_sel, false);
          _selSet.delete(el);
          var remaining = Array.from(_selSet);
          _sel = remaining.length ? remaining[remaining.length - 1] : null;
          if (_sel) { setMulti(_sel, false); setHl(_sel, true); }
        } else {
          setMulti(el, false);
          _selSet.delete(el);
        }
      } else {
        if (_sel) { setHl(_sel, false); setMulti(_sel, true); }
        _sel = el; setHl(_sel, true);
        _selSet.add(el);
      }
      if (_sel) {
        post('select', Object.assign(getProps(_sel), { multiCount: _selSet.size }));
      } else {
        post('deselect');
      }
    }

    function startEdit(el) {
      if (!el || el === document.body) return;
      if (_edEl && _edEl !== el) { _edEl.removeAttribute('contenteditable'); _edEl.style.cursor = ''; }
      _edEl = el; el.contentEditable = 'true'; el.style.cursor = 'text'; el.focus();
      try {
        var r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      } catch (e) {}
      post('editing', { tag: el.tagName });
    }

    function stopEdit() {
      if (!_edEl) return;
      var el = _edEl;
      _edEl.removeAttribute('contenteditable'); _edEl.style.cursor = ''; _edEl = null;
      var dp = computeDomPathForEl(el);
      post('editDone', {
        path: dp.path,
        relPath: dp.relPath,
        locked: dp.locked,
        textFull: el.textContent || ''
      });
      if (_sel) post('select', getProps(_sel));
    }

    // After removing a node, walk UP and prune any ancestor that became
    // structurally empty (no meaningful content left). Stops before BODY and
    // never touches locked elements. Catches the common case where deleting
    // all bullets in a section leaves an outer card TABLE/TD with padding +
    // border that still reserves vertical space.
    function pruneEmptyAncestors(parent) {
      var node = parent;
      while (node && node !== document.body && node !== document.documentElement) {
        if (node.getAttribute && node.getAttribute('data-nl-lock') === '1') break;
        // Has any non-whitespace text? Keep.
        if ((node.textContent || '').replace(/\s+/g, '') !== '') break;
        // Has any meaningful element children (img/hr/br/input)? Keep.
        var keep = false;
        var kids = node.children || [];
        for (var i = 0; i < kids.length; i++) {
          var k = kids[i];
          var tn = k.tagName;
          if (tn === 'IMG' || tn === 'HR' || tn === 'INPUT' || tn === 'SVG' || tn === 'CANVAS' || tn === 'VIDEO') { keep = true; break; }
        }
        if (keep) break;
        var up = node.parentElement;
        try { node.remove(); } catch (e) { break; }
        node = up;
      }
    }

    function doDelete() {
      if (!_sel || _sel === document.body || _sel === document.documentElement) {
        if (!_selSet.size) return;
      }
      stopEdit();
      var seen = new Set();
      var targets = [];
      function pushTarget(el) {
        if (!isSelectable(el)) return;
        var wrap = findBulletWrapper(el);
        if (!isSelectable(wrap) || seen.has(wrap)) return;
        seen.add(wrap); targets.push(wrap);
      }
      if (_sel) pushTarget(_sel);
      _selSet.forEach(function (el) { if (el !== _sel) pushTarget(el); });
      if (!targets.length) { post('locked', {}); return; }
      var parents = [];
      targets.forEach(function (el) {
        var p = el.parentElement;
        try { setMulti(el, false); el.remove(); parents.push(p); } catch (e) {}
      });
      // Dedupe and prune.
      var seenParents = new Set();
      parents.forEach(function (p) {
        if (!p || seenParents.has(p)) return;
        seenParents.add(p);
        try { pruneEmptyAncestors(p); } catch (e) {}
      });
      _selSet.clear(); _sel = null;
      post('deleted', { count: targets.length }); reportHeight();
    }

    // Resolve the actual block-level target for move/drag/duplicate. _sel is
    // often the inner text element (TD/SPAN/P); we need the bullet row wrapper
    // (TR) so siblings exist at the right structural level.
    function resolveBlockTarget() {
      if (!_sel || _sel === document.body || _sel === document.documentElement) return null;
      var t = findBulletWrapper(_sel);
      if (!t || t === document.body) t = _sel;
      return t;
    }

    // Collect distinct block-level wrappers for every currently selected
    // element (primary + shift-selected). Filters out locked, sorts in
    // document order. Returns [] if no usable targets.
    function collectBlockTargets() {
      var seen = new Set();
      var out = [];
      function push(el) {
        if (!el || el === document.body || el === document.documentElement) return;
        var w = findBulletWrapper(el);
        if (!w || w === document.body) w = el;
        if (!w || seen.has(w)) return;
        if (w.getAttribute && w.getAttribute('data-nl-lock') === '1') return;
        seen.add(w); out.push(w);
      }
      if (_sel) push(_sel);
      _selSet.forEach(function (el) { if (el !== _sel) push(el); });
      // Sort in document order so shift-style multi-move works predictably.
      out.sort(function (a, b) {
        if (a === b) return 0;
        var p = a.compareDocumentPosition(b);
        if (p & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (p & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      });
      return out;
    }

    function stripUiMarkers(root) {
      if (!root) return;
      try {
        root.removeAttribute('data-nl-ed-sel');
        root.removeAttribute('data-nl-ed-multi');
        root.removeAttribute('data-nl-hover');
        root.removeAttribute('data-nl-regen-pending');
        root.querySelectorAll('[data-nl-ed-sel],[data-nl-ed-multi],[data-nl-hover],[data-nl-regen-pending]').forEach(function (n) {
          n.removeAttribute('data-nl-ed-sel');
          n.removeAttribute('data-nl-ed-multi');
          n.removeAttribute('data-nl-hover');
          n.removeAttribute('data-nl-regen-pending');
        });
      } catch (e) {}
    }

    function doMove(dir) {
      var targets = collectBlockTargets();
      if (!targets.length) { post('locked', {}); return; }
      var anyMoved = false;
      // Up: process top→bottom so each gets a chance to leapfrog upward.
      // Down: process bottom→top for the same reason in reverse.
      var seq = dir === 'down' ? targets.slice().reverse() : targets;
      for (var i = 0; i < seq.length; i++) {
        var t = seq[i];
        if (dir === 'up' && t.previousElementSibling) {
          t.parentNode.insertBefore(t, t.previousElementSibling); anyMoved = true;
        } else if (dir === 'down' && t.nextElementSibling) {
          t.parentNode.insertBefore(t.nextElementSibling, t); anyMoved = true;
        }
      }
      if (!anyMoved) { post('locked', { reason: 'edge' }); return; }
      var anchor = targets[0];
      try { anchor.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
      reportHeight(); post('moved', {});
    }

    function doDuplicate() {
      var targets = collectBlockTargets();
      if (!targets.length) { post('locked', {}); return; }
      // Clone each in document order, insert directly after the original. Then
      // clear current selection and re-select all clones so shift-style group
      // operations stay coherent.
      var clones = [];
      targets.forEach(function (t) {
        var copy = t.cloneNode(true);
        stripUiMarkers(copy);
        t.parentNode.insertBefore(copy, t.nextSibling);
        clones.push(copy);
      });
      if (clones.length) {
        clearMultiSet();
        setHl(_sel, false);
        _sel = clones[0];
        setHl(_sel, true);
        _selSet.add(_sel);
        for (var j = 1; j < clones.length; j++) {
          setMulti(clones[j], true);
          _selSet.add(clones[j]);
        }
        try { _sel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
        post('select', Object.assign(getProps(_sel), { multiCount: _selSet.size }));
      }
      reportHeight(); post('added', {});
    }

    function doLockToggle() {
      if (!_sel || _sel === document.body) return;
      if (_sel.getAttribute('data-nl-lock') === '1') _sel.removeAttribute('data-nl-lock');
      else _sel.setAttribute('data-nl-lock', '1');
      post('select', getProps(_sel));
    }

    function doAddEl(html) {
      var tmp = document.createElement('div'); tmp.innerHTML = html;
      var newEl = tmp.firstElementChild || tmp;
      if (_sel && _sel.parentNode) _sel.parentNode.insertBefore(newEl, _sel.nextSibling || null);
      else { var root = document.body.firstElementChild || document.body; root.appendChild(newEl); }
      doSelect(newEl);
      newEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      reportHeight(); post('added', {});
    }

    function doAddSec(html) {
      var tmp = document.createElement('div'); tmp.innerHTML = html;
      var newEl = tmp.firstElementChild || tmp;
      var root = document.body.firstElementChild || document.body;
      root.appendChild(newEl);
      doSelect(newEl);
      newEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      reportHeight(); post('added', {});
    }

    function setTextPreservingInlineMarkup(el, nextText) {
      if (!el) return;
      var text = String(nextText == null ? '' : nextText);
      if (!el.children || !el.children.length) {
        el.textContent = text;
        return;
      }
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      var textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      if (!textNodes.length) {
        el.textContent = text;
        return;
      }
      var remaining = text;
      for (var i = 0; i < textNodes.length; i += 1) {
        var n = textNodes[i];
        if (i === textNodes.length - 1) {
          n.nodeValue = remaining;
          remaining = '';
        } else {
          var curLen = (n.nodeValue || '').length;
          n.nodeValue = remaining.slice(0, curLen);
          remaining = remaining.slice(curLen);
        }
      }
    }

    _dropLine = document.createElement('div');
    _dropLine.style.cssText = 'height:3px;background:#D4A420;border-radius:2px;pointer-events:none;display:none;margin:1px 0;box-shadow:0 0 6px rgba(212,164,32,.5)';
    document.body.appendChild(_dropLine);

    document.addEventListener('dragstart', function (e) {
      if (e.target !== _dragEl) return;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '1');
      setTimeout(function () { if (_dragEl) _dragEl.classList.add('nl-drag-ghost'); }, 0);
      _dropLine.style.display = '';
    });

    document.addEventListener('dragover', function (e) {
      if (!_dragEl) return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      var t = e.target;
      while (t && t !== document.body && t === _dragEl) t = t.parentNode;
      if (t && t !== _dragEl && !_dragEl.contains(t)) {
        if (_insideTarget) _insideTarget.removeAttribute('data-nl-drop-inside');
        var rect = t.getBoundingClientRect();
        var zoneTop = rect.top + rect.height * 0.25;
        var zoneBottom = rect.top + rect.height * 0.75;
        if (e.clientY >= zoneTop && e.clientY <= zoneBottom && t !== document.body) {
          _insideTarget = t;
          t.setAttribute('data-nl-drop-inside', '1');
          _dropLine.style.display = 'none';
        } else {
          _insideTarget = null;
          _dropLine.style.display = '';
          if (e.clientY < rect.top + rect.height / 2) t.parentNode.insertBefore(_dropLine, t);
          else t.parentNode.insertBefore(_dropLine, t.nextSibling);
        }
      }
    });

    document.addEventListener('drop', function (e) {
      if (!_dragEl) return;
      e.preventDefault();
      if (_insideTarget && _insideTarget !== _dragEl && !_dragEl.contains(_insideTarget)) {
        _insideTarget.appendChild(_dragEl);
      } else if (_dropLine.parentNode) {
        _dropLine.parentNode.insertBefore(_dragEl, _dropLine);
      }
      // Tow the rest of the multi-selection in document order directly after
      // the dropped primary so a shift-drag keeps the group contiguous.
      var anchor = _dragEl;
      _dragEntourage.forEach(function (n) {
        try {
          if (n === anchor || anchor.contains(n)) return;
          n.classList.remove('nl-drag-ghost');
          anchor.parentNode.insertBefore(n, anchor.nextSibling);
          anchor = n;
        } catch (err) {}
      });
      _dragEntourage = [];
      if (_insideTarget) _insideTarget.removeAttribute('data-nl-drop-inside');
      _insideTarget = null;
      _dragEl.classList.remove('nl-drag-ghost');
      _dragEl.removeAttribute('draggable');
      _dragEl = null; _dropLine.style.display = 'none';
      reportHeight(); post('moved', {});
    });

    document.addEventListener('dragend', function () {
      if (_dragEl) { _dragEl.classList.remove('nl-drag-ghost'); _dragEl.removeAttribute('draggable'); _dragEl = null; }
      _dragEntourage.forEach(function (n) { n.classList.remove('nl-drag-ghost'); });
      _dragEntourage = [];
      if (_insideTarget) _insideTarget.removeAttribute('data-nl-drop-inside');
      _insideTarget = null;
      _dropLine.style.display = 'none';
    });

    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || t === document.body || t === document.documentElement) { stopEdit(); doSelect(null); return; }
      if (_edEl && _edEl.contains(t)) return;
      if (_edEl && !_edEl.contains(t)) stopEdit();
      doSelect(t, !!e.shiftKey);
    }, true);

    document.addEventListener('dblclick', function (e) {
      var t = e.target;
      if (!t || t === document.body) return;
      if (t.getAttribute('data-nl-lock') === '1') return;
      e.preventDefault();
      if (_selSet.size > 1) clearMultiSet();
      doSelect(t, false);
      startEdit(t);
    }, true);

    document.addEventListener('mousemove', function (e) {
      var t = e.target;
      if (_hoverEl && _hoverEl !== _sel) _hoverEl.removeAttribute('data-nl-hover');
      if (t && t !== document.body && t !== _sel) { t.setAttribute('data-nl-hover', '1'); _hoverEl = t; }
    }, true);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { if (_edEl) stopEdit(); else doSelect(null); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && _sel && !_edEl &&
          document.activeElement === document.body) { e.preventDefault(); doDelete(); }
    });

    document.addEventListener('input', function () {
      if (!_sel) return;
      var p = getProps(_sel);
      // Tag input-driven updates so the parent can fold a typing burst into
      // one undo entry instead of one-per-keystroke.
      p.fromTyping = true;
      post('update', p);
    });

    function reportHeight() {
      var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight);
      post('height', { h: h });
    }
    if (window.ResizeObserver) new ResizeObserver(function () { reportHeight(); }).observe(document.body);
    window.addEventListener('load', reportHeight);
    setTimeout(reportHeight, 300); setTimeout(reportHeight, 1200); setTimeout(reportHeight, 3000);

    function getActiveRangeInside(el) {
      if (!el) return null;
      var sel = (el.ownerDocument || document).getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      var range = sel.getRangeAt(0);
      if (range.collapsed) return null;
      if (!el.contains(range.commonAncestorContainer)) return null;
      return range;
    }
    function wrapRangeWithStyle(range, styles) {
      if (!range) return null;
      var doc = range.startContainer.ownerDocument || document;
      var span = doc.createElement('span');
      Object.keys(styles).forEach(function (k) {
        var v = styles[k];
        if (v !== undefined && v !== null && v !== '') span.style[k] = v;
      });
      try { range.surroundContents(span); }
      catch (err) {
        var frag = range.extractContents();
        span.appendChild(frag);
        range.insertNode(span);
      }
      var newRange = doc.createRange();
      newRange.selectNodeContents(span);
      var sel2 = doc.getSelection();
      if (sel2) { sel2.removeAllRanges(); sel2.addRange(newRange); }
      return span;
    }

    window.addEventListener('message', function (e) {
      // Only accept commands from the embedding parent window. The srcdoc
      // iframe and the parent share origin; source-identity is the most
      // reliable check (event.origin can be "null" for srcdoc iframes).
      if (e.source !== window.parent) return;
      var d = e.data; if (!d || !d._nlEd) return;
      switch (d.cmd) {
        case 'color':
          if (_sel) {
            var rngC = getActiveRangeInside(_sel);
            if (rngC) wrapRangeWithStyle(rngC, { color: d.v });
            else _sel.style.color = d.v;
            post('select', getProps(_sel));
          }
          break;
        case 'bg':       if (_sel) { _sel.style.backgroundColor = d.v || ''; post('select', getProps(_sel)); } break;
        case 'size':
          if (_sel) {
            var rngS = getActiveRangeInside(_sel);
            if (rngS) wrapRangeWithStyle(rngS, { fontSize: d.v + 'px' });
            else _sel.style.fontSize = d.v + 'px';
            post('select', getProps(_sel));
          }
          break;
        case 'bold':
          if (_sel) {
            var rngB = getActiveRangeInside(_sel);
            if (rngB) wrapRangeWithStyle(rngB, { fontWeight: 'bold' });
            else _sel.style.fontWeight = (_sel.style.fontWeight === 'bold' || _sel.style.fontWeight === '700') ? '' : 'bold';
            post('select', getProps(_sel));
          }
          break;
        case 'italic':
          if (_sel) {
            var rngI = getActiveRangeInside(_sel);
            if (rngI) wrapRangeWithStyle(rngI, { fontStyle: 'italic' });
            else _sel.style.fontStyle = _sel.style.fontStyle === 'italic' ? '' : 'italic';
            post('select', getProps(_sel));
          }
          break;
        case 'underline':
          if (_sel) {
            var rngU = getActiveRangeInside(_sel);
            if (rngU) wrapRangeWithStyle(rngU, { textDecoration: 'underline' });
            else { var td = _sel.style.textDecoration || ''; _sel.style.textDecoration = td.indexOf('underline') !== -1 ? td.replace('underline', '').trim() : (td ? td + ' underline' : 'underline'); }
            post('select', getProps(_sel));
          }
          break;
        case 'align':    if (_sel) { _sel.style.textAlign = d.v; post('select', getProps(_sel)); } break;
        case 'text':     if (_sel) { setTextPreservingInlineMarkup(_sel, d.v); post('select', getProps(_sel)); reportHeight(); } break;
        case 'width':    if (_sel) { _sel.style.width = d.v ? d.v + 'px' : ''; post('select', getProps(_sel)); reportHeight(); } break;
        case 'padding':  if (_sel) { _sel.style.padding = d.v ? d.v + 'px' : ''; post('select', getProps(_sel)); reportHeight(); } break;
        case 'delete':   doDelete(); break;
        case 'moveUp':   doMove('up'); break;
        case 'moveDown': doMove('down'); break;
        case 'duplicate': doDuplicate(); break;
        case 'lockToggle': doLockToggle(); break;
        case 'replaceImageSrc': {
          // Swap the selected <img>'s src. Used by the editor's "Replace image"
          // modal. The parent owns the data URI (computed from a Blob); the
          // iframe just applies it to _sel.
          if (!_sel || _sel.tagName !== 'IMG') break;
          var newSrc = (d.v && typeof d.v.dataUri === 'string') ? d.v.dataUri : '';
          if (!newSrc) break;
          _sel.setAttribute('src', newSrc);
          // Re-emit selection so the parent picks up the new naturalWidth/Height
          // once the image loads. setTimeout 0 to let the browser resolve the src.
          setTimeout(function () { post('select', getProps(_sel)); reportHeight(); }, 0);
          break;
        }
        case 'addEl':    doAddEl(d.v); break;
        case 'addSec':   doAddSec(d.v); break;
        case 'preset':
          if (_sel) {
            if (d.v === 'heading') { _sel.style.fontFamily = "'DM Serif Display', Georgia, serif"; _sel.style.fontWeight = '700'; _sel.style.fontSize = '28px'; _sel.style.lineHeight = '1.2'; }
            if (d.v === 'body') { _sel.style.fontFamily = "'DM Sans', sans-serif"; _sel.style.fontWeight = '400'; _sel.style.fontSize = '14px'; _sel.style.lineHeight = '1.6'; _sel.style.color = '#333333'; }
            if (d.v === 'cta') { _sel.style.background = 'linear-gradient(135deg,#C09010,#A07808)'; _sel.style.color = '#ffffff'; _sel.style.padding = '10px 20px'; _sel.style.borderRadius = '6px'; _sel.style.display = 'inline-block'; _sel.style.fontWeight = '700'; }
            if (d.v === 'accent') { _sel.style.backgroundColor = '#FEF3E0'; _sel.style.borderLeft = '4px solid #D4A420'; _sel.style.padding = '14px'; _sel.style.borderRadius = '4px'; }
            post('select', getProps(_sel));
          }
          break;
        case 'enableDrag': {
          var dragTargets = collectBlockTargets();
          if (dragTargets.length) {
            _dragEl = dragTargets[0];
            _dragEntourage = dragTargets.slice(1);
            _dragEl.setAttribute('draggable', 'true');
            _dragEntourage.forEach(function (n) { n.classList.add('nl-drag-ghost'); });
            post('dragReady', {});
          }
          break;
        }
        case 'deselect': stopEdit(); doSelect(null); break;
        case 'getDomPath': {
          if (!_sel || _sel === document.body) { post('domPath', { path: null, relPath: null }); break; }
          var wrapSel = findBulletWrapper(_sel);
          var dp = computeDomPathForEl(wrapSel);
          if (dp.locked) { post('domPath', { path: null, relPath: null, locked: true }); break; }
          post('domPath', { path: dp.path, relPath: dp.relPath });
          break;
        }
        case 'getDomPaths': {
          var seenWrap = new Set();
          var items = [];
          function addPath(el) {
            if (!isSelectable(el)) return;
            var w = findBulletWrapper(el);
            if (!isSelectable(w) || seenWrap.has(w)) return;
            seenWrap.add(w);
            var dpX = computeDomPathForEl(w);
            if (!dpX.locked && dpX.path) items.push({ path: dpX.path, relPath: dpX.relPath, locked: false });
          }
          if (_sel) addPath(_sel);
          _selSet.forEach(function (el) { if (el !== _sel) addPath(el); });
          post('domPaths', { items: items });
          break;
        }
        case 'getCleanHtml': {
          var sels = document.querySelectorAll('[data-nl-sel]');
          sels.forEach(function (el) { el.removeAttribute('data-nl-sel'); });
          var multis = document.querySelectorAll('[data-nl-multisel]');
          multis.forEach(function (el) { el.removeAttribute('data-nl-multisel'); });
          var savedEdEl = _edEl;
          if (savedEdEl) { savedEdEl.removeAttribute('contenteditable'); savedEdEl.style.cursor = ''; }
          document.querySelectorAll('[style*="cursor: text"]').forEach(function (el) { el.style.cursor = ''; });
          document.querySelectorAll('#nl-qr canvas').forEach(function (el) { el.remove(); });
          post('cleanHtml', { html: document.body.innerHTML });
          sels.forEach(function (el) { el.setAttribute('data-nl-sel', '1'); });
          multis.forEach(function (el) { el.setAttribute('data-nl-multisel', '1'); });
          if (savedEdEl) { savedEdEl.contentEditable = 'true'; savedEdEl.style.cursor = 'text'; }
          break;
        }
        case 'getSelectionTexts': {
          // Collect plain text of the current selection (single or multi) in
          // document order. Tag each target with data-nl-regen-pending="<idx>"
          // so applySelectionTexts can find them again without path math.
          //
          // IMPORTANT: regenerate walks DOWN to the deepest text-bearing leaf
          // (skipping gold-bullet sibling cells), unlike delete which climbs
          // UP via findBulletWrapper. Otherwise replacing textContent on a
          // bullet row would wipe the gold dot and reset inline color styles.
          document.querySelectorAll('[data-nl-regen-pending]').forEach(function (el) {
            el.removeAttribute('data-nl-regen-pending');
          });
          function findRegenTarget(start) {
            var node = start;
            while (node && node.children && node.children.length > 0) {
              // Bullet-row pattern: TR (or container) with 2 TD children, one
              // is the gold dot. Pick the text TD so regen leaves the dot alone.
              if (node.children.length === 2 &&
                  node.children[0].tagName === 'TD' && node.children[1].tagName === 'TD') {
                if (isGoldDotCell(node.children[0])) { node = node.children[1]; continue; }
                if (isGoldDotCell(node.children[1])) { node = node.children[0]; continue; }
              }
              // Otherwise descend into the child with the most text content so
              // we land on whichever element actually carries the styled copy.
              var bestChild = null;
              var bestLen = -1;
              for (var i = 0; i < node.children.length; i++) {
                var c = node.children[i];
                if (c.tagName === 'BR' || c.tagName === 'IMG' || c.tagName === 'HR') continue;
                var t = (c.textContent || '').trim().length;
                if (t > bestLen) { bestLen = t; bestChild = c; }
              }
              if (!bestChild || bestLen <= 0) break;
              node = bestChild;
            }
            return node;
          }
          var targets = [];
          var seen = new Set();
          function pushTarget(el) {
            if (!isSelectable(el)) return;
            var leaf = findRegenTarget(el);
            if (!leaf || seen.has(leaf)) return;
            seen.add(leaf); targets.push(leaf);
          }
          if (_sel) pushTarget(_sel);
          _selSet.forEach(function (el) { if (el !== _sel) pushTarget(el); });
          // Document order so multi-select (which builds in click order) lines up
          // with how the user reads them — important for the AI to keep flow.
          targets.sort(function (a, b) {
            if (a === b) return 0;
            var pos = a.compareDocumentPosition(b);
            if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
            if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
            return 0;
          });
          var regenItems = targets.map(function (el, idx) {
            el.setAttribute('data-nl-regen-pending', String(idx));
            // path/relPath let the parent update the SAME element in a sibling
            // language variant (used by the "all languages" regen flow).
            var dp = computeDomPathForEl(el);
            // Snapshot the effective text colour BEFORE regen. We force-set it
            // as inline style after replacing textContent so the new text
            // looks identical to the old one even if the colour was carried
            // by a child <span> that gets wiped on textContent assignment.
            var snapshotColor = '';
            try {
              var cs = window.getComputedStyle(el);
              snapshotColor = (el.style && el.style.color) || (cs && cs.color) || '';
            } catch (e) {}
            return {
              idx: idx,
              text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
              path: Array.isArray(dp.path) ? dp.path : null,
              relPath: Array.isArray(dp.relPath) ? dp.relPath : null,
              locked: !!dp.locked,
              color: snapshotColor
            };
          });
          post('selectionTexts', { items: regenItems });
          break;
        }
        case 'applySelectionTexts': {
          var incoming = (d.v && Array.isArray(d.v.items)) ? d.v.items : [];
          var applied = 0;
          incoming.forEach(function (item) {
            if (!item || typeof item.idx !== 'number') return;
            var el = document.querySelector('[data-nl-regen-pending="' + item.idx + '"]');
            if (!el) return;
            // Capture effective colour BEFORE we wipe child elements via
            // textContent. If the colour was carried by an inner <span>, that
            // span is about to disappear — we want the new text to look the
            // same gold/whatever it was, so we force the inline colour back
            // onto the leaf after the swap.
            var preserveColor = '';
            try {
              var cs = window.getComputedStyle(el);
              preserveColor = (el.style && el.style.color) || (cs && cs.color) || '';
            } catch (e) {}
            el.textContent = String(item.text == null ? '' : item.text);
            if (preserveColor && !el.style.color) {
              el.style.color = preserveColor;
            }
            el.removeAttribute('data-nl-regen-pending');
            applied += 1;
          });
          // Belt-and-braces: any leftover markers should be cleared so the next
          // getCleanHtml call doesn't ship them into the saved workspace.
          document.querySelectorAll('[data-nl-regen-pending]').forEach(function (el) {
            el.removeAttribute('data-nl-regen-pending');
          });
          reportHeight();
          post('selectionApplied', { applied: applied });
          break;
        }
        case 'clearRegenPending': {
          document.querySelectorAll('[data-nl-regen-pending]').forEach(function (el) {
            el.removeAttribute('data-nl-regen-pending');
          });
          break;
        }
      }
    });

    post('ready'); reportHeight();
  };

  W.App.EditorIframeScript = { fn };
})();
