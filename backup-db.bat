@echo off
cd /d "%~dp0"
node scripts/backup-db.js
pause
