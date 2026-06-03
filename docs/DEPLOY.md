# Deployment Guide

This is a static, no-build, vanilla-JS web app. There's no backend, no server-side runtime, no environment variables — just HTML/JS/CSS plus assets. Anything that can serve static files can host it.

This guide walks four deploy paths. Pick the one that fits the host you have.

| Path | Use when | Setup time |
|---|---|---|
| **Docker** | You have any host that runs containers (cloud, NAS, VPS, your laptop). Most portable. | ~2 min |
| **Caddy** | You want auto-HTTPS with one config line, no ACME wrangling. | ~5 min |
| **nginx** | You already have nginx (any Linux distro: Ubuntu, Debian, RHEL/CentOS/Rocky, Alpine, etc.). | ~15 min |
| **Static host** | Netlify, Cloudflare Pages, Vercel, S3+CloudFront, GitHub Pages. No server at all. | ~10 min |

All four produce the same security posture: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP, CORP. See `docs/SECURITY.md` for the policy itself and the deferred follow-up items.

---

## 0. Prerequisites

- **Node ≥ 20** on the machine that runs `npm run build:dist` (it doesn't need to be the production host; you can build locally and `rsync` the `dist/` folder).
- The app **does not** install anything on the production host beyond a web server. No Node runtime, no Python, no nothing.

Per-path:
- **Docker path** — Docker / Podman / containerd (anything OCI-compatible).
- **Caddy path** — Caddy ≥ 2.0 (`caddy version`).
- **nginx path** — nginx ≥ 1.18 + an ACME client (certbot, acme.sh, lego — any of them work).
- **Static host path** — the platform's CLI (`netlify`, `wrangler`, `vercel`) or just their web dashboard.

---

## 1. Build the production artifact (every path)

On any machine (Linux, macOS, Windows):

```bash
git clone <repo> awareness
cd awareness
npm ci
npm run verify           # lint + unit + e2e + baseline — sanity gate
npm run build:dist       # produces dist/
```

`npm run build:dist` produces a `dist/` folder containing only files that should ship:

- All entry `*.html` files
- `js/`, `css/`, `assets/`, `templates/`
- `health.html`

It *excludes* `tests/`, `scripts/`, `docs/`, `node_modules/`, baseline JSON, ensemble logs, dotfiles, source maps, and anything matching `*.test.js`/`*.spec.js`/`*.local.*`. The script refuses to overwrite an existing `dist/` unless you pass `--force`.

The script also re-verifies that every entry HTML in the shipped artifact carries (a) SRI integrity hashes on every cdnjs `<script>` tag and (b) the meta CSP. If those checks fail, the script exits non-zero so you can't accidentally ship an unhardened build.

---

## 2. Path A — Docker (runs literally everywhere)

The simplest path. The image self-includes nginx + the hardened config. Works on any host with a container runtime.

```bash
# Build the image (uses deploy/Dockerfile, multi-stage)
docker build -f deploy/Dockerfile -t awareness:latest .

# Run it (binds container port 80 to host port 8080)
docker run -d --name awareness -p 8080:80 awareness:latest

# Smoke test
curl -I http://localhost:8080/index.html        # should show CSP, X-Frame-Options, etc.
curl http://localhost:8080/health.html          # should return: ok
```

For a single-command launch with healthcheck + restart policy, use the included compose file:

```bash
cd deploy
docker compose up -d
docker compose ps     # awareness should report "healthy" after a few seconds
```

The compose file includes an **optional, commented Caddy sidecar** for free TLS — uncomment the second service and set `CADDY_DOMAIN`, then point your DNS at the host.

### Kubernetes / Podman / nerdctl / Swarm

The image is a standard OCI artifact. Push it to your registry and deploy it however you normally deploy a static-nginx site. Nothing app-specific is required.

---

## 3. Path B — Caddy (auto-HTTPS, smallest config)

Caddy auto-provisions TLS via ACME on first start. ~25 lines of config; that's the whole thing.

```bash
# Copy the artifact and config.
sudo mkdir -p /var/www/awareness
sudo rsync -av dist/ /var/www/awareness/
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile

# Edit the two placeholders.
sudo sed -i 's|__DOMAIN__|awareness.example.com|g; s|__WEB_ROOT__|/var/www/awareness|g' /etc/caddy/Caddyfile

# Validate and reload.
caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

On first request to your domain, Caddy provisions a Let's Encrypt cert automatically. No certbot, no cron, no renewal scripts — Caddy handles it.

---

## 4. Path C — nginx + ACME (traditional Linux)

Works on Ubuntu, Debian, RHEL/CentOS/Rocky/Alma, Alpine, Arch — any distro with nginx and an ACME client.

```bash
# Copy the artifact.
sudo mkdir -p /var/www/awareness
sudo rsync -av dist/ /var/www/awareness/

# Install the nginx site config.
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/awareness
# (RHEL family: /etc/nginx/conf.d/awareness.conf)

# Fill in the placeholders.
sudo sed -i 's|__DOMAIN__|awareness.example.com|g; s|__WEB_ROOT__|/var/www/awareness|g' /etc/nginx/sites-available/awareness

# Provision TLS — pick the ACME client that fits the host.
# Example with certbot (Debian/Ubuntu):
sudo certbot --nginx -d awareness.example.com
# certbot fills the __TLS_CERT__ / __TLS_KEY__ placeholders automatically and
# adds a renewal timer. Verify:
sudo certbot renew --dry-run

# Enable the site and reload.
sudo ln -s /etc/nginx/sites-available/awareness /etc/nginx/sites-enabled/  # Debian-family only
sudo nginx -t
sudo systemctl reload nginx
```

If you don't have a domain yet and just want to test on a raw IP, comment out the `:443` server block and serve from `:80`. You lose HSTS but everything else still works for testing.

---

## 5. Path D — Static host (Netlify / Cloudflare Pages / Vercel / S3+CloudFront)

No server-side config — just point the platform at the right files.

### Netlify

```bash
# One-time: install the CLI.
npm i -g netlify-cli

# Copy the platform config to the repo root if you haven't already.
cp deploy/netlify.toml ./netlify.toml

# Deploy.
netlify deploy --prod --dir=dist
```

The `netlify.toml` already has all security headers + the `builder.html` redirect.

### Cloudflare Pages

```bash
npm i -g wrangler

# Copy header + redirect files into dist/ before publishing.
cp deploy/cloudflare-pages-headers dist/_headers
cp deploy/cloudflare-pages-redirects dist/_redirects

wrangler pages publish dist --project-name awareness
```

### Vercel

```bash
npm i -g vercel
cp deploy/vercel.json ./vercel.json
vercel deploy --prod
```

### AWS S3 + CloudFront

1. `aws s3 sync dist/ s3://your-bucket/ --delete`
2. In CloudFront, add a response-headers policy with the same headers from `deploy/nginx.conf.example`. Apply it to the distribution.
3. Configure a Lambda@Edge or CloudFront function for the `/builder.html` → `/index.html#section-home` redirect, OR just leave it since `builder.html` still works as a client-side redirect.

---

## 6. Post-deploy smoke (any path)

Run these against the deployed host. Every check should pass identically regardless of which deploy path you used.

```bash
# 1) Headers — confirm every security header lands in the response.
curl -sI https://<your-domain>/index.html | grep -E '^(strict-transport-security|content-security-policy|x-content-type-options|x-frame-options|referrer-policy|permissions-policy):'

# Expected: all six lines present.

# 2) Health endpoint.
curl -s https://<your-domain>/health.html
# Expected: ok

# 3) External grade check.
# Open https://securityheaders.com/?q=<your-domain>  — should report A (or A+
# once you bump HSTS max-age and pre-load). The 'unsafe-inline' for scripts is
# expected and documented; see docs/SECURITY.md.

# 4) Hidden paths are denied.
curl -sI https://<your-domain>/tests/ | head -1            # 404 or 403
curl -sI https://<your-domain>/package.json | head -1      # 404 or 403
curl -sI https://<your-domain>/.git/config | head -1       # 404 or 403
```

**Browser smoke (manual):**

1. Open the home page fresh — no console errors in DevTools.
2. Navigate to `/config.html`, enter a real AI API key, click Save All. Open DevTools → Application → Local Storage — the key is **not** there. Session Storage has `awareness_ai_key_session_v1`.
3. Navigate to `/index.html`, fetch articles, generate a newsletter — AI flow works.
4. Close the tab, open a new tab to the same URL — AI key field is empty. User must re-enter for a new session. ✓
5. On Config page, the SMTP password should behave the same way (session-only).

---

## 7. Rollback

- **Docker**: `docker run -d --name awareness -p 8080:80 awareness:<previous-tag>` and stop the failing one. Tag images with timestamps so you always have one to roll back to.
- **Static file path** (Caddy / nginx): keep the previous `dist-YYYY-MM-DD/` folder on the server. `rsync -av --delete dist-previous/ /var/www/awareness/` to revert.
- **Static host**: every platform supports rollback to a previous deployment from the dashboard.

---

## 8. Operational notes

- **Logs.** Only nginx/Caddy access + error logs. There's no application server, no application log. AI API errors are visible only in the user's browser DevTools.
- **No backend = no per-user persistence.** Every user's state lives in their browser (`localStorage` + `sessionStorage` + IndexedDB). Clearing site data wipes their workspace. There's nothing on the server to clean up between users.
- **AI API costs.** Every user brings their own key. The app makes API calls directly browser → Anthropic/OpenAI. Your server never sees the key. This is by design; do not add a backend proxy unless you also plan to take on auth and rate limiting.
- **Ensemble logger.** Hardcoded to `http://127.0.0.1:4175/save` but gated by a hostname check (`isLocalhost()`) — in production this guard prevents the request being made at all. No leak.
- **RSS proxies.** Article fetching goes through public CORS proxies (`allorigins.win`, `corsproxy.io`, `codetabs.com`, `rss2json.com`). They're allowlisted in the CSP. If one goes down, the app falls back to the next.
