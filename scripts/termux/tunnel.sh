#!/data/data/com.termux/files/usr/bin/bash
# Публичный HTTPS-туннель к localhost:3000 (бесплатно, без белого IP)
# URL меняется при каждом перезапуске, если нет аккаунта Cloudflare.

set -e

if ! command -v cloudflared >/dev/null 2>&1; then
  pkg install -y cloudflared
fi

echo "Туннель к http://127.0.0.1:3000"
echo "Скопируйте HTTPS-ссылку вида https://xxxx.trycloudflare.com"
echo "Вставьте её в ~/galina-site/.env.local как SITE_URL (без слэша в конце)"
echo ""

cloudflared tunnel --url http://127.0.0.1:3000
