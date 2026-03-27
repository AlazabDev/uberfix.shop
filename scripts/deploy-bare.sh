#!/usr/bin/env bash
# ========================================
# UberFix Bare-Metal Deploy (No Docker)
# Domain: uberfix.alazab.com
# Stack: Nginx + Node.js build
# Usage: sudo bash scripts/deploy-bare.sh
# ========================================

set -euo pipefail

DOMAIN="uberfix.alazab.com"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_DIR="/var/www/$DOMAIN"
BACKUP_DIR="/var/backups/uberfix"
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
LOG_FILE="/var/log/uberfix-deploy-$TIMESTAMP.log"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"; }
ok()   { log "${GREEN}✅ $1${NC}"; }
warn() { log "${YELLOW}⚠️  $1${NC}"; }
err()  { log "${RED}❌ $1${NC}"; }
info() { log "${BLUE}ℹ️  $1${NC}"; }

echo ""
log "╔══════════════════════════════════════════╗"
log "║  🚀 UberFix Bare-Metal Deploy           ║"
log "║  🌐 $DOMAIN              ║"
log "║  🕐 $TIMESTAMP           ║"
log "╚══════════════════════════════════════════╝"
echo ""

# ── 1. تثبيت المتطلبات ──
install_deps() {
    info "فحص وتثبيت المتطلبات..."

    # Nginx
    if ! command -v nginx &>/dev/null; then
        info "تثبيت Nginx..."
        apt-get update -qq && apt-get install -y -qq nginx
        ok "تم تثبيت Nginx"
    else
        ok "Nginx $(nginx -v 2>&1 | cut -d/ -f2) موجود"
    fi

    # Node.js 20+
    if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
        info "تثبيت Node.js 20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y -qq nodejs
        ok "تم تثبيت Node.js $(node -v)"
    else
        ok "Node.js $(node -v) موجود"
    fi

    # Certbot
    if ! command -v certbot &>/dev/null; then
        info "تثبيت Certbot..."
        apt-get install -y -qq certbot python3-certbot-nginx
        ok "تم تثبيت Certbot"
    else
        ok "Certbot موجود"
    fi

    # Git
    if ! command -v git &>/dev/null; then
        apt-get install -y -qq git
    fi

    ok "جميع المتطلبات جاهزة"
}

