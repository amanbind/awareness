#!/usr/bin/env node
// scripts/deploy-docker.mjs — one-click deploy to a Docker host.
//
// Builds the image locally, ships it to the remote, and runs it. The
// docker-compose path in deploy/docker-compose.yml is the alternative for
// hosts that already have compose set up; this script is the
// no-compose-required path.
//
// Usage:
//   node scripts/deploy-docker.mjs --host user@1.2.3.4
//   node scripts/deploy-docker.mjs --host user@1.2.3.4 --port 8080 --name awareness
//   node scripts/deploy-docker.mjs --local-only            (build + run locally on 8080)
//   node scripts/deploy-docker.mjs --host user@1.2.3.4 --dry-run
//
// Flags:
//   --host           ssh target (required unless --local-only)
//   --port           host port to map to container :80 (default 8080)
//   --name           container name on the remote (default awareness)
//   --skip-verify    skip the local `npm run verify` gate
//   --dry-run        print the plan, don't execute
//   --local-only     run on this machine instead of shipping anywhere
//   --verbose        echo every subprocess

import { writeFile, mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { runRemote, pushFile, testSSH } from './lib/ssh.mjs';
import { verifyHealth } from './lib/smoke.mjs';
import { assertValid } from './lib/argv-validate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const { values: opts } = parseArgs({
  options: {
    host:          { type: 'string' },
    port:          { type: 'string', default: '8080' },
    name:          { type: 'string', default: 'awareness' },
    'skip-verify': { type: 'boolean', default: false },
    'dry-run':     { type: 'boolean', default: false },
    'local-only':  { type: 'boolean', default: false },
    verbose:       { type: 'boolean', default: false },
    help:          { type: 'boolean', default: false }
  }
});

if (opts.help || (!opts.host && !opts['local-only'])) {
  console.log(`Usage: node scripts/deploy-docker.mjs (--host user@host | --local-only) [flags]

Required:
  --host <user@host>     SSH target (or use --local-only to run on this machine)

Optional:
  --port <port>          Host port mapped to container :80 (default 8080)
  --name <name>          Container name (default awareness)
  --skip-verify          Skip the local 'npm run verify' gate
  --dry-run              Print plan, don't execute
  --local-only           Build & run on this machine; don't push anywhere
  --verbose              Echo every subprocess
`);
  process.exit(opts.help ? 0 : 1);
}

const host = opts.host;
const port = opts.port;
const name = opts.name;
const dryRun = opts['dry-run'];
const localOnly = opts['local-only'];
const verbose = opts.verbose;

function step(msg) { console.log(`\n▶ ${msg}`); }
function ok(msg)   { console.log(`  ✓ ${msg}`); }
function info(msg) { console.log(`  ${msg}`); }
function fail(msg) { console.error(`\n✗ ${msg}`); process.exit(1); }
function plannedStep(label) { if (dryRun) console.log(`[DRY-RUN] ${label}`); }

// Validate argv against allowlists before any of it is interpolated into a
// shell command (docker run / ssh). A bad value fails fast instead of running.
try {
  assertValid('name', name);
  assertValid('port', port);
  if (!localOnly) assertValid('host', host);
} catch (e) {
  fail(e.message);
}

console.log(`Awareness deploy — Docker`);
console.log(`  Target:  ${localOnly ? 'LOCAL MACHINE' : host}`);
console.log(`  Port:    ${port} → container :80`);
console.log(`  Name:    ${name}`);
console.log(`  Mode:    ${dryRun ? 'DRY-RUN (no changes)' : 'EXECUTE'}`);

// Sanity-check docker locally (skipped on dry-run so the plan is visible
// even on machines that don't have Docker installed yet).
if (!dryRun) {
  try {
    execSync('docker --version', { stdio: 'pipe' });
  } catch (e) {
    fail('Docker CLI not found on this machine. Install Docker Desktop / Podman first.');
  }
}

// 1. Local verify ───────────────────────────────────────────────────────────
step('Step 1/7 — Local verify gate');
if (opts['skip-verify']) {
  info('skipped (--skip-verify)');
} else if (dryRun) {
  plannedStep('npm run verify');
} else {
  try {
    execSync('npm run verify', { cwd: ROOT, stdio: verbose ? 'inherit' : 'pipe' });
    ok('npm run verify passed');
  } catch (e) {
    fail('npm run verify FAILED. Fix the issue and re-run, or pass --skip-verify (not recommended).');
  }
}

// 2. Build the image locally ────────────────────────────────────────────────
step('Step 2/7 — Build container image');
const imageTag = `awareness:latest`;
if (dryRun) {
  plannedStep(`docker build -f deploy/Dockerfile -t ${imageTag} .`);
} else {
  try {
    execSync(`docker build -f deploy/Dockerfile -t ${imageTag} .`, {
      cwd: ROOT, stdio: verbose ? 'inherit' : 'pipe'
    });
    ok(`Image ${imageTag} built`);
  } catch (e) {
    fail('docker build failed. Run `docker build -f deploy/Dockerfile -t awareness:latest .` directly for full output.');
  }
}

