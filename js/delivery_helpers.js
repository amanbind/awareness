/* ═══════════════════════════════════════════════════════════
   delivery_helpers.js — Relay payload + preflight for SMTP vs Graph
   ═══════════════════════════════════════════════════════════ */
window.App = window.App || {};

App.DeliveryHelpers = (() => {
  'use strict';

  const METHOD_GRAPH = 'graph';
  const METHOD_SMTP = 'smtp';

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function normalizeMethod(profile) {
    const m = profile && profile.deliveryMethod;
    if (m === METHOD_GRAPH || m === METHOD_SMTP) return m;
    return METHOD_SMTP;
  }

  /**
   * @param {object} profile — saved delivery profile (smtp store shape)
   * @param {{ mode?: 'test'|'send', recipients?: string[], workflowState?: string }} opts
   */
  function collectDiagnostics(profile, opts = {}) {
    const {
      mode = 'send',
      recipients = [],
      workflowState = 'draft'
    } = opts;
    const cfg = profile || {};
    const method = normalizeMethod(cfg);
    const checks = [];
    const addCheck = (ok, label, action) => checks.push({ ok, label, action });

    addCheck(!!(cfg.relayUrl || '').trim(), 'Relay endpoint configured', 'Add relay URL in Configuration.');
    addCheck(!!cfg.fromAddress && isValidEmail(cfg.fromAddress), 'From address is valid', 'Enter a valid sender email.');

    if (method === METHOD_GRAPH) {
      addCheck(!!(cfg.graphTenantId || '').trim(), 'Azure AD Tenant ID configured', 'Enter Directory (tenant) ID.');
      addCheck(!!(cfg.graphClientId || '').trim(), 'Application (client) ID configured', 'Enter the app registration client ID.');
      addCheck(!!(cfg.graphClientSecret || '').trim(), 'Client secret configured', 'Enter the client secret value.');
    } else {
      addCheck(!!(cfg.host || '').trim(), 'SMTP host configured', 'Add SMTP host in Configuration.');
      addCheck(Number(cfg.port) > 0, 'SMTP port configured', 'Use a valid SMTP port (for example 587).');
      addCheck(!cfg.username || !!cfg.password, 'Credentials complete', 'Provide SMTP password for the configured username.');
    }

    if (mode === 'test') {
      addCheck(recipients.length === 1 && isValidEmail(recipients[0]), 'Single test recipient is valid', 'Enter one valid test recipient.');
    } else {
      addCheck(recipients.length > 0, 'At least one recipient provided', 'Add recipient emails in Configuration.');
      addCheck(recipients.every(isValidEmail), 'All recipients are valid', 'Fix invalid recipient addresses.');
      addCheck(workflowState === 'approved' || workflowState === 'sent', 'Workflow is approved for delivery', 'Move workflow to Approved before sending.');
    }

    return checks;
  }

  function buildRelayDeliveryPayload(profile) {
    const cfg = profile || {};
    const method = normalizeMethod(cfg);
    if (method === METHOD_GRAPH) {
      return {
        type: METHOD_GRAPH,
        tenantId: (cfg.graphTenantId || '').trim(),
        clientId: (cfg.graphClientId || '').trim(),
        clientSecret: cfg.graphClientSecret || '',
        sender: (cfg.fromAddress || '').trim(),
        fromName: (cfg.fromName || '').trim()
      };
    }
    return { type: METHOD_SMTP };
  }

  function relayKindLabel(profile) {
    return normalizeMethod(profile) === METHOD_GRAPH ? 'Microsoft Graph' : 'SMTP';
  }

  return {
    METHOD_GRAPH,
    METHOD_SMTP,
    isValidEmail,
    normalizeMethod,
    collectDiagnostics,
    buildRelayDeliveryPayload,
    relayKindLabel
  };
})();
