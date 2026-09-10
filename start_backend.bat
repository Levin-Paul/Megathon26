@echo off
title AeroGuard Backend Server (Port 5000)
cd /d %~dp0backend
echo Starting AeroGuard Unified Coastal Surveillance Backend...
"C:\Users\johnj\anaconda3\python.exe" app.py
pause
