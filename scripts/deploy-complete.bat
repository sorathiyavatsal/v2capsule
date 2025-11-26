@echo off
echo ========================================
echo CineMax S3 Storage - Complete Setup
echo ========================================

echo [1/5] Checking prerequisites...
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Docker is not installed or not in PATH.
    pause
    exit /b 1
)

echo [2/5] Setting up environment...
if not exist .env (
    echo Error: .env file not found. Please create one from .env.example
    pause
    exit /b 1
)

REM Check for Auth Key
if "%TS_AUTHKEY%"=="" (
    set /p TS_AUTHKEY="Enter your Tailscale Auth Key: "
)
set TS_AUTHKEY=%TS_AUTHKEY%

echo.
echo ========================================
echo   Phase 1: Backend Deployment
echo ========================================
echo.
echo Starting Backend and Database...
docker-compose up -d backend postgres

echo.
echo Configuring Backend Funnel...
call .\scripts\setup-tailscale-funnel.bat backend nopause

echo.
echo ========================================
echo   ACTION REQUIRED
echo ========================================
echo.
echo Please copy the Backend URL displayed above (e.g., https://v2capsule-backend.tailxxxxx.ts.net)
set /p BACKEND_URL="Paste Backend URL here: "

echo Updating .env with NEXT_PUBLIC_API_URL...
powershell -Command "(Get-Content .env) -replace 'NEXT_PUBLIC_API_URL=.*', 'NEXT_PUBLIC_API_URL=%BACKEND_URL%' | Set-Content .env"

echo.
echo ========================================
echo   Phase 2: Frontend Deployment
echo ========================================
echo.
echo Building and Starting Frontend (with new API URL)...
docker-compose up -d --build frontend

echo.
echo Configuring Frontend Funnel...
call .\scripts\setup-tailscale-funnel.bat frontend nopause

echo.
echo ========================================
echo   ACTION REQUIRED
echo ========================================
echo.
echo Please copy the Frontend URL displayed above (e.g., https://v2capsule-frontend.tailxxxxx.ts.net)
set /p FRONTEND_URL="Paste Frontend URL here: "

echo Updating .env with CORS_ORIGIN...
powershell -Command "(Get-Content .env) -replace 'CORS_ORIGIN=.*', 'CORS_ORIGIN=%FRONTEND_URL%' | Set-Content .env"

echo.
echo ========================================
echo   Phase 3: Finalize
echo ========================================
echo.
echo Restarting Backend to apply CORS settings...
docker-compose restart backend

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Frontend: %FRONTEND_URL%
echo Backend:  %BACKEND_URL%
echo.
pause
