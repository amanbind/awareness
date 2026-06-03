(function () {
  'use strict';
  const App = window.App = window.App || {};
  const UI = App.UI;
  if (!UI || !UI._state || !UI._internals) return;
  const Utils = App.Utils || {};
  const showToast = Utils.showToast || (() => {});

  const I = UI._internals;
  const state = UI._state;
  const STORAGE_KEY = I.AI_EXPERIMENT_CONTROL_STORAGE_KEY;
  const clearUnsavedChanges = I.clearUnsavedChanges;

  function normalizeNumberInput(value, min = 0, max = Number.POSITIVE_INFINITY) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function defaultAIExperimentControl() {
    return {
      enabled: false,
      requireOptIn: true,
      requireLabel: true,
      rollbackMode: false,
      roundsCompleted: 0,
      outputsEvaluated: 0,
      brandSafetyPassRate: 0,
      relevancePassRate: 0,
      mttdHours: 0,
      mttmHours: 0,
      taxonomyCoveragePct: 0,
      taxonomyCounts: { hallucination: 0, policy: 0, timeout: 0, formatting: 0 },
      decision: 'pending',
      rationale: '',
      lastRollbackAt: '',
      savedAt: ''
    };
  }

  function getAIExperimentControlFromUI() {
    return {
      enabled: !!document.getElementById('ai-exp-enabled')?.checked,
      requireOptIn: document.getElementById('ai-exp-optin')?.checked !== false,
      requireLabel: document.getElementById('ai-exp-label')?.checked !== false,
      rollbackMode: !!document.getElementById('ai-exp-rollback')?.checked,
      roundsCompleted: normalizeNumberInput(document.getElementById('ai-exp-rounds')?.value, 0),
      outputsEvaluated: normalizeNumberInput(document.getElementById('ai-exp-outputs')?.value, 0),
      brandSafetyPassRate: normalizeNumberInput(document.getElementById('ai-exp-brand-pass')?.value, 0, 100),
      relevancePassRate: normalizeNumberInput(document.getElementById('ai-exp-relevance-pass')?.value, 0, 100),
      mttdHours: normalizeNumberInput(document.getElementById('ai-exp-mttd')?.value, 0),
      mttmHours: normalizeNumberInput(document.getElementById('ai-exp-mttm')?.value, 0),
      taxonomyCoveragePct: normalizeNumberInput(document.getElementById('ai-exp-taxonomy-coverage')?.value, 0, 100),
      taxonomyCounts: {
        hallucination: normalizeNumberInput(document.getElementById('ai-exp-tax-hallucination')?.value, 0),
        policy: normalizeNumberInput(document.getElementById('ai-exp-tax-policy')?.value, 0),
        timeout: normalizeNumberInput(document.getElementById('ai-exp-tax-timeout')?.value, 0),
        formatting: normalizeNumberInput(document.getElementById('ai-exp-tax-formatting')?.value, 0)
      },
      decision: document.getElementById('ai-exp-decision')?.value || 'pending',
      rationale: document.getElementById('ai-exp-rationale')?.value?.trim() || '',
      lastRollbackAt: state.aiExperimentControl?.lastRollbackAt || ''
    };
  }

  function getAIExperimentReadiness(cfg = {}) {
    const roundsOk = (cfg.roundsCompleted || 0) >= 3;
    const qualityOk = (cfg.brandSafetyPassRate || 0) >= 70 && (cfg.relevancePassRate || 0) >= 70;
    const incidentOk = (cfg.mttdHours || 0) <= 24 && (cfg.mttmHours || 0) <= 4 && (cfg.taxonomyCoveragePct || 0) >= 90;
    const decisionOk = cfg.decision && cfg.decision !== 'pending' && !!String(cfg.rationale || '').trim();
    const rollbackReady = cfg.rollbackMode === true || !!cfg.lastRollbackAt;
    const gatesPassed = [roundsOk, qualityOk, incidentOk, decisionOk, rollbackReady].filter(Boolean).length;
    const isReady = roundsOk && qualityOk && incidentOk && decisionOk && rollbackReady;
    return { roundsOk, qualityOk, incidentOk, decisionOk, rollbackReady, gatesPassed, isReady };
  }

  function renderAIExperimentReadiness(cfg = {}) {
    const pill = document.getElementById('ai-exp-readiness-pill');
    const note = document.getElementById('ai-exp-readiness-note');
    if (!pill || !note) return;
    const readiness = getAIExperimentReadiness(cfg);
    pill.classList.remove('good', 'warn', 'danger');
    if (readiness.isReady) {
      pill.classList.add('good');
      pill.textContent = 'Gate D Ready';
      note.textContent = 'Go/no-go evidence complete with rollback coverage.';
      return;
    }
    if (readiness.gatesPassed >= 3) {
      pill.classList.add('warn');
      pill.textContent = `In Progress (${readiness.gatesPassed}/5)`;
      note.textContent = 'Continue experiments until all thresholds pass.';
      return;
    }
    pill.classList.add('danger');
    pill.textContent = `Not Ready (${readiness.gatesPassed}/5)`;
    note.textContent = 'Insufficient evidence for controlled rollout decision.';
  }

  function renderAIRollbackBanner() {
    const el = document.getElementById('ai-rollback-banner');
    if (!el) return;
    let cfg = null;
    try {
      cfg = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (e) {
      cfg = null;
    }
    const active = !!cfg?.rollbackMode;
    el.style.display = active ? 'block' : 'none';
    if (!active) return;
    const rollbackAt = cfg?.lastRollbackAt ? ` Last rollback: ${new Date(cfg.lastRollbackAt).toLocaleString()}.` : '';
    el.textContent = `Stable workflow active: AI experiment rollback mode is enabled, so experimental AI visuals are disabled.${rollbackAt}`;
  }

  function applyAIExperimentControl(cfg = {}) {
    const merged = { ...defaultAIExperimentControl(), ...(cfg || {}) };
    const setValue = (id, value) => {
      const el = document.getElementById(id);
      if (el != null && value != null) el.value = String(value);
    };
    const setCheck = (id, checked) => {
      const el = document.getElementById(id);
      if (el) el.checked = !!checked;
    };
    setCheck('ai-exp-enabled', merged.enabled);
    setCheck('ai-exp-optin', merged.requireOptIn);
    setCheck('ai-exp-label', merged.requireLabel);
    setCheck('ai-exp-rollback', merged.rollbackMode);
    setValue('ai-exp-rounds', merged.roundsCompleted);
    setValue('ai-exp-outputs', merged.outputsEvaluated);
    setValue('ai-exp-brand-pass', merged.brandSafetyPassRate);
    setValue('ai-exp-relevance-pass', merged.relevancePassRate);
    setValue('ai-exp-mttd', merged.mttdHours);
    setValue('ai-exp-mttm', merged.mttmHours);
    setValue('ai-exp-taxonomy-coverage', merged.taxonomyCoveragePct);
    setValue('ai-exp-tax-hallucination', merged.taxonomyCounts?.hallucination || 0);
    setValue('ai-exp-tax-policy', merged.taxonomyCounts?.policy || 0);
    setValue('ai-exp-tax-timeout', merged.taxonomyCounts?.timeout || 0);
    setValue('ai-exp-tax-formatting', merged.taxonomyCounts?.formatting || 0);
    setValue('ai-exp-decision', merged.decision || 'pending');
    setValue('ai-exp-rationale', merged.rationale || '');
    state.aiExperimentControl = merged;
    renderAIExperimentReadiness(merged);
  }

  function saveAIExperimentControl(options = {}) {
    const { silent = false } = options;
    try {
      const cfg = getAIExperimentControlFromUI();
      const payload = { ...cfg, savedAt: new Date().toISOString() };
      state.aiExperimentControl = payload;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      renderAIExperimentReadiness(payload);
      if (typeof clearUnsavedChanges === 'function') clearUnsavedChanges();
      if (!silent) showToast('AI experiment controls saved.');
      return payload;
    } catch (e) {
      if (!silent) showToast('Failed to save AI experiment controls.', true);
      return null;
    }
  }

  function triggerAIRollback() {
    const rollbackEl = document.getElementById('ai-exp-rollback');
    const pilotEl = document.getElementById('ai-exp-enabled');
    const aiEl = document.getElementById('feat-ai');
    if (rollbackEl) rollbackEl.checked = true;
    if (pilotEl) pilotEl.checked = false;
    if (aiEl) aiEl.checked = false;
    const current = getAIExperimentControlFromUI();
    current.rollbackMode = true;
    current.enabled = false;
    current.lastRollbackAt = new Date().toISOString();
    const payload = { ...current, savedAt: new Date().toISOString() };
    state.aiExperimentControl = payload;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    renderAIExperimentReadiness(payload);
    showToast('Rollback enabled. Experimental AI visuals are now disabled.');
  }

  function exportAIExperimentEvidence() {
    const cfg = getAIExperimentControlFromUI();
    const readiness = getAIExperimentReadiness(cfg);
    const taxonomyTotal = Object.values(cfg.taxonomyCounts || {}).reduce((sum, n) => sum + Number(n || 0), 0);
    const md = [
      '# Phase 4 Experiment Evidence Log',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## FR-08 Feasibility Evidence',
      `- Rounds completed: ${cfg.roundsCompleted} (target >= 3)`,
      `- Outputs evaluated: ${cfg.outputsEvaluated}`,
      `- Brand safety pass rate: ${cfg.brandSafetyPassRate}% (target >= 70%)`,
      `- Relevance pass rate: ${cfg.relevancePassRate}% (target >= 70%)`,
      '',
      '## FR-09 Troubleshooting Evidence',
      `- Mean time to detect (hours): ${cfg.mttdHours} (target < 24)`,
      `- Mean time to mitigate (hours): ${cfg.mttmHours} (target < 4)`,
      `- Taxonomy coverage: ${cfg.taxonomyCoveragePct}% (target >= 90%)`,
      `- Incident totals: ${taxonomyTotal}`,
      `  - hallucination: ${cfg.taxonomyCounts?.hallucination || 0}`,
      `  - policy: ${cfg.taxonomyCounts?.policy || 0}`,
      `  - timeout: ${cfg.taxonomyCounts?.timeout || 0}`,
      `  - formatting: ${cfg.taxonomyCounts?.formatting || 0}`,
      '',
      '## Controls',
      `- Pilot enabled: ${cfg.enabled ? 'yes' : 'no'}`,
      `- Explicit opt-in required: ${cfg.requireOptIn ? 'yes' : 'no'}`,
      `- AI-generated label required: ${cfg.requireLabel ? 'yes' : 'no'}`,
      `- Rollback mode active: ${cfg.rollbackMode ? 'yes' : 'no'}`,
      '',
      '## Decision',
      `- Decision: ${cfg.decision}`,
      `- Rationale: ${cfg.rationale || 'n/a'}`,
      '',
      '## Gate D Readiness',
      `- Ready: ${readiness.isReady ? 'yes' : 'no'} (${readiness.gatesPassed}/5 gates)`,
      `- Rounds gate: ${readiness.roundsOk ? 'pass' : 'fail'}`,
      `- Quality gate: ${readiness.qualityOk ? 'pass' : 'fail'}`,
      `- Incident gate: ${readiness.incidentOk ? 'pass' : 'fail'}`,
      `- Decision gate: ${readiness.decisionOk ? 'pass' : 'fail'}`,
      `- Rollback gate: ${readiness.rollbackReady ? 'pass' : 'fail'}`,
      ''
    ].join('\n');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `phase4-ai-evidence-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1500);
    showToast('Phase 4 evidence log exported.');
  }

  App.UIAIExperiment = {
    defaultAIExperimentControl,
    getAIExperimentControlFromUI,
    getAIExperimentReadiness,
    renderAIExperimentReadiness,
    renderAIRollbackBanner,
    applyAIExperimentControl,
    saveAIExperimentControl,
    triggerAIRollback,
    exportAIExperimentEvidence,
    STORAGE_KEY
  };
})();
