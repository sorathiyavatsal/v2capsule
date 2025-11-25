@echo off
REM Quick deployment script for Docker on Windows

echo.
echo ========================================
echo CineMax S3 Storage - Docker Deployment
echo ========================================
echo.

REM Check if .env exists
if not exist .env (
    echo WARNING: .env file not found!
    echo Copying .env.example to .env...
    copy .env.example .env
    echo Created .env file
    echo.
    echo IMPORTANT: Please edit .env and update the following:
    echo    - POSTGRES_PASSWORD
    echo    - JWT_SECRET
    echo    - ENCRYPTION_MASTER_KEY
    echo.
    pause
)

echo Building and starting services...
docker-compose up -d --build

echo.
echo Waiting for services to be healthy...
timeout /t 10 /nobreak > nul

echo.
echo Service Status:
docker-compose ps

echo.
echo Deployment complete!
echo.
echo Access the application:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:8787
echo.
echo Useful commands:
echo    View logs:    docker-compose logs -f
echo    Stop:         docker-compose down
echo    Restart:      docker-compose restart
echo.
pause
