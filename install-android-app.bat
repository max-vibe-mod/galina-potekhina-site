@echo off
chcp 65001 >nul
set JAVA_HOME=%~dp0..\gp-admin-build\jdk-21
if not exist "%JAVA_HOME%\bin\java.exe" set JAVA_HOME=%~dp0.tools\jdk-17
set ANDROID_HOME=%~dp0.tools\android-sdk
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%

set SRC=%~dp0gp-admin-android
set BUILD=C:\Users\vladp\gp-admin-build\gp-admin-android
set ADB=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\platform-tools\adb.exe

echo [1/4] Копируем проект в путь без кириллицы...
robocopy "%SRC%" "%BUILD%" /E /NFL /NDL /NJH /NJS /nc /ns /np >nul

echo [2/4] Синхронизация Capacitor...
cd /d "%BUILD%"
call npx cap sync android

echo [3/4] Сборка APK...
cd /d "%BUILD%\android"
call gradlew.bat assembleDebug
if errorlevel 1 exit /b 1

set APK=%BUILD%\android\app\build\outputs\apk\debug\app-debug.apk
echo [4/4] Установка на телефон...
"%ADB%" devices
"%ADB%" install -r "%APK%"
echo.
echo Готово: %APK%
pause
