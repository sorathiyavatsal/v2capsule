#!/bin/bash
# ========================================
# CineMax S3 Storage - Complete Deployment
# One-Click Setup Script
# ========================================

set -e  # Exit on error

echo ""
echo "========================================"
echo "CineMax S3 Storage - Complete Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo "[1/5] Checking prerequisites..."
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}ERROR: Docker is not installed!${NC}"
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}ERROR: Docker Compose is not installed!${NC}"
    echo "Please install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker: OK${NC}"
echo -e "${GREEN}✓ Docker Compose: OK${NC}"
echo ""

# Step 2: Setup environment
echo "[2/5] Setting up environment..."
echo ""

if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo -e "${YELLOW}IMPORTANT: Please update these values in .env:${NC}"
    echo "  - DATABASE_URL (change password)"
    echo "  - JWT_SECRET (generate random string)"
    echo "  - ENCRYPTION_MASTER_KEY (64-char hex string)"
    echo ""
    read -p "Press Enter after updating .env to continue..."
fi

echo -e "${GREEN}✓ Environment: OK${NC}"
echo ""

# Step 3: Deploy with Docker
echo "[3/5] Deploying application with Docker..."
echo ""

echo "Building and starting services..."
docker-compose up -d --build

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Docker deployment failed!${NC}"
    echo "Check the logs with: docker-compose logs"
    exit 1
fi

echo ""
echo "Waiting for services to be healthy..."
sleep 15

echo ""
echo "Service Status:"
docker-compose ps

echo ""
echo -e "${GREEN}✓ Docker Deployment: OK${NC}"
echo ""

# Step 4: Tailscale Setup (Optional)
echo "[4/5] Tailscale Setup (Optional)"
echo ""
read -p "Do you want to set up Tailscale for remote access? (y/n): " setup_tailscale

if [[ "$setup_tailscale" =~ ^[Yy]$ ]]; then
    echo ""
    echo "Checking Tailscale installation..."
    
    if ! command -v tailscale &> /dev/null; then
        echo "Tailscale is not installed!"
        echo ""
        read -p "Install Tailscale now? (y/n): " install_ts
        
        if [[ "$install_ts" =~ ^[Yy]$ ]]; then
            echo "Installing Tailscale..."
            curl -fsSL https://tailscale.com/install.sh | sh
        else
            echo "Skipping Tailscale setup. You can run setup-tailscale.sh later."
            setup_tailscale="n"
        fi
    fi
    
    if [[ "$setup_tailscale" =~ ^[Yy]$ ]]; then
        # Authenticate Tailscale
        if ! tailscale status &> /dev/null; then
            echo "Authenticating with Tailscale..."
            sudo tailscale up --accept-dns
        fi
        
        echo ""
        echo "Select Tailscale deployment type:"
        echo "1) Private (Tailscale network only)"
        echo "2) Public (Funnel - accessible to anyone)"
        echo ""
        read -p "Enter choice [1-2]: " ts_choice
        
        case $ts_choice in
            1)
                echo ""
                echo "Setting up private Tailscale access..."
                sudo tailscale serve https / http://localhost:3000
                sudo tailscale serve https /api http://localhost:8787
                echo -e "${GREEN}✓ Private Tailscale access configured!${NC}"
                ;;
            2)
                echo ""
                echo "Setting up public Tailscale access..."
                sudo tailscale funnel 443 on
                sudo tailscale serve https / http://localhost:3000
                sudo tailscale serve https /api http://localhost:8787
                echo -e "${GREEN}✓ Public Tailscale access configured!${NC}"
                ;;
        esac
        
        echo ""
        echo "Getting your Tailscale URL..."
        tailscale status --self
        
        echo ""
        echo -e "${GREEN}✓ Tailscale Setup: OK${NC}"
        echo ""
        echo -e "${YELLOW}IMPORTANT: Update your .env file with your Tailscale URL:${NC}"
        echo "  NEXT_PUBLIC_API_URL=https://your-machine.tail-name.ts.net/api"
        echo "  CORS_ORIGIN=https://your-machine.tail-name.ts.net"
        echo ""
        echo "Then restart services: docker-compose restart"
        echo ""
    fi
else
    echo "Skipping Tailscale setup."
    echo ""
fi

# Step 5: Summary
echo "[5/5] Deployment Summary"
echo ""
echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo ""
echo "Your application is now running:"
echo ""
echo -e "${GREEN}Local Access:${NC}"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8787"
echo ""

if [[ "$setup_tailscale" =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Remote Access (Tailscale):${NC}"
    echo "  Run: tailscale status"
    echo "  To get your HTTPS URL"
    echo ""
fi

echo -e "${YELLOW}Useful Commands:${NC}"
echo "  View logs:        docker-compose logs -f"
echo "  Restart:          docker-compose restart"
echo "  Stop:             docker-compose down"
echo "  Rebuild:          docker-compose up -d --build"
echo ""

if [[ "$setup_tailscale" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Tailscale Commands:${NC}"
    echo "  Status:           tailscale status"
    echo "  Serve config:     tailscale serve status"
    echo "  Stop serving:     tailscale serve reset"
    echo ""
fi

echo -e "${YELLOW}Documentation:${NC}"
echo "  Docker:           DOCKER_DEPLOYMENT.md"
echo "  Tailscale:        TAILSCALE_SETUP.md"
echo "  API Docs:         docs/api_documentation.md"
echo ""
echo "========================================"
echo ""

# Open browser to application
read -p "Open application in browser? (y/n): " open_browser
if [[ "$open_browser" =~ ^[Yy]$ ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:3000
    elif command -v open &> /dev/null; then
        open http://localhost:3000
    else
        echo "Please open http://localhost:3000 in your browser"
    fi
fi

echo ""
echo -e "${GREEN}Setup complete! Enjoy your S3 storage system!${NC}"
echo ""
