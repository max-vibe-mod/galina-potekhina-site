# Публикация сайта Galina Potekhina

## GitHub + Render (рекомендуется)

1. Загрузите проект в репозиторий GitHub (см. `README.md`).
2. На [render.com](https://render.com) создайте Web Service из репозитория.
3. Используйте `render.yaml` или вручную: Build `npm install`, Start `npm start`.
4. Подключите диск к `data/` для сохранения базы.
5. В Environment задайте `SITE_URL`, `SESSION_SECRET`, `ADMIN_LOGIN`, `ADMIN_PASSWORD`.

## Что нужно (VPS)

- VPS с Node.js 18+
- Домен и SSL (HTTPS)
- Файл `.env.local`

## Переменные окружения

```
PORT=3000
SITE_URL=https://ваш-домен.ru
SESSION_SECRET=случайная-длинная-строка
ADMIN_LOGIN=admin
ADMIN_PASSWORD=надёжный-пароль

SMTP_HOST=smtp.mail.ru
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
ADMIN_NOTIFY_EMAIL=email@для-уведомлений.ru

ADMIN_TELEGRAM_BOT_TOKEN=...   # опционально
ADMIN_TELEGRAM_CHAT_ID=...     # опционально
```

## SEO

- Meta-теги и Open Graph на всех страницах
- `GET /robots.txt`
- `GET /sitemap.xml`
- Укажите `SITE_URL` для корректных canonical-ссылок

## Запуск

```bash
npm install
node server.js
```

Постоянная работа — **pm2**:

```bash
npm install -g pm2
pm2 start server.js --name galina-site
pm2 save
pm2 startup
```

## Nginx (пример)

```nginx
server {
    listen 443 ssl;
    server_name your-domain.ru;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 15m;
    }

    location /uploads/ {
        alias /path/to/site/public/uploads/;
    }
}
```

## Резервное копирование

```bash
node scripts/backup-db.js
```

Копии в `data/backups/` (последние 14).

## Перед запуском в прод

1. Заполните настройки в `/admin/settings`
2. Загрузите реальные фото платьев в галерею
3. Проверьте заказ и аренду
4. Укажите `SITE_URL` и SMTP
