@echo off
chcp 65001 >nul
title GitHub a Yukleme
color 0A

echo =======================================================================
echo          ALTUG AI - GITHUB A OTOMATIK YUKLEME
echo =======================================================================
echo.
echo [*] Tum klasorler (backend, frontend, dist) GitHub a yukleniyor...
echo.

git push -f origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =======================================================================
    echo [+] TEBRIKLER! Tum dosyalar ve klasorler basariyla GitHub a yuklendi!
    echo =======================================================================
) else (
    echo.
    echo [!] Yukleme sirasinda bir sorun olustu. Ekranda GitHub giris penceresi acildiysa onaylayiniz.
)

echo.
pause
