/* ═══════════════════════════════════════════════════════════
   db.js — IndexedDB with hardened deduplication
   Stores articles up to 90 days. Deduplicates by URL hash,
   normalized URL, and title hash. Concurrent-safe.
   ═══════════════════════════════════════════════════════════ */
window.App = window.App || {};

App.DB = (() => {
  'use strict';

  const DB_NAME = 'SecurityAwareness';
  const DB_VERSION = 5;
  const STORE = 'articles';
  const STORE_META = 'meta';
  const STORE_DRAFTS = 'drafts';
  const STORE_PROJECTS = 'projects';
  const STORE_SMTP = 'smtpProfiles';
  const STORE_DELIVERY = 'deliveryLogs';
  const STORE_IMAGES = 'images';
  const MAX_AGE_DAYS = 90;

  let db = null;

  // ── Simple fast hash for dedup keys ──
  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return h.toString(36);
  }

  // ── Normalize URL for dedup (strip protocol, www, trailing slash, query params) ──
  function normUrl(url) {
    return (url || '')
      .replace(/^https?:\/\/(www\.)?/, '')
      .replace(/[?#].*$/, '')
      .replace(/\/+$/, '')
      .toLowerCase()
      .trim();
  }

  // ── Normalize title for dedup ──
  function normTitle(title) {
    return (title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80);
  }

  // ── Open / Init DB ──
  function open() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = e => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORE)) {
          const store = d.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('urlHash', 'urlHash', { unique: true });    // unique URL hash
          store.createIndex('titleHash', 'titleHash', { unique: false });
          store.createIndex('pubDate', 'pubDate', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('source', 'source', { unique: false });
          store.createIndex('fetchedAt', 'fetchedAt', { unique: false });
        }

        if (!d.objectStoreNames.contains(STORE_META)) {
          d.createObjectStore(STORE_META, { keyPath: 'key' });
        }
        if (!d.objectStoreNames.contains(STORE_DRAFTS)) {
          const drafts = d.createObjectStore(STORE_DRAFTS, { keyPath: 'id' });
          drafts.createIndex('updatedAt', 'updatedAt', { unique: false });
          drafts.createIndex('status', 'status', { unique: false });
          drafts.createIndex('issueDate', 'issueDate', { unique: false });
          drafts.createIndex('title', 'title', { unique: false });
        }
        if (!d.objectStoreNames.contains(STORE_PROJECTS)) {
          const projects = d.createObjectStore(STORE_PROJECTS, { keyPath: 'projectId' });
          projects.createIndex('updatedAt', 'updatedAt', { unique: false });
          projects.createIndex('status', 'status', { unique: false });
          projects.createIndex('title', 'title', { unique: false });
          projects.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!d.objectStoreNames.contains(STORE_SMTP)) {
          const smtp = d.createObjectStore(STORE_SMTP, { keyPath: 'id' });
          smtp.createIndex('isDefault', 'isDefault', { unique: false });
          smtp.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        if (!d.objectStoreNames.contains(STORE_DELIVERY)) {
          const delivery = d.createObjectStore(STORE_DELIVERY, { keyPath: 'id' });
          delivery.createIndex('draftId', 'draftId', { unique: false });
          delivery.createIndex('status', 'status', { unique: false });
          delivery.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!d.objectStoreNames.contains(STORE_IMAGES)) {
          const images = d.createObjectStore(STORE_IMAGES, { keyPath: 'id', autoIncrement: true });
          images.createIndex('uploadedAt', 'uploadedAt', { unique: false });
          images.createIndex('sha1', 'sha1', { unique: false });
        }
      };

      req.onsuccess = e => { db = e.target.result; resolve(db); };
      req.onerror = e => reject(new Error('IndexedDB: ' + e.target.error));
    });
  }

  // ── Save articles with STRICT dedup ──
  async function saveArticles(articles) {
    const d = await open();
    let saved = 0, skipped = 0;
    const now = new Date().toISOString();

    // Process one at a time to handle unique constraint errors gracefully
    for (const art of articles) {
      const uh = hashStr(normUrl(art.url));
      const th = hashStr(normTitle(art.title));

      const record = {
        title: art.title,
        titleHash: th,
        urlHash: uh,
        source: art.source,
        sourceId: art.sourceId || '',
        url: art.url,
        description: art.description || '',
        summary: art.summary || null,
        watchouts: art.watchouts || null,
        pubDate: art.pubDate,
        type: art.type,
        threatLevel: art.threatLevel || null,
        relevanceScore: art.relevanceScore || 0,
        tier: art.tier || 3,
        aiProcessed: art.aiProcessed || false,
        fetchedAt: now
      };

      try {
        await new Promise((resolve, reject) => {
          const tx = d.transaction(STORE, 'readwrite');
          const store = tx.objectStore(STORE);
          const req = store.add(record);
          req.onsuccess = () => { saved++; resolve(); };
          req.onerror = (e) => {
            // Duplicate URL hash — skip silently
            e.preventDefault();
            skipped++;
            resolve();
          };
        });
      } catch (e) {
        skipped++;
      }
    }

    return { saved, skipped };
  }

  // ── Upsert by URL hash (add new or merge into existing — for summaries / enrichment) ──
  async function upsertArticles(articles) {
    const d = await open();
    let saved = 0, updated = 0, skipped = 0;
    const now = new Date().toISOString();

    function buildRecord(art, uh, th) {
      return {
        title: art.title,
        titleHash: th,
        urlHash: uh,
        source: art.source,
        sourceId: art.sourceId || '',
        url: art.url,
        description: art.description || '',
        summary: art.summary ?? null,
        watchouts: art.watchouts ?? null,
        pubDate: art.pubDate,
        type: art.type,
        threatLevel: art.threatLevel ?? null,
        relevanceScore: art.relevanceScore || 0,
        tier: art.tier || 3,
        aiProcessed: art.aiProcessed || false,
        fetchedAt: now
      };
    }

    for (const art of articles) {
      if (!art.url) { skipped++; continue; }
      const uh = hashStr(normUrl(art.url));
      const th = hashStr(normTitle(art.title));

      await new Promise((resolve) => {
        const tx = d.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const idx = store.index('urlHash');
        const req = idx.get(uh);
        req.onsuccess = () => {
          const ex = req.result;
          const base = buildRecord(art, uh, th);
          if (ex) {
            const merged = {
              ...ex,
              ...base,
              id: ex.id,
              title: art.title || ex.title,
              summary: art.summary ?? ex.summary,
              watchouts: art.watchouts ?? ex.watchouts,
              threatLevel: art.threatLevel ?? ex.threatLevel,
              type: art.type || ex.type,
              aiProcessed: art.aiProcessed || ex.aiProcessed,
              relevanceScore: Math.max(ex.relevanceScore || 0, art.relevanceScore || 0)
            };
            const putReq = store.put(merged);
            putReq.onsuccess = () => { updated++; resolve(); };
            putReq.onerror = () => { skipped++; resolve(); };
          } else {
            const addReq = store.add(base);
            addReq.onsuccess = () => { saved++; resolve(); };
            addReq.onerror = (e) => {
              e.preventDefault();
              skipped++;
              resolve();
            };
          }
        };
        req.onerror = () => { skipped++; resolve(); };
        tx.onerror = () => { skipped++; resolve(); };
      });
    }

    return { saved, updated, skipped };
  }

  // ── Get all articles (newest first) ──
  async function getAllArticles() {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        resolve(req.result.sort((a, b) =>
          (a.tier || 3) - (b.tier || 3) ||
          (b.relevanceScore || 0) - (a.relevanceScore || 0) ||
          new Date(b.pubDate) - new Date(a.pubDate)
        ));
      };
      req.onerror = () => reject(req.error);
    });
  }

  // ── Get articles within N days ──
  async function getArticlesByDays(days) {
    const all = await getAllArticles();
    if (days === 0) return all;
    const cutoff = new Date(Date.now() - days * 864e5);
    return all.filter(a => new Date(a.pubDate) >= cutoff);
  }

  // ── Get articles by type ──
  async function getArticlesByType(type) {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).index('type').getAll(type);
      req.onsuccess = () => resolve(req.result.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)));
      req.onerror = () => reject(req.error);
    });
  }

  // ── Stats ──
  async function getStats() {
    const all = await getAllArticles();
    const now = Date.now(), day = 864e5;
    const typeCounts = {}, sourceCounts = {};
    let last7 = 0, last30 = 0;
    all.forEach(a => {
      typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
      sourceCounts[a.source] = (sourceCounts[a.source] || 0) + 1;
      const age = now - new Date(a.pubDate).getTime();
      if (age <= 7 * day) last7++;
      if (age <= 30 * day) last30++;
    });
    return {
      total: all.length, last7, last30, typeCounts, sourceCounts,
      oldest: all.length ? all[all.length - 1].pubDate : null,
      newest: all.length ? all[0].pubDate : null
    };
  }

  // ── Cleanup old articles ──
  async function cleanup() {
    const d = await open();
    const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 864e5).toISOString().split('T')[0];
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      const idx = tx.objectStore(STORE).index('pubDate');
      const range = IDBKeyRange.upperBound(cutoff);
      let deleted = 0;
      const cur = idx.openCursor(range);
      cur.onsuccess = e => {
        const c = e.target.result;
        if (c) { c.delete(); deleted++; c.continue(); }
      };
      tx.oncomplete = () => resolve(deleted);
      tx.onerror = () => reject(tx.error);
    });
  }

  // ── Clear all ──
  async function clearAll() {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  // ── Delete a single article by its URL (matched via the unique urlHash index) ──
  async function deleteArticleByUrl(url) {
    if (!url) return false;
    const d = await open();
    const uh = hashStr(normUrl(url));
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.index('urlHash').getKey(uh);
      req.onsuccess = () => {
        const key = req.result;
        if (key === undefined || key === null) { resolve(false); return; }
        store.delete(key);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  // ── Meta store ──
  async function setMeta(key, value) {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_META, 'readwrite');
      tx.objectStore(STORE_META).put({ key, value, updatedAt: new Date().toISOString() });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getMeta(key) {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_META, 'readonly');
      const req = tx.objectStore(STORE_META).get(key);
      req.onsuccess = () => resolve(req.result?.value ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveDraft(draft) {
    const d = await open();
    const now = new Date().toISOString();
    const rec = {
      id: draft.id || `draft_${Date.now()}`,
      title: (draft.title || '').trim(),
      status: draft.status || 'draft',
      issueDate: draft.issueDate || '',
      campaignName: draft.campaignName || '',
      audience: draft.audience || '',
      owner: draft.owner || '',
      createdAt: draft.createdAt || now,
      updatedAt: now,
      version: draft.version || 1,
      snapshots: Array.isArray(draft.snapshots) ? draft.snapshots : [],
      workspace: draft.workspace || null
    };
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_DRAFTS, 'readwrite');
      tx.objectStore(STORE_DRAFTS).put(rec);
      tx.oncomplete = () => resolve(rec);
      tx.onerror = () => reject(tx.error);
    });
  }


  async function getDraftById(id) {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_DRAFTS, 'readonly');
      const req = tx.objectStore(STORE_DRAFTS).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAllDrafts() {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_DRAFTS, 'readonly');
      const req = tx.objectStore(STORE_DRAFTS).getAll();
      req.onsuccess = () => {
        const all = req.result || [];
        all.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        resolve(all);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function saveProject(project) {
    const d = await open();
    const now = new Date().toISOString();
    const rec = {
      projectId: project.projectId || `project_${Date.now()}`,
      title: (project.title || '').trim() || 'Untitled Project',
      status: project.status || 'draft',
      owner: project.owner || '',
      metadata: project.metadata || {},
      languageVariants: project.languageVariants || {},
      workflow: project.workflow || null,
      version: project.version || 1,
      snapshots: Array.isArray(project.snapshots) ? project.snapshots : [],
      draftId: project.draftId || null,
      createdAt: project.createdAt || now,
      updatedAt: now
    };
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_PROJECTS, 'readwrite');
      tx.objectStore(STORE_PROJECTS).put(rec);
      tx.oncomplete = () => resolve(rec);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getProjectById(projectId) {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_PROJECTS, 'readonly');
      const req = tx.objectStore(STORE_PROJECTS).get(projectId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAllProjects() {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_PROJECTS, 'readonly');
      const req = tx.objectStore(STORE_PROJECTS).getAll();
      req.onsuccess = () => {
        const all = req.result || [];
        all.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        resolve(all);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteProject(projectId) {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_PROJECTS, 'readwrite');
      tx.objectStore(STORE_PROJECTS).delete(projectId);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function migrateDraftsToProjects() {
    const existing = await getAllProjects();
    if (existing.length) return { migrated: 0, total: existing.length };
    const drafts = await getAllDrafts();
    let migrated = 0;
    for (const draft of drafts) {
      await saveProject({
        projectId: `project_${draft.id}`,
        title: draft.title || 'Untitled Project',
        status: draft.status || 'draft',
        owner: draft.owner || '',
        metadata: {
          issueDate: draft.issueDate || '',
          campaignName: draft.campaignName || '',
          audience: draft.audience || ''
        },
        languageVariants: draft.workspace?.variants || {},
        workflow: draft.workspace?.workflow || null,
        snapshots: draft.snapshots || [],
        draftId: draft.id,
        createdAt: draft.createdAt || new Date().toISOString(),
        updatedAt: draft.updatedAt || new Date().toISOString()
      });
      migrated++;
    }
    return { migrated, total: drafts.length };
  }

  async function saveSMTPProfile(profile) {
    const d = await open();
    const now = new Date().toISOString();
    const rec = {
      id: profile.id || 'default',
      profileName: profile.profileName || 'Default SMTP',
      deliveryMethod: profile.deliveryMethod === 'graph' ? 'graph' : 'smtp',
      graphTenantId: (profile.graphTenantId || '').trim(),
      graphClientId: (profile.graphClientId || '').trim(),
      graphClientSecret: profile.graphClientSecret || '',
      host: (profile.host || '').trim(),
      port: Number(profile.port || 587),
      secure: !!profile.secure,
      username: (profile.username || '').trim(),
      password: profile.password || '',
      fromName: profile.fromName || '',
      fromAddress: (profile.fromAddress || '').trim(),
      relayUrl: (profile.relayUrl || '').trim(),
      isDefault: profile.isDefault !== false,
      updatedAt: now
    };
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_SMTP, 'readwrite');
      tx.objectStore(STORE_SMTP).put(rec);
      tx.oncomplete = () => resolve(rec);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getSMTPProfile(id = 'default') {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_SMTP, 'readonly');
      const req = tx.objectStore(STORE_SMTP).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function addDeliveryLog(logEntry) {
    const d = await open();
    const rec = {
      id: logEntry.id || `delivery_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      draftId: logEntry.draftId || null,
      draftTitle: logEntry.draftTitle || '',
      status: logEntry.status || 'queued',
      action: logEntry.action || 'send',
      recipients: logEntry.recipients || '',
      subject: logEntry.subject || '',
      language: logEntry.language || 'en',
      error: logEntry.error || '',
      messageId: logEntry.messageId || '',
      createdAt: new Date().toISOString()
    };
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_DELIVERY, 'readwrite');
      tx.objectStore(STORE_DELIVERY).put(rec);
      tx.oncomplete = () => resolve(rec);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getDeliveryLogs(limit = 50) {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_DELIVERY, 'readonly');
      const req = tx.objectStore(STORE_DELIVERY).getAll();
      req.onsuccess = () => {
        const all = req.result || [];
        all.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        resolve(all.slice(0, limit));
      };
      req.onerror = () => reject(req.error);
    });
  }

  // ── Image library (used by editor's Replace-image feature) ──
  async function sha1HexOfBlob(blob) {
    const subtle = (typeof crypto !== 'undefined' && crypto.subtle) ? crypto.subtle : null;
    if (!subtle) return '';
    const buf = await blob.arrayBuffer();
    const hashBuf = await subtle.digest('SHA-1', buf);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function findImageBySha1(sha1) {
    if (!sha1) return null;
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_IMAGES, 'readonly');
      const req = tx.objectStore(STORE_IMAGES).index('sha1').get(sha1);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveImage({ filename, mimeType, blob, width, height } = {}) {
    if (!blob) throw new Error('saveImage: blob required');
    const sha1 = await sha1HexOfBlob(blob);
    if (sha1) {
      const existing = await findImageBySha1(sha1);
      if (existing) return existing;
    }
    const d = await open();
    const rec = {
      filename: filename || 'image',
      mimeType: mimeType || blob.type || 'application/octet-stream',
      blob,
      sizeBytes: blob.size,
      width: Number(width) || 0,
      height: Number(height) || 0,
      uploadedAt: new Date().toISOString(),
      sha1
    };
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_IMAGES, 'readwrite');
      const req = tx.objectStore(STORE_IMAGES).add(rec);
      req.onsuccess = () => { rec.id = req.result; resolve(rec); };
      req.onerror = () => reject(req.error);
    });
  }

  async function getImage(id) {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_IMAGES, 'readonly');
      const req = tx.objectStore(STORE_IMAGES).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAllImages() {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_IMAGES, 'readonly');
      const req = tx.objectStore(STORE_IMAGES).getAll();
      req.onsuccess = () => {
        const all = req.result || [];
        all.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
        resolve(all);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteImage(id) {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE_IMAGES, 'readwrite');
      tx.objectStore(STORE_IMAGES).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  return {
    open, saveArticles, upsertArticles, getAllArticles, getArticlesByDays,
    getArticlesByType, getStats, cleanup, clearAll, deleteArticleByUrl,
    setMeta, getMeta,
    saveDraft, getDraftById, getAllDrafts,
    saveProject, getProjectById, getAllProjects, deleteProject, migrateDraftsToProjects,
    saveSMTPProfile, getSMTPProfile,
    addDeliveryLog, getDeliveryLogs,
    saveImage, getImage, getAllImages, deleteImage, findImageBySha1
  };
})();
