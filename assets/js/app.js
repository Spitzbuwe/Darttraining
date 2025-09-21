// Globale Variablen
let currentGame = null;
let currentBoard = null;
let cameras = [];
let selectedCamera = null;
let websocket = null;
let desktopAppConnected = false;
let gameStats = {
    totalDarts: 0,
    average: 0,
    highestScore: 0,
    checkouts: 0,
    currentRounds: 0,
    sessionTime: 0,
    precision: 0
};

// Game State
const gameState = {
    isPlaying: false,
    currentScore: 501,
    gameMode: null,
    dartHistory: [],
    startTime: null
};

// Initialisierung
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Autodarts Trainer wird initialisiert...');
    initializeApp();
});

async function initializeApp() {
    try {
        // Boards laden
        await loadBoards();
        
        // Kameras laden
        await loadCameras();
        
        // Spielmodi laden
        await loadGameModes();
        
        // WebSocket-Verbindung zur Desktop-App herstellen
        await connectToDesktopApp();
        
        // Timer starten
        startSessionTimer();
        
        console.log('✅ App erfolgreich initialisiert');
        showNotification('App erfolgreich geladen!', 'success');
    } catch (error) {
        console.error('❌ Fehler bei der Initialisierung:', error);
        showNotification('Fehler bei der Initialisierung!', 'error');
    }
}

// Board Management
async function loadBoards() {
    try {
        // Für GitHub Pages: Simulierte Boards laden
        const mockBoards = [
            {
                id: 'demo-board-1',
                name: 'Haupt-Board (Lokal)',
                location: 'Wohnzimmer',
                status: 'online'
            },
            {
                id: 'demo-board-2', 
                name: 'Training Board',
                location: 'Keller',
                status: 'online'
            },
            {
                id: 'demo-board-3',
                name: 'Gäste Board',
                location: 'Garage',
                status: 'offline'
            }
        ];
        displayBoards(mockBoards);
        
        // Erstes Board automatisch auswählen
        if (mockBoards.length > 0) {
            setTimeout(() => {
                const firstBoard = mockBoards[0];
                const firstBoardElement = document.querySelector('.board-item');
                if (firstBoardElement) {
                    selectBoard(firstBoard, firstBoardElement);
                }
            }, 500);
        }
    } catch (error) {
        console.error('Fehler beim Laden der Boards:', error);
    }
}

function displayBoards(boards) {
    const boardList = document.getElementById('boardList');
    boardList.innerHTML = '';
    
    boards.forEach(board => {
        const boardItem = document.createElement('li');
        boardItem.className = 'board-item';
        boardItem.innerHTML = `
            <div>
                <div style="font-weight: 600;">${board.name}</div>
                <div style="font-size: 0.8rem; color: #ccc;">${board.location}</div>
            </div>
            <div class="board-status ${board.status === 'online' ? 'online' : ''}"></div>
        `;
        boardItem.onclick = () => selectBoard(board, boardItem);
        boardList.appendChild(boardItem);
    });
}

function selectBoard(board, element) {
    currentBoard = board;
    document.querySelectorAll('.board-item').forEach(item => item.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    }
    
    // Desktop-App über Board-Auswahl informieren
    sendToDesktopApp({
        type: 'board_select',
        boardId: board.id,
        boardName: board.name
    });
    
    // Board-Status in der UI aktualisieren
    const connectionStatus = document.getElementById('connectionStatus');
    if (connectionStatus) {
        connectionStatus.textContent = board.status === 'online' ? 'Verbunden' : 'Getrennt';
    }
    
    // Kamera-Preview aktualisieren
    const cameraPreview = document.getElementById('cameraPreview');
    if (cameraPreview) {
        if (desktopAppConnected) {
            cameraPreview.innerHTML = `
                <div style="text-align: center; color: #00ff88;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">📹</div>
                    <div style="font-weight: 600;">${board.name}</div>
                    <div style="font-size: 0.8rem; color: #ccc;">${board.location}</div>
                    <div style="font-size: 0.7rem; color: #00ff88; margin-top: 0.5rem;">● Auto-Scoring aktiv</div>
                </div>
            `;
        } else {
            cameraPreview.innerHTML = `
                <div style="text-align: center; color: #00d4ff;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">📹</div>
                    <div style="font-weight: 600;">${board.name}</div>
                    <div style="font-size: 0.8rem; color: #ccc;">${board.location}</div>
                    <div style="font-size: 0.7rem; color: #ffaa00; margin-top: 0.5rem;">● Nur manuell</div>
                </div>
            `;
        }
    }
    
    showNotification(`Board "${board.name}" ausgewählt - ${desktopAppConnected ? 'Auto-Scoring aktiv!' : 'Nur manuelles Scoring verfügbar'}`, 'success');
}

