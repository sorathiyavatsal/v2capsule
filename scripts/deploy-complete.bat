@echo off
REM ========================================
REM CineMax S3 Storage - Complete Deployment
REM One-Click Setup Script
REM ========================================

echo.
echo ========================================
echo CineMax S3 Storage - Complete Setup
echo ========================================
echo.

REM Step 1: Check prerequisites
echo [1/5] Checking prerequisites...
echo.

REM Check Docker
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker is not installed!
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Check Docker Compose
where docker-compose >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker Compose is not installed!
    echo Please install Docker Desktop which includes Docker Compose
    pause
    exit /b 1
)

echo Docker: OK
echo Docker Compose: OK
echo.

REM Step 2: Setup environment
echo [2/5] Setting up environment...
echo.

if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo.
    echo IMPORTANT: Please update these values in .env:
    echo   - DATABASE_URL (change password)
    echo   - JWT_SECRET (generate random string)
    echo   - ENCRYPTION_MASTER_KEY (64-char hex string)
    echo.
    set /p continue="Press Enter after updating .env to continue (or Ctrl+C to exit)..."
)

echo Environment: OK
echo.

REM Step 3: Deploy with Docker
echo [3/5] Deploying application with Docker...
echo.

echo Building and starting services...
docker-compose up -d --build

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker deployment failed!
    echo Check the logs with: docker-compose logs
    pause
    exit /b 1
)

echo.
echo Waiting for services to be healthy...
timeout /t 15 /nobreak > nul

echo.
echo Service Status:
docker-compose ps

echo.
echo Docker Deployment: OK
echo.

REM Step 4: Tailscale Setup (Optional)
echo [4/5] Tailscale Setup (Optional)
echo.
set /p setup_tailscale="Do you want to set up Tailscale for remote access? (y/n): "

if /i "%setup_tailscale%"=="y" (
    echo.
    echo Checking Tailscale installation...
    
    where tailscale >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo Tailscale is not installed!
        echo.
        echo Install options:
        echo 1. Download from: https://tailscale.com/download/windows
        echo 2. Or use: winget install tailscale.tailscale
        echo.
        set /p install_ts="Install Tailscale now using winget? (y/n): "
        
        if /i "!install_ts!"=="y" (
            winget install tailscale.tailscale
            echo.
            echo Please restart this script after Tailscale installation completes.
            pause
            exit /b 0
        ) else (
            echo Skipping Tailscale setup. You can run setup-tailscale.bat later.
            goto skip_tailscale
        )
    )
    
    REM Authenticate Tailscale
    tailscale status >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo Authenticating with Tailscale...
        tailscale up --accept-dns
    )
    
    echo.
    echo Select Tailscale deployment type:
    echo 1) Private (Tailscale network only)
    echo 2) Public (Funnel - accessible to anyone)
    echo.
    set /p ts_choice="Enter choice [1-2]: "
    
    if "%ts_choice%"=="1" (
        echo.
        echo Setting up private Tailscale access...
        tailscale serve https / http://localhost:3000
        tailscale serve https /api http://localhost:8787
        echo Private Tailscale access configured!
    ) else if "%ts_choice%"=="2" (
        echo.
        echo Setting up public Tailscale access...
        tailscale funnel 443 on
        tailscale serve https / http://localhost:3000
        tailscale serve https /api http://localhost:8787
        echo Public Tailscale access configured!
    )
    
    echo.
    echo Getting your Tailscale URL...
    tailscale status --self
    
    echo.
    echo Tailscale Setup: OK
    echo.
    echo IMPORTANT: Update your .env file with your Tailscale URL:
    echo   NEXT_PUBLIC_API_URL=https://your-machine.tail-name.ts.net/api
    echo   CORS_ORIGIN=https://your-machine.tail-name.ts.net
    echo.
    echo Then restart services: docker-compose restart
    echo.
) else (
    :skip_tailscale
    echo Skipping Tailscale setup.
    echo.
)

REM Step 5: Summary
echo [5/5] Deployment Summary
echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Your application is now running:
echo.
echo Local Access:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8787
echo.

if /i "%setup_tailscale%"=="y" (
    echo Remote Access (Tailscale):
    echo   Run: tailscale status
    echo   To get your HTTPS URL
    echo.
)

echo Useful Commands:
echo   View logs:        docker-compose logs -f
echo   Restart:          docker-compose restart
echo   Stop:             docker-compose down
echo   Rebuild:          docker-compose up -d --build
echo.

if /i "%setup_tailscale%"=="y" (
    echo Tailscale Commands:
    echo   Status:           tailscale status
    echo   Serve config:     tailscale serve status
    echo   Stop serving:     tailscale serve reset
    echo.
)

echo Documentation:
echo   Docker:           DOCKER_DEPLOYMENT.md
echo   Tailscale:        TAILSCALE_SETUP.md
echo   API Docs:         docs/api_documentation.md
echo.
echo ========================================
echo.

REM Open browser to application
set /p open_browser="Open application in browser? (y/n): "
if /i "%open_browser%"=="y" (
    start http://localhost:3000
)

echo.
echo Setup complete! Enjoy your S3 storage system!
echo.
pause
