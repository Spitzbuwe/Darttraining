#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Autodarts Desktop Detector - Erkennt die tatsächliche API der Desktop App
"""

import requests
import time
import subprocess
import psutil
import json
from pathlib import Path

class AutodartsDesktopDetector:
    def __init__(self):
        self.possible_ports = [3000, 3001, 8080, 8081, 9000, 9001, 5000, 5001]
        self.possible_endpoints = [
            "/api/status",
            "/api/health", 
            "/health",
            "/status",
            "/api/v1/status",
            "/api/v1/health"
        ]
        
    def detect_running_app(self):
        """Erkennt laufende Autodarts Desktop Prozesse"""
        processes = []
        
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    if 'Autodarts' in proc.info['name'] or 'autodarts' in proc.info['name'].lower():
                        processes.append({
                            'pid': proc.info['pid'],
                            'name': proc.info['name'],
                            'cmdline': proc.info['cmdline']
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as e:
            print(f"Fehler beim Prozess-Scan: {e}")
            
        return processes
    
    def scan_ports(self):
        """Scannt alle möglichen Ports nach API-Endpunkten"""
        found_apis = []
        
        for port in self.possible_ports:
            for endpoint in self.possible_endpoints:
                url = f"http://localhost:{port}{endpoint}"
                try:
                    response = requests.get(url, timeout=2)
                    if response.status_code == 200:
                        found_apis.append({
                            'port': port,
                            'endpoint': endpoint,
                            'url': url,
                            'response': response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
                        })
                        print(f"✅ API gefunden: {url}")
                except:
                    continue
                    
        return found_apis
    
    def detect_electron_app(self):
        """Erkennt Electron-spezifische APIs"""
        electron_ports = []
        
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    if 'electron' in proc.info['name'].lower() or 'autodarts' in proc.info['name'].lower():
                        # Prüfe ob es ein Electron-Prozess ist
                        cmdline = ' '.join(proc.info['cmdline']) if proc.info['cmdline'] else ''
                        if 'electron' in cmdline.lower() or 'autodarts' in cmdline.lower():
                            electron_ports.append({
                                'pid': proc.info['pid'],
                                'name': proc.info['name'],
                                'cmdline': cmdline
                            })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as e:
            print(f"Fehler beim Electron-Scan: {e}")
            
        return electron_ports
    
    def test_websocket_connection(self, port):
        """Testet WebSocket-Verbindung"""
        try:
            import websocket
            ws_url = f"ws://localhost:{port}"
            ws = websocket.create_connection(ws_url, timeout=2)
            ws.close()
            return True
        except:
            return False
    except ImportError:
        print("⚠️ websocket-client nicht installiert")
        return False
    
    def full_scan(self):
        """Führt einen vollständigen Scan durch"""
        print("🔍 Starte Autodarts Desktop Detection...")
        print("=" * 50)
        
        # 1. Prozesse scannen
        print("1. Scanne laufende Prozesse...")
        processes = self.detect_running_app()
        if processes:
            print(f"✅ {len(processes)} Autodarts Prozesse gefunden:")
            for proc in processes:
                print(f"   PID: {proc['pid']}, Name: {proc['name']}")
        else:
            print("❌ Keine Autodarts Prozesse gefunden")
        
        # 2. Electron Apps scannen
        print("\n2. Scanne Electron-Apps...")
        electron_apps = self.detect_electron_app()
        if electron_apps:
            print(f"✅ {len(electron_apps)} Electron-Apps gefunden:")
            for app in electron_apps:
                print(f"   PID: {app['pid']}, Name: {app['name']}")
        else:
            print("❌ Keine Electron-Apps gefunden")
        
        # 3. Ports scannen
        print("\n3. Scanne API-Ports...")
        apis = self.scan_ports()
        if apis:
            print(f"✅ {len(apis)} API-Endpunkte gefunden:")
            for api in apis:
                print(f"   {api['url']} - Status: {api['response']}")
        else:
            print("❌ Keine API-Endpunkte gefunden")
        
        # 4. WebSocket testen
        print("\n4. Teste WebSocket-Verbindungen...")
        for port in self.possible_ports:
            if self.test_websocket_connection(port):
                print(f"✅ WebSocket auf Port {port} verfügbar")
        
        print("\n" + "=" * 50)
        print("🔍 Scan abgeschlossen!")
        
        return {
            'processes': processes,
            'electron_apps': electron_apps,
            'apis': apis
        }

def main():
    detector = AutodartsDesktopDetector()
    results = detector.full_scan()
    
    # Speichere Ergebnisse
    with open('autodarts_detection_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n📄 Ergebnisse gespeichert in: autodarts_detection_results.json")

if __name__ == "__main__":
    main()
