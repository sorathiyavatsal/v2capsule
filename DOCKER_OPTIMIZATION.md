# Docker Build Optimization Guide

## Problem: Slow Build Times

If you're experiencing very slow Docker builds (10+ minutes), it's likely due to:

1. **Slow network to Alpine repositories** - Downloading packages takes forever
2. **Slow network to npm registry** - Installing node packages is slow
3. **No caching** - Rebuilding everything from scratch

## Solutions Applied

### 1. Faster Alpine Mirror
```dockerfile
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
```
- Uses Alibaba Cloud mirror (faster in most regions)
- Alternative mirrors:
  - `mirrors.ustc.edu.cn` (China)
  - `dl-cdn.alpinelinux.org` (Default - slower)
  - `uk.alpinelinux.org` (UK)

### 2. npm Optimizations
```dockerfile
npm ci --prefer-offline --no-audit
```
- `--prefer-offline`: Uses cache when possible
- `--no-audit`: Skips security audit (faster)

### 3. Combined RUN Commands
```dockerfile
RUN sed -i 's/...' && apk add --no-cache wget
```
- Reduces layers
- Faster execution

### 4. Enable BuildKit
```bash
# Windows PowerShell
$env:DOCKER_BUILDKIT=1

# Linux/Mac
export DOCKER_BUILDKIT=1
```

## Alternative: Use Different Base Image

If still slow, try using a different base image:

### Option 1: Use Debian-based Node
```dockerfile
FROM node:18-slim AS builder
# Faster apt mirrors, more compatible
```

### Option 2: Pre-built Image
Build once, push to Docker Hub, pull on other machines.

## Expected Build Times

| Optimization Level | First Build | Rebuild |
|-------------------|-------------|---------|
| **No optimization** | 15-20 min | 15-20 min |
| **With mirrors** | 3-5 min | 1-2 min |
| **With cache** | 2-3 min | 30 sec |
| **Full optimization** | 2-3 min | 20-30 sec |

## Quick Fix Commands

### Clear Docker cache and rebuild
```bash
docker system prune -a
docker-compose build --no-cache
```

### Use specific npm registry
```bash
# Add to Dockerfile before npm ci
RUN npm config set registry https://registry.npmmirror.com
```

### Check your network speed
```bash
# Test Alpine mirror
docker run --rm alpine sh -c "apk update && apk add wget"

# Test npm registry
docker run --rm node:18-alpine sh -c "npm install express"
```

## Troubleshooting

**Still slow after changes?**
1. Check your internet connection
2. Try different Alpine mirror
3. Use VPN if in restricted region
4. Consider using Debian base image instead

**Build fails?**
1. Clear Docker cache: `docker system prune -a`
2. Rebuild: `docker-compose build --no-cache`
3. Check Docker Desktop has enough resources (4GB+ RAM)

## Current Optimizations

✅ Faster Alpine mirrors (Alibaba Cloud)
✅ npm cache mounts
✅ `--prefer-offline` flag
✅ `--no-audit` flag
✅ Combined RUN commands
✅ Proper layer caching

Your builds should now be **5-10x faster**!
