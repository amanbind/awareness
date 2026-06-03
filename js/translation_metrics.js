window.App = window.App || {};

App.TranslationMetrics = (() => {
  'use strict';

  const DIAG_STORAGE_KEY = 'awareness_translation_diag_v1';

  function decodeEntities(text) {
    return String(text || '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  }

  function normalizedVisibleText(html) {
    const withoutTags = decodeEntities(String(html || '').replace(/<[^>]*>/g, ' '));
    return withoutTags
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function hasTranslatableLetters(text) {
    const normalized = String(text || '')
      .replace(/\{\{[^}]+\}\}/g, ' ')
      .replace(/\bhttps?:\/\/[^\s]+/gi, ' ')
      .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, ' ');
    return /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/.test(normalized);
  }

  /** Letter-only core length (a-z) after normalization — used to skip acronym-only noise in coverage ratio. */
  function letterCoreLength(text) {
    return normalizedVisibleText(text).replace(/[^a-z]/g, '').length;
  }

  /**
   * Segments that count toward the coverage denominator: must look like real prose, not 2–3 letter tokens.
   */
  function countsTowardCoverageProgress(text) {
    if (!hasTranslatableLetters(text)) return false;
    return letterCoreLength(text) >= 4;
  }

  function coverageFromResults(results) {
    const safeResults = Array.isArray(results) ? results : [];
    const filtered = safeResults.filter((item) => item && item.attempted && item.translatable && item.countsForCoverage !== false);
    const attempted = filtered.length;
    const succeeded = filtered.filter((item) => item.changed && !item.failed).length;
    const failed = filtered.filter((item) => item.failed).length;
    const unchanged = filtered.filter((item) => !item.failed && !item.changed).length;
    return {
      attempted,
      succeeded,
      failed,
      unchanged,
      ratio: attempted > 0 ? (succeeded / attempted) : 0
    };
  }

  function hasMeaningfulTextChange(sourceHtml, translatedHtml) {
    return normalizedVisibleText(sourceHtml) !== normalizedVisibleText(translatedHtml);
  }

  function escapeRegExp(term) {
    return String(term || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Compare visible text while stripping known glossary-invariant English terms (intentionally preserved).
   */
  function hasMeaningfulTextChangeAllowingLockedTerms(sourceHtml, translatedHtml, lockedTerms = []) {
    let a = normalizedVisibleText(sourceHtml);
    let b = normalizedVisibleText(translatedHtml);
    const terms = Array.isArray(lockedTerms) ? lockedTerms : [];
    terms.forEach((term) => {
      const t = String(term || '').trim();
      if (!t) return;
      const re = new RegExp(`\\b${escapeRegExp(t)}\\b`, 'gi');
      a = a.replace(re, ' ');
      b = b.replace(re, ' ');
    });
    a = a.replace(/\s+/g, ' ').trim();
    b = b.replace(/\s+/g, ' ').trim();
    return a !== b;
  }

  function sanitizeProviderMessage(msg) {
    let s = String(msg || '').slice(0, 280);
    s = s.replace(/\bsk-[a-z0-9-_]{10,}\b/gi, '[redacted]');
    s = s.replace(/\bx-api-key\b/gi, 'api-key');
    return s.trim();
  }

  /**
   * When HTML merges a decorative bullet with prose in one text node (e.g. "›Verify sender"),
   * strip the leading glyph before translation and reattach after — keeps ›/✓ stable across locales.
   */
  function splitDecorativeLead(text) {
    const s = String(text ?? '');
    const m = s.match(/^([\u203A›✓✗✔✖→•·])\s*(.*)$/su);
    if (!m) return { deco: '', rest: s };
    return { deco: m[1], rest: m[2] };
  }

  /**
   * Normalize AI translation for insertion into HTML text nodes or plain fields.
   * When the source segment was a single line, collapse accidental newlines and strip markdown
   * list markers models often add inside list items (breaking layout vs English).
   * When the source had line breaks, preserve paragraph structure but tidy whitespace.
   */
  function normalizeTranslatedTextSegment(translated, sourceReference = '') {
    const out = String(translated ?? '');
    const src = String(sourceReference ?? '');
    if (/[\r\n]/.test(src)) {
      return out
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.replace(/^[-*•]+\s+/u, '').replace(/[ \t]+/g, ' ').trim())
        .filter(Boolean)
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }
    let s = out.trim();
    s = s.replace(/\s*[\r\n]+\s*/g, ' ');
    s = s.replace(/\s{2,}/g, ' ');
    s = s.replace(/^[-*•]+(?:\s+|$)/u, '');
    return s.trim();
  }

  function classifyTranslationFailureKind(message) {
    const m = String(message || '');
    const gate = m.match(/\[gate:([a-z0-9-]+)\]/i);
    if (gate) return gate[1].toLowerCase();
    if (/low translation coverage/i.test(m)) return 'coverage';
    if (/no text segments were translated/i.test(m)) return 'coverage';
    if (/unchanged/i.test(m) && /translation/i.test(m)) return 'docUnchanged';
    if (/qa checks failed|qa failed/i.test(m)) return 'qa';
    if (/\b429\b|rate limit|too many requests/i.test(m)) return 'rateLimit';
    if (/translate failed|http \d{3}|openai translate failed|claude translate failed|translate api error/i.test(m)) return 'provider';
    return 'unknown';
  }

  function persistTranslationDiag(envelope) {
    try {
      const safe = {
        at: envelope?.at || new Date().toISOString(),
        kind: envelope?.kind || envelope?.gate || 'unknown',
        gate: envelope?.gate || envelope?.kind || null,
        languageId: envelope?.languageId || null,
        languageLabel: envelope?.languageLabel || null,
        message: sanitizeProviderMessage(envelope?.message || ''),
        coverage: envelope?.coverage || null,
        lastProviderMessage: sanitizeProviderMessage(envelope?.lastProviderMessage || '')
      };
      sessionStorage.setItem(DIAG_STORAGE_KEY, JSON.stringify(safe));
    } catch (_e) {}
  }

  function formatDiagSummary(envelope) {
    if (!envelope || typeof envelope !== 'object') return '';
    const parts = [];
    if (envelope.languageLabel) parts.push(`Language: ${envelope.languageLabel}`);
    if (envelope.kind || envelope.gate) parts.push(`Gate: ${envelope.kind || envelope.gate}`);
    const c = envelope.coverage;
    if (c && typeof c === 'object' && c.attempted != null) {
      parts.push(`Segments: ${c.succeeded}/${c.attempted} OK (${c.failed} failed, ${c.unchanged} unchanged)`);
    }
    if (envelope.lastProviderMessage) parts.push(`Provider: ${sanitizeProviderMessage(envelope.lastProviderMessage)}`);
    if (envelope.message && parts.length < 4) parts.push(`Detail: ${sanitizeProviderMessage(envelope.message).slice(0, 160)}`);
    return parts.join(' · ');
  }

  return {
    DIAG_STORAGE_KEY,
    decodeEntities,
    normalizedVisibleText,
    hasTranslatableLetters,
    countsTowardCoverageProgress,
    coverageFromResults,
    hasMeaningfulTextChange,
    hasMeaningfulTextChangeAllowingLockedTerms,
    sanitizeProviderMessage,
    classifyTranslationFailureKind,
    persistTranslationDiag,
    formatDiagSummary,
    normalizeTranslatedTextSegment,
    splitDecorativeLead
  };
})();
