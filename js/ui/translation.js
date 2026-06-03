/* ═══════════════════════════════════════════════════════════
   ui/translation.js — newsletter HTML translation pipeline
   Extracted from ui_controller.js. Exposes App.UITranslation with:
     - translateWorkspaceFromEnglish(opts)
     - translateHtmlAIFirst(html, lang, provider, key)
     - autoTranslateNewsletter()
     - GLOSSARY_LOCK / GLOSSARY_LOCK_TERM_LIST
   Depends on App.UI._state and App.UI._internals (loaded by ui_controller.js).
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const UI = window.App && window.App.UI;
  if (!UI || !UI._state || !UI._internals) {
    console.error('[ui/translation] App.UI._state and _internals are unavailable; check script load order.');
    return;
  }
  const TranslationMetrics = window.App && window.App.TranslationMetrics;
  const state = UI._state;
  const {
    getLanguageLabel, getLanguageVariant,
    setLanguageTranslating, setTranslateProgress,
    clearTranslationPipelineState, setTranslationPipelineState,
    recordTranslationFailure, renderTranslationFailureState,
    translationSignature,
    makeVariant, normalizeVariant, isVariantUntranslated,
    fetchWithTranslationRetry,
    persistWorkspace, renderPreviewForLanguage, refreshLanguageControls,
    flagUnsavedChanges,
    NEWSLETTER_LANGUAGES
  } = UI._internals;
  const Utils = (window.App && window.App.Utils) || {};
  const log = Utils.log || (() => {});
  const showToast = Utils.showToast || (() => {});

  const GLOSSARY_LOCK = {
    en: {
      phishing: 'phishing',
      smishing: 'smishing',
      vishing: 'vishing',
      'multi-factor authentication': 'multi-factor authentication',
      mfa: 'MFA'
    }
  };
  const GLOSSARY_LOCK_TERM_LIST = [...new Set(Object.values(GLOSSARY_LOCK.en).map((t) => String(t || '').trim()).filter(Boolean))];

  function protectTokens(html) {
    const protectedTokens = [];
    let out = html;
    const patterns = [
      /https?:\/\/[^\s"'<>]+/g,
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      /\b[A-Z]{2,}-\d{3,}\b/g
    ];
    patterns.forEach(re => {
      out = out.replace(re, token => {
        const key = `__LOCK_${protectedTokens.length}__`;
        protectedTokens.push({ key, token });
        return key;
      });
    });
    return { html: out, protectedTokens };
  }

  function restoreTokens(html, protectedTokens = []) {
    let out = html;
    protectedTokens.forEach(t => { out = out.replaceAll(t.key, t.token); });
    return out;
  }

  function applyGlossaryLock(html) {
    let out = html;
    Object.values(GLOSSARY_LOCK.en).forEach(term => {
      const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      out = out.replace(re, term);
    });
    return out;
  }

  function qaCheckTranslatedHtml(sourceHtml, translatedHtml) {
    const checks = [];
    const srcLinks = (sourceHtml.match(/https?:\/\/[^\s"'<>]+/g) || []).length;
    const outLinks = (translatedHtml.match(/https?:\/\/[^\s"'<>]+/g) || []).length;
    checks.push({ id: 'link-count', ok: Math.abs(srcLinks - outLinks) <= 1, severity: 'critical', detail: `${outLinks}/${srcLinks} links preserved` });
    const srcTags = (sourceHtml.match(/<[^>]+>/g) || []).length;
    const outTags = (translatedHtml.match(/<[^>]+>/g) || []).length;
    checks.push({ id: 'html-shape', ok: Math.abs(srcTags - outTags) < 40, severity: 'advisory', detail: `${outTags}/${srcTags} tags` });
    const srcCta = /report|click|verify|urgent/i.test(sourceHtml);
    const outCta = /report|click|verify|urgent|reporte|clic|verif|urgente|rapport|klicken/i.test(translatedHtml);
    checks.push({ id: 'cta-presence', ok: !srcCta || outCta, severity: 'advisory', detail: 'CTA hint terms check' });
    return checks;
  }

  async function translateHtmlWithAI(html, targetLang, provider, apiKey) {
    if (!apiKey) throw new Error('AI API key is required for AI translation.');
    const targetLanguageName = getLanguageLabel(targetLang);
    const container = document.createElement('div');
    container.innerHTML = html;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parentTag = node.parentElement?.tagName;
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (parentTag === 'STYLE' || parentTag === 'SCRIPT') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let current;
    while ((current = walker.nextNode())) nodes.push(current);
    if (!nodes.length) return html;

    const isBadTranslationOutput = (output, source) => {
      const out = String(output || '').trim();
      if (!out) return true;
      const badPatterns = [
        /i'?m sorry/i,
        /please provide/i,
        /need the text/i,
        /want translated/i,
        /cannot translate/i
      ];
      if (badPatterns.some(re => re.test(out))) return true;
      // If model returns a long instruction-like response for short source, reject it.
      if (source.trim().length < 140 && out.length > source.trim().length * 3) return true;
      return false;
    };

    const translateOne = async (text) => {
      const originalFull = String(text || '').slice(0, 1200);
      const split = TranslationMetrics.splitDecorativeLead(originalFull);
      let proseSource = originalFull;
      let deco = '';
      if (split.deco && TranslationMetrics.hasTranslatableLetters(split.rest)) {
        deco = split.deco;
        proseSource = split.rest.trimStart();
      }
      if (!TranslationMetrics.hasTranslatableLetters(proseSource)) return originalFull;
      if (typeof window !== 'undefined' && window.__AWARENESS_E2E_SEG_TRANSLATE === '1') {
        return `⟨e2e⟩${originalFull}`;
      }
      if (typeof window !== 'undefined' && window.__AWARENESS_E2E_SEG_TRANSLATE === 'echo') {
        return originalFull;
      }
      const strictPrompt = (mode = 'normal') =>
        `You are a professional translator specializing in corporate security communications.

TASK: Translate the text inside <source> from English into ${targetLanguageName}. Use fluent ${targetLanguageName} appropriate for native readers in locale ${targetLang}.

SOURCE-OF-TRUTH CONTRACT:
- English is the canonical source. The text inside <source> is the authoritative version.
- Produce a faithful ${targetLanguageName} rendering of this English source. Do not improve, expand, summarize, or editorialize.
- If a fragment cannot be translated faithfully (ambiguous, a proper noun, or already in ${targetLanguageName}), return it unchanged rather than guessing.
- Treat every call as independent. Do not assume continuity with any previous translation. The English in <source> is the only truth for this translation.

CONTEXT:
The source is a fragment from an internal security awareness newsletter sent to employees of a corporation. Tone: professional, clear, direct — appropriate for internal corporate security communication. Not academic, not casual, not alarmist.

FORMALITY REGISTER — CRITICAL:
- For target languages with multiple formality registers, use the FORMAL register consistently throughout the entire output. Never mix formal and informal forms in one translation.
- Once you choose a register, do not switch. Pronouns, verb conjugations, possessives, and command forms must all match the same register.
- Specific defaults for common languages:
   • Spanish (all locales): use "usted" / formal verb forms. Never "tú" or "vos".
   • German: use "Sie" / formal forms. Never "du".
   • French: use "vous" / formal forms. Never "tu".
   • Italian: use "Lei" / formal forms. Never "tu".
   • Portuguese (pt-BR): use "você" with respectful business tone. (pt-PT): use "você" formal or "o(a) senhor(a)" — choose one and hold it.
   • Dutch: use "u" / formal forms. Never "je" / "jij".
   • Japanese: use ですます-form (polite). Never plain だ-form.
   • Korean: use 합니다체 (formal polite). Never 해라체 or 반말. 해요체 acceptable only if the whole output uses it consistently. Every sentence must end in -십시오 (imperative) or -습니다 (declarative) consistently. Do not mix -시기 바랍니다 with -십시오 in the same output. Do not use declarative -입니다 for bullet points that are instructions.
   • Chinese (zh-Hans and zh-Hant): use "您" for second-person, not "你".
   • Russian: use "Вы" (capitalized in formal corporate writing), not "ты".
   • Polish: use "Państwo" / formal forms.
   • Arabic: use formal Modern Standard Arabic register, no dialect.
   • Hindi: use "आप" (respectful), not "तुम" or "तू".
   • Vietnamese: use "Quý vị" or "Anh/Chị" respectful forms in corporate context.
- For any language not listed above with a formal/informal split, default to the formal register that a native HR or compliance team would use in internal employee communications.

INTERNAL CONSISTENCY CHECK:
Before outputting, verify that EVERY verb form, pronoun, and command in your translation uses the same formality register. If you find any inconsistency (e.g. one bullet using "Fai" while others use "Faccia", or one sentence using "você" while others use "o senhor"), rewrite the inconsistent forms to match the dominant register before outputting. Common slip patterns to watch for:
- Italian: "Fai/Fa'" vs "Faccia"; "Stai" vs "Stia"; "Vieni" vs "Venga"; "Sii" vs "Sia"
- Spanish: "Haz" vs "Haga"; "Verifica" vs "Verifique"; "Mantente" vs "Manténgase"; "Reporta" vs "Reporte"
- French: "Fais" vs "Faites"; "Vérifie" vs "Vérifiez"; "Sois" vs "Soyez"
- German: "Mach" vs "Machen Sie"; "Sei" vs "Seien Sie"; "Komm" vs "Kommen Sie"
- Portuguese: "Faça" mixed with "Faz"; "Verifique" mixed with "Verifica"

STYLE RULES:
- Use natural, idiomatic ${targetLanguageName} rather than literal word-for-word translation.
- Adjust grammar, word order, and phrasing to fit the target language's conventions.
- Match the business-communication register native readers expect from internal corporate security comms in ${targetLanguageName}.
- Preserve the original meaning, tone, and intent exactly — do not soften, intensify, or add nuance not present in the English.
- Do not pad output with redundant pronouns or possessives that are not natural in ${targetLanguageName} (e.g. avoid "to protect you and your personal information" → "ayudar a proteger su información personal", not "ayudar a protegerle a usted y a su información personal").
- For split-locale languages, follow the conventions of the specified locale: Simplified vs Traditional Chinese (zh-Hans vs zh-Hant), Brazilian vs European Portuguese (pt-BR vs pt-PT), Latin American vs European Spanish (es-419/es-MX vs es-ES), etc. If the locale code is ambiguous, default to the most widely-spoken variant.

DOMAIN TERMINOLOGY — prefer industry-standard ${targetLanguageName} security terms:
- "data breach" → prefer the term native security teams use, not the literal court-translation. Examples: Spanish "filtración de datos" (not "violación de datos"); German "Datenleck" (not "Datenbruch"); French "fuite de données" (not "violation de données"); Italian "violazione dei dati" is acceptable; Portuguese "vazamento de dados".
- "phishing" → typically kept as the English loanword in most languages (Spanish, French, German, Italian, Portuguese, Dutch, Japanese, Korean, Chinese all routinely use "phishing"). Do not invent a native translation unless your target language has an established native term in security-industry use.
- "MFA", "2FA", "OTP", "SSO", "VPN", "URL", "SOC", "IT", "HR", "CEO", "CISO" → keep as the English acronym. These are international corporate-IT shorthand.
- "credentials" → use the security-industry term (e.g. Spanish "credenciales", French "identifiants", German "Zugangsdaten").
- "click" / "hover" / "link" → use the established UX vocabulary native readers see in their operating system and browsers, not literal translations.

DO NOT REPEAT GREETINGS OR HEADINGS:
- The text inside <source> is ONE fragment. Do not prepend salutations like "Dear Colleague" / "Estimado colega" / "親愛なる同僚" unless they are already present in the English source.
- Do not duplicate the first phrase. Do not echo the source before translating. Do not add any prefix the English does not have.

COMPLETENESS:
- Translate the ENTIRE source. Do not abbreviate, clip, or summarize.
- If the source is a section heading (e.g. "How to spot a fraudulent message"), translate the full heading. Do not produce a partial fragment like "How to identify" with no object.
- Do not silently drop subordinate clauses to "fit" length expectations. Length awareness (below) is a soft preference, not permission to omit meaning.

PRESERVATION RULES (copy verbatim from English, do not translate):
- URLs (anything starting with http://, https://, www., or containing :// or .com/.org/.net/etc.)
- Email addresses (anything matching name@domain.tld)
- Placeholders: {{TOKEN}}, {{any_uppercase_token}}, \${VAR}, %s, %d, [name], <tag>, and similar interpolation markers
- Brand names, product names, and proper nouns with no established translation in ${targetLanguageName} (e.g. "ABC Company", "Microsoft", "Outlook", "Slack", "Zoom")
- Technical acronyms and codes (see DOMAIN TERMINOLOGY above)
- Numbers, dates, currency symbols, and units — translate the surrounding text but keep numeric values unchanged

OUTPUT RULES:
- Return ONLY the translation text. No preamble, no explanation, no quotes around the output, no markdown formatting.
- Never ask for more text or clarification. If the source is ambiguous, choose the most likely meaning in this context (internal corporate security comms) and translate it.
- If <source> contains no line breaks, output a single line — no newline characters, no list markers like "- " or "* " or "• ". List bullets are already in the surrounding HTML.
- If <source> contains line breaks, preserve them in the same positions.
- If the source is already in natural ${targetLanguageName} (no English content present), return it unchanged.
- If the source is a proper noun, brand name, product code, or technical identifier with no widely-used ${targetLanguageName} form, return it unchanged.

LENGTH AWARENESS:
This text renders in a fixed-width email layout. Keep your translation roughly the same length as the source. Languages that naturally expand (German, Russian, Finnish, Korean) should still aim for concise phrasing — prefer the shorter natural form when two equivalents exist. Concise must not become incomplete.
Hard limit: output must not exceed 3× the byte length of the source. Outputs longer than this are rejected by the post-processing validator and will trigger a costly retry. For very short sources (a single word or short heading) pick the most concise natural equivalent.

SELF-CHECK BEFORE OUTPUTTING:
Silently verify:
1. Same register throughout? (No mix of formal/informal pronouns or verb forms.)
2. No duplicated greeting or echoed phrase from English?
3. Headings translated in full, not clipped?
4. All URLs / emails / placeholders / acronyms preserved verbatim?
5. No markdown, no preamble, no quotes, no list markers?
6. Output length within 3× source byte length?
If any answer is no, fix before outputting.

<source>${proseSource}</source>
${mode === 'retry' ? 'This is a retry attempt — the first response was rejected by the validator. Lower your confidence threshold and translate even imperfect-looking fragments. Stay within 3× source length. Return best-effort translation only.' : ''}

Now translate the content inside <source> into ${targetLanguageName} following all rules above. The English in <source> is the source of truth; your output is a faithful ${targetLanguageName} rendering of it, nothing more.`;

      const finalizeSeg = (raw) => TranslationMetrics.normalizeTranslatedTextSegment(raw, proseSource);

      if (provider === 'openai') {
        const resp = await fetchWithTranslationRetry('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.1,
            messages: [
              { role: 'system', content: 'You are a precise professional translator specializing in corporate security communications. Output only translated text — no preamble, no explanation, no apology.' },
              { role: 'user', content: strictPrompt() }
            ]
          })
        });
        if (!resp.ok) throw new Error(`OpenAI translate failed (${resp.status})`);
        const data = await resp.json();
        let out = (data?.choices?.[0]?.message?.content || '').trim() || proseSource;
        if (isBadTranslationOutput(out, proseSource)) {
          const retry = await fetchWithTranslationRetry('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              temperature: 0.0,
              messages: [
                { role: 'system', content: 'You are a precise professional translator. The previous response was rejected. Return translated text only — no commentary, no apology.' },
                { role: 'user', content: strictPrompt('retry') }
              ]
            })
          });
          if (retry.ok) {
            const retryData = await retry.json();
            const retryOut = (retryData?.choices?.[0]?.message?.content || '').trim();
            if (!isBadTranslationOutput(retryOut, proseSource)) out = retryOut;
          }
        }
        if (isBadTranslationOutput(out, proseSource)) throw new Error('Invalid model translation output');
        const core = finalizeSeg(out);
        return deco ? deco + core.trimStart() : core;
      }

      const claudeModels = ['claude-sonnet-4-6', 'claude-sonnet-4-5', 'claude-3-5-sonnet-latest'];
      let lastMessage = 'unknown error';
      for (const model of claudeModels) {
        const resp = await fetchWithTranslationRetry('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model,
            max_tokens: 900,
            temperature: 0.1,
            system: 'You are a precise professional translator specializing in corporate security communications. Output only translated text — no preamble, no explanation, no apology.',
            messages: [{ role: 'user', content: strictPrompt() }]
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          let out = (data?.content?.[0]?.text || '').trim() || proseSource;
          if (isBadTranslationOutput(out, proseSource)) {
            const retryResp = await fetchWithTranslationRetry('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
              },
              body: JSON.stringify({
                model,
                max_tokens: 900,
                temperature: 0.0,
                system: 'You are a precise professional translator. The previous response was rejected. Return translated text only — no commentary, no apology.',
                messages: [{ role: 'user', content: strictPrompt('retry') }]
              })
            });
            if (retryResp.ok) {
              const retryData = await retryResp.json();
              const retryOut = (retryData?.content?.[0]?.text || '').trim();
              if (!isBadTranslationOutput(retryOut, proseSource)) out = retryOut;
            }
          }
          if (isBadTranslationOutput(out, proseSource)) throw new Error('Invalid model translation output');
          const core = finalizeSeg(out);
          return deco ? deco + core.trimStart() : core;
        }
        let errMsg = `HTTP ${resp.status}`;
        try {
          const errData = await resp.json();
          errMsg = errData?.error?.message || errData?.message || errMsg;
        } catch (e) {}
        lastMessage = `${model}: ${errMsg}`;
        if (!/invalid model|model.*not found|unknown model/i.test(errMsg)) {
          break;
        }
      }
      throw new Error(`Claude translate failed (${lastMessage})`);
    };

    // Faster processing: parallel workers with bounded concurrency.
    let lastErr = null;
    const results = [];
    const workItems = nodes
      .map((node, index) => ({ node, index, original: node.nodeValue }))
      .filter(item => item.original && item.original.trim()
        && TranslationMetrics.hasTranslatableLetters(item.original)
        && TranslationMetrics.countsTowardCoverageProgress(item.original));
    if (!workItems.length) return html;
    const concurrency = provider === 'openai' ? 5 : 4;
    let cursor = 0;

    async function worker() {
      while (cursor < workItems.length) {
        const idx = cursor++;
        const item = workItems[idx];
        const result = {
          attempted: true,
          translatable: true,
          changed: false,
          failed: false
        };
        try {
          const translated = await translateOne(item.original);
          item.node.nodeValue = translated;
          result.changed = TranslationMetrics.hasMeaningfulTextChange(item.original, translated);
        } catch (e) {
          lastErr = e;
          result.failed = true;
          item.node.nodeValue = item.original;
        }
        results.push(result);
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, workItems.length || 1) }, () => worker()));
    const coverage = TranslationMetrics.coverageFromResults(results);
    if (coverage.attempted > 0 && coverage.succeeded === 0) {
      recordTranslationFailure({
        kind: 'coverage',
        gate: 'segment-coverage',
        languageId: state.translationPendingLang?.id || null,
        languageLabel: state.translationPendingLang?.label || null,
        coverage,
        lastProviderMessage: lastErr?.message || '',
        message: '[gate:coverage] No substantive segments translated.'
      });
      throw new Error(`[gate:coverage] No text segments were translated (${coverage.attempted} attempted, ${coverage.unchanged} unchanged). Last provider error: ${TranslationMetrics.sanitizeProviderMessage(lastErr?.message || 'unknown error')}`);
    }
    if (coverage.attempted > 0 && coverage.ratio < 0.5) {
      recordTranslationFailure({
        kind: 'coverage',
        gate: 'segment-coverage',
        languageId: state.translationPendingLang?.id || null,
        languageLabel: state.translationPendingLang?.label || null,
        coverage,
        lastProviderMessage: lastErr?.message || '',
        message: '[gate:coverage] Low coverage across substantive segments.'
      });
      throw new Error(`[gate:coverage] Low translation coverage: ${coverage.succeeded}/${coverage.attempted} segments translated.`);
    }
    return container.innerHTML;
  }

  async function translateHtmlAIFirst(html, targetLang, provider, aiKey) {
    const locked = protectTokens(html);
    const source = locked.html;
    const aiOut = await translateHtmlWithAI(source, targetLang, provider, aiKey);
    return restoreTokens(applyGlossaryLock(aiOut), locked.protectedTokens);
  }

  async function translateWorkspaceFromEnglish({
    overwrite = true,
    progressLabel = '',
    progressCompletedBase = 0,
    progressTotal = null
  } = {}) {
    if (!state.newsletterWorkspace?.variants?.en) throw new Error('Generate newsletter first.');
    const provider = document.getElementById('ai-provider')?.value || 'claude';
    const aiKey = document.getElementById('ai-key')?.value?.trim() || '';
    if (!aiKey) throw new Error('Add AI API key for translation.');

    const sourceVariant = normalizeVariant(state.newsletterWorkspace.variants.en);
    const targets = NEWSLETTER_LANGUAGES.filter(l => l.id !== 'en' && (overwrite || isVariantUntranslated(l.id)));
    const translationSteps = targets.length;
    const totalBar = progressTotal != null ? progressTotal : Math.max(1, translationSteps);
    let done = progressCompletedBase;
    setTranslateProgress(true, done, totalBar, `${progressLabel || 'Translating'}: preparing`, 'Translation in progress');
    let firstTranslatedLang = null;
    try {
      for (const lang of targets) {
        state.translationPendingLang = { id: lang.id, label: lang.label };
        const signature = translationSignature(lang.id, sourceVariant.html, sourceVariant.css || '');
        if (state.translationCache[signature]) {
          state.newsletterWorkspace.variants[lang.id] = normalizeVariant(state.translationCache[signature]);
          done += 1;
          if (!firstTranslatedLang) firstTranslatedLang = lang.id;
          setTranslateProgress(true, done, totalBar, `${progressLabel || 'Translating'}: ${lang.label} (cached)`, 'Translation in progress');
          continue;
        }
        if (progressLabel) {
          const fetchEl = document.getElementById('fetch-st');
          if (fetchEl) fetchEl.textContent = `${progressLabel}: ${lang.label}`;
        }
        setTranslateProgress(true, done, totalBar, `${progressLabel || 'Translating'}: ${lang.label}`, 'Translation in progress');
        const translatedHtml = await translateHtmlAIFirst(sourceVariant.html, lang.id, provider, aiKey);
        if (!TranslationMetrics.hasMeaningfulTextChangeAllowingLockedTerms(sourceVariant.html, translatedHtml, GLOSSARY_LOCK_TERM_LIST)) {
          recordTranslationFailure({
            kind: 'docUnchanged',
            gate: 'docUnchanged',
            languageId: lang.id,
            languageLabel: lang.label,
            message: '[gate:docUnchanged] Visible text unchanged after glossary-invariant stripping.'
          });
          throw new Error(`[gate:docUnchanged] ${lang.label} translation returned unchanged visible text (after ignoring glossary-invariant terms).`);
        }
        const checks = qaCheckTranslatedHtml(sourceVariant.html, translatedHtml);
        const failed = checks.filter(c => !c.ok && c.severity === 'critical');
        if (failed.length) {
          recordTranslationFailure({
            kind: 'qa',
            gate: 'qa',
            languageId: lang.id,
            languageLabel: lang.label,
            message: `[gate:qa] Critical QA: ${failed.map(f => f.id).join(', ')}`
          });
          throw new Error(`[gate:qa] ${lang.label} QA checks failed: ${failed.map(f => f.id).join(', ')}`);
        }
        state.newsletterWorkspace.variants[lang.id] = makeVariant(translatedHtml, sourceVariant.css, {
          translatedFrom: 'en',
          provider,
          translatedAt: new Date().toISOString()
        });
        state.translationCache[signature] = state.newsletterWorkspace.variants[lang.id];
        if (!firstTranslatedLang) firstTranslatedLang = lang.id;
        done += 1;
        setTranslateProgress(true, done, totalBar, `${progressLabel || 'Translating'}: ${lang.label}`, 'Translation in progress');
      }
      persistWorkspace();
      return firstTranslatedLang;
    } finally {
      setTranslateProgress(false);
    }
  }

  async function autoTranslateNewsletter() {
    if (!state.newsletterWorkspace?.variants?.en) return showToast('Generate newsletter first, then translate.', true);
    const confirmOverwrite = confirm('Auto-translate all non-English variants from the current English version? Existing non-English text will be overwritten.');
    if (!confirmOverwrite) return;
    try {
      const firstTranslatedLang = await translateWorkspaceFromEnglish({ overwrite: true, progressLabel: 'Translating' });
      // Instantly showcase a translated version in preview.
      const current = state.currentPreviewLanguage || 'en';
      const targetPreviewLang = current !== 'en' ? current : (firstTranslatedLang || 'en');
      state.currentPreviewLanguage = targetPreviewLang;
      if (state.newsletterWorkspace) state.newsletterWorkspace.currentLanguage = targetPreviewLang;
      persistWorkspace();
      renderPreviewForLanguage(targetPreviewLang);
      showToast(`Translations ready. Showing ${getLanguageLabel(targetPreviewLang)} preview.`);
    } catch (e) {
      showToast(`Translation failed: ${e.message}`, true);
      if (!state.translationLastFailure) {
        recordTranslationFailure({
          message: e.message,
          kind: TranslationMetrics.classifyTranslationFailureKind(e.message)
        });
      }
      renderTranslationFailureState(e.message);
    }
  }
  window.App.UITranslation = {
    GLOSSARY_LOCK, GLOSSARY_LOCK_TERM_LIST,
    protectTokens, restoreTokens, applyGlossaryLock, qaCheckTranslatedHtml,
    translateHtmlWithAI, translateHtmlAIFirst,
    translateWorkspace: translateWorkspaceFromEnglish,
    autoTranslateNewsletter
  };
})();
