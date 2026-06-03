# TODO

## OAuth2 proxy + Caddy session persistence fixes

- [x] Update `deploy/Caddyfile`: add `Set-Cookie` to `forward_auth ... copy_headers` so oauth2-proxy session cookie reaches the browser.
- [x] Update `deploy/caddy.oauth2.conf`: add `Set-Cookie` to its `forward_auth ... copy_headers` for consistency.
- [x] Update `deploy/docker-compose.yml`: add Redis `healthcheck` and change oauth2-proxy `depends_on` to wait for Redis `service_healthy`.

- [ ] Run `deploy/validate-config.sh`.
- [ ] Bring stack up (`docker-compose up --build`) and verify cookies persist (no repeated redirects/auth).

