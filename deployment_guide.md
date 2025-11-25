# Deployment Guide

This guide outlines the steps to deploy the S3-compatible storage system to a production environment.

## Prerequisites

- **Node.js**: v18 or higher
- **PostgreSQL**: v14 or higher
- **Redis** (Optional, for caching/queues if implemented)
- **Nginx** (Recommended for reverse proxy)

## Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# Server Configuration
PORT=8787
NODE_ENV=production

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/cinemax_storage

# Storage Configuration
STORAGE_ROOT=/mnt/storage_data
# Ensure this directory exists and is writable by the node process

# Security
JWT_SECRET=your-secure-random-secret-key
ENCRYPTION_MASTER_KEY=your-32-byte-hex-master-key

# CORS
CORS_ORIGIN=https://your-frontend-domain.com
```

## Installation & Build

### Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install --production
   ```

3. Run database migrations:
   ```bash
   npm run db:migrate
   ```

4. Build the project (if using TypeScript):
   ```bash
   npm run build
   ```

### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the Next.js application:
   ```bash
   npm run build
   ```

## Production Startup

### Using PM2 (Recommended)

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Start the backend:
   ```bash
   cd backend
   pm2 start dist/index.js --name "storage-backend"
   ```

3. Start the frontend:
   ```bash
   cd frontend
   pm2 start npm --name "storage-frontend" -- start
   ```

4. Save PM2 list to resurrect on reboot:
   ```bash
   pm2 save
   pm2 startup
   ```

### Using Docker (Alternative)

*Dockerfile creation is recommended for containerized deployment.*

## Nginx Configuration (Example)

```nginx
server {
    listen 80;
    server_name storage.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000; # Frontend
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:8787/; # Backend
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Maintenance

- **Backups**: Regularly backup the PostgreSQL database and the `STORAGE_ROOT` directory.
- **Logs**: Monitor PM2 logs (`pm2 logs`) or configure a logging service.
- **Updates**: Pull latest code, install dependencies, run migrations, rebuild, and restart PM2 processes.
