# 🚀 دليل الاستضافة الذاتية الكامل - UberFix على Ubuntu 24.04

## نظرة عامة على البنية التحتية

```
┌─────────────────────────────────────────────────┐
│                  Ubuntu 24.04 VPS                │
│                                                   │
│  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   UberFix Web    │  │   Supabase Stack     │  │
│  │   (Nginx + SPA)  │  │   (Self-Hosted)      │  │
│  │   Port: 3000     │  │                      │  │
│  └────────┬─────────┘  │  ┌────────────────┐  │  │
│           │             │  │ PostgreSQL 15  │  │  │
│           │             │  │ Port: 5432     │  │  │
│           │             │  └────────────────┘  │  │
│           │             │  ┌────────────────┐  │  │
│           │             │  │ GoTrue (Auth)  │  │  │
│           │             │  │ Port: 9999     │  │  │
│           │             │  └────────────────┘  │  │
│           │             │  ┌────────────────┐  │  │
│           │             │  │ PostgREST      │  │  │
│           │             │  │ Port: 3001     │  │  │
│           │             │  └────────────────┘  │  │
│           │             │  ┌────────────────┐  │  │
│           │             │  │ Kong / Envoy   │  │  │
│           │             │  │ Port: 8000     │  │  │
│           │             │  └────────────────┘  │  │
│           │             │  ┌────────────────┐  │  │
│           │             │  │ Edge Functions │  │  │
│           │             │  │ (Deno)         │  │  │
│           │             │  └────────────────┘  │  │
│           │             │  ┌────────────────┐  │  │
│           │             │  │ Storage API    │  │  │
│           │             │  │ + S3/MinIO     │  │  │
│           │             │  └────────────────┘  │  │
│           │             │  ┌────────────────┐  │  │
│           │             │  │ Realtime       │  │  │
│           │             │  │ (WebSocket)    │  │  │
│           │             │  └────────────────┘  │  │
│           │             │  ┌────────────────┐  │  │
│           │             │  │ Studio (Admin) │  │  │
│           │             │  │ Port: 8443     │  │  │
│           │             │  └────────────────┘  │  │
│           │             └──────────────────────┘  │
│  ┌────────┴──────────────────────────────────┐   │
│  │            Caddy / Nginx Proxy             │   │
│  │     SSL Termination + Reverse Proxy        │   │
│  │     Port: 80/443                           │   │
│  └────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## المتطلبات

### الحد الأدنى للسيرفر
| المورد | الحد الأدنى | الموصى به |
|--------|-------------|-----------|
| CPU | 4 vCPU | 8 vCPU |
| RAM | 8 GB | 16 GB |
| SSD | 80 GB | 200 GB NVMe |
| OS | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |
| Network | 1 Gbps | 1 Gbps |

### النطاقات المطلوبة (DNS)
```
uberfix.shop          → A Record → SERVER_IP
api.uberfix.shop      → A Record → SERVER_IP  (Supabase API)
auth.uberfix.shop     → A Record → SERVER_IP  (GoTrue Auth)
studio.uberfix.shop   → A Record → SERVER_IP  (Supabase Studio)
storage.uberfix.shop  → A Record → SERVER_IP  (Storage)
```

---

## الخطوة 1: إعداد السيرفر الأساسي

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت الأدوات الأساسية
sudo apt install -y \
  curl wget git unzip gnupg2 ca-certificates \
  lsb-release software-properties-common \
  ufw fail2ban htop ncdu

# إعداد الجدار الناري
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# إعداد fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# إنشاء مستخدم للتطبيق (اختياري - أفضل من root)
sudo adduser uberfix --disabled-password --gecos ""
sudo usermod -aG sudo uberfix
sudo usermod -aG docker uberfix
```

---

## الخطوة 2: تثبيت Docker و Docker Compose

```bash
# تثبيت Docker Engine
curl -fsSL https://get.docker.com | sh

# تفعيل Docker
sudo systemctl enable docker
sudo systemctl start docker

# تثبيت Docker Compose plugin
sudo apt install -y docker-compose-plugin

# التحقق
docker --version
docker compose version

# إضافة المستخدم الحالي لمجموعة docker
sudo usermod -aG docker $USER
newgrp docker
```

