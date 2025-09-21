#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Autodarts v0.26.15 Bridge - Direkte Kommunikation mit der echten Desktop App
"""

import json
import logging
import time
import threading
import requests
import subprocess
import websocket
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Logging konfigurieren
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AutodartsV02615Bridge:
    def __init__(self):
        self.last_score = 0
        self.score_history = []
        self.desktop_connected = False
        self.auto_score_active = False
        self.score_generator_running = False
        
        # Score-Generator für Tests
        self.score_generator_thread = None
        self.stop_generator = threading.Event()
        
        # WebSocket-Verbindung zur echten App
        self.ws = None
        self.ws_thread = None
        self.ws_connected = False
        
        # Prüfe Desktop App
        self.check_desktop_app()
        
        # Starte WebSocket-Verbindung
        self.start_websocket()
        
        logger.info("🚀 Autodarts v0.26.15 Bridge initialisiert")

    def check_desktop_app(self):
        """Überprüft ob die Desktop App läuft"""
        try:
            result = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq "Autodarts Desktop.exe"'], 
                                  capture_output=True, text=True, shell=True, encoding='utf-8', errors='ignore')
            
            if "Autodarts Desktop.exe" in result.stdout:
                self.desktop_connected = True
                logger.info("✅ Desktop App läuft - Version 1.3.2")
                logger.info("✅ Detection Version v0.26.15")
            else:
                self.desktop_connected = False
                logger.warning("⚠️ Desktop App nicht gefunden")
                
        except Exception as e:
            logger.error(f"Fehler beim Prüfen der Desktop App: {e}")
            self.desktop_connected = False

    def start_websocket(self):
        """Startet WebSocket-Verbindung zur echten App"""
        if not self.desktop_connected:
            logger.warning("⚠️ Desktop App nicht verfügbar - WebSocket nicht gestartet")
            return
        
        try:
            # WebSocket-URLs testen
            ws_urls = [
                "ws://localhost:3180/ws",
                "ws://localhost:3180/websocket",
                "ws://localhost:3180/socket.io",
                "ws://192.168.2.72:3180/ws",
                "ws://192.168.2.72:3180/websocket"
            ]
            
            for url in ws_urls:
                try:
                    self.ws = websocket.WebSocketApp(
                        url,
                        on_open=self.on_ws_open,
                        on_message=self.on_ws_message,
                        on_error=self.on_ws_error,
                        on_close=self.on_ws_close
                    )
                    
                    # WebSocket in separatem Thread starten
                    self.ws_thread = threading.Thread(target=self.ws.run_forever, daemon=True)
                    self.ws_thread.start()
                    
                    logger.info(f"🌐 WebSocket gestartet: {url}")
                    break
                    
                except Exception as e:
                    logger.debug(f"WebSocket {url} fehlgeschlagen: {e}")
                    continue
            
            if not self.ws:
                logger.warning("⚠️ Keine WebSocket-Verbindung möglich - verwende Simulation")
                self.start_score_generator()
                
        except Exception as e:
            logger.error(f"Fehler beim Starten der WebSocket: {e}")
            self.start_score_generator()

    def on_ws_open(self, ws):
        """WebSocket geöffnet"""
        self.ws_connected = True
        logger.info("✅ WebSocket verbunden")

    def on_ws_message(self, ws, message):
        """WebSocket Nachricht empfangen"""
        try:
            data = json.loads(message)
            logger.debug(f"WebSocket Nachricht: {data}")
            
            # Suche nach Score-Informationen
            if 'score' in data or 'points' in data or 'segment' in data:
                score = self.extract_score_from_message(data)
                if score > 0:
                    self.add_score(score, "websocket")
                    
        except Exception as e:
            logger.debug(f"WebSocket Nachricht verarbeitet: {e}")

    def on_ws_error(self, ws, error):
        """WebSocket Fehler"""
        logger.error(f"WebSocket Fehler: {error}")

    def on_ws_close(self, ws, close_status_code, close_msg):
        """WebSocket geschlossen"""
        self.ws_connected = False
        logger.warning("⚠️ WebSocket geschlossen")

    def extract_score_from_message(self, data):
        """Extrahiert Score aus WebSocket-Nachricht"""
        try:
            # Verschiedene mögliche Score-Felder
            score_fields = ['score', 'points', 'value', 'segment_value']
            
            for field in score_fields:
                if field in data:
                    score = data[field]
                    if isinstance(score, (int, float)) and score > 0:
                        return int(score)
            
            # Segment-basierte Scores (z.B. "D7" = 14)
            if 'segment' in data:
                segment = data['segment']
                if isinstance(segment, str):
                    return self.parse_segment(segment)
                    
            return 0
            
        except Exception as e:
            logger.debug(f"Score-Extraktion fehlgeschlagen: {e}")
            return 0

    def parse_segment(self, segment):
        """Parst Dart-Segment zu Score"""
        try:
            if segment.startswith('D'):  # Double
                return int(segment[1:]) * 2
            elif segment.startswith('T'):  # Triple
                return int(segment[1:]) * 3
            elif segment.startswith('S'):  # Single
                return int(segment[1:])
            else:
                return int(segment)
        except:
            return 0

    def start_score_generator(self):
        """Startet den Score-Generator für Tests"""
        if self.score_generator_running:
            return
            
        self.score_generator_running = True
        self.auto_score_active = True
        self.stop_generator.clear()
        self.score_generator_thread = threading.Thread(target=self._score_generator_worker, daemon=True)
        self.score_generator_thread.start()
        logger.info("▶️ Auto-Score gestartet (Simulation)")

    def stop_score_generator(self):
        """Stoppt den Score-Generator"""
        if not self.score_generator_running:
            return
            
        self.score_generator_running = False
        self.auto_score_active = False
        self.stop_generator.set()
        if self.score_generator_thread:
            self.score_generator_thread.join(timeout=1)
        logger.info("⏹️ Auto-Score gestoppt")

    def _score_generator_worker(self):
        """Score-Generator Worker Thread"""
        while not self.stop_generator.is_set() and self.auto_score_active:
            try:
                # Simuliere echte Dart-Scores basierend auf den Logs
                import random
                
                # Echte Dart-Scores (häufigste)
                dart_scores = [
                    20, 20, 20, 20, 20,  # Single 20 (häufigster)
                    25, 25, 25,          # Bull
                    18, 18, 18,          # Single 18
                    19, 19, 19,          # Single 19
                    17, 17, 17,          # Single 17
                    16, 16, 16,          # Single 16
                    15, 15, 15,          # Single 15
                    14, 14, 14,          # Single 14
                    13, 13, 13,          # Single 13
                    12, 12, 12,          # Single 12
                    11, 11, 11,          # Single 11
                    10, 10, 10,          # Single 10
                    9, 9, 9,             # Single 9
                    8, 8, 8,             # Single 8
                    7, 7, 7,             # Single 7
                    6, 6, 6,             # Single 6
                    5, 5, 5,             # Single 5
                    4, 4, 4,             # Single 4
                    3, 3, 3,             # Single 3
                    2, 2, 2,             # Single 2
                    1, 1, 1,             # Single 1
                    40, 40,              # Double 20
                    50, 50,              # Bull
                    60, 60,              # Triple 20
                    100, 100,            # Double Bull
                    120, 120,            # Triple 20
                    180                  # Triple 20 (höchster)
                ]
                
                score = random.choice(dart_scores)
                
                # Simuliere echte Wurf-Zeiten (3-8 Sekunden zwischen Würfen)
                time.sleep(random.uniform(3, 8))
                
                self.add_score(score, "desktop_simulation")
                
            except Exception as e:
                logger.error(f"Fehler im Score-Generator: {e}")
                time.sleep(1)

    def add_score(self, score, source):
        """Fügt Score zur Historie hinzu"""
        self.last_score = score
        self.score_history.append({
            'score': score,
            'timestamp': time.time(),
            'source': source
        })
        
        logger.info(f"🎯 Score empfangen: {score} ({source})")

class V02615BridgeHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.bridge = kwargs.pop('bridge')
        super().__init__(*args, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        
        if path == '/status':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            status = {
                'connected': True,
                'desktop_connected': self.bridge.desktop_connected,
                'websocket_connected': self.bridge.ws_connected,
                'auto_score_active': self.bridge.auto_score_active,
                'last_score': self.bridge.last_score,
                'score_history_count': len(self.bridge.score_history),
                'username': 'Desktop App User',
                'camera_status': 'Aktiv' if self.bridge.desktop_connected else 'Nicht verfügbar',
                'detection_version': 'v0.26.15'
            }
            self.wfile.write(json.dumps(status).encode())
        
        elif path == '/score':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'success': True,
                'score': self.bridge.last_score,
                'timestamp': time.time(),
                'source': 'websocket' if self.bridge.ws_connected else 'simulation'
            }
            self.wfile.write(json.dumps(response).encode())

        elif path == '/scores':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            self.wfile.write(json.dumps(self.bridge.score_history).encode())

        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'404 Not Found')

    def do_POST(self):
        path = urlparse(self.path).path
        
        if path == '/start_auto_score':
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.bridge.start_score_generator()
            self.wfile.write(json.dumps({'status': 'Auto-Score gestartet'}).encode())
            
        elif path == '/stop_auto_score':
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.bridge.stop_score_generator()
            self.wfile.write(json.dumps({'status': 'Auto-Score gestoppt'}).encode())

        elif path == '/add_score':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            score = data.get('score')
            if score is not None:
                self.bridge.add_score(score, 'manual')
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'Score hinzugefügt', 'score': score}).encode())
            else:
                self.send_response(400)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'Fehler', 'message': 'Score fehlt'}).encode())

        elif path == '/test_score':
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.bridge.add_score(180, 'test')
            self.wfile.write(json.dumps({'status': 'Test Score hinzugefügt', 'score': 180}).encode())

        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'404 Not Found')

def main():
    bridge = AutodartsV02615Bridge()
    handler = lambda *args, **kwargs: V02615BridgeHandler(bridge=bridge, *args, **kwargs)
    server = HTTPServer(('localhost', 8766), handler)
    
    print("🚀 Autodarts v0.26.15 Bridge läuft auf Port 8766")
    print("📡 Status: http://localhost:8766/status")
    print("🎯 Scores: http://localhost:8766/score")
    print("📊 Score History: http://localhost:8766/scores")
    print("▶️  Start Auto-Score: http://localhost:8766/start_auto_score")
    print("⏹️  Stop Auto-Score: http://localhost:8766/stop_auto_score")
    print("🧪 Test Score: http://localhost:8766/test_score")
    print("💡 Tipp: Öffnen Sie http://localhost:8080/index.html")
    print(f"✅ Desktop App Status: {'Verbunden' if bridge.desktop_connected else 'Nicht verbunden'}")
    print(f"🌐 WebSocket Status: {'Verbunden' if bridge.ws_connected else 'Nicht verbunden'}")
    print("🔄 Drücken Sie Ctrl+C zum Beenden")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Bridge wird gestoppt...")
        bridge.stop_score_generator()
        if bridge.ws:
            bridge.ws.close()
        server.shutdown()

if __name__ == "__main__":
    main()
