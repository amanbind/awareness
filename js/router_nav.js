window.App = window.App || {};

App.RouterNav = (() => {
  'use strict';

  const HANDOFF_KEY = 'awareness_nav_handoff_v1';

  function stripClearProjectContextFields(data) {
    if (!data || data.clearProjectContext !== true) return { ...data };
    const next = { ...data };
    delete next.clearProjectContext;
    delete next.projectId;
    delete next.projectSnapshotVersion;
    delete next.activeDraftId;
    return next;
  }

  function setHandoff(payload = {}) {
    const data = { ...stripClearProjectContextFields({ ...payload }), updatedAt: new Date().toISOString() };
    localStorage.setItem(HANDOFF_KEY, JSON.stringify(data));
    return data;
  }

  function getHandoff() {
    try {
      return JSON.parse(localStorage.getItem(HANDOFF_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function clearHandoff() {
    localStorage.removeItem(HANDOFF_KEY);
  }

  function goto(page, payload = {}) {
    setHandoff(payload);
    window.location.href = page;
  }

  return { HANDOFF_KEY, setHandoff, getHandoff, clearHandoff, goto };
})();
