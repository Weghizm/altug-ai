import sys
import os
import time
import webbrowser
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "backend"
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

def check_frontend_build():
    if not FRONTEND_DIST.exists():
        print("[*] Frontend henüz derlenmemiş, derleniyor...")
        frontend_dir = BASE_DIR / "frontend"
        try:
            subprocess.run(["cmd.exe", "/c", "npm run build"], cwd=str(frontend_dir), check=True)
            print("[+] Frontend başarıyla derlendi.")
        except Exception as e:
            print(f"[-] Frontend derleme hatası: {e}")

def start_server():
    print("=" * 60)
    print("        Altuğ AI - PDF Test ve Soru Üretici")
    print("=" * 60)
    
    check_frontend_build()
    
    port = 8000
    url = f"http://localhost:{port}"
    
    # 1 saniye sonra tarayıcıyı aç
    def open_browser():
        time.sleep(1.5)
        print(f"[*] Tarayıcı açılıyor: {url}")
        webbrowser.open(url)
        
    import threading
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Uvicorn sunucusunu başlat
    import uvicorn
    sys.path.insert(0, str(BACKEND_DIR))
    uvicorn.run("app:app", host="127.0.0.1", port=port, reload=False)

if __name__ == "__main__":
    start_server()