---

## الخطوة 3: تثبيت Supabase Self-Hosted

### 3.1 استنساخ Supabase Docker

```bash
# إنشاء مجلد العمل
sudo mkdir -p /opt/supabase
cd /opt/supabase

# استنساخ مستودع Supabase
git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker

# نسخ ملف البيئة
cp .env.example .env
```

### 3.2 إعداد المتغيرات (ملف .env)

```bash
nano .env
```

**⚠️ هام: قم بتوليد مفاتيح فريدة لكل قيمة!**

```env
############
# Secrets
############

# توليد JWT_SECRET:  openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-token-at-least-32-chars

# توليد ANON_KEY باستخدام: https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Dashboard credentials
DASHBOARD_USERNAME=supabase
DASHBOARD_PASSWORD=your-secure-dashboard-password

############
# Database
############
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432
POSTGRES_PASSWORD=your-strong-postgres-password

############
# API
############
SITE_URL=https://uberfix.shop
API_EXTERNAL_URL=https://api.uberfix.shop
SUPABASE_PUBLIC_URL=https://api.uberfix.shop

############
# Auth (GoTrue)
############
GOTRUE_SITE_URL=https://uberfix.shop
GOTRUE_EXTERNAL_URL=https://api.uberfix.shop

# OAuth Providers
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=your-google-client-id
GOTRUE_EXTERNAL_GOOGLE_SECRET=your-google-client-secret
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://api.uberfix.shop/auth/v1/callback

GOTRUE_EXTERNAL_FACEBOOK_ENABLED=true
GOTRUE_EXTERNAL_FACEBOOK_CLIENT_ID=your-facebook-app-id
GOTRUE_EXTERNAL_FACEBOOK_SECRET=your-facebook-app-secret
GOTRUE_EXTERNAL_FACEBOOK_REDIRECT_URI=https://api.uberfix.shop/auth/v1/callback

# SMTP (للبريد الإلكتروني)
GOTRUE_SMTP_HOST=smtp.gmail.com
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=your-email@gmail.com
GOTRUE_SMTP_PASS=your-app-password
GOTRUE_SMTP_ADMIN_EMAIL=noreply@uberfix.shop
GOTRUE_SMTP_SENDER_NAME=UberFix
GOTRUE_MAILER_URLPATHS_CONFIRMATION=/auth/callback
GOTRUE_MAILER_URLPATHS_RECOVERY=/auth/callback
GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE=/auth/callback

############
# Studio
############
STUDIO_DEFAULT_ORGANIZATION=UberFix
STUDIO_DEFAULT_PROJECT=UberFix Production
STUDIO_PORT=8443
SUPABASE_STUDIO_URL=https://studio.uberfix.shop

############
# Storage
############
STORAGE_BACKEND=file
FILE_SIZE_LIMIT=52428800

############
# Edge Functions
############
FUNCTIONS_VERIFY_JWT=true
```

### 3.3 توليد مفاتيح JWT

```bash
# تثبيت أداة التوليد
npm install -g @supabase/cli

# أو يدوياً عبر Node.js:
node -e "
const crypto = require('crypto');
const jwt_secret = crypto.randomBytes(32).toString('base64');
console.log('JWT_SECRET:', jwt_secret);

// Generate ANON_KEY
const header = Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64url');
const anon_payload = Buffer.from(JSON.stringify({
  role: 'anon',
  iss: 'supabase',
  iat: Math.floor(Date.now()/1000),
  exp: Math.floor(Date.now()/1000) + (10 * 365 * 24 * 60 * 60)
})).toString('base64url');

const crypto2 = require('crypto');
const anon_sig = crypto2.createHmac('sha256', jwt_secret)
  .update(header + '.' + anon_payload).digest('base64url');
console.log('ANON_KEY:', header + '.' + anon_payload + '.' + anon_sig);

// Generate SERVICE_ROLE_KEY
const service_payload = Buffer.from(JSON.stringify({
  role: 'service_role',
  iss: 'supabase',
  iat: Math.floor(Date.now()/1000),
  exp: Math.floor(Date.now()/1000) + (10 * 365 * 24 * 60 * 60)
})).toString('base64url');
const service_sig = crypto2.createHmac('sha256', jwt_secret)
  .update(header + '.' + service_payload).digest('base64url');
console.log('SERVICE_ROLE_KEY:', header + '.' + service_payload + '.' + service_sig);
"
```

