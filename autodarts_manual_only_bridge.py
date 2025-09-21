#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Autodarts Manual Only Bridge - NUR manuelle Eingabe, KEIN Auto-Score
"""

import json
import logging
import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Logging konfigurieren
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AutodartsManualOnlyBridge:
    def __init__(self):
        self.last_score = 0
        self.score_history = []
        self.desktop_connected = True  # Simuliere dass Desktop App läuft
        self.auto_score_active = False  # IMMER deaktiviert
        self.score_generator_running = False  # IMMER deaktiviert
        
        logger.info("🚀 Autodarts Manual Only Bridge initialisiert")
        logger.info("✅ Desktop App Status: Simuliert (läuft)")
        logger.info("⛔ Auto-Score: PERMANENT DEAKTIVIERT")
        logger.info("✅ Manuelle Eingabe: AKTIVIERT")

    def add_manual_score(self, score):
        """Fügt manuellen Score hinzu"""
        self.last_score = score
        self.score_history.append({
            'score': score,
            'timestamp': time.time(),
            'source': 'manual'
        })
        logger.info(f"🎯 Manueller Score hinzugefügt: {score}")

    def get_status(self):
        return {
            'connected': True,
            'desktop_connected': self.desktop_connected,
            'auto_score_active': False,  # IMMER False
            'last_score': self.last_score,
            'score_history_count': len(self.score_history),
            'username': 'Manueller Benutzer',
            'camera_status': 'Deaktiviert (nur manuell)',
            'mode': 'MANUAL_ONLY'
        }

class ManualOnlyBridgeHandler(BaseHTTPRequestHandler):
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
            
            status = self.bridge.get_status()
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
                'source': 'manual'
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
            # Auto-Score ist PERMANENT deaktiviert
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'status': 'Auto-Score ist PERMANENT deaktiviert',
                'message': 'Nur manuelle Eingabe möglich'
            }).encode())
            
        elif path == '/stop_auto_score':
            # Auto-Score ist bereits deaktiviert
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'status': 'Auto-Score bereits deaktiviert',
                'message': 'Nur manuelle Eingabe möglich'
            }).encode())

        elif path == '/add_score':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            score = data.get('score')
            if score is not None:
                self.bridge.add_manual_score(score)
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'status': 'Manueller Score hinzugefügt', 
                    'score': score
                }).encode())
            else:
                self.send_response(400)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'status': 'Fehler', 
                    'message': 'Score fehlt'
                }).encode())

        elif path == '/test_score':
            # Test Score hinzufügen
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.bridge.add_manual_score(180)
            self.wfile.write(json.dumps({
                'status': 'Test Score hinzugefügt', 
                'score': 180
            }).encode())

        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'404 Not Found')

def main():
    bridge = AutodartsManualOnlyBridge()
    handler = lambda *args, **kwargs: ManualOnlyBridgeHandler(bridge=bridge, *args, **kwargs)
    server = HTTPServer(('localhost', 8766), handler)
    
    print("🚀 Autodarts Manual Only Bridge läuft auf Port 8766")
    print("📡 Status: http://localhost:8766/status")
    print("🎯 Scores: http://localhost:8766/score")
    print("📊 Score History: http://localhost:8766/scores")
    print("⛔ Auto-Score: PERMANENT DEAKTIVIERT")
    print("✅ Manuelle Eingabe: AKTIVIERT")
    print("💡 Tipp: Öffnen Sie http://localhost:8080/index.html")
    print("🔄 Drücken Sie Ctrl+C zum Beenden")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Bridge wird gestoppt...")
        server.shutdown()

if __name__ == "__main__":
    main()
