@echo off
REM Tailscale deployment script for Windows

echo.
echo ========================================
echo CineMax S3 Storage - Tailscale Setup
echo ========================================
echo.

REM Check if Tailscale is installed
where tailscale >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Tailscale is not installed!
    echo.
    echo Please install Tailscale from:
    echo https://tailscale.com/download/windows
    echo.
    echo Or use winget:
    echo   winget install tailscale.tailscale
    echo.
    pause
    exit /b 1
)

REM Check if Tailscale is running
tailscale status >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Authenticating with Tailscale...
    tailscale up --accept-dns
    echo Tailscale authenticated!
)

echo.
echo Getting Tailscale information...
for /f "tokens=*" %%i in ('tailscale status --self') do set TAILSCALE_INFO=%%i
echo %TAILSCALE_INFO%

echo.
echo Select deployment type:
echo 1) Private (Tailscale network only)
echo 2) Public (Funnel - accessible to anyone)
echo.
set /p choice="Enter choice [1-2]: "

if "%choice%"=="1" (
    echo.
    echo Setting up private access...
    tailscale serve https / http://localhost:3000
    tailscale serve https /api http://localhost:8787
    echo Private access configured!
) else if "%choice%"=="2" (
    echo.
    echo Setting up public access...
    tailscale funnel 443 on
    tailscale serve https / http://localhost:3000
    tailscale serve https /api http://localhost:8787
    echo Public access configured!
) else (
    echo Invalid choice
    exit /b 1
)

echo.
echo ========================================
echo Tailscale setup complete!
echo ========================================
echo.
echo Next steps:
echo.
echo 1. Get your Tailscale URL:
echo    tailscale status
echo.
echo 2. Update .env file with your Tailscale URL:
echo    NEXT_PUBLIC_API_URL=https://your-machine.tail-name.ts.net/api
echo    CORS_ORIGIN=https://your-machine.tail-name.ts.net
echo.
echo 3. Restart services:
echo    docker-compose restart
echo.
echo 4. Access your application at your Tailscale URL
echo.
pause
