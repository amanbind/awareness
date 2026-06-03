#!/usr/bin/env node
/**
 * Minimal HTTP relay: accepts POST JSON from Awareness and sends mail via Microsoft Graph.
 *
 * Azure app registration:
 * - Application permission: Mail.Send (admin consent)
 * - Client secret
 *
 * Run: npm run relay:graph
 * Configure the app "Relay endpoint URL" to http://127.0.0.1:8787/ (or set PORT).
 *
 * Body shape (from Awareness):
 * { mode, delivery: { type:"graph", tenantId, clientId, clientSecret, sender }, to, subject, html, text }
 *
 * Legacy relay payloads that only include `smtp` with graph fields are not supported;
 * use the Awareness UI with delivery method Microsoft Graph.
 */

import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.error_description || data?.error?.message || text || res.statusText;
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return data;
}

async function getAppToken(tenantId, clientId, clientSecret) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });
  return fetchJson(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
}

async function sendMail(accessToken, senderUpn, { to, subject, html, text, attachments }) {
  const bodyContent = html || `<pre>${escapeHtml(text || '')}</pre>`;
  const message = {
    subject: subject || '(no subject)',
    body: {
      contentType: html ? 'HTML' : 'Text',
      content: html ? bodyContent : (text || '')
    },
    toRecipients: to.map((address) => ({
      emailAddress: { address }
    }))
  };
  // Inline image attachments (multipart/related) — referenced by the HTML
  // body via <img src="cid:...">. Lets Outlook + Gmail render images
  // automatically without a "display images" prompt.
  if (Array.isArray(attachments) && attachments.length) {
    message.attachments = attachments
      .filter((a) => a && a.contentId && a.base64)
      .map((a) => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: a.filename || a.contentId,
        contentType: a.contentType || 'application/octet-stream',
        contentBytes: a.base64,
        contentId: a.contentId,
        isInline: true
      }));
  }
  const payload = {
    message,
    saveToSentItems: true
  };

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderUpn)}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  if (res.status === 202 || res.status === 200) {
    return { ok: true, messageId: res.headers.get('request-id') || '' };
  }

  const errText = await res.text();
  let errJson = null;
  try {
    errJson = JSON.parse(errText);
  } catch {
    /* ignore */
  }
  const msg = errJson?.error?.message || errText || res.statusText;
  throw new Error(`Graph sendMail failed (${res.status}): ${msg}`);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }

  const delivery = body.delivery;
  if (!delivery || delivery.type !== 'graph') {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Expected delivery.type "graph". Use Awareness Graph delivery settings.' }));
    return;
  }

  const { tenantId, clientId, clientSecret, sender } = delivery;
  const to = Array.isArray(body.to) ? body.to : [];
  if (!tenantId || !clientId || !clientSecret || !sender || !to.length) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing tenantId, clientId, clientSecret, sender, or to[]' }));
    return;
  }

  try {
    const tokenRes = await getAppToken(tenantId, clientId, clientSecret);
    const accessToken = tokenRes.access_token;
    if (!accessToken) throw new Error('No access_token from Azure AD');

    const result = await sendMail(accessToken, sender, {
      to,
      subject: body.subject,
      html: body.html,
      text: body.text,
      attachments: body.attachments
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, messageId: result.messageId || '' }));
  } catch (e) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: e.message || String(e) }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Graph relay listening on http://127.0.0.1:${PORT}/`);
});
