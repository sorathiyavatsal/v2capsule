# CineMax S3 Storage - Quick Start Guide

## � Prerequisites

```bash
# 1. Clone the repository
git clone https://gitlab.com/username/cinemax-s3-storage.git
cd cinemax-s3-storage

# 2. Configure environment
copy .env.example .env
```

## �🚀 One-Click Deployment

### Option 1: Build from Source
```bash
# Windows
deploy-complete.bat
```

### Option 2: Use Pre-Built Images (Faster)
```bash
# Windows
docker-compose -f docker-compose.prod.yml up -d
```

## What It Does

The complete deployment script automatically:

1. ✅ **Checks Prerequisites**
   - Verifies Docker is installed
   - Verifies Docker Compose is installed

2. ✅ **Sets Up Environment**
   - Creates `.env` from template
   - Prompts you to update secrets

3. ✅ **Deploys with Docker**
   - Builds all containers
   - Starts PostgreSQL, Backend, Frontend
   - Waits for services to be healthy

4. ✅ **Configures Tailscale** (Optional)
   - Installs Tailscale if needed
   - Authenticates your device
   - Sets up HTTPS access
   - Provides your secure URL

5. ✅ **Opens Application**
   - Launches browser to your app
   - Shows all useful commands

## Manual Steps

### 1. Docker Only
```bash
# Windows
deploy.bat

# Linux/Mac
./deploy.sh
```

### 2. Tailscale Only
```bash
# Windows
setup-tailscale.bat

# Linux/Mac
./setup-tailscale.sh
```

## Access Your Application

**Local:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8787

**Remote (with Tailscale):**
- HTTPS: https://your-machine.tail-name.ts.net

## Quick Commands

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop everything
docker-compose down

# Rebuild after changes
docker-compose up -d --build

# Check Tailscale status
tailscale status

# View Tailscale serve config
tailscale serve status
```

## Troubleshooting

**Docker not starting?**
```bash
# Check Docker is running
docker ps

# View logs
docker-compose logs
```

**Can't access Tailscale URL?**
```bash
# Check Tailscale status
tailscale status

# Verify serve configuration
tailscale serve status

# Restart Tailscale
tailscale down
tailscale up --accept-dns
```

**CORS errors?**
- Update `.env` with your Tailscale URL
- Restart: `docker-compose restart backend`

## Next Steps

1. Create your first bucket
2. Upload files
3. Configure bucket policies
4. Set up event notifications
5. Share access with your team

## Documentation

- [Docker Deployment](DOCKER_DEPLOYMENT.md) - Complete Docker guide
- [Tailscale Setup](TAILSCALE_SETUP.md) - Tailscale configuration
- [API Documentation](docs/api_documentation.md) - API reference
- [Testing Plan](docs/testing_plan.md) - Feature testing

---

**That's it! Your S3 storage system is ready to use!** 🎉
