@echo off
REM Cleanup and Git Consolidation Script

echo.
echo ========================================
echo CineMax S3 Storage - Cleanup Script
echo ========================================
echo.

echo [1/5] Removing nested Git repositories...
echo.

REM Remove frontend .git if exists
if exist "frontend\.git\" (
    echo Removing frontend\.git...
    rmdir /s /q "frontend\.git"
    echo Frontend Git removed
) else (
    echo Frontend .git not found (OK)
)

REM Remove backend .git if exists
if exist "backend\.git\" (
    echo Removing backend\.git...
    rmdir /s /q "backend\.git"
    echo Backend Git removed
) else (
    echo Backend .git not found (OK)
)

echo.
echo [2/5] Cleaning build artifacts...
echo.

REM Clean backend
if exist "backend\dist\" rmdir /s /q "backend\dist"
if exist "backend\node_modules\" rmdir /s /q "backend\node_modules"

REM Clean frontend
if exist "frontend\.next\" rmdir /s /q "frontend\.next"
if exist "frontend\out\" rmdir /s /q "frontend\out"
if exist "frontend\node_modules\" rmdir /s /q "frontend\node_modules"

REM Clean root
if exist "node_modules\" rmdir /s /q "node_modules"

echo Build artifacts cleaned

echo.
echo [3/5] Removing unnecessary files...
echo.

REM Remove lock files (will be regenerated)
if exist "backend\package-lock.json" del /q "backend\package-lock.json"
if exist "frontend\package-lock.json" del /q "frontend\package-lock.json"
if exist "package-lock.json" del /q "package-lock.json"

REM Remove logs
if exist "*.log" del /q "*.log"
if exist "backend\*.log" del /q "backend\*.log"
if exist "frontend\*.log" del /q "frontend\*.log"

REM Remove temp files
if exist "*.tmp" del /q "*.tmp"
if exist "*.old" del /q "*.old"
if exist "*.backup" del /q "*.backup"

echo Unnecessary files removed

echo.
echo [4/5] Cleaning Docker...
echo.

REM Stop all containers
docker-compose down 2>nul

REM Remove dangling images
docker image prune -f 2>nul

echo Docker cleaned

echo.
echo [5/5] Initializing Git repository...
echo.

REM Check if .git exists at root
if not exist ".git\" (
    echo Initializing new Git repository...
    git init
    echo Git repository initialized
) else (
    echo Git repository already exists
)

REM Add .gitignore if not tracked
git add .gitignore 2>nul

echo.
echo ========================================
echo Cleanup Complete!
echo ========================================
echo.
echo Next steps:
echo.
echo 1. Review .gitignore file
echo 2. Add files to Git:
echo    git add .
echo.
echo 3. Create initial commit:
echo    git commit -m "Initial commit - CineMax S3 Storage"
echo.
echo 4. Add remote repository:
echo    git remote add origin https://github.com/yourusername/cinemax-storage.git
echo.
echo 5. Push to remote:
echo    git push -u origin main
echo.
echo ========================================
echo.

pause
