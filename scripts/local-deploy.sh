#!/usr/bin/env bash
# ========================================
# UberFix Local Auto-Deploy Script
# Domain: uberfix.alazab.com
# SSL: يستخدم الشهادة الموجودة مسبقاً
# Usage: bash scripts/local-deploy.sh
# ========================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN="uberfix.alazab.com"
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
LOG_FILE="$PROJECT_DIR/deploy-$TIMESTAMP.log"
BACKUP_DIR="$PROJECT_DIR/.deploy-backups"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log()   { echo -e "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"; }
ok()    { log "${GREEN}✅ $1${NC}"; }
warn()  { log "${YELLOW}⚠️  $1${NC}"; }
err()   { log "${RED}❌ $1${NC}"; }
info()  { log "${BLUE}ℹ️  $1${NC}"; }

header() {
    echo ""
    log "╔══════════════════════════════════════════╗"
    log "║   🚀 UberFix Local Deploy               ║"
    log "║   🌐 $DOMAIN              ║"
    log "║   🕐 $TIMESTAMP           ║"
    log "╚══════════════════════════════════════════╝"
    echo ""
}

# ── 1. فحص المتطلبات ──
check_requirements() {
    info "فحص المتطلبات..."

    local missing=0
    for cmd in docker git curl openssl; do
        if ! command -v "$cmd" &>/dev/null; then
            err "$cmd غير مثبت!"
            missing=1
        fi
    done

    if ! docker compose version &>/dev/null 2>&1; then
        err "Docker Compose v2 غير متوفر!"
        missing=1
    fi

    if [ ! -f "$PROJECT_DIR/.env.production" ]; then
        err "ملف .env.production غير موجود!"
        err "انسخ .env.production.example واملأ القيم"
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        err "فشل فحص المتطلبات"
        exit 1
    fi

    ok "المتطلبات متوفرة"
}

# ── 2. فحص شهادة SSL ──
check_ssl() {
    info "فحص شهادة SSL..."

    if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
        err "شهادة SSL غير موجودة في $CERT_DIR"
        err "شغّل: sudo bash scripts/ssl-setup.sh"
        exit 1
    fi

    local expiry
    expiry=$(openssl x509 -enddate -noout -in "$CERT_DIR/fullchain.pem" 2>/dev/null | cut -d= -f2)
    local expiry_epoch now_epoch days_left
    expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry" +%s 2>/dev/null || echo 0)
    now_epoch=$(date +%s)
    days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

    if [ "$days_left" -le 0 ]; then
        err "شهادة SSL منتهية الصلاحية!"
        exit 1
    elif [ "$days_left" -lt 30 ]; then
        warn "شهادة SSL تنتهي خلال $days_left يوم - جاري التجديد..."
        sudo certbot renew --quiet || warn "فشل التجديد التلقائي"
    else
        ok "شهادة SSL صالحة لـ $days_left يوم"
    fi
}

# ── 3. سحب آخر التحديثات ──
pull_latest() {
    info "سحب آخر التحديثات من Git..."
    cd "$PROJECT_DIR"

    if [ ! -d ".git" ]; then
        warn "ليس مستودع Git - تخطي"
        return
    fi

    local old_hash new_hash
    old_hash=$(git rev-parse --short HEAD 2>/dev/null || echo "???")
    
    git fetch origin main --quiet 2>/dev/null || true
    git pull origin main --quiet 2>/dev/null || {
        warn "فشل السحب - محاولة reset..."
        git reset --hard origin/main --quiet 2>/dev/null || true
    }

    new_hash=$(git rev-parse --short HEAD 2>/dev/null || echo "???")

    if [ "$old_hash" = "$new_hash" ]; then
        info "لا توجد تحديثات جديدة ($old_hash)"
    else
        ok "تم التحديث: $old_hash → $new_hash"
    fi
}

# ── 4. نسخ احتياطي ──
backup() {
    info "نسخ احتياطي..."
    mkdir -p "$BACKUP_DIR"

    if docker ps -q --filter "name=uberfix-web" 2>/dev/null | grep -q .; then
        docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T uberfix-web \
            tar -czf - /usr/share/nginx/html 2>/dev/null \
            > "$BACKUP_DIR/dist-$TIMESTAMP.tar.gz" || true
        ok "تم النسخ الاحتياطي: dist-$TIMESTAMP.tar.gz"
    else
        info "لا يوجد حاوية قيد التشغيل - تخطي النسخ الاحتياطي"
    fi

    # الاحتفاظ بآخر 5 نسخ فقط
    ls -t "$BACKUP_DIR"/dist-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f
}

