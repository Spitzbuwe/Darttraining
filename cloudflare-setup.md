# 🌐 Cloudflare Pages Setup

## 1. Cloudflare Account erstellen
1. Gehen Sie zu https://dash.cloudflare.com/
2. Erstellen Sie ein kostenloses Konto
3. Verifizieren Sie Ihre E-Mail

## 2. API Token erstellen
1. Gehen Sie zu https://dash.cloudflare.com/profile/api-tokens
2. Klicken Sie auf "Create Token"
3. Wählen Sie "Custom token"
4. Berechtigungen:
   - `Cloudflare Pages:Edit`
   - `Zone:Read`
5. Account Resources: `Include - All accounts`
6. Zone Resources: `Include - All zones`
7. Klicken Sie auf "Continue to summary" und "Create Token"
8. Kopieren Sie den Token

## 3. Account ID finden
1. Gehen Sie zu https://dash.cloudflare.com/
2. Wählen Sie Ihr Domain aus
3. Scrollen Sie nach unten zu "API"
4. Kopieren Sie die "Account ID"

## 4. GitHub Secrets setzen (für automatisches Deployment)
1. Gehen Sie zu Ihrem GitHub Repository
2. Klicken Sie auf "Settings" → "Secrets and variables" → "Actions"
3. Fügen Sie folgende Secrets hinzu:
   - `CLOUDFLARE_API_TOKEN`: Ihr API Token
   - `CLOUDFLARE_ACCOUNT_ID`: Ihre Account ID

## 5. Lokales Deployment
```bash
# Dependencies installieren
npm install

# Einmaliges Deployment
npm run deploy

# Automatisches Deployment (überwacht Änderungen)
CLOUDFLARE_ACCOUNT_ID=your_id CLOUDFLARE_API_TOKEN=your_token npm run watch
```

## 6. URLs
- **Cloudflare Pages:** https://autodarts-trainer.pages.dev
- **Play Interface:** https://autodarts-trainer.pages.dev/play-interface.html

## 7. Automatisches Deployment
- Bei jedem Push zu `main` wird automatisch deployed
- GitHub Actions übernimmt das Deployment
- Keine manuellen Schritte erforderlich!
