@echo off
echo ========================================
echo   Tailscale Funnel Setup
echo ========================================
echo.

REM Check for Auth Key
if "%TS_AUTHKEY%"=="" (
    set /p TS_AUTHKEY="Enter your Tailscale Auth Key: "
)

if "%TS_AUTHKEY%"=="" (
    echo Error: Auth Key is required.
    pause
    exit /b 1
)

echo.
echo Starting Tailscale containers...
docker-compose up -d frontend backend

echo.
echo Waiting for Tailscale to initialize...
timeout /t 10 /nobreak >nul


if "%1"=="backend" goto :backend_setup
if "%1"=="frontend" goto :frontend_setup

:frontend_setup
echo.
echo Configuring Frontend Funnel...
docker exec v2capsule-frontend tailscale up --authkey=%TS_AUTHKEY% --hostname=v2capsule-frontend --accept-routes --reset
docker exec v2capsule-frontend tailscale funnel --bg --https=443 http://127.0.0.1:3000
echo Frontend URL:
docker exec v2capsule-frontend tailscale funnel status
if "%1"=="frontend" goto :end

:backend_setup
echo.
echo Configuring Backend Funnel...
docker exec v2capsule-backend tailscale up --authkey=%TS_AUTHKEY% --hostname=v2capsule-backend --accept-routes --reset
docker exec v2capsule-backend tailscale funnel --bg --https=443 http://127.0.0.1:8787
echo Backend URL:
docker exec v2capsule-backend tailscale funnel status
if "%1"=="backend" goto :end

:end
echo.
if "%2" neq "nopause" (
    pause
)
