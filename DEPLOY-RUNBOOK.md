# Deploy runbook — my DigitalOcean Ubuntu server (HTTP, IP only)

The from-zero steps to put this static site on a fresh Ubuntu server and serve it
over plain HTTP on the server's IP. No domain, no Node, no Docker required — nginx
serves the files directly. Tailored to the setup that actually worked; includes the
two gotchas that bit us (nginx site not enabled, and subfolders copied as mode 700).

Replace `<SERVER_IP>` everywhere with the droplet's IP. You SSH in as `root`.

---

## A. One-time server setup (run once per fresh server)

SSH into the server: `ssh root@<SERVER_IP>`  — prompt becomes `root@...:~#`.

### 1. Install nginx

```bash
apt update && apt install -y nginx
```

### 2. Create the web root

```bash
mkdir -p /var/www/awareness
```

### 3. Write the nginx config (paste the whole block, including the final `NGINX`)

```bash
cat > /etc/nginx/sites-available/awareness <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/awareness;
    index index.html;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    location = /builder.html { return 301 /index.html#section-home; }
    location = /health.html  { access_log off; }
    location ~ /\.           { deny all; }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX
```

### 4. Enable the site, drop the default, test, start

```bash
ln -sf /etc/nginx/sites-available/awareness /etc/nginx/sites-enabled/awareness
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

`nginx -t` must say "test is successful". (Gotcha #1: if you skip the `ln -sf` /
`rm default`, nginx serves its default page and every app URL 404s.)

---

## B. Copy the site files (first deploy AND every update)

### Windows side — from the project folder in VS Code's terminal

First **Save All** in VS Code (`Ctrl+K` then `S`). Make sure the OneDrive folder
shows a green check, not a cloud icon.

Then one command does the copy **and** the permission fix:

```powershell
.\deploy.ps1 -Server root@<SERVER_IP>
```

(That's `deploy.ps1` in this project. It scp's all 10 `.html` pages + `js/ css/
assets/ templates/`, then runs `chmod -R a+rX` over SSH.)

**If you don't want to use the script**, the two manual commands are:

```powershell
# 1. copy (Windows):
scp -r index.html preview.html projects.html send.html config.html editor.html keywords.html curation-lab.html builder.html health.html js css assets templates root@<SERVER_IP>:/var/www/awareness/
```
```bash
# 2. fix permissions (server) — Gotcha #2: scp lands new folders as 0700, which
#    makes nginx 404 the JS and show "App is not defined" / no templates.
chmod -R a+rX /var/www/awareness
```

---

## C. Verify

On the server:

```bash
curl -s  http://localhost/health.html              # -> ok
curl -sI http://localhost/js/utils.js | grep -i content-type   # -> application/javascript
```

In the browser: open `http://<SERVER_IP>/` and **hard-refresh** (`Ctrl+Shift+R`).
Template cards should appear; F12 console should have no red errors.

---

## D. Notes

- **Reboot:** nginx auto-starts and files persist, so the site comes back up by
  itself. Nothing to redeploy.
- **Updates:** after editing locally, just re-run section B (`deploy.ps1`) + hard
  refresh. No nginx reload needed for file-only changes.
- **HTTPS later:** once you have a domain pointed at the IP, run
  `apt install -y certbot python3-certbot-nginx && certbot --nginx -d yourdomain.com`.
- **Firewall:** if `ufw` is active, `ufw allow 80/tcp`. Also allow HTTP in the
  DigitalOcean Cloud Firewall (web dashboard) if you use one.
- **Per-user AI keys:** each visitor enters their own key on `/config.html`; it
  never touches the server. There is no backend to manage.
```
