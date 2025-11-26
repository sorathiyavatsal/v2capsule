# CineMax S3 Storage - Docker Deployment

This guide explains how to deploy the entire CineMax S3 Storage system using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB RAM available
- At least 10GB disk space

## Quick Start

### 1. Clone and Navigate
```bash
```bash
git clone https://gitlab.com/movieworld/v2capsule.git
cd v2capsule
```
```

### 2. Configure Environment
```bash
# Copy the example environment file
copy .env.example .env

# Edit .env and update the values (especially passwords and secrets)
notepad .env
```

**Important**: Change these values in `.env`:
- `POSTGRES_PASSWORD` - Database password
- `JWT_SECRET` - Random secret for JWT tokens
- `ENCRYPTION_MASTER_KEY` - 64-character hex string for encryption

### 3. Deploy Everything
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
# Check status
docker-compose ps
```

### 4. Alternative: Use Pre-Built Images
If you don't want to build the images yourself, you can use our pre-built images from Docker Hub.

```bash
# Start using production compose file
docker-compose -f docker-compose.prod.yml up -d
```

That's it! The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8787
- **Database**: localhost:5432

## Services

The deployment includes three services:

1. **PostgreSQL** (`cinemax-postgres`)
   - Database for storing metadata
   - Persistent volume for data
   - Health checks enabled

2. **Backend** (`cinemax-backend`)
   - Hono API server
   - Handles S3 operations
   - Runs database migrations automatically

3. **Frontend** (`cinemax-frontend`)
   - Next.js web application
   - User interface for bucket management

## Management Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### Restart Services
```bash
docker-compose restart
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Rebuild After Code Changes
```bash
# Rebuild and restart
docker-compose up -d --build

# Rebuild specific service
docker-compose up -d --build backend
```

### Access Container Shell
```bash
# Backend
docker exec -it cinemax-backend sh

# Frontend
docker exec -it cinemax-frontend sh

# Database
docker exec -it cinemax-postgres psql -U user -d cinemax_storage
```

## Data Persistence

### Volumes
- **postgres_data**: Database files (persistent)
- **./storage_data**: Uploaded files (bind mount)

### Backup Database
```bash
docker exec cinemax-postgres pg_dump -U user cinemax_storage > backup.sql
```

### Restore Database
```bash
cat backup.sql | docker exec -i cinemax-postgres psql -U user -d cinemax_storage
```

## Production Deployment

### 1. Update Environment Variables
Edit `.env` with production values:
```env
POSTGRES_PASSWORD=strong-random-password
JWT_SECRET=your-random-jwt-secret
ENCRYPTION_MASTER_KEY=your-64-char-hex-key
CORS_ORIGIN=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 2. Use Production Ports (Optional)
```env
FRONTEND_PORT=80
BACKEND_PORT=8080
```

### 3. Deploy with SSL (Recommended)
Add Nginx reverse proxy with Let's Encrypt:
```bash
# Add nginx service to docker-compose.yml
# Configure SSL certificates
# Update CORS_ORIGIN and NEXT_PUBLIC_API_URL
```

## Troubleshooting

### Services Won't Start
```bash
# Check logs
docker-compose logs

# Check if ports are already in use
netstat -ano | findstr :3000
netstat -ano | findstr :8787
netstat -ano | findstr :5432
```

### Database Connection Issues
```bash
# Verify postgres is healthy
docker-compose ps

# Check database logs
docker-compose logs postgres

# Test connection
docker exec cinemax-postgres pg_isready -U user
```

### Backend Migrations Fail
```bash
# Run migrations manually
docker exec cinemax-backend npm run db:migrate

# Check migration files
docker exec cinemax-backend ls -la drizzle
```

### Reset Everything
```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove storage data (WARNING: deletes all uploaded files)
rmdir /s storage_data

# Start fresh
docker-compose up -d
```

## Health Checks

All services have health checks configured:

- **PostgreSQL**: `pg_isready` check every 10s
- **Backend**: HTTP check on `/health` every 30s
- **Frontend**: HTTP check on root every 30s

View health status:
```bash
docker-compose ps
```

## Performance Tips

1. **Increase Docker Resources**
   - Docker Desktop → Settings → Resources
   - Allocate at least 4GB RAM and 2 CPUs

2. **Use Volume Mounts for Development**
   - Uncomment volume mounts in docker-compose.yml
   - Enables hot-reload during development

3. **Production Optimization**
   - Use multi-stage builds (already configured)
   - Enable Docker BuildKit for faster builds
   - Consider using Docker Swarm or Kubernetes for scaling

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | user | Database username |
| `POSTGRES_PASSWORD` | password | Database password |
| `POSTGRES_DB` | cinemax_storage | Database name |
| `POSTGRES_PORT` | 5432 | Database port |
| `BACKEND_PORT` | 8787 | Backend API port |
| `FRONTEND_PORT` | 3000 | Frontend web port |
| `JWT_SECRET` | (required) | JWT signing secret |
| `ENCRYPTION_MASTER_KEY` | (required) | Master encryption key |
| `CORS_ORIGIN` | http://localhost:3000 | Allowed CORS origin |
| `NEXT_PUBLIC_API_URL` | http://localhost:8787 | Backend API URL |

## Next Steps

1. Access the frontend at http://localhost:3000
2. Create your first bucket
3. Upload files and test features
4. Configure bucket policies and CORS
5. Set up event notifications

For more information, see:
- [API Documentation](./api_documentation.md)
- [Deployment Guide](./deployment_guide.md)
- [Testing Plan](./docs/testing_plan.md)
