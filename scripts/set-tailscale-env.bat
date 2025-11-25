@echo off
setlocal EnableDelayedExpansion

echo.
echo ========================================
echo Setting up Tailscale Environment Variables
echo ========================================
echo.

echo Waiting for Tailscale service to be ready...
:wait_loop
timeout /t 2 /nobreak > nul
docker exec v2capsule-tailscale tailscale status >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Waiting for tailscale...
    goto wait_loop
)

echo Getting Tailscale URL...
REM Use PowerShell to extract the DNSName from tailscale status --json
for /f "delims=" %%i in ('powershell -Command "docker exec v2capsule-tailscale tailscale status --json | ConvertFrom-Json | Select-Object -ExpandProperty Self | Select-Object -ExpandProperty DNSName"') do set TS_DNS=%%i

REM Remove trailing dot if present
if "%TS_DNS:~-1%"=="." set TS_DNS=%TS_DNS:~0,-1%

if "%TS_DNS%"=="" (
    echo ERROR: Could not retrieve Tailscale DNS name.
    echo Make sure the container is running and authenticated.
    exit /b 1
)

set TS_URL=https://%TS_DNS%
echo Found Tailscale URL: %TS_URL%

echo Updating .env file...
powershell -Command "(Get-Content .env) -replace 'NEXT_PUBLIC_API_URL=.*', 'NEXT_PUBLIC_API_URL=%TS_URL%/api' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'CORS_ORIGIN=.*', 'CORS_ORIGIN=%TS_URL%' | Set-Content .env"

echo.
echo Environment variables updated:
echo   NEXT_PUBLIC_API_URL=%TS_URL%/api
echo   CORS_ORIGIN=%TS_URL%
echo.