async function createNewBoard() {
    try {
        // Für GitHub Pages: Simuliertes Board erstellen
        const boardNames = [
            'Neues Autodarts Board',
            'Training Board',
            'Wettkampf Board',
            'Demo Board',
            'Test Board'
        ];
        
        const locations = [
            'Wohnzimmer',
            'Keller',
            'Garage',
            'Garten',
            'Büro'
        ];
        
        const randomName = boardNames[Math.floor(Math.random() * boardNames.length)];
        const randomLocation = locations[Math.floor(Math.random() * locations.length)];
        
        const newBoard = {
            id: 'demo-board-' + Date.now(),
            name: randomName,
            location: randomLocation,
            status: 'online'
        };
        
        // Board zur lokalen Liste hinzufügen
        const boardList = document.getElementById('boardList');
        if (!boardList) {
            throw new Error('Board-Liste nicht gefunden');
        }
        
        const boardItem = document.createElement('li');
        boardItem.className = 'board-item';
        boardItem.innerHTML = `
            <div>
                <div style="font-weight: 600;">${newBoard.name}</div>
                <div style="font-size: 0.8rem; color: #ccc;">${newBoard.location}</div>
            </div>
            <div class="board-status online"></div>
        `;
        boardItem.onclick = () => selectBoard(newBoard, boardItem);
        boardList.appendChild(boardItem);
        
        showNotification(`Neues Board "${newBoard.name}" erstellt!`, 'success');
    } catch (error) {
        console.error('Fehler beim Erstellen des Boards:', error);
        showNotification('Fehler beim Erstellen des Boards: ' + error.message, 'error');
    }
}

function deleteBoard(boardId) {
    try {
        const boardItems = document.querySelectorAll('.board-item');
        boardItems.forEach(item => {
            if (item.onclick && item.onclick.toString().includes(boardId)) {
                item.remove();
                showNotification('Board gelöscht!', 'info');
            }
        });
    } catch (error) {
        console.error('Fehler beim Löschen des Boards:', error);
        showNotification('Fehler beim Löschen des Boards!', 'error');
    }
}

// Kamera Management
async function loadCameras() {
    try {
        // Für GitHub Pages: Simulierte Kameras laden
        const mockCameras = [
            {
                name: 'Webcam (Standard)',
                resolution: '1280x720',
                id: 'webcam-default'
            },
            {
                name: 'USB Kamera',
                resolution: '1920x1080', 
                id: 'usb-camera'
            }
        ];
        cameras = mockCameras;
        displayCameras();
    } catch (error) {
        console.error('Fehler beim Laden der Kameras:', error);
    }
}

function displayCameras() {
    const cameraList = document.getElementById('cameraList');
    cameraList.innerHTML = '';
    
    cameras.forEach((camera, index) => {
        const cameraItem = document.createElement('li');
        cameraItem.className = 'camera-item';
        cameraItem.innerHTML = `
            <div>
                <div style="font-weight: 600;">${camera.name}</div>
                <div style="font-size: 0.8rem; color: #ccc;">${camera.resolution}</div>
            </div>
        `;
        cameraItem.onclick = () => selectCamera(camera, index);
        cameraList.appendChild(cameraItem);
    });
}

function selectCamera(camera, index) {
    selectedCamera = camera;
    document.querySelectorAll('.camera-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.camera-item')[index].classList.add('active');
    showNotification(`Kamera "${camera.name}" ausgewählt`, 'info');
}

function startCameraCalibration() {
    document.getElementById('cameraCalibrationModal').style.display = 'block';
}

