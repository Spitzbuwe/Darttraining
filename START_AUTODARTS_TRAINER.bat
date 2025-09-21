@echo off
title Autodarts Trainer - Hauptstarter
color 0A

echo.
echo ========================================
echo    🎯 AUTODARTS TRAINER HAUPTSTARTER 🎯
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
echo 🚀 Starte Autodarts Trainer Desktop...
echo.
echo 🖥️  Desktop-App: Alle Autodarts-Funktionen verfügbar
echo 🌐 Browser-Interface: http://localhost:3000
echo 🔌 WebSocket: ws://localhost:3001
echo.
echo ⏹️  Zum Beenden: Schließen Sie das App-Fenster oder drücken Sie Ctrl+C
echo.

REM Starte die Desktop-App
npm start

echo.
echo 👋 Autodarts Trainer wurde beendet
echo.
pause
