@echo off
title AeroGuard Surveillance Platform Launcher
echo ========================================================
echo Launching AeroGuard Coastal Surveillance Platform...
echo ========================================================
start "" cmd /c "%~dp0start_backend.bat"
timeout /t 2 /nobreak >nul
start "" cmd /c "%~dp0start_frontend.bat"
timeout /t 3 /nobreak >nul
start "" http://localhost:5173
echo AeroGuard is now running at http://localhost:5173
