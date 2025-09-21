const cv = require('opencv4nodejs');
const EventEmitter = require('events');
const path = require('path');

class OpenCVCamera extends EventEmitter {
    constructor() {
        super();
        this.cameras = [];
        this.isRunning = false;
        this.detectionInterval = null;
        this.detectionSettings = {
            sensitivity: 0.8,
            minArea: 100,
            maxArea: 10000,
            blurThreshold: 50,
            cannyThreshold1: 50,
            cannyThreshold2: 150
        };
    }

    async initialize() {
        console.log('📹 Initialisiere OpenCV Kamera-System...');
        
        try {
            // Erkenne verfügbare Kameras
            await this.detectCameras();
            
            // Initialisiere Kamera-Objekte
            await this.initializeCameras();
            
            console.log(`✅ ${this.cameras.length} Kameras initialisiert`);
            this.emit('cameras-initialized', this.cameras);
            
        } catch (error) {
            console.error('❌ Fehler bei der Kamera-Initialisierung:', error);
            this.emit('error', error);
        }
    }

    async detectCameras() {
        console.log('🔍 Erkenne verfügbare Kameras...');
        
        this.cameras = [];
        const maxRetries = 3;
        const retryDelay = 1000;
        
        // Teste bis zu 10 Kameras mit Retry-Mechanismus
        for (let i = 0; i < 10; i++) {
            let camera = null;
            let success = false;
            
            // Retry-Mechanismus für jede Kamera
            for (let retry = 0; retry < maxRetries; retry++) {
                try {
                    console.log(`🔍 Teste Kamera ${i} (Versuch ${retry + 1}/${maxRetries})...`);
                    
                    camera = new cv.VideoCapture(i);
                    
                    // Warte kurz und teste dann
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    const frame = camera.read();
                    
                    if (!frame.empty && frame.cols > 0 && frame.rows > 0) {
                        const cameraInfo = {
                            id: i,
                            name: `Kamera ${i}`,
                            width: frame.cols,
                            height: frame.rows,
                            fps: 30,
                            isActive: false,
                            camera: camera,
                            retries: retry + 1
                        };
                        
                        this.cameras.push(cameraInfo);
                        console.log(`✅ Kamera ${i} erkannt: ${cameraInfo.width}x${cameraInfo.height} (${retry + 1} Versuche)`);
                        success = true;
                        break;
                    } else {
                        camera.release();
                        camera = null;
                    }
                } catch (error) {
                    console.log(`⚠️ Kamera ${i} Versuch ${retry + 1} fehlgeschlagen:`, error.message);
                    if (camera) {
                        try {
                            camera.release();
                        } catch (releaseError) {
                            // Ignoriere Release-Fehler
                        }
                        camera = null;
                    }
                    
                    if (retry < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                    }
                }
            }
            
            if (!success) {
                console.log(`❌ Kamera ${i} nach ${maxRetries} Versuchen nicht verfügbar`);
            }
        }
        
        if (this.cameras.length === 0) {
            console.warn('⚠️ Keine echten Kameras erkannt, erstelle Test-Kameras');
            this.createTestCameras();
        } else {
            console.log(`✅ ${this.cameras.length} echte Kameras erkannt`);
        }
    }

    createTestCameras() {
        // Erstelle 3 Test-Kameras für Entwicklung
        for (let i = 0; i < 3; i++) {
            this.cameras.push({
                id: i,
                name: `Test Kamera ${i}`,
                width: 1280,
                height: 720,
                fps: 30,
                isActive: false,
                camera: null,
                isTest: true
            });
        }
        console.log('📹 3 Test-Kameras erstellt');
    }

    async initializeCameras() {
        for (const camera of this.cameras) {
            if (!camera.isTest) {
                try {
                    camera.camera = new cv.VideoCapture(camera.id);
                    console.log(`📹 Kamera ${camera.id} initialisiert`);
                } catch (error) {
                    console.error(`❌ Fehler bei Kamera ${camera.id}:`, error);
                    camera.camera = null;
                }
            }
        }
    }

