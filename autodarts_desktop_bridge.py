#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Autodarts Desktop Bridge - Integration mit Autodarts Desktop-1.3.2
"""

import json
import logging
import time
import threading
import subprocess
import os
try:
    import psutil
except ImportError:
    psutil = None
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import requests

# Logging konfigurieren
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AutodartsDesktopBridge:
    def __init__(self):
        self.desktop_app_path = None
        self.desktop_process = None
        self.desktop_connected = False
        self.last_score = 0
        self.score_history = []
        self.auto_score_active = False
        
        # Lade Konfiguration
        self.desktop_config = self._load_config()
        
        # Score-Generator für Tests
        self.score_generator_thread = None
        self.stop_generator = threading.Event()
        self.score_generator_running = False
        
        logger.info("🚀 Autodarts Desktop Bridge initialisiert")
        self._detect_desktop_app()
        self._start_desktop_app()

    def _load_config(self):
        """Lädt die Konfiguration aus der JSON-Datei"""
        try:
            with open('autodarts_config.json', 'r', encoding='utf-8') as f:
                config = json.load(f)
                return config.get('desktop_app', {
                    "api_endpoint": "http://localhost:3000",
                    "websocket_port": 3001,
                    "auto_start": True,
                    "auto_connect": True,
                    "possible_paths": []
                })
        except FileNotFoundError:
            logger.warning("⚠️ Konfigurationsdatei nicht gefunden, verwende Standardwerte")
            return {
                "api_endpoint": "http://localhost:3000",
                "websocket_port": 3001,
                "auto_start": True,
                "auto_connect": True,
                "possible_paths": []
            }
        except Exception as e:
            logger.error(f"❌ Fehler beim Laden der Konfiguration: {e}")
            return {
                "api_endpoint": "http://localhost:3000",
                "websocket_port": 3001,
                "auto_start": True,
                "auto_connect": True,
                "possible_paths": []
            }

    def _detect_desktop_app(self):
        """Erkennt die Autodarts Desktop App Installation"""
        possible_paths = self.desktop_config.get('possible_paths', [])
        username = os.getenv('USERNAME', '')
        
        # Ersetze {username} Platzhalter
        possible_paths = [path.replace('{username}', username) for path in possible_paths]
        
        for path in possible_paths:
            if os.path.exists(path):
                self.desktop_app_path = path
                logger.info(f"✅ Autodarts Desktop gefunden: {path}")
                return
        
        logger.warning("⚠️ Autodarts Desktop nicht gefunden - verwende Simulation")
        self.desktop_app_path = None

    def _start_desktop_app(self):
        """Startet die Autodarts Desktop App"""
        if not self.desktop_app_path or not self.desktop_config["auto_start"]:
            logger.info("🔄 Desktop App Start übersprungen")
            return
            
        try:
            # Prüfe ob bereits läuft
            if psutil:
                for proc in psutil.process_iter(['pid', 'name']):
                    if 'Autodarts Desktop' in proc.info['name']:
                        logger.info("✅ Autodarts Desktop läuft bereits")
                        self.desktop_connected = True
                        return
            else:
                logger.warning("⚠️ psutil nicht verfügbar - kann Prozesse nicht prüfen")
            
            # Starte Desktop App
            logger.info("🚀 Starte Autodarts Desktop...")
            self.desktop_process = subprocess.Popen([self.desktop_app_path])
            
            # Warte auf Start
            time.sleep(5)
            self.desktop_connected = True
            logger.info("✅ Autodarts Desktop gestartet")
            
        except Exception as e:
            logger.error(f"❌ Fehler beim Starten der Desktop App: {e}")
            self.desktop_connected = False

    def _check_desktop_connection(self):
        """Prüft die Verbindung zur Desktop App"""
        try:
            response = requests.get(f"{self.desktop_config['api_endpoint']}/api/status", timeout=2)
            return response.status_code == 200
        except:
            return False

    def get_desktop_status(self):
        """Gibt den Status der Desktop App zurück"""
        if not self.desktop_app_path:
            return {
                "installed": False,
                "running": False,
                "connected": False,
                "message": "Autodarts Desktop nicht installiert"
            }
        
        running = False
        if self.desktop_process:
            running = self.desktop_process.poll() is None
        
        connected = self._check_desktop_connection() if running else False
        
        return {
            "installed": True,
            "running": running,
            "connected": connected,
            "path": self.desktop_app_path,
            "message": "Verbunden" if connected else "Nicht verbunden"
        }

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
        logger.info("🛑 Score-Generator gestoppt")

    def _score_generator_worker(self):
        """Worker-Thread für Score-Generator"""
        import random
        
        while not self.stop_generator.is_set():
            if self.auto_score_active:
                # Simuliere realistische Dart-Scores
                scores = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 50]
                weights = [0.1, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.1, 0.1, 0.05]
                
                score = random.choices(scores, weights=weights)[0]
                self.last_score = score
                self.score_history.append({
                    "score": score,
                    "timestamp": time.time(),
                    "source": "desktop_bridge"
                })
                
                logger.info(f"🎯 Neuer Score: {score}")
            
            time.sleep(random.uniform(2, 5))  # Zufällige Intervalle

    def get_last_score(self):
        """Gibt den letzten Score zurück"""
        return {
            "score": self.last_score,
            "timestamp": time.time(),
            "source": "desktop_bridge"
        }

    def get_score_history(self):
        """Gibt die Score-Historie zurück"""
        return self.score_history[-50:]  # Letzte 50 Scores

    def set_auto_score(self, active):
        """Aktiviert/deaktiviert automatische Score-Erkennung"""
        self.auto_score_active = active
        logger.info(f"🎯 Auto-Score: {'Aktiviert' if active else 'Deaktiviert'}")

    def send_score_to_desktop(self, score):
        """Sendet einen Score an die Desktop App"""
        if not self.desktop_connected:
            logger.warning("⚠️ Desktop App nicht verbunden")
            return False
        
        try:
            data = {
                "score": score,
                "timestamp": time.time(),
                "source": "web_interface"
            }
            
            response = requests.post(
                f"{self.desktop_config['api_endpoint']}/api/scores",
                json=data,
                timeout=2
            )
            
            if response.status_code == 200:
                logger.info(f"✅ Score {score} an Desktop App gesendet")
                return True
            else:
                logger.error(f"❌ Fehler beim Senden des Scores: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Fehler beim Senden des Scores: {e}")
            return False

    def get_desktop_scores(self):
        """Holt Scores von der Desktop App"""
        if not self.desktop_connected:
            return []
        
        try:
            response = requests.get(
                f"{self.desktop_config['api_endpoint']}/api/scores",
                timeout=2
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return []
                
        except Exception as e:
            logger.error(f"❌ Fehler beim Abrufen der Scores: {e}")
            return []

    def restart_desktop_app(self):
        """Startet die Desktop App neu"""
        self.stop_desktop_app()
        time.sleep(2)
        self._start_desktop_app()

    def stop_desktop_app(self):
        """Stoppt die Desktop App"""
        if self.desktop_process:
            try:
                self.desktop_process.terminate()
                self.desktop_process.wait(timeout=5)
                logger.info("✅ Desktop App gestoppt")
            except:
                self.desktop_process.kill()
                logger.info("🛑 Desktop App zwangsgestoppt")
            
            self.desktop_process = None
            self.desktop_connected = False

    def cleanup(self):
        """Bereinigt Ressourcen"""
        self.stop_score_generator()
        self.stop_desktop_app()
        logger.info("🧹 Bridge bereinigt")


class AutodartsDesktopBridgeHandler(BaseHTTPRequestHandler):
    def __init__(self, bridge, *args, **kwargs):
        self.bridge = bridge
        super().__init__(*args, **kwargs)

    def do_GET(self):
        """Handles GET requests"""
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        
        try:
            if path == '/api/status':
                self._send_json_response(self.bridge.get_desktop_status())
            elif path == '/api/score':
                self._send_json_response(self.bridge.get_last_score())
            elif path == '/api/history':
                self._send_json_response(self.bridge.get_score_history())
            elif path == '/api/desktop-scores':
                self._send_json_response(self.bridge.get_desktop_scores())
            else:
                self._send_error_response(404, "Not Found")
                
        except Exception as e:
            logger.error(f"❌ Fehler in GET {path}: {e}")
            self._send_error_response(500, str(e))

    def do_POST(self):
        """Handles POST requests"""
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        
        try:
            if path == '/api/auto-score':
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                self.bridge.set_auto_score(data.get('active', False))
                self._send_json_response({"success": True})
                
            elif path == '/api/send-score':
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                score = data.get('score', 0)
                success = self.bridge.send_score_to_desktop(score)
                self._send_json_response({"success": success})
                
            elif path == '/api/restart-desktop':
                self.bridge.restart_desktop_app()
                self._send_json_response({"success": True})
                
            else:
                self._send_error_response(404, "Not Found")
                
        except Exception as e:
            logger.error(f"❌ Fehler in POST {path}: {e}")
            self._send_error_response(500, str(e))

    def _send_json_response(self, data):
        """Sendet JSON Response"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def _send_error_response(self, code, message):
        """Sendet Error Response"""
        self.send_response(code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}, ensure_ascii=False).encode('utf-8'))

    def log_message(self, format, *args):
        """Überschreibt Standard-Logging"""
        pass


def main():
    """Hauptfunktion"""
    bridge = AutodartsDesktopBridge()
    
    # HTTP Server starten
    def handler(*args, **kwargs):
        return AutodartsDesktopBridgeHandler(bridge, *args, **kwargs)
    
    server = HTTPServer(('localhost', 8767), handler)
    logger.info("🌐 Desktop Bridge Server gestartet auf Port 8767")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("🛑 Server wird beendet...")
        bridge.cleanup()
        server.shutdown()


if __name__ == "__main__":
    main()
