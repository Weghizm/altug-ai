@echo off
title Altuğ AI - PDF Test ve Soru Uretici
echo ========================================================
echo        Altuğ AI - PDF Test ve Soru Uretici
echo ========================================================
echo.
echo Uygulama baslatiliyor, lutfen bekleyin...
echo.

python "%~dp0run_app.py"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Bir hata olustu. Python yuklu oldugundan ve gereksinimlerin kuruldugundan emin olun.
    pause
)