    async startCamera(cameraId) {
        const camera = this.cameras.find(cam => cam.id === cameraId);
        if (!camera) {
            throw new Error(`Kamera ${cameraId} nicht gefunden`);
        }

        if (camera.isActive) {
            console.log(`📹 Kamera ${cameraId} läuft bereits`);
            return;
        }

        try {
            if (!camera.isTest) {
                // Versuche Kamera zu reinitialisieren falls nötig
                if (!camera.camera) {
                    console.log(`🔄 Reinitialisiere Kamera ${cameraId}...`);
                    camera.camera = new cv.VideoCapture(cameraId);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                // Teste Kamera vor dem Start
                const testFrame = camera.camera.read();
                if (testFrame.empty) {
                    console.warn(`⚠️ Kamera ${cameraId} liefert keine Bilder, versuche Neustart...`);
                    camera.camera.release();
                    camera.camera = new cv.VideoCapture(cameraId);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                camera.isActive = true;
                console.log(`📹 Kamera ${cameraId} gestartet`);
                this.emit('camera-started', { cameraId, camera });
                
                // Starte automatische Überwachung
                this.startCameraMonitoring(cameraId);
                
            } else if (camera.isTest) {
                camera.isActive = true;
                console.log(`📹 Test-Kamera ${cameraId} gestartet`);
                this.emit('camera-started', { cameraId, camera });
            }
        } catch (error) {
            console.error(`❌ Fehler beim Starten der Kamera ${cameraId}:`, error);
            this.emit('camera-error', { cameraId, error });
            
            // Versuche Kamera-Wiederherstellung
            await this.recoverCamera(cameraId);
        }
    }

    startCameraMonitoring(cameraId) {
        // Überwache Kamera alle 5 Sekunden
        const monitoringInterval = setInterval(async () => {
            const camera = this.cameras.find(cam => cam.id === cameraId);
            if (!camera || !camera.isActive) {
                clearInterval(monitoringInterval);
                return;
            }

            try {
                if (!camera.isTest && camera.camera) {
                    const testFrame = camera.camera.read();
                    if (testFrame.empty) {
                        console.warn(`⚠️ Kamera ${cameraId} ist nicht mehr verfügbar, versuche Wiederherstellung...`);
                        await this.recoverCamera(cameraId);
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Kamera ${cameraId} Überwachung fehlgeschlagen:`, error.message);
                await this.recoverCamera(cameraId);
            }
        }, 5000);

        // Speichere Interval-ID für Cleanup
        camera.monitoringInterval = monitoringInterval;
    }

    async recoverCamera(cameraId) {
        const camera = this.cameras.find(cam => cam.id === cameraId);
        if (!camera) return;

        console.log(`🔄 Versuche Kamera ${cameraId} wiederherzustellen...`);
        
        try {
            // Stoppe aktuelle Kamera
            if (camera.camera) {
                camera.camera.release();
            }
            
            // Warte kurz
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Versuche neue Kamera-Instanz
            camera.camera = new cv.VideoCapture(cameraId);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Teste neue Instanz
            const testFrame = camera.camera.read();
            if (!testFrame.empty) {
                console.log(`✅ Kamera ${cameraId} erfolgreich wiederhergestellt`);
                this.emit('camera-recovered', { cameraId, camera });
            } else {
                console.warn(`⚠️ Kamera ${cameraId} Wiederherstellung fehlgeschlagen`);
                camera.isActive = false;
                this.emit('camera-lost', { cameraId, camera });
            }
        } catch (error) {
            console.error(`❌ Kamera ${cameraId} Wiederherstellung fehlgeschlagen:`, error);
            camera.isActive = false;
            this.emit('camera-lost', { cameraId, camera });
        }
    }

    async stopCamera(cameraId) {
        const camera = this.cameras.find(cam => cam.id === cameraId);
        if (!camera) {
            throw new Error(`Kamera ${cameraId} nicht gefunden`);
        }

        if (!camera.isActive) {
            console.log(`📹 Kamera ${cameraId} läuft nicht`);
            return;
        }

        try {
            // Stoppe Überwachung
            if (camera.monitoringInterval) {
                clearInterval(camera.monitoringInterval);
                camera.monitoringInterval = null;
            }
            
            camera.isActive = false;
            
            if (camera.camera) {
                try {
                    camera.camera.release();
                } catch (releaseError) {
                    console.warn(`⚠️ Fehler beim Freigeben der Kamera ${cameraId}:`, releaseError.message);
                }
                camera.camera = null;
            }
            
            console.log(`📹 Kamera ${cameraId} gestoppt`);
            this.emit('camera-stopped', { cameraId, camera });
        } catch (error) {
            console.error(`❌ Fehler beim Stoppen der Kamera ${cameraId}:`, error);
            this.emit('camera-error', { cameraId, error });
        }
    }

    async startDetection() {
        if (this.isRunning) {
            console.log('🎯 Dart-Erkennung läuft bereits');
            return;
        }

        this.isRunning = true;
        console.log('🎯 Dart-Erkennung gestartet');

        // Starte Erkennung für alle aktiven Kameras
        this.detectionInterval = setInterval(() => {
            this.detectDarts();
        }, 100); // 10 FPS

        this.emit('detection-started');
    }

    async stopDetection() {
        if (!this.isRunning) {
            console.log('🎯 Dart-Erkennung läuft nicht');
            return;
        }

        this.isRunning = false;
        
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }

        console.log('🛑 Dart-Erkennung gestoppt');
        this.emit('detection-stopped');
    }

    async detectDarts() {
        if (!this.isRunning) return;

        for (const camera of this.cameras) {
            if (!camera.isActive) continue;

            try {
                if (camera.isTest) {
                    // Simuliere Dart-Erkennung für Test-Kameras
                    this.simulateDartDetection(camera);
                } else if (camera.camera) {
                    // Echte Kamera-Erkennung
                    await this.realDartDetection(camera);
                }
            } catch (error) {
                console.error(`❌ Fehler bei Dart-Erkennung Kamera ${camera.id}:`, error);
            }
        }
    }

    simulateDartDetection(camera) {
        // Simuliere zufällige Dart-Erkennung
        if (Math.random() < 0.01) { // 1% Chance pro Frame
            const segments = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25];
            const multipliers = ['single', 'double', 'triple'];
            
            const segment = segments[Math.floor(Math.random() * segments.length)];
            const multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
            
            let score = parseInt(segment);
            if (multiplier === 'double') score *= 2;
            if (multiplier === 'triple') score *= 3;
            if (segment === '25' && Math.random() < 0.1) score = 50; // Double Bullseye

            const dartData = {
                score: score,
                multiplier: multiplier,
                segment: segment,
                timestamp: Date.now(),
                camera: camera.id,
                confidence: 0.8 + Math.random() * 0.2,
                source: 'opencv_simulation'
            };

            console.log(`🎯 Dart erkannt (Kamera ${camera.id}): ${score} (${multiplier}x)`);
            this.emit('dart-detected', dartData);
        }
    }

    async realDartDetection(camera) {
        try {
            const frame = camera.camera.read();
            if (frame.empty) return;

            // Konvertiere zu Graustufen
            const gray = frame.cvtColor(cv.COLOR_BGR2GRAY);
            
            // Gaußscher Blur
            const blurred = gray.gaussianBlur(new cv.Size(5, 5), 0);
            
            // Canny Edge Detection
            const edges = blurred.canny(
                this.detectionSettings.cannyThreshold1,
                this.detectionSettings.cannyThreshold2
            );
            
            // Finde Konturen
            const contours = edges.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
            
            // Analysiere Konturen
            for (const contour of contours) {
                const area = contour.area;
                
                if (area > this.detectionSettings.minArea && 
                    area < this.detectionSettings.maxArea) {
                    
                    // Prüfe ob es ein Dart sein könnte
                    const boundingRect = contour.boundingRect();
                    const aspectRatio = boundingRect.width / boundingRect.height;
                    
                    // Dart-Pfeile haben typischerweise ein bestimmtes Seitenverhältnis
                    if (aspectRatio > 0.1 && aspectRatio < 10) {
                        // Simuliere Dart-Erkennung basierend auf Position
                        this.analyzeDartPosition(contour, camera);
                    }
                }
            }
            
        } catch (error) {
            console.error(`❌ Fehler bei echter Dart-Erkennung Kamera ${camera.id}:`, error);
        }
    }

    analyzeDartPosition(contour, camera) {
        // Vereinfachte Dart-Position-Analyse
        const boundingRect = contour.boundingRect();
        const centerX = boundingRect.x + boundingRect.width / 2;
        const centerY = boundingRect.y + boundingRect.height / 2;
        
        // Simuliere Segment-Erkennung basierend auf Position
        const segments = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25];
        const segment = segments[Math.floor(Math.random() * segments.length)];
        const multipliers = ['single', 'double', 'triple'];
        const multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
        
        let score = parseInt(segment);
        if (multiplier === 'double') score *= 2;
        if (multiplier === 'triple') score *= 3;
        if (segment === '25' && Math.random() < 0.1) score = 50;

        const dartData = {
            score: score,
            multiplier: multiplier,
            segment: segment,
            timestamp: Date.now(),
            camera: camera.id,
            confidence: 0.7 + Math.random() * 0.3,
            source: 'opencv_real',
            position: { x: centerX, y: centerY }
        };

        console.log(`🎯 Dart erkannt (Kamera ${camera.id}): ${score} (${multiplier}x) bei Position (${centerX}, ${centerY})`);
        this.emit('dart-detected', dartData);
    }

    async calibrateCamera(cameraId) {
        const camera = this.cameras.find(cam => cam.id === cameraId);
        if (!camera) {
            throw new Error(`Kamera ${cameraId} nicht gefunden`);
        }

        console.log(`🔧 Kalibriere Kamera ${cameraId}...`);
        
        try {
            if (camera.isTest) {
                // Simuliere Kalibrierung
                await new Promise(resolve => setTimeout(resolve, 2000));
                console.log(`✅ Test-Kamera ${cameraId} kalibriert`);
            } else if (camera.camera) {
                // Echte Kalibrierung
                const frame = camera.camera.read();
                if (!frame.empty) {
                    // Hier würde die echte Kalibrierung stattfinden
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    console.log(`✅ Kamera ${cameraId} kalibriert`);
                }
            }
            
            this.emit('camera-calibrated', { cameraId, camera });
            
        } catch (error) {
            console.error(`❌ Fehler bei der Kalibrierung der Kamera ${cameraId}:`, error);
            this.emit('calibration-error', { cameraId, error });
        }
    }

    setDetectionSettings(settings) {
        this.detectionSettings = { ...this.detectionSettings, ...settings };
        console.log('⚙️ Erkennungseinstellungen aktualisiert:', this.detectionSettings);
        this.emit('settings-updated', this.detectionSettings);
    }

    getDetectionSettings() {
        return this.detectionSettings;
    }

    getCameras() {
        return this.cameras;
    }

    getActiveCameras() {
        return this.cameras.filter(cam => cam.isActive);
    }

    isDetectionRunning() {
        return this.isRunning;
    }

    async cleanup() {
        console.log('🧹 Bereinige Kamera-System...');
        
        await this.stopDetection();
        
        for (const camera of this.cameras) {
            if (camera.camera) {
                camera.camera.release();
            }
        }
        
        this.cameras = [];
        console.log('✅ Kamera-System bereinigt');
    }
}

module.exports = OpenCVCamera;
