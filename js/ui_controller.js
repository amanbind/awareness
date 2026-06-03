/* ═══════════════════════════════════════════════════════════
   ui_controller.js — Single-page UI controller
   Streamlined workflow: pick template → fetch → select → generate
   ═══════════════════════════════════════════════════════════ */
window.App = window.App || {};

App.UI = (() => {
  'use strict';
  const {
    log, clearLog, fmtDate, daysAgo, isWithinDays, copyHTML, showToast, skeleton, wait,
    downloadHTML, htmlToSvgExport, downloadBlob, injectNlQrImageIntoHtml, stripTags
  } = App.Utils;
  const G = App.Graphics;
  const TranslationMetrics = App.TranslationMetrics;
  const WORKSPACE_STORAGE_KEY = 'awareness_newsletter_workspace_v1';
  const WORKSPACE_CHECKPOINT_KEY = 'awareness_newsletter_workspace_checkpoint_v1';
  const WORKSPACE_CHECKPOINT_BACKUP_KEY = 'awareness_newsletter_workspace_checkpoint_backup_v1';
  const SMTP_STORAGE_KEY = 'awareness_smtp_profile_v1';
  const AI_SETTINGS_STORAGE_KEY = 'awareness_ai_settings_v1';
  // AI API key is intentionally session-only: it lives in sessionStorage so it
  // is cleared on tab close / fresh app launch and is never written to
  // localStorage. Users must re-enter the key each time they re-open the app.
  const AI_KEY_SESSION_STORAGE_KEY = 'awareness_ai_key_session_v1';
  // SMTP password follows the same pattern as the AI key: stored in
  // sessionStorage only (tab-scoped), never persisted to localStorage or
  // IndexedDB. Mirrors AI_KEY_SESSION_STORAGE_KEY.
  const SMTP_PASSWORD_SESSION_STORAGE_KEY = 'awareness_smtp_password_session_v1';
  // Microsoft Graph client secret follows the same session-only rule as the
  // SMTP password: it lives in sessionStorage (tab-scoped) and is never written
  // to localStorage or IndexedDB. Mirrors SMTP_PASSWORD_SESSION_STORAGE_KEY.
  const GRAPH_SECRET_SESSION_STORAGE_KEY = 'awareness_graph_client_secret_session_v1';
  const AI_EXPERIMENT_CONTROL_STORAGE_KEY = 'awareness_ai_experiment_control_v1';
  const CENTRAL_CONFIG_STORAGE_KEY = 'awareness_central_config_v1';
  const WORKFLOW_STATES = ['draft', 'review', 'approved', 'sent', 'archived'];
  const WORKFLOW_LABELS = {
    draft: 'Draft',
    review: 'Review',
    approved: 'Approved',
    sent: 'Sent',
    archived: 'Archived'
  };
  const WORKFLOW_TRANSITIONS = {
    draft: ['review', 'archived'],
    review: ['draft', 'approved', 'archived'],
    approved: ['review', 'sent', 'archived'],
    sent: ['archived'],
    archived: []
  };
  const NEWSLETTER_LANGUAGES = [
    { id: 'en', label: 'English' },
    { id: 'es', label: 'Spanish' },
    { id: 'pt-BR', label: 'Portuguese (Brazil)' },
    { id: 'zh-CN', label: 'Chinese (Simplified)' },
    { id: 'ko', label: 'Korean' },
    { id: 'uk', label: 'Ukrainian' },
    { id: 'de', label: 'German' },
    { id: 'fr', label: 'French' },
    { id: 'nl', label: 'Dutch' },
    { id: 'it', label: 'Italian' }
  ];

  const state = {
    selectedFormat: 'poster',
    selectedArticleIndices: [],
    allArticles: [],
    activeFilter: 'All',
    articleSort: 'date_desc',
    /** Instant filter above article list (title, summary, source, type, URL). */
    articleKeywordQuery: '',
    filterDays: 7,
    feedStats: {},
    fetchTelemetry: null,
    curationMode: 'balanced',
    curationFeedback: {},
    loading: false,
    currentPreviewLanguage: 'en',
    newsletterWorkspace: null,
    activeProjectId: null,
    activeDraftId: null,
    drafts: [],
    smtpProfile: null,
    aiExperimentControl: null,
    selectedDraftToLoad: null,
    translationCache: {},
    translationLastFailure: null,
    translationPendingLang: null,
    unsavedChanges: false,
    suppressUnsavedPrompt: false,
    /** When set, workspace was loaded from `project.snapshots` (not the live row). */
    projectSnapshotVersion: null
  };

  function stableStringify(value) {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return '';
    }
  }

  function hashContent(input = '') {
    const str = String(input || '');
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return `${str.length}:${Math.abs(hash)}`;
  }

  const TRANSLATION_PIPELINE_VERSION = 'v2-lead-split';

  function translationSignature(langId, html, css = '') {
    return `${TRANSLATION_PIPELINE_VERSION}:${langId}:${hashContent(html)}:${hashContent(css)}`;
  }

  function flagUnsavedChanges(isDirty = true) {
    state.unsavedChanges = !!isDirty;
  }

  function clearUnsavedChanges() {
    state.unsavedChanges = false;
  }

  function writeWorkspaceCheckpoint(reason = 'autosave') {
    if (!state.newsletterWorkspace) return;
    try {
      const checkpoint = {
        reason,
        savedAt: new Date().toISOString(),
        activeDraftId: state.activeDraftId || null,
        workspace: state.newsletterWorkspace
      };
      const currentRaw = localStorage.getItem(WORKSPACE_CHECKPOINT_KEY);
      if (currentRaw) localStorage.setItem(WORKSPACE_CHECKPOINT_BACKUP_KEY, currentRaw);
      localStorage.setItem(WORKSPACE_CHECKPOINT_KEY, JSON.stringify(checkpoint));
    } catch (e) {}
  }

  function recoverWorkspaceFromCheckpoint() {
    const tryLoad = (raw) => {
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.workspace?.variants) return null;
      return parsed;
    };
    try {
      const fromPrimary = tryLoad(localStorage.getItem(WORKSPACE_CHECKPOINT_KEY));
      if (fromPrimary) return fromPrimary;
    } catch (e) {}
    try {
      const fromBackup = tryLoad(localStorage.getItem(WORKSPACE_CHECKPOINT_BACKUP_KEY));
      if (fromBackup) return fromBackup;
    } catch (e) {}
    return null;
  }

  function updateDebugState(patch = {}) {
    const el = document.getElementById('debug-state');
    if (el) {
      // Keep debug panel fully disabled in production UI.
      el.style.display = 'none';
      el.innerHTML = '';
    }
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Attribute-safe URL for an <a href>. Blocks script-bearing schemes
  // (javascript:/vbscript:/data:) from untrusted article links, then
  // HTML-escapes so the value can't break out of the double-quoted attribute.
  function safeUrl(value) {
    const raw = String(value == null ? '' : value).trim();
    if (!raw) return '#';
    if (/^(?:javascript|vbscript|data):/i.test(raw)) return '#';
    return escapeHtml(raw);
  }

  async function fetchWithTranslationRetry(url, init, options = {}) {
    const attempts = options.attempts ?? 4;
    const baseMs = options.baseMs ?? 400;
    let lastResp = null;
    for (let i = 0; i < attempts; i += 1) {
      lastResp = await fetch(url, init);
      if (lastResp.ok) return lastResp;
      const status = lastResp.status;
      const retryable = status === 429 || (status >= 500 && status <= 599);
      if (retryable && i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseMs * (2 ** i)));
        continue;
      }
      return lastResp;
    }
    return lastResp;
  }

  function getLanguageLabel(langId) {
    return NEWSLETTER_LANGUAGES.find(l => l.id === langId)?.label || langId;
  }

  function setLanguageTranslating(isOn, langId = '') {
    const el = document.getElementById('lang-translating');
    const sel = document.getElementById('preview-lang');
    const text = langId === 'multi'
      ? 'Translating all languages...'
      : `Translating ${getLanguageLabel(langId || (sel?.value || ''))}...`;
    if (!el) {
      if (isOn) {
        clearTranslationPipelineState();
        setTranslationPipelineState('loading', 'Translation in progress', text);
      }
      return;
    }
    if (isOn) {
      clearTranslationPipelineState();
      el.classList.add('active');
      el.textContent = text;
      setTranslationPipelineState('loading', 'Translation in progress', text);
    } else {
      el.classList.remove('active');
      el.textContent = 'Translating...';
    }
  }

  function setTranslateProgress(active, current = 0, total = 0, label = 'Preparing...', pipelineTitle = 'Translation in progress') {
    const modal = document.getElementById('translate-modal');
    const stepLabel = document.getElementById('translate-step-label');
    const stepCount = document.getElementById('translate-step-count');
    const bar = document.getElementById('translate-bar-fill');
    if (!modal || !stepLabel || !stepCount || !bar) {
      const lt = document.getElementById('lang-translating');
      if (lt) {
        if (!active) {
          lt.classList.remove('active');
          lt.textContent = 'Translating...';
        } else {
          clearTranslationPipelineState();
          lt.classList.add('active');
          lt.textContent = label || 'Translating...';
          setTranslationPipelineState('loading', pipelineTitle, label || 'Translating...');
        }
      } else if (active) {
        clearTranslationPipelineState();
        setTranslationPipelineState('loading', pipelineTitle, label || 'Translating...');
      }
      return;
    }
    if (!active) {
      modal.classList.remove('active');
      stepLabel.textContent = 'Preparing...';
      stepCount.textContent = '0 / 0';
      bar.style.width = '0%';
      return;
    }
    modal.classList.add('active');
    clearTranslationPipelineState();
    const safeTotal = Math.max(1, total);
    const safeCurrent = Math.max(0, Math.min(current, safeTotal));
    stepLabel.textContent = label || 'Translating...';
    stepCount.textContent = `${safeCurrent} / ${safeTotal}`;
    bar.style.width = `${Math.round((safeCurrent / safeTotal) * 100)}%`;
    setTranslationPipelineState('loading', pipelineTitle, `${stepLabel.textContent} (${stepCount.textContent})`);
  }

  function clearTranslationPipelineState() {
    const stateWrap = document.getElementById('translation-pipeline-state');
    if (stateWrap) stateWrap.innerHTML = '';
  }

  function setTranslationPipelineState(variant, title, message, actions = '') {
    const stateWrap = document.getElementById('translation-pipeline-state');
    if (!stateWrap) return;
    App.UXContract?.injectStyles?.();
    App.UXContract?.renderStateCard?.('translation-pipeline-state', variant, title, message);
    if (actions) {
      stateWrap.insertAdjacentHTML('beforeend', `<div style="display:flex;gap:.4rem;flex-wrap:wrap">${actions}</div>`);
    }
  }

  function recordTranslationFailure(patch = {}) {
    state.translationLastFailure = {
      at: new Date().toISOString(),
      ...state.translationLastFailure,
      ...patch
    };
    TranslationMetrics.persistTranslationDiag(state.translationLastFailure);
  }

  function renderTranslationFailureState(message) {
    const safeMessage = escapeHtml(message || 'Unknown error');
    const diagLine = state.translationLastFailure
      ? escapeHtml(TranslationMetrics.formatDiagSummary(state.translationLastFailure))
      : '';
    const detail = diagLine ? `${safeMessage} — ${diagLine}` : safeMessage;
    setTranslationPipelineState(
      'error',
      'Translation blocked',
      `All languages must pass QA before preview. ${detail}`,
      `<button class="btn" onclick="App.UI.retryTranslationPipeline()">Retry translation</button>
       <button class="btn" onclick="window.location.href='config.html'">Open Config</button>`
    );
  }

  async function retryTranslationPipeline() {
    if (!state.newsletterWorkspace?.variants?.en?.html) {
      showToast('Generate newsletter first, then retry translation.', true);
      return;
    }
    try {
      setLanguageTranslating(true, 'multi');
      await translateWorkspaceFromEnglish({ overwrite: true, progressLabel: 'Retrying translations' });
      state.translationLastFailure = null;
      clearTranslationPipelineState();
      showToast('Translation completed. Continue to Preview.');
    } catch (e) {
      showToast(`Translation failed: ${e.message}`, true);
      if (!state.translationLastFailure) {
        recordTranslationFailure({
          message: e.message,
          kind: TranslationMetrics.classifyTranslationFailureKind(e.message)
        });
      }
      renderTranslationFailureState(e.message);
    } finally {
      setLanguageTranslating(false);
    }
  }

  function makeVariant(html = '', css = '', projectData = null) {
    return { html: html || '', css: css || '', projectData: projectData || null, updatedAt: new Date().toISOString() };
  }

  function hasRenderableHtml(variantsLike) {
    if (!variantsLike || typeof variantsLike !== 'object') return false;
    return Object.keys(variantsLike).some(langId => {
      const v = normalizeVariant(variantsLike[langId]);
      return !!(v && typeof v.html === 'string' && v.html.trim());
    });
  }

  function normalizeWorkflow(workflowLike) {
    const now = new Date().toISOString();
    const currentState = WORKFLOW_STATES.includes(workflowLike?.state) ? workflowLike.state : 'draft';
    const lastEditedBy = (workflowLike?.lastEditedBy || 'Local User').trim() || 'Local User';
    const history = Array.isArray(workflowLike?.history)
      ? workflowLike.history.filter(item => item && WORKFLOW_STATES.includes(item.to) && item.changedAt)
      : [];
    if (!history.length) {
      history.push({
        from: null,
        to: currentState,
        changedAt: now,
        changedBy: lastEditedBy,
        note: 'Initial workflow state'
      });
    }
    return { state: currentState, lastEditedBy, history };
  }

  function normalizeVariant(variantLike) {
    const stripLegacy = (html) =>
      (App.Utils && typeof App.Utils.stripLegacyFooterClassification === 'function')
        ? App.Utils.stripLegacyFooterClassification(html)
        : html;
    if (!variantLike) return makeVariant();
    if (typeof variantLike === 'string') {
      const tmp = document.createElement('div');
      tmp.innerHTML = stripLegacy(variantLike);
      let css = '';
      tmp.querySelectorAll('style').forEach(st => { css += `${st.textContent || ''}\n`; st.remove(); });
      return makeVariant(tmp.innerHTML, css.trim(), null);
    }
    if (typeof variantLike === 'object' && typeof variantLike.html === 'string') {
      return makeVariant(stripLegacy(variantLike.html), variantLike.css || '', variantLike.projectData || null);
    }
    return makeVariant();
  }

  function renderVariantHtml(variant) {
    if (!variant) return '';
    return `${variant.css ? `<style data-nl-variant-style>${variant.css}</style>` : ''}${variant.html || ''}`;
  }

  function defaultProjectTitle() {
    const issueDate = document.getElementById('meta-issue-date')?.value || new Date().toISOString().split('T')[0];
    return `newsletter_${issueDate}`;
  }

  function getProjectTitle() {
    const projectTitle = document.getElementById('project-title');
    const title = (projectTitle?.value || document.getElementById('meta-title')?.value || '').trim() || defaultProjectTitle();
    if (projectTitle) projectTitle.value = title;
    const metaTitle = document.getElementById('meta-title');
    if (metaTitle) metaTitle.value = title;
    return title;
  }

  function updateProjectChrome(project = null) {
    const titleEl = document.getElementById('project-title');
    // When a saved project is passed explicitly (e.g. handoff load), its
    // title wins — even if the input already has a value left over from the
    // central-config Newsletter Title or a previous render. Otherwise fall
    // back to meta-title / default for a fresh, unsaved workspace.
    if (titleEl) {
      if (project && project.title) {
        titleEl.value = project.title;
      } else if (!titleEl.value.trim()) {
        titleEl.value = document.getElementById('meta-title')?.value?.trim() || defaultProjectTitle();
      }
    }
    const versionEl = document.getElementById('project-version-label');
    if (versionEl) {
      const tip = project?.version ? `Latest saved: v${project.version}` : 'Unsaved project';
      if (state.projectSnapshotVersion != null) {
        versionEl.textContent = `Viewing snapshot v${state.projectSnapshotVersion} · ${tip}`;
      } else {
        versionEl.textContent = project?.version ? `Version ${project.version}` : 'Unsaved project';
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // NL EDITOR — thin wrapper; all editor logic is in editor.js
  // ═══════════════════════════════════════════════════════

  function openEditor() {
    if (!state.newsletterWorkspace) return showToast('Generate newsletter first.', true);
    syncVariantFromPreviewDom(state.currentPreviewLanguage);
    const variant = currentPreviewVariant();
    const langId = state.currentPreviewLanguage;
    App.Editor.open({
      html: variant.html,
      css: variant.css,
      langId,
      langLabel: getLanguageLabel(langId),
      // Template id of the newsletter currently being edited. The editor's
      // Regenerate-with-AI flow uses this to tag every AI prompt/response log
      // so it lands in templates/<id>/ensemble-logs/<session>/.
      templateId: state.newsletterWorkspace?.format || null,
      portalUrl: (() => {
        const cfg = state.newsletterWorkspace?.cfg || {};
        const p = App.Utils.normalizeWebUrl(String(cfg.portal || cfg.portalUrl || '').trim());
        if (p) return p;
        const s = cfg.soc;
        return (s && String(s).trim()) ? `mailto:${String(s).trim()}` : 'https://security.example.com';
      })(),
      onSave: function ({ html, css }) {
        state.newsletterWorkspace.variants[langId] = makeVariant(html, css, null);
        persistWorkspace();
        renderPreviewForLanguage(langId);
        showToast(`${getLanguageLabel(langId)} version saved.`);
      },
      onGetResetData: function () {
        if (langId === 'en') { showToast('English is the base template.', true); return null; }
        if (!confirm(`Reset ${getLanguageLabel(langId)} to the English base template?`)) return null;
        const en = normalizeVariant(state.newsletterWorkspace?.variants?.en);
        if (!en || !en.html) return null;
        state.newsletterWorkspace.variants[langId] = makeVariant(en.html, en.css, null);
        persistWorkspace();
        renderPreviewForLanguage(langId);
        return { html: en.html, css: en.css };
      },
      onDeleteInAllLanguages: async function ({ path, relPath }) {
        if (!state.newsletterWorkspace?.variants || !App.Utils.removeNewsletterNodeByMirrorPath) {
          return { ok: false };
        }
        let n = 0;
        for (const { id } of NEWSLETTER_LANGUAGES) {
          const v = normalizeVariant(state.newsletterWorkspace.variants[id]);
          const raw = (v.html || '').trim();
          if (!raw) continue;
          const r = App.Utils.removeNewsletterNodeByMirrorPath(raw, path, relPath, 5);
          if (r.removed) {
            state.newsletterWorkspace.variants[id] = makeVariant(r.html, v.css, null);
            n += 1;
          }
        }
        persistWorkspace();
        const lid = state.currentPreviewLanguage || 'en';
        renderPreviewForLanguage(lid);
        const cur = normalizeVariant(state.newsletterWorkspace.variants[lid]);
        if (n === 0) {
          showToast('Could not match this block in any language version (structure may differ).', true);
          return { ok: false };
        }
        showToast(`Removed from ${n} language version(s).`);
        return { ok: true, html: cur.html, css: cur.css, updated: n };
      }
    });
  }

  // ── Workspace persistence ──
  function getLivePreviewHtml() {
    const out = document.getElementById('nl-out');
    return out ? out.innerHTML : '';
  }

  function syncVariantFromPreviewDom(langId = state.currentPreviewLanguage) {
    if (!state.newsletterWorkspace?.variants?.[langId]) return;
    const liveHtml = getLivePreviewHtml();
    if (!liveHtml) return;
    const v = normalizeVariant(state.newsletterWorkspace.variants[langId]);
    const tmp = document.createElement('div');
    tmp.innerHTML = liveHtml;
    let extractedCss = '';
    tmp.querySelectorAll('style').forEach(st => { extractedCss += `${st.textContent || ''}\n`; st.remove(); });
    // QRCode.js inserts both a <canvas> (pixel data not serializable to HTML) and an <img>
    // (base64 data-URI). Strip the canvas so only the img survives in the saved snapshot.
    tmp.querySelectorAll('#nl-qr canvas').forEach(el => el.remove());
    const css = (v.css || extractedCss || '').trim();
    state.newsletterWorkspace.variants[langId] = makeVariant(tmp.innerHTML, css, null);
    persistWorkspace();
  }

  function persistWorkspace() {
    if (!state.newsletterWorkspace) return;
    try { localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state.newsletterWorkspace)); } catch (e) {}
    writeWorkspaceCheckpoint('workspace-persist');
    clearUnsavedChanges();
  }

  function normalizeLoadedWorkspace(ws) {
    if (!ws || !ws.variants) return;
    Object.keys(ws.variants).forEach(langId => {
      ws.variants[langId] = normalizeVariant(ws.variants[langId]);
    });
    const fallback = ws.variants.en || makeVariant();
    NEWSLETTER_LANGUAGES.forEach(lang => {
      if (!ws.variants[lang.id]) {
        ws.variants[lang.id] = makeVariant(fallback.html, fallback.css);
      }
    });
    if (!ws.currentLanguage) ws.currentLanguage = 'en';
    ws.workflow = normalizeWorkflow(ws.workflow);
    healStaleAutoSlugInVariants(ws);
  }

  // One-time HTML auto-heal: pre-fix renders of bank-page templates stored
  // `<p style="…font-weight:700;">data_breach_2026-05-23_20-01</p>` in the
  // portal-name slot (the builder used `c.title || c.pname`). After the
  // template fix to `c.pname || c.title`, NEW renders are correct — but
  // workspace.variants.<lang>.html in localStorage is frozen from the old
  // build and keeps showing the slug until the user regenerates. This pass
  // swaps the slug for the real portal name in any stored variant HTML so
  // the preview no longer shows the leaked slug.
  function healStaleAutoSlugInVariants(ws) {
    if (!ws || !ws.variants) return;
    const cfg = ws.cfg || {};
    const pname = (cfg.pname || (cfg.org ? `${cfg.org} Security Awareness Portal` : '') || 'ABC Security Awareness Portal').trim();
    if (!pname) return;
    // Match a <p> with bold white 20px Arial styling whose body is exactly an
    // auto-slug. The style attribute may vary slightly across template
    // versions, so anchor on font-weight:700 + a body that matches the slug.
    const slugInPRe = /(<p\b[^>]*font-weight\s*:\s*700[^>]*>)\s*([a-z0-9_]+_\d{4}-\d{2}-\d{2}_\d{2}-\d{2})\s*(<\/p>)/gi;
    let healed = 0;
    Object.keys(ws.variants).forEach(langId => {
      const v = ws.variants[langId];
      if (!v || typeof v.html !== 'string' || !v.html) return;
      const before = v.html;
      const after = before.replace(slugInPRe, (_m, open, _slug, close) => `${open}${escapeHtml(pname)}${close}`);
      if (after !== before) {
        v.html = after;
        healed += 1;
      }
    });
    if (healed > 0) {
      try { console.info('[awareness] healed stale auto-slug in', healed, 'variant(s) — pname:', pname); } catch {}
    }
  }

  function emptyNewsletterWorkspaceShell() {
    const cfg = { ...getConfig(), ...getMetadata() };
    const variants = {};
    NEWSLETTER_LANGUAGES.forEach(l => {
      variants[l.id] = makeVariant('', '', { translatedFrom: l.id === 'en' ? null : 'en' });
    });
    return {
      id: `nw_${Date.now()}`,
      createdAt: new Date().toISOString(),
      format: state.selectedFormat,
      cfg,
      opts: {},
      articles: [],
      variants,
      currentLanguage: state.currentPreviewLanguage || 'en',
      workflow: normalizeWorkflow(null)
    };
  }

  function applyIndexedProjectToWorkspace(project, options = {}) {
    if (!project || !state.newsletterWorkspace) return;
    const handoff = App.RouterNav?.getHandoff?.() || {};
    let snapVer = options.snapshotVersion !== undefined ? options.snapshotVersion : handoff.projectSnapshotVersion;
    if (snapVer === '' || snapVer === 'current') snapVer = null;
    if (snapVer != null) snapVer = Number(snapVer);
    if (Number.isNaN(snapVer)) snapVer = null;

    const snaps = Array.isArray(project.snapshots) ? project.snapshots : [];
    const snap = snapVer != null ? snaps.find(s => Number(s.version) === snapVer) : null;

    if (snap?.workspace && snap.workspace.variants) {
      state.projectSnapshotVersion = snapVer;
      state.translationCache = {};
      state.newsletterWorkspace = JSON.parse(JSON.stringify(snap.workspace));
      normalizeLoadedWorkspace(state.newsletterWorkspace);
      state.currentPreviewLanguage = state.newsletterWorkspace.currentLanguage || 'en';
      if (state.newsletterWorkspace.cfg) {
        applyMainConfig(state.newsletterWorkspace.cfg);
        // Prefer the workspace's own cfg.title (the Newsletter Title the user
        // configured) over project.title (which auto-save sets to a slugged
        // filename like "data_breach_2026-05-23_20-01"). Otherwise loading an
        // auto-saved project poisons meta-title with the slug, which then
        // leaks into bank-page templates' "c.title || c.pname" portal slot.
        applyMetadata({
          title: state.newsletterWorkspace.cfg.title || project.title || '',
          issueDate: project.metadata?.issueDate || state.newsletterWorkspace.cfg.issueDate,
          status: project.status || 'draft',
          campaignName: project.metadata?.campaignName || state.newsletterWorkspace.cfg.campaignName,
          audience: project.metadata?.audience || state.newsletterWorkspace.cfg.audience,
          owner: project.owner || state.newsletterWorkspace.cfg.owner
        });
      } else if (project.metadata) {
        applyMetadata({
          title: project.title,
          issueDate: project.metadata.issueDate,
          status: project.status || 'draft',
          campaignName: project.metadata.campaignName,
          audience: project.metadata.audience,
          owner: project.owner
        });
      }
      state.selectedFormat = state.newsletterWorkspace.format || state.selectedFormat;
      persistWorkspace();
      refreshLanguageControls();
      renderWorkflowControls();
      renderPreviewForLanguage(state.newsletterWorkspace.currentLanguage || 'en');
      updateProjectChrome(project);
      if (currentPageId() === 'editor') {
        queueMicrotask(() => { refreshEditorProjectVersionOptions().catch(() => {}); });
      }
      return;
    }

    if (snapVer != null && !snap?.workspace) {
      showToast(`Snapshot v${snapVer} has no workspace payload; showing latest instead.`, true);
    }

    state.projectSnapshotVersion = null;
    state.translationCache = {};

    const projectHasContent = hasRenderableHtml(project.languageVariants);
    if (projectHasContent) {
      state.newsletterWorkspace.variants = project.languageVariants;
    }
    state.newsletterWorkspace.workflow = normalizeWorkflow(project.workflow || state.newsletterWorkspace.workflow);
    state.newsletterWorkspace.currentLanguage = state.currentPreviewLanguage || 'en';
    if (project.metadata) {
      applyMetadata({
        title: project.title,
        issueDate: project.metadata.issueDate,
        status: project.status || 'draft',
        campaignName: project.metadata.campaignName,
        audience: project.metadata.audience,
        owner: project.owner
      });
    }
    if (projectHasContent) {
      persistWorkspace();
      refreshLanguageControls();
      renderWorkflowControls();
      renderPreviewForLanguage(state.newsletterWorkspace.currentLanguage);
    }
    updateProjectChrome(project);
    if (currentPageId() === 'editor') {
      queueMicrotask(() => { refreshEditorProjectVersionOptions().catch(() => {}); });
    }
  }

  function hydrateActiveProjectFromHandoff(projectId) {
    if (!projectId || !App.ProjectStore?.get) return;
    state.activeProjectId = projectId;
    App.ProjectStore.get(projectId).then(project => {
      if (!project) return;
      applyIndexedProjectToWorkspace(project);
    }).catch(() => {});
  }

  function loadWorkspace() {
    try {
      const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (!raw) {
        const handoff = App.RouterNav?.getHandoff?.();
        if (handoff?.projectId) {
          state.newsletterWorkspace = emptyNewsletterWorkspaceShell();
          state.currentPreviewLanguage = state.newsletterWorkspace.currentLanguage || 'en';
          state.translationCache = {};
          hydrateActiveProjectFromHandoff(handoff.projectId);
        }
        updateProjectChrome();
        return;
      }
      let parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch (parseErr) {
        const recovered = recoverWorkspaceFromCheckpoint();
        if (!recovered?.workspace) throw parseErr;
        parsed = recovered.workspace;
        showToast('Recovered workspace from autosave checkpoint after storage corruption.', true);
      }
      if (!parsed || !parsed.variants) return;
      state.newsletterWorkspace = parsed;
      Object.keys(state.newsletterWorkspace.variants).forEach(langId => {
        state.newsletterWorkspace.variants[langId] = normalizeVariant(state.newsletterWorkspace.variants[langId]);
      });
      const fallback = state.newsletterWorkspace.variants.en || makeVariant();
      NEWSLETTER_LANGUAGES.forEach(lang => {
        if (!state.newsletterWorkspace.variants[lang.id]) {
          state.newsletterWorkspace.variants[lang.id] = makeVariant(fallback.html, fallback.css);
        }
      });
      if (!state.newsletterWorkspace.currentLanguage) state.newsletterWorkspace.currentLanguage = 'en';
      state.newsletterWorkspace.workflow = normalizeWorkflow(state.newsletterWorkspace.workflow);
      // Heal the bank-page portal-name slot if a stale auto-slug is baked
      // into the stored variant HTML from a previous render.
      healStaleAutoSlugInVariants(state.newsletterWorkspace);
      state.currentPreviewLanguage = state.newsletterWorkspace.currentLanguage;
      state.translationCache = {};
      if (state.newsletterWorkspace.cfg) {
        applyMainConfig(state.newsletterWorkspace.cfg);
        applyMetadata({
          title: state.newsletterWorkspace.cfg.title,
          issueDate: state.newsletterWorkspace.cfg.issueDate,
          status: state.newsletterWorkspace.cfg.status,
          campaignName: state.newsletterWorkspace.cfg.campaignName,
          audience: state.newsletterWorkspace.cfg.audience,
          owner: state.newsletterWorkspace.cfg.owner
        });
      }
      const handoff = App.RouterNav?.getHandoff?.();
      if (handoff?.projectId) hydrateActiveProjectFromHandoff(handoff.projectId);
      updateProjectChrome();
    } catch (e) {}
  }

  function getMergedConfigForExport() {
    return { ...getConfig(), ...(state.newsletterWorkspace?.cfg || {}) };
  }

  function getQrTextForExport(cfg) {
    const c = cfg || getMergedConfigForExport();
    const portal = App.Utils.normalizeWebUrl(String(c.portal || c.portalUrl || '').trim());
    return portal || ((c.soc && String(c.soc).trim()) ? `mailto:${String(c.soc).trim()}` : 'mailto:security@example.com');
  }

  function findVisitPortalHref(qrEl) {
    if (!qrEl) return '';
    let scope = qrEl;
    for (let depth = 0; depth < 10 && scope; depth++) {
      scope = scope.parentElement;
      if (!scope) break;
      const links = scope.querySelectorAll('a[href]');
      for (const a of links) {
        const text = (a.textContent || '').trim().toLowerCase();
        if (text.includes('visit portal')) {
          const href = a.getAttribute('href') || '';
          if (/^https?:\/\//i.test(href)) return href;
        }
      }
    }
    return '';
  }

  function shouldInjectQrInExport() {
    const el = document.getElementById('feat-qr');
    if (el) return !!el.checked;
    return true;
  }

  function generateQrDataUriSync(text) {
    if (!text || typeof document === 'undefined' || typeof QRCode === 'undefined') return '';
    const holder = document.createElement('div');
    holder.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden';
    document.body.appendChild(holder);
    try {
      new QRCode(holder, {
        text,
        width: 144,
        height: 144,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
      const canvas = holder.querySelector('canvas');
      if (canvas) {
        try {
          return canvas.toDataURL('image/png');
        } catch (e) {
          /* canvas may not export */
        }
      }
      const img = holder.querySelector('img');
      const src = img && img.getAttribute('src');
      return src || '';
    } catch (e) {
      return '';
    } finally {
      holder.remove();
    }
  }

  function withEmbeddedQrInBodyHtml(bodyHtml, cfg) {
    if (!shouldInjectQrInExport()) return bodyHtml;
    const raw = String(bodyHtml || '');
    if (!raw.includes('nl-qr')) return raw;
    let portalFromDom = '';
    try {
      const probe = new DOMParser().parseFromString(
        `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${raw}</body></html>`,
        'text/html'
      );
      const qrEl = probe.body.querySelector('#nl-qr');
      if (!qrEl) return raw;
      const existing = qrEl.querySelector('img[src^="data:"]');
      if (existing && existing.getAttribute('src')) return raw;
      portalFromDom = findVisitPortalHref(qrEl);
    } catch (e) {
      return raw;
    }
    const qrText = portalFromDom || getQrTextForExport(cfg);
    const uri = generateQrDataUriSync(qrText);
    if (!uri) return raw;
    return injectNlQrImageIntoHtml(raw, uri);
  }

  function toStandaloneHtml(variant, langId) {
    const v = normalizeVariant(variant);
    const cfg = getMergedConfigForExport();
    const bodyHtml = withEmbeddedQrInBodyHtml(v.html, cfg);
    const flatten = (App.Utils && typeof App.Utils.flattenEmailColors === 'function')
      ? App.Utils.flattenEmailColors
      : (h => h);
    // Outlook (Word engine) won't inherit font-family into table cells and resets
    // anchor-descendant text to serif — stamp an explicit Arial on text elements
    // that lack one so the email matches the on-screen preview.
    const enforceFont = (App.Utils && typeof App.Utils.enforceEmailFont === 'function')
      ? App.Utils.enforceEmailFont
      : (h => h);
    const emailSafe = (h) => enforceFont(flatten(h));
    // gen_* templates already ship a complete <!DOCTYPE html> document. Wrapping
    // them again nests two <html>/<body> pairs, which Outlook/Gmail sanitizers
    // collapse — dropping the inner <head>. Pass a full document through unwrapped.
    // eslint-disable-next-line security/detect-unsafe-regex -- reviewed: ^-anchored, single optional group then a literal; linear-time, not ReDoS-prone.
    if (/^\s*(?:<!doctype html>\s*)?<html[\s>]/i.test(bodyHtml)) {
      return emailSafe(bodyHtml);
    }
    const bodyStyle =
      'margin:0;padding:20px;background-color:#C5BEAF;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;';
    return emailSafe(`<!DOCTYPE html><html lang="${langId}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Newsletter - ${getLanguageLabel(langId)}</title></head><body style="${bodyStyle}">${bodyHtml}</body></html>`);
  }

  function refreshLanguageControls() {
    const previewLang = document.getElementById('preview-lang');
    if (!previewLang) return;
    previewLang.innerHTML = NEWSLETTER_LANGUAGES.map(l => `<option value="${l.id}">${l.label}</option>`).join('');
    previewLang.value = state.currentPreviewLanguage || 'en';
  }

  function getLanguageVariant(langId) {
    if (!state.newsletterWorkspace?.variants) return '';
    return normalizeVariant(state.newsletterWorkspace.variants[langId]);
  }

  function renderPreviewForLanguage(langId) {
    const variant = getLanguageVariant(langId);
    if (!variant?.html) return;
    state.newsletterWorkspace.variants[langId] = variant;
    state.currentPreviewLanguage = langId;
    if (state.newsletterWorkspace) state.newsletterWorkspace.currentLanguage = langId;
    persistWorkspace();
    const out = document.getElementById('nl-out');
    if (!out) return;
    out.innerHTML = renderVariantHtml(variant);
    const previewLang = document.getElementById('preview-lang');
    if (previewLang) previewLang.value = langId;
    renderWorkflowControls();
    const renderQr = (attempt = 0) => {
      try {
        const q = document.getElementById('nl-qr');
        if (!q) return;
        if (typeof QRCode === 'undefined') {
          if (attempt < 20) return setTimeout(() => renderQr(attempt + 1), 100);
          console.warn('QRCode library never loaded — preview QR skipped.');
          return;
        }
        const cfg = state.newsletterWorkspace?.cfg || getConfig();
        const portalFromDom = findVisitPortalHref(q);
        const portalFromCfg = App.Utils.normalizeWebUrl(String(cfg.portal || cfg.portalUrl || '').trim());
        const qrText = portalFromDom || portalFromCfg ||
          ((cfg.soc && String(cfg.soc).trim()) ? `mailto:${String(cfg.soc).trim()}` : 'mailto:security@example.com');
        const uri = generateQrDataUriSync(qrText);
        const sz = parseInt(q.getAttribute('data-qr-size'), 10) || 144;
        q.innerHTML = '';
        if (uri) {
          const img = document.createElement('img');
          img.setAttribute('src', uri);
          img.setAttribute('alt', 'QR code');
          img.setAttribute('width', String(sz));
          img.setAttribute('height', String(sz));
          img.style.display = 'block';
          img.style.width = `${sz}px`;
          img.style.height = `${sz}px`;
          q.appendChild(img);
        } else {
          new QRCode(q, { text: qrText, width: sz, height: sz, colorDark: '#000', colorLight: '#fff', correctLevel: QRCode.CorrectLevel.H });
        }
      } catch (e) {
        try { console.warn('QR render failed:', e); } catch (_) {}
      }
    };
    setTimeout(() => renderQr(0), 150);
  }

  function getNextWorkflowStates(currentState) {
    return WORKFLOW_TRANSITIONS[currentState] || [];
  }

  function renderWorkflowControls() {
    const stateChip = document.getElementById('wf-state-chip');
    const nextSelect = document.getElementById('wf-next-state');
    if (!stateChip || !nextSelect) return;

    const wf = normalizeWorkflow(state.newsletterWorkspace?.workflow);
    if (state.newsletterWorkspace) state.newsletterWorkspace.workflow = wf;

    stateChip.dataset.state = wf.state;
    stateChip.textContent = WORKFLOW_LABELS[wf.state] || wf.state;
    stateChip.title = `Last edited by ${wf.lastEditedBy}`;

    const nextStates = getNextWorkflowStates(wf.state);
    if (!nextStates.length) {
      nextSelect.innerHTML = '<option value="">No next state</option>';
      nextSelect.disabled = true;
      return;
    }
    nextSelect.disabled = false;
    nextSelect.innerHTML = nextStates
      .map(next => `<option value="${next}">${WORKFLOW_LABELS[next] || next}</option>`)
      .join('');
  }

  function transitionWorkflow() {
    if (!state.newsletterWorkspace) return showToast('Generate newsletter first.', true);
    const wf = normalizeWorkflow(state.newsletterWorkspace.workflow);
    const next = document.getElementById('wf-next-state')?.value || '';
    if (!next) return showToast('No workflow transition available.', true);
    const allowed = getNextWorkflowStates(wf.state);
    if (!allowed.includes(next)) return showToast('Invalid workflow transition.', true);

    wf.history.push({
      from: wf.state,
      to: next,
      changedAt: new Date().toISOString(),
      changedBy: wf.lastEditedBy || 'Local User',
      note: `Moved to ${WORKFLOW_LABELS[next] || next}`
    });
    wf.state = next;
    state.newsletterWorkspace.workflow = wf;
    persistWorkspace();
    renderWorkflowControls();
    showToast(`Workflow updated: ${WORKFLOW_LABELS[next] || next}`);
  }

  function openWorkflowHistory() {
    if (!state.newsletterWorkspace?.workflow) return showToast('No workflow history yet.', true);
    const wf = normalizeWorkflow(state.newsletterWorkspace.workflow);
    const rows = wf.history.slice(-12).reverse().map(item => {
      const from = item.from ? (WORKFLOW_LABELS[item.from] || item.from) : 'None';
      const to = WORKFLOW_LABELS[item.to] || item.to;
      const who = item.changedBy || 'Local User';
      return `${fmtDate(item.changedAt)} • ${from} → ${to} • ${who}`;
    });
    alert(`Workflow history (${WORKFLOW_LABELS[wf.state] || wf.state}):\n\n${rows.join('\n') || 'No entries yet.'}`);
  }

  // ── Sidebar collapsible sections ──
  function toggleSec(headerEl) {
    const body = headerEl.nextElementSibling;
    const isOpen = headerEl.classList.contains('open');
    if (isOpen) { headerEl.classList.remove('open'); body.classList.remove('open'); }
    else { headerEl.classList.add('open'); body.classList.add('open'); }
  }

  function pickFormat(el, fmt) {
    document.querySelectorAll('.fmt-card').forEach(c => c.classList.remove('sel'));
    el.classList.add('sel');
    state.selectedFormat = fmt;
  }

  function setDuration(el, days) {
    document.querySelectorAll('.dur-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    state.filterDays = days;
    renderArticles(filteredArticles());
  }

  function closePreview() {
    syncVariantFromPreviewDom(state.currentPreviewLanguage);
    document.getElementById('preview-panel')?.classList.remove('active');
  }

  function isVariantUntranslated(langId) {
    if (langId === 'en') return false;
    const en = normalizeVariant(state.newsletterWorkspace?.variants?.en);
    const target = normalizeVariant(state.newsletterWorkspace?.variants?.[langId]);
    if (!target?.html) return true;
    const explicitlyTranslated = target?.projectData?.translatedFrom === 'en';
    if (explicitlyTranslated) return false;
    return (target.html || '').trim() === (en.html || '').trim() && (target.css || '').trim() === (en.css || '').trim();
  }

  async function ensureLanguageTranslated(langId) {
    if (langId === 'en') return true;
    if (!state.newsletterWorkspace?.variants?.en?.html) return false;
    if (!isVariantUntranslated(langId)) return true;

    const provider = document.getElementById('ai-provider')?.value || 'claude';
    const aiKey = document.getElementById('ai-key')?.value?.trim() || '';
    if (!aiKey) {
      showToast('Add AI API key to translate selected language.', true);
      return false;
    }

    const sourceVariant = normalizeVariant(state.newsletterWorkspace.variants.en);
    try {
      state.translationPendingLang = { id: langId, label: getLanguageLabel(langId) };
      setLanguageTranslating(true, langId);
      showToast(`Translating ${getLanguageLabel(langId)}...`);
      const translatedHtml = await translateHtmlAIFirst(sourceVariant.html, langId, provider, aiKey);
      const checks = window.App.UITranslation.qaCheckTranslatedHtml(sourceVariant.html, translatedHtml);
      const failed = checks.filter(c => !c.ok && c.severity === 'critical');
      if (failed.length) throw new Error(`[gate:qa] QA failed: ${failed.map(f => f.id).join(', ')}`);
      state.newsletterWorkspace.variants[langId] = makeVariant(translatedHtml, sourceVariant.css, {
        translatedFrom: 'en',
        provider,
        translatedAt: new Date().toISOString()
      });
      persistWorkspace();
      return true;
    } catch (e) {
      if (!state.translationLastFailure) {
        recordTranslationFailure({
          message: e.message,
          kind: TranslationMetrics.classifyTranslationFailureKind(e.message),
          languageId: langId,
          languageLabel: getLanguageLabel(langId)
        });
      }
      showToast(`Translation failed: ${e.message}`, true);
      return false;
    } finally {
      setLanguageTranslating(false);
    }
  }

  async function switchPreviewLanguage(langId) {
    syncVariantFromPreviewDom(state.currentPreviewLanguage);
    const ok = await ensureLanguageTranslated(langId);
    if (!ok && langId !== 'en') return;
    renderPreviewForLanguage(langId);
  }

  function getConfig() {
    return {
      freq: document.getElementById('cfg-freq')?.value || 'Weekly',
      soc: document.getElementById('cfg-soc')?.value || 'SOC-support@abc.com',
      max: parseInt(document.getElementById('cfg-max')?.value || '2', 10),
      org: document.getElementById('cfg-org')?.value?.trim() || 'ABC Corp',
      portal: document.getElementById('cfg-portal')?.value?.trim() || 'https://security.abc.com/awareness',
      pname: document.getElementById('cfg-pname')?.value?.trim() || 'ABC Security Awareness Portal'
    };
  }

  function applyMainConfig(cfg = {}) {
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el != null && value != null) el.value = value;
    };
    set('cfg-freq', cfg.freq);
    set('cfg-soc', cfg.soc);
    if (cfg.max != null) set('cfg-max', String(cfg.max));
    if (cfg.org != null) set('cfg-org', cfg.org);
    if (cfg.portal != null) set('cfg-portal', cfg.portal);
    if (cfg.pname != null) set('cfg-pname', cfg.pname);
  }

  function getOptions() {
    return {
      usePoster: document.getElementById('feat-poster')?.checked ?? true,
      useLinks: document.getElementById('feat-links')?.checked ?? true,
      useQR: document.getElementById('feat-qr')?.checked ?? true,
      useIllus: document.getElementById('feat-illus')?.checked ?? true,
      useAIImagePilot: document.getElementById('ai-exp-enabled')?.checked ?? false,
      aiRollbackMode: document.getElementById('ai-exp-rollback')?.checked ?? false,
      useMotion: document.getElementById('feat-motion')?.checked ?? false,
      renderChannel: document.getElementById('render-channel')?.value || 'email-safe',
      preferReducedMotion: window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
    };
  }

  function applyOptions(opts = {}) {
    const set = (id, checked) => {
      const el = document.getElementById(id);
      if (el && typeof checked === 'boolean') el.checked = checked;
    };
    set('feat-poster', opts.usePoster);
    set('feat-links', opts.useLinks);
    set('feat-qr', opts.useQR);
    set('feat-illus', opts.useIllus);
    set('feat-motion', opts.useMotion);
    set('feat-ai', opts.useAI);
    const channel = document.getElementById('render-channel');
    if (channel && typeof opts.renderChannel === 'string') channel.value = opts.renderChannel;
  }

  function getMetadata() {
    // Defensive strip: if meta-title still holds a stale auto-project slug
    // (e.g. "data_breach_2026-05-23_20-10") from before the auto-save fix,
    // treat it as empty so the value never round-trips back into the central
    // config bundle or the per-project metadata.
    const rawTitle = document.getElementById('meta-title')?.value?.trim() || '';
    const title = (typeof isAutoProjectTitleSlug === 'function' && isAutoProjectTitleSlug(rawTitle)) ? '' : rawTitle;
    return {
      title,
      issueDate: document.getElementById('meta-issue-date')?.value || '',
      status: document.getElementById('meta-status')?.value || 'draft',
      campaignName: document.getElementById('meta-campaign')?.value?.trim() || '',
      audience: document.getElementById('meta-audience')?.value?.trim() || '',
      owner: document.getElementById('meta-owner')?.value?.trim() || ''
    };
  }

  function getCentralConfigFromUI() {
    return {
      config: getConfig(),
      options: { ...getOptions(), useAI: document.getElementById('feat-ai')?.checked ?? true },
      metadata: getMetadata(),
      aiExperiment: getAIExperimentControlFromUI(),
      recipients: {
        testTo: document.getElementById('smtp-test-to')?.value?.trim() || '',
        sendTo: document.getElementById('smtp-send-to')?.value?.trim() || ''
      }
    };
  }

  function applyRecipients(rec = {}) {
    const testEl = document.getElementById('smtp-test-to');
    const sendEl = document.getElementById('smtp-send-to');
    if (testEl && typeof rec.testTo === 'string') testEl.value = rec.testTo;
    if (sendEl && typeof rec.sendTo === 'string') sendEl.value = rec.sendTo;
  }

  function applyCentralConfigBundle(bundle = {}) {
    if (bundle.config) applyMainConfig(bundle.config);
    if (bundle.options) applyOptions(bundle.options);
    if (bundle.metadata) applyMetadata(bundle.metadata);
    if (bundle.aiExperiment) applyAIExperimentControl(bundle.aiExperiment);
    if (bundle.recipients) applyRecipients(bundle.recipients);
    const maxLbl = document.getElementById('max-lbl');
    const maxCfg = document.getElementById('cfg-max');
    if (maxLbl && maxCfg) maxLbl.textContent = maxCfg.value || '2';
  }

  function saveCentralConfig(options = {}) {
    const { silent = false } = options;
    try {
      const bundle = getCentralConfigFromUI();
      const payload = { ...bundle, savedAt: new Date().toISOString() };
      localStorage.setItem(CENTRAL_CONFIG_STORAGE_KEY, JSON.stringify(payload));
      clearUnsavedChanges();
      if (!silent) showToast('Configuration settings saved.');
      document.dispatchEvent(new CustomEvent('awareness:config-saved', { detail: payload }));
      return bundle;
    } catch (e) {
      if (!silent) showToast('Failed to save configuration settings.', true);
      return null;
    }
  }

  // The auto-save flow used to write a slug like "data_breach_2026-05-23_20-10"
  // into meta-title (the Newsletter Title). That value got persisted into
  // awareness_central_config_v1 and into per-project metadata, then bled into
  // bank-page footers (which render `c.title || c.pname`). This recogniser
  // strips that pattern on load so the user's actual Newsletter Title isn't
  // overwritten by a stale auto-slug. Match: <slug>_YYYY-MM-DD_HH-mm.
  function isAutoProjectTitleSlug(value) {
    return typeof value === 'string' && /^[a-z0-9_]+_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/.test(value.trim());
  }

  function applyMetadata(meta = {}) {
    const set = (id, value) => {
      if (id === 'meta-title' && isAutoProjectTitleSlug(value)) value = '';
      const el = document.getElementById(id);
      if (el != null) el.value = value || '';
    };
    set('meta-title', meta.title);
    set('meta-issue-date', meta.issueDate);
    set('meta-status', meta.status || 'draft');
    set('meta-campaign', meta.campaignName);
    set('meta-audience', meta.audience);
    set('meta-owner', meta.owner);
  }

  function getSMTPConfigFromUI() {
    const dmEl = document.getElementById('delivery-method');
    const dmRaw = dmEl ? dmEl.value : 'smtp';
    const deliveryMethod = dmRaw === 'graph' ? 'graph' : 'smtp';
    return {
      id: 'default',
      profileName: 'Default delivery',
      deliveryMethod,
      graphTenantId: document.getElementById('graph-tenant-id')?.value?.trim() || '',
      graphClientId: document.getElementById('graph-client-id')?.value?.trim() || '',
      graphClientSecret: document.getElementById('graph-client-secret')?.value || '',
      relayUrl: document.getElementById('smtp-relay-url')?.value?.trim() || '',
      host: document.getElementById('smtp-host')?.value?.trim() || '',
      port: Number(document.getElementById('smtp-port')?.value || 587),
      secure: !!document.getElementById('smtp-secure')?.checked,
      username: document.getElementById('smtp-username')?.value?.trim() || '',
      password: document.getElementById('smtp-password')?.value || '',
      fromName: document.getElementById('smtp-from-name')?.value?.trim() || '',
      fromAddress: document.getElementById('smtp-from-address')?.value?.trim() || '',
      isDefault: true
    };
  }

  function getAISettingsFromUI() {
    return {
      provider: document.getElementById('ai-provider')?.value || 'claude',
      aiKey: document.getElementById('ai-key')?.value || ''
    };
  }

  function applyAISettings(cfg = {}) {
    const providerEl = document.getElementById('ai-provider');
    const aiKeyEl = document.getElementById('ai-key');
    if (providerEl && cfg.provider) providerEl.value = cfg.provider;
    // aiKey is restored from sessionStorage (tab-scoped) only — never from
    // localStorage. A fresh app launch starts with an empty key field.
    if (aiKeyEl) {
      try {
        const sessionKey = sessionStorage.getItem(AI_KEY_SESSION_STORAGE_KEY) || '';
        aiKeyEl.value = sessionKey;
      } catch (e) {}
    }
  }

  function saveAISettings(options = {}) {
    const { silent = false } = options;
    try {
      const cfg = getAISettingsFromUI();
      const { aiKey, ...persisted } = cfg;
      localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(persisted));
      try {
        if (aiKey) sessionStorage.setItem(AI_KEY_SESSION_STORAGE_KEY, aiKey);
        else sessionStorage.removeItem(AI_KEY_SESSION_STORAGE_KEY);
      } catch (e) {}
      clearUnsavedChanges();
      if (!silent) showToast('AI settings saved.');
    } catch (e) {
      if (!silent) showToast('Failed to save AI settings.', true);
    }
  }

  // AI experiment control block lives in js/ui/ai_experiment.js (App.UIAIExperiment).
  // Wrappers below preserve in-file call sites while the implementation is in the sibling.
  function defaultAIExperimentControl() { return window.App.UIAIExperiment.defaultAIExperimentControl(); }
  function getAIExperimentControlFromUI() { return window.App.UIAIExperiment.getAIExperimentControlFromUI(); }
  function renderAIExperimentReadiness(cfg) { return window.App.UIAIExperiment.renderAIExperimentReadiness(cfg); }
  function renderAIRollbackBanner() { return window.App.UIAIExperiment.renderAIRollbackBanner(); }
  function applyAIExperimentControl(cfg) { return window.App.UIAIExperiment.applyAIExperimentControl(cfg); }
  function saveAIExperimentControl(options) { return window.App.UIAIExperiment.saveAIExperimentControl(options); }
  function triggerAIRollback() { return window.App.UIAIExperiment.triggerAIRollback(); }
  function exportAIExperimentEvidence() { return window.App.UIAIExperiment.exportAIExperimentEvidence(); }

  function syncDeliveryMethodPanels() {
    const sel = document.getElementById('delivery-method');
    const graphPanel = document.getElementById('delivery-graph-panel');
    const smtpPanel = document.getElementById('delivery-smtp-panel');
    if (!sel || !graphPanel || !smtpPanel) return;
    const graphOn = sel.value === 'graph';
    graphPanel.style.display = graphOn ? '' : 'none';
    smtpPanel.style.display = graphOn ? 'none' : '';
  }

  function initDeliveryMethodUI() {
    const sel = document.getElementById('delivery-method');
    if (!sel) return;
    syncDeliveryMethodPanels();
    sel.addEventListener('change', () => {
      syncDeliveryMethodPanels();
      flagUnsavedChanges(true);
    });
  }

  function applySMTPConfig(cfg = {}) {
    const set = (id, value) => { const el = document.getElementById(id); if (el != null) el.value = value || ''; };
    const dm = document.getElementById('delivery-method');
    if (dm) dm.value = cfg.deliveryMethod === 'graph' ? 'graph' : 'smtp';
    set('smtp-relay-url', cfg.relayUrl);
    set('graph-tenant-id', cfg.graphTenantId);
    set('graph-client-id', cfg.graphClientId);
    // Graph client secret is restored from sessionStorage (tab-scoped) only —
    // never from localStorage / IndexedDB. A fresh app launch starts empty.
    let sessionSecret = '';
    try { sessionSecret = sessionStorage.getItem(GRAPH_SECRET_SESSION_STORAGE_KEY) || ''; } catch (e) {}
    set('graph-client-secret', sessionSecret || cfg.graphClientSecret || '');
    set('smtp-host', cfg.host);
    set('smtp-port', cfg.port || 587);
    set('smtp-username', cfg.username);
    // SMTP password is restored from sessionStorage (tab-scoped) only — never
    // from localStorage / IndexedDB. A fresh app launch starts empty.
    let sessionPassword = '';
    try { sessionPassword = sessionStorage.getItem(SMTP_PASSWORD_SESSION_STORAGE_KEY) || ''; } catch (e) {}
    set('smtp-password', sessionPassword);
    set('smtp-from-name', cfg.fromName);
    set('smtp-from-address', cfg.fromAddress);
    const secure = document.getElementById('smtp-secure');
    if (secure) secure.checked = cfg.secure !== false;
    syncDeliveryMethodPanels();
  }

  function articleSearchHaystack(article) {
    if (!article) return '';
    const parts = [
      article.title,
      article.summary,
      article.description,
      article.source,
      article.type,
      article.url
    ].map(p => stripTags(String(p || '')));
    return parts.join(' \u0001 ').toLowerCase();
  }

  /** Every whitespace-separated token must appear somewhere in the haystack (AND). */
  function articleMatchesKeywordQuery(article, rawQuery) {
    const q = String(rawQuery || '').trim().toLowerCase();
    if (!q) return true;
    const terms = q.split(/\s+/).filter(t => t.length > 0);
    if (!terms.length) return true;
    const hay = articleSearchHaystack(article);
    return terms.every(t => hay.includes(t));
  }

  function filteredArticles() {
    let list = state.allArticles.filter(a => isWithinDays(a.pubDate, state.filterDays));
    if (state.articleKeywordQuery && String(state.articleKeywordQuery).trim()) {
      list = list.filter(a => articleMatchesKeywordQuery(a, state.articleKeywordQuery));
    }
    return list;
  }

  function articleDateMs(article) {
    const ts = Date.parse(article?.pubDate || '');
    return Number.isFinite(ts) ? ts : 0;
  }

  function sortArticles(articles = []) {
    const decorated = articles.map((article, index) => ({ article, index }));
    decorated.sort((a, b) => {
      if (state.articleSort === 'date_asc') {
        const diff = articleDateMs(a.article) - articleDateMs(b.article);
        return diff || (a.index - b.index);
      }
      const diff = articleDateMs(b.article) - articleDateMs(a.article);
      return diff || (a.index - b.index);
    });
    return decorated.map(entry => entry.article);
  }

  function renderArticleStats(inRange = [], showing = []) {
    const el = document.getElementById('article-stats');
    if (!el) return;
    const max = getConfig().max;
    const selected = state.selectedArticleIndices.length;
    const searchOn = !!(state.articleKeywordQuery && String(state.articleKeywordQuery).trim());
    const rangeLabel = searchOn
      ? 'Date + search'
      : (state.filterDays === 0 ? 'All Days' : `Last ${state.filterDays} Days`);
    const cards = [
      { n: state.allArticles.length, l: 'Loaded Articles' },
      { n: inRange.length, l: rangeLabel },
      { n: showing.length, l: 'Showing (Filter)' },
      { n: `${selected}/${max}`, l: 'Selected' }
    ];
    el.innerHTML = cards.map(c => `<div class="stat-card"><div class="stat-num">${c.n}</div><div class="stat-label">${c.l}</div></div>`).join('');
  }

  async function renderDBStats() {
    const el = document.getElementById('db-stats');
    if (!el) return;
    try {
      const s = await App.DB.getStats();
      el.innerHTML = `<div class="stats-row"><div class="stat-card"><div class="stat-num">${s.total}</div><div class="stat-label">Total Stored</div></div><div class="stat-card"><div class="stat-num">${s.last7}</div><div class="stat-label">Last 7 Days</div></div><div class="stat-card"><div class="stat-num">${s.last30}</div><div class="stat-label">Last 30 Days</div></div><div class="stat-card"><div class="stat-num">${Object.keys(s.sourceCounts).length}</div><div class="stat-label">Sources</div></div></div>`;
    } catch (e) { el.innerHTML = ''; }
  }

  function renderDraftList() {
    const el = document.getElementById('saved-drafts-list');
    const activeLabel = document.getElementById('active-draft-label');
    if (!el) return;
    if (!state.drafts.length) {
      el.innerHTML = `<div class="fc-t">Projects & Saved Newsletters</div><div style="font-size:.72rem;color:var(--gray)">No drafts saved yet.</div>`;
      if (activeLabel) activeLabel.textContent = 'No draft loaded';
      return;
    }
    const options = state.drafts.map(d => `<option value="${d.id}" ${state.selectedDraftToLoad === d.id ? 'selected' : ''}>${d.title || 'Untitled'} · ${d.status || 'draft'} · ${fmtDate(d.issueDate || d.updatedAt)}</option>`).join('');
    const cards = state.drafts.slice(0, 24).map(d => {
      const wf = d.workspace?.workflow?.state || d.status || 'draft';
      const isActive = d.id === state.activeDraftId;
      return `<div style="padding:.55rem .65rem;border:1px solid ${isActive ? 'rgba(212,164,32,.5)' : 'rgba(255,255,255,.1)'};border-radius:6px;background:${isActive ? 'rgba(184,134,11,.08)' : 'rgba(255,255,255,.02)'}">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:.45rem;flex-wrap:wrap">
          <strong style="font-size:.73rem;color:var(--wh)">${d.title || 'Untitled'}</strong>
          <span style="font-size:.54rem;letter-spacing:.08em;text-transform:uppercase;padding:.14rem .45rem;border:1px solid rgba(212,164,32,.35);border-radius:999px;color:var(--gold-hi)">${wf}</span>
        </div>
        <div style="font-size:.64rem;color:var(--gray);margin-top:.25rem">Issue: ${fmtDate(d.issueDate || d.updatedAt)} · Updated: ${fmtDate(d.updatedAt)} · Versions: ${d.version || 1}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:.35rem;gap:.45rem;flex-wrap:wrap">
          <span style="font-size:.62rem;color:var(--gray2)">Owner: ${d.owner || 'Unassigned'} · Campaign: ${d.campaignName || 'N/A'}</span>
          <button class="btn" onclick="App.UI.loadDraftById('${d.id}')">Open</button>
        </div>
      </div>`;
    }).join('');
    el.innerHTML = `<div class="fc-t">Projects & Saved Newsletters</div>
      <div style="display:flex;gap:.45rem;align-items:center;flex-wrap:wrap">
        <select id="draft-select" style="flex:1;min-width:240px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);color:var(--wh);padding:.45rem .55rem;border-radius:5px" onchange="App.UI.pickDraftToLoad(this.value)">${options}</select>
        <button class="btn" onclick="App.UI.loadSelectedDraft()">Load</button>
      </div>
      <div style="font-size:.62rem;color:var(--gray);margin-top:.55rem">Each save stores a snapshot version so you can rework older copies safely.</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:.45rem;margin-top:.6rem">${cards}</div>`;
    if (!state.selectedDraftToLoad) state.selectedDraftToLoad = state.drafts[0].id;
    const active = state.drafts.find(d => d.id === state.activeDraftId);
    if (activeLabel) activeLabel.textContent = active ? `Active: ${active.title || 'Untitled'} (${active.status || 'draft'})` : 'No draft loaded';
  }

  async function refreshDrafts() {
    try {
      state.drafts = await App.DB.getAllDrafts();
      if (!state.selectedDraftToLoad && state.drafts[0]) state.selectedDraftToLoad = state.drafts[0].id;
    } catch (e) { state.drafts = []; }
    renderDraftList();
  }

  function renderDeliveryLogs(logs = []) {
    const el = document.getElementById('delivery-log-list');
    if (!el) return;
    if (!logs.length) {
      el.innerHTML = `<div class="fc-t">Delivery Status History</div><div style="font-size:.72rem;color:var(--gray)">No send attempts yet.</div>`;
      return;
    }
    el.innerHTML = `<div class="fc-t">Delivery Status History</div>${logs.slice(0, 8).map(l => `
      <div style="padding:.55rem .65rem;border:1px solid rgba(255,255,255,.08);border-radius:5px;margin-bottom:.35rem;background:rgba(255,255,255,.02)">
        <div style="display:flex;justify-content:space-between;gap:.4rem;flex-wrap:wrap">
          <strong style="font-size:.72rem;color:var(--wh)">${l.action === 'test' ? 'Test Email' : 'Newsletter Send'} · ${l.status}</strong>
          <span style="font-size:.62rem;color:var(--gray)">${fmtDate(l.createdAt)}</span>
        </div>
        <div style="font-size:.66rem;color:var(--gray2)">Draft: ${l.draftTitle || 'N/A'} | To: ${l.recipients || 'N/A'} | Lang: ${l.language || 'en'}</div>
        ${l.error ? `<div style="font-size:.65rem;color:var(--red)">Error: ${l.error}</div>` : ''}
      </div>`).join('')}`;
  }

  async function refreshDeliveryLogs() {
    try {
      const logs = await App.DB.getDeliveryLogs();
      renderDeliveryLogs(logs);
    } catch (e) {
      renderDeliveryLogs([]);
    }
  }

  function renderFeedStats() {
    const container = document.getElementById('feed-status-area');
    if (!container) return;
    const feeds = App.RSSFetcher.getFeeds();
    container.innerHTML = feeds.map(f => {
      const s = state.feedStats[f.id];
      const ok = s?.ok ?? false;
      const cnt = s?.count ?? 0;
      return `<div class="src-row"><div style="display:flex;align-items:center;gap:.6rem"><span style="font-size:.95rem">${f.icon}</span><div><div class="src-name">${escapeHtml(f.name)}</div><div class="src-meta">${escapeHtml(f.site)}</div></div></div><div style="display:flex;align-items:center;gap:.4rem">${s?`<span style="font-size:.62rem;color:${ok?'var(--grn)':'var(--red)'}"> ${ok?(cnt+' privacy'+(s.rawCount!=null?' · '+s.rawCount+' in feed':'')):escapeHtml(s.error||'Unreachable')}</span>`:''}${s?G.feedStatusDot(ok):'<span class="sbadge b-ws">RSS</span>'}</div></div>`;
    }).join('');
  }

  function getCurationMode() {
    const el = document.getElementById('curation-mode');
    return el?.value || state.curationMode || 'balanced';
  }

  function applyCurationMode(mode) {
    state.curationMode = ['concise', 'balanced', 'deep'].includes(mode) ? mode : 'balanced';
    const el = document.getElementById('curation-mode');
    if (el) el.value = state.curationMode;
  }

  function summarizeFeedback() {
    const entries = Object.values(state.curationFeedback || {});
    return entries.reduce((acc, entry) => {
      if (entry?.unclear) acc.unclear += 1;
      if (entry?.tooLong) acc.tooLong += 1;
      if (entry?.notActionable) acc.notActionable += 1;
      return acc;
    }, { unclear: 0, tooLong: 0, notActionable: 0 });
  }

  function renderFetchTelemetryPanel() {
    const el = document.getElementById('fetch-telemetry');
    if (!el) return;
    const t = state.fetchTelemetry;
    if (!t) {
      el.innerHTML = '<div class="telemetry-empty">Fetch telemetry appears after the first live run.</div>';
      return;
    }
    const feedback = summarizeFeedback();
    el.innerHTML = `
      <div class="telemetry-grid">
        <div class="telemetry-card"><div class="telemetry-num">${t.timeToFirstArticlesMs ? `${t.timeToFirstArticlesMs}ms` : 'n/a'}</div><div class="telemetry-label">Time to First Articles</div></div>
        <div class="telemetry-card"><div class="telemetry-num">${t.totalElapsedMs || 0}ms</div><div class="telemetry-label">Total Fetch Time</div></div>
        <div class="telemetry-card"><div class="telemetry-num">${t.articlesRendered || 0}</div><div class="telemetry-label">Progressive Rendered Articles</div></div>
        <div class="telemetry-card"><div class="telemetry-num">${feedback.unclear}/${feedback.tooLong}/${feedback.notActionable}</div><div class="telemetry-label">Quality Flags U/L/A</div></div>
      </div>
    `;
  }

  // Sidebar feed + keyword management lives in js/ui/sidebar_manager.js
  // (App.UISidebar). These thin wrappers stay so onclick handlers in injected
  // HTML continue to call `App.UI.<name>` and any internal callers within
  // ui_controller (e.g. main render loop) keep working.
  function _sb() { return window.App && window.App.UISidebar; }
  function renderSidebarFeeds()                  { const s = _sb(); if (s) s.renderSidebarFeeds(); }
  function renderSidebarKeywordManager()         { const s = _sb(); if (s) s.renderSidebarKeywordManager(); }
  function addSidebarCriticalKeyword()           { const s = _sb(); if (s) s.addSidebarCriticalKeyword(); }
  function addSidebarContextKeyword()            { const s = _sb(); if (s) s.addSidebarContextKeyword(); }
  function addSidebarNoiseKeyword()              { const s = _sb(); if (s) s.addSidebarNoiseKeyword(); }
  function removeSidebarCriticalKeyword(k)       { const s = _sb(); if (s) s.removeSidebarCriticalKeyword(k); }
  function removeSidebarContextKeyword(k)        { const s = _sb(); if (s) s.removeSidebarContextKeyword(k); }
  function removeSidebarNoiseKeyword(k)          { const s = _sb(); if (s) s.removeSidebarNoiseKeyword(k); }
  function resetSidebarKeywords()                { const s = _sb(); if (s) s.resetSidebarKeywords(); }
  function addFeedSource()                       { const s = _sb(); if (s) s.addFeedSource(); }
  function removeFeedSource(id)                  { const s = _sb(); if (s) s.removeFeedSource(id); }

  function renderFeedDashboard() {
    const el = document.getElementById('feed-sources-dashboard');
    if (!el) return;
    const feeds = App.RSSFetcher.getFeeds();
    const tiers = {
      1: { label: 'Tier 1 — Government CERTs & National Cyber Agencies', feeds: [] },
      2: { label: 'Tier 2 — Premium Security Journalism & Phishing Specialists', feeds: [] },
      3: { label: 'Tier 3 — Awareness Vendors & Broader Security', feeds: [] },
      4: { label: 'Custom Sources', feeds: [] }
    };
    feeds.forEach(f => {
      const bucket = f.custom ? 4 : f.tier;
      if (tiers[bucket]) tiers[bucket].feeds.push(f);
    });
    const totalFeeds = feeds.length;
    const okCount = Object.values(state.feedStats).filter(s => s.ok).length;
    const failCount = Object.values(state.feedStats).filter(s => !s.ok).length;
    const hasFetched = Object.keys(state.feedStats).length > 0;
    const totalArticles = Object.values(state.feedStats).reduce((s, f) => s + (f.count || 0), 0);
    const summary = hasFetched ? `<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem"><div style="background:rgba(30,122,70,.1);border:1px solid rgba(30,122,70,.2);border-radius:var(--radius);padding:.4rem .7rem;font-size:.65rem;color:#4CAF7D">&#x2713; ${okCount} connected</div>${failCount > 0 ? `<div style="background:rgba(192,57,43,.1);border:1px solid rgba(192,57,43,.2);border-radius:var(--radius);padding:.4rem .7rem;font-size:.65rem;color:#E74C3C">&#x2715; ${failCount} not reachable</div>` : ''}<div style="background:rgba(184,134,11,.1);border:1px solid rgba(184,134,11,.2);border-radius:var(--radius);padding:.4rem .7rem;font-size:.65rem;color:#D4A420">${totalArticles} articles fetched</div><div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:var(--radius);padding:.4rem .7rem;font-size:.65rem;color:var(--gray)">${totalFeeds} total feeds</div></div>` : `<div style="font-size:.68rem;color:var(--gray);margin-bottom:1rem;padding:.5rem .7rem;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:var(--radius)">Click "Fetch Live News" above to see live status for each feed.</div>`;
    let html = summary;
    for (const [, tier] of Object.entries(tiers)) {
      if (!tier.feeds.length) continue;
      html += `<div class="feed-tier-label">${tier.label}</div><div class="feed-src-grid">`;
      tier.feeds.forEach(f => {
        const s = state.feedStats[f.id];
        const hasStatus = !!s;
        const ok = s?.ok ?? false;
        const cnt = s?.count ?? 0;
        let statusBadge, statusExtra;
        if (!hasStatus) { statusBadge = '<span class="feed-src-badge waiting">Waiting</span>'; statusExtra = ''; }
        else if (ok) { statusBadge = '<span class="feed-src-badge ok">Connected</span>'; statusExtra = `<span class="feed-src-count">${cnt} matches</span>`; }
        else { statusBadge = '<span class="feed-src-badge fail">Failed</span>'; statusExtra = `<span class="feed-src-count" style="color:var(--red)">${s.error || 'Not reachable'}</span>`; }
        html += `<div class="feed-src-card"><div class="feed-src-icon">${f.icon}</div><div class="feed-src-info"><div class="feed-src-name">${escapeHtml(f.name)}</div><div class="feed-src-site">${escapeHtml(f.site)}</div></div><div class="feed-src-status">${statusExtra}${statusBadge}</div></div>`;
      });
      html += '</div>';
    }
    el.innerHTML = html;
  }

  function renderTypeChart() {
    const el = document.getElementById('type-chart');
    if (!el) return;
    const arts = filteredArticles();
    if (!arts.length) { el.innerHTML = ''; return; }
    const tc = {};
    arts.forEach(a => { tc[a.type] = (tc[a.type] || 0) + 1; });
    const colors = { 'Phishing':'#E67E22','Password & MFA':'#D4A420','Data Breach':'#E91E63','Ransomware':'#C0392B','Social Engineering':'#F39C12','Malware':'#9B59B6','Scam & Fraud':'#95A5A6','Vulnerability':'#3498DB','Advisory':'#2ECC71','Insider Threat':'#E74C3C','Security News':'#7F8C8D' };
    const data = Object.entries(tc).sort((a,b)=>b[1]-a[1]).map(([l,c])=>({label:l,count:c,color:colors[l]||'#D4A420'}));
    el.innerHTML = G.donutChart(data, 100);
  }

  function getBaselineArticles() {
    if (!Array.isArray(SAMPLE_ARTICLES) || !SAMPLE_ARTICLES.length) return [];
    return SAMPLE_ARTICLES.map((article, idx) => ({
      ...article,
      sourceId: article.sourceId || 'baseline',
      url: article.url && article.url !== '#' ? article.url : `https://baseline.local/article-${idx + 1}`,
      pubDate: article.pubDate || new Date().toISOString().split('T')[0],
      fallback: true
    }));
  }

  async function loadArticles() {
    if (state.loading) return;
    state.loading = true;
    clearLog();
    state.selectedArticleIndices = [];
    state.fetchTelemetry = {
      startedAt: Date.now(),
      timeToFirstArticlesMs: null,
      totalElapsedMs: 0,
      articlesRendered: 0
    };
    const fetchEl = document.getElementById('fetch-st');
    const areaEl = document.getElementById('articles-area');
    if (fetchEl) fetchEl.textContent = 'Fetching…';
    if (areaEl) areaEl.innerHTML = skeleton(4);
    updateDebugState({ phase: 'start-fetch', error: '' });
    try {
      log('Fetching live phishing & security news…', 'log-ai');
      const progressiveArticles = [];
      const seenUrls = new Set();
      const { articles, stats, telemetry } = await App.RSSFetcher.fetchAllFeeds(null, 25, (progress) => {
        if (!fetchEl) return;
        const done = Math.max(0, progress?.done || 0);
        const total = Math.max(1, progress?.total || 1);
        const feedName = progress?.feedName || 'feed';
        const feedStatus = progress?.ok ? `${progress?.count || 0} matches` : 'unreachable';
        fetchEl.textContent = `Fetching feeds ${done}/${total}: ${feedName} (${feedStatus}, ${progress?.elapsedMs || 0}ms)`;
        const incoming = Array.isArray(progress?.newArticles) ? progress.newArticles : [];
        if (incoming.length) {
          incoming.forEach(article => {
            const urlKey = String(article?.url || '').trim();
            if (!urlKey || seenUrls.has(urlKey)) return;
            seenUrls.add(urlKey);
            progressiveArticles.push(article);
          });
          if (!state.fetchTelemetry.timeToFirstArticlesMs) {
            state.fetchTelemetry.timeToFirstArticlesMs = Date.now() - state.fetchTelemetry.startedAt;
          }
          state.fetchTelemetry.articlesRendered = progressiveArticles.length;
          renderArticles(sortArticles(progressiveArticles.slice(0, 60)));
          renderFetchTelemetryPanel();
        }
      });
      state.feedStats = stats;
      state.fetchTelemetry.totalElapsedMs = telemetry?.totalElapsedMs || (Date.now() - state.fetchTelemetry.startedAt);
      renderFeedStats(); renderFeedDashboard(); renderSidebarFeeds();
      renderFetchTelemetryPanel();

      let dbArts = [];
      try { dbArts = await App.DB.getAllArticles(); log(`💾 ${dbArts.length} from database`, 'log-ok'); } catch (e) { log('⚠ DB not available', 'log-err'); }

      const urlSet = new Set(articles.map(a => a.url));
      const merged = [...articles];
      dbArts.forEach(a => { if (!urlSet.has(a.url)) { urlSet.add(a.url); merged.push(a); } });
      merged.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0) || new Date(b.pubDate) - new Date(a.pubDate));
      if (!merged.length) {
        const baseline = getBaselineArticles();
        merged.push(...baseline);
        if (baseline.length) {
          log('No live or stored articles found. Loaded baseline fallback articles to keep workflow unblocked.', 'log-err');
        }
      }
      state.allArticles = merged;
      Promise.resolve().then(() => App.DB.upsertArticles(merged)).catch((e) => {
        log(`⚠ Deferred DB merge save failed: ${e.message}`, 'log-err');
      });

      let filtered = filteredArticles();
      if (!filtered.length && merged.length) {
        state.filterDays = 0;
        const allChip = document.querySelector('.dur-chip[data-days="0"]');
        if (allChip) {
          document.querySelectorAll('.dur-chip').forEach(c => c.classList.remove('active'));
          allChip.classList.add('active');
        }
        filtered = filteredArticles();
      }
      log(`${filtered.length} articles in date range`, 'log-ok');

      // Old behavior: show article cards immediately after fetch.
      renderArticles(filtered);
      renderTypeChart();
      renderDBStats();

      const aiOn = document.getElementById('feat-ai')?.checked;
      const curationMode = getCurationMode();
      applyCurationMode(curationMode);
      if (aiOn) {
        const prov = document.getElementById('ai-provider')?.value || 'claude';
        const key = document.getElementById('ai-key')?.value || '';
        App.AISummarizer.configure({ provider: prov, claudeKey: prov === 'claude' ? key : '', openaiKey: prov === 'openai' ? key : '' });
        const toProcess = filtered.filter(a => !a.aiProcessed && !a.watchouts).slice(0, 15);
        if (toProcess.length) {
          // Open an AI-logging build context for the article-curation phase.
          // summarizeArticle's prompt+response pairs land in
          // templates/_article-curation/ensemble-logs/<session>/ since
          // curation isn't tied to any one template.
          const AIL = window.App && window.App.AILogger;
          if (AIL && typeof AIL.beginBuild === 'function') {
            AIL.beginBuild({ templateId: '_article-curation' });
          }
          try {
            if (App.AISummarizer.isAIAvailable()) {
              await App.AISummarizer.summarizeAll(toProcess.slice(0, 12), (d, t) => {
                if (fetchEl) fetchEl.textContent = `AI processing: ${d}/${t}…`;
              }, { mode: curationMode });
            } else {
              await App.AISummarizer.summarizeAll(toProcess, null, { mode: curationMode });
            }
          } finally {
            if (AIL && typeof AIL.endBuild === 'function') AIL.endBuild();
          }
          Promise.resolve().then(() => App.DB.upsertArticles(toProcess.filter(a => a.watchouts))).catch((e) => {
            log(`⚠ Deferred AI DB save failed: ${e.message}`, 'log-err');
          });
        }
      } else {
        filtered.forEach(a => {
          if (!a.watchouts) {
            const l = App.AISummarizer.localSummarize(a, curationMode);
            a.watchouts = l.watchouts;
            a.threatLevel = l.threatLevel;
            a.curationMeta = {
              mode: curationMode,
              confidence: typeof l.confidence === 'number' ? l.confidence : 0.5,
              fallbackUsed: true,
              provider: 'local',
              updatedAt: new Date().toISOString()
            };
          }
        });
        Promise.resolve().then(() => App.DB.upsertArticles(filtered)).catch((e) => {
          log(`⚠ Deferred DB summarize save failed: ${e.message}`, 'log-err');
        });
      }

      if (fetchEl) fetchEl.textContent = `${filtered.length} articles ready`;
      renderArticles(filtered); renderTypeChart(); renderDBStats();
    } catch (e) {
      log(`Error: ${e.message}`, 'log-err');
      if (fetchEl) fetchEl.textContent = 'Error';
      if (areaEl) areaEl.innerHTML = `<div class="empty-st"><p>Fetch failed: ${e.message}</p></div>`;
    } finally {
      state.loading = false;
    }
  }

  async function loadFromDB() {
    if (state.loading) return;
    state.loading = true;
    clearLog();
    state.selectedArticleIndices = [];
    const fetchEl = document.getElementById('fetch-st');
    const areaEl = document.getElementById('articles-area');
    if (fetchEl) fetchEl.textContent = 'Loading…';
    if (areaEl) areaEl.innerHTML = skeleton(3);
    try {
      let dbArts = await App.DB.getAllArticles();
      let usedBaselineFallback = dbArts.length > 0 && dbArts.every(article =>
        article?.fallback || article?.sourceId === 'baseline' || String(article?.url || '').includes('baseline.local')
      );
      state.allArticles = dbArts;
      if (!dbArts.length) {
        const baseline = getBaselineArticles();
        if (!baseline.length) {
          if (fetchEl) fetchEl.textContent = 'No stored articles yet. Fetch live news.';
          renderArticles([]);
          renderTypeChart();
          renderDBStats();
          return;
        }
        dbArts = baseline;
        usedBaselineFallback = true;
        state.allArticles = dbArts;
        log('No stored articles found. Loaded baseline fallback articles to keep workflow unblocked.', 'log-err');
        try { await App.DB.upsertArticles(dbArts); } catch (e) {}
      }
      log(`💾 ${dbArts.length} articles from database`, 'log-ok');

      let filtered = filteredArticles();
      if (!filtered.length && dbArts.length) {
        state.filterDays = 0;
        const allChip = document.querySelector('.dur-chip[data-days="0"]');
        if (allChip) {
          document.querySelectorAll('.dur-chip').forEach(c => c.classList.remove('active'));
          allChip.classList.add('active');
        }
        filtered = filteredArticles();
      }
      filtered.forEach(a => {
        if (!a.watchouts) { const l = App.AISummarizer.localSummarize(a); a.watchouts = l.watchouts; a.threatLevel = l.threatLevel; }
      });
      try { await App.DB.upsertArticles(filtered); } catch (e) {}

      if (fetchEl) {
        fetchEl.textContent = usedBaselineFallback
          ? `Loaded ${filtered.length} baseline fallback articles`
          : `Restored ${filtered.length} articles from previous fetch`;
      }
      renderArticles(filtered);
      renderTypeChart();
      renderDBStats();
    } catch (e) {
      log(`DB Error: ${e.message}`, 'log-err');
      if (fetchEl) fetchEl.textContent = 'DB error';
      if (areaEl) areaEl.innerHTML = `<div class="empty-st"><p>Load from DB failed: ${e.message}</p></div>`;
    } finally {
      state.loading = false;
    }
  }

  async function clearDB() {
    if (!confirm('Delete all stored articles? This cannot be undone.')) return;
    try { await App.DB.clearAll(); showToast('Database cleared'); renderDBStats(); }
    catch (e) { showToast('Failed to clear database', true); }
  }

  function renderArticles(arts) {
    try {
    const max = getConfig().max;
    const countEl = document.getElementById('articles-count');
    const inRange = Array.isArray(arts) ? arts.length : 0;
    const selected = state.selectedArticleIndices.length;
    const safeArts = Array.isArray(arts) ? arts : [];
    const types = ['All', ...new Set(safeArts.map(a => a?.type || 'Security News'))];
    const fRow = `<div style="display:flex;gap:.35rem;flex-wrap:wrap;margin-bottom:.65rem">${types.map(t => `<button class="fchip ${t===state.activeFilter?'active':''}" onclick="App.UI.setFilter('${escapeHtml(t)}')">${escapeHtml(t)}</button>`).join('')}</div>`;
    const typeFiltered = state.activeFilter === 'All' ? safeArts : safeArts.filter(a => (a?.type || 'Security News') === state.activeFilter);
    const sortedFiltered = sortArticles(typeFiltered);
    renderArticleStats(safeArts, sortedFiltered);
    if (countEl) {
      countEl.textContent = `Loaded: ${state.allArticles.length} | In range: ${inRange} | Showing: ${sortedFiltered.length} | Selected: ${selected}/${max}`;
    }
    const cards = sortedFiltered.map(art => {
      const ri = state.allArticles.indexOf(art);
      const sel = state.selectedArticleIndices.includes(ri);
      const dis = !sel && state.selectedArticleIndices.length >= max;
      const icon = typeof G.threatIcon === 'function' ? G.threatIcon(art?.type || 'Security News', 24) : '•';
      const feedbackKey = encodeURIComponent(String(art?.url || `idx-${ri}`));
      const feedback = state.curationFeedback[feedbackKey] || {};
      const curationMeta = art?.curationMeta || {};
      const confidencePct = Math.round(Math.max(0, Math.min(1, Number(curationMeta.confidence || 0))) * 100);
      const fallbackBadge = curationMeta.fallbackUsed ? '<span class="curation-chip warn">Fallback</span>' : '';
      const modeBadge = curationMeta.mode ? `<span class="curation-chip">${escapeHtml(curationMeta.mode)}</span>` : '';
      return `<div class="a-card ${sel?'sel':''} ${dis?'dis':''}" onclick="App.UI.toggleArticle(${ri})"><button class="a-del" title="Remove this article" onclick="event.stopPropagation();App.UI.deleteArticle(${ri})">✕</button><div style="display:flex;align-items:flex-start;gap:.6rem"><div style="flex-shrink:0;margin-top:.08rem">${icon}</div><div style="flex:1"><div class="a-src">${escapeHtml(art?.source || 'Unknown Source')}${art?.aiProcessed?'<span class="ai-pill" style="margin-left:.3rem">\u2726 AI</span>':''}</div><div class="a-title">${escapeHtml(art?.title || 'Untitled article')}</div></div></div><div class="a-sum">${escapeHtml(art?.summary||art?.description||'')}</div><div class="a-meta"><span class="a-type">${escapeHtml(art?.type || 'Security News')}</span>${art?.threatLevel?`<span style="font-size:.52rem;color:${['','#4CAF7D','#8BC34A','#FFC107','#E67E22','#C0392B'][art.threatLevel]||'#888'};font-weight:600">LV${art.threatLevel}</span>`:''}<span class="a-date">${fmtDate(art?.pubDate)} \u00b7 ${daysAgo(art?.pubDate)}</span><a class="a-link" href="${safeUrl(art?.url)}" target="_blank" rel="noopener nofollow" onclick="event.stopPropagation()">\u2197</a></div><div class="curation-meta-row">${modeBadge}<span class="curation-chip">Confidence ${confidencePct}%</span>${fallbackBadge}</div><div class="curation-feedback-row"><button class="mini-chip ${feedback.unclear ? 'active' : ''}" onclick="event.stopPropagation();App.UI.flagCurationFeedback('${feedbackKey}','unclear')">Unclear</button><button class="mini-chip ${feedback.tooLong ? 'active' : ''}" onclick="event.stopPropagation();App.UI.flagCurationFeedback('${feedbackKey}','tooLong')">Too long</button><button class="mini-chip ${feedback.notActionable ? 'active' : ''}" onclick="event.stopPropagation();App.UI.flagCurationFeedback('${feedbackKey}','notActionable')">Not actionable</button></div>${sel&&art?.watchouts?.length?`<div class="a-wo"><div class="a-wo-t">Safety Tips</div><ul>${art.watchouts.map(w=>`<li>${escapeHtml(w)}</li>`).join('')}</ul></div>`:''}</div>`;
    }).join('');
    const area = document.getElementById('articles-area');
    if (!area) return;
    const sortControl = `<label style="display:flex;align-items:center;gap:.35rem;font-size:.64rem;color:var(--gray)">Sort
      <select id="article-sort-select" onchange="App.UI.setArticleSort(this.value)" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);color:var(--wh);padding:.22rem .4rem;border-radius:5px;font-size:.64rem">
        <option value="date_desc" style="background:#fff;color:#111" ${state.articleSort === 'date_desc' ? 'selected' : ''}>Newest first</option>
        <option value="date_asc" style="background:#fff;color:#111" ${state.articleSort === 'date_asc' ? 'selected' : ''}>Oldest first</option>
      </select>
    </label>`;
    const emptyListMsg = !safeArts.length
      ? (state.articleKeywordQuery && String(state.articleKeywordQuery).trim()
        ? '<div class="empty-st"><p>No articles match your search.</p><p style="font-size:.65rem;opacity:.75;margin-top:.35rem">Try fewer or different keywords (matches title, summary, source, type, or link).</p></div>'
        : '<div class="empty-st"><p>No articles in the current date range.</p></div>')
      : (!sortedFiltered.length
        ? '<div class="empty-st"><p>No articles match this type filter.</p></div>'
        : '');
    area.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem;flex-wrap:wrap;gap:.4rem"><span style="font-size:.7rem;color:var(--gray)">Select up to <strong style="color:var(--wh)">${max}</strong> article${max>1?'s':''}</span><div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap"><span style="font-size:.7rem">Selected: <span class="sel-badge">${state.selectedArticleIndices.length}</span> / ${max}</span>${sortControl}</div></div>${fRow}${cards || emptyListMsg}`;
    updateDebugState({ rendered: (sortedFiltered || []).length });
    } catch (e) {
      const area = document.getElementById('articles-area');
      if (area) area.innerHTML = `<div class="empty-st"><p>Render error: ${e.message}</p></div>`;
      renderArticleStats([], []);
      log(`Render error: ${e.message}`, 'log-err');
      updateDebugState({ phase: 'render-error', error: e.message });
    }
  }

  function setFilter(type) { state.activeFilter = type; renderArticles(filteredArticles()); }

  function setArticleKeywordSearch(value) {
    state.articleKeywordQuery = String(value ?? '');
    syncArticleKeywordSearchInput();
    renderArticles(filteredArticles());
  }

  function syncArticleKeywordSearchInput() {
    const el = document.getElementById('article-keyword-search');
    if (el && el.value !== (state.articleKeywordQuery || '')) el.value = state.articleKeywordQuery || '';
  }

  function flagCurationFeedback(feedbackKey, type) {
    if (!feedbackKey || !type) return;
    if (!state.curationFeedback[feedbackKey]) state.curationFeedback[feedbackKey] = {};
    state.curationFeedback[feedbackKey][type] = !state.curationFeedback[feedbackKey][type];
    renderArticles(filteredArticles());
    renderFetchTelemetryPanel();
  }

  function setArticleSort(sortMode) {
    state.articleSort = sortMode === 'date_asc' ? 'date_asc' : 'date_desc';
    renderArticles(filteredArticles());
  }

  function toggleArticle(idx) {
    if (idx < 0 || idx >= state.allArticles.length) return;
    const max = getConfig().max;
    const pos = state.selectedArticleIndices.indexOf(idx);
    if (pos > -1) state.selectedArticleIndices.splice(pos, 1);
    else { if (state.selectedArticleIndices.length >= max) return; state.selectedArticleIndices.push(idx); }
    renderArticles(filteredArticles());
  }

  function deleteArticle(idx) {
    const art = state.allArticles[idx];
    if (!art) return;
    // Keep the current selection intact across the index shift by tracking the
    // selected article objects, not their (about-to-change) indices.
    const stillSelected = state.selectedArticleIndices
      .map(i => state.allArticles[i])
      .filter(a => a && a !== art);
    state.allArticles.splice(idx, 1);
    state.selectedArticleIndices = stillSelected
      .map(a => state.allArticles.indexOf(a))
      .filter(i => i > -1);
    if (art.url) { App.DB.deleteArticleByUrl(art.url).catch(() => {}); }
    showToast('Article removed');
    renderArticles(filteredArticles());
  }

  // Build + draft + project pipeline lives in js/ui/generate_pipeline.js
  // (App.UIGeneratePipeline). Wrappers below preserve in-file call sites and
  // the public App.UI surface while the implementation is in the sibling.
  function buildAndPreviewEnglishOnly() { return window.App.UIGeneratePipeline.buildAndPreviewEnglishOnly(); }
  function buildAndPreview(options) { return window.App.UIGeneratePipeline.buildAndPreview(options); }
  function buildWorkspaceSnapshot() { return window.App.UIGeneratePipeline.buildWorkspaceSnapshot(); }
  function beforeWorkspaceSnapshot() { return window.App.UIGeneratePipeline.beforeWorkspaceSnapshot(); }
  function saveDraft(opts) { return window.App.UIGeneratePipeline.saveDraft(opts); }
  function saveCopy() { return window.App.UIGeneratePipeline.saveCopy(); }
  function pickDraftToLoad(id) { return window.App.UIGeneratePipeline.pickDraftToLoad(id); }
  function loadSelectedDraft() { return window.App.UIGeneratePipeline.loadSelectedDraft(); }
  function loadDraftById(id) { return window.App.UIGeneratePipeline.loadDraftById(id); }
  function saveProjectVersion() { return window.App.UIGeneratePipeline.saveProjectVersion(); }
  function refreshEditorProjectVersionOptions() { return window.App.UIGeneratePipeline.refreshEditorProjectVersionOptions(); }
  function editorLoadSelectedProjectVersion() { return window.App.UIGeneratePipeline.editorLoadSelectedProjectVersion(); }
  function editorRestoreSelectedVersionAsLatest() { return window.App.UIGeneratePipeline.editorRestoreSelectedVersionAsLatest(); }

  function navigateTo(sectionId, options = {}) {
    const keepPreview = options.keepPreview === true;
    if (!keepPreview) {
      const previewPanel = document.getElementById('preview-panel');
      if (previewPanel?.classList.contains('active')) closePreview();
    }
    const main = document.getElementById('main');
    const target = document.getElementById(sectionId);
    if (!main || !target) return;
    main.scrollTo({ top: Math.max(0, target.offsetTop - 14), behavior: 'smooth' });
  }

  function goHome() {
    try {
      if (document.getElementById('tpl-preview-modal')?.classList.contains('active')) closeTplPreview();
      if (document.getElementById('preview-panel')?.classList.contains('active')) closePreview();
      if (document.getElementById('editor-modal')?.classList.contains('active') && App.Editor?.close) App.Editor.close();
    } catch (e) {}
    if (App.RouterNav?.setHandoff) {
      const prev = App.RouterNav.getHandoff() || {};
      App.RouterNav.setHandoff({
        ...prev,
        source: currentPageId(),
        clearProjectContext: true
      });
    }
    navigateTo('section-home');
  }

  function currentPreviewVariant() {
    syncVariantFromPreviewDom(state.currentPreviewLanguage);
    if (state.newsletterWorkspace?.variants?.[state.currentPreviewLanguage]) {
      return normalizeVariant(state.newsletterWorkspace.variants[state.currentPreviewLanguage]);
    }
    return makeVariant(document.getElementById('nl-out')?.innerHTML || '', '');
  }

  function downloadCurrentHTML() {
    const variant = currentPreviewVariant();
    if (!variant.html) return showToast('No newsletter to download yet.', true);
    const file = `newsletter-${state.currentPreviewLanguage}.html`;
    downloadHTML(file, toStandaloneHtml(variant, state.currentPreviewLanguage));
    showToast(`Downloaded ${getLanguageLabel(state.currentPreviewLanguage)} HTML.`);
  }

  // Send-ready export: a single .eml that bundles the HTML + its images as
  // inline CID parts. `X-Unsent: 1` makes classic Outlook open it as an
  // editable draft (images inline) so the user can add recipients and Send —
  // no relay needed. Reuses the same CID conversion as the relay send path.
  async function downloadCurrentEml() {
    const variant = currentPreviewVariant();
    if (!variant.html) return showToast('No newsletter to download yet.', true);
    if (!App.Utils || typeof App.Utils.buildEmlMime !== 'function') {
      return showToast('Export helper unavailable. Refresh and try again.', true);
    }
    const lang = state.currentPreviewLanguage;
    try {
      const standaloneHtml = toStandaloneHtml(variant, lang);
      const { html: cidHtml, attachments } = await prepareImagesForRelay(standaloneHtml, null);
      const meta = getMetadata();
      const subject = `${meta.title || 'Security Awareness Newsletter'} (${getLanguageLabel(lang)})`;
      const eml = App.Utils.buildEmlMime(cidHtml, attachments, { subject });
      downloadBlob(`newsletter-${lang}.eml`, new Blob([eml], { type: 'message/rfc822' }));
      showToast('Downloaded .eml — double-click to open in Outlook, add recipients, then Send.');
    } catch (e) {
      showToast('Could not build .eml export.', true);
    }
  }

  // Send-ready export: a single Outlook .msg (binary OLE2/CFB). Same HTML + inline
  // CID images as the .eml path; opens in Outlook as an editable draft (UNSENT).
  // Reuses the email-safe HTML + CID conversion; the .msg container is written by
  // App.MsgWriter (self-contained, no external dependency).
  async function downloadCurrentMsg() {
    const variant = currentPreviewVariant();
    if (!variant.html) return showToast('No newsletter to download yet.', true);
    if (!App.MsgWriter || typeof App.MsgWriter.buildMsgFile !== 'function') {
      return showToast('MSG export helper unavailable. Refresh and try again.', true);
    }
    const lang = state.currentPreviewLanguage;
    try {
      const standaloneHtml = toStandaloneHtml(variant, lang);
      const { html: cidHtml, attachments } = await prepareImagesForRelay(standaloneHtml, null);
      const meta = getMetadata();
      const subject = `${meta.title || 'Security Awareness Newsletter'} (${getLanguageLabel(lang)})`;
      const bytes = App.MsgWriter.buildMsgFile(cidHtml, attachments, { subject });
      downloadBlob(`newsletter-${lang}.msg`, new Blob([bytes], { type: 'application/vnd.ms-outlook' }));
      showToast('Downloaded .msg — double-click to open in Outlook, add recipients, then Send.');
    } catch (e) {
      showToast('Could not build .msg export.', true);
    }
  }

  async function downloadAllHTML() {
    if (!state.newsletterWorkspace?.variants) return showToast('Generate newsletter first.', true);
    if (typeof JSZip === 'undefined') {
      showToast('ZIP library not loaded. Refresh the page and try again.', true);
      return;
    }
    try {
      const zip = new JSZip();
      const htmlFolder = zip.folder('html');
      const svgFolder = zip.folder('svg');
      let count = 0;
      NEWSLETTER_LANGUAGES.forEach(l => {
        const variant = normalizeVariant(state.newsletterWorkspace.variants[l.id]);
        if (!variant.html) return;
        const html = toStandaloneHtml(variant, l.id);
        htmlFolder.file(`newsletter-${l.id}.html`, html);
        svgFolder.file(`newsletter-${l.id}.svg`, htmlToSvgExport(html));
        count += 1;
      });
      if (!count) return showToast('No language files to export.', true);
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const stamp = new Date().toISOString().slice(0, 10);
      const name = `newsletter-export-${stamp}.zip`;
      downloadBlob(name, blob);
      showToast(`Downloaded ${name} (folders html/ and svg/)`);
    } catch (e) {
      showToast('Could not build ZIP export.', true);
    }
  }

  function resetCurrentLanguage() {
    if (!state.newsletterWorkspace?.variants?.en) return;
    const lang = state.currentPreviewLanguage;
    if (lang === 'en') return showToast('English is the base template.', true);
    const ok = confirm(`Reset ${getLanguageLabel(lang)} to the English base template?`);
    if (!ok) return;
    const en = normalizeVariant(state.newsletterWorkspace.variants.en);
    state.newsletterWorkspace.variants[lang] = makeVariant(en.html, en.css, null);
    persistWorkspace();
    renderPreviewForLanguage(lang);
    showToast(`${getLanguageLabel(lang)} reset to English base.`);
  }

  function goToProjectsPage() {
    if (!App.RouterNav?.goto) return;
    App.RouterNav.goto('projects.html', {
      source: currentPageId(),
      activeDraftId: state.activeDraftId || null,
      projectId: state.activeProjectId || (state.activeDraftId ? `project_${state.activeDraftId}` : null)
    });
  }

  function currentPageId() {
    const page = (window.location?.pathname || '').split('/').pop() || 'index.html';
    return page.replace(/\.html$/i, '') || 'index';
  }

  function goToPreviewPage() {
    if (!App.RouterNav?.goto) return;
    const payload = { source: currentPageId(), projectId: state.activeProjectId || null };
    if (state.projectSnapshotVersion != null) payload.projectSnapshotVersion = state.projectSnapshotVersion;
    App.RouterNav.goto('preview.html', payload);
  }

  function goToHomePage() {
    if (!App.RouterNav?.goto) return;
    App.RouterNav.goto('index.html#section-home', {
      source: currentPageId(),
      clearProjectContext: true
    });
  }

  function goBackToBuilder() {
    if (!App.RouterNav?.goto) return;
    const payload = { source: currentPageId(), projectId: state.activeProjectId || null };
    if (state.projectSnapshotVersion != null) payload.projectSnapshotVersion = state.projectSnapshotVersion;
    App.RouterNav.goto('index.html#section-home', payload);
  }

  function goToEditorPage() {
    if (!App.RouterNav?.goto) return;
    const payload = { source: currentPageId(), projectId: state.activeProjectId || null };
    if (state.projectSnapshotVersion != null) payload.projectSnapshotVersion = state.projectSnapshotVersion;
    App.RouterNav.goto('editor.html', payload);
  }

  function goToSendPage() {
    if (!App.RouterNav?.goto) return;
    const payload = { source: currentPageId(), projectId: state.activeProjectId || null };
    if (state.projectSnapshotVersion != null) payload.projectSnapshotVersion = state.projectSnapshotVersion;
    App.RouterNav.goto('send.html', payload);
  }

  async function saveSMTPConfig(options = {}) {
    const { silent = false } = options;
    const cfg = getSMTPConfigFromUI();
    const method = App.DeliveryHelpers.normalizeMethod(cfg);
    if (!cfg.relayUrl?.trim()) {
      if (!silent) showToast('Relay endpoint URL is required.', true);
      return;
    }
    if (!cfg.fromAddress) {
      if (!silent) showToast('From email is required.', true);
      return;
    }
    if (method === App.DeliveryHelpers.METHOD_GRAPH) {
      if (!cfg.graphTenantId?.trim() || !cfg.graphClientId?.trim() || !cfg.graphClientSecret?.trim()) {
        if (!silent) showToast('Microsoft Graph requires tenant ID, client ID, and client secret.', true);
        return;
      }
    } else if (!cfg.host?.trim()) {
      if (!silent) showToast('SMTP host is required when using SMTP delivery.', true);
      return;
    }
    // Split persist: the password and the Microsoft Graph client secret live
    // only in sessionStorage (tab-scoped). localStorage + IndexedDB get a
    // sanitized copy with both secrets stripped.
    const { password, graphClientSecret, ...sanitized } = cfg;
    const persisted = { ...sanitized, password: '', graphClientSecret: '' };
    await App.DB.saveSMTPProfile(persisted);
    localStorage.setItem(SMTP_STORAGE_KEY, JSON.stringify(persisted));
    try {
      if (password) sessionStorage.setItem(SMTP_PASSWORD_SESSION_STORAGE_KEY, password);
      else sessionStorage.removeItem(SMTP_PASSWORD_SESSION_STORAGE_KEY);
    } catch (e) {}
    try {
      if (graphClientSecret) sessionStorage.setItem(GRAPH_SECRET_SESSION_STORAGE_KEY, graphClientSecret);
      else sessionStorage.removeItem(GRAPH_SECRET_SESSION_STORAGE_KEY);
    } catch (e) {}
    // Keep the live password in memory so the current session's send/test
    // flows can reach it without re-reading sessionStorage every call.
    state.smtpProfile = cfg;
    clearUnsavedChanges();
    if (!silent) showToast('SMTP configuration saved.');
  }

  function collectSMTPDiagnostics({ mode, recipients = [] } = {}) {
    const cfg = state.smtpProfile || getSMTPConfigFromUI();
    const workflowState = normalizeWorkflow(state.newsletterWorkspace?.workflow).state;
    return App.DeliveryHelpers.collectDiagnostics(cfg, { mode, recipients, workflowState });
  }

  function reportSMTPDiagnostics(mode, diagnostics) {
    const failed = diagnostics.filter(item => !item.ok);
    if (!failed.length) return '';
    const header = mode === 'test' ? 'Delivery test preflight failed:' : 'Newsletter send preflight failed:';
    return `${header}\n${failed.map(item => `- ${item.label}: ${item.action}`).join('\n')}`;
  }

  async function callRelay(payload) {
    const cfg = state.smtpProfile || getSMTPConfigFromUI();
    if (!cfg.relayUrl) throw new Error('Relay endpoint URL is required.');
    // Refuse to send credentials over plain HTTP to any non-loopback host.
    let parsedUrl;
    try { parsedUrl = new URL(cfg.relayUrl); }
    catch (e) { throw new Error('Relay endpoint URL is not a valid URL.'); }
    const isLoopback = parsedUrl.hostname === '127.0.0.1' || parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '::1';
    if (parsedUrl.protocol !== 'https:' && !isLoopback) {
      throw new Error('Relay endpoint must use HTTPS (or a loopback address for dev).');
    }
    const res = await fetch(cfg.relayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Relay failed (${res.status})`);
    return res.json().catch(() => ({}));
  }

  async function sendTestEmail() {
    try {
      const cfg = state.smtpProfile || getSMTPConfigFromUI();
      const to = document.getElementById('smtp-test-to')?.value?.trim();
      if (!to) return showToast('Add a test recipient email.', true);
      const diagnostics = collectSMTPDiagnostics({ mode: 'test', recipients: [to] });
      const preflightError = reportSMTPDiagnostics('test', diagnostics);
      if (preflightError) throw new Error(preflightError);
      await saveSMTPConfig();
      await App.DB.addDeliveryLog({ draftId: state.activeDraftId, draftTitle: getMetadata().title, action: 'test', status: 'queued', recipients: to, language: 'en' });
      const delivery = App.DeliveryHelpers.buildRelayDeliveryPayload(cfg);
      const label = App.DeliveryHelpers.relayKindLabel(cfg);
      const result = await callRelay({
        mode: 'test',
        delivery,
        smtp: cfg,
        to: [to],
        subject: `[Test] Awareness ${label} configuration`,
        text: `${label} relay test from Awareness newsletter workspace.`
      });
      await App.DB.addDeliveryLog({ draftId: state.activeDraftId, draftTitle: getMetadata().title, action: 'test', status: 'sent', recipients: to, language: 'en', messageId: result?.messageId || '' });
      await refreshDeliveryLogs();
      showToast('Test email sent.');
    } catch (e) {
      await App.DB.addDeliveryLog({ draftId: state.activeDraftId, draftTitle: getMetadata().title, action: 'test', status: 'failed', recipients: document.getElementById('smtp-test-to')?.value?.trim() || '', language: 'en', error: e.message });
      await refreshDeliveryLogs();
      showToast(`Test email failed: ${e.message}`, true);
    }
  }

  /**
   * Browser-side fetcher used by App.Utils.inlineCidAttachments to load
   * project assets and base64-encode them for the Graph relay.
   */
  async function fetchAssetAsBase64(p) {
    const res = await fetch(p);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  /**
   * Rewrite <img src="assets/..."> → <img src="cid:..."> and return
   * matching attachments for the relay to inline. Runs for both Graph
   * and SMTP delivery — the bundled Graph relay handles attachments
   * end-to-end; SMTP relays that support attachments (nodemailer etc.)
   * get auto-displayed images, and relays that don't simply ignore the
   * unknown JSON key (same broken-image outcome as today's relative
   * `assets/...` paths, which never resolved in email clients). On any
   * helper failure, returns the original html so the send still proceeds.
   */
  async function prepareImagesForRelay(html, _deliveryPayload) {
    if (!App.Utils) return { html, attachments: null };
    try {
      let workingHtml = html;
      const attachments = [];
      // 1) <img src="assets/..."> → cid: (reads the bundled file as base64)
      if (typeof App.Utils.inlineCidAttachments === 'function') {
        const r = await App.Utils.inlineCidAttachments(workingHtml, fetchAssetAsBase64);
        workingHtml = r.html;
        if (r.attachments && r.attachments.length) attachments.push(...r.attachments);
      }
      // 2) <img src="data:image/...;base64,..."> → cid: (QR + embedded illustrations).
      //    Classic Outlook/Gmail block data: images but render CID inline parts.
      if (typeof App.Utils.inlineDataUriAttachments === 'function') {
        const d = App.Utils.inlineDataUriAttachments(workingHtml);
        workingHtml = d.html;
        if (d.attachments && d.attachments.length) attachments.push(...d.attachments);
      }
      return { html: workingHtml, attachments: attachments.length ? attachments : null };
    } catch (_e) {
      return { html, attachments: null };
    }
  }

  async function sendNewsletter() {
    if (!state.newsletterWorkspace?.variants?.[state.currentPreviewLanguage]?.html) return showToast('Generate a newsletter first.', true);
    const recipientsRaw = document.getElementById('smtp-send-to')?.value || '';
    const recipients = recipientsRaw.split(',').map(s => s.trim()).filter(Boolean);
    if (!recipients.length) return showToast('Add at least one recipient.', true);
    try {
      const diagnostics = collectSMTPDiagnostics({ mode: 'send', recipients });
      const preflightError = reportSMTPDiagnostics('send', diagnostics);
      if (preflightError) throw new Error(preflightError);
      await saveSMTPConfig();
      const variant = currentPreviewVariant();
      const meta = getMetadata();
      const subject = `${meta.title || 'Security Awareness Newsletter'} (${getLanguageLabel(state.currentPreviewLanguage)})`;
      await App.DB.addDeliveryLog({ draftId: state.activeDraftId, draftTitle: meta.title, action: 'send', status: 'queued', recipients: recipients.join(', '), subject, language: state.currentPreviewLanguage });
      const delivery = App.DeliveryHelpers.buildRelayDeliveryPayload(state.smtpProfile || getSMTPConfigFromUI());
      const standaloneHtml = toStandaloneHtml(variant, state.currentPreviewLanguage);
      const { html: relayHtml, attachments } = await prepareImagesForRelay(standaloneHtml, delivery);
      const relayPayload = {
        mode: 'send',
        delivery,
        smtp: state.smtpProfile || getSMTPConfigFromUI(),
        to: recipients,
        subject,
        html: relayHtml,
        metadata: { draftId: state.activeDraftId, language: state.currentPreviewLanguage }
      };
      if (attachments && attachments.length) relayPayload.attachments = attachments;
      const result = await callRelay(relayPayload);
      await App.DB.addDeliveryLog({ draftId: state.activeDraftId, draftTitle: meta.title, action: 'send', status: 'sent', recipients: recipients.join(', '), subject, language: state.currentPreviewLanguage, messageId: result?.messageId || '' });
      const statusEl = document.getElementById('meta-status');
      if (statusEl) statusEl.value = 'sent';
      await refreshDeliveryLogs();
      showToast('Newsletter sent.');
    } catch (e) {
      await App.DB.addDeliveryLog({ draftId: state.activeDraftId, draftTitle: getMetadata().title, action: 'send', status: 'failed', recipients: recipients.join(', '), subject: getMetadata().title, language: state.currentPreviewLanguage, error: e.message });
      await refreshDeliveryLogs();
      showToast(`Send failed: ${e.message}`, true);
    }
  }

  async function translatePlainTextWithAI(text, sourceLangId, targetLangId, provider, apiKey) {
    if (!apiKey) throw new Error('AI API key is required for translation.');
    const sourceLanguageName = getLanguageLabel(sourceLangId);
    const targetLanguageName = getLanguageLabel(targetLangId);
    const originalFull = String(text || '').slice(0, 4000);
    const split = TranslationMetrics.splitDecorativeLead(originalFull);
    let proseSource = originalFull;
    let deco = '';
    if (split.deco && TranslationMetrics.hasTranslatableLetters(split.rest)) {
      deco = split.deco;
      proseSource = split.rest.trimStart();
    }
    if (!TranslationMetrics.hasTranslatableLetters(proseSource)) return originalFull;
    if (typeof window !== 'undefined' && window.__AWARENESS_E2E_SEG_TRANSLATE === '1') {
      return `⟨e2e⟩${originalFull}`;
    }
    if (typeof window !== 'undefined' && window.__AWARENESS_E2E_SEG_TRANSLATE === 'echo') {
      return originalFull;
    }
    const finalizeSeg = (raw) => TranslationMetrics.normalizeTranslatedTextSegment(raw, proseSource);
    const strictPrompt = (mode = 'normal') =>
      `Translate the text inside <source> from ${sourceLanguageName} into ${targetLanguageName}. Use fluent ${targetLanguageName} suitable for native readers (locale code: ${targetLangId}).
Rules:
- Return ONLY the translation text, no explanations.
- Never ask for more text.
- Keep URLs, emails, codes, and placeholders unchanged.
- If the segment is already natural ${targetLanguageName}, return it unchanged.
- When <source> is a single line, output a single line (no newlines, no markdown list markers like "- " or "* " at the start).
<source>${proseSource}</source>
${mode === 'retry' ? 'If unsure, still return best-effort translation only.' : ''}`;

    const isBadTranslationOutput = (output, src) => {
      const out = String(output || '').trim();
      if (!out) return true;
      const badPatterns = [
        /i'?m sorry/i,
        /please provide/i,
        /need the text/i,
        /want translated/i,
        /cannot translate/i
      ];
      if (badPatterns.some(re => re.test(out))) return true;
      if (src.trim().length < 140 && out.length > src.trim().length * 3) return true;
      return false;
    };

    if (provider === 'openai') {
      const resp = await fetchWithTranslationRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          temperature: 0.1,
          messages: [
            { role: 'system', content: 'You are a precise professional translator specializing in corporate security communications. Output only translated text — no preamble, no explanation, no apology.' },
            { role: 'user', content: strictPrompt() }
          ]
        })
      });
      if (!resp.ok) throw new Error(`OpenAI translate failed (${resp.status})`);
      const data = await resp.json();
      let out = (data?.choices?.[0]?.message?.content || '').trim() || proseSource;
      if (isBadTranslationOutput(out, proseSource)) {
        const retry = await fetchWithTranslationRetry('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-5-mini',
            temperature: 0.0,
            messages: [
              { role: 'system', content: 'You are a precise professional translator. The previous response was rejected. Return translated text only — no commentary, no apology.' },
              { role: 'user', content: strictPrompt('retry') }
            ]
          })
        });
        if (retry.ok) {
          const retryData = await retry.json();
          const retryOut = (retryData?.choices?.[0]?.message?.content || '').trim();
          if (!isBadTranslationOutput(retryOut, proseSource)) out = retryOut;
        }
      }
      if (isBadTranslationOutput(out, proseSource)) throw new Error('Invalid model translation output');
      const core = finalizeSeg(out);
      return deco ? deco + core.trimStart() : core;
    }

    const claudeModels = ['claude-sonnet-4-6', 'claude-sonnet-4-5', 'claude-3-5-sonnet-latest'];
    let lastMessage = 'unknown error';
    for (const model of claudeModels) {
      const resp = await fetchWithTranslationRetry('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model,
          max_tokens: 1200,
          temperature: 0.1,
          system: 'You are a precise professional translator specializing in corporate security communications. Output only translated text — no preamble, no explanation, no apology.',
          messages: [{ role: 'user', content: strictPrompt() }]
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        let out = (data?.content?.[0]?.text || '').trim() || proseSource;
        if (isBadTranslationOutput(out, proseSource)) {
          const retryResp = await fetchWithTranslationRetry('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
              model,
              max_tokens: 1200,
              temperature: 0.0,
              system: 'You are a precise professional translator. The previous response was rejected. Return translated text only — no commentary, no apology.',
              messages: [{ role: 'user', content: strictPrompt('retry') }]
            })
          });
          if (retryResp.ok) {
            const retryData = await retryResp.json();
            const retryOut = (retryData?.content?.[0]?.text || '').trim();
            if (!isBadTranslationOutput(retryOut, proseSource)) out = retryOut;
          }
        }
        if (isBadTranslationOutput(out, proseSource)) throw new Error('Invalid model translation output');
        const core = finalizeSeg(out);
        return deco ? deco + core.trimStart() : core;
      }
      let errMsg = `HTTP ${resp.status}`;
      try {
        const errData = await resp.json();
        errMsg = errData?.error?.message || errData?.message || errMsg;
      } catch (e) {}
      lastMessage = `${model}: ${errMsg}`;
      if (!/invalid model|model.*not found|unknown model/i.test(errMsg)) {
        break;
      }
    }
    throw new Error(`Claude translate failed (${lastMessage})`);
  }

  async function translatePlainTextAIFirst(text, sourceLangId, targetLangId, provider, aiKey) {
    const UIT = window.App.UITranslation;
    const locked = UIT.protectTokens(String(text || ''));
    const src = locked.html;
    const aiOut = await translatePlainTextWithAI(src, sourceLangId, targetLangId, provider, aiKey);
    return UIT.restoreTokens(UIT.applyGlossaryLock(aiOut), locked.protectedTokens);
  }

  /**
   * Editor: translate one element's text from sourceLangId into every other workspace variant
   * at the same mirror path (structure must match across languages).
   */
  async function syncNewsletterElementImageSrcToAllLanguages({ path, relPath, dataUri, sourceLangId }) {
    if (!state.newsletterWorkspace?.variants) throw new Error('Generate newsletter first.');
    const src = String(dataUri || '');
    if (!src) throw new Error('No image data provided.');
    if ((!path || !path.length) && (!relPath || !relPath.length)) {
      throw new Error('Could not resolve this image in other languages.');
    }
    const targets = NEWSLETTER_LANGUAGES.filter(l => l.id !== sourceLangId);
    let updated = 0;
    let failed = 0;
    for (const lang of targets) {
      const v = normalizeVariant(state.newsletterWorkspace.variants[lang.id]);
      const raw = (v.html || '').trim();
      if (!raw) { failed += 1; continue; }
      const r = App.Utils.updateNewsletterNodeImageSrcByMirrorPath(raw, path, relPath, src, 5);
      if (r.updated) {
        state.newsletterWorkspace.variants[lang.id] = makeVariant(r.html, v.css, null);
        updated += 1;
      } else {
        failed += 1;
      }
    }
    persistWorkspace();
    const lid = state.currentPreviewLanguage || 'en';
    renderPreviewForLanguage(lid);
    return { updated, failed };
  }

  async function syncNewsletterElementTextToAllLanguages({ path, relPath, text, sourceLangId }) {
    if (!state.newsletterWorkspace?.variants) throw new Error('Generate newsletter first.');
    const trimmed = String(text || '').trim();
    if (!trimmed) throw new Error('No text to translate.');
    if ((!path || !path.length) && (!relPath || !relPath.length)) {
      throw new Error('Could not resolve this block in other languages.');
    }
    const provider = document.getElementById('ai-provider')?.value || 'claude';
    const aiKey = document.getElementById('ai-key')?.value?.trim() || '';
    if (!aiKey) throw new Error('Add an AI API key first.');
    const targets = NEWSLETTER_LANGUAGES.filter(l => l.id !== sourceLangId);
    let updated = 0;
    let failed = 0;
    state.translationPendingLang = { id: sourceLangId, label: getLanguageLabel(sourceLangId) };
    for (const lang of targets) {
      let outText = trimmed;
      if (TranslationMetrics.hasTranslatableLetters(trimmed)) {
        try {
          outText = await translatePlainTextAIFirst(trimmed, sourceLangId, lang.id, provider, aiKey);
        } catch (err) {
          state.translationPendingLang = { id: lang.id, label: lang.label };
          throw err;
        }
      }
      const v = normalizeVariant(state.newsletterWorkspace.variants[lang.id]);
      const raw = (v.html || '').trim();
      if (!raw) {
        failed += 1;
        continue;
      }
      const r = App.Utils.updateNewsletterNodeTextByMirrorPath(raw, path, relPath, outText, 5);
      if (r.updated) {
        state.newsletterWorkspace.variants[lang.id] = makeVariant(r.html, v.css, null);
        updated += 1;
      } else {
        failed += 1;
      }
    }
    state.translationPendingLang = null;
    persistWorkspace();
    const lid = state.currentPreviewLanguage || 'en';
    renderPreviewForLanguage(lid);
    return { updated, failed };
  }


  // Translation block extracted to js/ui/translation.js. The wrappers
  // below preserve the in-main call sites for translateHtmlAIFirst,
  // translateWorkspaceFromEnglish, and autoTranslateNewsletter.
  const GLOSSARY_LOCK = { en: {} };
  const GLOSSARY_LOCK_TERM_LIST = [];
  async function translateHtmlAIFirst(html, targetLang, provider, aiKey) {
    return window.App.UITranslation.translateHtmlAIFirst(html, targetLang, provider, aiKey);
  }
  async function translateWorkspaceFromEnglish(opts) {
    return window.App.UITranslation.translateWorkspace(opts);
  }
  async function autoTranslateNewsletter() {
    return window.App.UITranslation.autoTranslateNewsletter();
  }


  function copyCurrentHTML() {
    const variant = currentPreviewVariant();
    const html = renderVariantHtml(variant);
    copyHTML('nl-out', html);
  }

  function updateAIDisplay() {}

  function initUnsavedChangeGuard() {
    if (window.__awarenessUnsavedGuardBound) return;
    window.__awarenessUnsavedGuardBound = true;
    document.addEventListener('input', (event) => {
      const el = event.target;
      if (!el) return;
      const tag = (el.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') flagUnsavedChanges(true);
    }, true);
    document.addEventListener('change', (event) => {
      const el = event.target;
      if (!el) return;
      const tag = (el.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') flagUnsavedChanges(true);
    }, true);
    window.addEventListener('beforeunload', (event) => {
      if (state.suppressUnsavedPrompt || !state.unsavedChanges) return;
      event.preventDefault();
      event.returnValue = 'You have unsaved changes. Leave this page?';
    });
  }

  function init() {
    loadWorkspace();
    renderFeedStats(); renderFeedDashboard(); renderSidebarFeeds(); renderDBStats();
    applyCurationMode(getCurationMode());
    renderFetchTelemetryPanel();
    renderSidebarKeywordManager();
    refreshLanguageControls();
    renderWorkflowControls();
    refreshDrafts();
    refreshDeliveryLogs();
    if (state.newsletterWorkspace?.variants) renderPreviewForLanguage(state.currentPreviewLanguage || 'en');
    const issueDateEl = document.getElementById('meta-issue-date');
    if (issueDateEl && !issueDateEl.value) issueDateEl.value = new Date().toISOString().split('T')[0];
    try {
      const fromStorage = JSON.parse(localStorage.getItem(SMTP_STORAGE_KEY) || 'null');
      if (fromStorage) {
        // Scrub any legacy plaintext secrets sitting in localStorage from older
        // builds. The password and Graph client secret now live only in
        // sessionStorage.
        let legacyScrubbed = false;
        if (typeof fromStorage.password === 'string' && fromStorage.password) {
          fromStorage.password = '';
          legacyScrubbed = true;
        }
        if (typeof fromStorage.graphClientSecret === 'string' && fromStorage.graphClientSecret) {
          fromStorage.graphClientSecret = '';
          legacyScrubbed = true;
        }
        if (legacyScrubbed) {
          try { localStorage.setItem(SMTP_STORAGE_KEY, JSON.stringify(fromStorage)); } catch (e) {}
        }
        let sessionPassword = '';
        try { sessionPassword = sessionStorage.getItem(SMTP_PASSWORD_SESSION_STORAGE_KEY) || ''; } catch (e) {}
        let sessionSecret = '';
        try { sessionSecret = sessionStorage.getItem(GRAPH_SECRET_SESSION_STORAGE_KEY) || ''; } catch (e) {}
        state.smtpProfile = { ...fromStorage, password: sessionPassword, graphClientSecret: sessionSecret };
        applySMTPConfig(fromStorage);
      }
    } catch (e) {}
    try {
      const aiSettings = JSON.parse(localStorage.getItem(AI_SETTINGS_STORAGE_KEY) || 'null');
      if (aiSettings) {
        applyAISettings(aiSettings);
        if (Object.prototype.hasOwnProperty.call(aiSettings, 'aiKey')) {
          const { aiKey: _drop, ...sanitized } = aiSettings;
          localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
        }
      } else {
        applyAISettings({});
      }
      const sessionKey = sessionStorage.getItem(AI_KEY_SESSION_STORAGE_KEY) || '';
      if (sessionKey) {
        try {
          const provider = aiSettings?.provider || 'claude';
          App.AISummarizer?.configure?.({
            provider,
            claudeKey: provider === 'claude' ? sessionKey : '',
            openaiKey: provider === 'openai' ? sessionKey : ''
          });
        } catch (e) {}
      }
    } catch (e) {}
    try {
      const aiExperiment = JSON.parse(localStorage.getItem(AI_EXPERIMENT_CONTROL_STORAGE_KEY) || 'null');
      applyAIExperimentControl(aiExperiment || defaultAIExperimentControl());
    } catch (e) {
      applyAIExperimentControl(defaultAIExperimentControl());
    }
    try {
      const centralCfg = JSON.parse(localStorage.getItem(CENTRAL_CONFIG_STORAGE_KEY) || 'null');
      if (centralCfg) applyCentralConfigBundle(centralCfg);
    } catch (e) {}
    App.DB.getSMTPProfile('default').then(p => {
      if (!p) return;
      // Merge the session-scoped secrets into the runtime profile so the
      // current tab's send/test flow has them without persisting to disk.
      let sessionPassword = '';
      try { sessionPassword = sessionStorage.getItem(SMTP_PASSWORD_SESSION_STORAGE_KEY) || ''; } catch (e) {}
      let sessionSecret = '';
      try { sessionSecret = sessionStorage.getItem(GRAPH_SECRET_SESSION_STORAGE_KEY) || ''; } catch (e) {}
      state.smtpProfile = { ...p, password: sessionPassword, graphClientSecret: sessionSecret };
      applySMTPConfig({ ...p, password: '', graphClientSecret: '' });
    }).catch(() => {});
    const maxSel = document.getElementById('cfg-max');
    if (maxSel) { maxSel.addEventListener('change', () => { const ml = document.getElementById('max-lbl'); if (ml) ml.textContent = maxSel.value; }); }
    App.DB.open().then(() => {
      loadFromDB();
    }).catch(() => {});
    try { G.particleBackground('sidebar'); } catch(e) {}
    renderArticleStats([], []);
    renderAIRollbackBanner();
    initUnsavedChangeGuard();
    initDeliveryMethodUI();
    if (currentPageId() === 'editor' && state.activeProjectId) {
      setTimeout(() => { refreshEditorProjectVersionOptions().catch(() => {}); }, 600);
    }
  }

  function go() {}

  const SAMPLE_ARTICLES = [
    { title: 'New Phishing Scam Impersonates IT Department — Asks Staff to "Verify" Passwords', source: 'Bleeping Computer', sourceId: 'bleeping', url: '#', type: 'Phishing', pubDate: new Date().toISOString().split('T')[0], summary: 'A new phishing campaign is sending fake emails that look like they come from your IT department, asking you to click a link and "verify" your password. The emails use your company logo and even address you by name — but the link leads to a fake login page that steals your credentials.', watchouts: ["Never click password reset links you didn't request", 'Check the sender\'s full email address carefully', 'Report suspicious IT emails to security team'], threatLevel: 4, aiProcessed: true, relevanceScore: 15 },
    { title: 'Employees Tricked by Fake "Missed Delivery" Text Messages — Smishing on the Rise', source: 'The Hacker News', sourceId: 'hackernews', url: '#', type: 'Smishing', pubDate: new Date().toISOString().split('T')[0], summary: 'Scammers are sending text messages pretending to be from delivery companies like FedEx and DHL, claiming you have a missed package. The link in the text leads to a page that asks for your credit card details. This type of attack is called "smishing" — phishing via SMS.', watchouts: ["Don't click links in unexpected text messages", 'Call the delivery company directly if unsure', 'Delete suspicious texts and report to IT'], threatLevel: 3, aiProcessed: true, relevanceScore: 12 },
    { title: 'Major Data Breach Exposes 2 Million Customer Records — Change Your Passwords Now', source: 'KrebsOnSecurity', sourceId: 'krebs', url: '#', type: 'Data Breach', pubDate: new Date().toISOString().split('T')[0], summary: 'A large retail company has confirmed that hackers stole personal data including names, email addresses, and encrypted passwords of 2 million customers. If you have an account with this service, change your password immediately and enable two-factor authentication.', watchouts: ['Change your password for affected accounts now', 'Turn on two-step login (MFA) everywhere', 'Watch your accounts for unusual activity'], threatLevel: 5, aiProcessed: true, relevanceScore: 18 }
  ];

  let _previewingFmt = null;

  function previewTemplate(fmtId, fmtName) {
    _previewingFmt = fmtId;
    const cfg = getConfig();
    const opts = { useLinks: true, usePoster: true, useQR: false, useIllus: true };
    const arts = SAMPLE_ARTICLES.slice(0, Math.min(cfg.max, 3));
    const html = App.NewsletterBuilder.build(fmtId, cfg, arts, opts);
    document.getElementById('tpl-preview-out').innerHTML = html;
    document.getElementById('tpl-preview-title').textContent = `Preview \u2014 ${fmtName || fmtId}`;
    document.getElementById('tpl-preview-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeTplPreview() {
    document.getElementById('tpl-preview-modal').classList.remove('active');
    document.body.style.overflow = '';
    _previewingFmt = null;
  }

  function selectFromPreview() {
    if (_previewingFmt) {
      state.selectedFormat = _previewingFmt;
      document.querySelectorAll('.fmt-card').forEach(c => { c.classList.toggle('sel', c.getAttribute('data-fmt') === _previewingFmt); });
      showToast(`Template "${_previewingFmt}" selected!`);
    }
    closeTplPreview();
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.getElementById('tpl-preview-modal')?.classList.contains('active')) closeTplPreview();
      else if (document.getElementById('editor-modal')?.classList.contains('active')) App.Editor.close();
    }
  });

  /**
   * Internal helpers exposed for sibling files in `js/ui/*.js`.
   * Sibling UI files reach mutable state via `App.UI._state` and helpers
   * via `App.UI._internals`. The shared state object IS the same reference
   * — mutating it from a sibling is fine and expected.
   *
   * Contract:
   *   - Anything a future ui-sibling file might need from inside this IIFE
   *     MUST be listed in this object before the sibling can use it.
   *   - Do NOT remove entries without grepping every js/ui/*.js consumer.
   *   - Keep additions appended.
   *   - `_state` is the live shared state object (do not snapshot).
   *
   * Categories:
   *   Translation UI surface:   getLanguageLabel, getLanguageVariant,
   *                             setLanguageTranslating, setTranslateProgress,
   *                             clearTranslationPipelineState,
   *                             setTranslationPipelineState,
   *                             recordTranslationFailure,
   *                             renderTranslationFailureState,
   *                             translationSignature
   *   Variant + workspace:      makeVariant, normalizeVariant,
   *                             isVariantUntranslated, fetchWithTranslationRetry,
   *                             persistWorkspace, renderPreviewForLanguage,
   *                             refreshLanguageControls, flagUnsavedChanges,
   *                             clearUnsavedChanges
   *   Preview:                  currentPreviewVariant, renderVariantHtml
   *   Constants:                NEWSLETTER_LANGUAGES (id+label list),
   *                             AI_EXPERIMENT_CONTROL_STORAGE_KEY
   *                             (consumed by js/ui/ai_experiment.js)
   */
  const _internals = {
    // Translation UI surface
    getLanguageLabel, getLanguageVariant,
    setLanguageTranslating, setTranslateProgress,
    clearTranslationPipelineState, setTranslationPipelineState,
    recordTranslationFailure, renderTranslationFailureState,
    translationSignature,
    // Variant + workspace helpers used by translation pipeline
    makeVariant, normalizeVariant, isVariantUntranslated,
    fetchWithTranslationRetry,
    // Workspace
    persistWorkspace, renderPreviewForLanguage, refreshLanguageControls,
    flagUnsavedChanges, clearUnsavedChanges,
    // Preview
    currentPreviewVariant, renderVariantHtml,
    // Constants
    NEWSLETTER_LANGUAGES,
    AI_EXPERIMENT_CONTROL_STORAGE_KEY,
    // Build/generate pipeline + draft/project helpers (consumed by js/ui/generate_pipeline.js)
    getOptions, getConfig, getMetadata, filteredArticles,
    defaultProjectTitle, getProjectTitle,
    normalizeWorkflow, renderWorkflowControls,
    syncVariantFromPreviewDom,
    updateProjectChrome, currentPageId,
    emptyNewsletterWorkspaceShell, applyIndexedProjectToWorkspace,
    applyMetadata, refreshDrafts,
    // Sidebar sibling needs these to nudge cross-cluster renders that stay in main
    renderFeedStats, renderFeedDashboard
  };

  return {
    state, _state: state, _internals,
    go, closePreview, pickFormat, setDuration, setFilter, setArticleKeywordSearch,
    setArticleSort,
    toggleArticle, deleteArticle, loadArticles, loadFromDB, clearDB,
    buildAndPreview, buildAndPreviewEnglishOnly, init, updateAIDisplay, getConfig, getOptions,
    previewTemplate, closeTplPreview, selectFromPreview,
    toggleSec, switchPreviewLanguage,
    openEditor,
    navigateTo, goHome, loadDraftById, goToProjectsPage,
    goToPreviewPage, goToHomePage, goBackToBuilder, goToEditorPage, goToSendPage,
    transitionWorkflow, openWorkflowHistory,
    saveDraft, saveCopy, saveProjectVersion, loadSelectedDraft, pickDraftToLoad,
    editorLoadSelectedProjectVersion, editorRestoreSelectedVersionAsLatest,
    saveSMTPConfig, sendTestEmail, sendNewsletter,
    saveAISettings, saveAIExperimentControl, triggerAIRollback, exportAIExperimentEvidence, saveCentralConfig,
    addSidebarCriticalKeyword, addSidebarContextKeyword, addSidebarNoiseKeyword,
    removeSidebarCriticalKeyword, removeSidebarContextKeyword, removeSidebarNoiseKeyword,
    resetSidebarKeywords,
    addFeedSource, removeFeedSource,
    applyCurationMode, flagCurationFeedback,
    downloadCurrentHTML, downloadCurrentEml, downloadCurrentMsg, downloadAllHTML, autoTranslateNewsletter,
    retryTranslationPipeline,
    syncNewsletterElementTextToAllLanguages,
    syncNewsletterElementImageSrcToAllLanguages,
    getTranslationDiagSnapshot: () => state.translationLastFailure,
    copyHTML: copyCurrentHTML
  };
})();
