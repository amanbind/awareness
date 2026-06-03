# Plan — Bank-page AI prompt: current vs pre-session original (inspect only)

## Context

User asked to see the prompt currently being sent to the LLM when AI fills the bank-page template, and compare it against what the same prompt looked like before this multi-task session of iterations began. Scope is **bank-page only** (the three bank-page templates: `bankpage1_static`, `bankpage1_dynamic`, `phishingbrief`). No action — pure inspection.

What gets sent on every bank-page Generate (when AI keys are configured): one POST to the configured API with:

- `system` field = `BANKPAGE_SLOTS_SYSTEM` (which itself interpolates `EMPLOYEE_VOICE_BLOCK` and `STYLE_BLOCK`)
- `messages[0].content` = output of `buildBankPageUserPrompt(selectedArticles, mode)`

Files: [js/ai_summarizer.js](c:\Users\hp\OneDrive\Desktop\awareness\js\ai_summarizer.js)

- `EMPLOYEE_VOICE_BLOCK` — line 44
- `STYLE_BLOCK` — line 46
- `BANKPAGE_SLOTS_SYSTEM` — line 725
- `buildBankPageUserPrompt` — line 754

Pre-session original is reconstructed from the Edit tool's captured `old_string` values in this session's tool-call history. No git history is available in this workspace.

---

## 1. `STYLE_BLOCK` (interpolated into the system prompt)

### Current — line 46-59

```
You are the lead editor for an internal organization-wide security awareness bulletin (technical and non-technical readers).
Voice: CERT / CISA–style operational awareness — calm, factual, concise. Not marketing, not tabloid, not "thought leadership".

STYLE (mandatory):
- Professional, neutral, present tense where natural. No narrative, anecdotes, metaphors, or "story" framing.
- No filler or throat-clearing. Never use: "it is important to note", … (long forbidden-phrase list)
- Plain-language substitution: never use the word "credentials". Say "login details" or "username and password" instead. This applies in every section, every bullet, every sentence — no exceptions.
- No rhetorical questions, exclamation marks, hype, jokes, slang, tabloid tone, or vendor/marketing voice.
- Forbidden in JSON values: URLs, scam-style urgency.

GROUNDING (mandatory): … (unchanged)
```

### Original (pre-session)

Same as current **minus the "Plain-language substitution" bullet**. That single line is the only addition in `STYLE_BLOCK` this session.

### Net change

- 1 line: `"credentials"` plain-language rule.

---

## 2. `BANKPAGE_SLOTS_SYSTEM`

### Current — line 725-743

```
${EMPLOYEE_VOICE_BLOCK}

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
}
```

### Original (pre-session)

```
${EMPLOYEE_VOICE_BLOCK}

You are filling four sections of an internal security-awareness newsletter for all staff. The threat topic of this edition is determined entirely by the articles in the user message — it may be phishing, ransomware, supply-chain compromise, data breach, smishing, scams, vulnerabilities, insider risk, or any mix. Do not assume any topic; let the articles dictate the focus. Ground every line in those articles — never invent facts, vendors, victims, statistics, CVEs, or details not present there. Paraphrase what the attackers in the articles are actually doing, then translate that into practical guidance for non-technical readers.

${STYLE_BLOCK}

Output: a single JSON object with exactly these keys (no markdown fences, no extra keys, no nulls):
{
  "intro": "string — see SECTION 1 in user message",
  "section1Bullets": ["...", "...", "...", "..."],
  "section2Bullets": ["...", "...", "..."],
  "section3Bullets": ["...", "...", "..."]
}
```

### Net changes

1. **"or any mix"** removed from the topic-list sentence (now reads "… insider risk, **etc.**").
2. **New CRITICAL paragraph** added: "Every article in this edition MUST cover exactly the same threat type … One edition = one threat."
3. **New vendor-PR paragraph** added: "Do not select vendor product announcements, press releases … reject it regardless of topic relevance."
4. The grounding sentence ("Ground every line in those articles …") is now its own paragraph, separated by blank lines from the topic-list and vendor blocks.

---

## 3. `buildBankPageUserPrompt` — SECTION 1 ("intro") block

The function takes the user's selected articles, serialises them, and emits a multi-section instruction with the article JSON inline. The whole function was ~50 lines; only the SECTION 1 block changed.

### Current — line 773-776

```
SECTION 1 — "intro" (one paragraph that immediately follows the salutation "Dear Colleague,")
- Write one sentence only. Cover one threat. Do not summarise multiple topics. Maximum 30 words.
- Name what the attackers / criminals / scammers in these specific articles are doing right now. The behaviour MUST come from the article summaries (whether that is impersonating IT, faking delivery texts, deploying ransomware, poisoning npm packages, exploiting a CVE, exfiltrating data, etc.). Use plain words like "attackers", "scammers", "criminals", "fraudsters". Do not use "threat actors", "adversaries", "TTPs", or any jargon.
- No bullet points. No URLs. No exclamation marks.
```

### Original (pre-session)

