@echo off
chcp 65001 >nul
title Altuğ AI - Klinik Vaka ve Sınav Simülatörü
color 0B

echo =======================================================================
echo          ALTUĞ AI - KLİNİK VAKA VE SINAV SİMÜLATÖRÜ
echo                (Almanya ATA / FSP / KP Hazırlık)
echo =======================================================================
echo.

:: 1. Python kontrolü
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] HATA: Bilgisayarınızda Python bulunamadı!
    echo.
    echo Lütfen Python 3.10 veya daha güncel bir sürümü yükleyin:
    echo https://www.python.org/downloads/
    echo (Kurarken "Add Python to PATH" kutucuğunu işaretlemeyi unutmayınız!)
    echo.
    pause
    exit /b 1
)

:: 2. Gerekli kütüphaneleri otomatik kontrol et ve yükle
echo [*] Gerekli sistem modülleri kontrol ediliyor...
python -c "import fastapi, uvicorn, fitz, reportlab, httpx" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [*] İlk çalıştırma için gerekli kütüphaneler kuruluyor, lütfen bekleyin...
    python -m pip install --upgrade pip >nul 2>&1
    python -m pip install -r "%~dp0backend\requirements.txt"
    if %ERRORLEVEL% NEQ 0 (
        echo [!] Kütüphane kurulumunda bir sorun oluştu. İnternet bağlantınızı kontrol edin.
        pause
        exit /b 1
    )
    echo [+] Kurulum tamamlandı!
    echo.
)

:: 3. Uygulamayı Başlat
echo [*] Altuğ AI başlatılıyor ve tarayıcınız açılıyor...
echo.

python "%~dp0run_app.py"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Uygulama beklenmeyen bir şekilde kapandı.
    pause
)
