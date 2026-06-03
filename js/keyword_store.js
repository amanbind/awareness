window.App = window.App || {};

App.KeywordStore = (() => {
  'use strict';

  const KEY = 'awareness_feed_scoring_v2';

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

  function normalize(arr) {
    const seen = new Set();
    return (arr || [])
      .map(v => String(v || '').trim().toLowerCase())
      .filter(v => v && !seen.has(v) && (seen.add(v) || true));
  }

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!parsed) {
        return {
          critical: [...DEFAULT_CRITICAL],
          context: [...DEFAULT_CONTEXT],
          noise: [...DEFAULT_NOISE]
        };
      }
      return {
        critical: normalize(parsed.critical || DEFAULT_CRITICAL),
        context: normalize(parsed.context || DEFAULT_CONTEXT),
        noise: normalize(parsed.noise || DEFAULT_NOISE)
      };
    } catch (_e) {
      return {
        critical: [...DEFAULT_CRITICAL],
        context: [...DEFAULT_CONTEXT],
        noise: [...DEFAULT_NOISE]
      };
    }
  }

  function save(data) {
    const next = {
      critical: normalize(data.critical),
      context: normalize(data.context),
      noise: normalize(data.noise)
    };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }

  function getCriticalKeywords() { return load().critical; }
  function getContextKeywords() { return load().context; }
  function getNoiseKeywords() { return load().noise; }

  function setCriticalKeywords(list) { const d = load(); d.critical = normalize(list); return save(d); }
  function setContextKeywords(list) { const d = load(); d.context = normalize(list); return save(d); }
  function setNoiseKeywords(list) { const d = load(); d.noise = normalize(list); return save(d); }

  function getScoringSnapshot() {
    const d = load();
    return { critical: d.critical, context: d.context, noise: d.noise };
  }

  function addKeyword(listType, keyword) {
    const d = load();
    const key = String(keyword || '').trim().toLowerCase();
    if (!key) return d;
    if (listType !== 'critical' && listType !== 'context' && listType !== 'noise') return d;
    d[listType] = normalize([...(d[listType] || []), key]);
    return save(d);
  }

  function removeKeyword(listType, keyword) {
    const d = load();
    const key = String(keyword || '').trim().toLowerCase();
    if (listType !== 'critical' && listType !== 'context' && listType !== 'noise') return d;
    d[listType] = normalize((d[listType] || []).filter(k => k !== key));
    return save(d);
  }

  function clearKeywords(listType) {
    const d = load();
    if (listType !== 'critical' && listType !== 'context' && listType !== 'noise') return d;
    d[listType] = [];
    return save(d);
  }

  function clearAllKeywords() {
    return save({ critical: [], context: [], noise: [] });
  }

  function suggestKeywords(listType, query, limit = 8) {
    const d = load();
    const key = String(query || '').trim().toLowerCase();
    const list = listType === 'context' ? d.context : listType === 'noise' ? d.noise : d.critical;
    if (!key) return list.slice(0, Math.max(1, limit));
    const starts = [];
    const contains = [];
    list.forEach(item => {
      if (item.startsWith(key)) starts.push(item);
      else if (item.includes(key)) contains.push(item);
    });
    return [...starts, ...contains].slice(0, Math.max(1, limit));
  }

  function resetDefaults() {
    return save({
      critical: [...DEFAULT_CRITICAL],
      context: [...DEFAULT_CONTEXT],
      noise: [...DEFAULT_NOISE]
    });
  }

  return {
    getCriticalKeywords,
    getContextKeywords,
    getNoiseKeywords,
    setCriticalKeywords,
    setContextKeywords,
    setNoiseKeywords,
    getScoringSnapshot,
    addKeyword,
    removeKeyword,
    clearKeywords,
    clearAllKeywords,
    suggestKeywords,
    resetDefaults
  };
})();
