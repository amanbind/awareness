#!/bin/bash
set -e

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "OAuth2 + Caddy Configuration Validator"
echo "========================================"
echo ""

ERRORS=0

# Check 1: .env.sso exists and has required vars
echo "Checking .env.sso..."
if [ ! -f ".env.sso" ]; then
    echo "  ERROR: .env.sso not found"
    ERRORS=$((ERRORS + 1))
else
    REQUIRED_VARS=(
        "OAUTH2_PROXY_CLIENT_ID"
        "OAUTH2_PROXY_CLIENT_SECRET"
        "OAUTH2_PROXY_OIDC_ISSUER_URL"
        "OAUTH2_PROXY_REDIRECT_URL"
        "OAUTH2_PROXY_COOKIE_DOMAIN"
        "OAUTH2_PROXY_COOKIE_SECRET"
        "OAUTH2_PROXY_COOKIE_SECURE"
        "OAUTH2_PROXY_REVERSE_PROXY"
        "OAUTH2_PROXY_SET_XAUTHREQUEST"
    )

    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "$var=" .env.sso; then
            echo "  ERROR: Missing $var in .env.sso"
            ERRORS=$((ERRORS + 1))
        fi
    done

    if ! grep -q "OAUTH2_PROXY_REDIRECT_URL=https://" .env.sso; then
        echo "  ERROR: OAUTH2_PROXY_REDIRECT_URL must use https://"
        ERRORS=$((ERRORS + 1))
    fi

    if ! grep -q "OAUTH2_PROXY_COOKIE_SECURE=true" .env.sso; then
        echo "  ERROR: OAUTH2_PROXY_COOKIE_SECURE should be true"
        ERRORS=$((ERRORS + 1))
    fi

    if ! grep -q "OAUTH2_PROXY_REVERSE_PROXY=true" .env.sso; then
        echo "  ERROR: OAUTH2_PROXY_REVERSE_PROXY should be true behind Caddy/Azure"
        ERRORS=$((ERRORS + 1))
    fi

    if ! grep -q "OAUTH2_PROXY_SET_XAUTHREQUEST=true" .env.sso; then
        echo "  ERROR: OAUTH2_PROXY_SET_XAUTHREQUEST should be true for X-Auth-Request headers"
        ERRORS=$((ERRORS + 1))
    fi

    REDIRECT_URL=$(grep "^OAUTH2_PROXY_REDIRECT_URL=" .env.sso | head -n1 | cut -d= -f2-)
    COOKIE_DOMAIN=$(grep "^OAUTH2_PROXY_COOKIE_DOMAIN=" .env.sso | head -n1 | cut -d= -f2-)
    CADDY_DOMAIN=$(grep "^CADDY_DOMAIN=" .env.sso | head -n1 | cut -d= -f2-)

    if [ -n "$REDIRECT_URL" ] && [ -n "$COOKIE_DOMAIN" ]; then
        REDIRECT_HOST=$(printf '%s' "$REDIRECT_URL" | sed -E 's#^https?://##; s#/oauth2/callback.*$##')
        if [ "$REDIRECT_HOST" != "$COOKIE_DOMAIN" ]; then
            echo "  ERROR: OAUTH2_PROXY_REDIRECT_URL host ($REDIRECT_HOST) must match OAUTH2_PROXY_COOKIE_DOMAIN ($COOKIE_DOMAIN)"
            ERRORS=$((ERRORS + 1))
        fi
    fi

    if [ -n "$CADDY_DOMAIN" ]; then
        if [ -n "$COOKIE_DOMAIN" ] && [ "$COOKIE_DOMAIN" != "$CADDY_DOMAIN" ]; then
            echo "  ERROR: OAUTH2_PROXY_COOKIE_DOMAIN ($COOKIE_DOMAIN) must match CADDY_DOMAIN ($CADDY_DOMAIN)"
            ERRORS=$((ERRORS + 1))
        fi
        if [ -n "$REDIRECT_URL" ]; then
            REDIRECT_HOST=$(printf '%s' "$REDIRECT_URL" | sed -E 's#^https?://##; s#/oauth2/callback.*$##')
            if [ "$REDIRECT_HOST" != "$CADDY_DOMAIN" ]; then
                echo "  ERROR: OAUTH2_PROXY_REDIRECT_URL host ($REDIRECT_HOST) must match CADDY_DOMAIN ($CADDY_DOMAIN)"
                ERRORS=$((ERRORS + 1))
            fi
        fi
    fi