### 3.4 تشغيل Supabase

```bash
cd /opt/supabase/supabase/docker

# تشغيل كل الخدمات
docker compose pull
docker compose up -d

# التحقق من حالة الخدمات
docker compose ps

# مشاهدة السجلات
docker compose logs -f
```

### 3.5 التحقق من عمل Supabase

```bash
# فحص صحة API
curl http://localhost:8000/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# فحص Auth
curl http://localhost:8000/auth/v1/settings

# فحص Studio
curl http://localhost:8443
```

---

## الخطوة 4: ترحيل قاعدة البيانات

### 4.1 تصدير البيانات من Supabase Cloud

```bash
# تثبيت Supabase CLI
npm install -g supabase

# ربط المشروع السحابي
supabase login
supabase link --project-ref zrrffsjbfkphridqyais

# تصدير schema
supabase db dump -f schema.sql

# تصدير البيانات
supabase db dump -f data.sql --data-only

# تصدير الأدوار والسياسات
supabase db dump -f roles.sql --role-only
```

### 4.2 استيراد في Supabase Self-Hosted

```bash
# الاتصال بقاعدة البيانات المحلية
docker compose exec db psql -U supabase_admin -d postgres

# أو عبر ملف:
docker compose exec -T db psql -U supabase_admin -d postgres < schema.sql
docker compose exec -T db psql -U supabase_admin -d postgres < data.sql
```

### 4.3 ترحيل Storage

```bash
# تصدير الملفات من Supabase Cloud Storage
# استخدم Supabase JS SDK أو REST API لتنزيل الملفات

# سكريبت ترحيل بسيط:
cat > migrate-storage.sh << 'EOF'
#!/bin/bash
# تنزيل الملفات من Cloud ورفعها للسيرفر المحلي
CLOUD_URL="https://zrrffsjbfkphridqyais.supabase.co"
LOCAL_URL="http://localhost:8000"
SERVICE_KEY="your-service-role-key"

# قائمة الـ buckets
BUCKETS=("avatars" "documents" "gallery" "maintenance-images")

for bucket in "${BUCKETS[@]}"; do
  echo "Migrating bucket: $bucket"
  
  # إنشاء الـ bucket محلياً
  curl -X POST "$LOCAL_URL/storage/v1/bucket" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"$bucket\",\"name\":\"$bucket\",\"public\":true}"
  
  # ... (أضف منطق نسخ الملفات)
done
EOF
chmod +x migrate-storage.sh
```

### 4.4 ترحيل Edge Functions

```bash
# نسخ Edge Functions
mkdir -p /opt/supabase/functions
cp -r /path/to/project/supabase/functions/* /opt/supabase/functions/

# نشر Edge Functions
cd /path/to/project
supabase functions deploy --project-ref local
```

---

## الخطوة 5: بناء ونشر UberFix Frontend

### 5.1 استنساخ المشروع

```bash
sudo mkdir -p /opt/uberfix
cd /opt/uberfix
git clone https://github.com/YOUR_USERNAME/uberfix.git .
```

### 5.2 إعداد متغيرات البيئة

```bash
cat > .env.production << 'EOF'
# Supabase Self-Hosted
VITE_SUPABASE_URL=https://api.uberfix.shop
VITE_SUPABASE_ANON_KEY=your-self-hosted-anon-key
VITE_SUPABASE_PUBLISHABLE_KEY=your-self-hosted-anon-key
VITE_SUPABASE_PROJECT_ID=self-hosted

# Maps
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key
VITE_MAPBOX_TOKEN=your-mapbox-token

# App
VITE_APP_URL=https://uberfix.shop
VITE_PUBLIC_SITE_URL=https://uberfix.shop

# Analytics
VITE_GA_ID=G-TVRTW1CK9J
VITE_GTM_ID=GTM-M2FD7JFX
VITE_FB_APP_ID=1600405558046527
EOF
```

