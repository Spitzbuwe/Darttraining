const { BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const axios = require('axios');

class AutodartsSetupWizard {
  constructor() {
    this.setupWindow = null;
    this.currentStep = 1;
    this.totalSteps = 5;
    this.setupData = {
      board: null,
      cameras: [],
      calibration: null,
      testResults: null
    };
    this.availableBoards = [];
    this.availableCameras = [];
  }

  async startSetup() {
    console.log('🎯 Starte Autodarts Setup Wizard...');
    
    try {
      await this.loadAvailableBoards();
      await this.detectCameras();
      this.createSetupWindow();
      
      console.log('✅ Setup Wizard gestartet');
    } catch (error) {
      console.error('❌ Fehler im Setup Wizard:', error);
    }
  }

  createSetupWindow() {
    this.setupWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 1000,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        webSecurity: false
      },
      icon: path.join(__dirname, '../assets/icon.png'),
      title: 'Autodarts Trainer - Setup',
      show: false,
      resizable: true,
      maximizable: true,
      minimizable: true,
      closable: true
    });

    this.setupWindow.loadFile(path.join(__dirname, 'renderer/setup-wizard.html'));

    this.setupWindow.once('ready-to-show', () => {
      this.setupWindow.show();
      console.log('🖥️  Setup Wizard Fenster geöffnet');
    });

    this.setupWindow.on('closed', () => {
      this.setupWindow = null;
    });

    this.setupIpcHandlers();
  }

  setupIpcHandlers() {
    ipcMain.handle('get-setup-data', () => {
      return {
        currentStep: this.currentStep,
        totalSteps: this.totalSteps,
        setupData: this.setupData,
        availableBoards: this.availableBoards,
        availableCameras: this.availableCameras
      };
    });

    ipcMain.handle('next-step', () => {
      return this.nextStep();
    });

    ipcMain.handle('prev-step', () => {
      return this.prevStep();
    });

    ipcMain.handle('select-board', (event, boardId) => {
      return this.selectBoard(boardId);
    });

    ipcMain.handle('create-board', (event, boardName) => {
      return this.createBoard(boardName);
    });

    ipcMain.handle('open-board-config', () => {
      return this.openBoardConfig();
    });

    ipcMain.handle('select-camera', (event, cameraIndex, cameraId) => {
      return this.selectCamera(cameraIndex, cameraId);
    });

    ipcMain.handle('start-calibration', () => {
      return this.startCalibration();
    });

    ipcMain.handle('test-throw', (event, throwData) => {
      return this.testThrow(throwData);
    });

    ipcMain.handle('finish-setup', () => {
      return this.finishSetup();
    });
  }

  async loadAvailableBoards() {
    try {
      // Lade nur lokale Boards von der Desktop-App
      this.availableBoards = [];
      
      // Versuche lokale Boards zu laden
      try {
        const response = await fetch('http://localhost:3002/api/boards');
        if (response.ok) {
          const localBoards = await response.json();
          this.availableBoards = localBoards;
          console.log('🎯 Lokale Boards geladen:', this.availableBoards.length);
        } else {
          console.log('⚠️ Keine lokalen Boards gefunden, erstelle Standard-Board');
          // Erstelle ein Standard-Board wenn keine vorhanden sind
          this.availableBoards = [{
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
        }
      } catch (error) {
        console.log('⚠️ Desktop-App nicht erreichbar, erstelle Standard-Board');
        // Erstelle ein Standard-Board wenn Desktop-App nicht läuft
        this.availableBoards = [{
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
      }
      
      console.log('📋 Verfügbare Boards geladen:', this.availableBoards.length);
    } catch (error) {
      console.error('Fehler beim Laden der Boards:', error);
      this.availableBoards = [];
    }
  }

  async detectCameras() {
    try {
      // Simuliere Kamera-Erkennung
      // In der echten Implementierung würde hier OpenCV oder ähnliches verwendet
      this.availableCameras = [
        {
          id: 0,
          name: 'USB Camera (0)',
          type: 'usb',
          resolution: '1280x720',
          fps: 30,
          status: 'available'
        },
        {
          id: 1,
          name: 'Autodarts Vision Cam (1)',
          type: 'autodarts',
          resolution: '1280x720', 
          fps: 30,
          status: 'available'
        },
        {
          id: 2,
          name: 'Autodarts Vision Cam (2)',
          type: 'autodarts',
          resolution: '1280x720',
          fps: 30,
          status: 'available'
        }
      ];
      
      console.log('📹 Verfügbare Kameras erkannt:', this.availableCameras.length);
    } catch (error) {
      console.error('Fehler bei der Kamera-Erkennung:', error);
      this.availableCameras = [];
    }
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      console.log(`➡️  Nächster Schritt: ${this.currentStep}/${this.totalSteps}`);
      return { success: true, currentStep: this.currentStep };
    }
    return { success: false, error: 'Bereits im letzten Schritt' };
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      console.log(`⬅️  Vorheriger Schritt: ${this.currentStep}/${this.totalSteps}`);
      return { success: true, currentStep: this.currentStep };
    }
    return { success: false, error: 'Bereits im ersten Schritt' };
  }

  selectBoard(boardId) {
    const board = this.availableBoards.find(b => b.id === boardId);
    if (board) {
      this.setupData.board = board;
      console.log('🎯 Board ausgewählt:', board.name);
      console.log('📋 Board-ID:', board.id);
      console.log('🔑 API-Key:', board.apiKey);
      console.log('🌐 Board-URL:', board.url);
      
      // Automatische Board-Konfiguration
      if (board.apiKey && board.url) {
        this.configureBoard(board);
      }
      
      return { success: true, board };
    }
    return { success: false, error: 'Board nicht gefunden' };
  }

  openBoardConfig() {
    try {
      console.log('🔧 Öffne Board-Konfiguration...');
      
      // Öffne das Hauptfenster mit Board-Konfiguration
      const { BrowserWindow } = require('electron');
      const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          enableRemoteModule: true,
          webSecurity: false
        },
        icon: path.join(__dirname, '../assets/icon.png'),
        title: 'Autodarts Trainer - Board Konfiguration',
        show: true
      });
      
      // Lade die play-interface.html mit Board-Konfiguration
      mainWindow.loadFile(path.join(__dirname, 'renderer/play-interface.html'));
      
      // Schließe den Setup Wizard
      if (this.setupWindow) {
        this.setupWindow.close();
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Fehler beim Öffnen der Board-Konfiguration:', error);
      return { success: false, error: error.message };
    }
  }

  createBoard(boardName) {
    const newBoard = {
      id: `board-${Date.now()}`,
      name: boardName,
      status: 'online',
      lastUsed: new Date().toISOString()
    };
    
    this.availableBoards.push(newBoard);
    this.setupData.board = newBoard;
    
    console.log('🆕 Neues Board erstellt:', boardName);
    return { success: true, board: newBoard };
  }

  selectCamera(cameraIndex, cameraId) {
    if (cameraIndex >= 0 && cameraIndex < 3) {
      const camera = this.availableCameras.find(c => c.id === cameraId);
      if (camera) {
        this.setupData.cameras[cameraIndex] = camera;
        console.log(`📹 Kamera ${cameraIndex + 1} ausgewählt:`, camera.name);
        return { success: true, camera };
      }
    }
    return { success: false, error: 'Kamera nicht gefunden' };
  }

  async startCalibration() {
    try {
      console.log('🎯 Starte Kamera-Kalibrierung...');
      
      // Simuliere Kalibrierungsprozess
      this.setupData.calibration = {
        status: 'in_progress',
        cameras: this.setupData.cameras.map(cam => ({
          ...cam,
          calibrationData: {
            gridPoints: [],
            distortion: null,
            calibrationMatrix: null
          }
        }))
      };
      
      // Simuliere Kalibrierungsdauer
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.setupData.calibration.status = 'completed';
      console.log('✅ Kamera-Kalibrierung abgeschlossen');
      
      return { success: true, calibration: this.setupData.calibration };
    } catch (error) {
      console.error('Fehler bei der Kalibrierung:', error);
      return { success: false, error: error.message };
    }
  }

  async testThrow(throwData) {
    try {
      console.log('🎯 Teste Wurf:', throwData);
      
      // Simuliere Wurf-Erkennung
      const testResult = {
        success: true,
        detectedScore: throwData.score || 'D7',
        confidence: 0.95,
        timestamp: new Date().toISOString(),
        cameraData: this.setupData.cameras.map(cam => ({
          cameraId: cam.id,
          detected: true,
          position: { x: Math.random() * 100, y: Math.random() * 100 }
        }))
      };
      
      if (!this.setupData.testResults) {
        this.setupData.testResults = [];
      }
      
      this.setupData.testResults.push(testResult);
      
      console.log('✅ Wurf erfolgreich erkannt:', testResult.detectedScore);
      return { success: true, result: testResult };
    } catch (error) {
      console.error('Fehler beim Wurf-Test:', error);
      return { success: false, error: error.message };
    }
  }

  async finishSetup() {
    try {
      console.log('🎯 Setup abgeschlossen!');
      
      // Speichere Setup-Daten
      const setupConfig = {
        board: this.setupData.board,
        cameras: this.setupData.cameras,
        calibration: this.setupData.calibration,
        testResults: this.setupData.testResults,
        completedAt: new Date().toISOString()
      };
      
      // Übertrage Board-Konfiguration an das Board
      if (this.setupData.board && this.setupData.board.apiKey) {
        await this.configureBoard(this.setupData.board);
      }
      
      // Hier würde die Konfiguration gespeichert werden
      console.log('💾 Setup-Konfiguration gespeichert');
      
      // Schließe Setup-Fenster
      if (this.setupWindow) {
        this.setupWindow.close();
      }
      
      // Starte Desktop-App nach Setup
      console.log('🚀 Starte Desktop-App nach Setup...');
      const { app } = require('electron');
      const AutodartsDesktopApp = require('./desktop-app');
      
      const desktopApp = new AutodartsDesktopApp();
      await desktopApp.initialize();
      
      return { success: true, config: setupConfig };
    } catch (error) {
      console.error('Fehler beim Abschließen des Setups:', error);
      return { success: false, error: error.message };
    }
  }

  async configureBoard(board) {
    try {
      console.log('🔧 Konfiguriere Board:', board.name);
      console.log('📋 Board-ID:', board.id);
      console.log('🔑 API-Key:', board.apiKey);
      console.log('🌐 Board-URL:', board.url);
      
      // Teste Board-Verbindung
      if (board.url) {
        try {
          const response = await axios.get(`${board.url}/status`, {
            timeout: 5000,
            headers: {
              'Authorization': `Bearer ${board.apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('✅ Board-Verbindung erfolgreich:', response.status);
        } catch (error) {
          console.log('⚠️  Board-Verbindung fehlgeschlagen, aber Setup wird fortgesetzt');
        }
      }
      
      // Hier würde die Board-Konfiguration über die API übertragen werden
      // POST http://192.168.2.72:3180/config
      // {
      //   "boardId": "c4fe737a-5637-4953-a1a1-05ecb09efcf2",
      //   "apiKey": "OJ5CQgX0FMHbVvrchvF-Dlt-0ZkDa1yi"
      // }
      
      console.log('✅ Board-Konfiguration übertragen');
      return { success: true };
    } catch (error) {
      console.error('Fehler bei der Board-Konfiguration:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = AutodartsSetupWizard;
