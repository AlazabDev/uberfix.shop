#!/usr/bin/env bash
# ========================================
# UberFix VPS Deployment Script
# Domain: uberfix.alazab.com
# Usage: ./scripts/deploy-vps.sh [production|staging]
# ========================================

set -euo pipefail

ENVIRONMENT="${1:-production}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN="uberfix.alazab.com"

echo "🚀 UberFix Deployment - $DOMAIN ($ENVIRONMENT)"
echo "=================================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

check_requirements() {
    echo "📋 Checking requirements..."

    if [ ! -f "$PROJECT_DIR/.env.production" ]; then
        print_error ".env.production not found!"
        echo "   Copy .env.production.example to .env.production and fill in your values"
        exit 1
    fi

    for cmd in docker curl; do
        if ! command -v $cmd &>/dev/null; then
            print_error "$cmd is not installed!"
            exit 1
        fi
    done

    if ! docker compose version &>/dev/null 2>&1; then
        print_error "Docker Compose v2 is not available!"
        exit 1
    fi

    # Check SSL certs
    if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        print_warning "SSL certificates not found for $DOMAIN"
        echo "   Run: ./scripts/ssl-setup.sh"
        exit 1
    fi

    print_success "All requirements met"
}

load_env() {
    echo "📦 Loading environment variables..."
    set -a
    source "$PROJECT_DIR/.env.production"
    set +a
    print_success "Environment loaded"
}

deploy() {
    echo "🏗️  Building and deploying..."
    cd "$PROJECT_DIR"

    if [ -d ".git" ]; then
        echo "   Pulling latest changes..."
        git pull origin main || git pull origin master || true
    fi

    docker compose --env-file .env.production build --no-cache
    docker compose --env-file .env.production up -d --remove-orphans

    print_success "Deployment complete!"
}

health_check() {
    echo "🏥 Running health check..."

    for i in $(seq 1 15); do
        if curl -sf http://localhost:80/health >/dev/null 2>&1; then
            print_success "Application is healthy!"
            return 0
        fi
        sleep 3
    done

    print_warning "Health check failed - check logs: docker logs uberfix-web"
}

security_check() {
    echo "🔒 Running security checks..."

    sleep 5

    for path in ".env" ".git/config" ".env.production"; do
        code=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/$path" 2>/dev/null || echo "000")
        if [ "$code" = "403" ] || [ "$code" = "404" ]; then
            print_success "/$path is blocked (HTTP $code)"
        else
            print_error "/$path may be exposed! (HTTP $code)"
        fi
    done
}

cleanup() {
    echo "🧹 Cleaning up..."
    docker image prune -f
    print_success "Cleanup complete"
}

main() {
    check_requirements
    load_env
    deploy
    health_check
    security_check
    cleanup

    echo ""
    echo "=================================================="
    print_success "UberFix is live at https://$DOMAIN"
    echo "   📋 Logs:    docker logs -f uberfix-web"
    echo "   ⏹  Stop:    docker compose down"
    echo "   🔄 Restart: docker compose restart"
    echo "   🏥 Health:  curl https://$DOMAIN/health"
    echo "=================================================="
}

main