### 5.3 تحديث Supabase Client

**⚠️ مهم جداً:** يجب تعديل `src/integrations/supabase/client.ts` لاستخدام متغيرات البيئة:

```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// For self-hosting: use environment variables
// For Lovable: hardcoded values
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://zrrffsjbfkphridqyais.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                     import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
                     "eyJhbGciOiJIUzI1NiIs...";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

### 5.4 بناء ونشر

```bash
# تثبيت وبناء
npm install
npm run build

# أو عبر Docker
docker compose --env-file .env.production build --no-cache
docker compose --env-file .env.production up -d
```

---

## الخطوة 6: إعداد Reverse Proxy مع SSL

### الخيار أ: Caddy (الأسهل - يدير SSL تلقائياً)

```bash
# تثبيت Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

```bash
# /etc/caddy/Caddyfile
cat > /etc/caddy/Caddyfile << 'EOF'
# UberFix Frontend
uberfix.shop {
    root * /opt/uberfix/dist
    file_server
    try_files {path} /index.html

    # Security headers
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
    }

    # Cache static assets
    @static path *.js *.css *.png *.jpg *.svg *.woff *.woff2
    header @static Cache-Control "public, max-age=31536000, immutable"

    # No cache for SW and HTML
    @nocache path /sw.js /index.html
    header @nocache Cache-Control "no-cache, no-store, must-revalidate"

    # Health check
    handle /health {
        respond "healthy" 200
    }
}

# Supabase API
api.uberfix.shop {
    reverse_proxy localhost:8000 {
        header_up Host {host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Real-IP {remote_host}
    }
}

# Supabase Auth
auth.uberfix.shop {
    reverse_proxy localhost:9999 {
        header_up Host {host}
    }
}

# Supabase Studio (Dashboard)
studio.uberfix.shop {
    reverse_proxy localhost:8443 {
        header_up Host {host}
    }
    # Restrict access by IP (optional)
    # @blocked not remote_ip YOUR_ADMIN_IP
    # respond @blocked 403
}

# Storage
storage.uberfix.shop {
    reverse_proxy localhost:8000 {
        header_up Host {host}
    }
}
EOF

# إعادة تشغيل Caddy
sudo systemctl restart caddy
```

### الخيار ب: Nginx + Certbot

```bash
# تثبيت Nginx + Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# إعداد Nginx
cat > /etc/nginx/sites-available/uberfix << 'NGINX'
# UberFix Frontend
server {
    listen 80;
    server_name uberfix.shop www.uberfix.shop;
    root /opt/uberfix/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health
    location /health {
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# Supabase API
server {
    listen 80;
    server_name api.uberfix.shop;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}

# Supabase Studio
server {
    listen 80;
    server_name studio.uberfix.shop;

    location / {
        proxy_pass http://127.0.0.1:8443;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX

# تفعيل الموقع
sudo ln -sf /etc/nginx/sites-available/uberfix /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# الحصول على شهادات SSL
sudo certbot --nginx -d uberfix.shop -d www.uberfix.shop -d api.uberfix.shop -d studio.uberfix.shop --non-interactive --agree-tos -m your-email@example.com

# التجديد التلقائي
sudo systemctl enable certbot.timer
```

---

## الخطوة 7: إعداد Edge Functions Secrets

```bash
cd /opt/supabase/supabase/docker

# إضافة Secrets لـ Edge Functions
docker compose exec functions sh -c "
  export TWILIO_ACCOUNT_SID=your-twilio-sid
  export TWILIO_AUTH_TOKEN=your-twilio-token
  export TWILIO_PHONE_NUMBER=+15557285727
  export RESEND_API_KEY=your-resend-key
  export FACEBOOK_APP_SECRET=your-fb-secret
  export WHATSAPP_VERIFY_TOKEN=your-wa-token
  export WHATSAPP_ACCESS_TOKEN=your-wa-access-token
  export WHATSAPP_PHONE_NUMBER_ID=your-wa-phone-id
  export GOOGLE_MAPS_API_KEY=your-maps-key
  export MAPBOX_PUBLIC_TOKEN=your-mapbox-token
"

# أو عبر docker-compose.yml - أضف في قسم edge-functions:
# environment:
#   - TWILIO_ACCOUNT_SID=xxx
#   - TWILIO_AUTH_TOKEN=xxx
#   ... etc
```

