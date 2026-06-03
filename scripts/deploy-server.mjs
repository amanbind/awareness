#!/usr/bin/env node
// scripts/deploy-server.mjs — one-click deploy to a fresh Linux server.
//
// Builds the production artifact locally, then over SSH:
//   - installs nginx + certbot if missing (apt-based or dnf-based distros)
//   - rsyncs dist/ to the web root
//   - installs the hardened nginx config with placeholders substituted
//   - validates and reloads nginx
//   - issues a Let's Encrypt certificate via certbot (unless --no-tls)
//   - smoke-tests the live site from the local machine
//
// Usage:
//   node scripts/deploy-server.mjs --host user@1.2.3.4 --domain mywebsite.com
//   node scripts/deploy-server.mjs --host user@1.2.3.4 --domain mywebsite.com --no-tls
//   node scripts/deploy-server.mjs --host user@1.2.3.4 --domain mywebsite.com --dry-run
//
// Flags:
//   --host           ssh target, e.g. user@1.2.3.4 (required)
//   --domain         FQDN that will serve the site (required)
//   --webroot        absolute path on the remote (default /var/www/awareness)
//   --skip-verify    skip the local `npm run verify` gate
//   --no-tls         skip the certbot step (HTTP-only deploy)
//   --dry-run        print the plan, don't execute
//   --verbose        echo every subprocess

import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runRemote, pushFile, pushTree, testSSH } from './lib/ssh.mjs';
import { verifyHeaders, verifyHealth } from './lib/smoke.mjs';
import { assertValid } from './lib/argv-validate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const { values: opts } = parseArgs({
  options: {
    host:          { type: 'string' },
    domain:        { type: 'string' },
    webroot:       { type: 'string', default: '/var/www/awareness' },
    'skip-verify': { type: 'boolean', default: false },
    'no-tls':      { type: 'boolean', default: false },
    'dry-run':     { type: 'boolean', default: false },
    verbose:       { type: 'boolean', default: false },
    help:          { type: 'boolean', default: false }
  }
});

if (opts.help || !opts.host || !opts.domain) {
  console.log(`Usage: node scripts/deploy-server.mjs --host user@host --domain site.example.com [flags]

Required:
  --host <user@host>     SSH target (e.g. ubuntu@1.2.3.4)
  --domain <fqdn>        FQDN the site will be served from

Optional:
  --webroot <path>       Remote web root (default /var/www/awareness)
  --skip-verify          Skip the local 'npm run verify' gate
  --no-tls               Skip the certbot HTTPS step
  --dry-run              Print plan, don't execute
  --verbose              Echo every subprocess
`);
  process.exit(opts.help ? 0 : 1);
}

const { host, domain, webroot } = opts;
const dryRun = opts['dry-run'];
const verbose = opts.verbose;

function step(msg) { console.log(`\n▶ ${msg}`); }
function ok(msg)   { console.log(`  ✓ ${msg}`); }
function info(msg) { console.log(`  ${msg}`); }
function fail(msg) { console.error(`\n✗ ${msg}`); process.exit(1); }

function plannedStep(label) {
  if (dryRun) console.log(`[DRY-RUN] ${label}`);
}

// Validate argv against allowlists before any value is interpolated into a
// shell command (ssh / certbot) or an nginx config. Fail fast on bad input.
try {
  assertValid('host', host);
  assertValid('domain', domain);
  assertValid('webroot', webroot);
} catch (e) {
  fail(e.message);
}

console.log(`Awareness deploy — bare Linux + nginx`);
console.log(`  Host:    ${host}`);
console.log(`  Domain:  ${domain}`);
console.log(`  Webroot: ${webroot}`);
console.log(`  TLS:     ${opts['no-tls'] ? 'OFF' : 'Let\'s Encrypt via certbot'}`);
console.log(`  Mode:    ${dryRun ? 'DRY-RUN (no remote changes)' : 'EXECUTE'}`);

// 1. Local verify ───────────────────────────────────────────────────────────
step('Step 1/9 — Local verify gate');
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

// 2. Local build ────────────────────────────────────────────────────────────
step('Step 2/9 — Build dist/');
if (dryRun) {
  plannedStep('npm run build:dist -- --force');
} else {
  try {
    execSync('node scripts/build-dist.mjs --force', { cwd: ROOT, stdio: verbose ? 'inherit' : 'pipe' });
    ok('dist/ ready');
  } catch (e) {
    fail('build-dist failed. Run `node scripts/build-dist.mjs --force` directly for full output.');
  }
}

