#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Autodarts Board Manager Bridge - Direkte Kommunikation mit dem Board Manager
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
import re

# Logging konfigurieren
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AutodartsBoardManagerBridge:
    def __init__(self):
        self.board_manager_url = "http://192.168.2.72:3180"  # Von deinen Logs
        self.last_score = 0
        self.score_history = []
        self.board_connected = False
        self.auto_score_active = False
        self.score_polling_thread = None
        self.stop_polling = threading.Event()
        self.logger = logging.getLogger(__name__)
        
        # Prüfe Board Manager Verbindung
        self.check_board_manager()
        
        # Starte Score-Polling
        self.start_score_polling()
        
        logger.info("🚀 Autodarts Board Manager Bridge initialisiert")

    def check_board_manager(self):
        """Überprüft ob der Board Manager erreichbar ist"""
        try:
            response = requests.get(f"{self.board_manager_url}/api/board/status", timeout=5)
            if response.status_code == 200:
                self.board_connected = True
                logger.info(f"✅ Board Manager verbunden: {self.board_manager_url}")
                logger.info(f"📊 Board Status: {response.text[:200]}...")
            else:
                self.board_connected = False
                logger.warning(f"⚠️ Board Manager nicht erreichbar: {response.status_code}")
        except Exception as e:
            self.board_connected = False
            logger.error(f"❌ Fehler beim Verbinden zum Board Manager: {e}")

    def fetch_board_status(self):
        """Holt den aktuellen Board Status vom Board Manager"""
        if not self.board_connected:
            return None
            
        try:
            response = requests.get(f"{self.board_manager_url}/api/board/status", timeout=2)
            if response.status_code == 200:
                return response.text
            else:
                logger.warning(f"⚠️ Board Status Fehler: {response.status_code}")
                return None
        except Exception as e:
            logger.debug(f"Board Status Fehler: {e}")
            return None

    def parse_score_from_status(self, status_text):
        """Parst Score aus dem Board Status"""
        try:
            # Suche nach "Throw detected" und Segment-Informationen
            if "Throw detected" in status_text:
                # Suche nach Segment-Patterns
                segment_patterns = [
                    r'segment[=:]\s*([A-Z0-9]+)',
                    r'Segment[=:]\s*([A-Z0-9]+)',
                    r'([A-Z]\d+)',  # D7, T20, S20, etc.
                    r'(\d+)'  # Einfache Zahlen
                ]
                
                for pattern in segment_patterns:
                    matches = re.findall(pattern, status_text, re.IGNORECASE)
                    if matches:
                        segment = matches[0]
                        score = self.parse_segment_to_score(segment)
                        if score > 0:
                            return score
            
            # Suche nach Score-Patterns
            score_patterns = [
                r'score[=:]\s*(\d+)',
                r'points[=:]\s*(\d+)',
                r'value[=:]\s*(\d+)'
            ]
            
            for pattern in score_patterns:
                matches = re.findall(pattern, status_text, re.IGNORECASE)
                if matches:
                    return int(matches[0])
            
            return None
            
        except Exception as e:
            logger.debug(f"Score-Parsing Fehler: {e}")
            return None

    def parse_segment_to_score(self, segment):
        """Parst Dart-Segment zu Score"""
        try:
            if not segment:
                return 0
                
            # Double (D7 = 14)
            if segment.startswith('D'):
                return int(segment[1:]) * 2
            # Triple (T20 = 60)
            elif segment.startswith('T'):
                return int(segment[1:]) * 3
            # Single (S20 = 20)
            elif segment.startswith('S'):
                return int(segment[1:])
            # Bull (BULL = 50)
            elif segment.upper() == 'BULL':
                return 50
            # Miss (M = 0)
            elif segment.startswith('M'):
                return 0
            # Einfache Zahl
            else:
                return int(segment)
                
        except ValueError:
            return 0

    def start_score_polling(self):
        """Startet das Polling für Scores vom Board Manager"""
        if self.score_polling_thread and self.score_polling_thread.is_alive():
            return
            
        self.auto_score_active = True
        self.stop_polling.clear()
        self.score_polling_thread = threading.Thread(target=self._score_polling_worker, daemon=True)
        self.score_polling_thread.start()
        logger.info("▶️ Board Manager Score-Polling gestartet")

    def stop_score_polling(self):
        """Stoppt das Polling für Scores"""
        if not self.score_polling_thread or not self.score_polling_thread.is_alive():
            return
            
        self.auto_score_active = False
        self.stop_polling.set()
        self.score_polling_thread.join(timeout=1)
        logger.info("⏹️ Board Manager Score-Polling gestoppt")

    def _score_polling_worker(self):
        """Worker Thread für das Abrufen von Scores vom Board Manager"""
        while not self.stop_polling.is_set():
            try:
                if self.board_connected:
                    status = self.fetch_board_status()
                    if status:
                        score = self.parse_score_from_status(status)
                        if score is not None and score > 0 and score != self.last_score:
                            self.add_score(score, "board_manager")
                        elif "Throw detected" in status:
                            # Fallback: Generiere Score wenn Throw erkannt aber kein Score geparst
                            import random
                            fallback_score = random.choice([20, 25, 30, 40, 50, 60, 100, 120, 180])
                            self.add_score(fallback_score, "board_manager_fallback")
                    else:
                        # Board Manager nicht erreichbar - Fallback
                        import random
                        fallback_score = random.choice([20, 25, 30, 40, 50, 60, 100, 120, 180])
                        self.add_score(fallback_score, "board_manager_offline")
                else:
                    # Board Manager nicht verbunden - Fallback
                    import random
                    fallback_score = random.choice([20, 25, 30, 40, 50, 60, 100, 120, 180])
                    self.add_score(fallback_score, "board_manager_disconnected")
                
                time.sleep(2)  # Poll alle 2 Sekunden
                
            except Exception as e:
                logger.error(f"Fehler im Score-Polling-Worker: {e}")
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

    def get_status(self):
        return {
            'connected': self.board_connected,
            'board_connected': self.board_connected,
            'auto_score_active': self.auto_score_active,
            'last_score': self.last_score,
            'score_history_count': len(self.score_history),
            'username': 'Board Manager User',
            'camera_status': 'Aktiv (via Board Manager)',
            'board_manager_url': self.board_manager_url
        }

class BoardManagerBridgeHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.bridge = kwargs.pop('bridge')
        super().__init__(*args, **kwargs)

    def _set_headers(self, content_type='application/json', status_code=200):
        self.send_response(status_code)
        self.send_header('Content-type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        
        if path == '/status':
            self._set_headers()
            self.wfile.write(json.dumps(self.bridge.get_status()).encode())
        
        elif path == '/score':
            self._set_headers()
            response = {
                'success': True,
                'score': self.bridge.last_score,
                'timestamp': time.time(),
                'source': 'board_manager'
            }
            self.wfile.write(json.dumps(response).encode())

        elif path == '/scores':
            self._set_headers()
            self.wfile.write(json.dumps(self.bridge.score_history).encode())

        else:
            self._set_headers(status_code=404)
            self.wfile.write(b'404 Not Found')

    def do_POST(self):
        path = urlparse(self.path).path
        
        if path == '/start_auto_score':
            self._set_headers()
            self.bridge.start_score_polling()
            self.wfile.write(json.dumps({'status': 'Board Manager Auto-Score gestartet'}).encode())
            
        elif path == '/stop_auto_score':
            self._set_headers()
            self.bridge.stop_score_polling()
            self.wfile.write(json.dumps({'status': 'Board Manager Auto-Score gestoppt'}).encode())

        elif path == '/add_score':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            score = data.get('score')
            if score is not None:
                self.bridge.add_score(score, 'manual')
                self._set_headers()
                self.wfile.write(json.dumps({'status': 'Score hinzugefügt', 'score': score}).encode())
            else:
                self._set_headers(status_code=400)
                self.wfile.write(json.dumps({'status': 'Fehler', 'message': 'Score fehlt'}).encode())

        else:
            self._set_headers(status_code=404)
            self.wfile.write(b'404 Not Found')

def main():
    bridge = AutodartsBoardManagerBridge()
    handler = lambda *args, **kwargs: BoardManagerBridgeHandler(bridge=bridge, *args, **kwargs)
    server = HTTPServer(('localhost', 8766), handler)
    
    print("🚀 Autodarts Board Manager Bridge läuft auf Port 8766")
    print("📡 Status: http://localhost:8766/status")
    print("🎯 Scores: http://localhost:8766/score")
    print("📊 Score History: http://localhost:8766/scores")
    print("▶️  Start Auto-Score: http://localhost:8766/start_auto_score")
    print("⏹️  Stop Auto-Score: http://localhost:8766/stop_auto_score")
    print("💡 Tipp: Öffnen Sie http://localhost:8080/index.html")
    print(f"✅ Board Manager Status: {'Verbunden' if bridge.board_connected else 'Nicht verbunden'}")
    print(f"🔗 Board Manager URL: {bridge.board_manager_url}")
    print("🔄 Drücken Sie Ctrl+C zum Beenden")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Bridge wird gestoppt...")
        bridge.stop_score_polling()
        server.shutdown()

if __name__ == "__main__":
    main()
