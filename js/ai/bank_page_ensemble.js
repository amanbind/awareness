/* ═══════════════════════════════════════════════════════════
   ai/bank_page_ensemble.js — bank-page AI ensemble + coherence gate
   Extracted from ai_summarizer.js. Exposes App.AIBankPageEnsemble with:
     - aiFillBankPageSlots(articles, mode, retries)
     - validateArticleCoherence(articles)
   Owns the ensemble log endpoint (`http://127.0.0.1:4175/save`) and
   writes raw model responses into ensemble-logs/<session>/<file>.
   Depends on App.AISummarizer._internals (loaded by ai_summarizer.js).
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const AS = window.App && window.App.AISummarizer;
  if (!AS || !AS._internals) {
    console.error('[ai/bank_page_ensemble] App.AISummarizer._internals is unavailable; check script load order.');
    return;
  }
  const I = AS._internals;
  const {
    callTemplateSlotsAI, isAIAvailable,
    scoreBankPageIntro, scoreBankPageBullets,
    sanitizeBankPageBullet, localBankPageSlots,
    BANKPAGE_SLOTS_SYSTEM, BANKPAGE_INTRO_SYSTEM,
    BANKPAGE_SECTION1_SYSTEM, BANKPAGE_SECTION2_SYSTEM, BANKPAGE_SECTION3_SYSTEM,
    BANKPAGE_IMPACT_ORG_SYSTEM, BANKPAGE_NEXT_STEPS_SYSTEM,
    BANKPAGE_IMPACT_GENERAL_SYSTEM, BANKPAGE_REMEMBER_SYSTEM,
    buildBankPageUserPrompt, buildBankPageIntroPrompt,
    buildBankPageSection1Prompt, buildBankPageSection2Prompt, buildBankPageSection3Prompt,
    buildBankPageImpactOrgPrompt, buildBankPageNextStepsPrompt,
    buildBankPageImpactGeneralPrompt, buildBankPageRememberPrompt
  } = I;
  // `config` is a live reference via a getter on _internals — re-read each
  // time so configure() updates are seen by retry logic below.
  function _config() { return I.config; }
  const Utils = (window.App && window.App.Utils) || {};
  const log = Utils.log || (() => {});
  const truncate = Utils.truncate || ((s) => String(s || ''));

  // Route logging through App.AILogger so payloads pick up the active
  // template_id when a build context is set. AILogger owns ENSEMBLE_LOG_URL
  // (single source of truth) — re-export it here for back-compat callers.
  const AILogger = window.App && window.App.AILogger;
  const ENSEMBLE_LOG_URL = (AILogger && AILogger.ENSEMBLE_LOG_URL) || 'http://127.0.0.1:4175/save';

  function postEnsembleLog(session, name, content) {
    if (AILogger && typeof AILogger.logRaw === 'function') {
      AILogger.logRaw({ session, name, content });
      return;
    }
    // Fallback used only if logger sibling failed to load — keeps the
    // canonical write path alive even in a broken script-order scenario.
    // Mirror the hostname guard from logger.js so production never POSTs.
    try {
      const h = ((typeof window !== 'undefined' && window.location && window.location.hostname) || '').toLowerCase();
      if (!(h === '' || h === '127.0.0.1' || h === 'localhost' || h === '::1')) return;
    } catch (_e) { return; }
    try {
      const body = JSON.stringify({
        session,
        name,
        content: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
      });
      const promise = fetch(ENSEMBLE_LOG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (promise && typeof promise.catch === 'function') promise.catch(() => {});
    } catch (_e) { /* swallow — log server is optional */ }
  }

  function ensembleSessionId() {
    if (AILogger && typeof AILogger.makeSessionId === 'function') return AILogger.makeSessionId();
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  async function callBankPageSection(systemPrompt, userPrompt, maxTokens) {
    let raw;
    try {
      const parsed = await callTemplateSlotsAI(userPrompt, { systemPrompt, maxTokens });
      raw = JSON.stringify(parsed);
      return { ok: true, parsed, raw };
    } catch (err) {
      return { ok: false, parsed: null, raw: raw || String(err && err.message || err) };
    }
  }

  async function aiFillBankPageSlots(articles, mode = 'balanced', retries = 0) {
    const session = ensembleSessionId();
    const tasks = [
      callTemplateSlotsAI(buildBankPageUserPrompt(articles, mode), { systemPrompt: BANKPAGE_SLOTS_SYSTEM, maxTokens: 1100 })
        .then(parsed => ({ ok: true, parsed, raw: JSON.stringify(parsed) }))
        .catch(err => ({ ok: false, parsed: null, raw: String(err && err.message || err) })),
      callBankPageSection(BANKPAGE_INTRO_SYSTEM, buildBankPageIntroPrompt(articles, mode), 400),
      callBankPageSection(BANKPAGE_SECTION1_SYSTEM, buildBankPageSection1Prompt(articles, mode), 500),
      callBankPageSection(BANKPAGE_SECTION2_SYSTEM, buildBankPageSection2Prompt(articles, mode), 500),
      callBankPageSection(BANKPAGE_SECTION3_SYSTEM, buildBankPageSection3Prompt(articles, mode), 500),
      callBankPageSection(BANKPAGE_IMPACT_ORG_SYSTEM, buildBankPageImpactOrgPrompt(articles, mode), 500),
      callBankPageSection(BANKPAGE_NEXT_STEPS_SYSTEM, buildBankPageNextStepsPrompt(articles, mode), 500),
      callBankPageSection(BANKPAGE_IMPACT_GENERAL_SYSTEM, buildBankPageImpactGeneralPrompt(articles, mode), 500),
      callBankPageSection(BANKPAGE_REMEMBER_SYSTEM, buildBankPageRememberPrompt(articles, mode), 500)
    ];
    const [combined, introOnly, s1Only, s2Only, s3Only, impactOrg, nextSteps, impactGen, remember] = await Promise.all(tasks);

    postEnsembleLog(session, 'combined.txt', combined.raw);
    postEnsembleLog(session, 'intro.txt', introOnly.raw);
    postEnsembleLog(session, 'section1.txt', s1Only.raw);
    postEnsembleLog(session, 'section2.txt', s2Only.raw);
    postEnsembleLog(session, 'section3.txt', s3Only.raw);
    postEnsembleLog(session, 'impact_organisation.txt', impactOrg.raw);
    postEnsembleLog(session, 'next_steps.txt', nextSteps.raw);
    postEnsembleLog(session, 'impact_general.txt', impactGen.raw);
    postEnsembleLog(session, 'remember.txt', remember.raw);

    const combinedParsed = combined.parsed || {};

    const introCandA = scoreBankPageIntro(combinedParsed.intro);
    const introCandB = scoreBankPageIntro((introOnly.parsed || {}).intro);
    const introWinner = introCandB.score > introCandA.score ? introCandB : introCandA;
    const introWinnerLabel = introCandB.score > introCandA.score ? 'dedicated' : 'combined';

    const s1CandA = scoreBankPageBullets(combinedParsed.section1Bullets, 4, 110);
    const s1CandB = scoreBankPageBullets((s1Only.parsed || {}).section1Bullets, 4, 110);
    const s1Winner = s1CandB.score > s1CandA.score ? s1CandB : s1CandA;
    const s1WinnerLabel = s1CandB.score > s1CandA.score ? 'dedicated' : 'combined';

    const s2CandA = scoreBankPageBullets(combinedParsed.section2Bullets, 3, 130);
    const s2CandB = scoreBankPageBullets((s2Only.parsed || {}).section2Bullets, 3, 130);
    const s2Winner = s2CandB.score > s2CandA.score ? s2CandB : s2CandA;
    const s2WinnerLabel = s2CandB.score > s2CandA.score ? 'dedicated' : 'combined';

    const s3CandA = scoreBankPageBullets(combinedParsed.section3Bullets, 3, 110);
    const s3CandB = scoreBankPageBullets((s3Only.parsed || {}).section3Bullets, 3, 110);
    const s3Winner = s3CandB.score > s3CandA.score ? s3CandB : s3CandA;
    const s3WinnerLabel = s3CandB.score > s3CandA.score ? 'dedicated' : 'combined';

    postEnsembleLog(session, 'scores.json', {
      intro: { combined: introCandA.score, dedicated: introCandB.score, winner: introWinnerLabel },
      section1: { combined: s1CandA.score, dedicated: s1CandB.score, winner: s1WinnerLabel },
      section2: { combined: s2CandA.score, dedicated: s2CandB.score, winner: s2WinnerLabel },
      section3: { combined: s3CandA.score, dedicated: s3CandB.score, winner: s3WinnerLabel }
    });

    const intro = introWinner.value;
    const s1 = s1Winner.value;
    const s2 = s2Winner.value;
    const s3 = s3Winner.value;

    if (!intro || s1.length < 3 || s2.length < 2 || s3.length < 2) {
      const okCount = [combined, introOnly, s1Only, s2Only, s3Only, impactOrg, nextSteps, impactGen, remember]
        .filter(r => r && r.ok).length;
      try {
        console.error(
          `[awareness/ensemble] bank-page slots insufficient (intro=${!!intro} s1=${s1.length} s2=${s2.length} s3=${s3.length}; ${okCount}/9 AI calls ok). Retry ${retries}/${_config().retryAttempts}.`
        );
      } catch {}
      if (retries < _config().retryAttempts) {
        await App.Utils.wait(_config().retryDelayMs * (retries + 1));
        return aiFillBankPageSlots(articles, mode, retries + 1);
      }
      try {
        const toast = (window.App && window.App.Utils && window.App.Utils.showToast) || (() => {});
        toast(`Bank-page AI returned insufficient content (${okCount}/9 sections). Showing template defaults — check console for details.`, true);
      } catch {}
      return localBankPageSlots(articles);
    }

    const extractBullets = (call, charCap) => {
      const raw = (call && call.parsed && Array.isArray(call.parsed.bullets)) ? call.parsed.bullets : [];
      return raw.slice(0, 3).map(b => sanitizeBankPageBullet(b, charCap + 30)).filter(Boolean).slice(0, 3);
    };

    return {
      nlBankPageIntro: intro,
      nlBankPageRedFlags: s1,
      nlBankPageRemember: s2,
      nlBankPageStaySafe: s3,
      nlBankPageImpactOrg: extractBullets(impactOrg, 110),
      nlBankPageNextSteps: extractBullets(nextSteps, 110),
      nlBankPageImpactGeneral: extractBullets(impactGen, 110),
      nlBankPageRememberFresh: extractBullets(remember, 130)
    };
  }

  /**
   * Pre-generation gate. Asks the LLM two things in one round-trip:
   *   1) Which articles are vendor product announcements / press releases? (drop them)
   *   2) After dropping those, do the remaining articles share one threat category?
   *      If not, drop the outliers and re-ask once. If still incoherent, log and
   *      proceed with the majority set.
   * Returns { articles, dropped, droppedVendor } so callers can use the filtered list.
   * Falls through with the original list on any error or when AI is unavailable.
   */
  async function validateArticleCoherence(articles) {
    const list = (Array.isArray(articles) ? articles : []).filter(a => a && (a.title || a.summary || a.description));
    if (list.length < 2 || !isAIAvailable()) return { articles: list, dropped: [], droppedVendor: [] };

    const coherenceSystem = 'You screen a set of security news articles for an internal employee newsletter. Two jobs: flag any article that is primarily a vendor product announcement / press release, and verify the rest share one threat category. Be strict. Output JSON only — no markdown, no commentary.';
    let _coherenceAttempt = 0;
    const ask = async (subset) => {
      const compact = subset.map(a => ({
        title: a.title || '',
        type: a.type || a.category || '',
        summary: truncate(a.summary || a.description || '', 240)
      }));
      const prompt = `For the articles below, do two checks:

CHECK 1 — Vendor / PR filter:
List the full titles of any article that is primarily a vendor product announcement, press release, or piece about what a security company is doing (product update, company launch, capability announcement, funding, partnership, executive hire, etc.). An article qualifies for the newsletter ONLY if it describes either a threat employees could encounter, or an action employees can take to protect themselves. If an article is primarily product PR — list it, regardless of topic relevance.

CHECK 2 — Threat coherence (after removing the vendor/PR titles from check 1):
Categories include: phishing, smishing, ransomware, data breach, social engineering, scam/fraud, supply chain compromise, malware, vulnerability, insider threat, physical security, advisory.
Be strict — romance scams and data breaches are DIFFERENT categories. Phishing and physical security are DIFFERENT categories. If even one of the remaining articles is off-theme, answer coherent:false and list its full title in outlierTitles.

Return ONLY valid JSON:
{"vendorAnnouncementTitles": ["full title", ...], "coherent": true|false, "dominantCategory": "<category>", "outlierTitles": ["full title", ...]}

Articles:
${JSON.stringify(compact)}`;
      const idx = _coherenceAttempt++;
      let response;
      try {
        response = await callTemplateSlotsAI(prompt, { systemPrompt: coherenceSystem, maxTokens: 420 });
        return response;
      } finally {
        if (AILogger && typeof AILogger.log === 'function') {
          AILogger.log({
            name: idx === 0 ? 'coherence.txt' : ('coherence_retry_' + idx + '.txt'),
            prompt: coherenceSystem + '\n\n' + prompt,
            response: response
          });
        }
      }
    };

    const matchTitle = (a, titles) => {
      const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const at = norm(a.title);
      if (!at) return false;
      return titles.some(t => {
        const nt = norm(t);
        if (!nt) return false;
        return at.includes(nt.slice(0, 30)) || nt.includes(at.slice(0, 30));
      });
    };

    try {
      const r1 = await ask(list);
      const vendorTitles = Array.isArray(r1 && r1.vendorAnnouncementTitles) ? r1.vendorAnnouncementTitles.map(String).filter(Boolean) : [];

      let working = list;
      let droppedVendor = [];
      if (vendorTitles.length) {
        const afterVendor = list.filter(a => !matchTitle(a, vendorTitles));
        if (afterVendor.length >= 1 && afterVendor.length < list.length) {
          working = afterVendor;
          droppedVendor = vendorTitles;
          log && log('articleCoherence: dropped vendor / PR articles', { dropped: vendorTitles });
        }
      }

      if (working.length < 2) return { articles: working, dropped: [], droppedVendor };

      // Coherence check on the (post-vendor) set.
      const r1Coherent = r1 && r1.coherent === true && droppedVendor.length === 0;
      if (r1Coherent) return { articles: working, dropped: [], droppedVendor };

      // Re-ask coherence when we dropped vendor pieces (first answer was about the full list).
      let outliers = [];
      let dominant = r1 && r1.dominantCategory;
      if (droppedVendor.length) {
        try {
          const rPost = await ask(working);
          if (rPost && rPost.coherent === true) return { articles: working, dropped: [], droppedVendor };
          outliers = Array.isArray(rPost && rPost.outlierTitles) ? rPost.outlierTitles.map(String).filter(Boolean) : [];
          dominant = rPost && rPost.dominantCategory || dominant;
        } catch {
          return { articles: working, dropped: [], droppedVendor };
        }
      } else {
        outliers = Array.isArray(r1 && r1.outlierTitles) ? r1.outlierTitles.map(String).filter(Boolean) : [];
      }

      if (!outliers.length) return { articles: working, dropped: [], droppedVendor };

      const filtered = working.filter(a => !matchTitle(a, outliers));
      if (filtered.length < 1) return { articles: working, dropped: [], droppedVendor };
      if (filtered.length === working.length) return { articles: working, dropped: [], droppedVendor };

      try {
        const r2 = await ask(filtered);
        if (r2 && r2.coherent === true) {
          log && log('articleCoherence: dropped outliers, edition now single-theme', { dominant, outliers });
          return { articles: filtered, dropped: outliers, droppedVendor };
        }
        log && log('articleCoherence: still incoherent after retry; using majority-theme articles', { dominant, outliers });
        return { articles: filtered, dropped: outliers, droppedVendor };
      } catch {
        return { articles: filtered, dropped: outliers, droppedVendor };
      }
    } catch {
      return { articles: list, dropped: [], droppedVendor: [] };
    }
  }

  /**
   * Fills per-template text slots from the selected articles (AI when configured, else local heuristics).
   * Merge the returned object into newsletter cfg before NewsletterBuilder.build.
   */
  window.App.AIBankPageEnsemble = {
    aiFillBankPageSlots,
    validateArticleCoherence,
    // exposed so future debugging UIs can read the log URL
    ENSEMBLE_LOG_URL
  };
})();
