import http from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 4175;
const HOST = '127.0.0.1';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG_DIR = path.join(ROOT, 'ensemble-logs');
const TEMPLATES_DIR = path.join(ROOT, 'templates');

const SAFE_NAME = /^[A-Za-z0-9._-]{1,80}$/;
// Template ids may start with an underscore (e.g. '_article-curation').
const SAFE_TEMPLATE_ID = /^[A-Za-z0-9._-][A-Za-z0-9._-]{0,79}$/;

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }
  if (req.method !== 'POST' || req.url !== '/save') {
    sendJson(res, 404, { error: 'not_found' });
    return;
  }
  let body = '';
  req.on('data', chunk => { body += chunk; if (body.length > 2_000_000) req.destroy(); });
  req.on('end', async () => {
    try {
      const { session, name, content, template_id } = JSON.parse(body);
      if (!SAFE_NAME.test(String(session || '')) || !SAFE_NAME.test(String(name || ''))) {
        sendJson(res, 400, { error: 'bad_name' });
        return;
      }
      const payload = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

      // Canonical write — UNCHANGED. Existing tools, scripts, and reviewers
      // continue to read from ensemble-logs/<session>/<name>.
      const canonicalDir = path.join(LOG_DIR, session);
      await mkdir(canonicalDir, { recursive: true });
      await writeFile(path.join(canonicalDir, name), payload, 'utf8');

      // Per-template mirror — opt-in via template_id. Auto-creates the folder
      // (covers agentic-pipeline-generated template ids not in the upfront
      // scaffold). Silently skipped if template_id is missing or malformed.
      let mirroredTo = null;
      if (template_id != null) {
        const tplId = String(template_id);
        if (SAFE_TEMPLATE_ID.test(tplId)) {
          const tplDir = path.join(TEMPLATES_DIR, tplId, 'ensemble-logs', session);
          try {
            await mkdir(tplDir, { recursive: true });
            await writeFile(path.join(tplDir, name), payload, 'utf8');
            mirroredTo = path.relative(ROOT, path.join(tplDir, name));
          } catch (mirrorErr) {
            // Mirror failure is non-fatal — canonical write succeeded.
            console.warn(`[ensemble-log] mirror failed for template_id=${tplId}: ${mirrorErr.message}`);
          }
        }
      }

      sendJson(res, 200, { ok: true, mirrored: mirroredTo });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Ensemble log server listening on http://${HOST}:${PORT}`);
  console.log(`Writing files under: ${LOG_DIR}`);
});
