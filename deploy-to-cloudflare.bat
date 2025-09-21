@echo off
echo 🚀 Cloudflare Pages Deployment
echo =============================

REM Erstelle Build-Verzeichnis
if exist "cloudflare-build" rmdir /s /q "cloudflare-build"
mkdir "cloudflare-build"

echo 📁 Erstelle Build-Verzeichnis...

REM Kopiere Dateien
copy "play-interface.html" "cloudflare-build\"
copy "index.html" "cloudflare-build\"
copy ".nojekyll" "cloudflare-build\"
copy "README.md" "cloudflare-build\"

REM Kopiere assets Verzeichnis
xcopy "assets" "cloudflare-build\assets\" /E /I

REM Erstelle _redirects für SPA
echo /*    /play-interface.html   200 > "cloudflare-build\_redirects"

echo.
echo ✅ Build abgeschlossen!
echo 📁 Build-Verzeichnis: cloudflare-build
echo.
echo 📋 Nächste Schritte:
echo 1. Gehen Sie zu https://dash.cloudflare.com/pages
echo 2. Klicken Sie auf "Upload assets"
echo 3. Ziehen Sie den Inhalt von "cloudflare-build" in das Upload-Fenster
echo 4. Warten Sie auf das Deployment
echo.
echo 🌐 Ihre App wird verfügbar sein unter:
echo https://autodarts-trainer.pages.dev
echo.
pause