---

## الخطوة 8: النسخ الاحتياطي

### 8.1 إعداد نسخ احتياطي تلقائي

```bash
cat > /opt/scripts/backup.sh << 'BACKUP'
#!/bin/bash
# UberFix Automated Backup Script
set -euo pipefail

BACKUP_DIR="/opt/backups/uberfix"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "🔄 Starting backup: $DATE"

# 1. Database backup
docker compose -f /opt/supabase/supabase/docker/docker-compose.yml \
  exec -T db pg_dump -U supabase_admin -d postgres \
  --clean --if-exists \
  | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# 2. Storage backup
tar -czf "$BACKUP_DIR/storage_$DATE.tar.gz" \
  /opt/supabase/supabase/docker/volumes/storage/ 2>/dev/null || true

# 3. Config backup
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" \
  /opt/supabase/supabase/docker/.env \
  /opt/uberfix/.env.production \
  /etc/caddy/Caddyfile 2>/dev/null || \
  /etc/nginx/sites-available/uberfix 2>/dev/null || true

# 4. Cleanup old backups
find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup completed: $DATE"
echo "   Database: db_$DATE.sql.gz"
echo "   Storage: storage_$DATE.tar.gz"
echo "   Config: config_$DATE.tar.gz"
BACKUP
chmod +x /opt/scripts/backup.sh

# إضافة للـ cron (كل يوم الساعة 3 صباحاً)
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/scripts/backup.sh >> /var/log/uberfix-backup.log 2>&1") | crontab -
```

### 8.2 استعادة من نسخة احتياطية

```bash
# استعادة قاعدة البيانات
gunzip -c /opt/backups/uberfix/db_YYYYMMDD.sql.gz | \
  docker compose -f /opt/supabase/supabase/docker/docker-compose.yml \
  exec -T db psql -U supabase_admin -d postgres

# استعادة الملفات
tar -xzf /opt/backups/uberfix/storage_YYYYMMDD.tar.gz -C /
```

---

## الخطوة 9: المراقبة والصيانة

### 9.1 مراقبة الخدمات

```bash
cat > /opt/scripts/health-check.sh << 'HEALTH'
#!/bin/bash
# Health Check Script

check_service() {
  local name=$1 url=$2
  if curl -sf "$url" > /dev/null 2>&1; then
    echo "✅ $name: OK"
  else
    echo "❌ $name: DOWN"
    # أرسل إشعار (Telegram, Email, etc.)
  fi
}

echo "=== UberFix Health Check ==="
echo "$(date)"
check_service "Frontend" "https://uberfix.shop/health"
check_service "Supabase API" "https://api.uberfix.shop/rest/v1/"
check_service "Auth" "https://api.uberfix.shop/auth/v1/settings"
check_service "Studio" "https://studio.uberfix.shop"

echo ""
echo "=== Docker Status ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== Resource Usage ==="
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
HEALTH
chmod +x /opt/scripts/health-check.sh

# تشغيل كل 5 دقائق
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/scripts/health-check.sh >> /var/log/uberfix-health.log 2>&1") | crontab -
```

### 9.2 تحديث التطبيق

```bash
cat > /opt/scripts/update.sh << 'UPDATE'
#!/bin/bash
# UberFix Update Script
set -euo pipefail

echo "🔄 Updating UberFix..."

# 1. Backup first
/opt/scripts/backup.sh

# 2. Pull latest code
cd /opt/uberfix
git pull origin main

# 3. Build
npm install
npm run build

# 4. Update Supabase (if needed)
cd /opt/supabase/supabase/docker
docker compose pull
docker compose up -d

# 5. Reload web server
sudo systemctl reload caddy  # or nginx

echo "✅ Update complete!"
UPDATE
chmod +x /opt/scripts/update.sh
```

