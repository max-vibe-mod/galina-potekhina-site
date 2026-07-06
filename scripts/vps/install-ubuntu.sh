#!/bin/bash
# Установка сайта на VPS (Ubuntu/Debian). Запуск от root:
# curl -fsSL ... | bash
# или: bash install-ubuntu.sh ВАШ_IP_или_домен

set -e

SITE_URL="${1:-}"
SITE_DIR="/opt/galina-site"
REPO="https://github.com/max-vibe-mod/galina-potekhina-site.git"

if [ "$(id -u)" -ne 0 ]; then
  echo "Запустите от root: sudo bash install-ubuntu.sh https://ваш-домен.ru"
  exit 1
fi

if [ -z "$SITE_URL" ]; then
  echo "Укажите URL сайта: bash install-ubuntu.sh https://123.45.67.89"
  exit 1
fi

SITE_URL="${SITE_URL%/}"

apt-get update -y
apt-get install -y curl git nginx

# Node.js 20
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if [ ! -d "$SITE_DIR/.git" ]; then
  git clone "$REPO" "$SITE_DIR"
else
  cd "$SITE_DIR" && git pull origin main
fi

cd "$SITE_DIR"
npm install --omit=dev
mkdir -p data public/uploads

if [ ! -f .env.local ]; then
  SECRET=$(openssl rand -hex 24 2>/dev/null || head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')
  cat > .env.local << EOF
PORT=3000
SITE_URL=$SITE_URL
SESSION_SECRET=$SECRET
ADMIN_LOGIN=admin
ADMIN_PASSWORD=задайте-пароль
MOBILE_ADMIN_KEY=gp-mobile-8f3c2a91b7e4d605c3f1a9b2e7d4c86
EOF
  echo "Создан .env.local — смените ADMIN_PASSWORD!"
fi

npm install -g pm2
pm2 delete galina-site 2>/dev/null || true
pm2 start server.js --name galina-site --cwd "$SITE_DIR"
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# Nginx reverse proxy
cat > /etc/nginx/sites-available/galina-site << 'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/galina-site /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "=== Сайт установлен ==="
echo "URL: $SITE_URL"
echo "Проверка: curl -I http://127.0.0.1:3000"
echo "Логи: pm2 logs galina-site"
echo "Перезапуск: pm2 restart galina-site"
