@echo off
title AeroGuard Frontend Console (Port 5173)
cd /d %~dp0frontend
echo Starting AeroGuard SOC Command Center UI...
npm run dev
pause