# ── 2. شهادة SSL ──
setup_ssl() {
    info "فحص شهادة SSL..."

    if [ -f "$CERT_DIR/fullchain.pem" ]; then
        local expiry days_left
        expiry=$(openssl x509 -enddate -noout -in "$CERT_DIR/fullchain.pem" | cut -d= -f2)
        days_left=$(( ( $(date -d "$expiry" +%s) - $(date +%s) ) / 86400 ))

        if [ "$days_left" -le 0 ]; then
            err "الشهادة منتهية! جاري التجديد..."
            certbot renew --nginx --quiet || { err "فشل التجديد"; exit 1; }
        elif [ "$days_left" -lt 30 ]; then
            warn "الشهادة تنتهي خلال $days_left يوم - جاري التجديد..."
            certbot renew --nginx --quiet || warn "فشل التجديد التلقائي"
        else
            ok "شهادة SSL صالحة لـ $days_left يوم"
        fi
    else
        info "لا توجد شهادة - جاري الإنشاء..."
        certbot --nginx -d "$DOMAIN" \
            --non-interactive --agree-tos \
            --email admin@alazab.com \
            --redirect || { err "فشل إنشاء الشهادة"; exit 1; }
        ok "تم إنشاء شهادة SSL"
    fi

    # تفعيل التجديد التلقائي
    if ! crontab -l 2>/dev/null | grep -q certbot; then
        (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --nginx --quiet && systemctl reload nginx") | crontab -
        ok "تم تفعيل التجديد التلقائي للشهادة"
    fi
}

# ── 3. سحب الكود وبناء المشروع ──
build_project() {
    info "سحب آخر التحديثات..."
    cd "$PROJECT_DIR"

    if [ -d ".git" ]; then
        local old_hash new_hash
        old_hash=$(git rev-parse --short HEAD 2>/dev/null || echo "???")
        git fetch origin main --quiet 2>/dev/null || true
        git pull origin main --quiet 2>/dev/null || {
            warn "فشل السحب - محاولة reset..."
            git reset --hard origin/main --quiet 2>/dev/null || true
        }
        new_hash=$(git rev-parse --short HEAD 2>/dev/null || echo "???")
        if [ "$old_hash" != "$new_hash" ]; then
            ok "تم التحديث: $old_hash → $new_hash"
        else
            info "لا توجد تحديثات ($old_hash)"
        fi
    fi

    info "تثبيت الحزم..."
    if [ -f ".env.production" ]; then
        set -a; source .env.production; set +a
        ok "تم تحميل متغيرات البيئة من .env.production"
    else
        warn "ملف .env.production غير موجود!"
    fi

    npm ci --omit=dev 2>&1 | tail -3
    ok "تم تثبيت الحزم"

    info "بناء المشروع..."
    npm run build 2>&1 | tail -5
    ok "تم بناء المشروع بنجاح"

    if [ ! -d "dist" ]; then
        err "مجلد dist غير موجود بعد البناء!"
        exit 1
    fi
}

# ── 4. نسخ احتياطي ونشر ──
deploy_files() {
    info "نشر الملفات..."

    mkdir -p "$BACKUP_DIR" "$DEPLOY_DIR"

    # نسخ احتياطي
    if [ -d "$DEPLOY_DIR/html" ] && [ "$(ls -A "$DEPLOY_DIR/html" 2>/dev/null)" ]; then
        tar -czf "$BACKUP_DIR/dist-$TIMESTAMP.tar.gz" -C "$DEPLOY_DIR" html 2>/dev/null || true
        ok "تم النسخ الاحتياطي"
        # الاحتفاظ بآخر 5 نسخ فقط
        ls -t "$BACKUP_DIR"/dist-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f
    fi

    # نسخ الملفات الجديدة
    rm -rf "$DEPLOY_DIR/html"
    cp -r "$PROJECT_DIR/dist" "$DEPLOY_DIR/html"
    chown -R www-data:www-data "$DEPLOY_DIR/html"
    chmod -R 755 "$DEPLOY_DIR/html"

    ok "تم نشر الملفات في $DEPLOY_DIR/html"
}

# ── 5. إعداد Nginx ──
setup_nginx() {
    info "إعداد Nginx..."

    cat > /etc/nginx/sites-available/"$DOMAIN" << 'NGINX'
# ========================================
# UberFix Nginx Configuration
# Auto-generated by deploy-bare.sh
# ========================================

# Rate limiting
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;

    # Certbot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    location / {
        return 301 https://DOMAIN_PLACEHOLDER$request_uri;
    }
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;

    # SSL
    ssl_certificate     /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5:!RC4;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Root
    root /var/www/DOMAIN_PLACEHOLDER/html;
    index index.html;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(self)" always;

    # Block sensitive files
    location ~ /\.(env|git|htaccess|htpasswd) {
        deny all;
        return 404;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Static assets - aggressive caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|avif)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Service Worker - no cache
    location /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files $uri =404;
    }

    # Manifest
    location /manifest.webmanifest {
        add_header Cache-Control "no-cache";
        add_header Content-Type "application/manifest+json";
        try_files $uri =404;
    }

    # SPA fallback
    location / {
        limit_req zone=general burst=50 nodelay;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # Logging
    access_log /var/log/nginx/DOMAIN_PLACEHOLDER-access.log;
    error_log  /var/log/nginx/DOMAIN_PLACEHOLDER-error.log warn;
}
NGINX

    # Replace domain placeholder
    sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/"$DOMAIN"

    # Enable site
    ln -sf /etc/nginx/sites-available/"$DOMAIN" /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

    # Test & reload
    nginx -t 2>&1 | tee -a "$LOG_FILE"
    if [ $? -eq 0 ]; then
        systemctl reload nginx
        ok "تم إعداد وتفعيل Nginx"
    else
        err "خطأ في إعداد Nginx!"
        exit 1
    fi

    # Enable on boot
    systemctl enable nginx 2>/dev/null || true
}

