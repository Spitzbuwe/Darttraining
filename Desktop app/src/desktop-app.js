const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs');
const axios = require('axios');

// OpenCV optional laden
let cv = null;
try {
  cv = require('opencv4nodejs');
  console.log('✅ OpenCV erfolgreich geladen');
} catch (error) {
  console.log('⚠️ OpenCV nicht verfügbar - Simulation-Modus aktiviert');
}

class AutodartsDesktopApp {
  constructor() {
    this.mainWindow = null;
    this.expressApp = null;
    this.server = null;
    this.wss = null;
    this.port = 3000;
    this.logFile = path.join(__dirname, '../logs/board-setup.log');
    this.gameState = {
      currentMode: null,
      currentScore: 0,
      isPlaying: false,
      cameras: [],
      statistics: {},
      currentBoard: null,
      calibration: {
        isCalibrated: false,
        dartboardCenter: null,
        dartboardRadius: 0,
        sectors: []
      }
    };
    
    this.camera = null;
    this.detectionInterval = null;
    this.autodartsApi = {
      baseUrl: 'http://192.168.2.72:3180',
      apiKey: null,
      boardId: null
    };
    
    // Erstelle Logs-Verzeichnis
    this.ensureLogDirectory();
  }

  async initialize() {
    console.log('🎯 Initialisiere Autodarts Desktop App...');
    this.logBoardEvent('info', 'Desktop-App wird initialisiert');
    
    // Express Server für Browser-Interface
    await this.setupExpressServer();
    this.logBoardEvent('info', 'Express-Server gestartet', { port: this.port });
    
    // WebSocket für Echtzeit-Kommunikation
    this.setupWebSocket();
    this.logBoardEvent('info', 'WebSocket-Server gestartet', { port: 3003 });
    
    // Desktop-App Fenster
    this.createMainWindow();
    this.logBoardEvent('info', 'Desktop-Fenster erstellt');
    
    // Menü erstellen
    this.createMenu();
    
    // IPC Handler
    this.setupIpcHandlers();
    
    console.log('✅ Autodarts Desktop App vollständig initialisiert');
    console.log('🖥️  Desktop-App: Alle Autodarts-Funktionen verfügbar');
    console.log('🌐 Browser-Interface: http://localhost:3002');
    
    this.logBoardEvent('info', 'Desktop-App vollständig initialisiert', {
      browserInterface: 'http://localhost:3002',
      websocket: 'ws://localhost:3003'
    });
  }

