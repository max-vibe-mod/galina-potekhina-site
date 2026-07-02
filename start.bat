@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  Galina Potekhina - запуск сайта...
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js не найден. Установите с https://nodejs.org
  pause
  exit /b 1
)

if not exist node_modules (
  echo Установка зависимостей...
  call npm install
)

echo.
echo  Сайт: http://localhost:3000
echo  Админ: admin / пароль в .env.local
echo.
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"
node server.js
pause