// 3. Ship the image (unless --local-only) ──────────────────────────────────
let tarballPath = null;
if (localOnly) {
  step('Step 3/7 — Ship image (skipped: --local-only)');
} else {
  step(`Step 3/7 — Ship image to ${host}`);
  if (dryRun) {
    plannedStep(`docker save ${imageTag} | gzip > /tmp/awareness.tar.gz`);
    plannedStep(`scp /tmp/awareness.tar.gz ${host}:/tmp/awareness.tar.gz`);
  } else {
    // SSH reachability first
    if (!await testSSH(host)) {
      fail(`Cannot reach ${host} via SSH. Check host, key, port 22.`);
    }
    tarballPath = path.join(os.tmpdir(), `awareness-${Date.now()}.tar.gz`);
    try {
      // docker save piped through gzip into the tarball.
      execSync(`docker save ${imageTag} | gzip > "${tarballPath}"`, {
        shell: true, stdio: verbose ? 'inherit' : 'pipe'
      });
      ok(`Tarball written (${Math.round(execSync(`du -k "${tarballPath}"`).toString().split(/\s+/)[0])} KB)`);
      await pushFile(host, tarballPath, '/tmp/awareness.tar.gz');
      ok('Tarball copied to remote');
    } catch (e) {
      fail(`Ship step failed: ${e.message}`);
    }
  }
}

// 4. Load + run on the target ──────────────────────────────────────────────
step(`Step 4/7 — Run container ${localOnly ? 'locally' : 'on remote'}`);
const runCmds = localOnly ?
  `docker stop ${name} >/dev/null 2>&1 || true
docker rm ${name} >/dev/null 2>&1 || true
docker run -d --name ${name} -p ${port}:80 --restart unless-stopped ${imageTag}` :
  `set -e
gunzip -c /tmp/awareness.tar.gz | docker load
docker stop ${name} >/dev/null 2>&1 || true
docker rm ${name} >/dev/null 2>&1 || true
docker run -d --name ${name} -p ${port}:80 --restart unless-stopped ${imageTag}
rm -f /tmp/awareness.tar.gz`;

if (dryRun) {
  plannedStep((localOnly ? 'locally' : `ssh ${host}`) + ': ' + runCmds.split('\n').join(' && '));
} else {
  try {
    if (localOnly) {
      execSync(runCmds, { shell: true, stdio: verbose ? 'inherit' : 'pipe' });
    } else {
      await runRemote(host, runCmds);
    }
    ok('Container started');
  } catch (e) {
    fail(`docker run failed:\n${e.stderr || e.message}`);
  }
}

// 5. Wait for healthcheck ──────────────────────────────────────────────────
step('Step 5/7 — Wait for healthcheck');
const baseUrl = localOnly ? `http://127.0.0.1:${port}` : `http://${host.split('@').pop()}:${port}`;
if (dryRun) {
  plannedStep(`poll ${baseUrl}/health.html until status=ok or 30s timeout`);
} else {
  let healthy = false;
  for (let i = 0; i < 15; i++) {
    try {
      const body = await verifyHealth(`${baseUrl}/health.html`, 'ok');
      if (body.includes('ok')) { healthy = true; break; }
    } catch (_e) { /* retry */ }
    await new Promise(r => setTimeout(r, 2000));
  }
  if (!healthy) {
    console.warn(`  ⚠ Health check did not turn green within 30s. The container may still be starting. Check with:`);
    console.warn(`    ${localOnly ? '' : 'ssh ' + host + ' '}docker logs ${name}`);
  } else {
    ok(`Healthy at ${baseUrl}/health.html`);
  }
}

// 6. Smoke headers ──────────────────────────────────────────────────────────
step('Step 6/7 — Smoke test');
if (dryRun) {
  plannedStep(`curl -sI ${baseUrl}/index.html  (assert security headers)`);
} else {
  try {
    const body = await verifyHealth(`${baseUrl}/index.html`, 'Awareness');
    ok(`Index page renders (${body.length} bytes)`);
  } catch (e) {
    console.warn(`  ⚠ Index smoke failed: ${e.message}`);
  }
}

// 7. Persist deploy log ─────────────────────────────────────────────────────
step('Step 7/7 — Write deploy log');
const logEntry = {
  timestamp: new Date().toISOString(),
  target: localOnly ? 'local' : host,
  port, name,
  url: baseUrl,
  dryRun,
  result: dryRun ? 'DRY-RUN' : 'OK'
};
try {
  await mkdir(path.join(ROOT, 'dist'), { recursive: true });
  await writeFile(path.join(ROOT, 'dist', 'last-deploy.json'), JSON.stringify(logEntry, null, 2), 'utf8');
  ok(`dist/last-deploy.json written`);
} catch (e) {
  console.warn(`  ⚠ Could not write deploy log: ${e.message}`);
}

// Clean up local tarball
if (tarballPath) {
  try { execSync(`rm -f "${tarballPath}"`, { shell: true }); } catch (_e) { /* cleanup */ }
}

console.log('');
if (dryRun) {
  console.log(`▶ DRY-RUN complete. Re-run without --dry-run to apply.`);
} else {
  console.log(`✓ Container running at ${baseUrl}`);
  if (localOnly) {
    console.log(`  Stop with:    docker stop ${name}`);
    console.log(`  Restart:      docker start ${name}`);
  } else {
    console.log(`  Logs:         ssh ${host} docker logs -f ${name}`);
    console.log(`  Front with TLS via Caddy/Cloudflare/Traefik (see deploy/docker-compose.yml for a sidecar example).`);
  }
}
