@echo off
echo ========================================================
echo  MEGATHON 2026 — Multi-Modal Drone Detection Platform
echo ========================================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.10+
    pause
    exit /b 1
)

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)

echo [1/3] Installing Python dependencies...
pip install -r requirements.txt -q
pip install fastapi uvicorn pydantic joblib python-multipart aiofiles -q

echo [2/3] Starting Backend on port 8000...
start "Drone Detection Backend" cmd /c "cd /d %~dp0 && python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"

:: Wait for backend to start
timeout /t 4 /nobreak >nul

echo [3/3] Starting Frontend on port 5173...
cd /d %~dp0frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)
start "Drone Detection Frontend" cmd /c "npm run dev"

echo.
echo ========================================================
echo  SERVICES STARTED
echo ========================================================
echo  Backend API:  http://localhost:8000
echo  API Docs:     http://localhost:8000/docs
echo  Frontend:     http://localhost:5173
echo ========================================================
echo.
echo Press any key to stop all services...
pause >nul

:: Cleanup
taskkill /FI "WINDOWTITLE eq Drone Detection Backend" /F 2>nul
taskkill /FI "WINDOWTITLE eq Drone Detection Frontend" /F 2>nul
echo Services stopped.
