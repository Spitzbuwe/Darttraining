Write-Host "🚀 Starte Autodarts Score Detection System..." -ForegroundColor Green
Write-Host ""

# Bridge starten
Write-Host "📡 Starte Bridge-Service..." -ForegroundColor Yellow
Start-Process -FilePath "python" -ArgumentList "autodarts_working_bridge.py" -WindowStyle Normal

# Warten
Start-Sleep -Seconds 3

# HTTP-Server starten
Write-Host "🌐 Starte HTTP-Server..." -ForegroundColor Yellow
Start-Process -FilePath "python" -ArgumentList "-m", "http.server", "8080" -WindowStyle Normal

# Warten
Start-Sleep -Seconds 2

# Browser öffnen
Write-Host "🌐 Öffne Browser..." -ForegroundColor Yellow
Start-Process "http://localhost:8080/index.html"

Write-Host ""
Write-Host "✅ System gestartet!" -ForegroundColor Green
Write-Host "📡 Bridge: http://localhost:8766" -ForegroundColor Cyan
Write-Host "🌐 Frontend: http://localhost:8080/index.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "Drücke eine beliebige Taste zum Beenden..." -ForegroundColor White
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
