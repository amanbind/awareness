window.App = window.App || {};

App.UXContract = (() => {
  'use strict';

  const WORKSPACE_STORAGE_KEY = 'awareness_newsletter_workspace_v1';

  const MAJOR_PAGES = [
    { id: 'index', label: 'Home', href: 'index.html#section-home' },
    { id: 'keywords', label: 'Keywords', href: 'keywords.html' },
    { id: 'curation-lab', label: 'Curation lab', href: 'curation-lab.html' },
    // 'preview' (preview.html) was removed from the top nav per user request.
    // The Preview page still works — reach it via goToPreviewPage() or direct URL.
    { id: 'editor', label: 'Editor', href: 'editor.html' },
    { id: 'send', label: 'Send', href: 'send.html' },
    { id: 'projects', label: 'Projects', href: 'projects.html' },
    { id: 'config', label: 'Config', href: 'config.html' }
  ];

  const PRIMARY_FLOW = [
    { id: 'fetch', label: 'Fetch' },
    { id: 'curate', label: 'Curate' },
    { id: 'build', label: 'Build' },
    { id: 'preview', label: 'Preview' },
    { id: 'edit', label: 'Edit' },
    { id: 'approve', label: 'Approve' },
    { id: 'send', label: 'Send' }
  ];

  function injectStyles() {
    if (document.getElementById('ux-contract-style')) return;
    const style = document.createElement('style');
    style.id = 'ux-contract-style';
    style.textContent = `
      .ux-shell {
        position: sticky;
        top: 0;
        z-index: 999;
        background: rgba(10, 10, 10, 0.95);
        border-bottom: 1px solid rgba(255,255,255,.15);
        backdrop-filter: blur(8px);
        padding: .6rem .9rem;
      }
      .ux-shell-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: .6rem;
        flex-wrap: wrap;
      }
      .ux-menu {
        display: flex;
        gap: .4rem;
        flex-wrap: wrap;
      }
      .ux-menu-link {
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 999px;
        color: #d7d7d7;
        text-decoration: none;
        font-size: .72rem;
        padding: .26rem .62rem;
      }
      .ux-menu-link.active {
        border-color: rgba(212,164,32,.8);
        color: #d4a420;
        background: rgba(212,164,32,.1);
      }
      .ux-flow {
        display: flex;
        align-items: center;
        gap: .35rem;
        flex-wrap: wrap;
        font-size: .65rem;
        color: #b9b9b9;
      }
      .ux-step {
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 999px;
        padding: .15rem .5rem;
        text-transform: uppercase;
        letter-spacing: .04em;
      }
      .ux-step.active {
        border-color: rgba(212,164,32,.8);
        color: #d4a420;
        background: rgba(212,164,32,.1);
      }
      .ux-step.done {
        border-color: rgba(85,180,120,.6);
        color: #68ca90;
      }
      .ux-flow-sep { opacity: .45; }
      .ux-guard {
        margin: .9rem;
        border: 1px solid rgba(255,120,120,.35);
        background: rgba(255,120,120,.08);
        border-radius: 10px;
        padding: .9rem;
      }
      .ux-guard h2 { margin: 0 0 .35rem; font-size: 1rem; color: #ffb4b4; }
      .ux-guard p { margin: 0; color: #dfdfdf; line-height: 1.5; }
      .ux-guard-actions { margin-top: .7rem; display: flex; gap: .5rem; flex-wrap: wrap; }
      .ux-guard-actions a {
        text-decoration: none;
        border: 1px solid rgba(255,255,255,.2);
        color: #ececec;
        border-radius: 7px;
        padding: .36rem .62rem;
        font-size: .78rem;
      }
      .ux-state-card {
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 8px;
        padding: .8rem;
        margin-bottom: .6rem;
        background: rgba(255,255,255,.03);
      }
      .ux-state-card.error {
        border-color: rgba(255,120,120,.4);
        background: rgba(255,120,120,.08);
      }
      .ux-state-card.loading {
        border-color: rgba(212,164,32,.45);
        background: rgba(212,164,32,.08);
      }
      .ux-state-card h3 { margin: 0 0 .25rem; font-size: .85rem; }
      .ux-state-card p { margin: 0; font-size: .78rem; color: #cbcbcb; }
      @media (max-width: 680px) {
        .ux-shell { padding: .55rem .55rem; }
      }
    `;
    document.head.appendChild(style);
  }

  function renderShell(pageId, flowStepId) {
    if (document.getElementById('ux-shell')) return;
    const shell = document.createElement('div');
    shell.id = 'ux-shell';
    shell.className = 'ux-shell';

    const menu = MAJOR_PAGES.map((page) => {
      const active = page.id === pageId ? 'active' : '';
      return `<a class="ux-menu-link ${active}" href="${page.href}">${page.label}</a>`;
    }).join('');

    const activeIdx = PRIMARY_FLOW.findIndex((step) => step.id === flowStepId);
    const steps = PRIMARY_FLOW.map((step, idx) => {
      const cls = idx < activeIdx ? 'done' : idx === activeIdx ? 'active' : '';
      return `<span class="ux-step ${cls}">${step.label}</span>`;
    }).join('<span class="ux-flow-sep">→</span>');

    shell.innerHTML = `
      <div class="ux-shell-row">
        <nav class="ux-menu" aria-label="Global menu">${menu}</nav>
        <div class="ux-flow" aria-label="Primary flow">${steps}</div>
      </div>
    `;
    document.body.insertBefore(shell, document.body.firstChild);
  }

  const HOME_BUILDER_HREF = 'index.html#section-home';

  function attachHomeNavBehavior() {
    if (document.body.dataset.uxHomeNavBound === '1') return;
    document.body.dataset.uxHomeNavBound = '1';
    document.addEventListener('click', handleHomeNavClick, true);
  }

  function handleHomeNavClick(e) {
    const link = e.target.closest('a.ux-menu-link');
    if (!link || link.getAttribute('href') !== HOME_BUILDER_HREF) return;
    const path = (window.location.pathname || '').split('/').pop() || '';
    const onIndex = path === 'index.html' || path === '';
    if (onIndex && window.location.hash === '#section-home' && App.UI?.navigateTo) {
      e.preventDefault();
      App.UI.navigateTo('section-home', { keepPreview: true });
      return;
    }
    e.preventDefault();
    if (App.RouterNav?.goto) {
      App.RouterNav.goto('index.html#section-home', { source: 'shell-home', clearProjectContext: true });
    } else {
      window.location.href = HOME_BUILDER_HREF;
    }
  }

  function hasWorkspace() {
    try {
      const parsed = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEY) || 'null');
      if (parsed && parsed.variants) return true;
    } catch (e) {
      // fall through
    }
    try {
      const handoff = App.RouterNav?.getHandoff?.() || {};
      if (handoff.projectId) return true;
    } catch {}
    return false;
  }

  function renderGuard(message) {
    const handoff = App.RouterNav?.getHandoff?.() || {};
    const sourcePage = typeof handoff.source === 'string' ? `${handoff.source}.html` : '';
    const canRecoverToSource = !!sourcePage && MAJOR_PAGES.some(page => page.href.split('#')[0] === sourcePage);
    const guard = document.createElement('section');
    guard.className = 'ux-guard';
    guard.innerHTML = `
      <h2>Workflow Guard</h2>
      <p>${message}</p>
      <div class="ux-guard-actions">
        ${canRecoverToSource ? `<a href="${sourcePage}">Return to Previous Step</a>` : ''}
        <a href="projects.html">Go to Projects</a>
        <a href="#" onclick="event.preventDefault();App.RouterNav.goto('index.html#section-home',{source:'guard',clearProjectContext:true});">Go Home</a>
      </div>
    `;
    const target = document.querySelector('.wrap') || document.querySelector('#main') || document.body;
    target.insertBefore(guard, target.firstChild);
  }

  function enforceGuard(guard) {
    if (!guard) return true;
    if (guard === 'workspace-required' && !hasWorkspace()) {
      renderGuard('This page requires an active newsletter workspace. Build or load a project first.');
      return false;
    }
    return true;
  }

  function renderStateCard(containerId, variant, title, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
      <div class="ux-state-card ${variant || ''}">
        <h3>${title || 'Status'}</h3>
        <p>${message || ''}</p>
      </div>
    `;
  }

  function init(options = {}) {
    const pageId = options.pageId || '';
    const flowStepId = options.flowStepId || '';
    const guard = options.guard || null;
    injectStyles();
    renderShell(pageId, flowStepId);
    attachHomeNavBehavior();
    enforceGuard(guard);
  }

  return {
    MAJOR_PAGES,
    PRIMARY_FLOW,
    init,
    injectStyles,
    renderStateCard
  };
})();