function startCalibration() {
    showNotification('Kalibrierung gestartet...', 'info');
    // Hier würde die eigentliche Kalibrierung implementiert
    setTimeout(() => {
        showNotification('Kalibrierung abgeschlossen!', 'success');
        closeModal('cameraCalibrationModal');
    }, 3000);
}

// Spielmodi
async function loadGameModes() {
    try {
        // Für GitHub Pages: Simulierte Spielmodi laden
        const gameModes = {
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
        console.log('Spielmodi geladen:', gameModes);
    } catch (error) {
        console.error('Fehler beim Laden der Spielmodi:', error);
    }
}

function selectGameMode(modeId) {
    gameState.gameMode = modeId;
    document.getElementById('currentGameMode').textContent = `Modus: ${modeId}`;
    showNotification(`Spielmodus "${modeId}" ausgewählt`, 'info');
}

// Spielsteuerung
async function startGame() {
    if (!currentBoard) {
        showNotification('Bitte wählen Sie zuerst ein Board aus!', 'error');
        return;
    }
    
    if (!gameState.gameMode) {
        showNotification('Bitte wählen Sie zuerst einen Spielmodus!', 'error');
        return;
    }
    
    try {
        // Desktop-App über Spielstart informieren
        sendToDesktopApp({
            type: 'game_start',
            gameMode: gameState.gameMode,
            boardId: currentBoard.id
        });
        
        // Autodarts Spiel starten (falls Desktop-App verbunden)
        if (desktopAppConnected) {
            try {
                const response = await fetch('http://localhost:3000/api/game/start', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        boardId: currentBoard.id,
                        gameMode: gameState.gameMode,
                        players: [{
                            name: 'Spieler 1',
                            score: 501
                        }]
                    })
                });
                
                if (response.ok) {
                    console.log('✅ Autodarts Spiel gestartet');
                }
            } catch (error) {
                console.log('⚠️ Autodarts nicht erreichbar, lokales Spiel gestartet');
            }
        }
        
        gameState.isPlaying = true;
        gameState.startTime = new Date();
        gameState.currentScore = 501;
        gameState.dartHistory = [];
        
        updateGameDisplay();
        showNotification(`Spiel auf "${currentBoard.name}" gestartet!`, 'success');
    } catch (error) {
        console.error('Fehler beim Starten des Spiels:', error);
        showNotification('Fehler beim Starten des Spiels!', 'error');
    }
}

async function resetGame() {
    try {
        // Desktop-App über Spielstopp informieren
        sendToDesktopApp({
            type: 'game_stop',
            boardId: currentBoard ? currentBoard.id : null
        });
        
        // Autodarts Spiel stoppen (falls Desktop-App verbunden)
        if (desktopAppConnected && currentBoard) {
            try {
                const response = await fetch('http://localhost:3000/api/game/stop', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        boardId: currentBoard.id
                    })
                });
                
                if (response.ok) {
                    console.log('✅ Autodarts Spiel gestoppt');
                }
            } catch (error) {
                console.log('⚠️ Autodarts nicht erreichbar');
            }
        }
        
        gameState.isPlaying = false;
        gameState.currentScore = 501;
        gameState.dartHistory = [];
        gameState.startTime = null;
        
        updateGameDisplay();
        showNotification('Spiel zurückgesetzt!', 'info');
    } catch (error) {
        console.error('Fehler beim Zurücksetzen des Spiels:', error);
        showNotification('Fehler beim Zurücksetzen des Spiels!', 'error');
    }
}

function undoLastDart() {
    if (gameState.dartHistory.length > 0) {
        const lastDart = gameState.dartHistory.pop();
        gameState.currentScore += lastDart.score;
        updateGameDisplay();
        showNotification('Letzter Dart rückgängig gemacht', 'info');
    }
}

function manualScore(score) {
    if (!currentBoard) {
        showNotification('Bitte wählen Sie zuerst ein Board aus!', 'error');
        return;
    }
    
    if (!gameState.isPlaying) {
        showNotification('Spiel ist nicht aktiv! Klicken Sie auf "Spiel starten"', 'error');
        return;
    }
    
    gameState.currentScore -= score;
    gameState.dartHistory.push({
        score: score,
        timestamp: new Date(),
        board: currentBoard.name
    });
    
    updateGameStats();
    updateGameDisplay();
    
    if (gameState.currentScore === 0) {
        showNotification(`Checkout! Spiel auf "${currentBoard.name}" beendet!`, 'success');
        gameState.isPlaying = false;
        gameStats.checkouts++;
        document.getElementById('checkouts').textContent = gameStats.checkouts;
    } else if (gameState.currentScore < 0) {
        showNotification('Bust! Score zu hoch', 'error');
        gameState.currentScore += score;
        gameState.dartHistory.pop();
        updateGameDisplay();
    } else {
        showNotification(`Dart: ${score} Punkte (${gameState.currentScore} verbleibend)`, 'info');
    }
}

