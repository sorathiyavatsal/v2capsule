# CineMax S3 Storage - Quick Start Guide

## 📋 Prerequisites

```bash
# 1. Clone the repository
git clone https://github.com/sorathiyavatsal/v2capsule.git
cd v2capsule

# 2. Configure environment
cp .env.example .env
# Edit .env and set TS_AUTHKEY from https://login.tailscale.com/admin/settings/keys
```

## 🚀 Deploy

```bash
docker-compose up -d
```

## 📡 View Your Public URLs

```bash
# Backend
docker-compose logs backend | grep "Backend URL"

# Frontend
docker-compose logs frontend | grep "Frontend URL"
```

## What It Does

The deployment automatically:

1. ✅ **Builds Docker Images**
   - Backend API server
   - Frontend web application
   - PostgreSQL database

2. ✅ **Configures Tailscale Funnel**
   - Authenticates with your Tailscale account
   - Sets up public HTTPS URLs
   - Configures CORS automatically

3. ✅ **Starts All Services**
   - Database with health checks
   - Backend with automatic migrations
   - Frontend with proper API configuration

## Access Your Application

**Public (Tailscale Funnel):**
- Check logs for your HTTPS URLs

**Local:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8787

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
```

## Troubleshooting

**Docker not starting?**
```bash
# Check Docker is running
docker ps

# View logs
docker-compose logs
```

**Can't see Tailscale URLs?**
```bash
# Check backend logs
docker-compose logs backend

# Check frontend logs
docker-compose logs frontend
```

## Next Steps

1. Create your first bucket
2. Upload files
3. Configure bucket policies
4. Set up event notifications
5. Share access with your team

## Documentation

- [Docker Deployment](DOCKER_DEPLOYMENT.md) - Complete Docker guide
- [Tailscale Funnel Setup](TAILSCALE_FUNNEL_SETUP.md) - Tailscale configuration
- [API Documentation](../api_documentation.md) - API reference

---

**That's it! Your S3 storage system is ready to use!** 🎉
