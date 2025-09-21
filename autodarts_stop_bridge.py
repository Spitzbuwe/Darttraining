#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Autodarts Stop Bridge - Stoppt automatisches Zählen
"""

import json
import logging
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Logging konfigurieren
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AutodartsStopBridge:
    def __init__(self):
        self.last_score = 0
        self.score_history = []
        self.desktop_connected = True  # Simuliere dass Desktop App läuft
        self.auto_score_active = False  # NIEMALS automatisch aktivieren
        
        logger.info("🚀 Autodarts Stop Bridge initialisiert")
        logger.info("✅ Desktop App Status: Simuliert (läuft)")
        logger.info("⏹️ Auto-Score: DEAKTIVIERT - Kein automatisches Zählen!")

    def add_score(self, score):
        """Fügt einen Score hinzu - NUR manuell"""
        self.last_score = score
        self.score_history.append({
            'score': score,
            'timestamp': time.time(),
            'source': 'manual'
        })
        logger.info(f"🎯 Score hinzugefügt: {score} (manuell)")

    def get_status(self):
        """Gibt den aktuellen Status zurück"""
        return {
            'connected': True,
            'desktop_connected': self.desktop_connected,
            'auto_score_active': False,  # IMMER False
            'last_score': self.last_score,
            'score_history_count': len(self.score_history),
            'username': 'Manueller Modus',
            'camera_status': 'Deaktiviert - Nur manuell'
        }

    def get_score(self):
        """Gibt den letzten Score zurück"""
        return {
            'success': True,
            'score': self.last_score,
            'timestamp': time.time(),
            'source': 'manual'
        }

    def get_scores(self):
        """Gibt die Score-Historie zurück"""
        return {
            'success': True,
            'scores': self.score_history[-10:],  # Letzte 10 Scores
            'count': len(self.score_history)
        }

    def start_auto_score(self):
        """Startet Auto-Score - ABER NUR SIMULATION"""
        self.auto_score_active = False  # Bleibt immer False
        logger.info("▶️ Auto-Score 'gestartet' - Aber deaktiviert!")
        return {'success': True, 'message': 'Auto-Score deaktiviert - Nur manuell!'}

    def stop_auto_score(self):
        """Stoppt Auto-Score"""
        self.auto_score_active = False
        logger.info("⏹️ Auto-Score gestoppt")
        return {'success': True, 'message': 'Auto-Score gestoppt'}

    def test_score(self, score):
        """Testet einen Score - NUR manuell"""
        self.add_score(score)
        return {'success': True, 'message': f'Test-Score {score} hinzugefügt (manuell)'}

class StopBridgeHandler(BaseHTTPRequestHandler):
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
            
            score_data = self.bridge.get_score()
            self.wfile.write(json.dumps(score_data).encode())
            
        elif path == '/scores':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            scores_data = self.bridge.get_scores()
            self.wfile.write(json.dumps(scores_data).encode())
            
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        path = urlparse(self.path).path
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        try:
            data = json.loads(post_data.decode('utf-8'))
        except:
            data = {}
        
        if path == '/start_auto_score':
            result = self.bridge.start_auto_score()
            self.wfile.write(json.dumps(result).encode())
            
        elif path == '/stop_auto_score':
            result = self.bridge.stop_auto_score()
            self.wfile.write(json.dumps(result).encode())
            
        elif path == '/test_score':
            score = data.get('score', 0)
            result = self.bridge.test_score(score)
            self.wfile.write(json.dumps(result).encode())
            
        else:
            result = {'success': False, 'message': 'Unbekannter Endpunkt'}
            self.wfile.write(json.dumps(result).encode())

def main():
    bridge = AutodartsStopBridge()
    handler = lambda *args, **kwargs: StopBridgeHandler(*args, bridge=bridge, **kwargs)
    server = HTTPServer(('localhost', 8766), handler)
    
    print("🚀 Autodarts Stop Bridge läuft auf Port 8766")
    print("📡 Status: http://localhost:8766/status")
    print("🎯 Scores: http://localhost:8766/score")
    print("📊 Score History: http://localhost:8766/scores")
    print("▶️  Start Auto-Score: http://localhost:8766/start_auto_score")
    print("⏹️  Stop Auto-Score: http://localhost:8766/stop_auto_score")
    print("🧪 Test Score: http://localhost:8766/test_score")
    print("💡 Tipp: Öffnen Sie http://localhost:8080/spiel_modi.html")
    print("✅ Desktop App Status: Simuliert (funktioniert)")
    print("⏹️ Auto-Score: DEAKTIVIERT - Kein automatisches Zählen!")
    print("🔄 Drücken Sie Ctrl+C zum Beenden")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Bridge wird gestoppt...")
        server.shutdown()

if __name__ == "__main__":
    main()
