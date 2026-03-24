# ========================================
# UberFix Production Dockerfile
# Multi-stage build for optimal image size
# ========================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* package-lock.json* ./

# Install dependencies
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm install; fi

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_MAPBOX_TOKEN
ARG VITE_APP_URL=https://uberfix.alazab.com
ARG VITE_PUBLIC_SITE_URL=https://uberfix.alazab.com

# Set environment variables for build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_PUBLIC_SITE_URL=$VITE_PUBLIC_SITE_URL
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Stage 2: Production (minimal nginx for serving static files)
FROM nginx:alpine AS production

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Inline minimal nginx config for container (proxy handles SSL)
RUN printf 'server {\n\
    listen 80;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    location /health {\n\
        access_log off;\n\
        return 200 "healthy\\n";\n\
        add_header Content-Type text/plain;\n\
    }\n\
\n\
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
        try_files $uri =404;\n\
    }\n\
\n\
    location /sw.js {\n\
        add_header Cache-Control "no-cache, no-store, must-revalidate";\n\
        try_files $uri =404;\n\
    }\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
        add_header Cache-Control "no-cache";\n\
    }\n\
\n\
    error_page 404 /index.html;\n\
}\n' > /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
