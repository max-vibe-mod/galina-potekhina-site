# Сервер на телефоне (Termux) — план

Сайт для клиентов остаётся на **Render**. Телефон — **админка** (приложение GP Админ).

Если нужен полный сервер именно на телефоне:

1. Установи **Termux** и **Termux:API** из F-Droid
2. В Termux:
   ```bash
   pkg update && pkg install nodejs git
   cd ~
   git clone https://github.com/max-vibe-mod/galina-potekhina-site.git site
   cd site
   npm install
   export MOBILE_ADMIN_KEY=ваш-ключ
   export PORT=3000
   node server.js
   ```
3. Для доступа из интернета — **Cloudflare Tunnel** или **ngrok** на телефоне (телефон всегда включён, Wi‑Fi).

**Сейчас проще:** приложение GP Админ → Render (без ПК и USB).

После обновления Render приложение работает через интернет.
