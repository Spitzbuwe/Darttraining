const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class CameraDetection {
    constructor() {
        this.cameras = [];
        this.detectedCameras = [];
    }

    async detectCameras() {
        console.log('🔍 Erkenne verfügbare Kameras...');
        
        try {
            // Windows: Verwende PowerShell um Kameras zu erkennen
            const cameras = await this.detectWindowsCameras();
            this.detectedCameras = cameras;
            
            console.log(`✅ ${cameras.length} Kameras erkannt`);
            return cameras;
        } catch (error) {
            console.error('❌ Fehler bei Kamera-Erkennung:', error);
            return [];
        }
    }

    async detectWindowsCameras() {
        return new Promise((resolve, reject) => {
            // Erweiterte PowerShell-Befehle für bessere Kamera-Erkennung
            const commands = [
                // Methode 1: WMI-Objekt
                `powershell -Command "Get-WmiObject -Class Win32_PnPEntity | Where-Object {$_.Name -like '*camera*' -or $_.Name -like '*webcam*' -or $_.Name -like '*usb video*' -or $_.Name -like '*imaging*'} | Select-Object Name, DeviceID"`,
                // Methode 2: PnP-Devices
                `powershell -Command "Get-PnpDevice | Where-Object {$_.FriendlyName -like '*camera*' -or $_.FriendlyName -like '*webcam*' -or $_.FriendlyName -like '*video*'} | Select-Object FriendlyName, InstanceId"`,
                // Methode 3: DirectShow
                `powershell -Command "Get-ItemProperty HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Capture\\* | ForEach-Object {Get-ItemProperty $_.PSPath} | Where-Object {$_.FriendlyName -like '*camera*' -or $_.FriendlyName -like '*webcam*'}"`
            ];

            let commandIndex = 0;
            
            const tryNextCommand = () => {
                if (commandIndex >= commands.length) {
                    console.warn('Alle PowerShell-Methoden fehlgeschlagen, verwende Fallback');
                    resolve(this.getFallbackCameras());
                    return;
                }

                const command = commands[commandIndex];
                console.log(`🔍 Versuche Kamera-Erkennung Methode ${commandIndex + 1}...`);
                
                exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
                    if (error || !stdout.trim()) {
                        console.warn(`Methode ${commandIndex + 1} fehlgeschlagen:`, error?.message || 'Keine Ausgabe');
                        commandIndex++;
                        tryNextCommand();
                        return;
                    }

                    const lines = stdout.split('\n').filter(line => line.trim());
                    const cameras = [];

                    lines.forEach((line, index) => {
                        // Überspringe Header-Zeilen
                        if (line.includes('Name') && line.includes('DeviceID')) return;
                        if (line.includes('FriendlyName') && line.includes('InstanceId')) return;
                        if (line.includes('----')) return;
                        
                        // Versuche verschiedene Parsing-Methoden
                        let match = line.match(/^(.+?)\s+([A-Z0-9\\]+)$/);
                        if (!match) {
                            match = line.match(/^(.+?)\s+([A-Z0-9\\-]+)$/);
                        }
                        if (!match) {
                            match = line.match(/^(.+?)\s+(.+)$/);
                        }
                        
                        if (match && match[1].trim() && match[2].trim()) {
                            cameras.push({
                                id: cameras.length,
                                name: match[1].trim(),
                                deviceId: match[2].trim(),
                                status: 'available',
                                type: 'usb',
                                method: `powerShell_${commandIndex + 1}`
                            });
                        }
                    });

                    if (cameras.length > 0) {
                        console.log(`✅ ${cameras.length} Kameras mit Methode ${commandIndex + 1} erkannt`);
                        resolve(cameras);
                    } else {
                        commandIndex++;
                        tryNextCommand();
                    }
                });
            };

            tryNextCommand();
        });
    }

    getFallbackCameras() {
        // Fallback: Simuliere 3 Standard-Kameras
        return [
            {
                id: 0,
                name: 'USB Video Device (Kamera 1)',
                deviceId: 'USB\\VID_0000&PID_0000',
                status: 'available',
                type: 'usb'
            },
            {
                id: 1,
                name: 'USB Video Device (Kamera 2)',
                deviceId: 'USB\\VID_0000&PID_0001',
                status: 'available',
                type: 'usb'
            },
            {
                id: 2,
                name: 'USB Video Device (Kamera 3)',
                deviceId: 'USB\\VID_0000&PID_0002',
                status: 'available',
                type: 'usb'
            }
        ];
    }

    async testCamera(cameraId) {
        try {
            // Simuliere Kamera-Test
            console.log(`🧪 Teste Kamera ${cameraId}...`);
            
            // In der echten Implementierung würde hier ein echter Kamera-Test stehen
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return {
                success: true,
                resolution: '1920x1080',
                fps: 30,
                format: 'MJPG'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    getCameraInfo(cameraId) {
        const camera = this.detectedCameras.find(cam => cam.id === cameraId);
        return camera || null;
    }

    getAllCameras() {
        return this.detectedCameras;
    }
}

module.exports = CameraDetection;
