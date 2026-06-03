/**
 * Feed relevance scoring — methodology aligned with new_tprm/prod (weighted terms + CVE id exclusion).
 * - CRITICAL terms: +5 each (defaults tuned for employee security awareness)
 * - CONTEXT terms: +2 each
 * - NOISE terms: -3 each (defaults tuned to down-rank deep technical / vuln write-ups)
 * - Items whose title+summary match CVE-\d{4}-\d+ are excluded (same as prod fetch()).
 * - Item is included when score >= MIN_SCORE (5, prod-aligned).
 */
window.App = window.App || {};

App.FeedScoring = (() => {
  'use strict';

  const CVE_RE = /CVE-\d{4}-\d+/i;
  const WEIGHT_CRITICAL = 5;
  const WEIGHT_CONTEXT = 2;
  const WEIGHT_NOISE = -3;
  const MIN_SCORE = 5;

  const DEFAULT_CRITICAL = [
    'breach', 'ransomware', 'data leak', 'outage', 'compromise',
    'phishing', 'phish', 'spear phishing', 'smishing', 'vishing', 'quishing',
    'cybercrime', 'cyber crime', 'scam', 'scams', 'fraud', 'social engineering',
    'business email compromise', 'bec ', 'fake email', 'suspicious email',
    'credential theft', 'credential stuffing', 'account takeover', 'identity theft',
    'password', 'password manager', 'multi-factor', 'mfa', '2fa', 'authenticator', 'passkey',
    'security awareness', 'security training', 'insider threat', 'insider risk',
    'deepfake', 'gift card scam', 'tech support scam', 'romance scam', 'pig butcher',
    'malware', 'spyware', 'stolen data', 'dark web', 'whaling', 'impersonation'
  ];

  const DEFAULT_CONTEXT = ['aws', 'azure', 'cloud', 'vendor', 'third party', 'employer', 'workplace', 'remote work'];

  const DEFAULT_NOISE = [
    'tutorial', 'guide', 'how to',
    'cve', 'cwe', 'cvss', 'nvd', 'cpe',
    'vulnerability', 'vulnerabilities', 'exploit', 'exploits', 'exploited',
    'zero-day', 'zero day', '0-day',
    'rce', 'privilege escalation', 'proof of concept', 'poc ',
    'patch tuesday', 'security patch', 'kernel bug', 'buffer overflow',
    'sql injection', 'xss', 'cross-site scripting', 'ssrf', 'csrf',
    'use-after-free', 'integer overflow', 'heap overflow', 'stack overflow',
    'remote code execution', 'disclosure:', 'security advisory', 'vendor advisory',
    'proof-of-concept', 'metasploit', 'fuzzing', 'disassembler', 'decompiler',
    'openssl', 'firmware update', 'microcode', 'speculative execution',
    'side channel', 'rowhammer', 'memory corruption', 'type confusion'
  ];

  function normalizeSnapshot(snapshot) {
    const s = snapshot || {};
    return {
      critical: Array.isArray(s.critical) && s.critical.length ? s.critical : DEFAULT_CRITICAL,
      context: Array.isArray(s.context) && s.context.length ? s.context : DEFAULT_CONTEXT,
      noise: Array.isArray(s.noise) && s.noise.length ? s.noise : DEFAULT_NOISE
    };
  }

  function noiseTermMatches(text, term) {
    const t = String(term || '').trim().toLowerCase();
    if (!t) return false;
    if (t.includes(' ') || t.length >= 5) return text.includes(t);
    if (/[^a-z0-9-]/.test(t)) return text.includes(t);
    try {
      return new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
    } catch {
      return text.includes(t);
    }
  }

  function scoreText(rawText, snapshot = null) {
    const lists = normalizeSnapshot(snapshot);
    const text = String(rawText || '').toLowerCase();
    let s = 0;
    for (const w of lists.critical) {
      if (w && text.includes(w)) s += WEIGHT_CRITICAL;
    }
    for (const w of lists.context) {
      if (w && text.includes(w)) s += WEIGHT_CONTEXT;
    }
    for (const w of lists.noise) {
      if (w && noiseTermMatches(text, w)) s += WEIGHT_NOISE;
    }
    return s;
  }

  function hasCveReference(text) {
    return CVE_RE.test(String(text || ''));
  }

  function shouldIncludeItem(title, description, snapshot = null) {
    const text = `${title || ''} ${description || ''}`;
    if (hasCveReference(text)) return false;
    return scoreText(text, snapshot) >= MIN_SCORE;
  }

  return {
    DEFAULT_CRITICAL,
    DEFAULT_CONTEXT,
    DEFAULT_NOISE,
    MIN_SCORE,
    scoreText,
    hasCveReference,
    shouldIncludeItem,
    normalizeSnapshot
  };
})();
