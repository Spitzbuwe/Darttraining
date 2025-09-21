#!/usr/bin/env python3
import subprocess
import time
import webbrowser
import sys
import os

def main():
    print("🚀 Starte Autodarts Score Detection System...")
    print("")
    
    # Bridge starten
    print("📡 Starte Bridge-Service...")
    bridge_process = subprocess.Popen([sys.executable, "autodarts_working_bridge.py"])
    
    # Warten
    time.sleep(3)
    
    # HTTP-Server starten
    print("🌐 Starte HTTP-Server...")
    server_process = subprocess.Popen([sys.executable, "-m", "http.server", "8080"])
    
    # Warten
    time.sleep(2)
    
    # Browser öffnen
    print("🌐 Öffne Browser...")
    webbrowser.open("http://localhost:8080/index.html")
    
    print("")
    print("✅ System gestartet!")
    print("📡 Bridge: http://localhost:8766")
    print("🌐 Frontend: http://localhost:8080/index.html")
    print("")
    print("Drücke Ctrl+C zum Beenden...")
    
    try:
        # Warten bis Benutzer beendet
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Beende System...")
        bridge_process.terminate()
        server_process.terminate()
        print("✅ System beendet!")

if __name__ == "__main__":
    main()
