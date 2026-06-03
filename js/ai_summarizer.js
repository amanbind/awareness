/* ═══════════════════════════════════════════════════════════
   ai_summarizer.js — AI-powered article summarisation
   Enterprise internal awareness tone: concise, professional, org-wide.
   ═══════════════════════════════════════════════════════════ */
window.App = window.App || {};

App.AISummarizer = (() => {
  'use strict';
  const { log, truncate } = App.Utils;

  let config = {
    provider: 'claude',
    claudeKey: '', claudeModel: 'claude-sonnet-4-20250514',
    openaiKey: '', openaiModel: 'gpt-5-mini',
    maxConcurrent: 3, retryAttempts: 2, retryDelayMs: 1500
  };
  const CURATION_MODES = {
    concise: {
      label: 'concise',
      sentenceStyle: 'Exactly 2 short sentences.',
      maxContentChars: 480,
      localSummaryLen: 190,
      summaryMaxChars: 220
    },
    balanced: {
      label: 'balanced',
      sentenceStyle: 'Exactly 2 or 3 short sentences.',
      maxContentChars: 800,
      localSummaryLen: 300,
      summaryMaxChars: 300
    },
    deep: {
      label: 'deep',
      sentenceStyle: 'Exactly 3 or 4 concise sentences.',
      maxContentChars: 1200,
      localSummaryLen: 480,
      summaryMaxChars: 400
    }
  };

  function configure(opts) {
    if (!opts || typeof opts !== 'object') return;
    // Whitelist of accepted config keys. Prevents prototype pollution via
    // __proto__/constructor and rejects accidental forwarding of untrusted
    // bundles into the AI runtime config.
    const ALLOWED = ['provider', 'claudeKey', 'claudeModel', 'openaiKey', 'openaiModel', 'maxConcurrent', 'retryAttempts', 'retryDelayMs'];
    for (const k of ALLOWED) {
      if (Object.prototype.hasOwnProperty.call(opts, k)) config[k] = opts[k];
    }
  }
  function getConfig() { return { ...config }; }


  // Prompt constants extracted to js/ai/prompts.js. window.AIPrompts is
  // populated by that sibling, which must load before this file.
  const { EMPLOYEE_VOICE_BLOCK, STYLE_BLOCK, ANTI_GENERIC_BLOCK, SYSTEM_ARTICLE_CORE,
          SYSTEM_ARTICLE_WATCHOUTS, SYSTEM_PROMPT } = (window.AIPrompts || {});
  // Fallback if an older prompts.js is loaded (no ANTI_GENERIC_BLOCK exported).
  // Keeps every template safe even mid-rollout.
  const _AG = ANTI_GENERIC_BLOCK || 'ANTI-GENERIC: every line must name a concrete behaviour, signal, or action from the Stories JSON. No "review/monitor/stay/be/limit/maintain/ensure/always/remember" openings unless paired with a concrete object. SWAP TEST: line must not also apply to an unrelated threat.';

  // Local-fallback content engine extracted to js/ai/local_fallbacks.js.
  // window.AILocalFallbacks is populated by that sibling, which must load
  // before this file. Same destructure pattern as AIPrompts above so all
  // existing call sites within this IIFE keep working unchanged.
  const {
    isSoftwareSupplyChainStory,
    editionHasSupplyChain,
    defaultTipsForType,
    generateTips,
    estimateLevel,
    tryRepairMojibakeUtf8
  } = (window.AILocalFallbacks || {});


  function shouldUseOpenAIJsonMode(systemPrompt, userPrompt) {
    const blob = `${systemPrompt}\n${userPrompt}`;
    return /\bReturn ONLY valid JSON\b/i.test(blob) || /\bReturn ONLY a single JSON\b/i.test(blob) || /\bOutput: JSON only\b/i.test(blob);
  }

  function openAIChatCompletionsBody(systemPrompt, userPrompt, maxTokens, temperature) {
    const body = {
      model: config.openaiModel,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    };
    if (shouldUseOpenAIJsonMode(systemPrompt, userPrompt)) {
      body.response_format = { type: 'json_object' };
    }
    return body;
  }

  // ── API calls ──
  async function callClaude(prompt, systemPrompt = SYSTEM_PROMPT) {
    if (!config.claudeKey) throw new Error('No API key');
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'x-api-key': config.claudeKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: config.claudeModel,
        max_tokens: 450,
        temperature: 0.15,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const d = await resp.json();
    return d.content?.[0]?.text || '';
  }

  async function callOpenAI(prompt, systemPrompt = SYSTEM_PROMPT) {
    if (!config.openaiKey) throw new Error('No API key');
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.openaiKey}` },
      body: JSON.stringify(openAIChatCompletionsBody(systemPrompt, prompt, 450, 0.08))
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const d = await resp.json();
    return d.choices?.[0]?.message?.content || '';
  }

  // ── Local summariser with SIMPLE, employee-friendly language ──
  function localSummarize(article, mode = 'balanced') {
    const modeCfg = CURATION_MODES[mode] || CURATION_MODES.balanced;
    const text = article.description || article.title;
    const sentences = text.replace(/([.!?])\s+/g, '$1|').split('|').map(s => s.trim()).filter(s => s.length > 15);

    let s1 = sentences[0] || article.title;
    let s2 = sentences.length > 1
      ? sentences.slice(1).sort((a, b) => b.length - a.length)[0]
      : 'See the actions below if this type of incident could affect your work.';
    if (!s1.endsWith('.')) s1 += '.';
    if (!s2.endsWith('.')) s2 += '.';
    const cap = Math.min(modeCfg.localSummaryLen, modeCfg.summaryMaxChars || modeCfg.localSummaryLen);
    const draft = `${s1} ${s2}`;
    const summary = finalizeEmployeeSummary(draft, modeCfg) || truncate(sanitizeSummaryProse(draft), cap);

    return {
      summary,
      watchouts: generateTips(article),
      threatLevel: estimateLevel(article),
      category: article.type,
      confidence: 0.5
    };
  }

  /** Text used to match local tips and relevance (title + body + optional summary). */
  // corpusForTips, SUPPLY_CHAIN_CORPUS_MARKERS, isSoftwareSupplyChainStory,
  // editionHasSupplyChain, SOFTWARE_SUPPLY_CHAIN_WATCHOUT_TIPS, defaultTipsForType,
  // generateTips, estimateLevel, tryRepairMojibakeUtf8 all extracted to
  // js/ai/local_fallbacks.js (window.AILocalFallbacks). Destructured at top
  // of this IIFE so existing call sites keep working unchanged.

  function scrubTipSurface(s) {
    return tryRepairMojibakeUtf8(String(s || '').trim())
      .replace(/[`]+/g, '')
      .replace(/!+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Per-article tips (What you should do) — short imperative lines. */
  const WATCHOUT_MAX_CHARS = 60;
  const WATCHOUT_MAX_WORDS = 10;
  /** Key takeaways strip — very short employee actions. */
  const EDITION_TAKEAWAY_MAX_CHARS = 48;
  const EDITION_TAKEAWAY_MAX_WORDS = 8;
  const EDITION_TAKEAWAY_MIN_CHARS = 10;

  /** Dedupe / overlap checks for tips and edition lines. */
  function normalizeTipDedupeKey(s) {
    return scrubTipSurface(s).toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ').trim();
  }

  // eslint-disable-next-line security/detect-unsafe-regex -- reviewed: flat literal-phrase alternation with no nested quantifiers; linear-time, not ReDoS-prone.
  const UNSAFE_TIP_PATTERNS = /click\s+here|click\s+this|tap\s+here|tap\s+this|act\s+now|limited\s+time|verify\s+your\s+account|account\s+suspended|congratulations|you'?ve\s+won|wire\s+funds|send\s+bitcoin|pay\s+with\s+gift\s+cards?\s+over|bitcoin\s+atm|western\s+union|moneygram|reset\s+your\s+password\s+here|login\s+here|sign\s+in\s+here|\burgent!\b|\bURGENT\b|â€|âš|âœ/i;

  function softClampWords(s, maxWords) {
    const words = String(s || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    if (words.length <= maxWords) return words.join(' ');
    return words.slice(0, maxWords).join(' ');
  }

  /** Trim words then hard char cap (no mid-word cut unless unavoidable). */
  function finalizeShortLine(s, maxChars, maxWords) {
    const t = softClampWords(scrubTipSurface(s), maxWords);
    return clampStr(t, maxChars);
  }

  function isCalmEmployeeTip(t, maxLen, minLen = 8) {
    const u = String(t || '').trim();
    if (u.length < minLen || u.length > maxLen) return false;
    if (/\bhttps?:\/\//i.test(u)) return false;
    if (UNSAFE_TIP_PATTERNS.test(u)) return false;
    return true;
  }

  function sanitizeEmployeeTip(s, maxLen = 120) {
    const u = scrubTipSurface(s);
    if (!isCalmEmployeeTip(u, maxLen)) return '';
    return u.length <= maxLen ? u : `${u.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
  }

  /** Key takeaway line: imperative, employee-level, strict length. */
  function sanitizeTakeawayLine(s) {
    const t = finalizeShortLine(s, EDITION_TAKEAWAY_MAX_CHARS, EDITION_TAKEAWAY_MAX_WORDS);
    if (!isCalmEmployeeTip(t, EDITION_TAKEAWAY_MAX_CHARS, EDITION_TAKEAWAY_MIN_CHARS)) return '';
    return t;
  }

  function sanitizeWatchoutLine(s) {
    const t = finalizeShortLine(s, WATCHOUT_MAX_CHARS, WATCHOUT_MAX_WORDS);
    if (!isCalmEmployeeTip(t, WATCHOUT_MAX_CHARS)) return '';
    return t;
  }

  /** Generic account-hygiene lines that misread npm / CI / supply-chain stories. */
  function isGenericConsumerPasswordMfaWatchoutMisaligned(line, article) {
    if (!isSoftwareSupplyChainStory(article)) return false;
    const u = scrubTipSurface(line).toLowerCase();
    if (!u) return false;
    if (/\bdifferent password|\bfor each account\b|\beach account\b|\bunique passwords?\b.*\b(account|everywhere)\b/i.test(u)) return true;
    if (/two-step|two step|\bmfa\b.*everywhere|turn on mfa everywhere|enable mfa everywhere|mfa on every/i.test(u)) return true;
    if (/change (your )?password(s)? if.*breach|breach.*change (your )?password/i.test(u)) return true;
    if (/\bturn on two-step\b|\bturn on mfa\b(?!\s+where)/i.test(u) && /everywhere|all accounts|each account/i.test(u)) return true;
    return false;
  }

  /** Edition takeaway lines that dilute a supply-chain–heavy send. */
  function takeawayMisalignedWithSupplyEdition(line, articles) {
    if (!editionHasSupplyChain(articles)) return false;
    const u = scrubTipSurface(line).toLowerCase();
    if (!u) return false;
    if (/\battachment|unexpected.*link|avoid unexpected attachments/i.test(u)) return true;
    if (/\bdifferent password|each account|two-step|two step|\bmfa\b.*everywhere|unique passwords everywhere|strong unique passwords/i.test(u)) return true;
    return false;
  }

  /** Longer imperative lines for newsletter template blocks (Do/Don't, spotlight defence rows). */
  const SLOT_MAX_CHARS = 118;
  const SLOT_MAX_WORDS = 16;

  function sanitizeTemplateSlotLine(s) {
    const t = finalizeShortLine(s, SLOT_MAX_CHARS, SLOT_MAX_WORDS);
    if (!isCalmEmployeeTip(t, SLOT_MAX_CHARS, 6)) return '';
    return t;
  }

  function dedupeTemplateLines(lines) {
    const out = [];
    const seen = new Set();
    for (const raw of lines) {
      const t = typeof raw === 'string' ? sanitizeTemplateSlotLine(raw) : sanitizeTemplateSlotLine(String(raw || ''));
      if (!t) continue;
      const k = normalizeTipDedupeKey(t);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
    return out;
  }

  const DEFAULT_DODONT_DOS = [
    "Check the sender's full email address before you reply",
    'Hover over links to see the real destination URL',
    'Use unique passwords with your approved password tool',
    'Turn on MFA everywhere your org allows it',
    'Report suspicious messages through your IT security channel',
    'Call the person to verify unusual payment or access requests'
  ];

  const DEFAULT_DODONT_DONTS = [
    'Click links in unexpected emails or text messages',
    'Share passwords, MFA codes, or recovery codes with anyone',
    'Open attachments you were not expecting from that sender',
    'Trust caller ID or chat display names alone for sensitive asks',
    'Rush when someone creates urgency—pause and verify first',
    'Reuse the same password across work and personal accounts'
  ];

  const SPOTLIGHT_DEFENCE_DEFAULTS = [
    "Check the sender's full email address",
    'Hover over links before you click',
    'Call to verify unusual payment or access requests',
    'Report suspicious messages to IT using the posted process',
    'Use MFA on accounts that support it',
    'Never share passwords or one-time codes by email or chat'
  ];

  const SPOTLIGHT_TACTICS_DEFAULT = [
    { icon: '🎭', tactic: 'They impersonate someone you trust', detail: 'Boss, IT, bank, or vendor — sometimes with logos copied from real brands.' },
    { icon: '⏰', tactic: 'They create urgency and fear', detail: 'Pressure to act before you can check facts or ask IT for guidance.' },
    { icon: '🔗', tactic: 'They hide dangerous links in normal-looking text', detail: 'Displayed text may not match the real web address underneath.' },
    { icon: '🤖', tactic: 'They use polished wording or AI-assisted copy', detail: 'Good grammar alone does not prove a message is legitimate.' }
  ];

  function mergedArticleForEditionTips(articles = []) {
    const list = (Array.isArray(articles) ? articles : []).filter(a => a && (a.title || a.description)).slice(0, 6);
    if (!list.length) return { title: 'Security', description: '', type: 'Security News' };
    return {
      title: list.map(a => a.title).join(' · '),
      description: list.map(a => [a.title, a.summary || '', a.description || ''].filter(Boolean).join('\n')).join('\n\n'),
      type: list[0].type || 'Security News'
    };
  }

  function localDoLinesFromArticles(articles = []) {
    const list = (Array.isArray(articles) ? articles : []).filter(a => a && (a.title || a.description));
    const merged = mergedArticleForEditionTips(list);
    const out = [];
    for (const a of list) {
      for (const w of a.watchouts || []) {
        const t = sanitizeWatchoutLine(w);
        if (t) out.push(t);
      }
    }
    for (const t of generateTips(merged)) {
      const u = sanitizeWatchoutLine(t) || sanitizeTemplateSlotLine(t);
      if (u) out.push(u);
    }
    let deduped = dedupeTemplateLines(out);
    for (const fill of DEFAULT_DODONT_DOS) {
      if (deduped.length >= 6) break;
      deduped = dedupeTemplateLines([...deduped, fill]);
    }
    return deduped.slice(0, 6);
  }

  function localDontLinesFromArticles(articles = []) {
    const list = (Array.isArray(articles) ? articles : []).filter(a => a && (a.title || a.description));
    const t = combinedCorpusForSlots(list);
    const candidates = [];

    const RULES = [
      {
        match: ['supply chain', 'supply-chain', 'npm', 'pypi', 'rubygems', 'package.json', 'malicious package', 'lockfile', 'github actions', 'github action', 'ci/cd', 'build pipeline', 'registry token', 'npm token', 'postinstall', 'sbom'],
        lines: [
          'Approve dependency or CI changes without peer or security review',
          'Paste repo, registry, or cloud tokens into chat, email, or public tickets',
          'Run install scripts from unfamiliar packages on build or dev machines',
          'Skip comparing lockfiles or hashes before promoting to production',
          'Store long-lived CI secrets in plaintext config outside the vault',
          'Download internal packages from unofficial mirrors or random URLs'
        ]
      },
      {
        match: ['phish', 'spear', 'credential harvesting', 'fake login', 'spoofed sender'],
        lines: [
          'Click login or reset links from email or SMS you did not expect',
          'Send MFA codes or passwords to someone who contacted you first',
          'Trust display names or logos as proof of who really sent the message',
          'Open compressed attachments claiming to be invoices or HR forms',
          'Reply to BEC-style threads without confirming on a known number',
          'Use links in password-reset mail without checking the real domain'
        ]
      },
      {
        match: ['smish', 'sms', 'text message', 'fake delivery'],
        lines: [
          'Tap shortened links in surprise delivery or bank texts',
          'Call phone numbers only shown inside a suspicious SMS thread',
          'Install apps from texts that promise refunds or package tracking',
          'Share one-time codes after an unexpected text about your account',
          'Assume a text is genuine because it uses your first name',
          'Forward smishing screenshots without reporting them to IT first'
        ]
      },
      {
        match: ['ransomware', 'malware', 'trojan', 'macro'],
        lines: [
          'Enable macros on documents you did not ask someone to send',
          'Plug unknown USB drives into work laptops or kiosks',
          'Disable endpoint alerts because they feel inconvenient',
          'Run cracked or unlicensed software from unofficial download sites',
          'Ignore sudden file renames or ransom notes on shared drives',
          'Delay reporting possible infection to avoid a short disruption'
        ]
      },
      {
        match: ['breach', 'leak', 'exposed database', 'customer data'],
        lines: [
          'Reuse the same password on breached services and internal tools',
          'Ignore breach notifications because nothing looks wrong yet',
          'Share breach screenshots with personal contacts before IT clears it',
          'Assume vendor breach notices do not apply to integrations you use',
          'Delay rotating API keys that pointed at the affected vendor',
          'Post internal incident details on public social channels'
        ]
      },
      {
        match: ['deepfake', 'voice clone', 'synthetic media'],
        lines: [
          'Wire funds based only on a voice that sounds like leadership',
          'Skip callback verification because the video call looked authentic',
          'Share confidential data in real time with unvetted new contacts',
          'Disable recording policies solely to speed up a rushed request',
          'Trust urgent executive asks that bypass normal finance controls',
          'Assume video quality proves identity without a second factor'
        ]
      }
    ];

    for (const r of RULES) {
      if (r.match.some(k => t.includes(k))) {
        for (const line of r.lines) candidates.push(line);
      }
    }

    const merged = mergedArticleForEditionTips(list);
    const typ = String(merged.type || '').toLowerCase();
    if (!candidates.length) {
      if (typ.includes('phish')) RULES[1].lines.forEach(l => candidates.push(l));
      else if (typ.includes('smish')) RULES[2].lines.forEach(l => candidates.push(l));
      else if (typ.includes('malware') || typ.includes('ransom')) RULES[3].lines.forEach(l => candidates.push(l));
      else if (typ.includes('breach') || typ.includes('data')) RULES[4].lines.forEach(l => candidates.push(l));
      else DEFAULT_DODONT_DONTS.forEach(l => candidates.push(l));
    }

    let deduped = dedupeTemplateLines(candidates);
    if (deduped.length < 6) deduped = dedupeTemplateLines([...deduped, ...DEFAULT_DODONT_DONTS]);
    while (deduped.length < 6) {
      deduped = dedupeTemplateLines([...deduped, ...DEFAULT_DODONT_DONTS]);
      if (deduped.length >= 6) break;
    }
    return deduped.slice(0, 6);
  }

  function combinedCorpusForSlots(list) {
    return list.map(a => `${a.title || ''} ${a.summary || ''} ${a.description || ''} ${a.type || ''}`).join(' ').toLowerCase();
  }

  function localSpotlightTacticsFromArticles(articles = []) {
    const list = (Array.isArray(articles) ? articles : []).filter(a => a && (a.title || a.description)).slice(0, 6);
    const icons = ['📰', '⏱', '🔗', '🛰', '📦', '☁️'];
    const tactics = [];
    let i = 0;
    for (const a of list) {
      if (tactics.length >= 4) break;
      const summ = sanitizeSummaryProse((a.summary || a.description || '').replace(/\s+/g, ' ').trim());
      const detail = clampStr(summ, 140) || 'Review the summary with IT if the risk could affect your role.';
      const typeLbl = String(a.type || 'Threat').trim();
      const tactic = sanitizeTemplateSlotLine(`${typeLbl}: ${clampStr(a.title || 'Incident', 72)}`) || sanitizeTemplateSlotLine(clampStr(a.title || 'Incident', 90));
      if (!tactic) continue;
      tactics.push({ icon: icons[i % icons.length], tactic, detail });
      i++;
    }
    while (tactics.length < 4) {
      const d = SPOTLIGHT_TACTICS_DEFAULT[tactics.length];
      tactics.push({ icon: d.icon, tactic: d.tactic, detail: d.detail });
    }
    return tactics.slice(0, 4);
  }

  function localSpotlightDefenceFromArticles(articles = []) {
    const list = (Array.isArray(articles) ? articles : []).filter(a => a && (a.title || a.description));
    const out = [];
    for (const a of list) {
      for (const w of a.watchouts || []) {
        const u = sanitizeTemplateSlotLine(w) || sanitizeWatchoutLine(w);
        if (u) out.push(u);
      }
    }
    const take = localNewsletterTakeaways(list);
    const merged = dedupeTemplateLines([...out, ...take]);
    if (merged.length >= 6) return merged.slice(0, 6);
    return dedupeTemplateLines([...merged, ...SPOTLIGHT_DEFENCE_DEFAULTS]).slice(0, 6);
  }

  const TEMPLATE_SLOTS_SYSTEM = `${EMPLOYEE_VOICE_BLOCK}

You are a senior security-comms writer producing slot copy for an internal newsletter builder. ${STYLE_BLOCK}

${_AG}

Output: JSON only, exactly the keys requested in the user message. Each string must be defensible from the provided Stories JSON—no invented incidents, no URLs, no scam tone, no exclamation marks, no filler phrases ("it is important to note", "remember that", "in today's world"). Prefer concrete nouns from the articles over generic security platitudes.`;

  const BANKPAGE_SLOTS_SYSTEM = `${EMPLOYEE_VOICE_BLOCK}

You are filling four sections of an internal security-awareness newsletter for all staff. The threat topic of this edition is determined entirely by the articles in the user message — it may be phishing, ransomware, supply-chain compromise, data breach, smishing, scams, vulnerabilities, insider risk, etc. Do not assume any topic; let the articles dictate the focus.

CRITICAL: Every article in this edition MUST cover exactly the same threat type. Before finalising selection, check: do all selected articles describe the same category of threat? If not, remove the articles that don't match the majority theme. Never include romance scams and data breaches in the same edition. Never include phishing and physical security in the same edition. One edition = one threat.

Do not select vendor product announcements, press releases, or articles about what security companies are doing. Every selected article must describe either a threat employees could encounter, or an action employees can take to protect themselves. If an article is primarily about a product update, a company launch, or a vendor capability — reject it regardless of topic relevance.

Ground every line in those articles — never invent facts, vendors, victims, statistics, CVEs, or details not present there. Paraphrase what the attackers in the articles are actually doing, then translate that into practical guidance for non-technical readers.

${STYLE_BLOCK}

Output: a single JSON object with exactly these keys (no markdown fences, no extra keys, no nulls):
{
  "intro": "string — see SECTION 1 in user message",
  "section1Bullets": ["...", "...", "...", "..."],
  "section2Bullets": ["...", "...", "..."],
  "section3Bullets": ["...", "...", "..."]
}`;

  function templateSlotsCompactStories(articles = [], mode = 'balanced') {
    const modeCfg = CURATION_MODES[mode] || CURATION_MODES.balanced;
    return (Array.isArray(articles) ? articles : []).slice(0, 8).map(a => ({
      title: a.title,
      type: a.type,
      summary: truncate(a.summary || a.description || '', modeCfg.maxContentChars)
    }));
  }

  // buildBankPageUserPrompt + the 8 section-specific bank-page builders +
  // bankPageCompactArticles live in js/ai/prompt_builders.js
  // (App.AIPromptBuilders). Exposed back through _internals via live getters
  // so bank_page_ensemble.js destructure keeps working.

  // ─────────────────────────────────────────────────────────────────────────
  // Ensemble bank-page prompts: 4 focused per-section prompts that fire in
  // parallel with the combined call above. Each one carries the same article
  // context but only asks for ONE section. Outputs are scored and merged
  // per-section so the best version of each section wins.
  // ─────────────────────────────────────────────────────────────────────────

  const BANKPAGE_SHARED_STYLE_MINI = `STYLE (mandatory):
- Calm, factual, present tense where natural. No marketing voice, no rhetorical questions, no exclamation marks.
- Never use the word "credentials" — say "login details" or "username and password".
- Never use jargon like "threat actors", "adversaries", "TTPs", "bad actors". Use "attackers", "scammers", "criminals", "fraudsters".
- No filler phrases ("it is important to note", "in today's world", "staying vigilant", "be mindful", "in conclusion").
- No URLs, no scam-style urgency.

GROUNDING: every sentence must be supported by the articles in the user message. Never invent facts, vendors, victims, statistics, or CVEs.`;

  const BANKPAGE_INTRO_SYSTEM = `${EMPLOYEE_VOICE_BLOCK}

You write a single intro paragraph for an internal security-awareness newsletter for all staff. The threat topic is whatever the articles in the user message describe.

${BANKPAGE_SHARED_STYLE_MINI}

Output: JSON only, exactly { "intro": "string" } — no markdown, no extra keys.`;

  const BANKPAGE_SECTION1_SYSTEM = `${EMPLOYEE_VOICE_BLOCK}

You write four bullets under "How to spot a fraudulent message" for an internal security-awareness newsletter. Each bullet is a concrete signal a reader could notice in their own inbox, browser, phone, dev environment, or workflow — drawn directly from what the articles describe.

${BANKPAGE_SHARED_STYLE_MINI}

Output: JSON only, exactly { "section1Bullets": ["...","...","...","..."] } — no markdown, no extra keys.`;

  const BANKPAGE_SECTION2_SYSTEM = `${EMPLOYEE_VOICE_BLOCK}

You write three bullets under "What you should remember" for an internal security-awareness newsletter. Each is a high-leverage lesson drawn from the articles taken together. Plain language.

${BANKPAGE_SHARED_STYLE_MINI}

Output: JSON only, exactly { "section2Bullets": ["...","...","..."] } — no markdown, no extra keys.`;

  const BANKPAGE_SECTION3_SYSTEM = `${EMPLOYEE_VOICE_BLOCK}

You write three bullets under "Stay safe" for an internal security-awareness newsletter. Each bullet is a direct, immediate action a reader can take today, tied to the threats in the articles. Each must reference something specific from the articles — not generic "be vigilant" advice.

${BANKPAGE_SHARED_STYLE_MINI}

Output: JSON only, exactly { "section3Bullets": ["...","...","..."] } — no markdown, no extra keys.`;

  // bankPageCompactArticles + buildBankPageIntro/Section1/Section2/Section3
  // builders live in js/ai/prompt_builders.js (App.AIPromptBuilders).

  // ─────────────────────────────────────────────────────────────────────────
  // Inspection-only ensemble prompts. These fire alongside the visible
  // ensemble calls and write raw responses to ensemble-logs/<session>/*.txt
  // for offline review. They are NEVER rendered into the newsletter — they
  // exist purely so you can read different angles on disk and decide later.
  // ─────────────────────────────────────────────────────────────────────────

  const BANKPAGE_IMPACT_ORG_SYSTEM = `${EMPLOYEE_VOICE_BLOCK}

You write three bullets under "Impact on our organisation" for an internal security-awareness newsletter. Each bullet is a concrete way this edition's threats could affect the company's people, data, workflows, or operations — drawn from what the articles describe.

${BANKPAGE_SHARED_STYLE_MINI}

Output: JSON only, exactly { "bullets": ["...","...","..."] } — no markdown, no extra keys.`;

  const BANKPAGE_NEXT_STEPS_SYSTEM = `${EMPLOYEE_VOICE_BLOCK}

You write three bullets under "Next Steps (If Affected)" for an internal security-awareness newsletter. Treat the reader as potentially affected. Each bullet is a direct action they can take right now if they think they've been hit by what these articles describe.

${BANKPAGE_SHARED_STYLE_MINI}

Output: JSON only, exactly { "bullets": ["...","...","..."] } — no markdown, no extra keys.`;

  const BANKPAGE_IMPACT_GENERAL_SYSTEM = `${EMPLOYEE_VOICE_BLOCK}

You write three bullets under "Impact in general" for an internal security-awareness newsletter. Each bullet describes broader industry, sector, or societal impact of the threats these articles describe — not specific to one company.

${BANKPAGE_SHARED_STYLE_MINI}

Output: JSON only, exactly { "bullets": ["...","...","..."] } — no markdown, no extra keys.`;

  const BANKPAGE_REMEMBER_SYSTEM = `${EMPLOYEE_VOICE_BLOCK}

You write three bullets under "What you should remember" for an internal security-awareness newsletter. Each is a high-leverage lesson drawn from the articles taken together. Plain language. Be fresh — these are the things readers should still recall a week from now.

${BANKPAGE_SHARED_STYLE_MINI}

Output: JSON only, exactly { "bullets": ["...","...","..."] } — no markdown, no extra keys.`;

  // buildBankPageImpactOrg / NextSteps / ImpactGeneral / Remember builders
  // live in js/ai/prompt_builders.js (App.AIPromptBuilders).

  /** Request 1 of 2 for Do/Don't template (dos column only). */
  function buildTemplateSlotsUserPromptDosOnly(articles = [], mode = 'balanced') {
    const modeCfg = CURATION_MODES[mode] || CURATION_MODES.balanced;
    const compact = templateSlotsCompactStories(articles, mode);
    return `Template: Do vs Don't — **Dos column only** (request 1 of 2).

Return ONLY valid JSON (no markdown) with this single key:
- "dos": array of exactly 6 strings. Safe behaviors staff should follow, each explicitly tied to a risk or channel visible in the stories (headlines, types, summaries)—not generic security slogans.

Rules for each string: imperative mood, max ${SLOT_MAX_WORDS} words, max ${SLOT_MAX_CHARS} characters including spaces, no URLs, no emoji.
Before returning: ensure each line could only apply to this edition's topics (swap-in test: if a line would still make sense for unrelated news, rewrite it).

Mode: ${modeCfg.label}

Stories (JSON):
${JSON.stringify(compact)}`;
  }

  /** Request 2 of 2 for Do/Don't template (donts column only). */
  function buildTemplateSlotsUserPromptDontsOnly(articles = [], mode = 'balanced') {
    const modeCfg = CURATION_MODES[mode] || CURATION_MODES.balanced;
    const compact = templateSlotsCompactStories(articles, mode);
    return `Template: Do vs Don't — **Don'ts column only** (request 2 of 2).

Return ONLY valid JSON (no markdown) with this single key:
- "donts": array of exactly 6 strings. Risky or wrong behaviors to avoid, phrased as short wrong actions (e.g. "Click unexpected reset links") — not prefixed with "Don't". Each line must match a concrete mistake suggested by these stories—not interchangeable generic lines.

Rules for each string: imperative mood, max ${SLOT_MAX_WORDS} words, max ${SLOT_MAX_CHARS} characters including spaces, no URLs, no emoji.
Before returning: each line should fail the "any week" test — it must reflect a mistake someone could make in the specific threats described.

Mode: ${modeCfg.label}

Stories (JSON):
${JSON.stringify(compact)}`;
  }

  function buildTemplateSlotsUserPromptDoDont(articles = [], mode = 'balanced') {
    return `${buildTemplateSlotsUserPromptDosOnly(articles, mode)}\n\n---\n\n${buildTemplateSlotsUserPromptDontsOnly(articles, mode)}`;
  }

  /** Request 1 of 2 for spotlight template (tactics grid only). */
  function buildTemplateSlotsUserPromptTacticsOnly(articles = [], mode = 'balanced') {
    const modeCfg = CURATION_MODES[mode] || CURATION_MODES.balanced;
    const compact = templateSlotsCompactStories(articles, mode);
    return `Template: Threat spotlight — **tactics grid only** (request 1 of 2).

Return ONLY valid JSON (no markdown) with this single key:
- "tactics": array of exactly 4 objects, each: "icon" (single emoji), "tactic" (short headline, max 72 chars), "detail" (one sentence, max 140 chars). Each object must reflect a tactic or theme from the stories below—not filler rows. "detail" must restate something specific from the matching story summary where possible.

Mode: ${modeCfg.label}

Stories (JSON):
${JSON.stringify(compact)}`;
  }

  /** Request 2 of 2 for spotlight template (defence checklist only). */
  function buildTemplateSlotsUserPromptDefenceOnly(articles = [], mode = 'balanced') {
    const modeCfg = CURATION_MODES[mode] || CURATION_MODES.balanced;
    const compact = templateSlotsCompactStories(articles, mode);
    return `Template: Threat spotlight — **defence checklist only** (request 2 of 2).

Return ONLY valid JSON (no markdown) with this single key:
- "defenceLines": array of exactly 6 short imperative defence actions for staff, max ${SLOT_MAX_WORDS} words and ${SLOT_MAX_CHARS} chars each, no URLs, no filler. Each line must map to a risk theme in the stories—not generic advice that could apply to any edition. Prefer one actionable clause per line.

Mode: ${modeCfg.label}

Stories (JSON):
${JSON.stringify(compact)}`;
  }

  function buildTemplateSlotsUserPromptSpotlight(articles = [], mode = 'balanced') {
    return `${buildTemplateSlotsUserPromptTacticsOnly(articles, mode)}\n\n---\n\n${buildTemplateSlotsUserPromptDefenceOnly(articles, mode)}`;
  }

  /** Read-only: prompts used when AI fills Do/Don't and spotlight slots. */
  function previewNewsletterTemplateSlotsPrompts(formatId, articles = [], options = {}) {
    const mode = options.mode || 'balanced';
    if (formatId === 'dodont') {
      return {
        systemPrompt: TEMPLATE_SLOTS_SYSTEM,
        userPrompt: buildTemplateSlotsUserPromptDoDont(articles, mode),
        userPromptDos: buildTemplateSlotsUserPromptDosOnly(articles, mode),
        userPromptDonts: buildTemplateSlotsUserPromptDontsOnly(articles, mode),
        mode
      };
    }
    if (formatId === 'spotlight') {
      return {
        systemPrompt: TEMPLATE_SLOTS_SYSTEM,
        userPrompt: buildTemplateSlotsUserPromptSpotlight(articles, mode),
        userPromptTactics: buildTemplateSlotsUserPromptTacticsOnly(articles, mode),
        userPromptDefence: buildTemplateSlotsUserPromptDefenceOnly(articles, mode),
        mode
      };
    }
    if (formatId === 'poster') {
      return { systemPrompt: TEMPLATE_SLOTS_SYSTEM, userPrompt: buildCorporateTopicUserPrompt(articles, mode), mode };
    }
    return { systemPrompt: '', userPrompt: '', mode };
  }

  async function callTemplateSlotsAI(userPrompt, slotOpts = {}) {
    const system = slotOpts.systemPrompt != null ? slotOpts.systemPrompt : TEMPLATE_SLOTS_SYSTEM;
    const max_tokens = slotOpts.maxTokens != null ? slotOpts.maxTokens : 900;
    const logName = slotOpts.logName || null;
    let raw;
    let thrown = null;
    try {
      if (config.provider === 'claude' && config.claudeKey) {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.claudeKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: config.claudeModel,
            max_tokens,
            temperature: 0.15,
            system,
            messages: [{ role: 'user', content: userPrompt }]
          })
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const d = await resp.json();
        raw = d.content?.[0]?.text || '';
      } else if (config.provider === 'openai' && config.openaiKey) {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.openaiKey}` },
          body: JSON.stringify(openAIChatCompletionsBody(system, userPrompt, max_tokens, 0.08))
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const d = await resp.json();
        raw = d.choices?.[0]?.message?.content || '';
      } else {
        throw new Error('No API key');
      }
      const cleaned = String(raw).replace(/```json\s*|```\s*/g, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      thrown = err;
      throw err;
    } finally {
      // Per-template AI log (App.AILogger picks up active build context).
      // Logs both successful and failed calls so failures are debuggable.
      try {
        const AIL = window.App && window.App.AILogger;
        if (AIL && logName && typeof AIL.log === 'function') {
          AIL.log({
            name: logName,
            prompt: system + '\n\n' + userPrompt,
            response: thrown ? ('ERROR: ' + (thrown.message || String(thrown))) : raw
          });
        }
      } catch (_logErr) { /* never throw from logging */ }
    }
  }

  async function aiFillDoDontSlots(articles, mode, retries = 0) {
    const base = {
      nlDoDontDos: localDoLinesFromArticles(articles),
      nlDoDontDonts: localDontLinesFromArticles(articles)
    };
    const slotTok = { maxTokens: 520 };
    try {
      const p1 = await callTemplateSlotsAI(buildTemplateSlotsUserPromptDosOnly(articles, mode), { ...slotTok, logName: 'dodont_dos.txt' });
      const dos = dedupeTemplateLines(Array.isArray(p1.dos) ? p1.dos : []);
      await App.Utils.wait(220);
      let donts = base.nlDoDontDonts;
      try {
        const p2 = await callTemplateSlotsAI(buildTemplateSlotsUserPromptDontsOnly(articles, mode), { ...slotTok, logName: 'dodont_donts.txt' });
        const d2 = dedupeTemplateLines(Array.isArray(p2.donts) ? p2.donts : []);
        if (d2.length >= 6) donts = d2.slice(0, 6);
      } catch {
        donts = base.nlDoDontDonts;
      }
      return {
        nlDoDontDos: dos.length >= 6 ? dos.slice(0, 6) : base.nlDoDontDos,
        nlDoDontDonts: donts.length >= 6 ? donts : base.nlDoDontDonts
      };
    } catch {
      if (retries < config.retryAttempts) {
        await App.Utils.wait(config.retryDelayMs * (retries + 1));
        return aiFillDoDontSlots(articles, mode, retries + 1);
      }
      return base;
    }
  }

  function normalizeSpotlightTactic(obj, fallback, index) {
    const f = fallback[index] || SPOTLIGHT_TACTICS_DEFAULT[index];
    if (!obj || typeof obj !== 'object') return { ...f };
    const icon = scrubTipSurface(String(obj.icon || f.icon || '📌')).slice(0, 4) || f.icon;
    const tactic = sanitizeTemplateSlotLine(String(obj.tactic || '')) || f.tactic;
    const detailRaw = sanitizeSummaryProse(String(obj.detail || ''));
    const detail = clampStr(detailRaw, 140) || f.detail;
    return { icon, tactic, detail };
  }

  const CORP_TOPIC_MAX_CHARS = 340;

  /** Corporate Alert topic card title (fixed; body must read as edition focus). */
  const CORPORATE_TOPIC_HEADING = 'Edition focus';

  /**
   * Up to two complete sentences; prefer whole sentences under maxChars (no mid-word ellipsis).
   */
  function finalizeCorporateTopicBlurb(text, maxChars = CORP_TOPIC_MAX_CHARS) {
    let t = sanitizeSummaryProse(String(text || ''));
    if (!t) return '';
    const sentences = t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean).filter((s) => s.length > 8);
    if (!sentences.length) return clampStr(t, maxChars);
    const one = sentences[0];
    const two = sentences.slice(0, 2).join(' ');
    if (two.length <= maxChars) return two;
    if (one.length <= maxChars) return one;
    let cut = one.slice(0, maxChars);
    const sp = cut.lastIndexOf(' ');
    if (sp > Math.floor(maxChars * 0.55)) cut = cut.slice(0, sp);
    cut = cut.trim();
    if (!/[.!?]$/.test(cut)) cut += '.';
    return cut;
  }

  function formatTypePhraseForTopic(types = []) {
    const t = types.filter(Boolean);
    if (!t.length) return 'current security';
    if (t.length === 1) return t[0];
    if (t.length === 2) return `${t[0]} and ${t[1]}`;
    return `${t.slice(0, -1).join(', ')}, and ${t[t.length - 1]}`;
  }

  function localCorporateTopicBlurb(articles = []) {
    const list = (Array.isArray(articles) ? articles : []).filter((a) => a && (a.title || a.description));
    if (!list.length) {
      return finalizeCorporateTopicBlurb(
        'This edition focuses on active security themes relevant to all staff. Use the items below to see what is in scope for this send and how to respond through official channels.',
        CORP_TOPIC_MAX_CHARS
      );
    }
    const types = [...new Set(list.map((a) => String(a.type || '').trim()).filter(Boolean))];
    const typePhrase = formatTypePhraseForTopic(types);
    const lead = list[0];
    const corpus = [lead.summary, lead.description].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    const s1 = `This edition focuses on ${typePhrase}: these are the priority themes for this send and what the following items expand on.`;
    let s2 = '';
    if (corpus.length > 36) {
      const segs = corpus.split(/(?<=[.!?])\s+/).map((p) => p.trim()).filter(Boolean);
      s2 = (segs[0] && segs[0].length >= 20 ? segs[0] : corpus).trim();
      if (s2.length > 220) {
        const cut = s2.slice(0, 220);
        const sp = cut.lastIndexOf(' ');
        s2 = (sp > 100 ? cut.slice(0, sp) : cut).trim();
      }
      if (s2 && !/[.!?]$/.test(s2)) s2 += '.';
    } else {
      const tips = generateTips(mergedArticleForEditionTips(list));
      s2 = (tips[0] || 'Verify unusual requests through a channel you trust before you act.').trim();
      if (s2 && !/[.!?]$/.test(s2)) s2 += '.';
    }
    return finalizeCorporateTopicBlurb(`${s1} ${s2}`.trim(), CORP_TOPIC_MAX_CHARS);
  }

  function buildCorporateTopicUserPrompt(articles = [], mode = 'balanced') {
    const modeCfg = CURATION_MODES[mode] || CURATION_MODES.balanced;
    const compact = (Array.isArray(articles) ? articles : []).slice(0, 8).map((a) => ({
      title: a.title,
      type: a.type,
      summary: truncate(a.summary || a.description || '', modeCfg.maxContentChars)
    }));
    return `Template: Corporate Alert — card body for the fixed title "Edition focus" (the template supplies the title; do not invent a different title).

Return ONLY valid JSON (no markdown) with one key:
- "nlCorporateTopicBlurb": string, exactly 1 or 2 complete sentences, at most ${CORP_TOPIC_MAX_CHARS} characters. Do not end with an ellipsis or a cut-off word.

Blurb must read as the edition focus under that heading:
- Sentence 1: what this edition is centering on (threat themes or incidents in the stories) and why that is the focus now — use themes that appear in the JSON, not generic "cyber" language.
- Sentence 2 (optional): what staff should keep in view for this edition (verify, report, patch, or channel-specific care) tied directly to that focus — not a generic slogan.

Tone: internal advisory (CERT/CISA-style), factual, no rhetorical questions, no exclamation marks, no URLs, no filler phrases ("it is important to note", "remember that", "in today's world"). Do not invent vendors, numbers, or incidents not present in the stories.

Mode: ${modeCfg.label}

Stories (JSON):
${JSON.stringify(compact)}`;
  }

  async function aiFillCorporateTopicBlurb(articles, mode, retries = 0) {
    const prompt = buildCorporateTopicUserPrompt(articles, mode);
    const localB = localCorporateTopicBlurb(articles);
    const out = { nlCorporateTopicBlurb: localB, nlCorporateTopicHeading: CORPORATE_TOPIC_HEADING };
    try {
      const p = await callTemplateSlotsAI(prompt, { logName: 'corporate_blurb.txt' });
      const raw = p.nlCorporateTopicBlurb != null ? String(p.nlCorporateTopicBlurb) : '';
      const cleaned = finalizeCorporateTopicBlurb(raw, CORP_TOPIC_MAX_CHARS);
      out.nlCorporateTopicBlurb = cleaned || localB;
      return out;
    } catch {
      if (retries < config.retryAttempts) {
        await App.Utils.wait(config.retryDelayMs * (retries + 1));
        return aiFillCorporateTopicBlurb(articles, mode, retries + 1);
      }
      return out;
    }
  }

  // ─── Chase-email precautions (Scam Alert section, gen_chase_email) ─────────
  // Per-article attack-type detection: each precaution is mapped to a specific
  // attack type present in the user's selected articles (phishing, MFA bypass,
  // ransomware, smishing, BEC, deepfakes, supply-chain, zero-day, etc.) rather
  // than to a single umbrella theme. The fallback walks every article, matches
  // its title+summary against an attack-type catalogue, and emits one
  // precaution per detected type. The AI prompt is told the detected types
  // explicitly and asked to write one bullet per type — not generic advice.
  const CHASE_PRECAUTIONS_MAX_CHARS = 150;
  const CHASE_PRECAUTIONS_DEFAULT_HEADING = 'Precautionary measures for this edition';
  const CHASE_PRECAUTIONS_DEFAULT_INTRO   = 'Each measure below targets a specific attack covered in the articles above:';
  const CHASE_PRECAUTIONS_DEFAULTS = [
    'Pause before acting on any unexpected message — urgency is the single most common pressure tactic across these attacks.',
    'Verify the request through an official channel you already trust, not the one that contacted you.',
    'Report suspicious messages, calls, or transactions to IT/security immediately — early reporting limits damage.'
  ];

  // Attack-type catalogue. Each entry lists keywords found in article titles
  // and summaries, plus a precaution sentence tailored to that attack and a
  // short label used in the heading.
  const CHASE_ATTACK_PROFILES = [
    { id: 'phaas',           label: 'phishing-as-a-service',     keywords: /phaas|phishing[- ]as[- ]a[- ]service|phishing kit|phishing platform/i,                                            precaution: 'Assume any login page reached from an email or SMS link is hostile — modern phishing kits clone legitimate sites in seconds.' },
    { id: 'spear_phishing',  label: 'spear phishing',            keywords: /spear[- ]phish|targeted phish/i,                                                                                  precaution: 'Treat personalised, "for-your-eyes-only" requests with extra suspicion — high-value targets are researched before the attack.' },
    { id: 'phishing',        label: 'phishing',                  keywords: /phish|fake login|credential harvest|spoofed email|verify your account|password reset/i,                          precaution: 'Open important sites by typing the address yourself or using a saved bookmark — never reach a login screen by clicking a link in email.' },
    { id: 'mfa_bypass',      label: 'MFA bypass',                keywords: /mfa|multi[- ]factor|two[- ]factor|2fa|authenticator|otp|one[- ]time password|push notification|aitm|adversary[- ]in[- ]the[- ]middle|mfa fatigue|prompt bombing/i, precaution: 'Never approve an MFA prompt you did not start — deny it, report it, and move toward phishing-resistant factors like FIDO2/passkeys.' },
    { id: 'smishing',        label: 'smishing',                  keywords: /smish|sms phish|text message|missed delivery|courier/i,                                                          precaution: 'Treat unexpected SMS links as hostile — open the company\'s own app to check a delivery, bill, or alert rather than tapping the message.' },
    { id: 'vishing',         label: 'vishing',                   keywords: /vishing|voice phish|caller id|spoofed call|phone scam|callback scam/i,                                            precaution: 'Hang up on urgent calls demanding action and call back on a number printed on your card or the company\'s official website.' },
    { id: 'bec',             label: 'business email compromise', keywords: /business email compromise|\bbec\b|ceo fraud|invoice fraud|wire transfer fraud|payment redirection/i,              precaution: 'Verify any change to payment details or wire instructions by calling the requester back on a number you already had on file.' },
    { id: 'ransomware',      label: 'ransomware',                keywords: /ransom|encrypt(?:ed|or|ion)?|lockbit|conti|blackcat|alphv|cryptolocker/i,                                          precaution: 'Keep current, isolated backups and patch promptly — most ransomware enters via known vulnerabilities and stale internet-facing exposures.' },
    { id: 'malware',         label: 'malware',                   keywords: /malware|trojan|infostealer|loader|backdoor|rat\b|remote access trojan|macro/i,                                    precaution: 'Do not open unexpected attachments or run installers from unknown sources — verify with the sender on a known channel first.' },
    { id: 'data_breach',     label: 'data breaches',             keywords: /data breach|leaked database|exposed records|stolen credentials|database dump|account takeover|password leak/i,    precaution: 'Use a unique password per important account and enable breach-monitoring so you find out before the attacker uses the leaked data.' },
    { id: 'deepfake',        label: 'deepfakes',                 keywords: /deepfake|voice clone|ai[- ]generated voice|synthetic media|face swap/i,                                           precaution: 'Agree a verbal safe-word with colleagues and family for high-stakes voice or video requests — deepfakes cannot survive an out-of-band check.' },
    { id: 'supply_chain',    label: 'supply-chain attacks',      keywords: /supply chain|software supply chain|third[- ]party compromise|dependency hijack|npm package|pypi package/i,        precaution: 'Treat updates from less-known third parties as untrusted until verified — supply-chain compromises ride on legitimate update channels.' },
    { id: 'zero_day',        label: 'zero-day exploits',         keywords: /zero[- ]day|0-day|unpatched|cve-\d{4}-\d+|n-day/i,                                                                 precaution: 'Apply emergency patches without waiting for the next maintenance window when a zero-day affecting your stack is announced.' },
    { id: 'insider',         label: 'insider threats',           keywords: /insider threat|disgruntled employee|departing employee|insider risk|leaver/i,                                    precaution: 'Revoke departing or role-changed staff access promptly — most insider incidents involve credentials that were never disabled.' },
    { id: 'social_eng',      label: 'social engineering',        keywords: /social engineer|pretext|impersonat/i,                                                                              precaution: 'Slow down when someone uses urgency, authority, or secrecy to push you off normal process — those are textbook social-engineering signals.' },
    { id: 'crypto_scam',     label: 'cryptocurrency scams',      keywords: /crypto scam|pig butchering|romance scam|investment scam|rug pull|fake exchange/i,                                  precaution: 'Treat unsolicited investment, romance, or "guaranteed return" pitches as scams — never move funds to a wallet a stranger gave you.' },
    { id: 'scam_general',    label: 'scams and frauds',          keywords: /scam|fraud|swindle|con artist|gift card scam|wire fraud/i,                                                        precaution: 'Pause before you act on anything that combines urgency and a money request — that combination is almost always a fraud.' }
  ];

  function detectChaseAttacksPerArticle(articles = []) {
    const list = (Array.isArray(articles) ? articles : []).filter((a) => a && (a.title || a.description));
    const perArticle = [];
    const aggregate = new Map(); // id → { profile, score }
    for (const a of list) {
      const blob = `${a.title || ''} ${a.summary || a.description || ''} ${a.type || ''}`;
      const hits = [];
      for (const p of CHASE_ATTACK_PROFILES) {
        const matches = blob.match(new RegExp(p.keywords.source, 'gi'));
        const hitCount = matches ? matches.length : 0;
        if (hitCount > 0) {
          hits.push({ profile: p, hits: hitCount });
          const prior = aggregate.get(p.id);
          if (prior) prior.score += hitCount;
          else aggregate.set(p.id, { profile: p, score: hitCount });
        }
      }
      hits.sort((x, y) => y.hits - x.hits);
      perArticle.push({ article: a, primary: hits[0] ? hits[0].profile : null, all: hits.map((h) => h.profile) });
    }
    const ranked = Array.from(aggregate.values()).sort((a, b) => b.score - a.score).map((x) => x.profile);
    return { perArticle, ranked };
  }

  function localChasePrecautionsFromArticles(articles = []) {
    const list = (Array.isArray(articles) ? articles : []).filter((a) => a && (a.title || a.description));
    if (!list.length) return CHASE_PRECAUTIONS_DEFAULTS.slice();
    const { perArticle, ranked } = detectChaseAttacksPerArticle(list);
    // Prefer one precaution per article (the article's PRIMARY attack type),
    // padding with the next-ranked attack types if we have fewer than 3
    // articles or some articles matched nothing.
    const picked = [];
    const seen = new Set();
    for (const entry of perArticle) {
      if (!entry.primary) continue;
      if (seen.has(entry.primary.id)) continue;
      picked.push(entry.primary);
      seen.add(entry.primary.id);
      if (picked.length === 3) break;
    }
    for (const p of ranked) {
      if (picked.length === 3) break;
      if (!seen.has(p.id)) { picked.push(p); seen.add(p.id); }
    }
    let out = picked.map((p) => p.precaution);
    while (out.length < 3) {
      const next = CHASE_PRECAUTIONS_DEFAULTS.find((d) => !out.includes(d));
      if (!next) break;
      out.push(next);
    }
    return out.slice(0, 3);
  }

  function localChaseAlertHeading(articles = []) {
    const list = (Array.isArray(articles) ? articles : []).filter((a) => a && (a.title || a.description));
    if (!list.length) return CHASE_PRECAUTIONS_DEFAULT_HEADING;
    const { ranked } = detectChaseAttacksPerArticle(list);
    if (!ranked.length) return CHASE_PRECAUTIONS_DEFAULT_HEADING;
    const top = ranked.slice(0, 2).map((p) => p.label);
    const joined = top.length === 2 ? `${top[0]} and ${top[1]}` : top[0];
    return `Precautions against ${joined}`;
  }

  function buildChasePrecautionsUserPrompt(articles = [], mode = 'balanced') {
    const modeCfg = (CURATION_MODES[mode] || CURATION_MODES.balanced);
    const list = (Array.isArray(articles) ? articles : []).slice(0, 6);
    const { perArticle, ranked } = detectChaseAttacksPerArticle(list);
    const compact = list.map((a, i) => {
      const detected = (perArticle[i] && perArticle[i].all) || [];
      return {
        index: i + 1,
        title:   a && a.title ? String(a.title).slice(0, 240) : '',
        type:    a && a.type  ? String(a.type).slice(0, 80)   : '',
        summary: truncate(a && (a.summary || a.description) || '', modeCfg.maxContentChars),
        detected_attack_types: detected.map((p) => p.label)
      };
    });
    const rankedLabels = ranked.map((p) => p.label).slice(0, 5);
    return `Template: Chase-style Scam Alert card. The reader selected the stories below. Each story is annotated with the SPECIFIC attack types it covers ("detected_attack_types"). Write precautions that map directly to those attack types — one precaution per attack type, in the order of importance suggested by the rank list below.

Aggregate ranked attack types across the selection (most prevalent first): ${rankedLabels.length ? rankedLabels.join(', ') : '(none detected — infer from the JSON below)'}.

Return ONLY valid JSON (no markdown, no commentary) with two keys:
- "nlChaseAlertHeading": string, max 80 chars. Name the SPECIFIC attack types being addressed (e.g. "Precautions against phishing and MFA bypass", "Precautions against ransomware and zero-days"). Do not write a generic slogan.
- "nlChasePrecautions": array of EXACTLY 3 short imperative sentences, each at most ${CHASE_PRECAUTIONS_MAX_CHARS} characters. Rules:
  • Each sentence must target a DISTINCT attack type drawn from the detected_attack_types fields below. Do not write three variants of the same advice.
  • Make the link visible: name the attack technique in the sentence (e.g. "Against MFA fatigue, never approve...", "If you suspect smishing, ...", "To resist BEC, ...") when natural, or open with the defensive action that obviously addresses that attack.
  • Stay practical and evergreen — do not name specific vendors, incidents, dates, dollar amounts, or CVEs from the stories.
  • If the stories cover fewer than 3 distinct attack types, fill the remainder with the next most prevalent type the stories imply, not generic "stay alert" filler.

Tone: internal advisory (CERT/CISA-style), factual, no rhetorical questions, no exclamation marks, no URLs, no emojis, no quotation marks around the sentences.

Mode: ${modeCfg.label}

Stories (JSON):
${JSON.stringify(compact)}`;
  }

  function sanitizeChasePrecautionLine(raw) {
    let s = sanitizeSummaryProse(String(raw || ''));
    s = s.replace(/^[\-•\*\d\.\)\s]+/, '').replace(/^["'`‘’“”]+|["'`‘’“”]+$/g, '').trim();
    if (!s) return '';
    if (s.length > CHASE_PRECAUTIONS_MAX_CHARS) {
      const cut = s.slice(0, CHASE_PRECAUTIONS_MAX_CHARS);
      const sp = cut.lastIndexOf(' ');
      s = (sp > Math.floor(CHASE_PRECAUTIONS_MAX_CHARS * 0.6) ? cut.slice(0, sp) : cut).trim();
    }
    if (!/[.!?]$/.test(s)) s += '.';
    return s;
  }

  async function aiFillChasePrecautions(articles, mode, retries = 0) {
    const localPoints  = localChasePrecautionsFromArticles(articles);
    const localHeading = localChaseAlertHeading(articles);
    const fallback = {
      nlChaseAlertHeading: localHeading,
      nlChaseAlertIntro:   CHASE_PRECAUTIONS_DEFAULT_INTRO,
      nlChasePrecautions:  localPoints
    };
    try {
      const p = await callTemplateSlotsAI(buildChasePrecautionsUserPrompt(articles, mode), { maxTokens: 480, logName: 'chase_precautions.txt' });
      const heading = p && p.nlChaseAlertHeading ? sanitizeTemplateSlotLine(String(p.nlChaseAlertHeading)).slice(0, 90) : '';
      const rawList = Array.isArray(p && p.nlChasePrecautions) ? p.nlChasePrecautions : [];
      const cleaned = rawList.map(sanitizeChasePrecautionLine).filter(Boolean);
      const points = (cleaned.length >= 3 ? cleaned.slice(0, 3) : localPoints);
      return {
        nlChaseAlertHeading: heading || localHeading,
        nlChaseAlertIntro:   CHASE_PRECAUTIONS_DEFAULT_INTRO,
        nlChasePrecautions:  points
      };
    } catch {
      if (retries < config.retryAttempts) {
        await App.Utils.wait(config.retryDelayMs * (retries + 1));
        return aiFillChasePrecautions(articles, mode, retries + 1);
      }
      return fallback;
    }
  }

  // ─── CyberShield impact summary ("Why it matters", gen_cybershield) ────────
  const CYBERSHIELD_IMPACT_DEFAULT = 'A single compromised credential can give attackers access to entire systems. The damage goes beyond data — it affects trust, operations, and finances.';

  function localCybershieldImpact(articles = []) {
    const list = (Array.isArray(articles) ? articles : []).filter((a) => a && (a.title || a.description));
    if (!list.length) return CYBERSHIELD_IMPACT_DEFAULT;
    // Self-contained: name up to two distinct threat types straight off the
    // selected articles' own `type` field. No cross-template helpers.
    const types = [];
    const seen = new Set();
    for (const a of list) {
      const t = String((a && a.type) || '').trim();
      const k = t.toLowerCase();
      if (t && !seen.has(k)) { seen.add(k); types.push(t); }
      if (types.length >= 2) break;
    }
    if (!types.length) return CYBERSHIELD_IMPACT_DEFAULT;
    const joined = types.length === 2 ? `${types[0]} and ${types[1]}` : types[0];
    return `Threats like ${joined} can hand an attacker a foothold into entire systems from a single mistake. The damage goes beyond data: it affects trust, operations, and finances.`;
  }

  function buildCybershieldImpactUserPrompt(articles = [], mode = 'balanced') {
    const modeCfg = (CURATION_MODES[mode] || CURATION_MODES.balanced);
    const list = (Array.isArray(articles) ? articles : []).slice(0, 6);
    const compact = list.map((a, i) => ({
      index: i + 1,
      title:   a && a.title ? String(a.title).slice(0, 240) : '',
      summary: truncate(a && (a.summary || a.description) || '', modeCfg.maxContentChars)
    }));
    return `Template: CyberShield "Why it matters" impact paragraph. Based ONLY on the stories below, write one short paragraph (1-2 sentences, max 280 characters total) explaining the real-world impact these threats can have on an organisation and its people.

Return ONLY valid JSON (no markdown, no commentary) with one key:
- "nlCybershieldImpact": string, max 280 chars, 1-2 sentences.

Rules:
  • Focus on consequences (system access, trust, operations, finances, downtime) — NOT how-to advice.
  • Stay evergreen — do not name specific vendors, incidents, dates, dollar amounts, or CVEs.
  • Factual internal-advisory tone. No rhetorical questions, no exclamation marks, no URLs, no emojis, no quotation marks around the text.

Mode: ${modeCfg.label}

Stories (JSON):
${JSON.stringify(compact)}`;
  }

  async function aiFillCybershieldImpact(articles, mode, retries = 0) {
    const fallback = { nlCybershieldImpact: localCybershieldImpact(articles) };
    try {
      const p = await callTemplateSlotsAI(buildCybershieldImpactUserPrompt(articles, mode), { maxTokens: 240, logName: 'cybershield_impact.txt' });
      const raw = p && p.nlCybershieldImpact ? String(p.nlCybershieldImpact) : '';
      const cleaned = sanitizeSummaryProse(raw).replace(/^["'`‘’“”]+|["'`‘’“”]+$/g, '').trim();
      return { nlCybershieldImpact: cleaned || fallback.nlCybershieldImpact };
    } catch {
      if (retries < config.retryAttempts) {
        await App.Utils.wait(config.retryDelayMs * (retries + 1));
        return aiFillCybershieldImpact(articles, mode, retries + 1);
      }
      return fallback;
    }
  }

  // ─── CyberShield "What's the threat?" + "Recognizing Security Threats" ─────
  // Two more article-driven slots for gen_cybershield (the impact slot above is
  // left untouched). The overview names the picked stories' attack types; the
  // four indicators are "how you'd notice it" lines per detected type, padded
  // with the evergreen phishing-spotting defaults so the list is always 4.
  const CYBERSHIELD_THREAT_DEFAULT = 'Cybercriminals are increasingly targeting employees through spear phishing, social engineering, and credential theft. These attacks are highly personalised and designed to bypass standard security filters.';

  const CYBERSHIELD_REDFLAG_DEFAULTS = [
    "Sender address doesn't match the company domain — look closely at spelling.",
    'Urgent language pressuring you to act immediately or risk consequences.',
    'Unexpected attachments or links asking for login credentials.',
    'Mismatched URLs — hover before you click to see the real destination.'
  ];

  // Recognition indicator per CHASE_ATTACK_PROFILES id ("how you'd notice it").
  const CYBERSHIELD_SPOT_BY_ID = {
    phaas:          'A login or "verify your account" page reached from a link that looks pixel-perfect but you did not navigate to.',
    spear_phishing: 'A personalised message referencing your role, projects, or colleagues to lower your guard.',
    phishing:       'An email pushing you toward a login or password-reset page you did not request.',
    mfa_bypass:     'An MFA prompt or one-time code arriving when you did not just try to sign in.',
    smishing:       'An unexpected SMS about a delivery, bill, or alert with a link asking you to tap through.',
    vishing:        'An urgent phone call pressuring you to pay, share a code, or act right now.',
    bec:            'An email asking to change payment details, bank accounts, or wire instructions.',
    ransomware:     'Files suddenly renamed or unopenable, or a note demanding payment to restore access.',
    malware:        'An unexpected attachment, installer, or macro-enable prompt from an unfamiliar sender.',
    data_breach:    'A breach notice for a service you use, or a password reset you never started.',
    deepfake:       'A voice or video request from a "colleague" that feels off or unusually urgent.',
    supply_chain:   'An update or package from a third party or dependency you do not fully recognise.',
    zero_day:       'Alerts about an actively exploited flaw in software your team actually runs.',
    insider:        'Access, downloads, or sharing from a departing or role-changed colleague that no longer fits their job.',
    social_eng:     'Pressure built on urgency, authority, or secrecy to push you off your normal process.',
    crypto_scam:    'An unsolicited investment, romance, or "guaranteed return" pitch steering you to move funds.',
    scam_general:   'Any message pairing urgency with a request for money, gift cards, or transfers.'
  };

  function localCybershieldThreat(articles = []) {
    const list = (Array.isArray(articles) ? articles : []).filter((a) => a && (a.title || a.description));
    if (!list.length) return CYBERSHIELD_THREAT_DEFAULT;
    const { ranked } = detectChaseAttacksPerArticle(list);
    const labels = ranked.slice(0, 3).map((p) => p.label);
    if (!labels.length) return CYBERSHIELD_THREAT_DEFAULT;
    const joined = labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
    return `Cybercriminals are increasingly targeting employees through ${joined}. These attacks are highly personalised and designed to bypass standard security filters.`;
  }

  function localCybershieldRedFlags(articles = []) {
    const list = (Array.isArray(articles) ? articles : []).filter((a) => a && (a.title || a.description));
    const out = [];
    const seen = new Set();
    const push = (line) => {
      const t = String(line || '').trim();
      if (!t) return;
      const k = t.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      out.push(t);
    };
    if (list.length) {
      const { perArticle, ranked } = detectChaseAttacksPerArticle(list);
      // One indicator per article (its primary attack type), then fill from the
      // aggregate ranking, before padding with the evergreen defaults.
      for (const entry of perArticle) {
        if (out.length >= 4) break;
        if (entry.primary && CYBERSHIELD_SPOT_BY_ID[entry.primary.id]) push(CYBERSHIELD_SPOT_BY_ID[entry.primary.id]);
      }
      for (const p of ranked) {
        if (out.length >= 4) break;
        if (CYBERSHIELD_SPOT_BY_ID[p.id]) push(CYBERSHIELD_SPOT_BY_ID[p.id]);
      }
    }
    for (const d of CYBERSHIELD_REDFLAG_DEFAULTS) {
      if (out.length >= 4) break;
      push(d);
    }
    return out.slice(0, 4);
  }

  function buildCybershieldThreatRedFlagsUserPrompt(articles = [], mode = 'balanced') {
    const modeCfg = (CURATION_MODES[mode] || CURATION_MODES.balanced);
    const list = (Array.isArray(articles) ? articles : []).slice(0, 6);
    const compact = list.map((a, i) => ({
      index: i + 1,
      title:   a && a.title ? String(a.title).slice(0, 240) : '',
      summary: truncate(a && (a.summary || a.description) || '', modeCfg.maxContentChars)
    }));
    return `Template: CyberShield "What's the threat?" overview + "Recognizing Security Threats" indicators. Based ONLY on the stories below, produce:
1) a short threat-overview paragraph (1-2 sentences, max 280 characters) naming the kinds of attacks these stories describe and how they reach employees, and
2) exactly 4 short "how to recognize it" indicators (each max 90 characters) staff can use to spot these threats.

Return ONLY valid JSON (no markdown, no commentary) with two keys:
- "nlCybershieldThreat": string, max 280 chars, 1-2 sentences.
- "nlCybershieldRedFlags": array of exactly 4 strings, each max 90 chars.

Rules:
  • Ground both in the stories' actual threat types (phishing, smishing, BEC, ransomware, MFA bypass, supply-chain, etc.).
  • Indicators describe what the employee would NOTICE — not what to do about it.
  • Stay evergreen — do not name specific vendors, incidents, dates, dollar amounts, or CVEs.
  • Factual internal-advisory tone. No rhetorical questions, no exclamation marks, no URLs, no emojis, no quotation marks around the text.

Mode: ${modeCfg.label}

Stories (JSON):
${JSON.stringify(compact)}`;
  }

  async function aiFillCybershieldThreatRedFlags(articles, mode, retries = 0) {
    const fallback = {
      nlCybershieldThreat:   localCybershieldThreat(articles),
      nlCybershieldRedFlags: localCybershieldRedFlags(articles)
    };
    const clean = (s) => sanitizeSummaryProse(String(s || '')).replace(/^["'`‘’“”]+|["'`‘’“”]+$/g, '').trim();
    try {
      const p = await callTemplateSlotsAI(buildCybershieldThreatRedFlagsUserPrompt(articles, mode), { maxTokens: 420, logName: 'cybershield_threat_redflags.txt' });
      const threat = clean(p && p.nlCybershieldThreat);
      let flags = (Array.isArray(p && p.nlCybershieldRedFlags) ? p.nlCybershieldRedFlags : []).map(clean).filter(Boolean);
      // Pad/clamp to exactly 4 with the local article-derived indicators.
      if (flags.length < 4) {
        for (const d of localCybershieldRedFlags(articles)) {
          if (flags.length >= 4) break;
          if (!flags.some((x) => x.toLowerCase() === d.toLowerCase())) flags.push(d);
        }
      }
      flags = flags.slice(0, 4);
      return {
        nlCybershieldThreat:   threat || fallback.nlCybershieldThreat,
        nlCybershieldRedFlags: flags.length === 4 ? flags : fallback.nlCybershieldRedFlags
      };
    } catch {
      if (retries < config.retryAttempts) {
        await App.Utils.wait(config.retryDelayMs * (retries + 1));
        return aiFillCybershieldThreatRedFlags(articles, mode, retries + 1);
      }
      return fallback;
    }
  }

  async function aiFillSpotlightSlots(articles, mode, retries = 0) {
    const localT = localSpotlightTacticsFromArticles(articles);
    const localD = localSpotlightDefenceFromArticles(articles);
    const slotTokT = { maxTokens: 720 };
    const slotTokD = { maxTokens: 520 };
    try {
      const p1 = await callTemplateSlotsAI(buildTemplateSlotsUserPromptTacticsOnly(articles, mode), { ...slotTokT, logName: 'spotlight_tactics.txt' });
      const rawT = Array.isArray(p1.tactics) ? p1.tactics : [];
      const tactics = [];
      for (let i = 0; i < 4; i++) {
        tactics.push(normalizeSpotlightTactic(rawT[i], localT, i));
      }
      await App.Utils.wait(220);
      let defenceLines = localD;
      try {
        const p2 = await callTemplateSlotsAI(buildTemplateSlotsUserPromptDefenceOnly(articles, mode), { ...slotTokD, logName: 'spotlight_defence.txt' });
        const defRaw = Array.isArray(p2.defenceLines) ? p2.defenceLines : [];
        defenceLines = dedupeTemplateLines(defRaw);
        if (defenceLines.length < 6) defenceLines = dedupeTemplateLines([...defenceLines, ...localD, ...SPOTLIGHT_DEFENCE_DEFAULTS]);
      } catch {
        defenceLines = localD;
      }
      defenceLines = defenceLines.slice(0, 6);
      return { nlSpotlightTactics: tactics, nlSpotlightDefenceLines: defenceLines };
    } catch {
      if (retries < config.retryAttempts) {
        await App.Utils.wait(config.retryDelayMs * (retries + 1));
        return aiFillSpotlightSlots(articles, mode, retries + 1);
      }
      return { nlSpotlightTactics: localT, nlSpotlightDefenceLines: localD };
    }
  }

  function localBankPageSlots(/* articles */) {
    return {};
  }

  function stripLeadingGreeting(raw) {
    return String(raw || '').replace(
      /^\s*(dear\s+colleague|hello\s+team|hi\s+team|hello\s+everyone|hi\s+everyone|hello|hi|dear\s+all|dear\s+team)\s*[,.:;!]?\s+/i,
      ''
    );
  }

  function sanitizeBankPageIntro(raw, maxChars = 400) {
    const stripped = stripLeadingGreeting(String(raw || '').trim());
    let u = scrubTipSurface(stripped).replace(/https?:\/\/\S+/gi, '').trim();
    if (u.length < 20) return '';
    if (/^[a-z]/.test(u)) u = u[0].toUpperCase() + u.slice(1);
    if (u.length <= maxChars) return u;
    const cut = u.slice(0, maxChars);
    const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
    return (lastStop > 80 ? cut.slice(0, lastStop + 1) : cut).trim();
  }

  function sanitizeBankPageBullet(raw, maxChars = 140) {
    const u = scrubTipSurface(String(raw || '').trim()).replace(/https?:\/\/\S+/gi, '').trim();
    if (u.length < 6) return '';
    if (u.length <= maxChars) return u;
    const cut = u.slice(0, maxChars);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 50 ? cut.slice(0, lastSpace) : cut).trim() + '…';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Ensemble scoring + merge: pick the best per-section candidate.
  // ─────────────────────────────────────────────────────────────────────────

  const BANKPAGE_FORBIDDEN_PHRASES = [
    'credentials', 'it is important to note', 'it is worth noting',
    'remember that', "in today's world", 'as we all know', 'needless to say',
    'at the end of the day', 'in conclusion', 'this article', 'the takeaway is',
    "here's what you need to know", 'basically', 'staying vigilant',
    'be mindful', 'bad actors', "in today's digital landscape",
    'threat actors', 'adversaries'
  ];

  function countForbiddenHits(text) {
    const lower = String(text || '').toLowerCase();
    let hits = 0;
    for (const p of BANKPAGE_FORBIDDEN_PHRASES) {
      if (lower.includes(p)) hits += 1;
    }
    return hits;
  }

  function countSentences(s) {
    const m = String(s || '').match(/[.!?]+(?:\s|$)/g);
    return m ? m.length : (String(s || '').trim() ? 1 : 0);
  }

  function countWords(s) {
    return String(s || '').trim().split(/\s+/).filter(Boolean).length;
  }

  function scoreBankPageIntro(raw) {
    const intro = sanitizeBankPageIntro(raw);
    if (!intro) return { score: 0, value: '' };
    let score = 10;
    const sentences = countSentences(intro);
    if (sentences === 2 || sentences === 3) score += 3;
    else if (sentences >= 4) score -= 3;
    const words = countWords(intro);
    if (words >= 25 && words <= 55) score += 2;
    else if (words > 55) score -= Math.ceil((words - 55) / 5);
    if (/^[A-Z]/.test(intro)) score += 2;
    score -= 5 * countForbiddenHits(intro);
    if (/https?:\/\//i.test(String(raw || ''))) score -= 5;
    return { score, value: intro };
  }

  function scoreBankPageBullets(raw, requiredCount, charCap) {
    const rawList = Array.isArray(raw) ? raw : [];
    const rawJoined = rawList.map(b => String(b || '')).join(' \n ');
    const arr = rawList
      .slice(0, requiredCount + 2)
      .map(b => sanitizeBankPageBullet(b, charCap + 30))
      .filter(Boolean);
    if (!arr.length) return { score: 0, value: [] };
    let score = 10;
    const diff = arr.length - requiredCount;
    if (diff < 0) score -= 4 * Math.abs(diff);
    else if (diff > 0) score -= 2 * diff;
    for (const b of arr) {
      if (b.length <= charCap) score += 1;
      else score -= 2;
    }
    const seen = new Set();
    let dupes = 0;
    for (const b of arr) {
      const k = normalizeTipDedupeKey(b);
      if (!k) continue;
      if (seen.has(k)) dupes += 1;
      seen.add(k);
    }
    score -= 3 * dupes;
    const joined = arr.join(' \n ');
    score -= 5 * countForbiddenHits(joined);
    if (/https?:\/\//i.test(rawJoined)) score -= 5;
    return { score, value: arr.slice(0, requiredCount) };
  }


  // Bank-page ensemble extracted to js/ai/bank_page_ensemble.js. The wrappers
  // below preserve in-main call sites for aiFillBankPageSlots and
  // validateArticleCoherence (called by fillNewsletterTextSlots; the latter is
  // also part of the public API export).
  async function aiFillBankPageSlots(articles, mode = 'balanced', retries = 0) {
    return window.App.AIBankPageEnsemble.aiFillBankPageSlots(articles, mode, retries);
  }
  async function validateArticleCoherence(articles) {
    return window.App.AIBankPageEnsemble.validateArticleCoherence(articles);
  }

  /**
   * Score a candidate regen response against the originals. Lower-quality
   * candidates lose points or get rejected outright; the caller picks the
   * highest-scoring candidate from a parallel ensemble.
   *
   * Reject (return -Infinity) when:
   *   - Item count doesn't match the originals
   *   - Any item is empty after trim
   *   - Two items in the same response are duplicates of each other
   *
   * Reward:
   *   - Length within 0.5x..2x of the original (the band a "rewrite" should land in)
   *   - Item is meaningfully different from the original (some rewrite happened)
   */
  function scoreRegenResponse(items, originalTexts) {
    if (!Array.isArray(items) || items.length !== originalTexts.length) return -Infinity;
    let score = 0;
    const seen = new Set();
    for (let i = 0; i < items.length; i++) {
      const item = String(items[i] || '').trim();
      if (!item) return -Infinity;
      const orig = String(originalTexts[i] || '').trim();
      const origLen = Math.max(1, orig.length);
      const ratio = item.length / origLen;
      if (ratio >= 0.5 && ratio <= 2.0) score += 1;
      else if (ratio >= 0.3 && ratio <= 3.0) score += 0.3;
      const key = item.toLowerCase().replace(/\s+/g, ' ').trim();
      if (seen.has(key)) return -Infinity;
      seen.add(key);
      if (item.toLowerCase() !== orig.toLowerCase()) score += 0.5;
    }
    return score;
  }

  /**
   * Regenerate the plain text of a user-selected group of newsletter elements.
   * Powers the editor's "Regenerate with AI" action.
   *
   * Fires `attempts` parallel AI calls (default 3), scores each response with
   * scoreRegenResponse(), and returns the items from the highest-scoring
   * candidate. This matches the ensemble pattern used by aiFillBankPageSlots
   * — paying a few extra calls in exchange for noticeably better output and
   * resilience to one call returning a malformed/length-mismatched response.
   *
   * Contract: returns an array of strings the SAME LENGTH and ORDER as `texts`.
   * Throws if EVERY parallel attempt fails or comes back malformed.
   */
  async function regenerateSelection({ texts, articles = [], instruction = '', provider, apiKey, mode = 'balanced', attempts = 3, languageId = 'en', languageLabel = 'English' } = {}) {
    if (!Array.isArray(texts) || texts.length === 0) throw new Error('Nothing selected to regenerate');
    if (!apiKey) throw new Error('AI API key required (set it in Configuration)');
    configure({
      provider,
      claudeKey: provider === 'claude' ? apiKey : '',
      openaiKey: provider === 'openai' ? apiKey : ''
    });
    const modeCfg = CURATION_MODES[mode] || CURATION_MODES.balanced;
    const articleSummaries = (Array.isArray(articles) ? articles : []).slice(0, 6).map(a => ({
      title: clampStr(a && a.title || '', 140),
      type: (a && a.type) || 'Security News',
      summary: clampStr((a && (a.summary || a.description)) || '', 320)
    }));
    const cleanedInstruction = String(instruction || '').trim();
    const lang = String(languageId || 'en').toLowerCase();
    const langLabel = String(languageLabel || 'English').trim() || 'English';
    const isNonEnglish = lang !== 'en';
    // Source articles are always in English; when the user is regenerating a
    // non-English preview we ask the model to write in the target language
    // directly (instead of doing EN -> translate, which is the other button).
    const languageClause = isNonEnglish
      ? `\nWRITE EVERY ITEM IN ${langLabel.toUpperCase()} (language code: ${lang}). The source articles are in English; translate the meaning into ${langLabel} naturally — do not return English.`
      : '';
    const systemPrompt = `${EMPLOYEE_VOICE_BLOCK}
${STYLE_BLOCK}
You are rewriting a small contiguous section of a security-awareness newsletter for employees.
Return ONLY valid JSON of the form: {"items": ["...", "..."]}.
The "items" array MUST contain EXACTLY ${texts.length} entries, in the same order as the originals.
Each entry must mirror the ROLE and APPROXIMATE LENGTH of the matching original (bullet stays a short bullet; paragraph stays a paragraph).
Use only facts that are supported by the provided source articles.
Stay in the calm, factual, employee-facing voice — no emojis, no exclamation marks, no marketing flourishes.${languageClause}`;
    const userPrompt = JSON.stringify({
      instruction: cleanedInstruction || '(no extra instruction — write a different but equivalent version using the same source articles)',
      sentenceStyleHint: modeCfg.sentenceStyle || '',
      targetLanguage: { code: lang, label: langLabel },
      originalTexts: texts,
      sourceArticles: articleSummaries
    }, null, 2);
    const attemptCount = Math.max(1, Math.min(5, Number(attempts) || 3));
    const settled = await Promise.allSettled(
      Array.from({ length: attemptCount }, (_, idx) => callTemplateSlotsAI(userPrompt, {
        systemPrompt,
        maxTokens: 1200,
        logName: 'regen_' + idx + '.txt'
      }))
    );
    const candidates = [];
    const failures = [];
    for (const r of settled) {
      if (r.status !== 'fulfilled') { failures.push(r.reason && r.reason.message || String(r.reason || 'rejected')); continue; }
      const raw = Array.isArray(r.value && r.value.items) ? r.value.items : [];
      const items = raw.map(s => String(s == null ? '' : s).trim()).filter(s => s.length > 0);
      if (items.length !== texts.length) { failures.push(`length ${items.length} vs ${texts.length}`); continue; }
      candidates.push({ items, score: scoreRegenResponse(items, texts) });
    }
    if (!candidates.length) {
      throw new Error(`All ${attemptCount} AI attempts failed or returned mismatched counts (${failures.slice(0, 2).join('; ')})`);
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].items;
  }

  async function fillNewsletterTextSlots(formatId, articles = [], options = {}) {
    const mode = options.mode || 'balanced';
    let list = (Array.isArray(articles) ? articles : []).filter(a => a && (a.title || a.description));
    const useAI = options.forceLocal ? false : isAIAvailable();
    if (useAI && list.length >= 2 && options.skipCoherenceCheck !== true) {
      try {
        const coherence = await validateArticleCoherence(list);
        if (coherence && Array.isArray(coherence.articles) && coherence.articles.length) {
          list = coherence.articles;
        }
      } catch { /* fall through with original list on any failure */ }
    }
    if (formatId === 'dodont') {
      if (useAI) return aiFillDoDontSlots(list, mode);
      return {
        nlDoDontDos: localDoLinesFromArticles(list),
        nlDoDontDonts: localDontLinesFromArticles(list)
      };
    }
    if (formatId === 'spotlight') {
      if (useAI) return aiFillSpotlightSlots(list, mode);
      return {
        nlSpotlightTactics: localSpotlightTacticsFromArticles(list),
        nlSpotlightDefenceLines: localSpotlightDefenceFromArticles(list)
      };
    }
    if (formatId === 'poster') {
      if (useAI) return aiFillCorporateTopicBlurb(list, mode);
      return {
        nlCorporateTopicBlurb: localCorporateTopicBlurb(list),
        nlCorporateTopicHeading: CORPORATE_TOPIC_HEADING
      };
    }
    if (formatId === 'bankpage1_static' || formatId === 'bankpage1_dynamic') {
      if (useAI) return aiFillBankPageSlots(list, mode);
      return localBankPageSlots(list);
    }
    if (formatId === 'gen_chase_email') {
      if (useAI) return aiFillChasePrecautions(list, mode);
      return {
        nlChaseAlertHeading: localChaseAlertHeading(list),
        nlChaseAlertIntro:   CHASE_PRECAUTIONS_DEFAULT_INTRO,
        nlChasePrecautions:  localChasePrecautionsFromArticles(list)
      };
    }
    if (formatId === 'gen_cybershield') {
      if (useAI) {
        // Impact path stays exactly as before; threat + red-flags run alongside.
        const [impact, extra] = await Promise.all([
          aiFillCybershieldImpact(list, mode),
          aiFillCybershieldThreatRedFlags(list, mode)
        ]);
        return { ...impact, ...extra };
      }
      return {
        nlCybershieldImpact:   localCybershieldImpact(list),
        nlCybershieldThreat:   localCybershieldThreat(list),
        nlCybershieldRedFlags: localCybershieldRedFlags(list)
      };
    }
    return {};
  }

  function sanitizeWatchoutsForArticle(raw, article) {
    const out = [];
    const seen = new Set();
    const pushUnique = (line) => {
      const t = sanitizeWatchoutLine(line);
      if (!t) return;
      const k = normalizeTipDedupeKey(t);
      if (!k || seen.has(k)) return;
      seen.add(k);
      out.push(t);
    };
    if (Array.isArray(raw)) {
      for (const line of raw) {
        if (isGenericConsumerPasswordMfaWatchoutMisaligned(line, article)) continue;
        pushUnique(line);
      }
    }
    const fallback = generateTips(article);
    for (const f of fallback) {
      if (out.length >= 3) break;
      pushUnique(f);
    }
    while (out.length < 3) pushUnique('When in doubt, ask IT before you click');
    return out.slice(0, 3);
  }

  const EDITION_ACTION_BY_TYPE = {
    Phishing: 'Verify senders before you click links',
    'Password & MFA': 'Turn on MFA for important accounts',
    'Data Breach': 'Change reused passwords on other sites',
    Ransomware: 'Avoid unexpected attachments and links',
    'Social Engineering': 'Confirm money asks using a number you dial',
    Malware: 'Keep devices updated and use official stores',
    'Scam & Fraud': 'Slow down on urgent money or gift asks',
    Vulnerability: 'Apply security updates as soon as you can',
    Advisory: 'Read IT notices and follow posted steps',
    'Insider Threat': 'Keep work data in approved tools only',
    'Security News': 'Report strange messages to IT security',
    Smishing: 'Do not tap links in surprise SMS messages'
  };

  const GENERIC_EDITION_LINES = [
    'Report phishing and spam to IT',
    'Use strong unique passwords everywhere',
    'Never share MFA codes with anyone',
    'Lock your screen when you step away'
  ];

  /** Short edition lines when any story is software supply chain / dev tooling risk. */
  const SUPPLY_CHAIN_EDITION_TAKEAWAYS = [
    'Use IT-approved package sources for work projects',
    'Report suspicious packages or CI alerts to AppSec',
    'Never paste repo or CI secrets into chat or email',
    'Review dependency changes before production deploy'
  ];

  function watchoutDedupeKeys(articles = []) {
    const keys = new Set();
    for (const a of articles) {
      for (const w of a?.watchouts || []) {
        const k = normalizeTipDedupeKey(w);
        if (k) keys.add(k);
      }
    }
    return keys;
  }

  /** Extra lines when cross-article dedupe must replace a duplicate watchout. */
  const STOCK_ORG_WATCHOUTS = [
    'Use organization-approved channels for sensitive work data only',
    'Report suspected incidents through the official IT intake process',
    'Confirm unusual access requests with the requester by a second path',
    'Review link targets on external mail before you authenticate',
    'Segregate personal accounts from corporate credentials and SSO',
    'Escalate repeated authentication failures on your accounts to IT'
  ];

  function collectAlternativesForArticle(article) {
    const primary = generateTips(article);
    const secondary = defaultTipsForType(article);
    const out = [];
    const seen = new Set();
    for (const line of [...primary, ...secondary, ...STOCK_ORG_WATCHOUTS]) {
      const t = sanitizeWatchoutLine(line);
      const k = normalizeTipDedupeKey(t);
      if (!t || !k || seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
    return out;
  }

  /**
   * After per-article tips exist: avoid repeating the same recommendation across stories
   * (first article keeps priority order; later articles substitute from alternates).
   */
  function dedupeWatchoutsAcrossArticles(articles = []) {
    const list = Array.isArray(articles) ? articles : [];
    const usedGlobal = new Set();
    for (const art of list) {
      if (!Array.isArray(art.watchouts)) continue;
      const pool = [];
      const poolKeys = new Set();
      for (const w of art.watchouts) {
        const t = sanitizeWatchoutLine(w);
        const k = normalizeTipDedupeKey(t);
        if (t && k && !poolKeys.has(k)) {
          poolKeys.add(k);
          pool.push(t);
        }
      }
      for (const t of collectAlternativesForArticle(art)) {
        const k = normalizeTipDedupeKey(t);
        if (k && !poolKeys.has(k)) {
          poolKeys.add(k);
          pool.push(t);
        }
      }
      const chosen = [];
      for (const t of pool) {
        if (chosen.length >= 3) break;
        const k = normalizeTipDedupeKey(t);
        if (!k || usedGlobal.has(k)) continue;
        chosen.push(t);
        usedGlobal.add(k);
      }
      art.watchouts = sanitizeWatchoutsForArticle(chosen, art);
    }
  }

  /** Edition-level short actions (not a repeat of per-story bullets). */
  function localNewsletterTakeaways(articles = []) {
    const list = (Array.isArray(articles) ? articles : []).slice(0, 8);
    const lines = [];
    const seenLine = new Set();
    const supplyEdition = editionHasSupplyChain(list);

    if (supplyEdition) {
      for (const seed of SUPPLY_CHAIN_EDITION_TAKEAWAYS) {
        if (lines.length >= 4) break;
        const line = sanitizeTakeawayLine(seed);
        const k = normalizeTipDedupeKey(line);
        if (k && !seenLine.has(k)) {
          seenLine.add(k);
          lines.push(line);
        }
      }
    }

    const seenType = new Set();
    for (const a of list) {
      const typ = String(a?.type || 'Security News').trim();
      if (seenType.has(typ)) continue;
      seenType.add(typ);
      let raw = EDITION_ACTION_BY_TYPE[typ] || EDITION_ACTION_BY_TYPE['Security News'];
      if (supplyEdition) {
        if (typ === 'Ransomware') raw = 'Patch only through IT-approved channels you trust';
        if (typ === 'Password & MFA') raw = 'Treat registry and CI tokens like live passwords';
      }
      const line = sanitizeTakeawayLine(raw);
      const k = normalizeTipDedupeKey(line);
      if (k && !seenLine.has(k)) {
        seenLine.add(k);
        lines.push(line);
      }
    }
    for (const g of GENERIC_EDITION_LINES) {
      if (lines.length >= 6) break;
      if (supplyEdition && /strong unique password|Never share MFA codes/i.test(g)) continue;
      const line = sanitizeTakeawayLine(g);
      const k = normalizeTipDedupeKey(line);
      if (k && !seenLine.has(k)) {
        seenLine.add(k);
        lines.push(line);
      }
    }
    return lines.slice(0, 6);
  }

  function mergeNlTakeawaysFromAI(rawList, articles) {
    const watchKeys = watchoutDedupeKeys(articles);
    const out = [];
    const seen = new Set();
    const list = Array.isArray(rawList) ? rawList : [];
    for (const item of list) {
      const t = sanitizeTakeawayLine(item);
      if (!t) continue;
      if (takeawayMisalignedWithSupplyEdition(t, articles)) continue;
      const k = normalizeTipDedupeKey(t);
      if (!k || seen.has(k) || watchKeys.has(k)) continue;
      seen.add(k);
      out.push(t);
      if (out.length >= 6) break;
    }
    if (out.length < 4) {
      for (const fill of localNewsletterTakeaways(articles)) {
        if (out.length >= 6) break;
        const k = normalizeTipDedupeKey(fill);
        if (!k || seen.has(k)) continue;
        seen.add(k);
        out.push(fill);
      }
    }
    return out.slice(0, 6);
  }

  /** Strip common LLM filler and hype; collapse whitespace (advisory tone). */
  function stripAdvisoryFiller(s) {
    let t = String(s || '');
    const fillers = [
      /\bit is important to note that\b\.?/gi,
      /\bit is worth noting that\b\.?/gi,
      /\bit's worth noting that\b\.?/gi,
      /\bremember that\b,?/gi,
      /\bin today's digital world\b,?/gi,
      /\bin today's world\b,?/gi,
      /\bas we all know\b,?/gi,
      /\bneedless to say\b,?/gi,
      /\bat the end of the day\b,?/gi,
      /\bin conclusion\b,?/gi,
      /\bthis article\b/gi,
      /\bthe takeaway is\b:?/gi,
      /\bhere's what you need to know\b:?/gi,
      /\bhere is what you need to know\b:?/gi,
      /^(so|now|okay|ok),?\s+/i,
      /\bbasically\b,?/gi,
      /\bactually\b,?/gi,
      /\bof course\b,?/gi,
      /\bmake no mistake\b,?/gi
    ];
    for (const re of fillers) t = t.replace(re, '');
    return t.replace(/\s{2,}/g, ' ').trim();
  }

  /** Remove hype punctuation; collapse whitespace (awareness bulletin tone). */
  function sanitizeSummaryProse(s) {
    return stripAdvisoryFiller(String(s || ''))
      .replace(/\s+/g, ' ')
      .replace(/!+/g, '')
      .trim();
  }

  /** Hard cap summary length while keeping full sentences where possible. */
  function finalizeEmployeeSummary(text, modeCfg) {
    const max = modeCfg.summaryMaxChars || 320;
    let s = sanitizeSummaryProse(text);
    if (!s) return '';
    if (s.length <= max) return s;
    const parts = s.split(/(?<=[.!?])\s+/).filter(Boolean);
    let out = '';
    for (const p of parts) {
      const piece = p.trim();
      if (!piece) continue;
      const next = out ? `${out} ${piece}` : piece;
      if (next.length > max) break;
      out = next;
    }
    if (out.length >= Math.min(48, max)) return out;
    return clampStr(s, max);
  }

  const NEWSLETTER_CHROME_SYSTEM = `${EMPLOYEE_VOICE_BLOCK}

You write masthead and edition metadata for an internal security awareness bulletin. ${STYLE_BLOCK}

${_AG}

Output: a single JSON object exactly as specified in the user message — no markdown fences, no keys beyond those requested, no nulls. Values must be tightly tied to the Stories JSON (titles, types, summaries); do not invent incidents, vendors, or controls not supported by that text.`;

  const NEWSLETTER_CHROME_FRAME_PROMPT = `Return ONLY valid JSON (no markdown). Voice: short internal security program advisory (CERT/CISA-style): factual, concise, no storytelling, no filler, no rhetorical questions, no exclamation marks.

This is REQUEST 1 OF 2 for edition chrome: masthead lines only (do not include nlTakeaways).

Keys:
- nlKicker: string, max 70 characters, Title Case. Summarize the dominant threat themes across the stories using words that actually appear in the JSON (e.g. ransomware, npm, phishing, smishing)—not generic slogans like "Cyber Awareness" or "Stay Secure".
- nlSpotlight: string, max 100 characters. One sentence stating why this edition matters now for the internal audience, grounded in the story mix (who or what workflows are most in scope).
- nlFooterBlurb: string, max 140 characters. One line: the single most important org action for this send (verify, report, patch, or channel-specific care) tied to those same stories—not a generic "think before you click" unless the edition is actually phishing-centric.

Do not use filler phrases ("it is important to note", "remember that", "in today's world", etc.) in any value.

Stories (JSON):`;

  const NEWSLETTER_CHROME_TAKEAWAYS_PROMPT = `Return ONLY valid JSON (no markdown). Voice: short internal security program advisory (CERT/CISA-style): factual, concise, no filler, no rhetorical questions, no exclamation marks.

This is REQUEST 2 OF 2 for edition chrome: edition-wide takeaway lines only.

Keys:
- nlTakeaways: array of 4 to 6 strings. Each: max ${EDITION_TAKEAWAY_MAX_CHARS} characters and max ${EDITION_TAKEAWAY_MAX_WORDS} words. Imperative staff actions.

GROUNDING RULES (strict — these are the most common failure mode):
- Every line must name a concrete behaviour, signal, channel, or action drawn from the actual Stories JSON. Generic advice ("review security practices", "monitor unusual behaviour", "stay informed", "limit access", "be vigilant") is REJECTED — rewrite to name the specific thing the story describes.
- Concrete = mentions one of: the attack vector named in the story (npm, PyPI, CI/CD, install script, postMessage hook, BEC reply chain, RDP, OAuth consent, etc.), the action a reader takes today (rotate the leaked token, freeze the affected pipeline, block the sender domain, verify the requester out-of-band, check package provenance), OR a named signal a reader could observe (unexpected dependency update, second-stage download, request for gift cards, login from new geo).
- BANNED OPENINGS unless paired with a concrete object from the stories: "Review", "Monitor", "Stay", "Be", "Limit", "Maintain", "Ensure", "Always", "Remember". Replace with imperative verbs that name the action: "Verify", "Rotate", "Pin", "Block", "Forward", "Disconnect", "Patch", "Audit", "Freeze", "Report", "Confirm by phone".
- If any story mentions npm, PyPI, registries, CI/CD, GitHub Actions, install scripts, or developer/build secrets, do NOT emit generic email-attachment or blanket password-rotation advice. Talk about the dev/build threat instead.
- SWAP TEST per line: if the line would still make sense for an unrelated threat type (phishing vs ransomware vs supply-chain), it is too generic — rewrite it.
- At least 2 of the 4–6 lines must reference a specific noun from the stories (a registry, a vendor type, a system name, a workflow stage) — not the abstract category.
- Prefer distinct actions per line (no near-duplicates). Order from highest organizational priority to supporting actions.
- Do not copy per-story watchout bullets verbatim; synthesize edition-level actions.

EXAMPLES of too-generic vs grounded (supply-chain edition):
- BAD: "Review supply chain security practices" → GOOD: "Pin dependency versions and verify package signatures before install"
- BAD: "Stay informed on package vulnerabilities" → GOOD: "Subscribe to advisories for the registries your team installs from"
- BAD: "Monitor for unusual software behavior" → GOOD: "Flag unexpected post-install scripts and outbound connections at build time"
- BAD: "Limit access to sensitive code repositories" → GOOD: "Rotate any token or secret committed to a public or shared repo"

No URLs, no emoji, no scam-style urgency. No filler phrases ("it is important to note", "remember that", "in today's world", etc.).

Stories (JSON):`;

  function buildArticleSummarizeUserPrompt(article, mode = 'balanced') {
    const modeCfg = CURATION_MODES[mode] || CURATION_MODES.balanced;
    return `You are curating one item for an internal security bulletin. Read the Content carefully before writing.

SOURCE
Title: ${article.title}
Source: ${article.source}
Date: ${article.pubDate}
Content:
${truncate([article.description, article.summary].filter(Boolean).join('\n\n') || article.title, modeCfg.maxContentChars)}

CURATION MODE: ${modeCfg.label}
Summary shape: ${modeCfg.sentenceStyle}
Hard cap: JSON field "summary" must be at most ${modeCfg.summaryMaxChars} characters including spaces (prefer shorter if complete).

TASK (request 1 of 2 — summary + metadata only; do not output watchouts)
1. Write "summary" from the Content only: what happened or what is in scope, then why the program is surfacing it. Use vocabulary that appears in the Content when you can.
2. Set "threatLevel" using the calibration in your system instructions.
3. Set "category" from the dominant mechanism in the Content (not from the title alone).

Hard rules: no URLs; no filler phrases; no exclamation marks; do not fabricate numbers, CVEs, or vendor claims absent from the Content.

Output: JSON only, no markdown. Keys allowed: summary, threatLevel, category only.`;
  }

  function buildArticleWatchoutsUserPrompt(article, mode, approvedSummary) {
    const modeCfg = CURATION_MODES[mode] || CURATION_MODES.balanced;
    const sum = String(approvedSummary || '').trim() || '(derive only from Content below)';
    return `You are writing three "What you should do" lines for the same bulletin item. Read the Content first; the Approved summary is for alignment only — do not paste it into watchouts.

SOURCE
Title: ${article.title}
Source: ${article.source}
Date: ${article.pubDate}
Content:
${truncate([article.description, article.summary].filter(Boolean).join('\n\n') || article.title, modeCfg.maxContentChars)}

Approved summary (alignment only — do not copy into watchouts): ${truncate(sum, 420)}

CURATION MODE: ${modeCfg.label}

TASK (request 2 of 2 — watchouts only)
- Output exactly three imperative lines, max ${WATCHOUT_MAX_WORDS} words and ${WATCHOUT_MAX_CHARS} characters each, no URLs, no exclamation marks.
- Order: (1) reduce exposure / prevent recurrence for this threat, (2) recognize or verify safely, (3) report or escalate per org process.
- Each line must echo at least one concrete element from the Content (channel, system, data type, attack pattern)—if you cannot, you are being too generic; rewrite.

If the content is about malicious npm or other packages, supply chain or CI/CD compromise, or theft of developer or cloud build secrets, write watchouts for engineering and pipeline risk (dependencies, lockfiles, CI tokens, approved tooling)—not generic consumer password-reset advice unless the article clearly states customer or employee account databases were breached.

${isSoftwareSupplyChainStory(article) ? `Supply-chain / dev-tooling mode (detected): all three watchouts must reference packages, registries, builds, lockfiles, CI tokens, or reporting odd installs to AppSec/IT. Do not output lines about using different passwords on each account, turning on MFA or two-step "everywhere", or changing passwords for a generic breach unless the Content explicitly describes stolen employee or customer login databases.` : ''}

Output: JSON only, no markdown. Key allowed: watchouts (array of exactly 3 strings) only.`;
  }

  /** Read-only preview of the per-article curation prompts (two sequential API requests when AI is used). */
  function previewArticleCurationPrompts(article, options = {}) {
    const mode = options.mode || 'balanced';
    const modeCfg = CURATION_MODES[mode] || CURATION_MODES.balanced;
    const stubSummary = truncate([article.description, article.summary].filter(Boolean).join(' ') || article.title, modeCfg.summaryMaxChars || 220);
    return {
      mode,
      modeLabel: modeCfg.label,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildArticleSummarizeUserPrompt(article, mode),
      systemPromptCore: SYSTEM_ARTICLE_CORE,
      userPromptCore: buildArticleSummarizeUserPrompt(article, mode),
      systemPromptWatchouts: SYSTEM_ARTICLE_WATCHOUTS,
      userPromptWatchouts: buildArticleWatchoutsUserPrompt(article, mode, stubSummary)
    };
  }

  function buildNewsletterChromeUserPromptFrame(articles = []) {
    const list = (Array.isArray(articles) ? articles : []).slice(0, 8);
    const compact = list.map(a => ({
      title: a.title,
      type: a.type,
      summary: truncate(a.summary || a.description || a.title || '', 360)
    }));
    return `${NEWSLETTER_CHROME_FRAME_PROMPT}\n${JSON.stringify(compact)}`;
  }

  function buildNewsletterChromeUserPromptTakeaways(articles = []) {
    const list = (Array.isArray(articles) ? articles : []).slice(0, 8);
    const compact = list.map(a => ({
      title: a.title,
      type: a.type,
      summary: truncate(a.summary || a.description || a.title || '', 360)
    }));
    return `${NEWSLETTER_CHROME_TAKEAWAYS_PROMPT}\n${JSON.stringify(compact)}`;
  }

  function buildNewsletterChromeUserPrompt(articles = []) {
    return `${buildNewsletterChromeUserPromptFrame(articles)}\n\n---\n\n${buildNewsletterChromeUserPromptTakeaways(articles)}`;
  }

  /** Second-stage newsletter masthead / edition JSON prompts (when AI keys are used at build time). */
  function previewNewsletterChromePrompts(articles = []) {
    return {
      systemPrompt: NEWSLETTER_CHROME_SYSTEM,
      userPrompt: buildNewsletterChromeUserPrompt(articles),
      userPromptFrame: buildNewsletterChromeUserPromptFrame(articles),
      userPromptTakeaways: buildNewsletterChromeUserPromptTakeaways(articles)
    };
  }

  // Best-effort short, filename-safe tag derived from an article. Used to
  // disambiguate per-article AI logs without leaking raw URLs into filenames.
  function _articleLogTag(article) {
    const src = String((article && (article.id || article.link || article.url || article.title)) || 'article');
    let h = 0;
    for (let i = 0; i < src.length; i++) { h = ((h << 5) - h + src.charCodeAt(i)) | 0; }
    return Math.abs(h).toString(36).slice(0, 8);
  }

  function _logArticleCall(article, phase, systemPrompt, userPrompt, response, err) {
    try {
      const AIL = window.App && window.App.AILogger;
      if (!AIL || typeof AIL.log !== 'function') return;
      AIL.log({
        name: 'summarize_' + _articleLogTag(article) + '_' + phase + '.txt',
        prompt: systemPrompt + '\n\n' + userPrompt,
        response: err ? ('ERROR: ' + (err.message || String(err))) : response
      });
    } catch (_e) { /* never throw from logging */ }
  }

  // ── Process single article ──
  async function summarizeArticle(article, options = {}, retries = 0) {
    const mode = options.mode || 'balanced';
    const modeCfg = CURATION_MODES[mode] || CURATION_MODES.balanced;
    const promptCore = buildArticleSummarizeUserPrompt(article, mode);

    try {
      if (!(config.provider === 'claude' && config.claudeKey) && !(config.provider === 'openai' && config.openaiKey)) {
        const local = localSummarize(article, mode);
        return { ...local, watchouts: sanitizeWatchoutsForArticle(local.watchouts, article), fallbackUsed: true };
      }

      let raw1;
      try {
        raw1 = config.provider === 'claude' && config.claudeKey
          ? await callClaude(promptCore, SYSTEM_ARTICLE_CORE)
          : await callOpenAI(promptCore, SYSTEM_ARTICLE_CORE);
        _logArticleCall(article, 'core', SYSTEM_ARTICLE_CORE, promptCore, raw1, null);
      } catch (e1) {
        _logArticleCall(article, 'core', SYSTEM_ARTICLE_CORE, promptCore, '', e1);
        throw e1;
      }
      const cleaned1 = raw1.replace(/```json\s*|```\s*/g, '').trim();
      const p1 = JSON.parse(cleaned1);
      const summaryRaw = p1.summary != null ? String(p1.summary) : '';
      const summaryDone = summaryRaw ? finalizeEmployeeSummary(summaryRaw, modeCfg) : '';

      await App.Utils.wait(220);
      const promptWo = buildArticleWatchoutsUserPrompt(article, mode, summaryDone);
      let watchoutsArr = [];
      try {
        let raw2;
        try {
          raw2 = config.provider === 'claude' && config.claudeKey
            ? await callClaude(promptWo, SYSTEM_ARTICLE_WATCHOUTS)
            : await callOpenAI(promptWo, SYSTEM_ARTICLE_WATCHOUTS);
          _logArticleCall(article, 'watchouts', SYSTEM_ARTICLE_WATCHOUTS, promptWo, raw2, null);
        } catch (e2) {
          _logArticleCall(article, 'watchouts', SYSTEM_ARTICLE_WATCHOUTS, promptWo, '', e2);
          throw e2;
        }
        const cleaned2 = raw2.replace(/```json\s*|```\s*/g, '').trim();
        const p2 = JSON.parse(cleaned2);
        watchoutsArr = Array.isArray(p2.watchouts) ? p2.watchouts : [];
      } catch (_w) {
        watchoutsArr = [];
      }

      return {
        summary: summaryDone || null,
        watchouts: sanitizeWatchoutsForArticle(watchoutsArr, article),
        threatLevel: typeof p1.threatLevel === 'number' ? Math.min(5, Math.max(1, p1.threatLevel)) : null,
        category: p1.category || null,
        confidence: typeof p1.confidence === 'number' ? Math.max(0, Math.min(1, p1.confidence)) : 0.86,
        fallbackUsed: false
      };
    } catch (e) {
      if (retries < config.retryAttempts) { await App.Utils.wait(config.retryDelayMs * (retries + 1)); return summarizeArticle(article, options, retries + 1); }
      log(`⚠ AI failed for "${article.title.slice(0, 40)}…" — using local`, 'log-err');
      const local = localSummarize(article, mode);
      return { ...local, watchouts: sanitizeWatchoutsForArticle(local.watchouts, article), fallbackUsed: true };
    }
  }

  // ── Batch process ──
  async function summarizeAll(articles, onProgress = null, options = {}) {
    const total = articles.length;
    let completed = 0;
    const mode = options.mode || 'balanced';
    const useAI = (config.provider === 'claude' && config.claudeKey) || (config.provider === 'openai' && config.openaiKey);
    log(useAI ? `✦ AI summaries active (${config.provider.toUpperCase()}/${mode}) — ${total} articles…` : `Local summaries (${mode}) — ${total} articles…`, useAI ? 'log-ai' : '');

    const queue = [...articles];
    async function processNext() {
      if (!queue.length) return;
      const art = queue.shift();
      try {
        const r = await summarizeArticle(art, { mode });
        if (r.summary) art.summary = r.summary;
        if (r.watchouts) art.watchouts = r.watchouts;
        if (r.threatLevel) art.threatLevel = r.threatLevel;
        if (r.category && art.type === 'Security News') art.type = r.category;
        art.aiProcessed = useAI;
        art.curationMeta = {
          mode,
          confidence: typeof r.confidence === 'number' ? r.confidence : (useAI ? 0.86 : 0.5),
          fallbackUsed: !!r.fallbackUsed,
          provider: useAI ? config.provider : 'local',
          updatedAt: new Date().toISOString()
        };
        completed++;
        log(`✓ [${completed}/${total}] ${art.title.slice(0, 45)}…`, 'log-ok');
        if (onProgress) onProgress(completed, total, art);
      } catch (e) { completed++; log(`✗ [${completed}/${total}] Failed`, 'log-err'); }
    }

    // Multi-threaded workers for parallel processing
    const concurrency = useAI ? config.maxConcurrent : 20; // local is instant, crank it up
    log(`⚡ ${concurrency} concurrent workers processing…`, 'log-ai');
    async function worker(wid) {
      while (queue.length) {
        await processNext();
        if (useAI) await App.Utils.wait(300); // rate-limit API calls
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, total) }, (_, i) => worker(i + 1)));

    dedupeWatchoutsAcrossArticles(articles);
    log(`✓ Done: ${completed}/${total} articles processed`, 'log-ok');
    return articles;
  }

  function isAIAvailable() {
    return (config.provider === 'claude' && !!config.claudeKey) || (config.provider === 'openai' && !!config.openaiKey);
  }

  function clampStr(s, max) {
    const t = String(s || '').trim().replace(/\s+/g, ' ');
    if (t.length <= max) return t;
    return `${t.slice(0, Math.max(0, max - 1)).trim()}…`;
  }

  /** Short masthead/footer lines derived from selected articles (no org/portal names). */
  function localNewsletterChrome(articles = []) {
    const list = Array.isArray(articles) ? articles : [];
    const types = [...new Set(list.map(a => String(a?.type || '').trim()).filter(Boolean))].slice(0, 4);
    const nlKicker = types.length ? types.join(' · ') : 'This week\'s security headlines';
    const lead = list[0];
    let nlSpotlight = 'Curated themes from the stories in this edition.';
    if (lead && lead.title) {
      nlSpotlight = `This week: ${clampStr(lead.title, 88)}`;
    }
    const t0 = types[0] || 'these risks';
    const nlFooterBlurb = list.length <= 1
      ? `Stay alert on ${t0.toLowerCase()}: forward anything unusual to security below.`
      : 'These stories share a theme—verify requests, use MFA, and report odd messages to security.';
    return {
      nlKicker: clampStr(nlKicker, 72),
      nlSpotlight: clampStr(nlSpotlight, 100),
      nlFooterBlurb: clampStr(nlFooterBlurb, 140),
      nlTakeaways: localNewsletterTakeaways(list)
    };
  }

  async function fetchNewsletterChromeMessage(userContent, maxTokens = 520, logTag = 'chrome') {
    let raw = '';
    let thrown = null;
    try {
      if (config.provider === 'claude' && config.claudeKey) {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.claudeKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: config.claudeModel,
            max_tokens: maxTokens,
            temperature: 0.15,
            system: NEWSLETTER_CHROME_SYSTEM,
            messages: [{ role: 'user', content: userContent }]
          })
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const d = await resp.json();
        raw = d.content?.[0]?.text || '';
        return raw;
      }
      if (config.provider === 'openai' && config.openaiKey) {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.openaiKey}` },
          body: JSON.stringify(openAIChatCompletionsBody(NEWSLETTER_CHROME_SYSTEM, userContent, maxTokens, 0.08))
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const d = await resp.json();
        raw = d.choices?.[0]?.message?.content || '';
        return raw;
      }
      throw new Error('No API key');
    } catch (err) {
      thrown = err;
      throw err;
    } finally {
      try {
        const AIL = window.App && window.App.AILogger;
        if (AIL && typeof AIL.log === 'function') {
          AIL.log({
            name: 'chrome_' + String(logTag || 'call') + '.txt',
            prompt: NEWSLETTER_CHROME_SYSTEM + '\n\n' + userContent,
            response: thrown ? ('ERROR: ' + (thrown.message || String(thrown))) : raw
          });
        }
      } catch (_e) { /* never throw from logging */ }
    }
  }

  async function newsletterChrome(articles = [], options = {}, retries = 0) {
    const list = (Array.isArray(articles) ? articles : []).slice(0, 8);
    if (!list.length) return localNewsletterChrome(list);
    const base = localNewsletterChrome(list);
    try {
      const rawFrame = await fetchNewsletterChromeMessage(buildNewsletterChromeUserPromptFrame(list), 420, 'frame');
      const cleaned1 = String(rawFrame).replace(/```json\s*|```\s*/g, '').trim();
      const p1 = JSON.parse(cleaned1);

      await App.Utils.wait(220);
      let mergedTakeaways = base.nlTakeaways;
      try {
        const rawTake = await fetchNewsletterChromeMessage(buildNewsletterChromeUserPromptTakeaways(list), 520, 'takeaways');
        const cleaned2 = String(rawTake).replace(/```json\s*|```\s*/g, '').trim();
        const p2 = JSON.parse(cleaned2);
        mergedTakeaways = mergeNlTakeawaysFromAI(p2.nlTakeaways, list);
      } catch {
        mergedTakeaways = base.nlTakeaways;
      }

      return {
        nlKicker: clampStr(sanitizeSummaryProse(p1.nlKicker || ''), 72) || base.nlKicker,
        nlSpotlight: clampStr(sanitizeSummaryProse(p1.nlSpotlight || ''), 100) || base.nlSpotlight,
        nlFooterBlurb: clampStr(sanitizeSummaryProse(p1.nlFooterBlurb || ''), 140) || base.nlFooterBlurb,
        nlTakeaways: mergedTakeaways.length >= 4 ? mergedTakeaways : base.nlTakeaways
      };
    } catch {
      if (retries < config.retryAttempts) {
        await App.Utils.wait(config.retryDelayMs * (retries + 1));
        return newsletterChrome(articles, options, retries + 1);
      }
      return localNewsletterChrome(list);
    }
  }

  /**
   * Internal helpers exposed for sibling files in `js/ai/*.js`.
   * Sibling AI files reach the live config via `App.AISummarizer._internals.config`
   * (it's a GETTER — re-read each call so configure() updates are seen),
   * and other helpers via the same `_internals` object.
   *
   * Contract:
   *   - Anything a future ai-sibling file might need from inside this IIFE
   *     MUST be listed here before the sibling can use it.
   *   - `config` is a live getter; treat as mutable shared state.
   *   - All other entries are stateless functions or string constants.
   *   - Keep additions appended; do not remove without checking all
   *     js/ai/*.js consumers.
   *
   * Categories:
   *   Config:                   config (live getter)
   *   Network adapters:         callTemplateSlotsAI
   *   AI gate:                  isAIAvailable
   *   Bank-page support:        scoreBankPageIntro, scoreBankPageBullets,
   *                             sanitizeBankPageBullet, localBankPageSlots
   *   Bank-page system prompts: BANKPAGE_SLOTS_SYSTEM, BANKPAGE_INTRO_SYSTEM,
   *                             BANKPAGE_SECTION{1,2,3}_SYSTEM,
   *                             BANKPAGE_IMPACT_ORG_SYSTEM,
   *                             BANKPAGE_NEXT_STEPS_SYSTEM,
   *                             BANKPAGE_IMPACT_GENERAL_SYSTEM,
   *                             BANKPAGE_REMEMBER_SYSTEM
   *   Bank-page prompt builders: buildBankPageUserPrompt,
   *                             buildBankPageIntroPrompt,
   *                             buildBankPageSection{1,2,3}Prompt,
   *                             buildBankPageImpactOrgPrompt,
   *                             buildBankPageNextStepsPrompt,
   *                             buildBankPageImpactGeneralPrompt,
   *                             buildBankPageRememberPrompt
   */
  // Live getter — returns whichever function/value AIPromptBuilders currently
  // exposes. AIPromptBuilders loads AFTER ai_summarizer per script order, so
  // a static reference at IIFE time would be undefined.
  function _pbGet(name) {
    return function (...args) {
      const PB = window.App && window.App.AIPromptBuilders;
      if (!PB || typeof PB[name] !== 'function') {
        throw new Error('[ai_summarizer] App.AIPromptBuilders.' + name + ' not loaded; check script order');
      }
      return PB[name](...args);
    };
  }

  const _internals = {
    // Config object (mutable shared state)
    get config() { return config; },
    // Curation modes are read by prompt_builders sibling via live getter.
    get CURATION_MODES() { return CURATION_MODES; },
    // Network adapters used by sibling AI modules
    callTemplateSlotsAI,
    // AI availability gate
    isAIAvailable,
    // Bank-page support kept in main (used by bank-page ensemble sibling)
    scoreBankPageIntro, scoreBankPageBullets,
    sanitizeBankPageBullet, localBankPageSlots,
    // Bank-page system prompts (kept in main)
    BANKPAGE_SLOTS_SYSTEM, BANKPAGE_INTRO_SYSTEM,
    BANKPAGE_SECTION1_SYSTEM, BANKPAGE_SECTION2_SYSTEM, BANKPAGE_SECTION3_SYSTEM,
    BANKPAGE_IMPACT_ORG_SYSTEM, BANKPAGE_NEXT_STEPS_SYSTEM,
    BANKPAGE_IMPACT_GENERAL_SYSTEM, BANKPAGE_REMEMBER_SYSTEM,
    // Bank-page builders now live in js/ai/prompt_builders.js. The destructure
    // inside bank_page_ensemble's IIFE binds these as live function references
    // at sibling-load time (after prompt_builders has loaded).
    buildBankPageUserPrompt:           _pbGet('buildBankPageUserPrompt'),
    buildBankPageIntroPrompt:          _pbGet('buildBankPageIntroPrompt'),
    buildBankPageSection1Prompt:       _pbGet('buildBankPageSection1Prompt'),
    buildBankPageSection2Prompt:       _pbGet('buildBankPageSection2Prompt'),
    buildBankPageSection3Prompt:       _pbGet('buildBankPageSection3Prompt'),
    buildBankPageImpactOrgPrompt:      _pbGet('buildBankPageImpactOrgPrompt'),
    buildBankPageNextStepsPrompt:      _pbGet('buildBankPageNextStepsPrompt'),
    buildBankPageImpactGeneralPrompt:  _pbGet('buildBankPageImpactGeneralPrompt'),
    buildBankPageRememberPrompt:       _pbGet('buildBankPageRememberPrompt')
  };

  return {
    EMPLOYEE_VOICE_BLOCK,
    _internals,
    configure,
    getConfig,
    summarizeArticle,
    summarizeAll,
    localSummarize,
    generateTips,
    previewArticleCurationPrompts,
    previewNewsletterChromePrompts,
    previewNewsletterTemplateSlotsPrompts,
    validateArticleCoherence,
    regenerateSelection,
    fillNewsletterTextSlots,
    isAIAvailable,
    localNewsletterChrome,
    newsletterChrome,
    localNewsletterTakeaways,
    sanitizeWatchoutsForArticle,
    sanitizeEmployeeTip,
    stripLeadingGreeting,
    sanitizeBankPageIntro,
    scoreBankPageIntro,
    scoreBankPageBullets,
    sanitizeTemplateSlotLine,
    sanitizeTakeawayLine,
    dedupeWatchoutsAcrossArticles,
    finalizeEmployeeSummary,
    mergeNlTakeawaysFromAI,
    localCybershieldThreat,
    localCybershieldRedFlags
  };
})();
