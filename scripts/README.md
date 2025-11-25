# Scripts Directory

This directory contains all deployment and utility scripts for the CineMax S3 Storage project.

## 📜 Available Scripts

### Deployment Scripts

#### `deploy-complete.bat` / `deploy-complete.sh`
**Complete one-click deployment** - Handles everything:
- Checks prerequisites (Docker, Docker Compose)
- Sets up environment variables
- Deploys with Docker
- Optionally configures Tailscale
- Opens application in browser

**Usage:**
```bash
# Windows
.\scripts\deploy-complete.bat

# Linux/Mac
chmod +x scripts/deploy-complete.sh
./scripts/deploy-complete.sh
```

---

#### `deploy.bat` / `deploy.sh`
**Docker-only deployment** - Simpler version:
- Creates .env from template
- Builds and starts Docker containers
- Shows service status

**Usage:**
```bash
# Windows
.\scripts\deploy.bat

# Linux/Mac
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

---

### Tailscale Scripts

#### `setup-tailscale.bat` / `setup-tailscale.sh`
**Tailscale configuration** - Sets up remote access:
- Installs Tailscale (if needed)
- Authenticates device
- Configures HTTPS serving
- Provides your secure URL

**Usage:**
```bash
# Windows
.\scripts\setup-tailscale.bat

# Linux/Mac
chmod +x scripts/setup-tailscale.sh
./scripts/setup-tailscale.sh
```

---

### Cleanup Scripts

#### `cleanup.bat` / `cleanup.sh`
**Project cleanup** - Prepares for Git monorepo:
- Removes nested Git repositories
- Cleans build artifacts
- Removes lock files
- Cleans Docker images
- Initializes single Git repo

**Usage:**
```bash
# Windows
.\scripts\cleanup.bat

# Linux/Mac
chmod +x scripts/cleanup.sh
./scripts/cleanup.sh
```

---

## 🔄 Typical Workflow

### First Time Setup
```bash
# 1. Run cleanup (if migrating from separate repos)
.\scripts\cleanup.bat

# 2. Deploy everything
.\scripts\deploy-complete.bat

# 3. (Optional) Set up Tailscale for remote access
.\scripts\setup-tailscale.bat
```

### Daily Development
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Restart after changes
docker-compose restart
```

### Redeployment
```bash
# Quick redeploy
.\scripts\deploy.bat

# Or full rebuild
docker-compose up -d --build
```

---

## 📝 Script Details

### Environment Variables
All scripts respect `.env` file settings. Create from template:
```bash
copy .env.example .env
```

### Prerequisites
- **Windows**: PowerShell or Command Prompt
- **Linux/Mac**: Bash shell
- **All**: Docker Desktop installed

### Permissions (Linux/Mac)
Make scripts executable:
```bash
chmod +x scripts/*.sh
```

---

## 🛠️ Troubleshooting

**Script won't run (Windows)**
- Run as Administrator
- Check execution policy: `Set-ExecutionPolicy RemoteSigned`

**Script won't run (Linux/Mac)**
- Make executable: `chmod +x scripts/script-name.sh`
- Check shebang: Should be `#!/bin/bash`

**Docker errors**
- Ensure Docker Desktop is running
- Check Docker daemon: `docker ps`
- Restart Docker Desktop

**Tailscale errors**
- Install Tailscale first
- Authenticate: `tailscale up`
- Check status: `tailscale status`

---

## 📚 Related Documentation

- [Quick Start Guide](../docs/QUICKSTART.md)
- [Docker Deployment](../docs/DOCKER_DEPLOYMENT.md)
- [Tailscale Setup](../docs/TAILSCALE_SETUP.md)

---

**Need help?** Check the main [README](../README.md) or documentation in `/docs`
