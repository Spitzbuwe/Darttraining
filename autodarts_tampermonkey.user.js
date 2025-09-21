// ==UserScript==
// @name         Autodarts Trainer - Score Capture
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Erfasst Scores von play.autodarts.io und sendet sie an den Autodarts Trainer
// @author       Autodarts Trainer
// @match        https://play.autodarts.io/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('🎯 Autodarts Trainer Script geladen');

    // Konfiguration
    const TRAINER_URL = 'http://localhost:8080';
    const BRIDGE_URL = 'http://localhost:8766';
    
    let lastScore = 0;
    let scoreHistory = [];
    let isConnected = false;

    // Prüfe Verbindung zum Trainer
    function checkConnection() {
        fetch(`${BRIDGE_URL}/status`)
            .then(response => response.json())
            .then(data => {
                isConnected = data.desktop_connected || data.connected;
                console.log('🔗 Trainer Verbindung:', isConnected ? '✅' : '❌');
            })
            .catch(error => {
                isConnected = false;
                console.log('❌ Trainer nicht erreichbar');
            });
    }

    // Sende Score an den Trainer
    function sendScoreToTrainer(score) {
        if (!isConnected) return;

        fetch(`${BRIDGE_URL}/test_score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ score: score })
        })
        .then(response => response.json())
        .then(data => {
            console.log(`🎯 Score an Trainer gesendet: ${score}`);
        })
        .catch(error => {
            console.log('❌ Fehler beim Senden des Scores:', error);
        });
    }

    // Erkenne Score-Änderungen auf der Seite
    function detectScoreChanges() {
        // Suche nach Score-Elementen auf der Seite
        const scoreSelectors = [
            '[data-testid="score"]',
            '.score',
            '.current-score',
            '.points',
            '.dart-score',
            '[class*="score"]',
            '[class*="points"]'
        ];

        scoreSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.type === 'childList' || mutation.type === 'characterData') {
                            const text = element.textContent || element.innerText;
                            const score = extractScore(text);
                            if (score > 0 && score !== lastScore) {
                                lastScore = score;
                                scoreHistory.push({
                                    score: score,
                                    timestamp: Date.now(),
                                    source: 'autodarts_website'
                                });
                                console.log(`🎯 Score erkannt: ${score}`);
                                sendScoreToTrainer(score);
                            }
                        }
                    });
                });
                observer.observe(element, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
            });
        });
    }

    // Extrahiere Score aus Text
    function extractScore(text) {
        if (!text) return 0;
        
        // Entferne Leerzeichen und konvertiere zu Zahl
        const cleanText = text.toString().replace(/\s/g, '');
        
        // Suche nach Zahlen
        const numbers = cleanText.match(/\d+/g);
        if (!numbers) return 0;
        
        // Nimm die größte Zahl (wahrscheinlich der Score)
        const scores = numbers.map(n => parseInt(n)).filter(n => n > 0 && n <= 180);
        return scores.length > 0 ? Math.max(...scores) : 0;
    }

    // Überwache WebSocket-Verbindungen
    function monitorWebSockets() {
        const originalWebSocket = window.WebSocket;
        window.WebSocket = function(...args) {
            const ws = new originalWebSocket(...args);
            
            ws.addEventListener('message', function(event) {
                try {
                    const data = JSON.parse(event.data);
                    if (data && typeof data === 'object') {
                        // Suche nach Score-Daten in WebSocket-Nachrichten
                        const score = findScoreInData(data);
                        if (score > 0 && score !== lastScore) {
                            lastScore = score;
                            scoreHistory.push({
                                score: score,
                                timestamp: Date.now(),
                                source: 'websocket'
                            });
                            console.log(`🎯 WebSocket Score erkannt: ${score}`);
                            sendScoreToTrainer(score);
                        }
                    }
                } catch (e) {
                    // Ignoriere JSON-Parse-Fehler
                }
            });
            
            return ws;
        };
    }

    // Suche nach Score in WebSocket-Daten
    function findScoreInData(data) {
        if (typeof data === 'number') {
            return data > 0 && data <= 180 ? data : 0;
        }
        
        if (typeof data === 'object' && data !== null) {
            // Suche nach Score-Feldern
            const scoreFields = ['score', 'points', 'value', 'dartScore', 'throwScore'];
            for (const field of scoreFields) {
                if (data[field] && typeof data[field] === 'number') {
                    const score = data[field];
                    if (score > 0 && score <= 180) {
                        return score;
                    }
                }
            }
            
            // Rekursiv in verschachtelten Objekten suchen
            for (const key in data) {
                if (typeof data[key] === 'object') {
                    const score = findScoreInData(data[key]);
                    if (score > 0) return score;
                }
            }
        }
        
        return 0;
    }

    // Überwache DOM-Änderungen
    function monitorDOMChanges() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            const text = node.textContent || node.innerText;
                            const score = extractScore(text);
                            if (score > 0 && score !== lastScore) {
                                lastScore = score;
                                scoreHistory.push({
                                    score: score,
                                    timestamp: Date.now(),
                                    source: 'dom_change'
                                });
                                console.log(`🎯 DOM Score erkannt: ${score}`);
                                sendScoreToTrainer(score);
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Erstelle UI-Overlay
    function createUI() {
        const overlay = document.createElement('div');
        overlay.id = 'autodarts-trainer-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 10px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10000;
            border: 2px solid #4CAF50;
        `;
        
        overlay.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; color: #4CAF50;">
                🎯 Autodarts Trainer
            </div>
            <div id="trainer-status">Status: Prüfe Verbindung...</div>
            <div id="trainer-score">Letzter Score: 0</div>
            <div id="trainer-count">Scores erfasst: 0</div>
            <button id="trainer-refresh" style="margin-top: 10px; padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Verbindung prüfen
            </button>
        `;
        
        document.body.appendChild(overlay);
        
        // Event Listener für Refresh-Button
        document.getElementById('trainer-refresh').addEventListener('click', function() {
            checkConnection();
        });
    }

    // Update UI
    function updateUI() {
        const statusEl = document.getElementById('trainer-status');
        const scoreEl = document.getElementById('trainer-score');
        const countEl = document.getElementById('trainer-count');
        
        if (statusEl) {
            statusEl.textContent = `Status: ${isConnected ? '✅ Verbunden' : '❌ Nicht verbunden'}`;
        }
        if (scoreEl) {
            scoreEl.textContent = `Letzter Score: ${lastScore}`;
        }
        if (countEl) {
            countEl.textContent = `Scores erfasst: ${scoreHistory.length}`;
        }
    }

    // Initialisierung
    function init() {
        console.log('🚀 Initialisiere Autodarts Trainer Script');
        
        // Erstelle UI
        createUI();
        
        // Starte Überwachung
        detectScoreChanges();
        monitorWebSockets();
        monitorDOMChanges();
        
        // Prüfe Verbindung
        checkConnection();
        
        // Update UI alle 2 Sekunden
        setInterval(updateUI, 2000);
        
        // Prüfe Verbindung alle 10 Sekunden
        setInterval(checkConnection, 10000);
        
        console.log('✅ Autodarts Trainer Script aktiv');
    }

    // Starte wenn Seite geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
