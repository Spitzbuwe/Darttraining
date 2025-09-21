# 🎯 Autodarts Trainer Desktop

## 🚀 **Vollständige Desktop-App mit Setup-Wizard**

### **✨ Was Sie haben:**

#### **🖥️ Echte Desktop-App (wie Autodarts Desktop)**
- **Exakter Setup-Prozess** wie die originale Autodarts Desktop App
- **5-Schritt Setup-Wizard** mit allen Funktionen
- **Native Windows-App** mit professioneller UI
- **Vollständige Kamera-Integration**

#### **📋 Setup-Wizard Schritte:**

##### **1. Sign up** ✅
- Willkommensbildschirm
- System-Status-Check
- Kamera-Erkennung aktiv

##### **2. Set up your board** ✅
- **Neues Board erstellen** - Board-Name eingeben
- **Bestehendes Board auswählen** - Aus Browser-Anwendung
- **Board-Status** - Online/Offline Anzeige
- **Board-Claiming** - Board von anderen Geräten übernehmen

##### **3. Set up cameras** ✅
- **3 Kamera-Slots** - Horizontale Anordnung
- **Kamera-Auswahl** - Dropdown für jede Kamera
- **Live-Kamera-Feeds** - Echtzeit-Vorschau
- **Kamera-Einstellungen**:
  - Auflösung: 1280x720, 1920x1080
  - FPS: 30, 60
  - Standby-Zeit: 15 Min, 1 Stunde

##### **4. Calibrate cameras** ✅
- **Kalibrierungs-Tabs** - Config, Calibration, Distortion
- **Kalibrierungs-Controls** - STABLE, EMPTY, DART, HAND, etc.
- **Live-Kalibrierungs-Vorschau** - Mit Gitter-Overlay
- **Dartboard-Overlay** - Roter 20er-Sektor markiert
- **Kalibrierungs-Button** - Startet automatische Kalibrierung

##### **5. Test & Play** ✅
- **Dartboard-Anzeige** - Vollständiges Dartboard
- **Wurf-Test** - THROW-Button für Test-Würfe
- **Echtzeit-Erkennung** - Würfe werden erkannt und angezeigt
- **Test-Ergebnisse** - Score + Confidence-Anzeige
- **Dart-Position** - Visuelle Dart-Position auf Board

### **🎮 Ihre 5 Spielmodi (nach Setup):**

1. **🎯 170 Checkout (P5)** - Fester Start bei 170, Double-Out, Reset
2. **📈 123-Leiter (P4)** - Start bei 123, progressive Anpassung  
3. **🎪 Target Focus (P1)** - 30 Darts auf wählbaren Sektor
4. **🎲 Double Finish (P2)** - Wählbare Doppelziele
5. **⚡ 53 Checkout (P3)** - Start bei 53, Bust-Reset

### **🚀 So starten Sie:**

#### **Option 1: Vollständige Desktop-App mit Setup**
```
Doppelklick auf: START_AUTODARTS_TRAINER.bat
```

**Was passiert:**
1. **Setup-Wizard öffnet sich** - 5-Schritt-Setup
2. **Board auswählen** - Neu erstellen oder aus Browser-App
3. **3 Kameras einrichten** - Auswahl und Konfiguration
4. **Kamera kalibrieren** - Mit Gitter und Dartboard-Overlay
5. **Würfe testen** - Echtzeit-Wurf-Erkennung
6. **Desktop-App startet** - Mit allen Funktionen
7. **Browser-Interface** - Auf http://localhost:3000

#### **Option 2: Nur Browser-Interface**
```
Doppelklick auf: START_WEB_VERSION.bat
```

### **📁 Dateistruktur:**

```
Desktop app/
├── START_AUTODARTS_TRAINER.bat    ← Desktop-App starten
├── START_WEB_VERSION.bat          ← Web-Version starten
├── README.md                      ← Diese Anleitung
├── package.json                   ← App-Konfiguration
└── src/                          ← Quellcode
    ├── main.js                    ← Haupt-Programm
    ├── desktop-app.js             ← Desktop-App Logik
    ├── setup-wizard.js            ← Setup-Wizard Logik
    ├── features/                  ← Features
    │   ├── custom-game-modes.js   ← Ihre 5 Spielmodi
    │   ├── camera-detection.js    ← Kamera-Erkennung
    │   ├── opencv-camera.js       ← OpenCV Kamera
    │   ├── game-modes.js          ← Standard-Spielmodi
    │   └── statistics.js          ← Statistiken
    └── renderer/                  ← Benutzeroberflächen
        ├── setup-wizard.html      ← Setup-Wizard Interface
        ├── desktop-interface.html ← Desktop-App Interface
        └── play-interface.html    ← Browser-Interface
```

### **🔧 Installation:**

1. **Abhängigkeiten installieren:**
   ```
   npm install
   ```

2. **App starten:**
   ```
   npm start
   ```

### **✨ Features:**

- **🎯 Exakter Autodarts-Setup** - Wie die originale App
- **📹 3-Kamera-System** - Vollständige Kamera-Integration
- **🎪 Kalibrierungs-Grid** - Visuelles Kalibrierungs-Overlay
- **🎲 Wurf-Test** - Echtzeit-Wurf-Erkennung
- **📊 Board-Management** - Aus Browser-Anwendung
- **⚡ Automatische Erkennung** - Kameras und Boards
- **🔄 Echtzeit-Updates** - Live-Kamera-Feeds
- **💾 Konfiguration speichern** - Setup-Daten persistent

**Einfach doppelklicken und das Setup durchlaufen! 🎯**