# Security Posture

This document records the intentional security choices baked into the production build, the deferred items that have been explicitly scoped out, and how to report a security issue.

The hardening pass that established this posture is captured in `tests/unit/security.test.js` and `tests/e2e/security-smoke.spec.js`. Both run as part of `npm run verify`.

## What is protected

### Credentials never persist to disk

The user-supplied secret material — the AI API key, the SMTP password, and the Microsoft Graph client secret — lives only in `sessionStorage`. It is wiped when the tab closes; a fresh app launch starts with empty fields. None of it is ever written to `localStorage` or to IndexedDB.

| Credential | Form input | Session key | Where the live value sits during a session |
|---|---|---|---|
| AI API key | `#ai-key` | `awareness_ai_key_session_v1` | `App.AISummarizer` config (in memory) |
| SMTP password | `#smtp-password` | `awareness_smtp_password_session_v1` | `state.smtpProfile.password` (in memory) |
| Microsoft Graph client secret | `#graph-client-secret` | `awareness_graph_client_secret_session_v1` | `state.smtpProfile.graphClientSecret` (in memory) |

The save flow strips the credential before writing to `localStorage` (`awareness_ai_settings_v1` / `awareness_smtp_profile_v1`) and IndexedDB. On init, any legacy plaintext value found in `localStorage` from older builds is scrubbed.

### Content Security Policy

Every entry HTML file carries a meta CSP with these directives:

- `default-src 'self'`
- `script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com`
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- `font-src 'self' https://fonts.gstatic.com`
- `img-src 'self' data: blob: https:`
- `connect-src 'self' https://api.anthropic.com https://api.openai.com https://api.allorigins.win https://corsproxy.io https://api.codetabs.com https://api.rss2json.com https:`
- `frame-src 'self'`
- `object-src 'none'`
- `base-uri 'self'`
- `form-action 'self'`

`'unsafe-inline'` for scripts is **intentional and documented** — the app has ~94 inline event handlers; refactoring them to `addEventListener` is a deferred follow-up (see below). The other directives lock the boundaries that don't require code changes.

The same policy is duplicated at the response-header level in `deploy/nginx.conf.example`, `deploy/Caddyfile`, the Docker image's nginx config, and the Netlify / Cloudflare Pages / Vercel platform files. Defense-in-depth: the meta CSP protects the app even if it's served by something that doesn't add the response header.

### Response headers (when deployed via a provided config)

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`

### CDN script integrity

The two third-party scripts (`qrcode.min.js`, `jszip.min.js` from cdnjs) carry `integrity="sha384-..."` plus `crossorigin="anonymous"` plus `referrerpolicy="no-referrer"`. A compromised CDN cannot inject code.

### Ensemble logger hostname guard

`js/ai/logger.js` ships a hardcoded `http://127.0.0.1:4175/save` URL for AI prompt/response capture in dev. In production, an `isLocalhost()` guard short-circuits the request entirely — no futile fetch, no console noise, no information leak. Both `App.AILogger.log`/`logRaw` and the fallback path in `js/ai/bank_page_ensemble.js` are gated.

### SMTP relay URL guard

`callRelay` parses `cfg.relayUrl` and refuses to POST credentials over plain HTTP unless the destination is a loopback address (`127.0.0.1`, `localhost`, `::1`). This prevents an SMTP password from being sent to an attacker-controlled HTTP endpoint, even if the user typo'd the URL.

### Lint

`eslint-plugin-security` and `eslint-plugin-no-unsanitized` are installed and active as **warnings**. They surface unsafe `innerHTML` assignments and other risky patterns without breaking the verify gate (existing legitimate uses produce warnings, not errors).

### Production packaging

`npm run build:dist` produces a `dist/` folder that contains only files intended to ship — no tests, scripts, docs, baseline JSON, or hidden files. The script also re-verifies SRI hashes and meta CSP on the shipped artifact and exits non-zero if either is missing.

### No backend = no per-user data on your server

All user state — workspaces, drafts, credentials, projects, delivery logs — lives in the user's browser (`localStorage`, `sessionStorage`, IndexedDB). The server returns static files only. No application database, no per-user log, no cleanup between users.

API calls go **browser → Anthropic/OpenAI directly**. Your server never sees the user's AI key. This is by design and is a key reason the app can be hosted under a strict, header-only CSP without a backend proxy.

## Out of scope (deferred follow-ups)

These are known items that were intentionally not addressed in the production-hardening pass because they would change app behavior or have a large blast radius. Each is a candidate for a future, scoped effort:

1. **Strict CSP / inline-handler refactor.** Moving the ~94 `onclick=`/`oninput=` handlers to delegated `addEventListener` would let us drop `'unsafe-inline'` from `script-src`. Large diff, high regression risk; explicitly de-scoped during the hardening pass.
2. **Editor iframe sanitization on undo/redo.** `js/editor.js` round-trips user-edited HTML through `innerHTML` when restoring an undo state. Same-origin, user is the only "attacker," so practical risk is low — but a tag-allowlist (e.g., DOMPurify) is worth a follow-up.
3. **HTTPS-only RSS feed sources.** Currently moot because the "Add custom source" UI was removed earlier in the project. Revisit if the feature returns.
4. **`npm audit` in the verify gate.** Available as `npm run audit:deps`. Not in `verify` so a freshly disclosed CVE in a dev dep can't break the local gate. Promote once a CI workflow exists and you want PRs to block on it.
5. **CI workflow.** No GitHub Actions / GitLab CI / etc. configured. Not added because the repo wiring is environment-specific.
6. **TLS pre-load.** Once you're confident about all subdomains, bump HSTS `max-age` to 63072000 (two years) and add `preload`, then submit to https://hstspreload.org/.

## How to report a security issue

If you find a security issue:

1. **Do not** open a public GitHub issue.
2. Email the maintainer privately with:
   - A clear description of the issue.
   - Steps to reproduce.
   - The affected file path(s) and commit hash, if known.
   - Your assessment of impact.
3. Allow reasonable time for triage and remediation before any public disclosure.

## Auditing the deployed posture

After deploying via any of the four paths in `docs/DEPLOY.md`, run the post-deploy smoke checks documented there. The fastest external check is `https://securityheaders.com/?q=<your-domain>` — it should report **A** (or **A+** once HSTS is preloaded). The `'unsafe-inline'` flag on scripts is expected and is what blocks A+.

The regression locks for everything in this document live in:

- `tests/unit/security.test.js` — file-scan + pure-function checks (escapeHtml, console.* sensitive-key scan, hostname-guard logic, meta CSP presence, SRI on shipped HTML, source-level guarantees).
- `tests/e2e/security-smoke.spec.js` — real-browser checks (every page loads with no console errors and a CSP, credentials never land in localStorage after a real save).

Both suites run as part of `npm run verify`.
