/* ═══════════════════════════════════════════════════════════
   rss_fetcher.js — 35 credible RSS feeds across 3 tiers
   Government CERTs + Enterprise Vendors + Security Journalism
   STRICT phishing/social engineering filter. 3 retries. 5 workers.
   ═══════════════════════════════════════════════════════════ */
window.App = window.App || {};

App.RSSFetcher = (() => {
  'use strict';
  const { log } = App.Utils;
  const CUSTOM_FEEDS_KEY = 'awareness_custom_feed_sources_v1';

  const FEEDS = [
    // ══ TIER 1: Government CERTs & National Agencies ══
    { id:'cisa',         name:'CISA (US)',                url:'https://www.cisa.gov/cybersecurity-advisories/all.xml',            urlAlternatives:['https://www.cisa.gov/news.xml'], site:'cisa.gov',                  icon:'🇺🇸', tier:1 },
    { id:'ncsc',         name:'NCSC (UK)',                url:'https://www.ncsc.gov.uk/api/1/services/v1/report-rss-feed.xml',   site:'ncsc.gov.uk',               icon:'🇬🇧', tier:1 },
    { id:'enisa',        name:'ENISA (EU)',               url:'https://www.enisa.europa.eu/rss.xml',                             site:'enisa.europa.eu',           icon:'🇪🇺', tier:1 },
    { id:'certin',       name:'CERT-In (India)',          url:'https://www.cert-in.org.in/s2cMainServlet?pageid=RSSADVISORY',    site:'cert-in.org.in',            icon:'🇮🇳', tier:1 },
    { id:'acsc',         name:'ACSC (Australia)',         url:'https://www.cyber.gov.au/rss.xml',                                urlAlternatives:['https://www.cyber.gov.au/rss-feeds/rss.xml'], site:'cyber.gov.au',              icon:'🇦🇺', tier:1 },
    { id:'jpcert',       name:'JPCERT (Japan)',           url:'https://www.jpcert.or.jp/english/rss/jpcert-en.rdf',              site:'jpcert.or.jp',              icon:'🇯🇵', tier:1 },
    { id:'sansisc',      name:'SANS ISC',                 url:'https://isc.sans.edu/rssfeed.xml',                                site:'isc.sans.edu',              icon:'🎓', tier:1 },
    { id:'nist',         name:'NIST Cybersecurity',       url:'https://csrc.nist.gov/CSRC/media/Publications/feeds/nist-publications-rss.xml', urlAlternatives:['https://www.nist.gov/news-events/rss.xml'], site:'nist.gov',   icon:'📐', tier:1 },

    // ══ TIER 2: Enterprise Security Vendors (threat research blogs) ══
    { id:'checkpoint',   name:'Check Point Research',     url:'https://research.checkpoint.com/feed/',                            site:'research.checkpoint.com',   icon:'🇮🇱', tier:2 },
    { id:'cybereason',   name:'Cybereason',               url:'https://www.cybereason.com/blog/rss.xml',                          site:'cybereason.com',            icon:'🇮🇱', tier:2 },
    { id:'crowdstrike',  name:'CrowdStrike Blog',         url:'https://www.crowdstrike.com/blog/feed/',                           site:'crowdstrike.com',           icon:'🦅', tier:2 },
    { id:'proofpoint',   name:'Proofpoint Blog',          url:'https://www.proofpoint.com/us/blog/rss.xml',                       urlAlternatives:['https://proofpoint.com/us/blog/rss.xml'], site:'proofpoint.com',            icon:'✉️', tier:2 },
    { id:'knowbe4',      name:'KnowBe4 Blog',             url:'https://blog.knowbe4.com/rss.xml',                                 urlAlternatives:['https://www.knowbe4.com/rss.xml'], site:'knowbe4.com',               icon:'🎓', tier:2 },
    { id:'cofense',      name:'Cofense Blog',              url:'https://cofense.com/blog/feed/',                                   urlAlternatives:['https://cofense.com/feed/'], site:'cofense.com',               icon:'🐟', tier:2 },
    { id:'tenable',      name:'Tenable Blog',              url:'https://www.tenable.com/blog/feed',                                site:'tenable.com',               icon:'🔎', tier:2 },
    { id:'qualys',       name:'Qualys Blog',               url:'https://blog.qualys.com/feed',                                     site:'blog.qualys.com',           icon:'🔬', tier:2 },
    { id:'mssecurity',   name:'Microsoft Security',        url:'https://www.microsoft.com/en-us/security/blog/feed/',               urlAlternatives:['https://www.microsoft.com/security/blog/feed/'], site:'microsoft.com/security',    icon:'🪟', tier:2 },
    { id:'sentinelone',  name:'SentinelOne Blog',          url:'https://www.sentinelone.com/blog/feed/',                            site:'sentinelone.com',           icon:'🤖', tier:2 },
    { id:'kaspersky',    name:'Securelist (Kaspersky)',     url:'https://securelist.com/feed/',                                      site:'securelist.com',            icon:'🛡️', tier:2 },
    { id:'talosintel',   name:'Cisco Talos',               url:'https://blog.talosintelligence.com/feeds/posts/default',             urlAlternatives:['https://blog.talosintelligence.com/feeds/posts/default?alt=rss'], site:'talosintelligence.com',     icon:'🌊', tier:2 },
    { id:'unit42',       name:'Palo Alto Unit 42',         url:'https://unit42.paloaltonetworks.com/feed/',                          site:'unit42.paloaltonetworks.com',icon:'🔥', tier:2 },
    { id:'mandiant',     name:'Mandiant (Google)',         url:'https://www.mandiant.com/resources/blog/rss.xml',                    urlAlternatives:['https://www.mandiant.com/resources/blog?format=rss'], site:'mandiant.com',              icon:'🔴', tier:2 },

    // ══ TIER 3: Security Journalism & Awareness ══
    { id:'bleeping',     name:'Bleeping Computer',         url:'https://www.bleepingcomputer.com/feed/',                             site:'bleepingcomputer.com',      icon:'💻', tier:3 },
    { id:'hackernews',   name:'The Hacker News',           url:'https://feeds.feedburner.com/TheHackersNews',                        site:'thehackernews.com',         icon:'🔐', tier:3 },
    { id:'krebs',        name:'KrebsOnSecurity',           url:'https://krebsonsecurity.com/feed/',                                  site:'krebsonsecurity.com',       icon:'🔍', tier:3 },
    { id:'darkreading',  name:'Dark Reading',              url:'https://www.darkreading.com/rss.xml',                                site:'darkreading.com',           icon:'🌑', tier:3 },
    { id:'secweek',      name:'SecurityWeek',              url:'https://feeds.feedburner.com/securityweek',                          site:'securityweek.com',          icon:'🛡️', tier:3 },
    { id:'infosec',      name:'Infosecurity Magazine',     url:'https://www.infosecurity-magazine.com/rss/news/',                    site:'infosecurity-magazine.com', icon:'📰', tier:3 },
    { id:'graham',       name:'Graham Cluley',             url:'https://grahamcluley.com/feed/',                                     urlAlternatives:['https://www.grahamcluley.com/feed/'], site:'grahamcluley.com',          icon:'🎯', tier:3 },
    { id:'schneier',     name:'Schneier on Security',      url:'https://www.schneier.com/feed/atom/',                                site:'schneier.com',              icon:'🧠', tier:3 },
    { id:'welivesec',    name:'WeLiveSecurity (ESET)',     url:'https://www.welivesecurity.com/en/feed/',                            site:'welivesecurity.com',        icon:'🦠', tier:3 },
    { id:'malwarebytes', name:'Malwarebytes Blog',         url:'https://www.malwarebytes.com/blog/feed',                             site:'malwarebytes.com',          icon:'🧹', tier:3 },
    { id:'helpnet',      name:'Help Net Security',          url:'https://www.helpnetsecurity.com/feed/',                              site:'helpnetsecurity.com',       icon:'🌐', tier:3 },
    { id:'csoonline',    name:'CSO Online',                 url:'https://www.csoonline.com/feed/',                                    site:'csoonline.com',             icon:'🏢', tier:3 },
    { id:'phishtank',    name:'PhishTank Blog',             url:'https://www.phishtank.com/blog/feed/',                               urlAlternatives:['https://phishtank.org/blog/feed/'], site:'phishtank.com',             icon:'🎣', tier:3 },
  ];

  function normalizeUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) throw new Error('Feed URL is required.');
    let parsed;
    try {
      parsed = new URL(raw);
    } catch (e) {
      throw new Error('Invalid URL format. Use a full http(s) URL.');
    }
    if (!/^https?:$/i.test(parsed.protocol)) throw new Error('Only http(s) feed URLs are allowed.');
    parsed.hash = '';
    return parsed.toString().replace(/\/+$/, '');
  }

  function normalizeSite(url) {
    try { return new URL(url).hostname.replace(/^www\./i, ''); }
    catch (e) { return ''; }
  }

  function normalizeFeedId(url) {
    const seed = String(url || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return `custom_${seed.slice(0, 26) || Date.now()}`;
  }

  function toComparableUrl(url) {
    return String(url || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?/i, '')
      .replace(/[?#].*$/, '')
      .replace(/\/+$/, '');
  }

  function loadCustomFeeds() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CUSTOM_FEEDS_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(item => ({
          id: String(item?.id || '').trim(),
          name: String(item?.name || '').trim(),
          url: String(item?.url || '').trim(),
          site: String(item?.site || '').trim(),
          icon: String(item?.icon || '➕').trim() || '➕',
          tier: 3,
          custom: true
        }))
        .filter(item => item.id && item.name && item.url);
    } catch (e) {
      return [];
    }
  }

  function saveCustomFeeds(customFeeds) {
    const clean = (customFeeds || []).map(f => ({
      id: f.id,
      name: f.name,
      url: f.url,
      site: f.site,
      icon: f.icon || '➕'
    }));
    localStorage.setItem(CUSTOM_FEEDS_KEY, JSON.stringify(clean));
    return clean;
  }

  function getFeeds() {
    return [...FEEDS, ...loadCustomFeeds()];
  }

  function getCustomFeeds() {
    return loadCustomFeeds();
  }

  function addCustomFeed({ name, url }) {
    const feedName = String(name || '').trim();
    if (!feedName) throw new Error('Source name is required.');
    if (feedName.length > 90) throw new Error('Source name is too long.');
    const normalizedUrl = normalizeUrl(url);
    const allFeeds = getFeeds();
    const targetComparable = toComparableUrl(normalizedUrl);
    if (allFeeds.some(f => toComparableUrl(f.url) === targetComparable)) {
      throw new Error('This source already exists.');
    }
    const customFeeds = loadCustomFeeds();
    const next = {
      id: normalizeFeedId(normalizedUrl),
      name: feedName,
      url: normalizedUrl,
      site: normalizeSite(normalizedUrl),
      icon: '➕',
      tier: 3,
      custom: true
    };
    customFeeds.push(next);
    saveCustomFeeds(customFeeds);
    return next;
  }

  function removeCustomFeed(feedId) {
    const id = String(feedId || '').trim();
    if (!id) return false;
    const customFeeds = loadCustomFeeds();
    const next = customFeeds.filter(f => f.id !== id);
    if (next.length === customFeeds.length) return false;
    saveCustomFeeds(next);
    return true;
  }

  /* ════════════════════════════════════════════════════════
     FEED FILTER — same methodology as new_tprm/prod (scoring.py + app.py):
     CVE-\d{4}-\d+ in title+summary excludes the item; weighted keyword score
     must be >= 5 (critical +5, context +2, noise -3 per matched term).
     ════════════════════════════════════════════════════════ */
  function getScoringSnapshot() {
    if (App.KeywordStore && typeof App.KeywordStore.getScoringSnapshot === 'function') {
      try {
        return App.KeywordStore.getScoringSnapshot();
      } catch (e) {}
    }
    return App.FeedScoring.normalizeSnapshot(null);
  }

  function isPrivacyAwarenessRelevant(title, description, keywordSnapshot = null) {
    const snap = keywordSnapshot || getScoringSnapshot();
    return App.FeedScoring.shouldIncludeItem(title, description, snap);
  }

  /* ════════════════════════════════════════════════════════
     CORS PROXIES + rss2json fallback
     ════════════════════════════════════════════════════════ */
  const CORS_PROXIES = [
    url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];

  async function fetchXmlViaProxies(url, maxRetries = 2, timeoutMs = 10000) {
    const headers = { 'Accept': 'application/rss+xml, application/xml, text/xml, */*' };
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const settled = await Promise.allSettled(CORS_PROXIES.map(async mkUrl => {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
          const resp = await fetch(mkUrl(url), { signal: ctrl.signal, headers });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const text = await resp.text();
          if (!text || text.length < 80) throw new Error('Empty');
          const t = text.trim();
          if (t.startsWith('{') && t.includes('"status"')) throw new Error('Not XML');
          return text;
        } finally {
          clearTimeout(tid);
        }
      }));
      const ok = settled.find(r => r.status === 'fulfilled');
      if (ok) return ok.value;
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 250 * attempt));
    }
    throw new Error('Failed after retries');
  }

  async function fetchRss2Json(rssUrl) {
    const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 10000);
    const resp = await fetch(api, { signal: ctrl.signal });
    clearTimeout(tid);
    if (!resp.ok) throw new Error(`rss2json HTTP ${resp.status}`);
    const data = await resp.json();
    if (data.status !== 'ok' || !Array.isArray(data.items)) throw new Error('rss2json');
    return data;
  }

  async function fetchFeedContent(feed) {
    const urls = [feed.url, ...(feed.urlAlternatives || [])];
    let lastErr = null;
    for (const url of urls) {
      try {
        const xml = await fetchXmlViaProxies(url);
        return { kind: 'xml', xml, urlUsed: url };
      } catch (e) { lastErr = e; }
      try {
        const j = await fetchRss2Json(url);
        return { kind: 'json', json: j, urlUsed: url };
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('Feed unreachable');
  }

  /* ════════════════════════════════════════════════════════
     XML PARSING
     ════════════════════════════════════════════════════════ */
  function parseXml(xmlText, feed, keywordSnapshot = null) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    if (doc.querySelector('parsererror')) throw new Error('XML parse');
    let items = [...doc.querySelectorAll('item')];
    let type = 'rss';
    if (!items.length) {
      items = [...doc.querySelectorAll('entry')];
      type = 'atom';
    }
    const rawCount = items.length;
    const articles = [];
    for (const el of items) {
      const a = parseItem(el, feed, type, keywordSnapshot);
      if (a) articles.push(a);
    }
    return { articles, rawCount };
  }

  function articlesFromRss2Json(data, feed, keywordSnapshot = null) {
    const articles = [];
    const rawCount = (data.items || []).length;
    for (const it of data.items || []) {
      const cleanTitle = App.Utils.stripTags(it.title || '').trim();
      const cleanDesc = App.Utils.truncate(App.Utils.stripTags(it.description || it.content || ''), 600);
      if (!cleanTitle) continue;
      if (!isPrivacyAwarenessRelevant(cleanTitle, cleanDesc, keywordSnapshot)) continue;
      const dateStr = it.pubDate || '';
      if (isFutureDated(dateStr)) continue;
      articles.push({
        title: cleanTitle, source: feed.name, sourceId: feed.id, tier: feed.tier,
        url: (it.link || '').trim(), description: cleanDesc, pubDate: normDate(dateStr),
        type: classify((cleanTitle + ' ' + cleanDesc).toLowerCase()),
        relevanceScore: scoreRelevance((cleanTitle + ' ' + cleanDesc).toLowerCase(), keywordSnapshot),
        summary: null, watchouts: null, aiProcessed: false
      });
    }
    return { articles, rawCount };
  }

  function parseItem(el, feed, type, keywordSnapshot = null) {
    try {
      const title = txt(el,'title');
      if (!title) return null;
      let link, desc, dateStr;
      if (type === 'atom') {
        const le = el.querySelector('link[rel="alternate"],link[href]');
        link = le ? le.getAttribute('href') : '';
        desc = App.Utils.stripTags(txt(el,'content') || txt(el,'summary') || '');
        dateStr = txt(el,'updated') || txt(el,'published') || '';
      } else {
        const le = el.querySelector('link[href]');
        link = le ? (le.getAttribute('href') || '').trim() : txt(el,'link').trim();
        desc = App.Utils.stripTags(txt(el,'description') || '');
        dateStr = txt(el,'pubDate') || '';
        if (!dateStr) { const dc = el.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/','date'); if (dc.length) dateStr = dc[0].textContent; }
      }
      const cleanTitle = App.Utils.stripTags(title).trim();
      const cleanDesc = App.Utils.truncate(desc, 600);
      if (!isPrivacyAwarenessRelevant(cleanTitle, cleanDesc, keywordSnapshot)) return null;
      if (isFutureDated(dateStr)) return null;

      return {
        title: cleanTitle, source: feed.name, sourceId: feed.id, tier: feed.tier,
        url: link || '', description: cleanDesc, pubDate: normDate(dateStr),
        type: classify((cleanTitle + ' ' + cleanDesc).toLowerCase()),
        relevanceScore: scoreRelevance((cleanTitle + ' ' + cleanDesc).toLowerCase(), keywordSnapshot),
        summary: null, watchouts: null, aiProcessed: false
      };
    } catch (e) { return null; }
  }

  function txt(el, tag) { const c = el.querySelector(tag); return c ? c.textContent : ''; }
  function normDate(s) {
    if (!s) return new Date().toISOString().split('T')[0];
    try { const d = new Date(s); return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0]; }
    catch(e) { return new Date().toISOString().split('T')[0]; }
  }
  // Reject items dated after the end of today (local). Missing/invalid dates are
  // kept — normDate defaults those to today, so only genuine future events drop.
  function isFutureDated(s) {
    if (!s) return false;
    const d = new Date(s);
    if (isNaN(d.getTime())) return false;
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return d.getTime() > endOfToday.getTime();
  }

  function classify(t) {
    const rules = [
      { type:'Phishing',           kw:['phishing','phish','fake email','credential harvest','fake login','bec','business email','clickfix','quishing'] },
      { type:'Smishing',           kw:['smishing','sms scam','text scam','sms phish'] },
      { type:'Vishing',            kw:['vishing','voice scam','phone scam','call scam','fake call','scam call'] },
      { type:'Social Engineering', kw:['social engineer','impersonat','pretexting','baiting','tailgating','deepfake','ai voice'] },
      { type:'Password & MFA',     kw:['password','mfa','multi-factor','two-factor','2fa','authenticat','passkey','credential','session hijack','cookie steal'] },
      { type:'Data Breach',        kw:['breach','data leak','leaked','exposed','stolen data','identity theft','compromised account'] },
      { type:'Ransomware',         kw:['ransomware','ransom','locked files','encrypted files'] },
      { type:'Scam & Fraud',       kw:['scam','fraud','fake website','gift card','romance scam','pig butcher','investment scam','lottery'] },
      { type:'Security Tips',      kw:['security awareness','cyber hygiene','security training','security tip','best practice','protect your'] },
      { type:'Insider Threat',     kw:['insider threat','insider risk','disgruntled'] },
    ];
    for (const r of rules) if (r.kw.some(k => t.includes(k))) return r.type;
    return 'Security News';
  }

  function scoreRelevance(t, keywordSnapshot = null) {
    const snap = keywordSnapshot || getScoringSnapshot();
    const base = App.FeedScoring.scoreText(t, snap);
    return Math.min(40, Math.max(0, base));
  }

  function dedup(articles) {
    const urls = new Set(), titles = new Map();
    return articles.filter(a => {
      const uk = a.url.replace(/^https?:\/\/(www\.)?/,'').replace(/[?#].*$/,'').replace(/\/+$/,'').toLowerCase();
      if (urls.has(uk)) return false;
      urls.add(uk);
      const tk = a.title.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,60);
      for (const [ex] of titles) { if (tk === ex || jaccard(tk,ex) > 0.6) return false; }
      titles.set(tk, true);
      return true;
    });
  }

  function jaccard(a, b) {
    const sa = new Set(a.match(/.{1,3}/g)||[]), sb = new Set(b.match(/.{1,3}/g)||[]);
    let inter = 0; for (const x of sa) if (sb.has(x)) inter++;
    const union = sa.size + sb.size - inter;
    return union ? inter/union : 0;
  }

  /* ════════════════════════════════════════════════════════
     PARALLEL FETCH — 5 workers, 3 retries each
     ════════════════════════════════════════════════════════ */
  async function fetchAllFeeds(enabledFeedIds = null, maxPerFeed = 25, onProgress = null) {
    const allFeeds = getFeeds();
    const feeds = enabledFeedIds ? allFeeds.filter(f => enabledFeedIds.includes(f.id)) : allFeeds;
    const keywordSnapshot = getScoringSnapshot();
    const cpu = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : 8;
    const WORKERS = Math.max(6, Math.min(12, cpu + 2, feeds.length));
    log(`⚡ Fetching ${feeds.length} feeds (${WORKERS} workers)…`, 'log-ai');
    const queue = [...feeds];
    const feedStats = {};
    let allArticles = [];
    const startedAt = performance.now();

    async function worker(wid) {
      while (queue.length) {
        const feed = queue.shift();
        if (!feed) break;
        const feedStart = performance.now();
        try {
          log(`[W${wid}] ↓ ${feed.name}…`);
          const packed = await fetchFeedContent(feed);
          let arts, rawCount;
          if (packed.kind === 'xml') {
            const p = parseXml(packed.xml, feed, keywordSnapshot);
            arts = p.articles;
            rawCount = p.rawCount;
          } else {
            const p = articlesFromRss2Json(packed.json, feed, keywordSnapshot);
            arts = p.articles;
            rawCount = p.rawCount;
          }
          arts = arts.slice(0, maxPerFeed);
          feedStats[feed.id] = {
            name: feed.name,
            count: arts.length,
            rawCount,
            ok: true,
            via: packed.kind === 'json' ? 'rss2json' : 'xml',
            elapsedMs: Math.round(performance.now() - feedStart),
            urlUsed: packed.urlUsed || feed.url,
            finishedAt: new Date().toISOString()
          };
          allArticles.push(...arts);
          if (onProgress) {
            onProgress({
              done: Object.keys(feedStats).length,
              total: feeds.length,
              feedName: feed.name,
              ok: true,
              count: arts.length,
              rawCount,
              elapsedMs: feedStats[feed.id].elapsedMs,
              newArticles: arts
            });
          }
          if (arts.length === 0 && rawCount > 0) {
            log(`[W${wid}] ✓ ${feed.name}: 0 data-privacy relevant (${rawCount} in feed skipped — not employee / data-privacy topics)`, 'log-ok');
          } else if (arts.length === 0) {
            log(`[W${wid}] ✓ ${feed.name}: empty feed`, 'log-ok');
          } else {
            log(`[W${wid}] ✓ ${feed.name}: ${arts.length} data-privacy relevant (${rawCount} in feed)`, 'log-ok');
          }
        } catch (e) {
          feedStats[feed.id] = {
            name: feed.name,
            count: 0,
            rawCount: 0,
            ok: false,
            error: 'not reachable',
            elapsedMs: Math.round(performance.now() - feedStart),
            urlUsed: feed.url,
            finishedAt: new Date().toISOString()
          };
          if (onProgress) {
            onProgress({
              done: Object.keys(feedStats).length,
              total: feeds.length,
              feedName: feed.name,
              ok: false,
              count: 0,
              rawCount: 0,
              elapsedMs: feedStats[feed.id].elapsedMs,
              newArticles: []
            });
          }
          log(`[W${wid}] ✗ ${feed.name} — not reachable (${(e && e.message) || 'network'})`, 'log-err');
        }
      }
    }

    await Promise.all(Array.from({length: Math.min(WORKERS, feeds.length)}, (_,i) => worker(i+1)));

    allArticles = dedup(allArticles);
    allArticles.sort((a,b) => (a.tier-b.tier) || (b.relevanceScore-a.relevanceScore) || (new Date(b.pubDate)-new Date(a.pubDate)));

    const ok = Object.values(feedStats).filter(s=>s.ok).length;
    log(`✓ ${allArticles.length} articles from ${ok}/${feeds.length} feeds`, 'log-ok');

    try {
      const {saved,skipped} = await App.DB.saveArticles(allArticles);
      log(`💾 DB: ${saved} new, ${skipped} duplicates`, 'log-ok');
      const cleaned = await App.DB.cleanup();
      if (cleaned > 0) log(`🧹 Cleaned ${cleaned} old`, 'log-ok');
    } catch(e) { log(`⚠ DB: ${e.message}`, 'log-err'); }

    return {
      articles: allArticles,
      stats: feedStats,
      telemetry: {
        totalElapsedMs: Math.round(performance.now() - startedAt),
        feedCount: feeds.length,
        successCount: Object.values(feedStats).filter(s => s.ok).length
      }
    };
  }

  return {
    fetchAllFeeds, getFeeds, getCustomFeeds, addCustomFeed, removeCustomFeed, FEEDS, classify,
    isPrivacyAwarenessRelevant, isFutureDated,
    isRelevantForEmployees: isPrivacyAwarenessRelevant
  };
})();
