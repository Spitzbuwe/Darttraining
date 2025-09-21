#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Autodarts Simple Hybrid Bridge - Verbindet Desktop App mit Browser-Spiel (ohne WebSocket)
"""

import json
import logging
import time
import threading
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Logging konfigurieren
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AutodartsSimpleHybridBridge:
    def __init__(self):
        self.desktop_app_url = "http://localhost:8080"
        self.last_score = 0
        self.score_history = []
        self.desktop_connected = False
        self.auto_score_active = False
        self.score_generator_running = False
        
        # Score-Generator für Tests
        self.score_generator_thread = None
        self.stop_generator = threading.Event()
        
        logger.info("🚀 Autodarts Simple Hybrid Bridge initialisiert")

    def start_score_generator(self):
        """Startet den Score-Generator für Tests"""
        if self.score_generator_running:
            return
            
        self.score_generator_running = True
        self.stop_generator.clear()
        self.score_generator_thread = threading.Thread(target=self._score_generator_worker, daemon=True)
        self.score_generator_thread.start()
        logger.info("🎯 Score-Generator gestartet")

    def stop_score_generator(self):
        """Stoppt den Score-Generator"""
        if not self.score_generator_running:
            return
            
        self.score_generator_running = False
        self.stop_generator.set()
        if self.score_generator_thread:
            self.score_generator_thread.join(timeout=1)
        logger.info("🎯 Score-Generator gestoppt")

    def _score_generator_worker(self):
        """Score-Generator Worker Thread"""
        while not self.stop_generator.is_set():
            try:
                # Generiere zufällige Scores
                import random
                scores = [20, 25, 30, 40, 50, 60, 100, 120, 180]
                score = random.choice(scores)
                
                self.last_score = score
                self.score_history.append({
                    'score': score,
                    'timestamp': time.time(),
                    'source': 'generator'
                })
                
                logger.info(f"🎯 Score generiert: {score}")
                time.sleep(random.uniform(3, 8))
                
            except Exception as e:
                logger.error(f"Fehler im Score-Generator: {e}")
                time.sleep(1)

    def check_desktop_app(self):
        """Überprüft die Desktop App Verbindung"""
        try:
            response = requests.get(f"{self.desktop_app_url}/status", timeout=2)
            if response.status_code == 200:
                self.desktop_connected = True
                return True
        except:
            pass
        
        self.desktop_connected = False
        return False

    def get_desktop_score(self):
        """Holt den aktuellen Score von der Desktop App"""
        try:
            response = requests.get(f"{self.desktop_app_url}/score", timeout=2)
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('score', 0) > 0:
                    self.last_score = data['score']
                    self.score_history.append({
                        'score': data['score'],
                        'timestamp': time.time(),
                        'source': 'desktop'
                    })
                    return data['score']
        except:
            pass
        return 0

    def send_score_to_desktop(self, score):
        """Sendet einen Score an die Desktop App"""
        try:
            if self.desktop_connected:
                response = requests.post(
                    f"{self.desktop_app_url}/score",
                    json={'score': score},
                    timeout=2
                )
                return response.status_code == 200
        except:
            pass
        return False

class SimpleHybridBridgeHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.bridge = kwargs.pop('bridge')
        super().__init__(*args, **kwargs)

    def do_GET(self):
        path = urlparse(self.path).path
        
        if path == '/status':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            # Prüfe Desktop App Verbindung
            self.bridge.check_desktop_app()
            
            status = {
                'connected': True,
                'desktop_connected': self.bridge.desktop_connected,
                'browser_connected': False,  # WebSocket nicht verfügbar
                'auto_score_active': self.bridge.auto_score_active,
                'last_score': self.bridge.last_score,
                'score_history_count': len(self.bridge.score_history)
            }
            self.wfile.write(json.dumps(status).encode())
            
        elif path == '/score':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            # Versuche Score von Desktop App zu holen
            desktop_score = self.bridge.get_desktop_score()
            
            response = {
                'success': True,
                'score': self.bridge.last_score,
                'source': 'desktop' if self.bridge.desktop_connected else 'generator',
                'desktop_connected': self.bridge.desktop_connected,
                'browser_connected': False
            }
            self.wfile.write(json.dumps(response).encode())
            
        elif path == '/scores':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            scores = self.bridge.score_history[-10:]  # Letzte 10 Scores
            response = {
                'success': True,
                'scores': scores,
                'count': len(scores)
            }
            self.wfile.write(json.dumps(response).encode())
            
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        path = urlparse(self.path).path
        
        if path == '/start_auto_score':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            self.bridge.auto_score_active = True
            self.bridge.start_score_generator()
            
            response = {'success': True, 'message': 'Auto-Score gestartet'}
            self.wfile.write(json.dumps(response).encode())
            
        elif path == '/stop_auto_score':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            self.bridge.auto_score_active = False
            self.bridge.stop_score_generator()
            
            response = {'success': True, 'message': 'Auto-Score gestoppt'}
            self.wfile.write(json.dumps(response).encode())
            
        elif path == '/test_score':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            score = data.get('score', 0)
            self.bridge.last_score = score
            self.bridge.score_history.append({
                'score': score,
                'timestamp': time.time(),
                'source': 'test'
            })
            
            response = {'success': True, 'score': score}
            self.wfile.write(json.dumps(response).encode())
            
        else:
            self.send_response(404)
            self.end_headers()

def main():
    bridge = AutodartsSimpleHybridBridge()
    
    # Handler mit Bridge-Instanz erstellen
    def handler(*args, **kwargs):
        return SimpleHybridBridgeHandler(*args, bridge=bridge, **kwargs)
    
    server = HTTPServer(('localhost', 8766), handler)
    
    print("🚀 Autodarts Simple Hybrid Bridge läuft auf Port 8766")
    print("📡 Status: http://localhost:8766/status")
    print("🎯 Scores: http://localhost:8766/score")
    print("📊 Score History: http://localhost:8766/scores")
    print("▶️  Start Auto-Score: http://localhost:8766/start_auto_score")
    print("⏹️  Stop Auto-Score: http://localhost:8766/stop_auto_score")
    print("🧪 Test Score: http://localhost:8766/test_score")
    print("💡 Tipp: Öffnen Sie http://localhost:8080/simple_hybrid_detection.html")
    print("🔄 Drücken Sie Ctrl+C zum Beenden")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Bridge wird gestoppt...")
        bridge.stop_score_generator()
        server.shutdown()

if __name__ == "__main__":
    main()
