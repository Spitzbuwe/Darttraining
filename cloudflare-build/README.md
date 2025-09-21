# 🎯 Autodarts Trainer

Ein moderner, webbasierter Dart-Trainer mit automatischer Score-Erkennung und verschiedenen Trainingsmodi.

## 🚀 Live Demo

**GitHub Pages:** [https://spitzbuwe.github.io/Darttraining/play-interface.html](https://spitzbuwe.github.io/Darttraining/play-interface.html)

## ✨ Features

- **🎮 Verschiedene Spielmodi**: 170 Checkout, 123-Leiter, Target Focus, Double Finish, 53 Checkout
- **📹 Kamera-Integration**: Automatische Score-Erkennung mit Webcam
- **🔧 Kalibrierung**: Einfache Kamera-Kalibrierung für optimale Erkennung
- **📊 Statistiken**: Detaillierte Trainingsstatistiken und Fortschritt
- **🎨 Modernes Design**: Glassmorphism-Design inspiriert von play.autodarts.io
- **📱 Responsive**: Funktioniert auf Desktop, Tablet und Mobile

## 🛠️ Technologien

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Design**: Glassmorphism, CSS Grid, Flexbox
- **Animationen**: CSS Keyframes, Transitions
- **Deployment**: GitHub Pages

## 🎯 Spielmodi

### 170 Checkout (P5)
- Fester Start bei 170 Punkten
- Double-Out-Pflicht
- Automatisches Reset nach Checkout

### 123-Leiter (P4)
- Start bei 123 Punkten
- Progressive Anpassung
- Maximal 9 Darts pro Runde

### Target Focus (P1)
- 30 Trainingsdarts auf wählbaren Sektor
- Fokus auf Präzision
- Wählbare Ziele: 20, 19, 18, 17

### Double Finish (P2)
- Wählbare Doppelziele
- Wiederholen nach Checkout
- Alle Doppel verfügbar

### 53 Checkout (P3)
- Start bei 53 Punkten
- Bust-Reset-Funktion
- Double-Out-Pflicht

## 🚀 Installation & Verwendung

### GitHub Pages (Empfohlen)
1. Besuchen Sie [https://spitzbuwe.github.io/autodart/play-interface.html](https://spitzbuwe.github.io/autodart/play-interface.html)
2. Erlauben Sie Kamera-Zugriff für automatische Score-Erkennung
3. Kalibrieren Sie die Kamera für optimale Erkennung
4. Wählen Sie einen Spielmodus und starten Sie das Training!

### Lokale Entwicklung
```bash
# Repository klonen
git clone https://github.com/spitzbuwe/autodart.git
cd autodart

# Lokalen Server starten (z.B. mit Python)
python -m http.server 8000

# Oder mit Node.js
npx http-server

# Browser öffnen
open http://localhost:8000/play-interface.html
```

## 📁 Projektstruktur

```
autodart/
├── index.html              # Landing Page mit Redirect
├── play-interface.html     # Hauptanwendung
├── .nojekyll              # GitHub Pages Konfiguration
├── assets/
│   ├── css/
│   │   └── style.css      # Hauptstyles
│   ├── js/
│   │   └── app.js         # Anwendungslogik
│   └── img/               # Bilder (falls vorhanden)
└── README.md
```

## 🎨 Design-Features

- **Glassmorphism**: Moderne Glaseffekte mit `backdrop-filter`
- **Gradient-Hintergründe**: Dynamische Farbverläufe
- **Responsive Grid**: Anpassungsfähige Layouts
- **Smooth Animations**: Flüssige Übergänge und Hover-Effekte
- **Dark Theme**: Augenfreundliches dunkles Design

## 🔧 Kamera-Kalibrierung

1. Klicken Sie auf "🔧 Kalibrierung starten"
2. Positionieren Sie die Kamera so, dass das gesamte Dartboard sichtbar ist
3. Klicken Sie auf die vier Ecken des Dartboards in folgender Reihenfolge:
   - Oben links
   - Oben rechts
   - Unten rechts
   - Unten links
4. Die Kalibrierung wird automatisch abgeschlossen

## 📊 Statistiken

Die Anwendung verfolgt verschiedene Statistiken:
- **Darts geworfen**: Gesamtanzahl der geworfenen Darts
- **Durchschnitt**: Durchschnittliche Punktzahl pro Dart
- **Höchstes Score**: Beste Einzelpunktzahl
- **Checkouts**: Anzahl der erfolgreichen Checkouts
- **Präzision**: Treffergenauigkeit in Prozent

## 🤝 Beitragen

Beiträge sind willkommen! Bitte:
1. Forken Sie das Repository
2. Erstellen Sie einen Feature-Branch
3. Committen Sie Ihre Änderungen
4. Pushen Sie zum Branch
5. Erstellen Sie einen Pull Request

## 📄 Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Siehe [LICENSE](LICENSE) für Details.

## 🙏 Danksagungen

- Inspiriert von [play.autodarts.io](https://play.autodarts.io/)
- Design-Elemente basieren auf modernen Web-Standards
- Icons von Unicode Emoji

## 📞 Support

Bei Fragen oder Problemen:
- Erstellen Sie ein [Issue](https://github.com/spitzbuwe/autodart/issues)
- Kontaktieren Sie uns über GitHub

---

**Viel Spaß beim Dart-Training! 🎯**