// 3. Test SSH ───────────────────────────────────────────────────────────────
step(`Step 3/9 — SSH reachability to ${host}`);
if (dryRun) {
  plannedStep(`ssh ${host} echo __ssh_ok__`);
} else {
  const reachable = await testSSH(host);
  if (!reachable) {
    fail(`Cannot reach ${host} via SSH. Check the host, your SSH key (must be added to remote ~/.ssh/authorized_keys), and that port 22 is open.`);
  }
  ok('SSH OK');
}

// 4. Detect distro and install prereqs ─────────────────────────────────────
step('Step 4/9 — Detect distro and install nginx + certbot (if missing)');
const installScript = `set -e
if [ -r /etc/os-release ]; then . /etc/os-release; else ID=unknown; fi
echo "DISTRO=$ID"
need_nginx=1; need_certbot=1
command -v nginx >/dev/null 2>&1 && need_nginx=0
command -v certbot >/dev/null 2>&1 && need_certbot=0
if [ "$need_nginx" = 1 ] || [ "$need_certbot" = 1 ]; then
  case "$ID" in
    ubuntu|debian|linuxmint|pop)
      sudo apt-get update -qq
      [ "$need_nginx" = 1 ]   && sudo apt-get install -y nginx
      [ "$need_certbot" = 1 ] && sudo apt-get install -y certbot python3-certbot-nginx
      ;;
    rhel|centos|rocky|almalinux|fedora|ol)
      sudo dnf install -y epel-release || true
      [ "$need_nginx" = 1 ]   && sudo dnf install -y nginx
      [ "$need_certbot" = 1 ] && sudo dnf install -y certbot python3-certbot-nginx
      ;;
    alpine)
      sudo apk add --no-cache nginx certbot certbot-nginx
      ;;
    *)
      echo "Unsupported distro: $ID. Install nginx + certbot manually and re-run with --skip-install (not supported by this script)."
      exit 2
      ;;
  esac
fi
sudo systemctl enable nginx >/dev/null 2>&1 || true
sudo systemctl start nginx >/dev/null 2>&1 || true
echo INSTALL_OK`;
if (dryRun) {
  plannedStep(`ssh ${host} '<distro-aware install of nginx + certbot>'`);
} else {
  try {
    const { stdout } = await runRemote(host, installScript);
    const distroLine = stdout.split('\n').find(l => l.startsWith('DISTRO=')) || '';
    ok(`Remote ready (${distroLine.replace('DISTRO=', 'distro: ')})`);
  } catch (e) {
    fail(`Remote install step failed:\n${e.stderr || e.message}\n\nIf this server uses a non-supported distro, install nginx + certbot manually then re-run.`);
  }
}

// 5. rsync dist/ to webroot ─────────────────────────────────────────────────
step(`Step 5/9 — Copy dist/ → ${host}:${webroot}`);
if (dryRun) {
  plannedStep(`ssh ${host} 'sudo mkdir -p ${webroot} && sudo chown -R $USER ${webroot}'`);
  plannedStep(`rsync -az --delete dist/ ${host}:${webroot}`);
} else {
  try {
    await runRemote(host, `sudo mkdir -p ${webroot} && sudo chown -R $(whoami) ${webroot}`);
    await pushTree(host, path.join(ROOT, 'dist'), webroot);
    ok(`Web root populated at ${webroot}`);
  } catch (e) {
    fail(`rsync to ${host}:${webroot} failed:\n${e.stderr || e.message}`);
  }
}

// 6. Install nginx site config ─────────────────────────────────────────────
step('Step 6/9 — Install nginx site config');
const nginxTemplatePath = path.join(ROOT, 'deploy', 'nginx.conf.example');
const localRenderedConfig = path.join(ROOT, 'dist', '_nginx-site.conf');

