const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const AutodartsDesktopApp = require('./desktop-app');
const AutodartsSetupWizard = require('./setup-wizard');

// Globale Variablen
let desktopApp = null;
let setupWizard = null;
let mainWindow = null;

// App-Events (nur wenn Electron verfügbar ist)
if (typeof app !== 'undefined') {
  app.whenReady().then(async () => {
    console.log('🎯 Starte Autodarts Trainer Desktop App...');
    
    try {
      // Desktop-App starten (Express-Server)
      desktopApp = new AutodartsDesktopApp();
      await desktopApp.initialize();
      
      // Setup-Wizard starten (Board-Auswahl)
      setupWizard = new AutodartsSetupWizard();
      await setupWizard.startSetup();
      
      console.log('✅ Setup-Wizard gestartet - Board-Auswahl verfügbar');
      console.log('🎯 Wählen Sie Ihr Board aus der Liste aus');
    } catch (error) {
      console.error('❌ Fehler beim Starten des Setup-Wizards:', error);
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      // Desktop-App wird automatisch von der AutodartsDesktopApp-Klasse verwaltet
    }
  });

  app.on('before-quit', () => {
    if (desktopApp) {
      desktopApp.quit();
    }
  });
}

// Fallback für direkten Node.js-Start (ohne Electron)
if (typeof app === 'undefined') {
  console.log('🌐 Starte Browser-Interface (ohne Desktop-App)...');
  
  const express = require('express');
  const cors = require('cors');
  const path = require('path');
  
  const expressApp = express();
  expressApp.use(cors());
  expressApp.use(express.json());
  expressApp.use(express.static(path.join(__dirname, 'renderer')));

  // API Endpoints
  expressApp.get('/api/status', (req, res) => {
    res.json({
      status: 'running',
      version: '1.0.0',
      mode: 'browser-only',
      message: 'Desktop-App nicht verfügbar - nur Browser-Interface'
    });
  });

  expressApp.get('/api/game-modes', (req, res) => {
    res.json({
      '170-checkout-p5': {
        name: '170 Checkout (P5)',
        description: 'Fester Start bei 170 Punkten, Double-Out-Pflicht',
        startScore: 170,
        rules: {
          doubleOut: true,
          autoReset: true,
          resetScore: 170
        }
      },
      '123-leiter-p4': {
        name: '123-Leiter (P4)',
        description: 'Start bei 123 Punkten, progressive Anpassung',
        startScore: 123,
        rules: {
          doubleOut: true,
          maxDarts: 9,
          progressive: true
        }
      },
      'target-focus-programm1': {
        name: 'Target Focus (P1)',
        description: '30 Trainingsdarts auf wählbaren Sektor',
        startScore: 0,
        rules: {
          trainingMode: true,
          maxDarts: 30,
          selectableTargets: [20, 19, 18, 17]
        }
      },
      'double-finish-programm2': {
        name: 'Double Finish (P2)',
        description: 'Wählbare Doppelziele, wiederholen nach Checkout',
        startScore: 0,
        rules: {
          trainingMode: true,
          repeatOnCheckout: true,
          selectableTargets: 'all-doubles'
        }
      },
      '53-checkout-programm3': {
        name: '53 Checkout (P3)',
        description: 'Start bei 53 Punkten, Bust-Reset',
        startScore: 53,
        rules: {
          doubleOut: true,
          bustReset: true,
          resetScore: 53
        }
      }
    });
  });

  expressApp.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'renderer/play-interface.html'));
  });

  expressApp.get('/play-interface.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'renderer/play-interface.html'));
  });

  const port = process.env.PORT || 3000;
  expressApp.listen(port, () => {
    console.log(`🌐 Browser-Interface läuft auf http://localhost:${port}`);
    console.log('⚠️  Desktop-App nicht verfügbar - nur Browser-Interface');
    console.log('💡 Für vollständige Funktionen: npm start (mit Electron)');
  });
}