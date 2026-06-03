/* ═══════════════════════════════════════════════════════════
   editor.js — Newsletter Studio Editor Module  v2
   Self-contained: inject CSS + HTML, expose App.Editor API.
   ui_controller.js calls App.Editor.open(opts) with callbacks.
   ═══════════════════════════════════════════════════════════ */
window.App = window.App || {};
App.Editor = (function () {
  'use strict';

  /* ────────────────────────────────────────────────────────
     PRESET BLOCKS — inserted into the newsletter via Add panel
     ──────────────────────────────────────────────────────── */
  const ELEMS = [
    { icon: 'H',  label: 'Heading',    html: `<div style="font-family:'DM Serif Display',Georgia,serif;font-size:1.4rem;color:#0A0A0A;font-weight:700;line-height:1.2;padding:.3rem 0 .5rem">New Heading</div>` },
    { icon: '¶',  label: 'Paragraph',  html: `<p style="font-size:.86rem;color:#333;line-height:1.65;margin:.4rem 0">Click to edit this paragraph. Double-click to type.</p>` },
    { icon: '→',  label: 'Button',     html: `<a href="#" style="display:inline-block;background:linear-gradient(135deg,#C09010,#A07808);color:white;font-weight:700;font-size:.78rem;padding:.6rem 1.4rem;border-radius:5px;text-decoration:none;margin:.5rem 0;word-break:break-all;max-width:100%;box-sizing:border-box">Click Here</a>` },
    { icon: '—',  label: 'Divider',    html: `<hr style="border:none;border-top:2px solid #E8E2D6;margin:1.2rem 0">` },
    { icon: '⚠',  label: 'Alert Box',  html: `<div style="background:#FEF3E0;border-left:4px solid #D4A420;padding:1rem 1.2rem;margin:.8rem 0;border-radius:0 6px 6px 0"><div style="font-size:.52rem;letter-spacing:.12em;text-transform:uppercase;color:#B8860B;font-weight:700;margin-bottom:.3rem">Important</div><p style="font-size:.82rem;color:#333;line-height:1.5;margin:0">Alert message here. Double-click to edit.</p></div>` },
    { icon: '■',  label: 'Dark Box',   html: `<div style="background:#0A0A0A;color:white;padding:1.2rem 1.5rem;border-radius:6px;margin:.8rem 0"><div style="font-size:.52rem;letter-spacing:.12em;text-transform:uppercase;color:#D4A420;font-weight:700;margin-bottom:.4rem">Section</div><p style="font-size:.82rem;color:rgba(255,255,255,.7);line-height:1.55;margin:0">Content here.</p></div>` },
    { icon: '•',  label: 'Bullet List',html: `<ul style="list-style:none;margin:.4rem 0;padding:0"><li style="font-size:.84rem;color:#333;padding:.25rem 0 .25rem 1rem;position:relative;line-height:1.4"><span style="position:absolute;left:0;color:#B8860B;font-weight:700">›</span>First item</li><li style="font-size:.84rem;color:#333;padding:.25rem 0 .25rem 1rem;position:relative;line-height:1.4"><span style="position:absolute;left:0;color:#B8860B;font-weight:700">›</span>Second item</li></ul>` },
    { icon: '🖼', label: 'Image',      html: `<div style="background:#E8E2D6;border:2px dashed #C8BEA8;border-radius:6px;padding:2.5rem;text-align:center;margin:.6rem 0;color:#888;font-size:.78rem;font-style:italic">Image placeholder — select and edit src in browser devtools</div>` },
  ];

  const SECTIONS = [
    { icon: '◼', label: 'Dark Header',  html: `<div style="background:#0A0A0A;padding:2rem 2.5rem"><div style="font-size:.52rem;letter-spacing:.22em;text-transform:uppercase;color:rgba(212,164,32,.7);font-weight:700;margin-bottom:.5rem">NEW SECTION</div><div style="font-family:'DM Serif Display',Georgia,serif;font-size:1.8rem;color:white;line-height:1.1">Section Heading</div><p style="font-size:.72rem;color:rgba(255,255,255,.4);margin-top:.3rem;line-height:1.5">Supporting subtitle text.</p></div>` },
    { icon: '□', label: 'Light Card',   html: `<div style="background:#F8F5EF;padding:1.5rem 2.2rem;border-bottom:1px solid #E8E2D6"><div style="font-family:'DM Serif Display',Georgia,serif;font-size:1.1rem;color:#0A0A0A;margin-bottom:.5rem">Card Title</div><p style="font-size:.84rem;color:#333;line-height:1.65;margin:0">Card body content. Double-click to edit.</p></div>` },
    { icon: '◈', label: 'Gold Strip',   html: `<div style="background:#C09010;color:white;text-align:center;padding:.55rem 2rem;font-size:.64rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase">⚠ IMPORTANT NOTICE — CLICK TO EDIT</div>` },
    { icon: '⬡', label: 'Two Columns',  html: `<div style="background:#F8F5EF;padding:1.5rem 2rem;display:flex;gap:1.5rem;flex-wrap:wrap"><div style="flex:1;min-width:160px"><div style="font-size:.52rem;letter-spacing:.1em;text-transform:uppercase;color:#B8860B;font-weight:700;margin-bottom:.3rem">Left Column</div><p style="font-size:.82rem;color:#444;line-height:1.5;margin:0">Left column content.</p></div><div style="flex:1;min-width:160px"><div style="font-size:.52rem;letter-spacing:.1em;text-transform:uppercase;color:#B8860B;font-weight:700;margin-bottom:.3rem">Right Column</div><p style="font-size:.82rem;color:#444;line-height:1.5;margin:0">Right column content.</p></div></div>` },
    { icon: '▬', label: 'Red Warning',  html: `<div style="background:#C0392B;color:white;padding:1.2rem 2rem"><div style="font-family:'DM Serif Display',Georgia,serif;font-size:1rem;margin-bottom:.3rem">⚠ Security Warning</div><p style="font-size:.78rem;color:rgba(255,255,255,.8);margin:0;line-height:1.5">Important security notice content here.</p></div>` },
    { icon: '◻', label: 'Quote Block',  html: `<blockquote style="border-left:4px solid #C09010;margin:1rem 0;padding:.8rem 1.2rem;background:#FAFAF7"><p style="font-family:'DM Serif Display',Georgia,serif;font-size:1rem;color:#333;font-style:italic;line-height:1.5;margin:0 0 .3rem">"Key insight or important quote goes here."</p><cite style="font-size:.72rem;color:#888;font-style:normal">— Source</cite></blockquote>` },
  ];

  /* ────────────────────────────────────────────────────────
     CSS — injected into <head> once at init
     ──────────────────────────────────────────────────────── */
  const CSS = `
/* Above App.UXContract .ux-shell (z-index 999) so the editor top bar Save/Export controls stay visible */
#editor-modal{display:none;position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,.92)}
#editor-modal.active{display:flex}
.editor-wrap{width:100vw;height:100vh;display:flex;flex-direction:column;background:#0c0c0c}
.ed-topbar{flex-shrink:0;display:flex;align-items:center;gap:.42rem;flex-wrap:wrap;padding:.4rem .75rem;background:#080808;border-bottom:1px solid rgba(255,255,255,.08)}
.ed-brand{font-size:.6rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#D4A420;white-space:nowrap}
.ed-sep{width:1px;height:16px;background:rgba(255,255,255,.1);flex-shrink:0}
.ed-device-pills{display:flex;gap:.16rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:.14rem}
.ed-dpill{background:transparent;border:none;color:#888;font-family:'DM Sans',sans-serif;font-size:.62rem;padding:.25rem .5rem;border-radius:4px;cursor:pointer;transition:all .14s;white-space:nowrap}
.ed-dpill:hover{color:#fff;background:rgba(255,255,255,.07)}
.ed-dpill.active{background:rgba(184,134,11,.22);color:#D4A420}
.ed-tbtn{background:transparent;border:1px solid rgba(255,255,255,.12);color:#ccc;font-family:'DM Sans',sans-serif;font-size:.67rem;padding:.3rem .62rem;border-radius:5px;cursor:pointer;transition:all .14s;white-space:nowrap}
.ed-tbtn:hover{border-color:rgba(255,255,255,.28);color:#fff}
.ed-tbtn--preview{color:#D4A420;border-color:rgba(184,134,11,.3)}
.ed-tbtn--preview:hover{background:rgba(184,134,11,.1)}
.ed-tbtn--save{background:linear-gradient(135deg,#C09010,#A07808);color:#fff;border-color:transparent;font-weight:700}
.ed-tbtn--save:hover{background:linear-gradient(135deg,#D4A420,#B88C10)}
.ed-tbtn--close{color:#888}
.ed-tbtn--close:hover{color:#C0392B;border-color:rgba(192,57,43,.4)}
.ed-tbtn--export{color:rgba(255,255,255,.72);border-color:rgba(255,255,255,.14);font-weight:500}
.ed-tbtn--export:hover{border-color:rgba(212,164,32,.4);color:#f0e6cc;background:rgba(212,164,32,.07)}
.ed-tbtn-group{display:inline-flex;flex-wrap:wrap;align-items:stretch;gap:0;border-radius:7px;border:1px solid rgba(255,255,255,.1);overflow:hidden;background:rgba(255,255,255,.03)}
.ed-tbtn-group .ed-tbtn{border-radius:0;border-width:0 1px 0 0;margin:0;padding:.32rem .55rem;font-size:.62rem;min-height:2.05rem;align-items:center;display:inline-flex;justify-content:center}
.ed-tbtn-group .ed-tbtn:first-child{border-top-left-radius:6px;border-bottom-left-radius:6px}
.ed-tbtn-group .ed-tbtn:last-child{border-right-width:0;border-top-right-radius:6px;border-bottom-right-radius:6px}
.ed-status{font-size:.58rem;color:#D4A420;border:1px solid rgba(184,134,11,.28);border-radius:4px;padding:.16rem .38rem;white-space:nowrap}
.ed-spacer{flex:1;min-width:.25rem}
.ed-body{flex:1;display:flex;min-height:0;overflow:hidden}
.ed-nav{width:260px;flex-shrink:0;background:#0e0e0e;border-right:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;overflow:hidden}
.ed-nav-tabs{display:flex;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.07)}
.ed-nav-tab{flex:1;padding:.45rem .5rem;font-size:.58rem;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.36);background:transparent;border:none;border-bottom:2px solid transparent;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .14s}
.ed-nav-tab:hover{color:rgba(255,255,255,.65)}
.ed-nav-tab.active{color:#D4A420;border-bottom-color:#C09010}
.ed-nav-pane{flex:1;overflow-y:auto;display:none}
.ed-nav-pane.active{display:block}
.ed-nav-sec-head{padding:.5rem .72rem .2rem;font-size:.46rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(212,164,32,.5);font-weight:700}
.ed-nav-item{padding:.38rem .72rem;font-size:.7rem;color:rgba(255,255,255,.48);cursor:pointer;transition:all .12s;border-left:2px solid transparent;border-bottom:1px solid rgba(255,255,255,.04);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ed-nav-item:hover{color:#fff;background:rgba(255,255,255,.04);border-left-color:rgba(212,164,32,.4)}
.ed-palette-item{display:flex;align-items:center;gap:.5rem;padding:.38rem .72rem;font-size:.7rem;color:rgba(255,255,255,.55);cursor:pointer;transition:all .12s;border-bottom:1px solid rgba(255,255,255,.04)}
.ed-palette-item:hover{color:#fff;background:rgba(184,134,11,.1)}
.ed-palette-icon{width:22px;height:22px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:.65rem;flex-shrink:0;color:#D4A420}
.ed-canvas-col{flex:1;display:flex;flex-direction:column;min-width:0;background:#141414}
.ed-canvas-hint{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap;padding:.32rem .75rem;font-size:.6rem;color:rgba(255,255,255,.32);letter-spacing:.02em;background:rgba(255,255,255,.016);border-bottom:1px solid rgba(255,255,255,.05)}
.ed-canvas-hint-text{flex:1;min-width:12rem;line-height:1.45}
.ed-canvas-hint b{color:rgba(212,164,32,.65);font-weight:600}
.ed-canvas-hint-actions{display:inline-flex;flex-shrink:0;align-items:center;gap:.35rem;flex-wrap:wrap}
.ed-hint-btn{font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:600;padding:.34rem .72rem;border-radius:5px;cursor:pointer;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#e8e4dc;transition:border-color .14s,background .14s,color .14s;white-space:nowrap}
.ed-hint-btn:hover{border-color:rgba(212,164,32,.45);color:#fff;background:rgba(212,164,32,.12)}
.ed-hint-btn--save{background:linear-gradient(135deg,#C09010,#A07808);border-color:transparent;color:#fff}
.ed-hint-btn--save:hover{background:linear-gradient(135deg,#D4A420,#B88C10);color:#fff}
.ed-canvas-scroll{flex:1;overflow:auto;display:flex;justify-content:center;align-items:flex-start;padding:28px 20px}
.ed-canvas-frame{transition:max-width .25s ease;background:#C5BEAF;width:100%;max-width:700px;box-shadow:0 6px 48px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.08);border-radius:3px;overflow:hidden}
#nl-ed-iframe{width:100%;border:0;display:block;min-height:800px}
.ed-panel{width:328px;flex-shrink:0;background:#0e0e0e;border-left:1px solid rgba(255,255,255,.07);overflow-y:auto;display:flex;flex-direction:column}
.ed-panel-idle{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem 1.1rem;color:#888}
.ed-panel-idle-icon{font-size:1.6rem;opacity:.18;margin-bottom:.6rem}
.ed-panel-idle p{font-size:.75rem;margin-bottom:.55rem;line-height:1.55}
.ed-panel-idle ul{list-style:none;font-size:.67rem;color:rgba(255,255,255,.3);line-height:2.1}
.ed-panel-props{display:flex;flex-direction:column}
.ed-panel-tag{font-size:.47rem;letter-spacing:.18em;text-transform:uppercase;color:#D4A420;font-weight:700;padding:.62rem .82rem .06rem}
.ed-panel-text-preview{font-size:.7rem;color:rgba(255,255,255,.42);padding:.06rem .82rem .6rem;border-bottom:1px solid rgba(255,255,255,.06);max-height:3.2rem;overflow:hidden;line-height:1.45}
.ed-prop{padding:.52rem .82rem;border-bottom:1px solid rgba(255,255,255,.05)}
.ed-prop>label{display:block;font-size:.5rem;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.36);margin-bottom:.36rem;font-weight:600}
.ed-prop-row{display:flex;align-items:center;gap:.38rem;margin-bottom:.18rem}
.ed-prop-row:last-child{margin-bottom:0}
.ed-prop-row input[type="color"]{width:32px;height:25px;border:1px solid rgba(255,255,255,.14);border-radius:4px;padding:2px;background:#1a1a1a;cursor:pointer;flex-shrink:0}
.ed-hex{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:4px;color:#eee;font-family:'JetBrains Mono','Consolas',monospace;font-size:.67rem;padding:.27rem .4rem}
.ed-hex:focus{outline:none;border-color:#D4A420}
.ed-num{width:52px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:4px;color:#eee;font-size:.7rem;padding:.27rem .3rem;text-align:center}
.ed-num:focus{outline:none;border-color:#D4A420}
.ed-num-wide{flex:1;width:auto}
.ed-prop-lbl{font-size:.6rem;color:rgba(255,255,255,.3);width:36px;flex-shrink:0}
.ed-prop-unit{font-size:.6rem;color:rgba(255,255,255,.3)}
.ed-prop input[type="range"]{flex:1;accent-color:#C09010}
.ed-clr-x{background:transparent;border:1px solid rgba(255,255,255,.1);color:#888;border-radius:3px;padding:.17rem .3rem;cursor:pointer;font-size:.6rem;flex-shrink:0}
.ed-clr-x:hover{border-color:#C0392B;color:#C0392B}
.ed-fmt-row{display:flex;gap:.26rem}
.ed-fmt{flex:1;padding:.4rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:4px;color:#ccc;cursor:pointer;font-size:.76rem;transition:all .12s;font-family:'DM Sans',sans-serif;text-align:center}
.ed-fmt:hover{border-color:rgba(212,164,32,.4);color:#D4A420}
.ed-fmt.on{background:rgba(184,134,11,.2);border-color:#C09010;color:#D4A420}
.ed-prop-ta{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:4px;color:#eee;font-family:'DM Sans',sans-serif;font-size:.74rem;padding:.44rem .54rem;resize:vertical;line-height:1.5;box-sizing:border-box}
.ed-prop-ta:focus{outline:none;border-color:#D4A420}
.ed-action-grid{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}
.ed-act2{display:inline-flex;align-items:center;justify-content:center;gap:.35rem;padding:.78rem .7rem;min-height:2.6rem;font-size:.68rem;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,.78);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.13);border-radius:7px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:border-color .14s,background .14s,color .14s,box-shadow .14s}
.ed-act2:hover{border-color:rgba(212,164,32,.42);color:#f5ecd8;background:rgba(212,164,32,.09);box-shadow:0 1px 0 rgba(0,0,0,.2)}
.ed-act2:focus-visible{outline:2px solid rgba(212,164,32,.55);outline-offset:2px}
.ed-act2--danger{grid-column:1/-1;margin-top:.3rem;color:rgba(248,180,170,.95);border-color:rgba(231,76,60,.38);background:rgba(192,57,43,.1)}
.ed-act2--danger:hover{border-color:rgba(231,76,60,.55);color:#fff;background:rgba(192,57,43,.2)}
.ed-act2--all-langs{grid-column:1/-1;color:rgba(255,210,190,.95);border-color:rgba(231,76,60,.32);background:rgba(192,57,43,.07)}
.ed-act2--all-langs:hover{border-color:rgba(231,76,60,.48);color:#fff;background:rgba(192,57,43,.16)}
.ed-act2--wide{grid-column:1/-1}
.ed-nav-actions-idle{padding:1.4rem 1rem;text-align:center;color:rgba(255,255,255,.55)}
.ed-nav-actions-idle-icon{font-size:1.6rem;opacity:.4;margin-bottom:.6rem}
.ed-nav-actions-idle p{font-size:.74rem;line-height:1.55;margin:0 0 .7rem}
.ed-nav-actions-idle ul{list-style:none;font-size:.66rem;color:rgba(255,255,255,.4);line-height:2;text-align:left;padding-left:.4rem}
.ed-nav-actions-body{padding:.85rem .8rem 1.1rem;display:flex;flex-direction:column;gap:.72rem}
.ed-nav-actions-tag{font-size:.54rem;letter-spacing:.18em;text-transform:uppercase;color:#D4A420;font-weight:700;padding:.18rem 0 .35rem}
.ed-nav-multisel-banner{padding:.55rem .7rem;background:rgba(212,164,32,.12);border:1px solid rgba(212,164,32,.4);border-radius:6px;font-size:.66rem;color:#D4A420;letter-spacing:.07em;text-transform:uppercase;text-align:center}
.ed-act2--regen{color:#f5ecd8;border-color:rgba(212,164,32,.42);background:rgba(212,164,32,.12)}
.ed-act2--regen:hover{border-color:rgba(212,164,32,.65);color:#fff;background:rgba(212,164,32,.22)}
.ed-act2--regen:disabled{opacity:.4;cursor:not-allowed;background:rgba(255,255,255,.04);color:rgba(255,255,255,.4);border-color:rgba(255,255,255,.08)}
.ed-act2--regen:disabled:hover{border-color:rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:rgba(255,255,255,.4);box-shadow:none}
.ed-act2:disabled{opacity:.4;cursor:not-allowed;color:rgba(255,255,255,.4);border-color:rgba(255,255,255,.08);background:rgba(255,255,255,.03)}
.ed-act2:disabled:hover{opacity:.4;color:rgba(255,255,255,.4);border-color:rgba(255,255,255,.08);background:rgba(255,255,255,.03);box-shadow:none;transform:none}
.ed-regen-panel{margin-top:.7rem;padding:.8rem .85rem;border:1px solid rgba(212,164,32,.32);background:rgba(212,164,32,.06);border-radius:7px;display:flex;flex-direction:column;gap:.6rem}
.ed-regen-panel[hidden]{display:none}
.ed-regen-note{font-size:.62rem;color:rgba(255,255,255,.55);line-height:1.5;margin:0}
.ed-regen-status{font-size:.62rem;color:#D4A420;line-height:1.45;margin:0;min-height:.9rem}
.ed-regen-status.is-error{color:#f08070}
.ed-regen-actions{display:flex;gap:.5rem;justify-content:flex-end;margin-top:.15rem}
.ed-regen-actions .ed-act2{padding:.55rem 1rem;min-height:0}
.ed-desel{width:100%;padding:.44rem;background:transparent;border:1px solid rgba(255,255,255,.1);border-radius:4px;color:#888;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.65rem;transition:all .12s}
.ed-desel:hover{border-color:rgba(255,255,255,.24);color:#fff}
.ed-text-sync-note{font-size:.58rem;color:rgba(255,255,255,.38);line-height:1.45;margin:0 0 .42rem}
#ed-text-sync-btn:disabled{opacity:.35;cursor:not-allowed}
.ed-presets{display:grid;grid-template-columns:1fr 1fr;gap:.3rem}
.ed-preset{padding:.35rem .4rem;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#ddd;border-radius:4px;cursor:pointer;font-size:.63rem}
.ed-preset:hover{border-color:rgba(212,164,32,.5);color:#D4A420}
.ed-floatbar{position:fixed;z-index:400;display:none;gap:.25rem;align-items:center;background:#0a0a0a;border:1px solid rgba(212,164,32,.35);border-radius:7px;padding:.22rem;box-shadow:0 8px 20px rgba(0,0,0,.45)}
.ed-floatbar.active{display:flex}
.ed-floatbtn{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#ddd;border-radius:4px;font-size:.66rem;padding:.22rem .42rem;cursor:pointer}
.ed-floatbtn:hover{border-color:rgba(212,164,32,.5);color:#D4A420}
@media (max-width: 1024px){
  .ed-nav{width:220px}
  .ed-panel{width:280px}
}
@media (max-width: 760px){
  .ed-topbar{padding:.35rem .5rem}
  .ed-nav{display:none}
  .ed-panel{position:fixed;right:0;top:44px;bottom:0;z-index:20;width:min(82vw,260px);box-shadow:-8px 0 20px rgba(0,0,0,.35)}
  .ed-canvas-scroll{padding:12px 8px}
  .ed-floatbar{display:none!important}
}
`;

  /* ────────────────────────────────────────────────────────
     HTML — editor modal, built and injected at init
     ──────────────────────────────────────────────────────── */
  function _buildHtml() {
    const elItems = ELEMS.map((e, i) =>
      `<div class="ed-palette-item" onclick="App.Editor._addEl(${i})" title="Insert ${e.label}">` +
      `<div class="ed-palette-icon">${e.icon}</div>${e.label}</div>`).join('');
    const secItems = SECTIONS.map((s, i) =>
      `<div class="ed-palette-item" onclick="App.Editor._addSec(${i})" title="Add: ${s.label}">` +
      `<div class="ed-palette-icon">${s.icon}</div>${s.label}</div>`).join('');

    return `<div id="editor-modal">
  <div class="editor-wrap">
    <div class="ed-topbar">
      <span class="ed-brand" id="editor-lang-label">Newsletter Studio</span>
      <div class="ed-sep"></div>
      <div class="ed-device-pills">
        <button class="ed-dpill" data-w="" onclick="App.Editor._device(this,'')">&#x1F5A5; Full</button>
        <button class="ed-dpill active" data-w="700px" onclick="App.Editor._device(this,'700px')">&#x2709; 700px</button>
        <button class="ed-dpill" data-w="390px" onclick="App.Editor._device(this,'390px')">&#x1F4F1; Mobile</button>
      </div>
      <div class="ed-sep"></div>
      <button class="ed-tbtn" id="ed-undo-btn" onclick="App.Editor._undo()" title="Undo last change (Ctrl/Cmd+Z)" disabled>&#x21A9; Undo</button>
      <button class="ed-tbtn" id="ed-redo-btn" onclick="App.Editor._redo()" title="Redo (Ctrl/Cmd+Shift+Z)" disabled>&#x21AA; Redo</button>
      <button class="ed-tbtn" onclick="App.Editor._reset()" title="Reset to base template">Reset</button>
      <span class="ed-status" id="editor-status">Ready</span>
      <div class="ed-spacer"></div>
      <button type="button" class="ed-tbtn ed-tbtn--preview" onclick="App.Editor._preview()" title="Open read-only preview in a new tab">Preview</button>
      <div class="ed-tbtn-group" role="group" aria-label="Save and download">
        <button type="button" class="ed-tbtn ed-tbtn--save" onclick="void App.Editor.saveToWorkspaceAndProject()" title="Save this language from the canvas to the workspace, then store the full project (every language variant) in IndexedDB">Save</button>
        <button type="button" class="ed-tbtn ed-tbtn--export" onclick="void App.Editor.downloadCurrentLanguage()" title="Save canvas, then download this language as one HTML file">Single file</button>
        <button type="button" class="ed-tbtn ed-tbtn--export" onclick="void App.Editor.downloadCurrentEml()" title="Save canvas, then download a send-ready .eml — double-click it to open in Outlook with images inline, add recipients and Send (no relay needed)">Send-ready (.eml)</button>
        <button type="button" class="ed-tbtn ed-tbtn--export" onclick="void App.Editor.downloadAllLanguages()" title="Save canvas, then download ZIP with html/ and svg/ folders">All files</button>
      </div>
      <button type="button" class="ed-tbtn ed-tbtn--close" onclick="App.Editor.close()" title="Close editor">&#x2715;</button>
    </div>
    <div class="ed-body">
      <div class="ed-nav" id="ed-nav">
        <div class="ed-nav-tabs">
          <button class="ed-nav-tab active" onclick="App.Editor._navTab(this,'actions')">Actions</button>
          <button class="ed-nav-tab" onclick="App.Editor._navTab(this,'sections')">Sections</button>
          <button class="ed-nav-tab" onclick="App.Editor._navTab(this,'add')">+ Add</button>
        </div>
        <div class="ed-nav-pane active" id="ed-nav-actions">
          <div class="ed-nav-actions-idle" id="ed-nav-actions-idle">
            <div class="ed-nav-actions-idle-icon">&#x261D;</div>
            <p>Click any element in the newsletter to act on it.</p>
            <ul>
              <li>Up / Down &middot; Drag &middot; Duplicate</li>
              <li>Lock</li>
              <li>Regenerate with AI</li>
              <li>Remove</li>
            </ul>
          </div>
          <div class="ed-nav-actions-body" id="ed-nav-actions-body" style="display:none">
            <div id="ed-nav-multisel-banner" class="ed-nav-multisel-banner" style="display:none">
              <strong id="ed-nav-multisel-count">0</strong> selected
            </div>
            <div class="ed-nav-actions-tag" id="ed-nav-actions-tag">&mdash;</div>
            <div class="ed-action-grid">
              <button type="button" class="ed-act2" onclick="App.Editor._moveUp()" title="Move element up">Up</button>
              <button type="button" class="ed-act2" onclick="App.Editor._moveDown()" title="Move element down">Down</button>
              <button type="button" class="ed-act2" onclick="App.Editor._startDrag()" title="Drag to reorder in the canvas">Drag</button>
              <button type="button" class="ed-act2" onclick="App.Editor._duplicate()" title="Duplicate this block">Duplicate</button>
              <button type="button" class="ed-act2 ed-act2--wide" onclick="App.Editor._lockToggle()" title="Lock or unlock this section">Lock</button>
              <button type="button" class="ed-act2 ed-act2--wide" id="ed-replace-img-btn" onclick="void App.Editor._replaceImageOpen()" disabled title="Select a hero image to replace">&#x1F5BC; Replace image</button>
              <button type="button" class="ed-act2 ed-act2--regen" id="ed-regen-btn" onclick="App.Editor._regenOpen('current')" title="Re-run the AI on the selected element(s) in the currently-previewed language only">&#x21BB; Regenerate</button>
              <button type="button" class="ed-act2 ed-act2--regen" id="ed-regen-all-btn" onclick="App.Editor._regenOpen('all')" title="Re-run the AI on the selected element(s) in English, then auto-translate to every other language">&#x21BB; All languages</button>
              <button type="button" class="ed-act2 ed-act2--danger" onclick="App.Editor._delete()" title="Remove this element">Remove</button>
              <button type="button" class="ed-act2 ed-act2--all-langs" onclick="void App.Editor.deleteSelectedInAllLanguages()" title="Remove this block from every language version (same position in each template)">Remove in all languages</button>
            </div>
            <div class="ed-regen-panel" id="ed-regen-panel" hidden>
              <p class="ed-regen-note" id="ed-regen-mode-note"></p>
              <textarea class="ed-prop-ta" id="ed-regen-instruction" rows="3" placeholder="Optional instruction..."></textarea>
              <p class="ed-regen-status" id="ed-regen-status"></p>
              <div class="ed-regen-actions">
                <button type="button" class="ed-act2" onclick="App.Editor._regenCancel()">Cancel</button>
                <button type="button" class="ed-act2 ed-act2--regen" id="ed-regen-run" onclick="void App.Editor._regenRun()">Regenerate &#x2192;</button>
              </div>
            </div>
          </div>
        </div>
        <div class="ed-nav-pane" id="ed-nav-sections">
          <div id="ed-nav-list"><div class="ed-nav-item" style="opacity:.35;cursor:default;font-size:.65rem;padding:.6rem .72rem">Loading&hellip;</div></div>
        </div>
        <div class="ed-nav-pane" id="ed-nav-add">
          <div class="ed-nav-sec-head">Elements</div>${elItems}
          <div class="ed-nav-sec-head" style="margin-top:.35rem">Sections</div>${secItems}
        </div>
      </div>
      <div class="ed-canvas-col">
        <div class="ed-canvas-hint">
          <span class="ed-canvas-hint-text">
            <b>Click</b> to select &middot; <b>Double-click</b> to edit text &middot;
            <b>Delete</b> key removes &middot; <b>&#x2B; Add</b> panel inserts blocks &middot;
            <b>&#x22EE;&#x22EE; Drag</b> to reorder
          </span>
          <span class="ed-canvas-hint-actions">
            <button type="button" class="ed-hint-btn ed-hint-btn--save" onclick="void App.Editor.saveToWorkspaceAndProject()" title="Save this language to the workspace and store the full project (all languages)">Save changes</button>
          </span>
        </div>
        <div class="ed-canvas-scroll">
          <div class="ed-canvas-frame" id="ed-canvas-frame">
            <iframe id="nl-ed-iframe" sandbox="allow-same-origin allow-scripts" title="Newsletter Editor Canvas"></iframe>
          </div>
        </div>
      </div>
      <div class="ed-panel" id="ed-panel">
        <div class="ed-panel-idle" id="ed-panel-idle">
          <div class="ed-panel-idle-icon">&#x1F446;</div>
          <p>Click any element in the newsletter to select &amp; edit it</p>
          <ul>
            <li>Text &amp; background color</li>
            <li>Font size &amp; style</li>
            <li>Width &amp; padding</li>
            <li>Move, delete, or drag to reorder</li>
          </ul>
        </div>
        <div class="ed-panel-props" id="ed-panel-props" style="display:none">
          <div id="ed-multisel-banner" style="display:none; margin:0 0 .55rem; padding:.5rem .7rem; background:rgba(212,164,32,.12); border:1px solid rgba(212,164,32,.45); border-radius:5px; font-size:.7rem; color:#D4A420; line-height:1.45;">
            <strong id="ed-multisel-count">0</strong> elements selected. <span style="color:rgba(255,255,255,.75);">Edits affect the primary; Remove acts on all.</span>
          </div>
          <div class="ed-panel-tag" id="ed-el-tag">&mdash;</div>
          <div class="ed-panel-text-preview" id="ed-el-preview">&mdash;</div>

          <div class="ed-prop">
            <label>Edit Text <span style="opacity:.4;font-size:.5rem">(or double-click in canvas)</span></label>
            <textarea class="ed-prop-ta" id="prop-text-area" rows="3" placeholder="Type here to edit selected element’s text…" oninput="App.Editor._setText(this.value)"></textarea>
          </div>

          <div class="ed-prop" id="ed-text-sync-row">
            <p class="ed-text-sync-note">Push this block’s new text into every other language (saves + translates).</p>
            <button type="button" class="ed-act2 ed-act2--wide" onclick="void App.Editor._syncTextToOtherLanguages()" id="ed-text-sync-btn">Translate to all languages</button>
          </div>

          <div class="ed-prop">
            <label>Text Color</label>
            <div class="ed-prop-row">
              <input type="color" id="prop-color" oninput="App.Editor._prop('color',this.value)">
              <input type="text" class="ed-hex" id="prop-color-hex" maxlength="9" placeholder="#ffffff" oninput="App.Editor._propHex('color',this.value)">
            </div>
          </div>

          <div class="ed-prop">
            <label>Background</label>
            <div class="ed-prop-row">
              <input type="color" id="prop-bg" oninput="App.Editor._prop('bg',this.value)">
              <input type="text" class="ed-hex" id="prop-bg-hex" maxlength="9" placeholder="transparent" oninput="App.Editor._propHex('bg',this.value)">
              <button class="ed-clr-x" onclick="App.Editor._prop('bg','')" title="Clear background">&#x2715;</button>
            </div>
          </div>

          <div class="ed-prop">
            <label>Font Size</label>
            <div class="ed-prop-row">
              <input type="range" id="prop-size-range" min="8" max="80" value="16" oninput="App.Editor._propSize(this.value)">
              <input type="number" class="ed-num" id="prop-size" min="4" max="200" value="16" oninput="App.Editor._propSize(this.value)">
            </div>
          </div>

          <div class="ed-prop">
            <label>Size &amp; Spacing</label>
            <div class="ed-prop-row">
              <span class="ed-prop-lbl">Width</span>
              <input type="number" class="ed-num ed-num-wide" id="prop-width" min="0" max="1200" placeholder="auto" oninput="App.Editor._setWidth(this.value)">
              <span class="ed-prop-unit">px</span>
            </div>
            <div class="ed-prop-row">
              <span class="ed-prop-lbl">Padding</span>
              <input type="number" class="ed-num ed-num-wide" id="prop-padding" min="0" max="200" placeholder="&mdash;" oninput="App.Editor._setPadding(this.value)">
              <span class="ed-prop-unit">px</span>
            </div>
          </div>

          <div class="ed-prop">
            <label>Style</label>
            <div class="ed-fmt-row">
              <button class="ed-fmt" id="fmt-bold" onclick="App.Editor._toggle('bold')" title="Bold"><b>B</b></button>
              <button class="ed-fmt" id="fmt-italic" onclick="App.Editor._toggle('italic')" title="Italic"><i>I</i></button>
              <button class="ed-fmt" id="fmt-underline" onclick="App.Editor._toggle('underline')" title="Underline"><u>U</u></button>
            </div>
          </div>

          <div class="ed-prop">
            <label>Alignment</label>
            <div class="ed-fmt-row">
              <button class="ed-fmt" onclick="App.Editor._prop('align','left')">&#x2261;L</button>
              <button class="ed-fmt" onclick="App.Editor._prop('align','center')">&#x2261;C</button>
              <button class="ed-fmt" onclick="App.Editor._prop('align','right')">&#x2261;R</button>
            </div>
          </div>

          <div class="ed-prop">
            <label>Quick Presets</label>
            <div class="ed-presets">
              <button class="ed-preset" onclick="App.Editor._applyPreset('heading')">Heading</button>
              <button class="ed-preset" onclick="App.Editor._applyPreset('body')">Body</button>
              <button class="ed-preset" onclick="App.Editor._applyPreset('cta')">CTA</button>
              <button class="ed-preset" onclick="App.Editor._applyPreset('accent')">Accent</button>
            </div>
          </div>

          <div class="ed-prop">
            <button class="ed-desel" onclick="App.Editor._deselect()">Deselect element</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div id="ed-floatbar" class="ed-floatbar">
    <button class="ed-floatbtn" onclick="App.Editor._toggle('bold')"><b>B</b></button>
    <button class="ed-floatbtn" onclick="App.Editor._toggle('italic')"><i>I</i></button>
    <button class="ed-floatbtn" onclick="App.Editor._toggle('underline')"><u>U</u></button>
    <button class="ed-floatbtn" onclick="App.Editor._prop('align','left')">L</button>
    <button class="ed-floatbtn" onclick="App.Editor._prop('align','center')">C</button>
    <button class="ed-floatbtn" onclick="App.Editor._prop('align','right')">R</button>
  </div>
</div>`;
  }

  /* ────────────────────────────────────────────────────────
     IFRAME INJECTED SCRIPT (_nlEdFn)
     Lives in js/editor/iframe_script.js (App.EditorIframeScript.fn)
     so editor.js stays focused on the parent-side controller.
     ──────────────────────────────────────────────────────── */
  const _nlEdFn = (window.App && window.App.EditorIframeScript && window.App.EditorIframeScript.fn) || (function () {});

  /* ────────────────────────────────────────────────────────
     EDITOR STATE
     ──────────────────────────────────────────────────────── */
  let _opts = null;
  let _undoStack = [], _redoStack = [];
  let _baseline = '';            // last committed iframe body.innerHTML — what undo restores TO
  let _textEditActive = false;   // true between first 'update' and 'editDone' for a typing session
  let _dirty = false, _selectedProps = null;
  let _cleanResolve = null, _domPathResolve = null, _domPathsResolve = null;
  // Tracks whether we've already auto-switched the left nav to the Actions
  // tab for the current selection. Reset on _showIdle (deselect).
  let _navAutoSwitchedForSelection = false;

  /* ────────────────────────────────────────────────────────
     CORE HELPERS
     ──────────────────────────────────────────────────────── */
  function _ifrm() { return document.getElementById('nl-ed-iframe'); }

  function _post(cmd, v) {
    const f = _ifrm();
    if (f && f.contentWindow) f.contentWindow.postMessage({ _nlEd: true, cmd, v }, '*');
  }

  function _iframeHtml() {
    try { return _ifrm()?.contentDocument?.body?.innerHTML || ''; } catch (e) { return ''; }
  }

  function _iframeCleanHtml() {
    return new Promise(resolve => {
      _cleanResolve = resolve;
      _post('getCleanHtml', null);
      setTimeout(() => { if (_cleanResolve) { _cleanResolve(_iframeHtml()); _cleanResolve = null; } }, 600);
    });
  }

  function _getSelectedBodyChildPath() {
    return new Promise(resolve => {
      _domPathResolve = resolve;
      _post('getDomPath', null);
      setTimeout(() => {
        if (_domPathResolve) {
          _domPathResolve({ path: null, relPath: null });
          _domPathResolve = null;
        }
      }, 550);
    });
  }

  function _getSelectedBodyChildPaths() {
    return new Promise(resolve => {
      _domPathsResolve = resolve;
      _post('getDomPaths', null);
      setTimeout(() => {
        if (_domPathsResolve) {
          _domPathsResolve({ items: [] });
          _domPathsResolve = null;
        }
      }, 600);
    });
  }

  function _reloadIframeFromHtmlCss(html, css) {
    const f = _ifrm();
    if (!f || !_opts) return;
    _undoStack = [];
    _redoStack = [];
    f.style.height = '800px';
    f.srcdoc = _buildSrcdoc(html || '', css || '', _opts.langId || 'en', _opts.portalUrl);
    f.onload = function () { _buildNav(f); _selectedProps = null; _showIdle(); _status('Ready'); };
  }

  async function deleteSelectedInAllLanguages() {
    if (!_opts) return;
    _status('Reading selection...');
    const bundle = await _getSelectedBodyChildPaths();
    let items = (bundle.items || []).filter(it => it && Array.isArray(it.path) && it.path.length && !it.locked);
    if (!items.length) {
      // Fallback: try the single-element path for backward compatibility
      const sel = await _getSelectedBodyChildPath();
      if (sel.locked) { _status('Element is locked'); return; }
      if (!sel.path || !sel.path.length) { _status('Select an element first'); return; }
      items = [{ path: sel.path, relPath: sel.relPath }];
    }
    // Sort paths in DESCENDING DOM order so earlier deletions don't shift later paths
    items.sort((a, b) => {
      const pa = a.path || [], pb = b.path || [];
      const n = Math.max(pa.length, pb.length);
      for (let i = 0; i < n; i++) {
        const va = (i < pa.length) ? pa[i] : -1;
        const vb = (i < pb.length) ? pb[i] : -1;
        if (va !== vb) return vb - va;
      }
      return 0;
    });
    const msg = items.length > 1
      ? `Remove ${items.length} blocks from every language version? This cannot be undone.`
      : 'Remove this block from every language version? This cannot be undone.';
    if (!confirm(msg)) return;
    if (typeof _opts.onDeleteInAllLanguages !== 'function') {
      _status('Could not remove from all languages');
      return;
    }
    let lastResult = null;
    let totalLangCount = 0;
    let successCount = 0;
    for (const it of items) {
      try {
        const r = await _opts.onDeleteInAllLanguages({ path: it.path, relPath: it.relPath });
        if (r && r.ok && typeof r.html === 'string') {
          lastResult = r;
          successCount += 1;
          if (typeof r.updated === 'number') totalLangCount = Math.max(totalLangCount, r.updated);
        }
      } catch (_e) { /* skip this item, continue */ }
    }
    if (lastResult && typeof lastResult.html === 'string') {
      _reloadIframeFromHtmlCss(lastResult.html, lastResult.css || '');
      _dirty = false;
      if (items.length > 1) {
        _status(`Removed ${successCount}/${items.length} block(s) from ${totalLangCount || 'all'} language(s)`);
      } else {
        _status(totalLangCount > 0 ? `Removed from ${totalLangCount} language(s)` : 'Removed from all languages');
      }
      return;
    }
    _status('Could not remove from all languages');
  }

  async function _syncTextToOtherLanguages() {
    if (!_opts) return;
    _status('Saving\u2026');
    const saved = await saveToWorkspace();
    if (!saved) return;
    _status('Resolving block\u2026');
    const sel = await _getSelectedBodyChildPath();
    if (sel.locked) {
      _status('Element is locked');
      if (window.App?.Utils?.showToast) App.Utils.showToast('Element is locked.', true);
      return;
    }
    if (!sel.path?.length && !sel.relPath?.length) {
      _status('Select a block inside the template');
      if (window.App?.Utils?.showToast) App.Utils.showToast('Select a block inside the newsletter template.', true);
      return;
    }
    const ta = document.getElementById('prop-text-area');
    const text = String(ta?.value || '').trim();
    if (!text) {
      _status('No text to translate');
      if (window.App?.Utils?.showToast) App.Utils.showToast('No text to translate.', true);
      return;
    }
    if (!window.App?.UI?.syncNewsletterElementTextToAllLanguages) {
      _status('Sync unavailable');
      return;
    }
    _status('Translating to other languages\u2026');
    try {
      const r = await App.UI.syncNewsletterElementTextToAllLanguages({
        path: sel.path,
        relPath: sel.relPath,
        text,
        sourceLangId: _opts.langId || 'en'
      });
      _status(`Updated ${r.updated} language(s)`);
      if (window.App?.Utils?.showToast) {
        App.Utils.showToast(
          r.failed
            ? `Other languages: ${r.updated} updated, ${r.failed} could not match structure.`
            : `Updated ${r.updated} other language version(s) with translated text.`
        );
      }
    } catch (err) {
      const msg = err?.message || 'Sync failed';
      _status('Sync failed');
      if (window.App?.Utils?.showToast) App.Utils.showToast(msg, true);
    }
  }

  async function flushOpenEditorToWorkspace() {
    const modal = document.getElementById('editor-modal');
    if (!modal || !modal.classList.contains('active') || !_opts) return;
    await saveToWorkspace();
  }

  // ─────────────────────────────────────────────────────────
  // Regenerate-with-AI (selection-level)
  //
  // Flow: open panel -> iframe collects selection texts -> AI rewrites them
  // as one batch -> iframe applies the new texts in place -> we flush the
  // workspace and re-run translation. See
  // docs/superpowers/specs/2026-05-23-editor-regenerate-selection-design.md
  // for the full contract.
  // ─────────────────────────────────────────────────────────
  let _regenInFlight = false;
  let _regenResolve = null;
  let _regenAppliedResolve = null;
  // 'current' = regen the selection in the currently-previewed language only
  // 'all'     = regen the selection in English, then auto-translate every
  //             non-English variant from the new English content.
  let _regenMode = 'current';

  function _regenLangLabelFromId(langId) {
    const list = (window.App && App.UI && App.UI._internals && App.UI._internals.NEWSLETTER_LANGUAGES) || [];
    const hit = list.find(l => l && l.id === langId);
    return (hit && hit.label) || langId || 'English';
  }

  function _regenAvailable() {
    // Both buttons need only: an AI key. Language is no longer gated — the
    // "all languages" button still operates on the English variant under the
    // hood (so it can drive the EN -> others translation pipeline) but the
    // user can trigger it from any preview.
    const provider = document.getElementById('ai-provider')?.value || 'claude';
    const aiKey = document.getElementById('ai-key')?.value?.trim() || '';
    return { ok: !!aiKey, provider, aiKey };
  }

  function _regenSetStatus(msg, isError = false) {
    const el = document.getElementById('ed-regen-status');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('is-error', !!isError);
  }

  function _regenSetButtonState() {
    const btn = document.getElementById('ed-regen-btn');
    const btnAll = document.getElementById('ed-regen-all-btn');
    const runBtn = document.getElementById('ed-regen-run');
    const avail = _regenAvailable();
    const disable = !avail.ok || _regenInFlight;
    if (btn) {
      btn.disabled = disable;
      btn.title = avail.ok
        ? 'Re-run the AI on the selected element(s) in the currently-previewed language only'
        : 'Add an AI API key in Configuration to enable Regenerate';
    }
    if (btnAll) {
      btnAll.disabled = disable;
      btnAll.title = avail.ok
        ? 'Re-run the AI in English for the selected element(s), then auto-translate to every other language'
        : 'Add an AI API key in Configuration to enable Regenerate';
    }
    if (runBtn) runBtn.disabled = disable;
  }

  function _regenOpen(mode) {
    const avail = _regenAvailable();
    if (!avail.ok) {
      if (window.App?.Utils?.showToast) {
        App.Utils.showToast('Add an AI API key in Configuration to enable Regenerate.', true);
      }
      return;
    }
    _regenMode = (mode === 'all') ? 'all' : 'current';
    const panel = document.getElementById('ed-regen-panel');
    if (panel) panel.hidden = false;
    const ta = document.getElementById('ed-regen-instruction');
    if (ta) { ta.value = ''; ta.focus(); }
    const note = document.getElementById('ed-regen-mode-note');
    if (note) {
      const curLang = _opts?.langId || 'en';
      const curLabel = _regenLangLabelFromId(curLang);
      note.textContent = _regenMode === 'all'
        ? `Will regenerate in English, then translate to every other language. Optional instruction (e.g. "make these punchier"). Leave blank to just re-run.`
        : `Will regenerate in ${curLabel} only — other languages stay as they are. Optional instruction (e.g. "make these punchier"). Leave blank to just re-run.`;
    }
    const runBtn = document.getElementById('ed-regen-run');
    if (runBtn) {
      runBtn.textContent = (_regenMode === 'all') ? 'Regenerate + translate →' : 'Regenerate →';
    }
    _regenSetStatus('');
    _regenSetButtonState();
  }

  function _regenCancel() {
    const panel = document.getElementById('ed-regen-panel');
    if (panel) panel.hidden = true;
    _regenSetStatus('');
    _post('clearRegenPending', null);
  }

  async function _regenRun() {
    if (_regenInFlight) return;
    const avail = _regenAvailable();
    if (!avail.ok) { _regenCancel(); return; }

    const instruction = (document.getElementById('ed-regen-instruction')?.value || '').trim();
    const articles = window.App?.UI?._state?.newsletterWorkspace?.articles || [];
    const curationMode = window.App?.UI?._state?.curationMode || 'balanced';
    const curLangId = _opts?.langId || 'en';
    const curLangLabel = _regenLangLabelFromId(curLangId);
    const REGEN_ATTEMPTS = 3;
    const isAllMode = (_regenMode === 'all');

    _regenInFlight = true;
    _regenSetButtonState();
    _regenSetStatus('Reading selection…');

    // ── Step 1: collect selection from iframe (always works in any language)
    let collected = [];
    try {
      collected = await new Promise((resolve, reject) => {
        _regenResolve = resolve;
        _post('getSelectionTexts', null);
        setTimeout(() => {
          if (_regenResolve === resolve) { _regenResolve = null; reject(new Error('Editor did not respond')); }
        }, 1500);
      });
      if (!Array.isArray(collected) || !collected.length) throw new Error('Select one or more elements first');
    } catch (err) {
      _regenInFlight = false;
      _regenSetButtonState();
      _regenSetStatus(err.message || 'Could not read selection', true);
      _post('clearRegenPending', null);
      return;
    }
    const texts = collected.map(it => String(it.text || '').trim());
    if (texts.some(t => !t)) {
      _regenInFlight = false;
      _regenSetButtonState();
      _regenSetStatus('One of the selected items is empty — cannot regenerate', true);
      _post('clearRegenPending', null);
      return;
    }

    // ── Step 2: AI call
    // current mode -> write in current preview language
    // all mode     -> always write in English (so translation can fan out)
    const targetLang = isAllMode ? 'en' : curLangId;
    const targetLabel = isAllMode ? 'English' : curLangLabel;
    _regenSetStatus(`Regenerating ${texts.length} item(s) in ${targetLabel} — ${REGEN_ATTEMPTS} parallel attempts…`);
    let newItems;
    // Open an AI-logging build context so all regen ensemble attempts mirror
    // into the editor's current template folder (templates/<id>/ensemble-logs/).
    const AIL = window.App && window.App.AILogger;
    const regenTplId = _opts && _opts.templateId ? _opts.templateId : null;
    if (AIL && typeof AIL.beginBuild === 'function') {
      AIL.beginBuild({ templateId: regenTplId || 'unknown' });
    }
    try {
      newItems = await App.AISummarizer.regenerateSelection({
        texts, articles, instruction,
        provider: avail.provider,
        apiKey: avail.aiKey,
        mode: curationMode,
        attempts: REGEN_ATTEMPTS,
        languageId: targetLang,
        languageLabel: targetLabel
      });
    } catch (err) {
      _regenInFlight = false;
      _regenSetButtonState();
      _regenSetStatus(err?.message || 'AI call failed', true);
      _post('clearRegenPending', null);
      return;
    } finally {
      if (AIL && typeof AIL.endBuild === 'function') AIL.endBuild();
    }

    // Snapshot pre-regen state for Undo to roll back the whole replacement.
    _pushUndo();

    // ── Step 3: apply
    if (!isAllMode) {
      // current-language only: just apply to the live iframe, save, done.
      _regenSetStatus('Applying changes…');
      try {
        await new Promise((resolve, reject) => {
          _regenAppliedResolve = resolve;
          _post('applySelectionTexts', { items: newItems.map((text, idx) => ({ idx, text })) });
          setTimeout(() => {
            if (_regenAppliedResolve === resolve) { _regenAppliedResolve = null; reject(new Error('Apply timed out')); }
          }, 2000);
        });
      } catch (err) {
        _regenInFlight = false;
        _regenSetButtonState();
        _regenSetStatus(err.message || 'Could not apply changes', true);
        _post('clearRegenPending', null);
        return;
      }
      _dirty = true;
      _status('Unsaved changes — regenerated');
      _regenSetStatus('Saving…');
      try {
        await flushOpenEditorToWorkspace();
        _regenSetStatus('Done.');
        if (window.App?.Utils?.showToast) {
          App.Utils.showToast(`Regenerated ${newItems.length} item(s) in ${targetLabel} (best of ${REGEN_ATTEMPTS}). Other languages unchanged.`);
        }
        setTimeout(() => _regenCancel(), 600);
      } catch (err) {
        _regenSetStatus(err?.message || 'Save failed', true);
      } finally {
        _regenInFlight = false;
        _regenSetButtonState();
      }
      return;
    }

    // ── all-languages flow ──
    // The AI wrote in English. Update the English variant in workspace by
    // path-matching each selection (path/relPath came along in `collected`),
    // then re-translate every non-EN variant from the new EN, then reload
    // the iframe so the user sees the freshly-translated current language.
    const Utils = window.App?.Utils || {};
    const ws = window.App?.UI?._state?.newsletterWorkspace;
    if (!ws || !ws.variants) {
      _regenInFlight = false;
      _regenSetButtonState();
      _regenSetStatus('Workspace missing — generate a newsletter first', true);
      _post('clearRegenPending', null);
      return;
    }

    // If currently in EN, apply to the live iframe first for instant feedback.
    if (curLangId === 'en') {
      try {
        await new Promise((resolve, reject) => {
          _regenAppliedResolve = resolve;
          _post('applySelectionTexts', { items: newItems.map((text, idx) => ({ idx, text })) });
          setTimeout(() => {
            if (_regenAppliedResolve === resolve) { _regenAppliedResolve = null; reject(new Error('Apply timed out')); }
          }, 2000);
        });
        _dirty = true;
        await flushOpenEditorToWorkspace();
      } catch (err) {
        _regenInFlight = false;
        _regenSetButtonState();
        _regenSetStatus(err.message || 'Could not apply EN changes', true);
        _post('clearRegenPending', null);
        return;
      }
    } else {
      // We're previewing a non-EN language. Update the EN variant in storage
      // directly using the path data we collected from the iframe — DOM
      // structure mirrors across language variants, so the same path locates
      // the corresponding node in EN.
      let enHtml = (ws.variants.en && ws.variants.en.html) || '';
      if (!enHtml) {
        _regenInFlight = false;
        _regenSetButtonState();
        _regenSetStatus('English variant missing — switch to English preview first', true);
        _post('clearRegenPending', null);
        return;
      }
      let updates = 0;
      for (let i = 0; i < newItems.length; i++) {
        const item = collected[i] || {};
        const res = Utils.updateNewsletterNodeTextByMirrorPath
          ? Utils.updateNewsletterNodeTextByMirrorPath(enHtml, item.path, item.relPath, newItems[i], 5)
          : { html: enHtml, updated: false };
        if (res && res.updated) { enHtml = res.html; updates += 1; }
      }
      if (!updates) {
        _regenInFlight = false;
        _regenSetButtonState();
        _regenSetStatus('Could not locate the matching English elements — try from the English preview', true);
        _post('clearRegenPending', null);
        return;
      }
      ws.variants.en = { ...(ws.variants.en || {}), html: enHtml };
      // Clear the regen markers in the current (non-EN) iframe; we'll reload
      // it after translation finishes anyway.
      _post('clearRegenPending', null);
    }

    // Re-translate every non-EN variant from the new EN content.
    _regenSetStatus('Translating to other languages…');
    try {
      if (window.App?.UITranslation?.translateWorkspace) {
        await window.App.UITranslation.translateWorkspace({ overwrite: true });
      }
    } catch (err) {
      _regenSetStatus(err?.message || 'Translation failed — English was updated', true);
      _regenInFlight = false;
      _regenSetButtonState();
      return;
    }

    // If currently in a non-EN preview, reload the iframe from the freshly
    // translated variant so the user sees the new content.
    if (curLangId !== 'en') {
      const updatedVariant = ws.variants[curLangId];
      if (updatedVariant && updatedVariant.html) {
        _reloadIframeFromHtmlCss(updatedVariant.html, updatedVariant.css || '');
      }
    }

    _regenSetStatus('Done.');
    if (window.App?.Utils?.showToast) {
      App.Utils.showToast(`Regenerated ${newItems.length} item(s) and re-translated every language (best of ${REGEN_ATTEMPTS}).`);
    }
    setTimeout(() => _regenCancel(), 600);
    _regenInFlight = false;
    _regenSetButtonState();
  }

  // ─────────────────────────────────────────────────────────
  // Replace image — swap the selected hero <img>'s src from a
  // user-uploaded file or from the IndexedDB image library.
  // Hero-image eligibility (min 80×80) is enforced by the button's
  // disabled state in _updatePanel; the modal itself trusts the entry.
  // ─────────────────────────────────────────────────────────
  const REPLACE_IMG_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
  const REPLACE_IMG_MIME_OK = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);
  const REPLACE_IMG_EXT_MIME = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml'
  };
  const REPLACE_IMG_LIBRARY_PATH = 'assets/image-library/';
  let _replaceImgModalReady = false;
  let _replaceImgLibrarySeeded = false; // once per session — avoids re-fetching every modal open

  function _replaceImageInferMime(filename, blobType) {
    if (blobType && REPLACE_IMG_MIME_OK.has(blobType)) return blobType;
    const m = String(filename || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    const ext = m ? m[1] : '';
    return REPLACE_IMG_EXT_MIME[ext] || blobType || '';
  }

  function _ensureReplaceImgModal() {
    if (_replaceImgModalReady) return;
    if (!document.getElementById('ed-replace-img-style')) {
      const style = document.createElement('style');
      style.id = 'ed-replace-img-style';
      style.textContent = `
        .ed-rimg-modal{display:none;position:fixed;inset:0;z-index:1300;background:rgba(0,0,0,.62);align-items:center;justify-content:center;backdrop-filter:blur(4px);font-family:'DM Sans',Arial,sans-serif}
        .ed-rimg-modal.active{display:flex}
        .ed-rimg-box{width:min(640px,calc(100vw - 2rem));max-height:calc(100vh - 3rem);overflow:auto;background:#0f0f0f;border:1px solid rgba(212,164,32,.4);border-radius:10px;padding:1.1rem 1.2rem 1rem;box-shadow:0 24px 60px rgba(0,0,0,.55);color:#eee}
        .ed-rimg-title{font-family:'DM Serif Display',Georgia,serif;font-size:1.15rem;margin:0 0 .6rem;color:#fff}
        .ed-rimg-toggle{display:flex;align-items:center;gap:.45rem;margin-bottom:.85rem;font-size:.78rem;color:#ccc;cursor:pointer;user-select:none}
        .ed-rimg-toggle input{accent-color:#D4A420;width:14px;height:14px;cursor:pointer}
        .ed-rimg-section{font-size:.6rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#D4A420;margin:.95rem 0 .45rem;padding-bottom:.25rem;border-bottom:1px solid rgba(212,164,32,.18)}
        .ed-rimg-library{display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));gap:.55rem;margin-bottom:.4rem;min-height:200px;max-height:440px;overflow-y:auto;padding-right:.3rem}
        .ed-rimg-tile{border:1px solid rgba(255,255,255,.14);background:#151515;border-radius:6px;padding:.3rem;cursor:pointer;transition:border-color .12s,transform .12s;display:flex;flex-direction:column;align-items:center;gap:.25rem;overflow:hidden}
        .ed-rimg-tile:hover{border-color:#D4A420;transform:translateY(-1px)}
        .ed-rimg-tile img{width:100%;height:176px;object-fit:contain;display:block;background:#fff;border-radius:4px}
        .ed-rimg-tile-name{font-size:.6rem;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
        .ed-rimg-empty{font-size:.72rem;color:#888;font-style:italic;padding:.6rem .2rem .2rem}
        .ed-rimg-drop{display:block;border:1.5px dashed rgba(212,164,32,.45);border-radius:8px;padding:1.1rem 1rem;text-align:center;color:#bbb;font-size:.78rem;cursor:pointer;transition:background .15s,border-color .15s}
        .ed-rimg-drop:hover,.ed-rimg-drop.dragging{background:rgba(212,164,32,.08);border-color:#D4A420;color:#fff}
        .ed-rimg-drop b{color:#D4A420}
        .ed-rimg-drop small{display:block;margin-top:.35rem;color:#888;font-size:.66rem}
        .ed-rimg-actions{display:flex;justify-content:flex-end;gap:.5rem;margin-top:.85rem}
        .ed-rimg-status{font-size:.72rem;color:#D4A420;min-height:1em;margin-top:.3rem}
        .ed-rimg-status.err{color:#e88}
      `;
      document.head.appendChild(style);
    }
    if (!document.getElementById('ed-rimg-modal')) {
      const modal = document.createElement('div');
      modal.id = 'ed-rimg-modal';
      modal.className = 'ed-rimg-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-labelledby', 'ed-rimg-title');
      modal.innerHTML = `
        <div class="ed-rimg-box">
          <h2 id="ed-rimg-title" class="ed-rimg-title">Replace image</h2>
          <label class="ed-rimg-toggle">
            <input type="checkbox" id="ed-rimg-all-langs" checked>
            Apply to all languages
          </label>
          <div class="ed-rimg-section">From library</div>
          <div class="ed-rimg-library" id="ed-rimg-library"></div>
          <div class="ed-rimg-section">Upload new</div>
          <label class="ed-rimg-drop" id="ed-rimg-drop" for="ed-rimg-file">
            <b>Drag &amp; drop</b>, or click to choose a file
            <small>jpg, png, gif, webp, svg &middot; max 2 MB</small>
            <input type="file" id="ed-rimg-file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml" hidden>
          </label>
          <div class="ed-rimg-status" id="ed-rimg-status"></div>
          <div class="ed-rimg-actions">
            <button type="button" class="ed-act2" onclick="App.Editor._replaceImageClose()">Cancel</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => { if (e.target === modal) _replaceImageClose(); });
      const drop = modal.querySelector('#ed-rimg-drop');
      const file = modal.querySelector('#ed-rimg-file');
      file.addEventListener('change', () => {
        const f = file.files && file.files[0];
        if (f) _replaceImageHandleFile(f);
        file.value = '';
      });
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dragging'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('dragging'));
      drop.addEventListener('drop', (e) => {
        e.preventDefault();
        drop.classList.remove('dragging');
        const f = e.dataTransfer?.files?.[0];
        if (f) _replaceImageHandleFile(f);
      });
    }
    _replaceImgModalReady = true;
  }

  function _replaceImageSetStatus(msg, isError = false) {
    const el = document.getElementById('ed-rimg-status');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('err', !!isError);
  }

  async function _replaceImageOpen() {
    if (!_selectedProps || _selectedProps.tag !== 'IMG') {
      if (window.App?.Utils?.showToast) App.Utils.showToast('Select a hero image first.', true);
      return;
    }
    const w = _selectedProps.imgWidth || _selectedProps.rectWidth || 0;
    const h = _selectedProps.imgHeight || _selectedProps.rectHeight || 0;
    const minDim = Math.min(w, h);
    if (minDim < 80) {
      if (window.App?.Utils?.showToast) App.Utils.showToast('Replace is only available on hero images (≥ 80 px).', true);
      return;
    }
    _ensureReplaceImgModal();
    const modal = document.getElementById('ed-rimg-modal');
    if (!modal) return;
    _replaceImageSetStatus('');
    await _replaceImageRenderLibrary();
    modal.classList.add('active');
  }

  function _replaceImageClose() {
    const modal = document.getElementById('ed-rimg-modal');
    if (modal) modal.classList.remove('active');
  }

  // Decode a data: URI into a Blob without fetch() — works under file:// where
  // fetch of local resources is blocked.
  function _dataUriToBlob(dataUri) {
    const s = String(dataUri || '');
    const comma = s.indexOf(',');
    if (comma < 0 || !s.startsWith('data:')) return null;
    const meta = s.slice(5, comma);
    const mime = meta.split(';')[0] || 'application/octet-stream';
    const dataPart = s.slice(comma + 1);
    let bytes;
    if (/;base64/i.test(meta)) {
      const bin = atob(dataPart);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
      bytes = new TextEncoder().encode(decodeURIComponent(dataPart));
    }
    return new Blob([bytes], { type: mime });
  }

  // Seed from the committed data-URI bundle (assets/image-library/library.js →
  // window.App.ImageLibrary). No fetch, so the pre-staged library is available
  // whether the app is opened over http OR straight from a zip (file://).
  async function _replaceImageSeedFromBundle() {
    const lib = window.App && window.App.ImageLibrary;
    const entries = lib && Array.isArray(lib.images) ? lib.images : [];
    if (!entries.length || !window.App?.DB?.saveImage) return;
    for (const e of entries) {
      try {
        const blob = _dataUriToBlob(e && e.dataUri);
        if (!blob || blob.size > REPLACE_IMG_MAX_BYTES) continue;
        const mime = _replaceImageInferMime(e.filename, e.mimeType || blob.type);
        if (!REPLACE_IMG_MIME_OK.has(mime)) continue;
        const dims = await _imageDimensionsFromBlob(blob);
        await App.DB.saveImage({ filename: e.filename, mimeType: mime, blob, width: dims.width, height: dims.height });
      } catch (err) {
        console.warn('[replace-image] bundle seed failed for', e && e.filename, err);
      }
    }
  }

  async function _replaceImageSeedFromAssets() {
    // Seed the user's IndexedDB library from the pre-staged images. Runs once per
    // editor session. SHA-1 dedupe in saveImage() keeps this safe to re-run.
    // Primary source is the committed data-URI bundle (works file:// + http); the
    // fetch path below is a best-effort supplement for files added to
    // assets/image-library/ but not yet baked into the bundle (served envs only).
    if (_replaceImgLibrarySeeded) return;
    _replaceImgLibrarySeeded = true; // optimistic: don't retry on this session even if a fetch fails
    if (!window.App?.DB?.saveImage) return;
    await _replaceImageSeedFromBundle();
    let manifest = null;
    try {
      const resp = await fetch(`${REPLACE_IMG_LIBRARY_PATH}manifest.json`, { cache: 'no-cache' });
      if (!resp.ok) return;
      manifest = await resp.json();
    } catch (err) {
      console.warn('[replace-image] library manifest unavailable:', err);
      return;
    }
    const entries = Array.isArray(manifest?.images) ? manifest.images : [];
    if (!entries.length) return;
    let seeded = 0, skipped = 0;
    for (const raw of entries) {
      const filename = String(raw || '').trim();
      if (!filename) continue;
      try {
        const url = `${REPLACE_IMG_LIBRARY_PATH}${filename}`;
        const resp = await fetch(url, { cache: 'no-cache' });
        if (!resp.ok) {
          console.warn(`[replace-image] seed ${filename}: HTTP ${resp.status}`);
          skipped += 1;
          continue;
        }
        const fetchedBlob = await resp.blob();
        if (fetchedBlob.size > REPLACE_IMG_MAX_BYTES) {
          console.warn(`[replace-image] skipping ${filename}: ${(fetchedBlob.size / 1048576).toFixed(1)} MB > 2 MB cap`);
          skipped += 1;
          continue;
        }
        // Some static servers don't set Content-Type for .jpeg / .svg — infer
        // from the filename extension so the seed step still works.
        const mime = _replaceImageInferMime(filename, fetchedBlob.type);
        if (!REPLACE_IMG_MIME_OK.has(mime)) {
          console.warn(`[replace-image] skipping ${filename}: MIME ${fetchedBlob.type || '(none)'} not allowed`);
          skipped += 1;
          continue;
        }
        // Re-wrap with the inferred MIME so the Blob carries the right type
        // when it's stored and later rendered.
        const blob = (fetchedBlob.type === mime) ? fetchedBlob : new Blob([await fetchedBlob.arrayBuffer()], { type: mime });
        const dims = await _imageDimensionsFromBlob(blob);
        await App.DB.saveImage({
          filename,
          mimeType: mime,
          blob,
          width: dims.width,
          height: dims.height
        });
        seeded += 1;
      } catch (err) {
        console.warn(`[replace-image] seed ${filename} failed:`, err);
        skipped += 1;
      }
    }
    console.info(`[replace-image] library seed: ${seeded} stored, ${skipped} skipped`);
  }

  async function _replaceImageRenderLibrary() {
    const wrap = document.getElementById('ed-rimg-library');
    if (!wrap) return;
    wrap.innerHTML = '<div class="ed-rimg-empty">Loading…</div>';
    await _replaceImageSeedFromAssets();
    let images = [];
    try {
      if (window.App?.DB?.getAllImages) images = await App.DB.getAllImages();
    } catch (err) {
      console.warn('[replace-image] library load failed:', err);
    }
    if (!images.length) {
      wrap.innerHTML = '<div class="ed-rimg-empty">No images yet. Upload one below, or add files to <code>assets/image-library/</code> and list them in <code>manifest.json</code>.</div>';
      return;
    }
    wrap.innerHTML = '';
    for (const img of images) {
      try {
        const url = URL.createObjectURL(img.blob);
        const tile = document.createElement('div');
        tile.className = 'ed-rimg-tile';
        tile.title = `${img.filename || 'image'} · ${img.width}×${img.height} · ${Math.round((img.sizeBytes || 0) / 1024)} KB`;
        tile.innerHTML = `<img src="${url}" alt=""><span class="ed-rimg-tile-name">${(img.filename || 'image').replace(/[<>&]/g, '')}</span>`;
        tile.addEventListener('click', async () => {
          try {
            const dataUri = await _blobToDataUri(img.blob);
            await _replaceImageApply(dataUri, img);
          } finally {
            URL.revokeObjectURL(url);
          }
        });
        wrap.appendChild(tile);
      } catch (err) {
        console.warn('[replace-image] tile render failed for image', img.id, err);
      }
    }
  }

  function _blobToDataUri(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('File read failed'));
      reader.readAsDataURL(blob);
    });
  }

  function _imageDimensionsFromBlob(blob) {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(blob);
        const im = new Image();
        im.onload = () => {
          const w = im.naturalWidth || 0, h = im.naturalHeight || 0;
          URL.revokeObjectURL(url);
          resolve({ width: w, height: h });
        };
        im.onerror = () => { URL.revokeObjectURL(url); resolve({ width: 0, height: 0 }); };
        im.src = url;
      } catch (e) { resolve({ width: 0, height: 0 }); }
    });
  }

  async function _replaceImageHandleFile(file) {
    if (!file) return;
    if (!REPLACE_IMG_MIME_OK.has(file.type)) {
      _replaceImageSetStatus(`Unsupported file type: ${file.type || file.name}`, true);
      return;
    }
    if (file.size > REPLACE_IMG_MAX_BYTES) {
      _replaceImageSetStatus(`Image too large (${(file.size / 1048576).toFixed(1)} MB > 2 MB cap).`, true);
      return;
    }
    _replaceImageSetStatus('Reading file…');
    try {
      const dims = await _imageDimensionsFromBlob(file);
      let record = null;
      if (window.App?.DB?.saveImage) {
        record = await App.DB.saveImage({
          filename: file.name || 'upload',
          mimeType: file.type || 'application/octet-stream',
          blob: file,
          width: dims.width,
          height: dims.height
        });
      }
      const dataUri = await _blobToDataUri(file);
      await _replaceImageApply(dataUri, record);
      // Best-effort: persist into the project (assets/image-library/) so the
      // upload ships with the zip/server. Only works while authoring on the dev
      // server; on a recipient's static build it's a no-op (image stays local).
      await _replaceImagePersistToProject(file.name || 'upload', file.type, dataUri);
      await _replaceImageRenderLibrary();
    } catch (err) {
      console.warn('[replace-image] upload failed:', err);
      _replaceImageSetStatus(err?.message || 'Upload failed', true);
    }
  }

  function _replaceImageIsLocalhost() {
    try { return /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/.test(location.hostname); } catch (e) { return false; }
  }

  function _replaceImageSafeProjectName(filename, mimeType) {
    let base = String(filename || 'image').toLowerCase().replace(/[^a-z0-9._-]+/g, '_').replace(/^_+/, '');
    if (!base) base = 'image';
    if (!/\.(jpe?g|png|gif|webp|svg)$/.test(base)) {
      const ext = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' }[mimeType] || 'png';
      base = `${base}.${ext}`;
    }
    return base.slice(0, 80);
  }

  async function _replaceImagePersistToProject(filename, mimeType, dataUri) {
    if (!_replaceImageIsLocalhost()) return; // only when authoring with the dev server running
    const comma = String(dataUri || '').indexOf(',');
    if (comma < 0) return;
    const base64 = dataUri.slice(comma + 1);
    const safeName = _replaceImageSafeProjectName(filename, mimeType);
    try {
      const resp = await fetch('http://127.0.0.1:4175/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: safeName, mimeType, base64 })
      });
      if (resp.ok) {
        _replaceImageSetStatus(`Saved to the project library (${safeName}) — it will ship with the app.`);
      }
    } catch (err) {
      // No dev server (e.g. opened from a zip) — the image stays in this browser only.
      console.info('[replace-image] project save skipped (no dev server):', err && err.message);
    }
  }

  async function _replaceImageApply(dataUri, imageRecord) {
    if (!dataUri) return;
    if (!_selectedProps || _selectedProps.tag !== 'IMG') {
      _replaceImageSetStatus('Selection lost. Click the image again.', true);
      return;
    }
    _replaceImageSetStatus('Applying…');
    const applyAll = !!document.getElementById('ed-rimg-all-langs')?.checked;
    // 1. Apply to the iframe's current language (visual update).
    _pushUndo();
    _post('replaceImageSrc', { dataUri });
    _dirty = true;
    _status('Unsaved changes');

    if (!applyAll) {
      _replaceImageSetStatus('Replaced in current language.');
      setTimeout(_replaceImageClose, 450);
      return;
    }

    // 2. Mirror to every other language variant by DOM path.
    try {
      const sel = await _getSelectedBodyChildPath();
      if (sel.locked) {
        _replaceImageSetStatus('Element is locked — current language only.', true);
        setTimeout(_replaceImageClose, 800);
        return;
      }
      if (!sel.path?.length && !sel.relPath?.length) {
        _replaceImageSetStatus('Could not resolve image position in other languages.', true);
        setTimeout(_replaceImageClose, 800);
        return;
      }
      if (!window.App?.UI?.syncNewsletterElementImageSrcToAllLanguages) {
        _replaceImageSetStatus('Multi-language sync unavailable.', true);
        setTimeout(_replaceImageClose, 800);
        return;
      }
      // Persist the current language first so the workspace reflects what
      // the user just saw in the iframe.
      await saveToWorkspace();
      const r = await App.UI.syncNewsletterElementImageSrcToAllLanguages({
        path: sel.path,
        relPath: sel.relPath,
        dataUri,
        sourceLangId: _opts?.langId || 'en'
      });
      _replaceImageSetStatus(`Replaced in ${r.updated + 1} language(s)${r.failed ? `; ${r.failed} could not match.` : '.'}`);
      if (window.App?.Utils?.showToast) {
        const lib = imageRecord ? ` (${imageRecord.filename || 'image'})` : '';
        App.Utils.showToast(`Image replaced across ${r.updated + 1} language(s)${lib}.`);
      }
    } catch (err) {
      console.warn('[replace-image] all-languages sync failed:', err);
      _replaceImageSetStatus(err?.message || 'Sync failed', true);
    }
    setTimeout(_replaceImageClose, 700);
  }

  function _replaceImageUpdateButton(props) {
    const btn = document.getElementById('ed-replace-img-btn');
    if (!btn) return;
    const isImg = props && props.tag === 'IMG';
    // Prefer the new iframe-reported naturalWidth/Height, but fall back to
    // rectWidth/rectHeight (always reported) so the button works even when
    // the iframe is running pre-extension cached code.
    const w = isImg ? (props.imgWidth || props.rectWidth || 0) : 0;
    const h = isImg ? (props.imgHeight || props.rectHeight || 0) : 0;
    const minDim = Math.min(w, h);
    const eligible = isImg && minDim >= 80 && !props.locked;
    btn.disabled = !eligible;
    btn.title = eligible
      ? 'Replace this hero image from the library or upload a new one'
      : 'Select a hero image to replace';
  }

  function _status(txt) {
    const el = document.getElementById('editor-status');
    if (el) el.textContent = txt;
  }

  function _hexNorm(s) {
    if (!s || s === 'transparent') return '#000000';
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
    if (/^#[0-9a-fA-F]{3}$/.test(s)) return '#' + s[1]+s[1]+s[2]+s[2]+s[3]+s[3];
    return '#000000';
  }

  function _showIdle() {
    const i = document.getElementById('ed-panel-idle'), p = document.getElementById('ed-panel-props');
    if (i) i.style.display = ''; if (p) p.style.display = 'none';
    const fb = document.getElementById('ed-floatbar');
    if (fb) fb.classList.remove('active');
    // Left-nav Actions pane: show idle, hide the action body. Reset the
    // auto-switch flag so the next selection will pull Actions into view.
    const aIdle = document.getElementById('ed-nav-actions-idle');
    const aBody = document.getElementById('ed-nav-actions-body');
    if (aIdle) aIdle.style.display = '';
    if (aBody) aBody.style.display = 'none';
    _navAutoSwitchedForSelection = false;
    // If user deselects while the regen panel was open, close it cleanly
    // and drop any lingering iframe markers.
    const regenPanel = document.getElementById('ed-regen-panel');
    if (regenPanel && !regenPanel.hidden) {
      regenPanel.hidden = true;
      _regenSetStatus('');
      _post('clearRegenPending', null);
    }
  }

  function _updatePanel(props) {
    if (!props || !props.tag) { _showIdle(); return; }
    const i = document.getElementById('ed-panel-idle'), p = document.getElementById('ed-panel-props');
    if (i) i.style.display = 'none'; if (p) p.style.display = '';
    const banner = document.getElementById('ed-multisel-banner');
    const bcount = document.getElementById('ed-multisel-count');
    const mc = (typeof props.multiCount === 'number') ? props.multiCount : 1;
    if (banner) banner.style.display = (mc > 1) ? '' : 'none';
    if (bcount) bcount.textContent = String(mc);
    const tag = document.getElementById('ed-el-tag'), prev = document.getElementById('ed-el-preview');
    if (tag) tag.textContent = props.tag || '—';
    if (prev) prev.textContent = props.text || '—';
    // Left-nav Actions pane: swap idle for the action body and update its
    // tag/count. Auto-switch the visible tab to Actions so the buttons are
    // in view the moment the user selects (matches the "buttons live on the
    // left" simplification).
    const aIdle = document.getElementById('ed-nav-actions-idle');
    const aBody = document.getElementById('ed-nav-actions-body');
    if (aIdle) aIdle.style.display = 'none';
    if (aBody) aBody.style.display = '';
    const aTag = document.getElementById('ed-nav-actions-tag');
    if (aTag) aTag.textContent = `${props.tag || '—'}${mc > 1 ? ` × ${mc}` : ''}`;
    const aMsel = document.getElementById('ed-nav-multisel-banner');
    const aMselCount = document.getElementById('ed-nav-multisel-count');
    if (aMsel) aMsel.style.display = (mc > 1) ? '' : 'none';
    if (aMselCount) aMselCount.textContent = String(mc);
    // Auto-switch to Actions ONLY on the first selection after a deselect.
    // Once the user has interacted, respect whichever tab they're on so we
    // don't yank them back every time they click another element.
    if (!_navAutoSwitchedForSelection) {
      const activeNavTab = document.querySelector('.ed-nav-tab.active');
      const isOnActions = activeNavTab && activeNavTab.textContent.trim().toLowerCase() === 'actions';
      if (!isOnActions) {
        const actionsTab = Array.from(document.querySelectorAll('.ed-nav-tab')).find(b => b.textContent.trim().toLowerCase() === 'actions');
        if (actionsTab) actionsTab.click();
      }
      _navAutoSwitchedForSelection = true;
    }
    const pCol = document.getElementById('prop-color'), pColH = document.getElementById('prop-color-hex');
    if (props.color) {
      if (pCol) { try { pCol.value = _hexNorm(props.color); } catch(e){} }
      if (pColH) pColH.value = props.color;
    }
    const pBg = document.getElementById('prop-bg'), pBgH = document.getElementById('prop-bg-hex');
    if (props.bgColor) { if (pBg) { try { pBg.value = _hexNorm(props.bgColor); } catch(e){} } }
    if (pBgH) pBgH.value = props.bgColor || '';
    const sz = parseInt(props.fontSize) || 14;
    const pSz = document.getElementById('prop-size'), pSzR = document.getElementById('prop-size-range');
    if (pSz) pSz.value = sz; if (pSzR) pSzR.value = Math.min(sz, 80);
    const pW = document.getElementById('prop-width'), pPad = document.getElementById('prop-padding');
    if (pW) pW.value = props.width || '';
    if (pPad) pPad.value = props.padding || '';
    const fB = document.getElementById('fmt-bold'), fI = document.getElementById('fmt-italic'), fU = document.getElementById('fmt-underline');
    if (fB) fB.classList.toggle('on', !!props.bold);
    if (fI) fI.classList.toggle('on', !!props.italic);
    if (fU) fU.classList.toggle('on', !!props.underline);
    const pTxt = document.getElementById('prop-text-area');
    if (pTxt) pTxt.value = (props.textFull != null ? props.textFull : props.text) || '';
    const syncBtn = document.getElementById('ed-text-sync-btn');
    if (syncBtn) {
      const full = (props.textFull != null ? props.textFull : props.text) || '';
      syncBtn.disabled = props.locked || !String(full).trim();
    }
    _regenSetButtonState();
    _replaceImageUpdateButton(props);
    const fb = document.getElementById('ed-floatbar');
    if (fb && Number.isFinite(props.rectTop) && Number.isFinite(props.rectLeft)) {
      const ifr = _ifrm();
      const r = ifr?.getBoundingClientRect();
      // Anchor the floatbar to the canvas-scroll viewport, not the window.
      // Otherwise the previous `Math.max(70, ...)` pinned the toolbar to the
      // top of the viewport when an element was high in the iframe + the
      // canvas had scrolled — covering the section header.
      const canvasScroll = document.querySelector('.ed-canvas-scroll');
      const csRect = canvasScroll ? canvasScroll.getBoundingClientRect()
                                  : { top: 70, bottom: window.innerHeight - 10 };
      const fbH = fb.offsetHeight || 34;
      const fbW = fb.offsetWidth  || 180;
      if (r) {
        const elemTop = r.top + props.rectTop;
        const elemBottom = elemTop + (Number.isFinite(props.rectHeight) ? props.rectHeight : 24);
        // Prefer ABOVE the element. If that would clip above the canvas-scroll
        // viewport (or above the canvas-hint bar), put the toolbar BELOW.
        const aboveY = elemTop - fbH - 6;
        const belowY = elemBottom + 6;
        let top = aboveY >= csRect.top + 4 ? aboveY : belowY;
        // Final clamp to canvas-scroll bounds so the toolbar never escapes
        // the canvas area into a section header / page chrome.
        top = Math.max(csRect.top + 4, Math.min(csRect.bottom - fbH - 4, top));
        const centerX = r.left + props.rectLeft + (props.rectWidth || 0) / 2 - fbW / 2;
        const left = Math.max(csRect.left + 4 || 10,
                              Math.min((csRect.right || window.innerWidth) - fbW - 4, centerX));
        fb.style.top = `${top}px`;
        fb.style.left = `${left}px`;
        fb.classList.add('active');
      }
    }
  }

  // Commit semantics: push the last baseline (PRE-mutation state) onto the undo
  // stack, then refresh baseline to the current iframe HTML. Idempotent — no-ops
  // if nothing has actually changed since the last commit.
  function _commit() {
    const cur = _iframeHtml(); if (!cur) return;
    if (cur === _baseline) return;
    _undoStack.push(_baseline);
    _redoStack = [];
    if (_undoStack.length > 40) _undoStack.shift();
    _baseline = cur;
    _updateHistoryButtons();
  }

  // Snapshot current iframe state as the new baseline without pushing onto the
  // stack. Used on open() and reset() to seed the starting point.
  function _resetBaseline() {
    _baseline = _iframeHtml();
    _textEditActive = false;
    _updateHistoryButtons();
  }

  // Older call sites used _pushUndo() before mutating. Keep the name as an
  // alias for _commit so any straggling references stay correct.
  function _pushUndo() { _commit(); }

  function _updateHistoryButtons() {
    const u = document.getElementById('ed-undo-btn');
    const r = document.getElementById('ed-redo-btn');
    if (u) u.disabled = _undoStack.length === 0;
    if (r) r.disabled = _redoStack.length === 0;
  }

  function _buildNav(f) {
    const list = document.getElementById('ed-nav-list'); if (!list) return;
    try {
      const doc = f.contentDocument; if (!doc || !doc.body) return;
      const seen = new Set(); let html = '';
      // Email-safe templates use data-nl-nav attributes directly (no CSS classes allowed)
      doc.body.querySelectorAll('[data-nl-nav]').forEach(el => {
        const k = el.getAttribute('data-nl-nav');
        if (!k || seen.has(k)) return; seen.add(k);
        html += `<div class="ed-nav-item" onclick="App.Editor._scrollTo('${k.replace(/'/g, "\\'")}')">${k.replace('nl-', '').replace(/-/g, ' ')}</div>`;
      });
      // Legacy screen-only templates use nl-* CSS classes
      doc.body.querySelectorAll('[class*="nl-"]').forEach(el => {
        const k = Array.from(el.classList).find(c => c.startsWith('nl-'));
        if (!k || seen.has(k)) return; seen.add(k);
        el.setAttribute('data-nl-nav', k);
        html += `<div class="ed-nav-item" onclick="App.Editor._scrollTo('${k.replace(/'/g, "\\'")}')">${k.replace('nl-', '').replace(/-/g, ' ')}</div>`;
      });
      list.innerHTML = html || '<div class="ed-nav-item" style="opacity:.35;cursor:default;font-size:.65rem;padding:.6rem .72rem">(scroll to navigate)</div>';
    } catch(e) { list.innerHTML = ''; }
  }

  function _buildSrcdoc(html, css, langId, portalUrl) {
    const fonts = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,400&family=DM+Serif+Display:ital@0;1&display=swap';
    const inject = `<style data-nl-ed-inject>*{box-sizing:border-box}body{margin:0;padding:24px;background:#C5BEAF;font-family:'DM Sans',sans-serif;overflow-x:hidden}body>div:first-child{max-width:100%!important;overflow-x:hidden}a[href^="mailto:"]{word-break:break-all!important;white-space:normal!important;max-width:100%!important;flex-shrink:1!important}</style>`;
    const qr = `(function(){try{var Q=window.QRCode||(window.parent&&window.parent.QRCode);var el=document.getElementById('nl-qr');if(!el||!Q)return;var holder=document.createElement('div');holder.style.cssText='position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden';document.body.appendChild(holder);try{new Q(holder,{text:${JSON.stringify(portalUrl || 'https://security.example.com')},width:144,height:144,colorDark:'#000',colorLight:'#fff',correctLevel:(Q.CorrectLevel||{H:2}).H});var c=holder.querySelector('canvas');var uri=c?c.toDataURL('image/png'):(holder.querySelector('img')&&holder.querySelector('img').getAttribute('src'))||'';if(uri){el.innerHTML='';var im=document.createElement('img');im.setAttribute('src',uri);im.setAttribute('alt','QR code');im.setAttribute('width','144');im.setAttribute('height','144');im.style.display='block';el.appendChild(im);}}finally{holder.remove();}}catch(e){}})();`;
    const script = '(' + _nlEdFn.toString() + ')();';
    return `<!DOCTYPE html><html lang="${langId}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><link href="${fonts}" rel="stylesheet">${css ? '<style>' + css + '</style>' : ''}${inject}</head><body>${html}<script>${qr}<\/script><script>${script}<\/script></body></html>`;
  }

  /* ────────────────────────────────────────────────────────
     MESSAGE HANDLER
     ──────────────────────────────────────────────────────── */
  function _msgHandler(e) {
    // Only accept messages from our own editor iframe. srcdoc iframes can
    // report event.origin as "null" in some browsers, so the most reliable
    // check is event.source identity against the iframe's contentWindow.
    const f = _ifrm();
    if (!f || e.source !== f.contentWindow) return;
    const d = e.data; if (!d || !d._nlEd) return;
    switch (d.type) {
      case 'ready':    _status('Ready'); break;
      case 'height': { const f = _ifrm(); if (f && d.h > 200) f.style.height = Math.ceil(d.h + 16) + 'px'; break; }
      case 'cleanHtml': if (_cleanResolve) { _cleanResolve(d.html || ''); _cleanResolve = null; } break;
      case 'domPath':
        if (_domPathResolve) {
          _domPathResolve({
            path: Array.isArray(d.path) ? d.path : null,
            relPath: Array.isArray(d.relPath) ? d.relPath : null,
            locked: !!d.locked
          });
          _domPathResolve = null;
        }
        break;
      case 'domPaths':
        if (_domPathsResolve) {
          _domPathsResolve({ items: Array.isArray(d.items) ? d.items : [] });
          _domPathsResolve = null;
        }
        break;
      case 'select':   _selectedProps = d; _updatePanel(d); break;
      case 'deselect': _selectedProps = null; _showIdle(); _status('Ready'); break;
      case 'editDone':
        _dirty = true;
        _status('Unsaved changes');
        // Typing session ends \u2014 fold the whole session into a single undo step.
        _textEditActive = false;
        _commit();
        if (d.textFull && String(d.textFull).trim() && !d.locked &&
            ((Array.isArray(d.path) && d.path.length) || (Array.isArray(d.relPath) && d.relPath.length))) {
          _status('Tip: sync other languages with the button in the right panel');
        }
        break;
      case 'update':
        _dirty = true;
        _status('Unsaved changes');
        if (d.tag) { _selectedProps = d; _updatePanel(d); }
        // During typing, we want one undo entry per session, not per keystroke.
        // Mark the session active; commit happens once on editDone.
        if (d.fromTyping) { _textEditActive = true; }
        else { _commit(); }
        break;
      case 'editing':  _status('Editing text\u2026'); _textEditActive = true; break;
      case 'deleted':  _dirty = true; _status('Unsaved changes'); _selectedProps = null; _showIdle(); _commit(); break;
      case 'moved':    _dirty = true; _status('Unsaved changes'); _commit(); break;
      case 'added':    _dirty = true; _status('Unsaved changes'); _commit(); break;
      case 'dragReady': _status('Drag the element in the canvas \u2014 drop to reorder'); break;
      case 'locked': _status('Element is locked'); break;
      case 'selectionTexts':
        if (_regenResolve) { _regenResolve(Array.isArray(d.items) ? d.items : []); _regenResolve = null; }
        break;
      case 'selectionApplied':
        if (_regenAppliedResolve) { _regenAppliedResolve(d.applied || 0); _regenAppliedResolve = null; }
        break;
    }
  }

  function _keyHandler(ev) {
    // Only act while the editor modal is open. Iframe-internal typing has its
    // own focus and shouldn't be hijacked by the parent's shortcuts.
    const modal = document.getElementById('editor-modal');
    if (!modal || !modal.classList.contains('active')) return;
    const mod = ev.ctrlKey || ev.metaKey;
    if (!mod) return;
    const k = (ev.key || '').toLowerCase();
    if (k === 'z' && !ev.shiftKey) { ev.preventDefault(); _undo(); }
    else if ((k === 'z' && ev.shiftKey) || k === 'y') { ev.preventDefault(); _redo(); }
  }

  /* ────────────────────────────────────────────────────────
     EDITOR ACTIONS (called from onclick in injected HTML)
     ──────────────────────────────────────────────────────── */
  function _prop(cmd, val) { if (!_selectedProps) return; _pushUndo(); _post(cmd, val); _dirty = true; _status('Unsaved changes'); }

  function _propHex(cmd, val) {
    if (!val || !/^#[0-9a-fA-F]{3,8}$/.test(val)) return;
    _prop(cmd, val);
  }

  function _propSize(val) {
    const sz = parseInt(val); if (!sz || sz < 4) return;
    const ps = document.getElementById('prop-size'), psr = document.getElementById('prop-size-range');
    if (ps) ps.value = sz; if (psr) psr.value = Math.min(sz, 80);
    if (!_selectedProps) return;
    _pushUndo(); _post('size', sz); _dirty = true; _status('Unsaved changes');
  }

  function _toggle(cmd) { if (!_selectedProps) return; _pushUndo(); _post(cmd, null); _dirty = true; _status('Unsaved changes'); }
  function _setText(val) { if (!_selectedProps) return; _post('text', val); _dirty = true; _status('Unsaved changes'); }
  function _deselect() { _post('deselect', null); _selectedProps = null; _showIdle(); }
  function _delete() { _post('delete', null); }
  function _moveUp() { _post('moveUp', null); }
  function _moveDown() { _post('moveDown', null); }
  function _startDrag() { _post('enableDrag', null); }
  function _duplicate() { _post('duplicate', null); }
  function _lockToggle() { _post('lockToggle', null); }
  function _applyPreset(presetId) { _pushUndo(); _post('preset', presetId); _dirty = true; _status('Unsaved changes'); }

  function _setWidth(val) {
    if (!_selectedProps) return;
    _pushUndo(); _post('width', parseInt(val) || 0); _dirty = true; _status('Unsaved changes');
  }

  function _setPadding(val) {
    if (!_selectedProps) return;
    _pushUndo(); _post('padding', parseInt(val) || 0); _dirty = true; _status('Unsaved changes');
  }

  function _addEl(idx) { const p = ELEMS[idx]; if (!p) return; _post('addEl', p.html); }
  function _addSec(idx) { const p = SECTIONS[idx]; if (!p) return; _post('addSec', p.html); }

  function _scrollTo(key) {
    const f = _ifrm(); if (!f || !f.contentDocument) return;
    try { const el = f.contentDocument.querySelector('[data-nl-nav="' + key + '"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e){}
  }

  function _device(btn, w) {
    document.querySelectorAll('.ed-dpill').forEach(b => b.classList.toggle('active', b === btn));
    const frame = document.getElementById('ed-canvas-frame'); if (frame) frame.style.maxWidth = w || '100%';
    _status({ '': 'Desktop', '700px': 'Email 700px', '390px': 'Mobile 390px' }[w] ?? w);
  }

  function _navTab(btn, pane) {
    document.querySelectorAll('.ed-nav-tab').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.ed-nav-pane').forEach(p => p.classList.toggle('active', p.id === 'ed-nav-' + pane));
  }

  // Restore iframe body to the given HTML and tell the iframe to rebind any
  // post-restore state (deselect, reattach delegated listeners if needed).
  function _restoreIframeBody(html) {
    const f = _ifrm();
    if (!f || !f.contentDocument || !f.contentDocument.body) return false;
    try {
      f.contentDocument.body.innerHTML = html;
      // Nudge the iframe script to re-measure height and clear any stale
      // selection markers left over from before the restore.
      try { _post('rescanAfterRestore', null); } catch(e) {}
      try { _post('clearRegenPending', null); } catch(e) {}
    } catch (e) { return false; }
    return true;
  }

  function _undo() {
    // If user is mid-typing, fold that session in first so undo rolls it back
    // as one step rather than getting eaten by a stale baseline.
    if (_textEditActive) { _textEditActive = false; _commit(); }
    if (!_undoStack.length) { _status('Nothing to undo'); return; }
    const cur = _iframeHtml();
    const prev = _undoStack.pop();
    if (cur && cur !== prev) _redoStack.push(cur);
    if (!_restoreIframeBody(prev)) { _status('Undo failed'); return; }
    _baseline = prev;
    _dirty = true;
    _selectedProps = null;
    _showIdle();
    _status('Undo applied');
    _updateHistoryButtons();
  }

  function _redo() {
    if (_textEditActive) { _textEditActive = false; _commit(); }
    if (!_redoStack.length) { _status('Nothing to redo'); return; }
    const cur = _iframeHtml();
    const next = _redoStack.pop();
    if (cur && cur !== next) _undoStack.push(cur);
    if (!_restoreIframeBody(next)) { _status('Redo failed'); return; }
    _baseline = next;
    _dirty = true;
    _selectedProps = null;
    _showIdle();
    _status('Redo applied');
    _updateHistoryButtons();
  }

  function _reset() {
    if (!_opts || !_opts.onGetResetData) return;
    const data = _opts.onGetResetData();
    if (!data) return;
    const f = _ifrm(); if (!f) return;
    _undoStack = []; _redoStack = []; _dirty = false; _baseline = ''; _textEditActive = false;
    f.style.height = '800px';
    f.srcdoc = _buildSrcdoc(data.html, data.css, _opts.langId, _opts.portalUrl);
    _showIdle(); _status('Reset to base');
    _updateHistoryButtons();
  }

  async function _preview() {
    const html = await _iframeCleanHtml(); if (!html) return;
    let css = '';
    try { const f = _ifrm(); if (f && f.contentDocument && f.contentDocument.head) f.contentDocument.head.querySelectorAll('style:not([data-nl-ed-inject])').forEach(st => { css += (st.textContent || '') + '\n'; }); } catch(e){}
    const full = `<!DOCTYPE html><html lang="${_opts.langId}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,400&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet"><style>*{box-sizing:border-box}body{margin:0;background:#C5BEAF;padding:20px}a[href^="mailto:"]{word-break:break-all;white-space:normal;max-width:100%}</style>${css ? '<style>' + css.trim() + '</style>' : ''}</head><body>${html}</body></html>`;
    const url = URL.createObjectURL(new Blob([full], { type: 'text/html;charset=utf-8' }));
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w) alert('Allow pop-ups to open the preview tab.');
    setTimeout(() => URL.revokeObjectURL(url), 180000);
  }

  /* ────────────────────────────────────────────────────────
     PUBLIC API
     ──────────────────────────────────────────────────────── */
  function open(opts) {
    _opts = opts;
    const modal = document.getElementById('editor-modal'); if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    const lbl = document.getElementById('editor-lang-label');
    if (lbl) lbl.textContent = 'Newsletter Studio \u2014 ' + (opts.langLabel || opts.langId || '');
    _undoStack = []; _redoStack = []; _baseline = ''; _textEditActive = false;
    _dirty = false; _selectedProps = null;
    _navAutoSwitchedForSelection = false;
    _showIdle(); _status('Loading\u2026');
    _updateHistoryButtons();
    window.removeEventListener('message', _msgHandler);
    window.addEventListener('message', _msgHandler);
    window.removeEventListener('keydown', _keyHandler, true);
    window.addEventListener('keydown', _keyHandler, true);
    const f = _ifrm(); if (!f) return;
    f.style.height = '800px';
    f.srcdoc = _buildSrcdoc(opts.html || '', opts.css || '', opts.langId || 'en', opts.portalUrl);
    const frame = document.getElementById('ed-canvas-frame');
    if (frame) frame.style.maxWidth = '700px';
    document.querySelectorAll('.ed-dpill').forEach(b => b.classList.toggle('active', b.getAttribute('data-w') === '700px'));
    f.onload = function () { _buildNav(f); _resetBaseline(); _status('Ready'); };
    // Make sure the regen button reflects the language we just opened in
    // (disabled in non-English, since auto-translation flows EN -> others).
    _regenSetButtonState();
  }

  async function _extractIframeVariant() {
    const html = await _iframeCleanHtml();
    if (!html) return null;
    let css = '';
    try {
      const f = _ifrm();
      if (f && f.contentDocument && f.contentDocument.head) {
        f.contentDocument.head.querySelectorAll('style:not([data-nl-ed-inject])').forEach(st => { css += (st.textContent || '') + '\n'; });
      }
    } catch (e) {}
    return { html, css: css.trim() };
  }

  /** Persist iframe HTML/CSS to the workspace for the open language (does not close the editor). */
  async function saveToWorkspace() {
    if (!_opts) return false;
    _status('Saving\u2026');
    const v = await _extractIframeVariant();
    if (!v) { _status('Error \u2014 no content'); return false; }
    if (_opts.onSave) _opts.onSave({ html: v.html, css: v.css, langId: _opts.langId });
    _dirty = false; _status('Saved');
    return true;
  }

  /** Sync canvas to workspace, then persist a versioned project snapshot (IndexedDB via App.UI). */
  async function saveToWorkspaceAndProject() {
    const ok = await saveToWorkspace();
    if (!ok) return;
    if (!window.App?.UI || typeof App.UI.saveProjectVersion !== 'function') return;
    _status('Saving project\u2026');
    const project = await App.UI.saveProjectVersion();
    const modal = document.getElementById('editor-modal');
    if (modal && modal.classList.contains('active')) {
      _status(project ? 'Saved & stored' : 'Workspace saved');
    }
  }

  async function downloadCurrentLanguage() {
    const ok = await saveToWorkspace();
    if (!ok) return;
    if (window.App && App.UI && typeof App.UI.downloadCurrentHTML === 'function') App.UI.downloadCurrentHTML();
  }

  async function downloadCurrentEml() {
    const ok = await saveToWorkspace();
    if (!ok) return;
    if (window.App && App.UI && typeof App.UI.downloadCurrentEml === 'function') await App.UI.downloadCurrentEml();
  }

  async function downloadAllLanguages() {
    const ok = await saveToWorkspace();
    if (!ok) return;
    if (window.App && App.UI && typeof App.UI.downloadAllHTML === 'function') await App.UI.downloadAllHTML();
  }

  /** @deprecated Use saveToWorkspace; kept for compatibility (no longer closes the modal). */
  async function save() {
    return saveToWorkspace();
  }

  function close() {
    const modal = document.getElementById('editor-modal');
    if (modal && modal.classList.contains('active') && _dirty) {
      if (!confirm('You have unsaved changes. Close without saving?')) return;
    }
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    window.removeEventListener('message', _msgHandler);
    window.removeEventListener('keydown', _keyHandler, true);
    const fb = document.getElementById('ed-floatbar');
    if (fb) fb.classList.remove('active');
    _selectedProps = null; _showIdle();
    if (_opts && _opts.onClose) _opts.onClose();
    _opts = null;
  }

  /* ────────────────────────────────────────────────────────
     INIT — inject CSS + HTML once when the script loads
     ──────────────────────────────────────────────────────── */
  (function _init() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    const wrap = document.createElement('div');
    wrap.innerHTML = _buildHtml();
    document.body.appendChild(wrap.firstElementChild);
  })();

  return {
    open, save, saveToWorkspace, saveToWorkspaceAndProject, downloadCurrentLanguage, downloadCurrentEml, downloadAllLanguages, close,
    deleteSelectedInAllLanguages, flushOpenEditorToWorkspace,
    _syncTextToOtherLanguages,
    // Internal actions bound by onclick in injected HTML
    _prop, _propHex, _propSize, _toggle, _setText, _deselect,
    _delete, _moveUp, _moveDown, _startDrag, _duplicate, _lockToggle, _applyPreset,
    _setWidth, _setPadding,
    _addEl, _addSec,
    _device, _navTab, _scrollTo,
    _undo, _redo, _reset, _preview,
    _regenOpen, _regenCancel, _regenRun,
    _replaceImageOpen, _replaceImageClose
  };
})();
