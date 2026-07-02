# Студия пошива Галины Потехиной — сайт

Сайт ателье во Владивостоке: коллекция платьев, аренда, покупка, индивидуальный пошив.

**Стек:** Node.js, Express, EJS, SQLite (sql.js)

## Быстрый старт (локально)

```bash
git clone https://github.com/ВАШ-ЛОГИН/galina-potekhina.git
cd galina-potekhina
npm install
cp .env.example .env.local
# отредактируйте .env.local
node scripts/process-logo.js
npm start
```

Сайт: http://localhost:3000  
Админ-панель: http://localhost:3000/admin

## GitHub

1. Создайте репозиторий на GitHub (без README, если копируете этот проект).
2. В папке проекта:

```bash
git init
git add .
git commit -m "Initial commit: сайт студии"
git branch -M main
git remote add origin https://github.com/ВАШ-ЛОГИН/galina-potekhina.git
git push -u origin main
```

3. В **Settings → Secrets** добавьте переменные из `.env.example` (для деплоя).

## Деплой с GitHub (Render)

Проект готов к деплою через [Render](https://render.com) из репозитория GitHub:

1. **New → Blueprint** или **Web Service** → подключите репозиторий.
2. Используйте `render.yaml` (Build: `npm install`, Start: `npm start`).
3. Подключите **Persistent Disk** к папке `data/` (база SQLite).
4. Укажите `SITE_URL` = URL вашего сервиса на Render.
5. После деплоя зайдите в `/admin/settings` и заполните контакты.

> GitHub Pages не подходит для этого проекта — нужен Node.js-сервер.

## Логотип

Файл: `public/logo.png` — круглый логотип «Студия пошива Галины Потехиной».

Обработка прозрачности фона:

```bash
npm install sharp --save-dev
node scripts/process-logo.js
```

## Структура

| Путь | Назначение |
|------|------------|
| `server.js` | Точка входа |
| `views/` | Шаблоны страниц |
| `public/` | CSS, JS, изображения |
| `data/site.db` | База (создаётся при первом запуске) |
| `routes/admin.js` | Админ-панель |

## Подробнее

См. [DEPLOY.md](./DEPLOY.md) — VPS, Nginx, резервные копии.
