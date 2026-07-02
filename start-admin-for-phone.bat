@echo off
chcp 65001 >nul
cd /d "%~dp0"
set MOBILE_ADMIN_KEY=gp-mobile-8f3c2a91b7e4d605c3f1a9b2e7d4c86
set PORT=3000

set ADB=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\platform-tools\adb.exe

echo.
echo  GP Админ — сервер для телефона по USB
echo  =====================================
echo  1. Телефон подключен по USB, отладка включена
echo  2. Не закрывайте это окно пока пользуетесь приложением
echo.

"%ADB%" reverse tcp:3000 tcp:3000
echo USB-туннель: телефон localhost:3000 -^> этот ПК:3000
echo.

node server.js
