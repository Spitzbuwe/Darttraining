@echo off
chcp 65001 > nul

echo ========================================
echo    AUTODARTS v0.26.15 BRIDGE
echo ========================================
echo.

echo 🚀 Starte Autodarts v0.26.15 Bridge...
start cmd /k "py autodarts_v02615_bridge.py"
echo ⏳ Warte 5 Sekunden...
timeout /t 5 >nul

echo 🌐 Starte HTTP Server...
start cmd /k "py -m http.server 8080"
echo ⏳ Warte 5 Sekunden...
timeout /t 5 >nul

echo 🎯 Öffne Spiel-Modi-Seite...
start "" "http://localhost:8080/spiel_modi.html"

echo.
echo ========================================
echo ✅ AUTODARTS v0.26.15 BRIDGE GESTARTET!
echo ========================================
echo.
echo 🎮 Spiel-Modi: http://localhost:8080/spiel_modi.html
echo 🏠 Hauptseite: http://localhost:8080/index.html
echo.
echo 🎯 Desktop App: ECHTE Autodarts Desktop App!
echo 📹 Kameras: 3 Kameras aktiv (CAM 1, CAM 2, CAM 3)
echo 🌐 WebSocket: Verbindung zur echten App
echo 🔗 Board Manager: http://192.168.2.72:3180
echo.
echo 💡 Tipp: Die echte Desktop App läuft bereits!
echo 💡 Tipp: Starte Auto-Score in der Web-Version
echo 💡 Tipp: Schließe die Konsolen-Fenster um zu stoppen
echo.
pause
