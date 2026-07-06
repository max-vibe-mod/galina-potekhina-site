#!/data/data/com.termux/files/usr/bin/bash
# Запуск сервера на телефоне (всегда слушает все интерфейсы)

SITE_DIR="$HOME/galina-site"
cd "$SITE_DIR" || exit 1

# Отключить оптимизацию батареи для Termux вручную:
# Настройки Android → Приложения → Termux → Батарея → Без ограничений

export NODE_ENV=production
node server.js
