#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Autodarts Real Bridge - Kommuniziert mit der echten Desktop App
"""

import json
import logging
import time
import threading
import requests
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Logging konfigurieren
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AutodartsRealBridge:
    def __init__(self):
        self.last_score = 0
        self.score_history = []
        self.desktop_connected = False
        self.auto_score_active = False
        self.score_generator_running = False
        
        # Score-Generator für Tests
        self.score_generator_thread = None
        self.stop_generator = threading.Event()
        
        # Desktop App URLs (verschiedene Ports testen)
        self.desktop_urls = [
            "http://localhost:8080",
            "http://localhost:8081", 
            "http://localhost:3180",
            "http://192.168.2.72:3180"
        ]
        self.desktop_app_url = None
        
        # Prüfe Desktop App
        self.check_desktop_app()
        
        logger.info("🚀 Autodarts Real Bridge initialisiert")

    def check_desktop_app(self):
        """Überprüft ob die Desktop App läuft und findet die richtige URL"""
        try:
            # Prüfe Prozess
            result = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq "Autodarts Desktop.exe"'], 
                                  capture_output=True, text=True, shell=True, encoding='utf-8', errors='ignore')
            
            if "Autodarts Desktop.exe" in result.stdout:
                self.desktop_connected = True
                logger.info("✅ Desktop App läuft")
                
                # Teste verschiedene URLs
                for url in self.desktop_urls:
                    try:
                        response = requests.get(f"{url}/status", timeout=2)
                        if response.status_code == 200:
                            self.desktop_app_url = url
                            logger.info(f"✅ Desktop App gefunden: {url}")
                            break
                    except:
                        continue
                
                if not self.desktop_app_url:
                    logger.warning("⚠️ Desktop App läuft, aber keine API gefunden")
                    # Verwende die erste URL als Fallback
                    self.desktop_app_url = self.desktop_urls[0]
            else:
                self.desktop_connected = False
                logger.warning("⚠️ Desktop App nicht gefunden")
                
        except Exception as e:
            logger.error(f"Fehler beim Prüfen der Desktop App: {e}")
            self.desktop_connected = False

    def start_score_generator(self):
        """Startet den Score-Generator für Tests"""
        if self.score_generator_running:
            return
            
        self.score_generator_running = True
        self.auto_score_active = True
        self.stop_generator.clear()
        self.score_generator_thread = threading.Thread(target=self._score_generator_worker, daemon=True)
        self.score_generator_thread.start()
        logger.info("▶️ Auto-Score gestartet")

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
                # Versuche echte Scores von der Desktop App zu holen
                if self.desktop_connected and self.desktop_app_url:
                    try:
                        response = requests.get(f"{self.desktop_app_url}/status", timeout=1)
                        if response.status_code == 200:
                            data = response.json()
                            if 'last_score' in data and data['last_score'] > 0:
                                score = data['last_score']
                                if score != self.last_score:  # Nur neue Scores
                                    self.last_score = score
                                    self.score_history.append({
                                        'score': score,
                                        'timestamp': time.time(),
                                        'source': 'desktop_app'
                                    })
                                    logger.info(f"🎯 Desktop Score empfangen: {score}")
                    except:
                        pass
                
                # Fallback: Simuliere Scores wenn keine echten verfügbar
                if not self.desktop_connected:
                    import random
                    scores = [20, 25, 30, 40, 50, 60, 100, 120, 180]
                    score = random.choice(scores)
                    
                    self.last_score = score
                    self.score_history.append({
                        'score': score,
                        'timestamp': time.time(),
                        'source': 'simulation'
                    })
                    
                    logger.info(f"🎯 Score simuliert: {score}")
                
                time.sleep(2)  # Alle 2 Sekunden prüfen
                
            except Exception as e:
                logger.error(f"Fehler im Score-Generator: {e}")
                time.sleep(1)

class RealBridgeHandler(BaseHTTPRequestHandler):
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
                'auto_score_active': self.bridge.auto_score_active,
                'last_score': self.bridge.last_score,
                'score_history_count': len(self.bridge.score_history),
                'username': 'Desktop App User',
                'camera_status': 'Aktiv' if self.bridge.desktop_connected else 'Nicht verfügbar',
                'desktop_url': self.bridge.desktop_app_url
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
                'source': 'desktop_app' if self.bridge.desktop_connected else 'simulation'
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
                self.bridge.last_score = score
                self.bridge.score_history.append({
                    'score': score,
                    'timestamp': time.time(),
                    'source': 'manual'
                })
                logger.info(f"🎯 Score hinzugefügt: {score} (manuell)")
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
            # Simulate adding a test score
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.bridge.last_score = 180
            self.bridge.score_history.append({
                'score': 180,
                'timestamp': time.time(),
                'source': 'test'
            })
            logger.info(f"🎯 Score hinzugefügt: 180 (test)")
            self.wfile.write(json.dumps({'status': 'Test Score hinzugefügt', 'score': 180}).encode())

        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'404 Not Found')

def main():
    bridge = AutodartsRealBridge()
    handler = lambda *args, **kwargs: RealBridgeHandler(bridge=bridge, *args, **kwargs)
    server = HTTPServer(('localhost', 8766), handler)
    
    print("🚀 Autodarts Real Bridge läuft auf Port 8766")
    print("📡 Status: http://localhost:8766/status")
    print("🎯 Scores: http://localhost:8766/score")
    print("📊 Score History: http://localhost:8766/scores")
    print("▶️  Start Auto-Score: http://localhost:8766/start_auto_score")
    print("⏹️  Stop Auto-Score: http://localhost:8766/stop_auto_score")
    print("🧪 Test Score: http://localhost:8766/test_score")
    print("💡 Tipp: Öffnen Sie http://localhost:8080/index.html")
    print(f"✅ Desktop App Status: {'Verbunden' if bridge.desktop_connected else 'Nicht verbunden'}")
    print(f"🌐 Desktop URL: {bridge.desktop_app_url}")
    print("🔄 Drücken Sie Ctrl+C zum Beenden")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Bridge wird gestoppt...")
        bridge.stop_score_generator()
        server.shutdown()

if __name__ == "__main__":
    main()
