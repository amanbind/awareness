/* ═══════════════════════════════════════════════════════════
   ai/logger.js — universal AI prompt+response logger
   Exposes window.App.AILogger:
     beginBuild({ templateId, sessionId? }) → sessionId
     endBuild()
     log({ name, prompt, response, meta? }) → POST to ENSEMBLE_LOG_URL
     logRaw({ session, name, content, templateId? }) → low-level POST (used by bank-page ensemble to preserve its exact filenames)
     getActiveTemplateId() / getActiveSession() — read current build context
     ENSEMBLE_LOG_URL — the canonical log endpoint (unchanged)

   Build context is module-level. Orchestrators (generate_pipeline, editor
   regen, article curation) call beginBuild before invoking the build, then
   endBuild in a finally block. Every nested AI call routes through here and
   inherits the active templateId automatically — no signature plumbing.

   The server (scripts/ensemble_log_server.mjs) writes the canonical copy
   under ensemble-logs/<session>/<name> exactly as before. When template_id
   is present in the payload, it also mirrors the file into
   templates/<template_id>/ensemble-logs/<session>/<name>.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const ENSEMBLE_LOG_URL = 'http://127.0.0.1:4175/save';
  const SAFE_NAME = /^[A-Za-z0-9._-]{1,80}$/;

  // Hostname guard: the ensemble log server only ever runs on the developer's
  // machine. Skip the POST entirely when the app is served from a non-local
  // origin (production deployments) so we don't make a futile request on
  // every AI build.
  function isLocalhost() {
    try {
      const h = ((typeof window !== 'undefined' && window.location && window.location.hostname) || '').toLowerCase();
      return h === '' || h === '127.0.0.1' || h === 'localhost' || h === '::1';
    } catch (_e) { return false; }
  }

  let _activeTemplateId = null;
  let _activeSession = null;

  function makeSessionId() {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  // Sanitize a template id to fit the server's SAFE_NAME pattern. Caller
  // should pass a known catalog id; we coerce anything weird to 'unknown'
  // rather than dropping it silently.
  function sanitizeTemplateId(id) {
    if (id == null) return null;
    const s = String(id).trim();
    if (!s) return null;
    if (!SAFE_NAME.test(s)) return 'unknown';
    return s;
  }

  function beginBuild(opts) {
    const tplRaw = opts && opts.templateId;
    const sessRaw = opts && opts.sessionId;
    _activeTemplateId = sanitizeTemplateId(tplRaw);
    _activeSession = (sessRaw && SAFE_NAME.test(String(sessRaw))) ? String(sessRaw) : makeSessionId();
    return _activeSession;
  }

  function endBuild() {
    _activeTemplateId = null;
    _activeSession = null;
  }

  function getActiveTemplateId() { return _activeTemplateId; }
  function getActiveSession()    { return _activeSession; }

  function postPayload(payload) {
    if (!isLocalhost()) return; // production: never make the futile POST.
    try {
      const body = JSON.stringify(payload);
      const promise = fetch(ENSEMBLE_LOG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (promise && typeof promise.catch === 'function') promise.catch(() => {});
    } catch (_e) { /* swallow — log server is optional */ }
  }

  // Compose prompt + response into a single text payload for review.
  function composeContent(prompt, response) {
    const promptStr = (prompt == null) ? '' :
      (typeof prompt === 'string' ? prompt : JSON.stringify(prompt, null, 2));
    let responseStr;
    if (response == null) responseStr = '';
    else if (typeof response === 'string') responseStr = response;
    else {
      try { responseStr = JSON.stringify(response, null, 2); }
      catch { responseStr = String(response); }
    }
    return '=== PROMPT ===\n' + promptStr + '\n\n=== RESPONSE ===\n' + responseStr + '\n';
  }

  function log(opts) {
    if (!opts || !opts.name) return;
    if (!_activeSession) return; // no active build — silently skip (call site is unmanaged)
    const safeName = String(opts.name);
    if (!SAFE_NAME.test(safeName)) return;
    const content = composeContent(opts.prompt, opts.response);
    const payload = { session: _activeSession, name: safeName, content };
    if (_activeTemplateId) payload.template_id = _activeTemplateId;
    if (opts.meta && typeof opts.meta === 'object') payload.meta = opts.meta;
    postPayload(payload);
  }

  // Lower-level helper used by bank-page ensemble: it generates its own
  // session at call start (so its 9 parallel calls share one folder with
  // the exact filenames the tests check). This shim lets it keep that
  // pattern while still picking up the active template_id when present.
  function logRaw(opts) {
    if (!opts || !opts.session || !opts.name) return;
    if (!SAFE_NAME.test(String(opts.session)) || !SAFE_NAME.test(String(opts.name))) return;
    const payload = {
      session: String(opts.session),
      name: String(opts.name),
      content: opts.content == null ? '' :
        (typeof opts.content === 'string' ? opts.content : JSON.stringify(opts.content, null, 2))
    };
    const tpl = opts.templateId != null ? sanitizeTemplateId(opts.templateId) : _activeTemplateId;
    if (tpl) payload.template_id = tpl;
    postPayload(payload);
  }

  window.App = window.App || {};
  window.App.AILogger = {
    beginBuild,
    endBuild,
    log,
    logRaw,
    getActiveTemplateId,
    getActiveSession,
    makeSessionId,
    isLocalhost,
    ENSEMBLE_LOG_URL
  };
})();