function updateGameDisplay() {
    document.getElementById('currentScore').textContent = gameState.currentScore;
    
    const dartHistory = document.getElementById('dartHistory');
    dartHistory.innerHTML = '';
    
    gameState.dartHistory.forEach(dart => {
        const dartElement = document.createElement('div');
        dartElement.className = 'dart-score';
        dartElement.textContent = dart.score;
        dartHistory.appendChild(dartElement);
    });
}

function updateGameStats() {
    gameStats.totalDarts = gameState.dartHistory.length;
    
    if (gameStats.totalDarts > 0) {
        const totalScore = gameState.dartHistory.reduce((sum, dart) => sum + dart.score, 0);
        gameStats.average = (totalScore / gameStats.totalDarts).toFixed(2);
        gameStats.highestScore = Math.max(...gameState.dartHistory.map(dart => dart.score));
    }
    
    document.getElementById('totalDarts').textContent = gameStats.totalDarts;
    document.getElementById('average').textContent = gameStats.average;
    document.getElementById('highestScore').textContent = gameStats.highestScore;
}

function startSessionTimer() {
    setInterval(() => {
        if (gameState.startTime) {
            const now = new Date();
            const diff = now - gameState.startTime;
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            document.getElementById('sessionTime').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

// Modal Functions
function openSettings() {
    document.getElementById('boardConfigModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function saveBoardConfig() {
    const boardId = document.getElementById('boardIdInput').value;
    const apiKey = document.getElementById('apiKeyInput').value;
    const boardUrl = document.getElementById('boardUrlInput').value;
    
    if (!boardId || !apiKey || !boardUrl) {
        showNotification('Bitte füllen Sie alle Felder aus!', 'error');
        return;
    }
    
    // Hier würde die Board-Konfiguration gespeichert
    showNotification('Board-Konfiguration gespeichert!', 'success');
    closeModal('boardConfigModal');
}

function testBoardConnection() {
    showNotification('Verbindung wird getestet...', 'info');
    // Hier würde die Board-Verbindung getestet
    setTimeout(() => {
        showNotification('Verbindung erfolgreich!', 'success');
    }, 2000);
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// WebSocket-Verbindung zur Desktop-App
async function connectToDesktopApp() {
    try {
        // Versuche WebSocket-Verbindung zur Desktop-App
        websocket = new WebSocket('ws://localhost:3003');
        
        websocket.onopen = function() {
            desktopAppConnected = true;
            console.log('🔗 Verbindung zur Desktop-App hergestellt');
            showNotification('Desktop-App verbunden - Auto-Scoring aktiviert!', 'success');
            updateConnectionStatus();
        };
        
        websocket.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                handleDesktopAppMessage(data);
            } catch (error) {
                console.error('Fehler beim Verarbeiten der Desktop-App Nachricht:', error);
            }
        };
        
        websocket.onclose = function() {
            desktopAppConnected = false;
            console.log('❌ Verbindung zur Desktop-App getrennt');
            showNotification('Desktop-App getrennt - Nur manuelles Scoring verfügbar', 'info');
            updateConnectionStatus();
            
            // Versuche Reconnection nach 5 Sekunden
            setTimeout(() => {
                if (!desktopAppConnected) {
                    connectToDesktopApp();
                }
            }, 5000);
        };
        
        websocket.onerror = function(error) {
            console.log('⚠️ Desktop-App nicht erreichbar - Nur manuelles Scoring verfügbar');
            desktopAppConnected = false;
            updateConnectionStatus();
        };
        
    } catch (error) {
        console.log('⚠️ WebSocket nicht verfügbar - Nur manuelles Scoring verfügbar');
        desktopAppConnected = false;
        updateConnectionStatus();
    }
}

function handleDesktopAppMessage(data) {
    switch (data.type) {
        case 'dart_detected':
            handleAutoScore(data.score, data.multiplier, data.sector);
            break;
        case 'camera_status':
            updateCameraStatus(data.status);
            break;
        case 'board_status':
            updateBoardStatus(data.boardId, data.status);
            break;
        case 'calibration_complete':
            showNotification('Kamera-Kalibrierung abgeschlossen!', 'success');
            break;
        default:
            console.log('Unbekannte Nachricht von Desktop-App:', data);
    }
}

async function handleAutoScore(score, multiplier, sector) {
    if (!gameState.isPlaying) {
        showNotification('Spiel ist nicht aktiv!', 'error');
        return;
    }
    
    const totalScore = score * multiplier;
    const dartData = {
        score: totalScore,
        timestamp: new Date(),
        board: currentBoard.name,
        sector: sector,
        multiplier: multiplier,
        autoDetected: true
    };
    
    // Dart an Autodarts senden (falls verbunden)
    if (desktopAppConnected) {
        try {
            await fetch('http://localhost:3000/api/dart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    boardId: currentBoard.id,
                    score: score,
                    multiplier: multiplier,
                    sector: sector,
                    timestamp: dartData.timestamp.toISOString()
                })
            });
        } catch (error) {
            console.log('⚠️ Dart konnte nicht an Autodarts gesendet werden');
        }
    }
    
    gameState.currentScore -= totalScore;
    gameState.dartHistory.push(dartData);
    
    updateGameStats();
    updateGameDisplay();
    
    if (gameState.currentScore === 0) {
        showNotification(`Auto-Checkout! ${sector}${multiplier > 1 ? 'x' + multiplier : ''} - Spiel beendet!`, 'success');
        gameState.isPlaying = false;
        gameStats.checkouts++;
        document.getElementById('checkouts').textContent = gameStats.checkouts;
        
        // Spielende an Autodarts melden
        if (desktopAppConnected) {
            sendToDesktopApp({
                type: 'game_complete',
                boardId: currentBoard.id,
                finalScore: 0,
                totalDarts: gameState.dartHistory.length
            });
        }
    } else if (gameState.currentScore < 0) {
        showNotification('Bust! Score zu hoch', 'error');
        gameState.currentScore += totalScore;
        gameState.dartHistory.pop();
        updateGameDisplay();
    } else {
        showNotification(`Auto-Dart: ${sector}${multiplier > 1 ? 'x' + multiplier : ''} = ${totalScore} Punkte`, 'info');
    }
}

function updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        statusElement.textContent = desktopAppConnected ? 'Desktop-App verbunden' : 'Nur manuell';
    }
}

