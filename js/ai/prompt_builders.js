/* ═══════════════════════════════════════════════════════════
   ai/prompt_builders.js — pure prompt-construction functions
   Extracted from ai_summarizer.js. Pure functions over article objects;
   no network, no state. Exposes window.App.AIPromptBuilders with:
     bankPageCompactArticles(articles)
     buildBankPageUserPrompt(articles, mode)
     buildBankPageIntroPrompt(articles, mode)
     buildBankPageSection1Prompt(articles, mode)
     buildBankPageSection2Prompt(articles, mode)
     buildBankPageSection3Prompt(articles, mode)
     buildBankPageImpactOrgPrompt(articles, mode)
     buildBankPageNextStepsPrompt(articles, mode)
     buildBankPageImpactGeneralPrompt(articles, mode)
     buildBankPageRememberPrompt(articles, mode)

   Depends on App.AISummarizer._internals.CURATION_MODES (live getter) and
   App.Utils.truncate. Bank-page ensemble (js/ai/bank_page_ensemble.js)
   continues to destructure these from App.AISummarizer._internals, which
   itself proxies to this sibling — so the existing sibling contract is
   preserved bit-for-bit.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const AS = window.App && window.App.AISummarizer;
  if (!AS || !AS._internals) {
    console.error('[ai/prompt_builders] App.AISummarizer._internals is unavailable; check script load order.');
    return;
  }
  const I = AS._internals;
  const Utils = (window.App && window.App.Utils) || {};
  const truncate = Utils.truncate || ((s) => String(s == null ? '' : s));

  // CURATION_MODES is exposed by main via _internals — read it live each call
  // so a future change to the modes object propagates immediately.
  function _modes() { return I.CURATION_MODES || {}; }
  function _modeCfg(mode) {
    const m = _modes();
    return m[mode] || m.balanced || { label: mode || 'balanced' };
  }

  function bankPageCompactArticles(articles) {
    return (Array.isArray(articles) ? articles : []).slice(0, 6).map(a => ({
      title: a.title,
      source: a.source,
      type: a.type,
      pubDate: a.pubDate,
      summary: truncate(a.summary || a.description || '', 600)
    }));
  }

  function buildBankPageUserPrompt(articles, mode) {
    const modeCfg = _modeCfg(mode);
    const compact = (Array.isArray(articles) ? articles : []).slice(0, 6).map(a => ({
      title: a.title,
      source: a.source,
      type: a.type,
      pubDate: a.pubDate,
      summary: truncate(a.summary || a.description || '', 600)
    }));
    return `You are writing four specific sections for one issue of an internal security awareness bulletin. Audience: general office staff with no IT or cybersecurity background. The topic of this edition is whatever the articles below describe — do not assume phishing or any other category in advance.

ARTICLES (full context — every line you write must be supported by these facts):
${JSON.stringify(compact)}

CURATION MODE: ${modeCfg.label}

Return JSON exactly as the schema in your system instructions requires. Section-specific rules below.

────────────
SECTION 1 — "intro" (one paragraph that immediately follows the salutation "Dear Colleague,")
- 2 or 3 sentences, max 55 words total.
- Name what the attackers / criminals / scammers in these specific articles are doing right now. The behaviour MUST come from the article summaries (whether that is impersonating IT, faking delivery texts, deploying ransomware, poisoning npm packages, exploiting a CVE, exfiltrating data, etc.). Use plain words like "attackers", "scammers", "criminals", "fraudsters". Do not use "threat actors", "adversaries", "TTPs", or any jargon.
- Last sentence: a short, calm reason this matters for the reader personally — again grounded in what the articles describe, not generic.
- No bullet points. No URLs. No exclamation marks.

────────────
SECTION 2 — "section1Bullets" — exactly 4 bullets under "How to spot a fraudulent message"
- Target distribution: 2 red flags per article when there are 2 articles. If one article does not yield 2 distinct red flags without forcing it, split 3-and-1 instead. Quality of each bullet beats strict distribution.
- Each bullet is a concrete signal a reader could notice in their own inbox, browser, phone, dev environment, or workflow — drawn directly from the tactic the matching article describes. If the article is about phishing, write phishing signals; if it is about a malicious package, write package/build signals; if it is about smishing, write SMS signals; etc.
- Max 16 words, max 110 characters per bullet. No bullet may be generic enough to apply to an unrelated article.

────────────
SECTION 3 — "section2Bullets" — exactly 3 bullets under "What you should remember"
- The 3 most important things readers must remember in light of these articles taken together. Pick the obvious, high-leverage lessons that match the actual threat mix of this edition.
- Must draw on both articles. One bullet may combine the lesson from both; the other two should each anchor in at least one article.
- Max 18 words, max 130 characters per bullet. Plain language.

────────────
SECTION 4 — "section3Bullets" — exactly 3 bullets under "Stay safe"
- Direct, immediate actions a reader can take today, tied to the threats in these specific articles. The action must match the article: verify a sender for phishing, lock down package install workflows for supply-chain stories, change a leaked credential for breach stories, report a suspicious text for smishing, patch a specific advisory if named in the article, etc.
- Each bullet must reference something specific from the articles — not generic "be vigilant" advice.
- Max 16 words, max 110 characters per bullet.

Rules across all four sections: no URLs, no exclamation marks, no rhetorical questions, no scam-style urgency, no filler phrases, no topic assumptions beyond what the articles state. Output JSON only — no markdown fences, no commentary.`;
  }

  function buildBankPageIntroPrompt(articles, mode) {
    const modeCfg = _modeCfg(mode);
    return `Write the "intro" paragraph for this newsletter edition.

ARTICLES (full context — every line you write must be supported by these facts):
${JSON.stringify(bankPageCompactArticles(articles))}

CURATION MODE: ${modeCfg.label}

Rules:
- One paragraph, 2 or 3 sentences, max 55 words total.
- Name what the attackers / criminals / scammers in these specific articles are doing right now. The behaviour MUST come from the article summaries.
- Last sentence: a short, calm reason this matters for the reader personally — grounded in what the articles describe, not generic.
- No bullet points. No URLs. No exclamation marks. No greeting (the salutation is rendered separately).

Output: { "intro": "string" } only.`;
  }

  function buildBankPageSection1Prompt(articles, mode) {
    const modeCfg = _modeCfg(mode);
    return `Write "section1Bullets" — exactly 4 bullets under "How to spot a fraudulent message".

ARTICLES (full context — every line you write must be supported by these facts):
${JSON.stringify(bankPageCompactArticles(articles))}

CURATION MODE: ${modeCfg.label}

Rules:
- Exactly 4 bullets. Each is a concrete signal a reader could notice in their own inbox, browser, phone, dev environment, or workflow — drawn directly from the tactic the matching article describes.
- Max 16 words, max 110 characters per bullet. No bullet may be generic enough to apply to an unrelated article.
- Target distribution: 2 red flags per article when there are 2 articles. If one article does not yield 2 distinct red flags, split 3-and-1.

Output: { "section1Bullets": ["...","...","...","..."] } only.`;
  }

  function buildBankPageSection2Prompt(articles, mode) {
    const modeCfg = _modeCfg(mode);
    return `Write "section2Bullets" — exactly 3 bullets under "What you should remember".

ARTICLES (full context — every line you write must be supported by these facts):
${JSON.stringify(bankPageCompactArticles(articles))}

CURATION MODE: ${modeCfg.label}

Rules:
- Exactly 3 bullets. The 3 most important things readers must remember in light of these articles taken together. Pick the obvious, high-leverage lessons.
- Must draw on both articles. One bullet may combine the lesson from both; the other two should each anchor in at least one article.
- Max 18 words, max 130 characters per bullet. Plain language.

Output: { "section2Bullets": ["...","...","..."] } only.`;
  }

  function buildBankPageSection3Prompt(articles, mode) {
    const modeCfg = _modeCfg(mode);
    return `Write "section3Bullets" — exactly 3 bullets under "Stay safe".

ARTICLES (full context — every line you write must be supported by these facts):
${JSON.stringify(bankPageCompactArticles(articles))}

CURATION MODE: ${modeCfg.label}

Rules:
- Exactly 3 bullets. Direct, immediate actions a reader can take today, tied to the threats in these specific articles.
- The action must match the article: verify a sender for phishing, lock down package install workflows for supply-chain stories, change a leaked password for breach stories, report a suspicious text for smishing, patch a specific advisory if named in the article, etc.
- Each bullet must reference something specific from the articles — not generic "be vigilant" advice.
- Max 16 words, max 110 characters per bullet.

Output: { "section3Bullets": ["...","...","..."] } only.`;
  }

  function buildBankPageImpactOrgPrompt(articles, mode) {
    const modeCfg = _modeCfg(mode);
    return `Write "Impact on our organisation" — exactly 3 bullets.

ARTICLES (full context — every line you write must be supported by these facts):
${JSON.stringify(bankPageCompactArticles(articles))}

CURATION MODE: ${modeCfg.label}

STEP 1 (silent): Identify the dominant threat type in the articles (phishing, ransomware, smishing, supply-chain compromise, data breach, scam & fraud, vulnerability, insider risk, etc.).

STEP 2: Write 3 bullets that could ONLY apply to that specific threat type landing inside our company — people, data, finance, customer-facing services, dev pipelines, vendor relationships, etc.

SWAP TEST: if a bullet would still make sense when applied to an unrelated threat type, rewrite it to be more specific. Reject generic "cyber attacks could hurt us" platitudes.

Rules:
- Exactly 3 bullets. Each grounded in the article's specific threat.
- Max 16 words, max 110 characters per bullet.

Output: { "bullets": ["...","...","..."] } only.`;
  }

  function buildBankPageNextStepsPrompt(articles, mode) {
    const modeCfg = _modeCfg(mode);
    return `Write "Next Steps (If Affected)" — exactly 3 bullets.

ARTICLES (full context — every line you write must be supported by these facts):
${JSON.stringify(bankPageCompactArticles(articles))}

CURATION MODE: ${modeCfg.label}

STEP 1 (silent): Identify the dominant threat type in the articles (phishing, ransomware, smishing, supply-chain, data breach, vulnerability, scam & fraud, insider risk, etc.).

STEP 2: Write 3 immediate actions a reader can take RIGHT NOW if they think this specific threat has hit them. Match each action to the threat type:
- Phishing → change login details from a clean device, forward the message to SOC, watch for follow-on emails.
- Ransomware → disconnect the device from network, call IT/SOC, do not pay or click any pop-up.
- Smishing → do not reply, do not tap links, block and report the number.
- Supply-chain → freeze the affected pipeline, rotate any exposed tokens, alert AppSec.
- Data breach → change passwords for the exposed service, enable MFA, monitor for fraud.

Treat the reader as potentially affected. Be direct and concrete.

Rules:
- Exactly 3 bullets, each tied to the article's specific threat.
- Max 16 words, max 110 characters per bullet.

Output: { "bullets": ["...","...","..."] } only.`;
  }

  function buildBankPageImpactGeneralPrompt(articles, mode) {
    const modeCfg = _modeCfg(mode);
    return `Write "Impact in general" — exactly 3 bullets.

ARTICLES (full context — every line you write must be supported by these facts):
${JSON.stringify(bankPageCompactArticles(articles))}

CURATION MODE: ${modeCfg.label}

STEP 1 (silent): Identify the dominant threat type in the articles.

STEP 2: Write 3 bullets describing the broader INDUSTRY / SECTOR / SOCIETAL impact of THAT specific threat type — not our company, not generic "cybercrime is bad". Anchor each bullet in numbers, sectors, or scale that are plausible for this threat type (drawn from what the articles state or generally true for this category).

SWAP TEST: each bullet should make less sense if you replaced the threat type with an unrelated one. Reject "cyber threats are growing" filler.

Rules:
- Exactly 3 bullets, each grounded in the article's specific threat.
- Max 16 words, max 110 characters per bullet.

Output: { "bullets": ["...","...","..."] } only.`;
  }

  function buildBankPageRememberPrompt(articles, mode) {
    const modeCfg = _modeCfg(mode);
    return `Write "What you should remember" — exactly 3 bullets.

ARTICLES (full context — every line you write must be supported by these facts):
${JSON.stringify(bankPageCompactArticles(articles))}

CURATION MODE: ${modeCfg.label}

STEP 1 (silent): Identify the dominant threat type in the articles.

STEP 2: Write the 3 most important things readers should still remember a week from now about THIS specific threat type. Each takeaway must be the kind of thing they'd recall when next facing that exact situation — e.g., for phishing: "the sender domain is always your first check"; for ransomware: "disconnect first, decide later"; for smishing: "carriers never ask for login details by text".

SWAP TEST: a takeaway that would still apply to an unrelated threat is too generic — rewrite it. Reject "stay vigilant" / "security is everyone's job" / "passwords matter" platitudes.

Rules:
- Exactly 3 bullets, each anchored to the article's specific threat.
- Max 18 words, max 130 characters per bullet. Plain language.

Output: { "bullets": ["...","...","..."] } only.`;
  }

  window.App = window.App || {};
  window.App.AIPromptBuilders = {
    bankPageCompactArticles,
    buildBankPageUserPrompt,
    buildBankPageIntroPrompt,
    buildBankPageSection1Prompt,
    buildBankPageSection2Prompt,
    buildBankPageSection3Prompt,
    buildBankPageImpactOrgPrompt,
    buildBankPageNextStepsPrompt,
    buildBankPageImpactGeneralPrompt,
    buildBankPageRememberPrompt
  };
})();
