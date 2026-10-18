@echo off
title JobPilot AI - Launcher
echo ========================================================
echo        JobPilot AI - Local Multi-Agent Assistant
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking backend virtual environment...
if not exist "backend\.venv" (
    echo Virtual environment not found. Please setup backend first.
    pause
    exit /b 1
)

echo [2/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "JobPilot Backend (FastAPI)" cmd /k "cd /d %~dp0backend && .venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [3/3] Starting Vite Frontend on http://localhost:5173 ...
start "JobPilot Frontend (Vite)" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

echo.
echo ========================================================
echo   JobPilot AI is now running!
echo   Frontend: http://localhost:5173
echo   Backend API: http://127.0.0.1:8000
echo   API Docs: http://127.0.0.1:8000/docs
echo ========================================================
echo.
