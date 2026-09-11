#!/usr/bin/env bash
set -e

echo "========================================================"
echo " MEGATHON 2026 — Multi-Modal Drone Detection Platform"
echo "========================================================"
echo

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python3 not found"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[1/3] Installing Python dependencies..."
pip3 install -r requirements.txt -q 2>/dev/null || pip install -r requirements.txt -q
pip3 install fastapi uvicorn pydantic joblib python-multipart aiofiles -q 2>/dev/null || true

echo "[2/3] Starting Backend on port 8000..."
python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
sleep 3

echo "[3/3] Starting Frontend on port 5173..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!
sleep 2

echo
echo "========================================================"
echo " SERVICES STARTED"
echo "========================================================"
echo " Backend API:  http://localhost:8000"
echo " API Docs:     http://localhost:8000/docs"
echo " Frontend:     http://localhost:5173"
echo "========================================================"
echo
echo "Press Ctrl+C to stop all services"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Services stopped.'" EXIT
wait
