#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "OAuth2 + Caddy Configuration Validator"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ERRORS=0

# Check 1: .env.sso exists and has required vars
echo "✓ Checking .env.sso..."
if [ ! -f ".env.sso" ]; then
    echo "  ✗ .env.sso not found"
    ERRORS=$((ERRORS + 1))
else
    REQUIRED_VARS=(
        "OAUTH2_PROXY_CLIENT_ID"
        "OAUTH2_PROXY_CLIENT_SECRET"
        "OAUTH2_PROXY_OIDC_ISSUER_URL"
        "OAUTH2_PROXY_REDIRECT_URL"
        "OAUTH2_PROXY_COOKIE_DOMAIN"
        "OAUTH2_PROXY_COOKIE_SECRET"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "$var=" .env.sso; then
            echo "  ✗ Missing $var in .env.sso"
            ERRORS=$((ERRORS + 1))
        fi
    done
    
    # Check for HTTPS in redirect URL
    if ! grep -q "OAUTH2_PROXY_REDIRECT_URL=https://" .env.sso; then
        echo "  ✗ OAUTH2_PROXY_REDIRECT_URL must use https://"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check for SECURE=true
    if ! grep -q "OAUTH2_PROXY_COOKIE_SECURE=true" .env.sso; then
        echo "  ✗ OAUTH2_PROXY_COOKIE_SECURE should be true"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check 2: Caddyfile exists
echo "✓ Checking Caddyfile..."
if [ ! -f "Caddyfile" ]; then
    echo "  ✗ Caddyfile not found"
    ERRORS=$((ERRORS + 1))
else
    # Check for reverse_proxy in Caddyfile
    if ! grep -q "reverse_proxy awareness:80" Caddyfile; then
        echo "  ✗ Caddyfile missing 'reverse_proxy awareness:80'"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check for forward_auth in Caddyfile
    if ! grep -q "forward_auth oauth2-proxy:4180" Caddyfile; then
        echo "  ✗ Caddyfile missing 'forward_auth oauth2-proxy:4180'"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check 3: docker-compose.yml structure
echo "✓ Checking docker-compose.yml..."
if [ ! -f "docker-compose.yml" ]; then
    echo "  ✗ docker-compose.yml not found"
    ERRORS=$((ERRORS + 1))
else
    # Check that awareness doesn't use 'ports', use 'expose' instead
    if grep -q "ports:" docker-compose.yml | grep -A2 "awareness:" | grep -q "8080:80"; then
        echo "  ✗ awareness should use 'expose: [80]' not 'ports: [\"8080:80\"]'"
        echo "    This exposes the backend directly, bypassing Caddy auth"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check that caddy exposes 80/443
    if ! grep -q "80:80" docker-compose.yml; then
        echo "  ✗ caddy should expose port 80"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check 4: .gitignore includes .env.sso
echo "✓ Checking .gitignore..."
if [ -f ".gitignore" ]; then
    if ! grep -q ".env.sso" .gitignore; then
        echo "  ⚠ WARNING: .env.sso not in .gitignore (add it to prevent secret leaks)"
    fi
else
    echo "  ⚠ WARNING: No .gitignore file found"
fi

# Check 5: No hardcoded secrets in git
echo "✓ Checking for secrets in git history..."
SECRET_COUNT=$(git log --all --source -S "OAUTH2_PROXY_CLIENT_SECRET=" -- .env.sso 2>/dev/null | wc -l || echo "0")
if [ "$SECRET_COUNT" -gt 0 ]; then
    echo "  ✗ Client secrets found in git history"
    echo "    Run: git filter-branch --tree-filter 'rm -f .env.sso' -- --all"
    echo "    Then rotate secrets in Azure Portal immediately"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ]; then
    echo "✅ All checks passed! Ready to deploy:"
    echo ""
    echo "  docker-compose down"
    echo "  docker-compose up --build"
    echo ""
    echo "Then access: https://localhost"
else
    echo "❌ Found $ERRORS error(s). Please fix above and try again."
    exit 1
fi