---

## الخطوة 10: تحديث OAuth Redirect URLs

### Google Cloud Console
1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → Credentials
3. حدّث OAuth 2.0 Client:
   - **Authorized redirect URIs**: أضف `https://api.uberfix.shop/auth/v1/callback`

### Facebook Developer Console
1. اذهب إلى [Facebook Developers](https://developers.facebook.com)
2. Settings → Basic:
   - **App Domains**: `uberfix.shop`
   - **Site URL**: `https://uberfix.shop`
3. Facebook Login → Settings:
   - **Valid OAuth Redirect URIs**: `https://api.uberfix.shop/auth/v1/callback`

---

## الخطوة 11: قائمة التحقق النهائية

```bash
# ✅ قائمة التحقق قبل الإطلاق
echo "=== Pre-Launch Checklist ==="

# 1. SSL
echo "SSL Certificate:"
curl -sI https://uberfix.shop | grep -i "strict-transport"

# 2. Database
echo "Database tables:"
docker compose -f /opt/supabase/supabase/docker/docker-compose.yml \
  exec -T db psql -U supabase_admin -d postgres \
  -c "SELECT count(*) as tables FROM information_schema.tables WHERE table_schema='public';"

# 3. Auth
echo "Auth settings:"
curl -s https://api.uberfix.shop/auth/v1/settings | python3 -m json.tool | head -20

# 4. Edge Functions
echo "Edge Functions:"
curl -s https://api.uberfix.shop/functions/v1/ | head -5

# 5. Storage buckets
echo "Storage:"
curl -s https://api.uberfix.shop/storage/v1/bucket \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" | python3 -m json.tool

# 6. DNS
echo "DNS Resolution:"
dig uberfix.shop +short
dig api.uberfix.shop +short

# 7. Firewall
echo "Firewall:"
sudo ufw status

# 8. Backups
echo "Latest backup:"
ls -la /opt/backups/uberfix/ | tail -5
```

---

## استكشاف الأخطاء

### مشكلة: CORS errors
```bash
# تحقق من إعدادات Kong/API Gateway
docker compose -f /opt/supabase/supabase/docker/docker-compose.yml \
  logs kong | grep -i cors
```

### مشكلة: Auth redirect loop
```bash
# تحقق من:
# 1. GOTRUE_SITE_URL = https://uberfix.shop (بدون / في النهاية)
# 2. Redirect URLs في Google/Facebook Console
# 3. CORS headers في Kong
```

### مشكلة: Edge Functions لا تعمل
```bash
# سجلات Edge Functions
docker compose -f /opt/supabase/supabase/docker/docker-compose.yml \
  logs edge-functions

# إعادة نشر
supabase functions deploy --project-ref local
```

### مشكلة: بطء في الأداء
```bash
# فحص استخدام الموارد
docker stats --no-stream

# فحص PostgreSQL
docker compose exec db psql -U supabase_admin -d postgres \
  -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# تحسين PostgreSQL
docker compose exec db psql -U supabase_admin -d postgres << 'SQL'
-- تحديث الإحصائيات
ANALYZE;
-- فحص الاستعلامات البطيئة
SELECT query, calls, mean_exec_time, total_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
SQL
```

---

## ملاحظات أمنية مهمة

1. **لا تعرض Studio للإنترنت** بدون حماية - استخدم VPN أو IP whitelist
2. **غيّر كل كلمات المرور الافتراضية** قبل الإطلاق
3. **فعّل Leaked Password Protection** في GoTrue config
4. **أعد نسخ احتياطي يومياً** وتأكد من إمكانية الاستعادة
5. **راقب السجلات** بانتظام لاكتشاف محاولات الاختراق
6. **حدّث Supabase** بانتظام للحصول على تصحيحات الأمان

```bash
# تحديث Supabase
cd /opt/supabase/supabase/docker
git pull
docker compose pull
docker compose up -d
```
