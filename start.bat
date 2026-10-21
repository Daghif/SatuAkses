@echo off
title SatuAkses - Multi-Agent Web-Bridge (Hackathon ITB 2026)
echo =====================================================================
echo   Memulai SatuAkses Command Center ^& Portal NIB Simulasi...
echo   URL Demo Juri : http://127.0.0.1:8000
echo   URL Portal    : http://127.0.0.1:8000/portal
echo =====================================================================

if exist "C:\Users\Acer\AppData\Local\Programs\Python\Python313\python.exe" (
    "C:\Users\Acer\AppData\Local\Programs\Python\Python313\python.exe" app.py
) else (
    python app.py
)
pause
