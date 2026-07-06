#!/data/data/com.termux/files/usr/bin/bash
# Установка сайта Galina Potekhina в Termux (Android)
# Запуск: bash install.sh

set -e

SITE_DIR="$HOME/galina-site"
REPO="https://github.com/max-vibe-mod/galina-potekhina-site.git"

echo "=== Galina Potekhina — установка в Termux ==="

pkg update -y
pkg upgrade -y
pkg install -y git nodejs-lts tmux termux-api

if [ ! -d "$SITE_DIR/.git" ]; then
  git clone "$REPO" "$SITE_DIR"
else
  cd "$SITE_DIR"
  git pull origin main
fi

cd "$SITE_DIR"
npm install --omit=dev

mkdir -p data public/uploads

if [ ! -f .env.local ]; then
  cat > .env.local << 'EOF'
PORT=3000
SITE_URL=https://ВАШ-ТУННЕЛЬ.trycloudflare.com
SESSION_SECRET=замените-на-длинную-случайную-строку
ADMIN_LOGIN=admin
ADMIN_PASSWORD=задайте-пароль
MOBILE_ADMIN_KEY=gp-mobile-8f3c2a91b7e4d605c3f1a9b2e7d4c86
EOF
  echo ""
  echo "Создан .env.local — откройте и укажите SITE_URL после запуска туннеля!"
fi

echo ""
echo "Готово. Дальше:"
echo "  1) bash scripts/termux/start.sh"
echo "  2) В другой сессии Termux: bash scripts/termux/tunnel.sh"
echo "  3) Скопируйте HTTPS-ссылку из туннеля в .env.local → SITE_URL"
echo "  4) Перезапустите сервер (start.sh)"