# ── 6. فحص الصحة ──
health_check() {
    info "فحص صحة التطبيق..."

    # HTTP → HTTPS redirect check
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://$DOMAIN/health" 2>/dev/null || echo "000")
    if [ "$http_code" = "301" ] || [ "$http_code" = "302" ]; then
        ok "HTTP→HTTPS redirect يعمل ($http_code)"
    else
        warn "HTTP redirect: $http_code"
    fi

    # HTTPS check
    for i in $(seq 1 10); do
        http_code=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 5 "https://$DOMAIN/health" 2>/dev/null || echo "000")
        if [ "$http_code" = "200" ]; then
            ok "HTTPS health check نجح ✅"
            return 0
        fi
        sleep 2
    done
    err "HTTPS health check فشل (HTTP $http_code)"
    return 1
}

# ── 7. فحص أمني ──
security_check() {
    info "فحص أمني سريع..."

    local pass=0 fail=0

    # .env blocked
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://$DOMAIN/.env" 2>/dev/null || echo "000")
    if [ "$code" = "404" ] || [ "$code" = "403" ]; then ok ".env محظور ($code)"; ((pass++)); else err ".env متاح! ($code)"; ((fail++)); fi

    # .git blocked
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://$DOMAIN/.git/config" 2>/dev/null || echo "000")
    if [ "$code" = "404" ] || [ "$code" = "403" ]; then ok ".git محظور ($code)"; ((pass++)); else err ".git متاح! ($code)"; ((fail++)); fi

    # HSTS
    if curl -sI --max-time 5 "https://$DOMAIN" 2>/dev/null | grep -qi "strict-transport-security"; then
        ok "HSTS موجود"; ((pass++))
    else
        warn "HSTS مفقود"; ((fail++))
    fi

    # X-Frame-Options
    if curl -sI --max-time 5 "https://$DOMAIN" 2>/dev/null | grep -qi "x-frame-options"; then
        ok "X-Frame-Options موجود"; ((pass++))
    else
        warn "X-Frame-Options مفقود"; ((fail++))
    fi

    info "الأمان: $pass نجح، $fail تحذير"
}

# ── 8. التقرير النهائي ──
report() {
    echo ""
    log "╔══════════════════════════════════════════╗"
    log "║   📊 تقرير النشر                        ║"
    log "╚══════════════════════════════════════════╝"
    echo ""
    log "🌐 الموقع:     https://$DOMAIN"
    log "📁 الملفات:    $DEPLOY_DIR/html"
    log "📋 اللوق:      $LOG_FILE"
    log "🔧 Nginx:      /etc/nginx/sites-available/$DOMAIN"
    echo ""
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "  📋 لوقات Nginx:  tail -f /var/log/nginx/$DOMAIN-access.log"
    log "  🔄 إعادة تحميل:  sudo systemctl reload nginx"
    log "  ⏹  إيقاف:         sudo systemctl stop nginx"
    log "  🔍 الصحة:         curl https://$DOMAIN/health"
    log "  🔄 نشر جديد:     sudo bash scripts/deploy-bare.sh"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    ok "النشر اكتمل بنجاح! 🎉"
}

# ── Main ──
main() {
    if [ "$(id -u)" -ne 0 ]; then
        err "يجب تشغيل السكربت بصلاحيات root: sudo bash $0"
        exit 1
    fi

    install_deps
    build_project
    deploy_files
    setup_ssl
    setup_nginx
    health_check
    security_check
    report
}

main "$@"
