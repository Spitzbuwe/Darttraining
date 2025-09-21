#!/usr/bin/env python3
"""
Startet das integrierte Autodarts System mit Desktop-App Integration
"""

import subprocess
import time
import webbrowser
import sys
import os
import json
import threading
from pathlib import Path

def load_config():
    """Lädt die Konfiguration"""
    try:
        with open('autodarts_config.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("❌ Konfigurationsdatei nicht gefunden!")
        return None
    except json.JSONDecodeError:
        print("❌ Ungültige Konfigurationsdatei!")
        return None

def check_desktop_app_installed(config):
    """Prüft ob Autodarts Desktop installiert ist"""
    if not config.get('desktop_app', {}).get('enabled', False):
        return False
    
    possible_paths = config.get('desktop_app', {}).get('possible_paths', [])
    username = os.getenv('USERNAME', '')
    
    for path_template in possible_paths:
        path = path_template.replace('{username}', username)
        if os.path.exists(path):
            print(f"✅ Autodarts Desktop gefunden: {path}")
            return True
    
    print("⚠️ Autodarts Desktop nicht gefunden")
    return False

def start_desktop_bridge(config):
    """Startet die Desktop Bridge"""
    print("📡 Starte Desktop Bridge...")
    bridge_process = subprocess.Popen([sys.executable, "autodarts_desktop_bridge.py"])
    time.sleep(2)
    return bridge_process

def start_working_bridge(config):
    """Startet die Working Bridge"""
    print("🔗 Starte Working Bridge...")
    bridge_process = subprocess.Popen([sys.executable, "autodarts_working_bridge.py"])
    time.sleep(2)
    return bridge_process

def start_http_server():
    """Startet den HTTP Server"""
    print("🌐 Starte HTTP-Server...")
    server_process = subprocess.Popen([sys.executable, "-m", "http.server", "8080"])
    time.sleep(1)
    return server_process

def open_browser():
    """Öffnet den Browser"""
    print("🌐 Öffne Browser...")
    webbrowser.open("http://localhost:8080/index.html")

def show_status(config, processes):
    """Zeigt den System-Status"""
    print("\n" + "="*60)
    print("🎯 AUTODARTS INTEGRIERTES SYSTEM")
    print("="*60)
    print(f"📡 Desktop Bridge: http://localhost:{config.get('desktop_app', {}).get('bridge_port', 8767)}")
    print(f"🔗 Working Bridge: http://localhost:8766")
    print(f"🌐 Web Interface: http://localhost:8080/index.html")
    print(f"🖥️ Desktop App: {'Aktiviert' if config.get('desktop_app', {}).get('enabled', False) else 'Deaktiviert'}")
    print("="*60)
    print("Drücke Ctrl+C zum Beenden...")
    print("="*60)

def cleanup_processes(processes):
    """Bereinigt alle Prozesse"""
    print("\n🛑 Beende System...")
    for name, process in processes.items():
        if process and process.poll() is None:
            print(f"🛑 Beende {name}...")
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
    print("✅ System beendet!")

def main():
    """Hauptfunktion"""
    print("🚀 Starte Autodarts Integriertes System...")
    print("")
    
    # Konfiguration laden
    config = load_config()
    if not config:
        return
    
    # Desktop App Status prüfen
    desktop_installed = check_desktop_app_installed(config)
    
    # Prozesse starten
    processes = {}
    
    try:
        # Desktop Bridge starten (falls Desktop App aktiviert)
        if config.get('desktop_app', {}).get('enabled', False):
            processes['desktop_bridge'] = start_desktop_bridge(config)
        
        # Working Bridge starten
        processes['working_bridge'] = start_working_bridge(config)
        
        # HTTP Server starten
        processes['http_server'] = start_http_server()
        
        # Browser öffnen
        open_browser()
        
        # Status anzeigen
        show_status(config, processes)
        
        # Warten bis Benutzer beendet
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        cleanup_processes(processes)
    except Exception as e:
        print(f"❌ Fehler: {e}")
        cleanup_processes(processes)

if __name__ == "__main__":
    main()