```
SECTION 1 — "intro" (one paragraph that immediately follows the salutation "Dear Colleague,")
- 2 or 3 sentences, max 55 words total.
- The behaviour MUST come from the article summaries (whether that is impersonating IT, faking delivery texts, deploying ransomware, poisoning npm packages, exploiting a CVE, exfiltrating data, etc.). Use plain words like "attackers", "scammers", "criminals", "fraudsters". Do not use "threat actors", "adversaries", "TTPs", or any jargon.
- Last sentence: a short, calm reason this matters for the reader personally — again grounded in what the articles describe, not generic.
- No bullet points. No URLs. No exclamation marks.
```

### Net changes

1. First bullet swapped: `"2 or 3 sentences, max 55 words total."` → `"Write one sentence only. Cover one threat. Do not summarise multiple topics. Maximum 30 words."`
2. Third bullet (`"Last sentence: a short, calm reason this matters for the reader personally …"`) removed entirely — no longer applies since the intro is now a single sentence.
3. SECTIONS 2, 3, 4 and the "Rules across all four sections" closer at the bottom of the prompt are **unchanged** from the pre-session state.

---

## Summary table

| Block                               | Pre-session size            | Current size                                           | Direction                         |
| ----------------------------------- | --------------------------- | ------------------------------------------------------ | --------------------------------- |
| `STYLE_BLOCK`                       | 13 lines                    | 14 lines                                               | +1 bullet (no-"credentials" rule) |
| `BANKPAGE_SLOTS_SYSTEM` body        | 1 paragraph topic+grounding | 4 paragraphs: topic / CRITICAL / vendor-PR / grounding | +2 paragraphs, ~110 added words   |
| `buildBankPageUserPrompt` SECTION 1 | 4 bullets, ~85-word target  | 3 bullets, 30-word hard cap                            | tighter scope, shorter output     |

Token-cost direction (per Generate, when AI is on): the system prompt is ~120 words longer than original; user prompt is roughly the same length but instructs a shorter answer, so output tokens shrink slightly. Net input cost up a little, output cost down slightly.

Note: a brand-new `validateArticleCoherence` LLM call now runs **before** this bank-page prompt on every Generate with ≥2 selected articles. It is a separate round-trip with its own prompt — not part of "the bank-page prompt" comparison above, but worth flagging because it adds one (sometimes two) extra API calls per Generate that did not exist pre-session.

---

## Action — revert SECTION 1 intro only (everything else stays as-is)

After seeing the comparison, user chose to roll back **only** the SECTION 1 intro spec to its pre-session wording. Keep `STYLE_BLOCK` "credentials" rule, keep `BANKPAGE_SLOTS_SYSTEM` CRITICAL + vendor-PR blocks, keep `validateArticleCoherence`. Single targeted edit.

### File and edit

[js/ai_summarizer.js](c:\Users\hp\OneDrive\Desktop\awareness\js\ai_summarizer.js), inside `buildBankPageUserPrompt`, the four lines starting at the `SECTION 1 — "intro"` block (currently lines 773-776).

**Replace this current block:**

```
SECTION 1 — "intro" (one paragraph that immediately follows the salutation "Dear Colleague,")
- Write one sentence only. Cover one threat. Do not summarise multiple topics. Maximum 30 words.
- Name what the attackers / criminals / scammers in these specific articles are doing right now. The behaviour MUST come from the article summaries (whether that is impersonating IT, faking delivery texts, deploying ransomware, poisoning npm packages, exploiting a CVE, exfiltrating data, etc.). Use plain words like "attackers", "scammers", "criminals", "fraudsters". Do not use "threat actors", "adversaries", "TTPs", or any jargon.
- No bullet points. No URLs. No exclamation marks.
```

**With the original pre-session block:**

```
SECTION 1 — "intro" (one paragraph that immediately follows the salutation "Dear Colleague,")
- 2 or 3 sentences, max 55 words total.
- Name what the attackers / criminals / scammers in these specific articles are doing right now. The behaviour MUST come from the article summaries (whether that is impersonating IT, faking delivery texts, deploying ransomware, poisoning npm packages, exploiting a CVE, exfiltrating data, etc.). Use plain words like "attackers", "scammers", "criminals", "fraudsters". Do not use "threat actors", "adversaries", "TTPs", or any jargon.
- Last sentence: a short, calm reason this matters for the reader personally — again grounded in what the articles describe, not generic.
- No bullet points. No URLs. No exclamation marks.
```

### What stays untouched

- `STYLE_BLOCK` plain-language "credentials" rule (line 52) — stays.
- `BANKPAGE_SLOTS_SYSTEM` CRITICAL block and vendor-PR block — stay.
- `validateArticleCoherence` and its wiring into `fillNewsletterTextSlots` — stay.
- All SECTION 2, 3, 4 specs and the closing "Rules across all four sections" paragraph — stay.

### Verification

1. After the edit, `grep -n "2 or 3 sentences, max 55 words total" js/ai_summarizer.js` should return exactly one line inside `buildBankPageUserPrompt`.
2. `grep -n "Write one sentence only" js/ai_summarizer.js` should return zero matches.
3. `npm run lint` → exit 0.
4. `npm run test:unit` → 46/46 pass.

No E2E or backups needed — single-line text substitution inside a template literal, no surface-area change to the module exports.
