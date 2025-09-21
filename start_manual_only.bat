@echo off
chcp 65001 > nul

echo ========================================
echo    AUTODARTS MANUAL ONLY BRIDGE
echo ========================================
echo.

echo 🚀 Starte Autodarts Manual Only Bridge...
start cmd /k "py autodarts_manual_only_bridge.py"
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
echo ✅ AUTODARTS MANUAL ONLY BRIDGE GESTARTET!
echo ========================================
echo.
echo 🎮 Spiel-Modi: http://localhost:8080/spiel_modi.html
echo 🏠 Hauptseite: http://localhost:8080/index.html
echo.
echo ⛔ Auto-Score: PERMANENT DEAKTIVIERT
echo ✅ Manuelle Eingabe: AKTIVIERT
echo 🎯 Nur manuelle Scores werden gezählt!
echo.
echo 💡 Tipp: Kein automatisches Zählen!
echo 💡 Tipp: Nur manuelle Eingabe möglich!
echo 💡 Tipp: Schließe die Konsolen-Fenster um zu stoppen
echo.
pause
