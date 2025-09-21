# 🎯 Autodarts Trainer Desktop - Installation

## 📋 Voraussetzungen

- **Node.js** (Version 18 oder höher)
- **Python** (für OpenCV)
- **Visual Studio Build Tools** (für native Module)

## 🚀 Installation

### 1. Dependencies installieren

```bash
cd "Desktop app"
npm install
```

### 2. OpenCV installieren

**Windows:**
```bash
npm install opencv4nodejs --build-from-source
```

**Alternative (falls Probleme):**
```bash
npm install opencv4nodejs --opencv4nodejs_binary_host_mirror=https://github.com/opencv/opencv/releases
```

### 3. App starten

```bash
npm start
```

## 🔧 Troubleshooting

### OpenCV Installation Probleme

Falls OpenCV nicht installiert werden kann:

1. **Python installieren:**
   - Python 3.8+ von python.org
   - "Add to PATH" aktivieren

2. **Visual Studio Build Tools:**
   ```bash
   npm install --global windows-build-tools
   ```

3. **Manuell OpenCV installieren:**
   ```bash
   npm install opencv4nodejs --build-from-source --python python3
   ```

### Alternative: Ohne OpenCV

Falls OpenCV nicht installiert werden kann, funktioniert die App im "Simulation-Modus":

- Darts werden simuliert statt von der Kamera erkannt
- Alle anderen Features funktionieren normal
- Auto-Scoring ist deaktiviert

## 📁 Projektstruktur

```
Desktop app/
├── src/
│   ├── main.js              # Electron Hauptprozess
│   ├── desktop-app.js       # Desktop App Logik
│   └── renderer/            # Renderer Prozesse
├── package.json             # Dependencies
└── INSTALL.md              # Diese Datei
```

## 🎮 Verwendung

1. **Desktop-App starten:** `npm start`
2. **Webseite öffnen:** `http://localhost:3000`
3. **Board auswählen** und **Spiel starten**
4. **Darts werfen** - automatische Erkennung!

## 📞 Support

Bei Problemen:
1. Prüfen Sie die Konsole auf Fehlermeldungen
2. Stellen Sie sicher, dass alle Dependencies installiert sind
3. Versuchen Sie den Simulation-Modus als Fallback
