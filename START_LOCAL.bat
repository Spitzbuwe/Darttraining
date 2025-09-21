@echo off
echo 🎯 Autodarts Trainer - Lokale Version
echo =====================================
echo.
echo Starte lokalen Server...
echo.

REM Prüfe ob Python installiert ist
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python ist nicht installiert!
    echo Bitte installieren Sie Python von https://python.org
    pause
    exit /b 1
)

REM Starte lokalen HTTP-Server
echo ✅ Starte Server auf http://localhost:8000
echo ✅ Öffne http://localhost:8000 in Ihrem Browser
echo.
echo Drücken Sie Ctrl+C zum Beenden
echo.

python -m http.server 8000

pause