fi

# Check 2: Caddyfile exists
echo "Checking Caddyfile..."
if [ ! -f "Caddyfile" ]; then
    echo "  ERROR: Caddyfile not found"
    ERRORS=$((ERRORS + 1))
else
    if ! grep -q "import caddy.oauth2.conf" Caddyfile; then
        echo "  ERROR: Caddyfile should import caddy.oauth2.conf"
        ERRORS=$((ERRORS + 1))
    fi

    if ! grep -q "trusted_proxies private_ranges" Caddyfile; then
        echo "  ERROR: Caddyfile should trust private proxy hops for Azure/App Service"
        ERRORS=$((ERRORS + 1))
    fi

    if ! grep -q '^localhost {' Caddyfile; then
        echo "  ERROR: Caddyfile should define a localhost site block"
        ERRORS=$((ERRORS + 1))
    fi

    if ! grep -q '^:80 {' Caddyfile; then
        echo "  ERROR: Caddyfile should define a :80 site block for Azure/App Service"
        ERRORS=$((ERRORS + 1))
    fi
fi

if [ -f "caddy.oauth2.conf" ]; then
    if ! grep -q "reverse_proxy awareness:80" caddy.oauth2.conf; then
        echo "  ERROR: caddy.oauth2.conf missing 'reverse_proxy awareness:80'"
        ERRORS=$((ERRORS + 1))
    fi
    if ! grep -q "forward_auth oauth2-proxy:4180" caddy.oauth2.conf; then
        echo "  ERROR: caddy.oauth2.conf missing 'forward_auth oauth2-proxy:4180'"
        ERRORS=$((ERRORS + 1))
    fi
    if ! grep -q "rd={scheme}://{host}{uri}" caddy.oauth2.conf; then
        echo "  ERROR: caddy.oauth2.conf should redirect unauthenticated users with the full scheme/host/uri"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check 3: docker-compose.yml structure
echo "Checking docker-compose.yml..."
if [ ! -f "docker-compose.yml" ]; then
    echo "  ERROR: docker-compose.yml not found"
    ERRORS=$((ERRORS + 1))
else
    AWARENESS_BLOCK=$(awk '
        /^  awareness:/ {in_block=1; next}
        /^  [A-Za-z0-9_-]+:/ && in_block {exit}
        in_block {print}
    ' docker-compose.yml)

    if printf '%s\n' "$AWARENESS_BLOCK" | grep -q "8080:80"; then
        echo "  ERROR: awareness should use expose: [80] not ports: [\"8080:80\"]"
        echo "    This exposes the backend directly, bypassing Caddy auth"
        ERRORS=$((ERRORS + 1))
    fi

    if ! grep -q "80:80" docker-compose.yml; then
        echo "  ERROR: caddy should expose port 80"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check 4: .gitignore includes .env.sso
echo "Checking .gitignore..."
if [ -f ".gitignore" ]; then
    if ! grep -q ".env.sso" .gitignore; then
        echo "  WARNING: .env.sso not in .gitignore (add it to prevent secret leaks)"
    fi
else
    echo "  WARNING: No .gitignore file found"
fi

# Check 5: No hardcoded secrets in git
echo "Checking for secrets in git history..."
SECRET_COUNT=$(git log --all --source -S "OAUTH2_PROXY_CLIENT_SECRET=" -- .env.sso 2>/dev/null | wc -l || echo "0")
if [ "$SECRET_COUNT" -gt 0 ]; then
    echo "  ERROR: Client secrets found in git history"
    echo "    Rotate secrets in Azure Portal immediately"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "========================================"

if [ $ERRORS -eq 0 ]; then
    echo "OK: All checks passed"
    echo ""
    echo "  docker-compose down"
    echo "  docker-compose up --build"
    echo ""
    echo "Then access: https://localhost"
else
    echo "FAILED: Found $ERRORS error(s). Please fix above and try again."
    exit 1
fi
