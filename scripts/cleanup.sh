#!/bin/bash
# Cleanup and Git Consolidation Script

echo ""
echo "========================================"
echo "CineMax S3 Storage - Cleanup Script"
echo "========================================"
echo ""

echo "[1/5] Removing nested Git repositories..."
echo ""

# Remove frontend .git if exists
if [ -d "frontend/.git" ]; then
    echo "Removing frontend/.git..."
    rm -rf "frontend/.git"
    echo "Frontend Git removed"
else
    echo "Frontend .git not found (OK)"
fi

# Remove backend .git if exists
if [ -d "backend/.git" ]; then
    echo "Removing backend/.git..."
    rm -rf "backend/.git"
    echo "Backend Git removed"
else
    echo "Backend .git not found (OK)"
fi

echo ""
echo "[2/5] Cleaning build artifacts..."
echo ""

# Clean backend
rm -rf backend/dist
rm -rf backend/node_modules

# Clean frontend
rm -rf frontend/.next
rm -rf frontend/out
rm -rf frontend/node_modules

# Clean root
rm -rf node_modules

echo "Build artifacts cleaned"

echo ""
echo "[3/5] Removing unnecessary files..."
echo ""

# Remove lock files (will be regenerated)
rm -f backend/package-lock.json
rm -f frontend/package-lock.json
rm -f package-lock.json

# Remove logs
rm -f *.log
rm -f backend/*.log
rm -f frontend/*.log

# Remove temp files
rm -f *.tmp
rm -f *.old
rm -f *.backup

echo "Unnecessary files removed"

echo ""
echo "[4/5] Cleaning Docker..."
echo ""

# Stop all containers
docker-compose down 2>/dev/null || true

# Remove dangling images
docker image prune -f 2>/dev/null || true

echo "Docker cleaned"

echo ""
echo "[5/5] Initializing Git repository..."
echo ""

# Check if .git exists at root
if [ ! -d ".git" ]; then
    echo "Initializing new Git repository..."
    git init
    echo "Git repository initialized"
else
    echo "Git repository already exists"
fi

# Add .gitignore if not tracked
git add .gitignore 2>/dev/null || true

echo ""
echo "========================================"
echo "Cleanup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Review .gitignore file"
echo "2. Add files to Git:"
echo "   git add ."
echo ""
echo "3. Create initial commit:"
echo "   git commit -m \"Initial commit - CineMax S3 Storage\""
echo ""
echo "4. Add remote repository:"
echo "   git remote add origin https://github.com/yourusername/cinemax-storage.git"
echo ""
echo "5. Push to remote:"
echo "   git push -u origin main"
echo ""
echo "========================================"
echo ""
