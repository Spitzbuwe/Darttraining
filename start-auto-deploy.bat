@echo off
echo 🤖 Autodarts Trainer - Automatisches Cloudflare Deployment
echo =========================================================

echo.
echo 📋 Verfügbare Optionen:
echo 1. Einmaliges Deployment
echo 2. Automatisches Deployment (überwacht Änderungen)
echo 3. Beenden
echo.

set /p choice="Wählen Sie eine Option (1-3): "

if "%choice%"=="1" (
    echo.
    echo 🚀 Starte einmaliges Deployment...
    node auto-deploy.js --deploy
) else if "%choice%"=="2" (
    echo.
    echo 👀 Starte automatisches Deployment...
    echo ⚠️ Stellen Sie sicher, dass CLOUDFLARE_ACCOUNT_ID und CLOUDFLARE_API_TOKEN gesetzt sind!
    echo.
    node auto-deploy.js --watch
) else if "%choice%"=="3" (
    echo Auf Wiedersehen!
    exit
) else (
    echo Ungültige Option!
    pause
    goto :eof
)

echo.
pause