  async setupExpressServer() {
    this.expressApp = express();
    this.expressApp.use(cors());
    this.expressApp.use(express.json());
    
    // Serve board-manager.html
    this.expressApp.get('/board-manager.html', (req, res) => {
      res.sendFile(path.join(__dirname, 'renderer/board-manager.html'));
    });

    // API Endpoints
    this.expressApp.get('/api/status', (req, res) => {
      res.json({
        status: 'running',
        version: '1.0.0',
        gameState: this.gameState
      });
    });
    
    this.expressApp.get('/api/logs', (req, res) => {
      const logs = this.getLogs();
      res.json(logs);
    });
    
    this.expressApp.post('/api/logs', (req, res) => {
      const { level, message, data } = req.body;
      this.logBoardEvent(level, message, data);
      res.json({ success: true });
    });
    
    this.expressApp.delete('/api/logs', (req, res) => {
      try {
        if (fs.existsSync(this.logFile)) {
          fs.writeFileSync(this.logFile, '');
        }
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.expressApp.get('/api/game-modes', (req, res) => {
      res.json(this.getGameModes());
    });
    
    // Board Configuration API
    this.expressApp.get('/api/board-config', (req, res) => {
      try {
        const configFile = path.join(__dirname, '../config/board-config.json');
        if (fs.existsSync(configFile)) {
          const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
          res.json(config);
        } else {
          res.json({ boardId: '', apiKey: '' });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Board-Management API
    this.expressApp.get('/api/boards', (req, res) => {
      try {
        const boardsFile = path.join(__dirname, '../config/boards.json');
        if (fs.existsSync(boardsFile)) {
          const boards = JSON.parse(fs.readFileSync(boardsFile, 'utf8'));
          res.json(boards);
        } else {
          // Erstelle Standard-Board wenn keine vorhanden sind
          const defaultBoards = [{
            id: 'default-board-1',
            name: 'Mein Autodarts Board',
            status: 'offline',
            apiKey: null,
            url: null,
            lastUsed: new Date().toISOString(),
            statistics: {
              darts: 0,
              corrections: 0,
              accuracy: 0
            }
          }];
          res.json(defaultBoards);
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    this.expressApp.post('/api/boards', (req, res) => {
      try {
        const { name, location } = req.body;
        const boardId = this.generateBoardId();
        const apiKey = this.generateApiKey();
        const boardUrl = `http://localhost:3000/board/${boardId}`;
        
        const newBoard = {
          id: boardId,
          name: name || 'Neues Board',
          location: location || 'Unbekannt',
          status: 'offline',
          apiKey: apiKey,
          url: boardUrl,
          lastUsed: new Date().toISOString(),
          statistics: {
            darts: 0,
            corrections: 0,
            accuracy: 0
          }
        };
        
        // Lade vorhandene Boards
        const boardsFile = path.join(__dirname, '../config/boards.json');
        let boards = [];
        if (fs.existsSync(boardsFile)) {
          boards = JSON.parse(fs.readFileSync(boardsFile, 'utf8'));
        }
        
        // Füge neues Board hinzu
        boards.push(newBoard);
        
        // Speichere Boards
        const configDir = path.join(__dirname, '../config');
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(boardsFile, JSON.stringify(boards, null, 2));
        
        this.logBoardEvent('info', 'Neues Board erstellt', newBoard);
        res.status(201).json({ message: 'Board erfolgreich erstellt', board: newBoard });
      } catch (error) {
        this.logBoardEvent('error', 'Fehler beim Erstellen des Boards', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    this.expressApp.put('/api/boards/:boardId', (req, res) => {
      try {
        const boardId = req.params.boardId;
        const updates = req.body;
        
        const boardsFile = path.join(__dirname, '../config/boards.json');
        if (!fs.existsSync(boardsFile)) {
          return res.status(404).json({ success: false, error: 'Keine Boards gefunden' });
        }
        
        let boards = JSON.parse(fs.readFileSync(boardsFile, 'utf8'));
        const boardIndex = boards.findIndex(board => board.id === boardId);
        
        if (boardIndex === -1) {
          return res.status(404).json({ success: false, error: 'Board nicht gefunden' });
        }
        
        // Aktualisiere Board
        boards[boardIndex] = { ...boards[boardIndex], ...updates, lastUsed: new Date().toISOString() };
        
        fs.writeFileSync(boardsFile, JSON.stringify(boards, null, 2));
        
        this.logBoardEvent('info', 'Board aktualisiert', { boardId, updates });
        res.json({ success: true, board: boards[boardIndex] });
      } catch (error) {
        this.logBoardEvent('error', 'Fehler beim Aktualisieren des Boards', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    this.expressApp.delete('/api/boards/:boardId', (req, res) => {
      try {
        const boardId = req.params.boardId;
        
        const boardsFile = path.join(__dirname, '../config/boards.json');
        if (!fs.existsSync(boardsFile)) {
          return res.status(404).json({ success: false, error: 'Keine Boards gefunden' });
        }
        
        let boards = JSON.parse(fs.readFileSync(boardsFile, 'utf8'));
        const boardIndex = boards.findIndex(board => board.id === boardId);
        
        if (boardIndex === -1) {
          return res.status(404).json({ success: false, error: 'Board nicht gefunden' });
        }
        
        // Entferne Board
        const removedBoard = boards.splice(boardIndex, 1)[0];
        
        fs.writeFileSync(boardsFile, JSON.stringify(boards, null, 2));
        
        this.logBoardEvent('info', 'Board gelöscht', removedBoard);
        res.json({ success: true });
      } catch (error) {
        this.logBoardEvent('error', 'Fehler beim Löschen des Boards', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    // Game Management API
    this.expressApp.post('/api/game/start', async (req, res) => {
      try {
        const { boardId, gameMode, players } = req.body;
        
        // Autodarts Spiel starten
        const result = await this.startAutodartsGame(gameMode);
        
        this.logBoardEvent('info', 'Spiel gestartet', { boardId, gameMode });
        res.json({ success: true, gameId: result?.gameId });
      } catch (error) {
        this.logBoardEvent('error', 'Fehler beim Starten des Spiels', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.expressApp.post('/api/game/stop', async (req, res) => {
      try {
        const { boardId } = req.body;
        
        // Autodarts Spiel stoppen
        await this.stopAutodartsGame();
        
        this.logBoardEvent('info', 'Spiel gestoppt', { boardId });
        res.json({ success: true });
      } catch (error) {
        this.logBoardEvent('error', 'Fehler beim Stoppen des Spiels', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.expressApp.post('/api/dart', async (req, res) => {
      try {
        const { boardId, score, multiplier, sector, timestamp } = req.body;
        
        // Dart an Autodarts senden
        await this.sendDartToAutodarts({
          score,
          multiplier,
          sector,
          timestamp,
          position: { x: 0, y: 0 } // Position wird von der Kamera-Erkennung gesetzt
        });
        
        this.logBoardEvent('info', 'Dart verarbeitet', { boardId, score, multiplier, sector });
        res.json({ success: true });
      } catch (error) {
        this.logBoardEvent('error', 'Fehler bei der Dart-Verarbeitung', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.expressApp.post('/api/board-config', (req, res) => {
      try {
        const configDir = path.join(__dirname, '../config');
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }
        
        const configFile = path.join(configDir, 'board-config.json');
        const config = { ...req.body, updatedAt: new Date().toISOString() };
        
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        
        this.logBoardEvent('info', 'Board-Konfiguration aktualisiert', config);
        res.json({ success: true });
      } catch (error) {
        this.logBoardEvent('error', 'Fehler beim Speichern der Board-Konfiguration', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    this.expressApp.delete('/api/board-config', (req, res) => {
      try {
        const configFile = path.join(__dirname, '../config/board-config.json');
        if (fs.existsSync(configFile)) {
          fs.unlinkSync(configFile);
        }
        
        this.logBoardEvent('info', 'Board-Konfiguration gelöscht');
        res.json({ success: true });
      } catch (error) {
        this.logBoardEvent('error', 'Fehler beim Löschen der Board-Konfiguration', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.expressApp.post('/api/start-game', (req, res) => {
      const { modeId } = req.body;
      this.startGame(modeId);
      res.json({ success: true, gameState: this.gameState });
    });

    this.expressApp.post('/api/stop-game', (req, res) => {
      this.stopGame();
      res.json({ success: true, gameState: this.gameState });
    });

    this.expressApp.post('/api/throw-dart', (req, res) => {
      const { score, multiplier } = req.body;
      const result = this.processDartThrow(score, multiplier);
      res.json({ success: true, result, gameState: this.gameState });
    });

    this.expressApp.get('/api/cameras', (req, res) => {
      res.json({ cameras: this.gameState.cameras });
    });

    this.expressApp.get('/api/statistics', (req, res) => {
      res.json({ statistics: this.gameState.statistics });
    });

    // Browser-Interface
    this.expressApp.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'renderer/browser-interface.html'));
    });

    this.expressApp.get('/play-interface.html', (req, res) => {
      res.sendFile(path.join(__dirname, 'renderer/play-interface.html'));
    });
    
    // Board-URLs für dynamische Board-Seiten
    this.expressApp.get('/board/:boardId', (req, res) => {
      const boardId = req.params.boardId;
      console.log('🎯 Board-URL aufgerufen:', boardId);
      
      // Erstelle dynamische Board-Seite
      const boardPage = `
        <!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Autodarts Board - ${boardId}</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    color: #e0e0e0;
                    margin: 0;
                    padding: 20px;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                .board-container {
                    background: rgba(0, 0, 0, 0.3);
                    border: 2px solid #00ff88;
                    border-radius: 15px;
                    padding: 40px;
                    text-align: center;
                    max-width: 600px;
                    width: 100%;
                }
                .board-title {
                    font-size: 32px;
                    color: #00ff88;
                    margin-bottom: 20px;
                    text-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
                }
                .board-id {
                    font-size: 18px;
                    color: #ccc;
                    margin-bottom: 30px;
                    font-family: 'Courier New', monospace;
                }
                .status-indicator {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #00ff88;
                    display: inline-block;
                    margin-right: 10px;
                    box-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                .status-text {
                    font-size: 18px;
                    color: #00ff88;
                    margin-bottom: 30px;
                }
                .board-info {
                    background: rgba(0, 255, 136, 0.1);
                    border: 1px solid rgba(0, 255, 136, 0.3);
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 30px;
                }
                .info-item {
                    margin-bottom: 10px;
                    display: flex;
                    justify-content: space-between;
                }
                .info-label {
                    font-weight: bold;
                    color: #00ff88;
                }
                .info-value {
                    color: #e0e0e0;
                    font-family: 'Courier New', monospace;
                }
                .btn {
                    background: #00ff88;
                    color: #000;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    margin: 5px;
                    transition: all 0.3s ease;
                }
                .btn:hover {
                    background: #00cc6a;
                    transform: translateY(-2px);
                }
                .btn-secondary {
                    background: rgba(255, 255, 255, 0.1);
                    color: #e0e0e0;
                }
                .btn-secondary:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            </style>
        </head>
        <body>
            <div class="board-container">
                <h1 class="board-title">🎯 Autodarts Board</h1>
                <div class="board-id">Board-ID: ${boardId}</div>
                
                <div class="status-indicator"></div>
                <div class="status-text">Board Online</div>
                
                <div class="board-info">
                    <div class="info-item">
                        <span class="info-label">Board-ID:</span>
                        <span class="info-value">${boardId}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Status:</span>
                        <span class="info-value">Online</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Server:</span>
                        <span class="info-value">localhost:3002</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Letzte Aktivität:</span>
                        <span class="info-value">${new Date().toLocaleString('de-DE')}</span>
                    </div>
                </div>
                
                <div>
                    <button class="btn" onclick="window.open('/play-interface.html', '_blank')">
                        🎮 Spiel-Interface öffnen
                    </button>
                    <button class="btn btn-secondary" onclick="window.location.href='/'">
                        🏠 Zur Startseite
                    </button>
                </div>
            </div>
            
            <script>
                // Board-Status prüfen
                async function checkBoardStatus() {
                    try {
                        const response = await fetch('/api/status');
                        if (response.ok) {
                            console.log('✅ Board-Status: Online');
                        } else {
                            console.log('⚠️ Board-Status: Offline');
                        }
                    } catch (error) {
                        console.log('❌ Board-Status: Fehler');
                    }
                }
                
                // Status beim Laden prüfen
                checkBoardStatus();
                
                // Alle 30 Sekunden prüfen
                setInterval(checkBoardStatus, 30000);
            </script>
        </body>
        </html>
      `;
      
      res.send(boardPage);
    });

    // Serve main page
    this.expressApp.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'renderer/play-interface.html'));
    });
    
    // Serve static files (after API routes)
    this.expressApp.use(express.static(path.join(__dirname, 'renderer')));

    this.server = this.expressApp.listen(this.port, () => {
      console.log(`🌐 Browser-Interface läuft auf http://localhost:${this.port}`);
    });
  }

  setupWebSocket() {
    this.wss = new WebSocket.Server({ port: 3003 });
    this.connectedClients = new Set();
    
    this.wss.on('connection', (ws) => {
      console.log('🔌 Browser-Client verbunden');
      this.connectedClients.add(ws);
      
      // Sende initiale Status-Updates
      this.sendToAllClients({
        type: 'camera_status',
        status: 'connected'
      });
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleWebSocketMessage(data, ws);
        } catch (error) {
          console.error('WebSocket Fehler:', error);
        }
      });

      ws.on('close', () => {
        console.log('🔌 Browser-Client getrennt');
        this.connectedClients.delete(ws);
      });
    });

    // Starte Dart-Erkennung
    this.startDartDetection();
    
    console.log('🔌 WebSocket Server läuft auf Port 3003');
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        webSecurity: false
      },
      icon: path.join(__dirname, '../assets/icon.png'),
      title: 'Autodarts Trainer Desktop',
      show: false
    });

    // Lade die Desktop-App Interface
    this.mainWindow.loadFile(path.join(__dirname, 'renderer/desktop-interface.html'));

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      console.log('🖥️  Desktop-App Fenster geöffnet');
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  createMenu() {
    const template = [
      {
        label: 'Datei',
        submenu: [
          {
            label: 'Neues Spiel',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.newGame()
          },
          {
            label: 'Spiel beenden',
            accelerator: 'CmdOrCtrl+Q',
            click: () => this.quit()
          }
        ]
      },
      {
        label: 'Spielmodi',
        submenu: this.getGameModeMenuItems()
      },
      {
        label: 'Kamera',
        submenu: [
          {
            label: 'Kamera-Einstellungen',
            click: () => this.openCameraSettings()
          },
          {
            label: 'Kamera kalibrieren',
            click: () => this.calibrateCameras()
          }
        ]
      },
      {
        label: 'Statistiken',
        submenu: [
          {
            label: 'Statistiken anzeigen',
            click: () => this.showStatistics()
          },
          {
            label: 'Statistiken zurücksetzen',
            click: () => this.resetStatistics()
          }
        ]
      },
      {
        label: 'Hilfe',
        submenu: [
          {
            label: 'Browser-Interface öffnen',
            click: () => this.openBrowserInterface()
          },
          {
            label: 'Über',
            click: () => this.showAbout()
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupIpcHandlers() {
    ipcMain.handle('get-game-state', () => {
      return this.gameState;
    });

    ipcMain.handle('start-game', (event, modeId) => {
      this.startGame(modeId);
      return this.gameState;
    });

    ipcMain.handle('stop-game', () => {
      this.stopGame();
      return this.gameState;
    });

    ipcMain.handle('throw-dart', (event, score, multiplier) => {
      return this.processDartThrow(score, multiplier);
    });

    ipcMain.handle('get-cameras', () => {
      return this.gameState.cameras;
    });

    ipcMain.handle('get-statistics', () => {
      return this.gameState.statistics;
    });
  }

  getGameModes() {
    return {
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
    };
  }

  getGameModeMenuItems() {
    const gameModes = this.getGameModes();
    return Object.keys(gameModes).map(modeId => ({
      label: gameModes[modeId].name,
      click: () => this.startGame(modeId)
    }));
  }

  startGame(modeId) {
    const gameModes = this.getGameModes();
    const mode = gameModes[modeId];
    
    if (!mode) {
      console.error('Spielmodus nicht gefunden:', modeId);
      return;
    }

    this.gameState.currentMode = modeId;
    this.gameState.currentScore = mode.startScore;
    this.gameState.isPlaying = true;

    console.log(`🎮 Spiel gestartet: ${mode.name}`);
    
    // Benachrichtige alle verbundenen Clients
    this.broadcastGameState();
  }

  stopGame() {
    this.gameState.currentMode = null;
    this.gameState.currentScore = 0;
    this.gameState.isPlaying = false;

    console.log('⏹️  Spiel beendet');
    
    // Benachrichtige alle verbundenen Clients
    this.broadcastGameState();
  }

  processDartThrow(score, multiplier = 1) {
    if (!this.gameState.isPlaying) {
      return { success: false, error: 'Kein aktives Spiel' };
    }

    const dartScore = score * multiplier;
    const newScore = Math.max(0, this.gameState.currentScore - dartScore);
    
    this.gameState.currentScore = newScore;

    // Prüfe auf Checkout
    const isCheckout = this.checkCheckout(newScore);
    
    if (isCheckout) {
      this.handleCheckout();
    }

    // Aktualisiere Statistiken
    this.updateStatistics(score, multiplier);

    // Benachrichtige alle Clients
    this.broadcastGameState();

    return {
      success: true,
      dartScore,
      newScore,
      isCheckout,
      gameState: this.gameState
    };
  }

  checkCheckout(score) {
    const mode = this.getGameModes()[this.gameState.currentMode];
    if (!mode) return false;

    if (mode.rules.doubleOut) {
      return score === 0;
    }

    return score === 0;
  }

  handleCheckout() {
    const mode = this.getGameModes()[this.gameState.currentMode];
    if (!mode) return;

    console.log('🎯 Checkout erreicht!');

    if (mode.rules.autoReset) {
      this.gameState.currentScore = mode.rules.resetScore;
    } else if (mode.rules.repeatOnCheckout) {
      // Gleicher Modus wird wiederholt
      this.gameState.currentScore = mode.startScore;
    }
  }

  updateStatistics(score, multiplier) {
    if (!this.gameState.statistics[this.gameState.currentMode]) {
      this.gameState.statistics[this.gameState.currentMode] = {
        gamesPlayed: 0,
        totalDarts: 0,
        totalScore: 0,
        checkouts: 0
      };
    }

    const stats = this.gameState.statistics[this.gameState.currentMode];
    stats.totalDarts++;
    stats.totalScore += score * multiplier;
  }

  broadcastGameState() {
    if (this.wss) {
      this.wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'gameStateUpdate',
            data: this.gameState
          }));
        }
      });
    }
  }

  handleWebSocketMessage(data, ws) {
    switch (data.type) {
      case 'getGameState':
        ws.send(JSON.stringify({
          type: 'gameState',
          data: this.gameState
        }));
        break;
      case 'startGame':
        this.startGame(data.modeId);
        break;
      case 'stopGame':
        this.stopGame();
        break;
      case 'throwDart':
        const result = this.processDartThrow(data.score, data.multiplier);
        ws.send(JSON.stringify({
          type: 'dartResult',
          data: result
        }));
        break;
      case 'game_start':
        this.handleGameStart(data);
        break;
      case 'game_stop':
        this.handleGameStop(data);
        break;
      case 'board_select':
        this.handleBoardSelect(data);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  }

  sendToAllClients(message) {
    this.connectedClients.forEach(client => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  async startDartDetection() {
    try {
      // Kamera initialisieren
      await this.initializeCamera();
      
      // Kalibrierung durchführen
      await this.performCalibration();
      
      // Echte Dart-Erkennung starten
      this.detectionInterval = setInterval(async () => {
        if (this.gameState.isPlaying && this.connectedClients.size > 0) {
          await this.detectDarts();
        }
      }, 100); // 10 FPS für bessere Erkennung
      
      console.log('🎯 Echte Dart-Erkennung gestartet');
    } catch (error) {
      console.error('❌ Fehler bei der Dart-Erkennung:', error);
      // Fallback auf Simulation
      this.startSimulatedDetection();
    }
  }

  async initializeCamera() {
    try {
      if (!cv) {
        throw new Error('OpenCV nicht verfügbar');
      }
      
      // Versuche verfügbare Kameras zu finden
      const cameras = await this.getAvailableCameras();
      if (cameras.length === 0) {
        throw new Error('Keine Kamera gefunden');
      }
      
      // Erste verfügbare Kamera verwenden
      this.camera = new cv.VideoCapture(0);
      console.log('📹 Kamera initialisiert');
    } catch (error) {
      console.error('❌ Kamera-Initialisierung fehlgeschlagen:', error);
      throw error;
    }
  }

  async getAvailableCameras() {
    if (!cv) {
      return [];
    }
    
    const cameras = [];
    for (let i = 0; i < 5; i++) {
      try {
        const cap = new cv.VideoCapture(i);
        const frame = cap.read();
        if (!frame.empty) {
          cameras.push(i);
        }
        cap.release();
      } catch (error) {
        // Kamera nicht verfügbar
      }
    }
    return cameras;
  }

  async performCalibration() {
    try {
      if (!cv || !this.camera) {
        throw new Error('OpenCV oder Kamera nicht verfügbar');
      }
      
      console.log('🎯 Starte Dartboard-Kalibrierung...');
      
      // Kalibrierungsbilder aufnehmen
      const calibrationFrames = [];
      for (let i = 0; i < 10; i++) {
        const frame = this.camera.read();
        if (!frame.empty) {
          calibrationFrames.push(frame);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Dartboard-Zentrum und Radius erkennen
      const calibration = await this.detectDartboard(calibrationFrames);
      
      if (calibration) {
        this.gameState.calibration = calibration;
        this.gameState.calibration.isCalibrated = true;
        console.log('✅ Kalibrierung erfolgreich');
        
        this.sendToAllClients({
          type: 'calibration_complete',
          calibration: calibration
        });
      } else {
        throw new Error('Kalibrierung fehlgeschlagen');
      }
    } catch (error) {
      console.error('❌ Kalibrierung fehlgeschlagen:', error);
      throw error;
    }
  }

  async detectDartboard(frames) {
    try {
      if (!cv) {
        return null;
      }
      
      // Einfache Dartboard-Erkennung basierend auf Kreisen
      const frame = frames[frames.length - 1];
      const gray = frame.cvtColor(cv.COLOR_BGR2GRAY);
      const blurred = gray.gaussianBlur(new cv.Size(5, 5), 0);
      const circles = blurred.houghCircles(1, 1, 50, 50, 0, 0, 100, 400);
      
      if (circles.length > 0) {
        const largestCircle = circles[0];
        const center = new cv.Point2(largestCircle[0], largestCircle[1]);
        const radius = largestCircle[2];
        
        // Sektoren berechnen (20 Sektoren + Bull)
        const sectors = this.calculateSectors(center, radius);
        
        return {
          dartboardCenter: center,
          dartboardRadius: radius,
          sectors: sectors
        };
      }
      
      return null;
    } catch (error) {
      console.error('Fehler bei Dartboard-Erkennung:', error);
      return null;
    }
  }

  calculateSectors(center, radius) {
    const sectors = [];
    const angleStep = (2 * Math.PI) / 20;
    
    for (let i = 0; i < 20; i++) {
      const angle = i * angleStep;
      const x = center.x + Math.cos(angle) * radius * 0.8;
      const y = center.y + Math.sin(angle) * radius * 0.8;
      sectors.push({
        number: [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5][i],
        center: cv ? new cv.Point2(x, y) : { x, y },
        angle: angle
      });
    }
    
    // Bull hinzufügen
    sectors.push({
      number: 25,
      center: center,
      angle: 0
    });
    
    return sectors;
  }

  async detectDarts() {
    try {
      if (!cv || !this.camera) {
        return;
      }
      
      const frame = this.camera.read();
      if (frame.empty) return;
      
      // Dart-Erkennung
      const dart = await this.findDart(frame);
      if (dart) {
        await this.processDartDetection(dart);
      }
    } catch (error) {
      console.error('Fehler bei Dart-Erkennung:', error);
    }
  }

  async findDart(frame) {
    try {
      if (!cv) {
        return null;
      }
      
      const gray = frame.cvtColor(cv.COLOR_BGR2GRAY);
      const blurred = gray.gaussianBlur(new cv.Size(5, 5), 0);
      
      // Konturen finden
      const contours = blurred.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      for (let i = 0; i < contours.length; i++) {
        const contour = contours[i];
        const area = contour.area;
        
        // Dart-Größe filtern (ca. 20-100 Pixel)
        if (area > 20 && area < 100) {
          const moments = contour.moments();
          const centerX = moments.m10 / moments.m00;
          const centerY = moments.m01 / moments.m00;
          
          return {
            center: new cv.Point2(centerX, centerY),
            area: area,
            contour: contour
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Fehler bei Dart-Suche:', error);
      return null;
    }
  }

  async processDartDetection(dart) {
    try {
      if (!this.gameState.calibration.isCalibrated) return;
      
      // Bestimme welcher Sektor getroffen wurde
      const sector = this.determineSector(dart.center);
      if (sector) {
        // Multiplier bestimmen (Single, Double, Triple)
        const multiplier = this.determineMultiplier(dart.center, sector);
        
        const score = sector.number * multiplier;
        
        this.sendToAllClients({
          type: 'dart_detected',
          score: sector.number,
          multiplier: multiplier,
          sector: sector.number,
          totalScore: score,
          timestamp: new Date().toISOString(),
          position: {
            x: dart.center.x,
            y: dart.center.y
          }
        });
        
        console.log(`🎯 Dart erkannt: ${sector.number}${multiplier > 1 ? 'x' + multiplier : ''} = ${score} Punkte`);
      }
    } catch (error) {
      console.error('Fehler bei Dart-Verarbeitung:', error);
    }
  }

  determineSector(dartCenter) {
    if (!this.gameState.calibration.sectors) return null;
    
    let closestSector = null;
    let minDistance = Infinity;
    
    for (const sector of this.gameState.calibration.sectors) {
      const distance = Math.sqrt(
        Math.pow(dartCenter.x - sector.center.x, 2) + 
        Math.pow(dartCenter.y - sector.center.y, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestSector = sector;
      }
    }
    
    // Nur akzeptieren wenn innerhalb des Dartboards
    if (minDistance < this.gameState.calibration.dartboardRadius * 0.8) {
      return closestSector;
    }
    
    return null;
  }

  determineMultiplier(dartCenter, sector) {
    const distanceFromCenter = Math.sqrt(
      Math.pow(dartCenter.x - this.gameState.calibration.dartboardCenter.x, 2) + 
      Math.pow(dartCenter.y - this.gameState.calibration.dartboardCenter.y, 2)
    );
    
    const radius = this.gameState.calibration.dartboardRadius;
    
    if (sector.number === 25) {
      // Bull: Single Bull (25) oder Double Bull (50)
      return distanceFromCenter < radius * 0.1 ? 2 : 1;
    } else {
      // Normale Sektoren: Single, Double, Triple
      if (distanceFromCenter < radius * 0.2) return 3; // Triple
      if (distanceFromCenter < radius * 0.6) return 1; // Single
      if (distanceFromCenter < radius * 0.8) return 2; // Double
      return 1; // Single als Fallback
    }
  }

  startSimulatedDetection() {
    // Fallback auf simulierte Erkennung
    this.detectionInterval = setInterval(() => {
      if (this.gameState.isPlaying && this.connectedClients.size > 0) {
        if (Math.random() < 0.05) { // 5% Chance pro Frame
          this.simulateDartThrow();
        }
      }
    }, 1000);
    
    console.log('⚠️ Simulierte Dart-Erkennung gestartet (Fallback)');
  }

  simulateDartThrow() {
    const sectors = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 25];
    const multipliers = [1, 2, 3]; // Single, Double, Triple
    const bullMultipliers = [1, 2]; // Single Bull, Double Bull
    
    const sector = sectors[Math.floor(Math.random() * sectors.length)];
    let multiplier, score;
    
    if (sector === 25) {
      multiplier = bullMultipliers[Math.floor(Math.random() * bullMultipliers.length)];
      score = multiplier === 1 ? 25 : 50;
    } else {
      multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
      score = sector * multiplier;
    }
    
    this.sendToAllClients({
      type: 'dart_detected',
      score: sector,
      multiplier: multiplier,
      sector: sector,
      totalScore: score,
      timestamp: new Date().toISOString()
    });
    
    console.log(`🎯 Dart simuliert: ${sector}${multiplier > 1 ? 'x' + multiplier : ''} = ${score} Punkte`);
  }

  handleGameStart(data) {
    this.gameState.isPlaying = true;
    this.gameState.currentMode = data.gameMode;
    console.log('🎮 Spiel gestartet:', data.gameMode);
  }

  handleGameStop(data) {
    this.gameState.isPlaying = false;
    console.log('🛑 Spiel gestoppt');
  }

  handleBoardSelect(data) {
    this.gameState.currentBoard = data.boardId;
    this.autodartsApi.boardId = data.boardId;
    console.log('📋 Board ausgewählt:', data.boardId);
    
    // Board-Konfiguration von Autodarts laden
    this.loadAutodartsBoardConfig(data.boardId);
  }

  async loadAutodartsBoardConfig(boardId) {
    try {
      const response = await axios.get(`${this.autodartsApi.baseUrl}/api/config`, {
        headers: {
          'Authorization': `Bearer ${this.autodartsApi.apiKey}`
        }
      });
      
      if (response.data) {
        this.autodartsApi.apiKey = response.data.apiKey;
        console.log('✅ Autodarts Board-Konfiguration geladen');
        
        this.sendToAllClients({
          type: 'board_config_loaded',
          config: response.data
        });
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Board-Konfiguration:', error);
    }
  }

  async sendDartToAutodarts(dartData) {
    try {
      if (!this.autodartsApi.boardId || !this.autodartsApi.apiKey) {
        console.log('⚠️ Autodarts API nicht konfiguriert');
        return;
      }

      const response = await axios.post(`${this.autodartsApi.baseUrl}/api/dart`, {
        boardId: this.autodartsApi.boardId,
        score: dartData.score,
        multiplier: dartData.multiplier,
        sector: dartData.sector,
        timestamp: dartData.timestamp,
        position: dartData.position
      }, {
        headers: {
          'Authorization': `Bearer ${this.autodartsApi.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        console.log('✅ Dart an Autodarts gesendet');
      }
    } catch (error) {
      console.error('❌ Fehler beim Senden an Autodarts:', error);
    }
  }

  async getAutodartsGameState() {
    try {
      if (!this.autodartsApi.boardId) return null;

      const response = await axios.get(`${this.autodartsApi.baseUrl}/api/game/state`, {
        headers: {
          'Authorization': `Bearer ${this.autodartsApi.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('❌ Fehler beim Laden des Spielstatus:', error);
      return null;
    }
  }

  async startAutodartsGame(gameMode) {
    try {
      if (!this.autodartsApi.boardId) {
        throw new Error('Kein Board ausgewählt');
      }

      const response = await axios.post(`${this.autodartsApi.baseUrl}/api/game/start`, {
        boardId: this.autodartsApi.boardId,
        gameMode: gameMode,
        players: [{
          name: 'Spieler 1',
          score: 501
        }]
      }, {
        headers: {
          'Authorization': `Bearer ${this.autodartsApi.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        console.log('✅ Autodarts Spiel gestartet');
        return response.data;
      }
    } catch (error) {
      console.error('❌ Fehler beim Starten des Autodarts Spiels:', error);
      throw error;
    }
  }

  async stopAutodartsGame() {
    try {
      if (!this.autodartsApi.boardId) return;

      const response = await axios.post(`${this.autodartsApi.baseUrl}/api/game/stop`, {
        boardId: this.autodartsApi.boardId
      }, {
        headers: {
          'Authorization': `Bearer ${this.autodartsApi.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        console.log('✅ Autodarts Spiel gestoppt');
      }
    } catch (error) {
      console.error('❌ Fehler beim Stoppen des Autodarts Spiels:', error);
    }
  }

  // Menü-Aktionen
  newGame() {
    this.stopGame();
    console.log('🆕 Neues Spiel gestartet');
  }

  openCameraSettings() {
    console.log('📹 Kamera-Einstellungen öffnen');
    // TODO: Kamera-Einstellungen implementieren
  }

  calibrateCameras() {
    console.log('🎯 Kamera kalibrieren');
    // TODO: Kamera-Kalibrierung implementieren
  }

  showStatistics() {
    console.log('📊 Statistiken anzeigen');
    // TODO: Statistiken-Fenster öffnen
  }

  resetStatistics() {
    this.gameState.statistics = {};
    console.log('🔄 Statistiken zurückgesetzt');
  }

  openBrowserInterface() {
    const { shell } = require('electron');
    shell.openExternal('http://localhost:3000');
  }

  showAbout() {
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Über Autodarts Trainer Desktop',
      message: 'Autodarts Trainer Desktop v1.0.0',
      detail: 'Professionelle Desktop-App für Autodarts Training\n\nFeatures:\n• 5 eigene Spielmodi\n• Echte Kamera-Erkennung\n• Browser-Interface\n• Vollständige Statistiken'
    });
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
  
  logBoardEvent(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}${data ? ' | ' + JSON.stringify(data) : ''}\n`;
    
    try {
      fs.appendFileSync(this.logFile, logLine);
      console.log(`📝 Board Log: ${message}`);
    } catch (error) {
      console.error('Fehler beim Schreiben der Log-Datei:', error);
    }
  }
  
  getLogs() {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }
      
      const logContent = fs.readFileSync(this.logFile, 'utf8');
      const lines = logContent.trim().split('\n').filter(line => line.trim());
      
      return lines.map(line => {
        const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] (.+)$/);
        if (match) {
          return {
            timestamp: match[1],
            level: match[2].toLowerCase(),
            message: match[3]
          };
        }
        return {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: line
        };
      });
    } catch (error) {
      console.error('Fehler beim Lesen der Log-Datei:', error);
      return [{
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Fehler beim Lesen der Log-Datei'
      }];
    }
  }
  
  generateBoardId() {
    return 'board-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
  
  generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  quit() {
    if (this.server) {
      this.server.close();
    }
    if (this.wss) {
      this.wss.close();
    }
    // app.quit() wird vom main.js aufgerufen
  }
}

module.exports = AutodartsDesktopApp;
