@echo off
title Autodarts Trainer - Web Version
color 0B

echo.
echo ========================================
echo   🌐 AUTODARTS TRAINER WEB-VERSION 🌐
echo ========================================
echo.

echo 📁 Wechsle zum App-Verzeichnis...
cd /d "%~dp0\autodarts_trainer_desktop"

echo.
echo 🔧 Prüfe Abhängigkeiten...
if not exist "node_modules" (
    echo ⚠️  Abhängigkeiten nicht gefunden, installiere...
    npm install
    echo.
)

echo.
echo 🛑 Stoppe eventuell laufende Prozesse...
taskkill /f /im node.exe > nul 2>&1
taskkill /f /im electron.exe > nul 2>&1

echo.
echo 🚀 Starte Web-Server...
start /B node src/main.js

echo.
echo ⏳ Warte bis Server bereit ist...
timeout /t 3 /nobreak > nul

echo.
echo 🌐 Öffne Browser...
start http://localhost:3000/play-interface.html

echo.
echo ✅ Web-Version gestartet!
echo 📱 Browser geöffnet: http://localhost:3000/play-interface.html
echo 🖥️  Desktop-App: Doppelklick auf START_AUTODARTS_TRAINER.bat
echo.
echo ⏹️  Zum Beenden: Drücken Sie eine beliebige Taste...
echo.
pause > nul

echo.
echo 🛑 Stoppe Server...
taskkill /f /im node.exe > nul 2>&1

echo 👋 Web-Version beendet
echo.
pause
