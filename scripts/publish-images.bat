@echo off
echo ========================================
echo CineMax S3 Storage - Publish Images
echo ========================================

set NAMESPACE=cinemax
set VERSION=latest

echo.
echo [1/4] Logging in to Docker Hub...
docker login
if %errorlevel% neq 0 (
    echo Error: Docker login failed.
    pause
    exit /b 1
)

echo.
echo [2/4] Building Images...
docker build -t %NAMESPACE%/v2capsule-backend:%VERSION% ./backend
docker build -t %NAMESPACE%/v2capsule-frontend:%VERSION% ./frontend

echo.
echo [3/4] Pushing Images...
docker push %NAMESPACE%/v2capsule-backend:%VERSION%
docker push %NAMESPACE%/v2capsule-frontend:%VERSION%

echo.
echo [4/4] Done!
echo.
echo Images published:
echo - %NAMESPACE%/v2capsule-backend:%VERSION%
echo - %NAMESPACE%/v2capsule-frontend:%VERSION%
echo.
pause