function updateCameraStatus(status) {
    const cameraPreview = document.getElementById('cameraPreview');
    if (cameraPreview) {
        if (status === 'connected') {
            cameraPreview.innerHTML = `
                <div style="text-align: center; color: #00ff88;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">📹</div>
                    <div style="font-weight: 600;">Kamera verbunden</div>
                    <div style="font-size: 0.8rem; color: #ccc;">Auto-Scoring aktiv</div>
                </div>
            `;
        } else {
            cameraPreview.innerHTML = `
                <div style="text-align: center; color: #ff4444;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">📹</div>
                    <div style="font-weight: 600;">Kamera nicht verbunden</div>
                    <div style="font-size: 0.8rem; color: #ccc;">Nur manuelles Scoring</div>
                </div>
            `;
        }
    }
}

function updateBoardStatus(boardId, status) {
    const boardItems = document.querySelectorAll('.board-item');
    boardItems.forEach(item => {
        if (item.onclick && item.onclick.toString().includes(boardId)) {
            const statusDot = item.querySelector('.board-status');
            if (statusDot) {
                statusDot.className = `board-status ${status === 'online' ? 'online' : ''}`;
            }
        }
    });
}

// Nachricht an Desktop-App senden
function sendToDesktopApp(message) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify(message));
    } else {
        console.log('Desktop-App nicht verbunden - Nachricht nicht gesendet:', message);
    }
}

// Event Listeners
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});

// Keyboard Shortcuts
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
});