if (dryRun) {
  plannedStep(`substitute __DOMAIN__/__WEB_ROOT__/__TLS_*__ in ${nginxTemplatePath}`);
  plannedStep(`scp rendered config to ${host}:/tmp/awareness.conf`);
  plannedStep(`ssh ${host} 'sudo mv /tmp/awareness.conf /etc/nginx/sites-available/awareness && sudo ln -sf ../sites-available/awareness /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx'`);
} else {
  let cfg = await readFile(nginxTemplatePath, 'utf8');
  // Pre-TLS: use a placeholder cert path that certbot will replace. If --no-tls,
  // strip the 443 server block down to a 80-only server. To keep things simple
  // for the first cut we rewrite the cert paths to certbot's expected locations
  // and let certbot handle the swap.
  cfg = cfg
    .replaceAll('__DOMAIN__', domain)
    .replaceAll('__WEB_ROOT__', webroot)
    .replaceAll('__TLS_CERT__', `/etc/letsencrypt/live/${domain}/fullchain.pem`)
    .replaceAll('__TLS_KEY__',  `/etc/letsencrypt/live/${domain}/privkey.pem`);

  if (opts['no-tls']) {
    // Replace the 443 server block with a placeholder comment so nginx -t
    // succeeds before certbot has a chance to provision certs.
    cfg = cfg.replace(/server\s*\{[\s\S]*?listen 443[\s\S]*?\n\}/m, '# (HTTPS server block omitted: --no-tls)');
  } else {
    // Before certbot runs, the cert files don't exist. Switch to HTTP-only
    // bootstrap config so `nginx -t` passes; certbot will rewrite it.
    cfg = cfg.replace(/server\s*\{[\s\S]*?listen 443[\s\S]*?\n\}/m, '# (HTTPS server block will be installed by certbot after first issuance)');
  }

  await writeFile(localRenderedConfig, cfg, 'utf8');
  try {
    await pushFile(host, localRenderedConfig, '/tmp/awareness.conf');
    const installCmd = `
set -e
sudo mv /tmp/awareness.conf /etc/nginx/sites-available/awareness
sudo mkdir -p /etc/nginx/sites-enabled
sudo ln -sf /etc/nginx/sites-available/awareness /etc/nginx/sites-enabled/awareness
# Remove default site if present (Ubuntu/Debian convention)
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
echo NGINX_OK`;
    const { stdout } = await runRemote(host, installCmd);
    if (!stdout.includes('NGINX_OK')) throw new Error('nginx install did not finalize cleanly');
    ok('nginx config installed and reloaded');
  } catch (e) {
    fail(`nginx install failed:\n${e.stderr || e.message}`);
  } finally {
    try { await unlink(localRenderedConfig); } catch (_e) { /* cleanup */ }
  }
}

// 7. Provision TLS via certbot ──────────────────────────────────────────────
step('Step 7/9 — Issue Let\'s Encrypt certificate');
if (opts['no-tls']) {
  info('skipped (--no-tls)');
} else if (dryRun) {
  plannedStep(`ssh ${host} 'sudo certbot --nginx --non-interactive --agree-tos -m admin@${domain} -d ${domain}'`);
} else {
  const certCmd = `sudo certbot --nginx --non-interactive --agree-tos --redirect -m admin@${domain} -d ${domain}`;
  try {
    const { stdout } = await runRemote(host, certCmd);
    if (verbose) info(stdout.split('\n').slice(-5).join('\n'));
    ok(`TLS issued for ${domain}`);
  } catch (e) {
    console.warn(`  ⚠ certbot failed (the site is still up over HTTP).\n  Diagnostic:\n${e.stderr || e.message}`);
    console.warn(`  Re-run later with:  ssh ${host} '${certCmd}'`);
  }
}

// 8. Smoke headers from local ───────────────────────────────────────────────
step('Step 8/9 — Smoke test live site');
const proto = opts['no-tls'] ? 'http' : 'https';
const liveUrl = `${proto}://${domain}`;
if (dryRun) {
  plannedStep(`curl -sI ${liveUrl}/index.html  (assert security headers)`);
  plannedStep(`curl -s  ${liveUrl}/health.html (assert body = "ok")`);
} else {
  try {
    const headers = await verifyHeaders(`${liveUrl}/index.html`, [
      'content-security-policy',
      'x-frame-options',
      'x-content-type-options',
      'referrer-policy'
    ].concat(opts['no-tls'] ? [] : ['strict-transport-security']));
    ok('security headers present');
    if (verbose) for (const [k, v] of Object.entries(headers)) info(`  ${k}: ${v.slice(0, 80)}`);

    const health = await verifyHealth(`${liveUrl}/health.html`, 'ok');
    ok(`health endpoint OK (body: ${health.trim().slice(0, 32)})`);
  } catch (e) {
    console.warn(`  ⚠ Smoke check failed (the site may still work in a browser):\n  ${e.message}`);
  }
}

// 9. Persist deploy log ─────────────────────────────────────────────────────
step('Step 9/9 — Write deploy log');
const logEntry = {
  timestamp: new Date().toISOString(),
  host, domain, webroot,
  tls: !opts['no-tls'],
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

console.log('');
if (dryRun) {
  console.log(`▶ DRY-RUN complete. Re-run without --dry-run to apply.`);
} else {
  console.log(`✓ Deployed to ${liveUrl}`);
  console.log(`  Header grade check: https://securityheaders.com/?q=${domain}`);
  console.log(`  Re-deploy any time with the same command.`);
}