# ── 5. بناء ونشر ──
build_and_deploy() {
    info "بناء الصورة..."
    cd "$PROJECT_DIR"

    docker compose --env-file .env.production build --no-cache --pull 2>&1 | tail -5 | tee -a "$LOG_FILE"
    ok "تم بناء الصورة"

    info "إيقاف الحاويات القديمة..."
    docker compose --env-file .env.production down --remove-orphans 2>/dev/null || true

    info "تشغيل الحاويات الجديدة..."
    docker compose --env-file .env.production up -d 2>&1 | tee -a "$LOG_FILE"
    ok "تم تشغيل الحاويات"
}

# ── 6. فحص الصحة ──
health_check() {
    info "فحص صحة التطبيق..."

    local max=20
    local wait=3

    # HTTP check
    for i in $(seq 1 $max); do
        if curl -sf -o /dev/null --max-time 5 "http://localhost:8880/health" 2>/dev/null; then
            ok "HTTP health check نجح"
            break
        fi
        if [ "$i" -eq "$max" ]; then
            err "HTTP health check فشل بعد $max محاولة"
            docker logs --tail 20 uberfix-web 2>&1 | tee -a "$LOG_FILE"
            return 1
        fi
        sleep $wait
    done

    # HTTPS check
    for i in $(seq 1 10); do
        if curl -sf -o /dev/null --max-time 5 "https://$DOMAIN/health" 2>/dev/null; then
            ok "HTTPS health check نجح ($DOMAIN)"
            break
        fi
        if [ "$i" -eq 10 ]; then
            warn "HTTPS health check فشل - تحقق من nginx-proxy"
            docker logs --tail 10 uberfix-proxy 2>&1 | tee -a "$LOG_FILE"
        fi
        sleep 3
    done
}

# ── 7. فحص أمني سريع ──
security_check() {
    info "فحص أمني سريع..."

    local pass=0 fail=0

    # .env blocked?
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://$DOMAIN/.env" 2>/dev/null || echo "000")
    if [ "$code" = "403" ] || [ "$code" = "404" ]; then
        ok ".env محظور ($code)"; ((pass++))
    else
        err ".env قد يكون متاحاً! ($code)"; ((fail++))
    fi

    # .git blocked?
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://$DOMAIN/.git/config" 2>/dev/null || echo "000")
    if [ "$code" = "403" ] || [ "$code" = "404" ]; then
        ok ".git محظور ($code)"; ((pass++))
    else
        err ".git قد يكون متاحاً! ($code)"; ((fail++))
    fi

    # HSTS?
    if curl -sI --max-time 5 "https://$DOMAIN" 2>/dev/null | grep -qi "strict-transport-security"; then
        ok "HSTS موجود"; ((pass++))
    else
        warn "HSTS مفقود"; ((fail++))
    fi

    info "الأمان: $pass نجح، $fail تحذير"
}

# ── 8. تنظيف ──
cleanup() {
    info "تنظيف الصور القديمة..."
    docker image prune -f --filter "until=48h" 2>/dev/null | tail -1 || true
    ok "تم التنظيف"
}

# ── 9. التقرير النهائي ──
report() {
    echo ""
    log "╔══════════════════════════════════════════╗"
    log "║   📊 تقرير النشر                        ║"
    log "╚══════════════════════════════════════════╝"
    echo ""
    log "🌐 الدومين:  https://$DOMAIN"
    log "📋 اللوق:    $LOG_FILE"
    echo ""

    docker ps --filter "name=uberfix" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true

    echo ""
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "  📋 اللوقات:    docker logs -f uberfix-web"
    log "  🔄 إعادة:      docker compose restart"
    log "  ⏹  إيقاف:      docker compose down"
    log "  🔍 الصحة:      curl https://$DOMAIN/health"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    ok "النشر اكتمل بنجاح! 🎉"
}

# ── Main ──
main() {
    header
    check_requirements
    check_ssl
    pull_latest
    backup
    build_and_deploy
    health_check
    security_check
    cleanup
    report
}

main "$@"
