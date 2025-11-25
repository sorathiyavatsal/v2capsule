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
echo ========================================
echo.
echo Your application is now running:
echo.
echo Local Access:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8787
echo.

set /p setup_tailscale="Do you want to configure Tailscale (Docker) for remote access? (y/n): "
if /i "%setup_tailscale%"=="y" (
    echo Configuring Tailscale...
    call scripts\set-tailscale-env.bat
    echo Restarting services to apply new env variables...
    docker-compose restart
) else (
    echo Skipping Tailscale configuration.
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
