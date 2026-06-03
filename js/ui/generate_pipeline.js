(function () {
  'use strict';
  const App = window.App = window.App || {};
  const UI = App.UI;
  if (!UI || !UI._state || !UI._internals) return;
  const Utils = App.Utils || {};
  const showToast = Utils.showToast || (() => {});

  const state = UI._state;
  const I = UI._internals;

  // ---- helpers ----
  function buildWorkspaceSnapshot() {
    if (!state.newsletterWorkspace) return null;
    I.syncVariantFromPreviewDom(state.currentPreviewLanguage);
    return JSON.parse(JSON.stringify(state.newsletterWorkspace));
  }

  async function beforeWorkspaceSnapshot() {
    if (window.App?.Editor?.flushOpenEditorToWorkspace) {
      await App.Editor.flushOpenEditorToWorkspace();
    }
  }

  // Build an auto project title from the dominant topic + current timestamp.
  // Used to auto-save each generated newsletter as its own Project so users
  // don't have to click "Save Project" — every build appears in Projects
  // immediately with a clear, sortable name.
  function autoProjectTitleFromArticles(arts) {
    const list = Array.isArray(arts) ? arts.filter(Boolean) : [];
    // Tally article `type` values, fall back to `category` if type is missing.
    const counts = {};
    for (const a of list) {
      const t = String((a && (a.type || a.category)) || '').trim();
      if (!t) continue;
      counts[t] = (counts[t] || 0) + 1;
    }
    let topic = '';
    for (const k of Object.keys(counts)) {
      if (!topic || counts[k] > counts[topic]) topic = k;
    }
    if (!topic) topic = 'newsletter';
    const slug = topic.toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 40) || 'newsletter';
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
    return `${slug}_${stamp}`;
  }

  // Auto-save the current workspace as a NEW project (clears activeProjectId
  // first so we never silently fork-into an existing project). Used after
  // buildAndPreview completes. Silent failure — never blocks the build flow.
  async function autoSaveAsProject(arts) {
    try {
      const titleInput = document.getElementById('project-title');
      const autoTitle = autoProjectTitleFromArticles(arts);
      // Only the project-title input gets the auto-slug — that's what the
      // Projects list and saveProjectVersion read. NEVER touch meta-title or
      // workspace.cfg.title: those drive the newsletter header / chrome and
      // the bank-page portal-name slot (which renders `c.title || c.pname`),
      // so overwriting them would replace the user's configured Newsletter
      // Title and portal display name with a "data_breach_…" slug.
      if (titleInput) titleInput.value = autoTitle;
      // Fresh project per generation — never overwrite a project the user
      // may currently be editing in another tab/session.
      state.activeProjectId = null;
      state.projectSnapshotVersion = null;
      await saveProjectVersion();
    } catch (e) {
      // Don't break the build flow if auto-save fails. The workspace is
      // still persisted to localStorage — user can manually save later.
      try { console.warn('[generate_pipeline] auto-save failed:', e && e.message); } catch {}
    }
  }

  // ---- build + preview ----
  function buildAndPreviewEnglishOnly() { return buildAndPreview({ skipTranslation: true }); }

  async function buildAndPreview({ skipTranslation = false } = {}) {
    const opts = I.getOptions();
    const provider = document.getElementById('ai-provider')?.value || 'claude';
    const aiKey = document.getElementById('ai-key')?.value?.trim() || '';
    // Force-clear any stale build context from a previous session / bfcache
    // restore. Without this, clicking Generate a second time could navigate
    // preview.html with the PREVIOUS project's id in the handoff — the preview
    // page then hydrates from that old IndexedDB record, masking the freshly
    // built workspace and showing the first newsletter again. We also wipe the
    // workspace itself so renderPreviewForLanguage can't read a stale variant
    // before the new build finishes writing.
    state.activeProjectId = null;
    state.projectSnapshotVersion = null;
    state.activeDraftId = null;
    state.translationCache = {};
    state.newsletterWorkspace = null;
    try {
      if (App.RouterNav?.setHandoff) {
        App.RouterNav.setHandoff({ source: I.currentPageId(), clearProjectContext: true });
      }
    } catch {}
    // Track whether the article set was hand-picked by the user. When it was,
    // the coherence gate inside fillNewsletterTextSlots must be bypassed —
    // otherwise an "incoherent" verdict (e.g. mixing a data-breach piece with
    // a romance-scam piece) silently drops articles before they ever reach
    // the section prompts, leaving the AI to write generic platitudes.
    const hadExplicitSelection = state.selectedArticleIndices.length > 0;
    let arts = hadExplicitSelection
      ? state.selectedArticleIndices.map(i => state.allArticles[i]).filter(Boolean)
      : I.filteredArticles().slice(0, I.getConfig().max);
    arts = arts.slice(0, I.getConfig().max);
    if (!arts.length) { showToast('No articles selected. Fetch news first, then select articles.', true); return; }
    const willTranslate = !!aiKey && !skipTranslation;
    const willShowProgress = !!aiKey;
    const nonEnglishLangCount = I.NEWSLETTER_LANGUAGES.filter(l => l.id !== 'en').length;
    const progressTotalSteps = willTranslate ? 1 + nonEnglishLangCount : 1;
    const metaTitle = document.getElementById('meta-title');
    if (metaTitle && !metaTitle.value.trim()) metaTitle.value = I.defaultProjectTitle();
    arts.forEach(a => {
      if (!a.summary && a.description) a.summary = a.description;
      if (!a.watchouts) { const l = App.AISummarizer.localSummarize(a); a.watchouts = l.watchouts; }
    });
    if (typeof App.AISummarizer.dedupeWatchoutsAcrossArticles === 'function') {
      App.AISummarizer.dedupeWatchoutsAcrossArticles(arts);
    }
    if (willShowProgress) {
      I.setTranslateProgress(true, 0, progressTotalSteps, willTranslate ? 'Generating content…' : 'Curating newsletter…', 'Newsletter');
    }
    // Open an AI-logging build context. Every nested AI call (newsletterChrome,
    // fillNewsletterTextSlots → bank-page ensemble / Do-Don't / Spotlight /
    // Corporate Alert / coherence checks) inherits this template_id and
    // mirrors its prompt+response logs into templates/<template_id>/ensemble-logs/<session>/.
    const AIL = window.App && window.App.AILogger;
    if (AIL && typeof AIL.beginBuild === 'function') {
      AIL.beginBuild({ templateId: state.selectedFormat });
    }
    try {
      App.AISummarizer.configure({
        provider,
        claudeKey: provider === 'claude' ? aiKey : '',
        openaiKey: provider === 'openai' ? aiKey : ''
      });
      let nlChrome = App.AISummarizer.localNewsletterChrome(arts);
      const featAi = document.getElementById('feat-ai')?.checked !== false;
      if (featAi && aiKey) {
        try {
          nlChrome = await App.AISummarizer.newsletterChrome(arts, { mode: state.curationMode || 'balanced' });
        } catch (chromeErr) {
          try { console.error('[awareness] newsletterChrome failed:', chromeErr); } catch {}
          nlChrome = App.AISummarizer.localNewsletterChrome(arts);
        }
      }
      let textSlots = {};
      try {
        if (typeof App.AISummarizer.fillNewsletterTextSlots === 'function') {
          textSlots = await App.AISummarizer.fillNewsletterTextSlots(state.selectedFormat, arts, {
            mode: state.curationMode || 'balanced',
            forceLocal: !(featAi && aiKey),
            // User explicitly chose these articles — don't let the coherence
            // gate silently filter them out before the section prompts run.
            skipCoherenceCheck: hadExplicitSelection
          });
        }
      } catch (slotErr) {
        try { console.error('[awareness] fillNewsletterTextSlots failed:', slotErr); } catch {}
        showToast(`AI content fill failed: ${slotErr?.message || 'unknown error'}. Showing template defaults.`, true);
        textSlots = {};
      }
      const cfg = { ...I.getConfig(), ...I.getMetadata(), ...nlChrome, ...textSlots };
      // Visible diagnostic so users can confirm in DevTools console which
      // template the engine actually built with — catches the "I picked X but
      // got Corporate Alert" symptom (usually a stale cache or a card-click
      // that didn't register on the Beta details group).
      try { console.info('[awareness] building newsletter with template:', state.selectedFormat); } catch {}
      const html = App.NewsletterBuilder.build(state.selectedFormat, cfg, arts, opts);
      // If the engine fell back to a different template (id wasn't registered),
      // surface it loudly instead of silently delivering the wrong layout.
      const expectedTag = `data-template-id="${state.selectedFormat}"`;
      if (typeof html === 'string' && !html.includes(expectedTag)) {
        try { console.error('[awareness] selected template did not build — engine silently fell back. Selected:', state.selectedFormat); } catch {}
        showToast(`Template "${state.selectedFormat}" did not build (silent fallback). Check console.`, true);
      }
      const variants = {};
      I.NEWSLETTER_LANGUAGES.forEach(l => {
        variants[l.id] = l.id === 'en'
          ? I.makeVariant(html, '', { translatedFrom: null })
          : I.makeVariant('', '', { translatedFrom: null });
      });
      state.newsletterWorkspace = {
        id: `nw_${Date.now()}`, createdAt: new Date().toISOString(),
        format: state.selectedFormat, cfg, opts, articles: arts, variants,
        currentLanguage: state.currentPreviewLanguage || 'en',
        workflow: I.normalizeWorkflow(null)
      };
      state.translationCache = {};
      I.persistWorkspace();
      I.refreshLanguageControls();
      I.renderWorkflowControls();
      // Push the freshly-built HTML into #nl-out NOW. The home page hosts a
      // hidden #nl-out element, so autoSaveAsProject → saveProjectVersion →
      // buildWorkspaceSnapshot → syncVariantFromPreviewDom would otherwise
      // read the PREVIOUS build's HTML still sitting in that DOM node and
      // clobber the fresh variants.en.html with it — the saved project would
      // end up with the new articles array but the old rendered HTML, and
      // every preview after the second build would show the first newsletter.
      try { I.renderPreviewForLanguage(state.newsletterWorkspace.currentLanguage || 'en'); } catch {}
    } catch (genErr) {
      if (willShowProgress) I.setTranslateProgress(false);
      showToast(`Newsletter build failed: ${genErr.message}`, true);
      return;
    } finally {
      // Always clear the AI-logging build context so a later, unmanaged AI
      // call doesn't accidentally tag itself with the wrong template id.
      if (AIL && typeof AIL.endBuild === 'function') AIL.endBuild();
    }

    // Auto-save the freshly generated newsletter as a Project. Runs once after
    // the EN build (in case the user doesn't wait for translations to finish)
    // and again after translation completes — second call upserts onto the
    // same projectId so the user ends up with one project, two versions.
    await autoSaveAsProject(arts);
    if (willTranslate) {
      try {
        state.translationLastFailure = null;
        I.setLanguageTranslating(true, 'multi');
        const firstTranslatedLang = await window.App.UITranslation.translateWorkspace({
          overwrite: true,
          progressLabel: 'Generating translations',
          progressCompletedBase: 1,
          progressTotal: progressTotalSteps
        });
        const targetPreviewLang = state.currentPreviewLanguage !== 'en'
          ? state.currentPreviewLanguage
          : (firstTranslatedLang || 'en');
        state.currentPreviewLanguage = targetPreviewLang;
        state.newsletterWorkspace.currentLanguage = targetPreviewLang;
        I.persistWorkspace();
        // Push the translated variant into #nl-out so the subsequent
        // saveProjectVersion → buildWorkspaceSnapshot → syncVariantFromPreviewDom
        // reads the translated HTML instead of the stale English content left
        // behind by the pre-translation render above. Without this, every
        // non-English variant in the saved Project gets clobbered with English.
        try { I.renderPreviewForLanguage(targetPreviewLang); } catch (e) {}
        // Update the auto-saved project with the now-translated variants
        // (upserts onto the same projectId set by the initial autoSaveAsProject).
        try { await saveProjectVersion(); } catch {}
      } catch (e) {
        if (!state.translationLastFailure) {
          const TM = App.TranslationMetrics || {};
          I.recordTranslationFailure({
            message: e.message,
            kind: typeof TM.classifyTranslationFailureKind === 'function'
              ? TM.classifyTranslationFailureKind(e.message)
              : 'unknown',
            languageId: state.translationPendingLang?.id || null,
            languageLabel: state.translationPendingLang?.label || null
          });
        }
        showToast(`Translation failed: ${e.message}`, true);
        I.renderTranslationFailureState(e.message);
        I.setLanguageTranslating(false);
        return;
      } finally {
        I.setLanguageTranslating(false);
      }
    } else {
      if (willShowProgress) {
        I.setTranslateProgress(true, 1, progressTotalSteps, 'Newsletter ready', 'Newsletter');
        I.setTranslateProgress(false);
      }
      state.currentPreviewLanguage = 'en';
      state.newsletterWorkspace.currentLanguage = 'en';
      I.persistWorkspace();
      showToast(skipTranslation
        ? 'Newsletter generated in English (translation skipped).'
        : 'Newsletter generated in English. Add an AI API key in Configuration to auto-translate.');
    }
    I.updateProjectChrome();
    if (App.RouterNav?.goto) {
      // Post-generate routes straight to the editor. The Preview page (preview.html)
      // is still reachable via the top nav, goToPreviewPage(), or direct URL — only the
      // automatic post-build navigation target changed.
      App.RouterNav.goto('editor.html', { source: I.currentPageId(), projectId: state.activeProjectId || null });
      return;
    }
    document.getElementById('preview-panel')?.classList.add('active');
    I.renderPreviewForLanguage(state.newsletterWorkspace.currentLanguage || 'en');
    window.scrollTo(0, 0);
    if (willTranslate) {
      showToast('Newsletter generated. Click "Edit newsletter" to open the editor.');
    }
  }

  // ---- drafts ----
  async function saveDraft({ asCopy = false } = {}) {
    const meta = I.getMetadata();
    if (!meta.title) return showToast('Title is required before saving a draft.', true);
    if (!state.newsletterWorkspace) return showToast('Generate newsletter first, then save draft.', true);
    await beforeWorkspaceSnapshot();
    const snapshot = buildWorkspaceSnapshot();
    const existing = (!asCopy && state.activeDraftId) ? await App.DB.getDraftById(state.activeDraftId) : null;
    const baseSnapshots = Array.isArray(existing?.snapshots) ? existing.snapshots : [];
    baseSnapshots.push({
      version: (existing?.version || 0) + 1,
      capturedAt: new Date().toISOString(),
      workspace: snapshot
    });
    const rec = await App.DB.saveDraft({
      id: asCopy ? `draft_${Date.now()}` : (state.activeDraftId || `draft_${Date.now()}`),
      title: meta.title,
      status: meta.status,
      issueDate: meta.issueDate,
      campaignName: meta.campaignName,
      audience: meta.audience,
      owner: meta.owner,
      createdAt: existing?.createdAt || new Date().toISOString(),
      version: (existing?.version || 0) + 1,
      snapshots: baseSnapshots,
      workspace: snapshot
    });
    state.activeDraftId = rec.id;
    state.selectedDraftToLoad = rec.id;
    try {
      await App.ProjectStore?.saveFromWorkspace?.(snapshot, meta, `project_${rec.id}`);
    } catch (e) { /* ignore project store failure */ }
    await I.refreshDrafts();
    I.clearUnsavedChanges();
    showToast(asCopy ? 'Draft copy saved.' : 'Draft saved.');
  }

  async function saveCopy() { await saveDraft({ asCopy: true }); }

  function pickDraftToLoad(id) {
    state.selectedDraftToLoad = id;
  }

  async function loadSelectedDraft() {
    const id = state.selectedDraftToLoad || document.getElementById('draft-select')?.value;
    if (!id) return showToast('Choose a draft first.', true);
    const draft = await App.DB.getDraftById(id);
    if (!draft?.workspace) return showToast('Selected draft has no workspace payload.', true);
    state.activeDraftId = draft.id;
    state.newsletterWorkspace = draft.workspace;
    state.selectedFormat = draft.workspace.format || state.selectedFormat;
    state.currentPreviewLanguage = draft.workspace.currentLanguage || 'en';
    I.applyMetadata({
      title: draft.title,
      issueDate: draft.issueDate,
      status: draft.status,
      campaignName: draft.campaignName,
      audience: draft.audience,
      owner: draft.owner
    });
    I.persistWorkspace();
    I.refreshLanguageControls();
    document.getElementById('preview-panel').classList.add('active');
    I.renderPreviewForLanguage(state.currentPreviewLanguage || 'en');
    await I.refreshDrafts();
    showToast('Draft loaded.');
  }

  async function loadDraftById(id) {
    if (!id) return;
    state.selectedDraftToLoad = id;
    await loadSelectedDraft();
  }

  // ---- project versions ----
  async function saveProjectVersion() {
    if (!state.newsletterWorkspace) return showToast('Generate newsletter first, then save the project.', true);
    await beforeWorkspaceSnapshot();
    const title = I.getProjectTitle();
    const snapshot = buildWorkspaceSnapshot();
    const metadata = { ...I.getMetadata(), title };
    try {
      const project = await App.ProjectStore.saveFromWorkspace(snapshot, metadata, state.activeProjectId);
      state.activeProjectId = project.projectId;
      state.projectSnapshotVersion = null;
      const nav = { ...(App.RouterNav.getHandoff?.() || {}), source: I.currentPageId(), projectId: project.projectId };
      delete nav.projectSnapshotVersion;
      App.RouterNav?.setHandoff?.(nav);
      I.updateProjectChrome(project);
      I.clearUnsavedChanges();
      showToast(`Saved ${title} as version ${project.version || 1}.`);
      if (I.currentPageId() === 'editor') {
        queueMicrotask(() => { refreshEditorProjectVersionOptions().catch(() => {}); });
      }
      return project;
    } catch {
      showToast('Project save failed. Try again.', true);
      return null;
    }
  }

  async function refreshEditorProjectVersionOptions() {
    const row = document.getElementById('editor-version-row');
    const sel = document.getElementById('editor-project-version-select');
    if (!row || !sel || I.currentPageId() !== 'editor') return;
    if (!state.activeProjectId) {
      row.style.display = 'none';
      return;
    }
    row.style.display = 'flex';
    const project = await App.ProjectStore.get(state.activeProjectId);
    if (!project) {
      row.style.display = 'none';
      return;
    }
    sel.innerHTML = '';
    const cur = document.createElement('option');
    cur.value = 'current';
    cur.textContent = `Current saved (v${project.version || 1})`;
    sel.appendChild(cur);
    const snaps = Array.isArray(project.snapshots) ? [...project.snapshots].sort((a, b) => Number(b.version) - Number(a.version)) : [];
    snaps.forEach(s => {
      const opt = document.createElement('option');
      opt.value = String(s.version);
      opt.textContent = `v${s.version} — ${s.capturedAt ? new Date(s.capturedAt).toLocaleString() : ''}`;
      sel.appendChild(opt);
    });
    if (state.projectSnapshotVersion != null) {
      sel.value = String(state.projectSnapshotVersion);
    } else {
      sel.value = 'current';
    }
  }

  async function editorLoadSelectedProjectVersion() {
    const sel = document.getElementById('editor-project-version-select');
    if (!sel || !state.activeProjectId) {
      return showToast('No project linked. Open the editor from Projects or Preview.', true);
    }
    const v = sel.value;
    const snapNum = v === 'current' ? null : Number(v);
    const project = await App.ProjectStore.get(state.activeProjectId);
    if (!project) return showToast('Project not found.', true);
    if (!state.newsletterWorkspace) state.newsletterWorkspace = I.emptyNewsletterWorkspaceShell();
    I.applyIndexedProjectToWorkspace(project, { snapshotVersion: snapNum });
    const prev = App.RouterNav.getHandoff() || {};
    const next = { ...prev, source: I.currentPageId(), projectId: state.activeProjectId };
    if (snapNum != null) next.projectSnapshotVersion = snapNum;
    else delete next.projectSnapshotVersion;
    App.RouterNav.setHandoff(next);
    await refreshEditorProjectVersionOptions();
    showToast(snapNum == null ? 'Loaded latest saved version.' : `Loaded snapshot v${snapNum}.`);
  }

  async function editorRestoreSelectedVersionAsLatest() {
    const sel = document.getElementById('editor-project-version-select');
    if (!sel || !state.activeProjectId) return showToast('No project linked.', true);
    const v = sel.value;
    const snapNum = v === 'current' ? null : Number(v);
    if (snapNum == null) {
      return showToast('Pick a past snapshot (not "Current saved"), then save it as the new latest.', true);
    }
    const project = await App.ProjectStore.get(state.activeProjectId);
    if (!project) return showToast('Project not found.', true);
    if (!state.newsletterWorkspace) state.newsletterWorkspace = I.emptyNewsletterWorkspaceShell();
    I.applyIndexedProjectToWorkspace(project, { snapshotVersion: snapNum });
    await saveProjectVersion();
  }

  App.UIGeneratePipeline = {
    buildAndPreview,
    buildAndPreviewEnglishOnly,
    buildWorkspaceSnapshot,
    beforeWorkspaceSnapshot,
    saveDraft,
    saveCopy,
    pickDraftToLoad,
    loadSelectedDraft,
    loadDraftById,
    saveProjectVersion,
    refreshEditorProjectVersionOptions,
    editorLoadSelectedProjectVersion,
    editorRestoreSelectedVersionAsLatest
  };

  // When the user uses browser-back to return to this page, Edge/Brave/Chrome
  // restore it from bfcache with the previous in-memory state intact. That
  // means state.selectedArticleIndices, state.activeProjectId, and the cached
  // workspace are all carried over from a build that already shipped — the
  // next click of Generate would then build with stale articles and route to
  // the OLD project id, showing the first newsletter again. A full reload
  // gives the cleanest restart: init() re-runs, the article list re-renders
  // with no selection, and the next Generate click is guaranteed fresh. The
  // workspace + selection are persisted to localStorage so nothing valuable
  // is lost on the reload.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) window.location.reload();
  });
})();
