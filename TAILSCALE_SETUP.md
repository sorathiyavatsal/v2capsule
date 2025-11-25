# Tailscale Domain Setup Guide

## Overview

Tailscale provides secure, zero-configuration networking with automatic HTTPS and custom domains. This guide shows how to expose your CineMax S3 Storage application using Tailscale.

## Why Tailscale?

✅ **Automatic HTTPS** - Free SSL certificates via Let's Encrypt
✅ **Custom Domains** - Use your own domain or Tailscale's subdomain
✅ **Zero Configuration** - No port forwarding or firewall rules
✅ **Secure** - WireGuard-based encrypted tunnel
✅ **Easy Access Control** - Built-in authentication and ACLs
✅ **Works Anywhere** - Behind NAT, firewalls, or CGNAT

## Prerequisites

1. Tailscale account (free tier available)
2. Your application running via Docker
3. (Optional) Custom domain with DNS access

## Quick Setup

### Step 1: Install Tailscale

**Windows:**
```powershell
# Download and install from https://tailscale.com/download/windows
# Or use winget
winget install tailscale.tailscale
```

**Linux:**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

**macOS:**
```bash
brew install tailscale
```

### Step 2: Authenticate

```bash
# Start Tailscale and authenticate
tailscale up

# Enable HTTPS (MagicDNS + HTTPS certificates)
tailscale up --accept-dns
```

This will open a browser for authentication.

### Step 3: Enable HTTPS in Tailscale Admin

1. Go to https://login.tailscale.com/admin/dns
2. Enable **MagicDNS**
3. Enable **HTTPS Certificates**

### Step 4: Serve Your Application

**Option A: Using Tailscale Serve (Recommended)**

```bash
# Serve frontend on HTTPS
tailscale serve https / http://localhost:3000

# Serve backend API on HTTPS
tailscale serve https /api http://localhost:8787
```

Your app will be available at:
- `https://your-machine-name.tail-scale-name.ts.net`

**Option B: Using Tailscale Funnel (Public Access)**

```bash
# Make it publicly accessible (no Tailscale required for visitors)
tailscale funnel 443 on
tailscale serve https / http://localhost:3000
tailscale serve https /api http://localhost:8787
```

Your app will be publicly accessible at:
- `https://your-machine-name.tail-scale-name.ts.net`

## Custom Domain Setup

### Step 1: Add Custom Domain in Tailscale

1. Go to https://login.tailscale.com/admin/dns
2. Click **Add custom domain**
3. Enter your domain (e.g., `storage.yourdomain.com`)
4. Follow DNS verification steps

### Step 2: Update DNS Records

Add these records to your domain's DNS:

```
Type: CNAME
Name: storage (or your subdomain)
Value: your-machine-name.tail-scale-name.ts.net
```

### Step 3: Update Environment Variables

Update your `.env` file:

```bash
# Frontend Configuration
NEXT_PUBLIC_API_URL=https://storage.yourdomain.com/api
CORS_ORIGIN=https://storage.yourdomain.com

# Or for Tailscale subdomain
NEXT_PUBLIC_API_URL=https://your-machine.tail-name.ts.net/api
CORS_ORIGIN=https://your-machine.tail-name.ts.net
```

### Step 4: Restart Services

```bash
docker-compose down
docker-compose up -d --build
```

## Nginx Reverse Proxy (Alternative)

If you prefer using Nginx with Tailscale:

### 1. Create Nginx Configuration

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=5r/s;

    # Upstream servers
    upstream backend {
        server backend:8787;
    }

    upstream frontend {
        server frontend:3000;
    }

    server {
        listen 80;
        server_name _;

        # Increase timeouts for large uploads
        client_max_body_size 10G;
        client_body_timeout 300s;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Backend API
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            
            rewrite ^/api/(.*) /$1 break;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # CORS headers
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            
            if ($request_method = 'OPTIONS') {
                return 204;
            }
        }

        # S3 API (direct access)
        location ~ ^/[^/]+/.*$ {
            limit_req zone=upload_limit burst=10 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Disable buffering for large uploads
            proxy_request_buffering off;
            proxy_buffering off;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### 2. Update docker-compose.yml

Add Nginx service:

```yaml
  nginx:
    image: nginx:alpine
    container_name: cinemax-nginx
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
      - frontend
    networks:
      - cinemax-network
```

### 3. Use Tailscale with Nginx

```bash
# Serve Nginx on Tailscale
tailscale serve https / http://localhost:80
```

## Access Control

### Restrict Access to Specific Users

```bash
# Only allow specific Tailscale users
tailscale serve --set-path /api --allow-user user@example.com http://localhost:8787
```

### Use Tailscale ACLs

Edit ACLs at https://login.tailscale.com/admin/acls:

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["group:admins"],
      "dst": ["tag:storage:*"]
    }
  ],
  "tagOwners": {
    "tag:storage": ["user@example.com"]
  }
}
```

## Monitoring & Logs

### View Tailscale Status

```bash
# Check connection status
tailscale status

# View serve configuration
tailscale serve status

# View logs
tailscale debug logs
```

### Monitor Application

```bash
# View Docker logs
docker-compose logs -f

# View specific service
docker-compose logs -f nginx
docker-compose logs -f backend
```

## Troubleshooting

### Issue: Can't access application

**Solution:**
```bash
# Check Tailscale status
tailscale status

# Verify serve configuration
tailscale serve status

# Check if services are running
docker-compose ps

# Check firewall (Windows)
netsh advfirewall firewall show rule name=all | findstr 3000
netsh advfirewall firewall show rule name=all | findstr 8787
```

### Issue: CORS errors

**Solution:**
Update `.env`:
```bash
CORS_ORIGIN=https://your-machine.tail-name.ts.net
```

Restart:
```bash
docker-compose restart backend
```

### Issue: SSL certificate errors

**Solution:**
```bash
# Ensure HTTPS is enabled
tailscale up --accept-dns

# Verify in Tailscale admin
# https://login.tailscale.com/admin/dns
# Check that "HTTPS Certificates" is enabled
```

### Issue: Upload fails for large files

**Solution:**
If using Nginx, increase limits in `nginx.conf`:
```nginx
client_max_body_size 10G;
client_body_timeout 600s;
```

## Production Deployment Checklist

- [ ] Tailscale installed and authenticated
- [ ] MagicDNS enabled
- [ ] HTTPS certificates enabled
- [ ] Custom domain configured (if using)
- [ ] Environment variables updated
- [ ] CORS_ORIGIN set correctly
- [ ] Services restarted
- [ ] Test upload/download functionality
- [ ] Test from different devices
- [ ] Monitor logs for errors
- [ ] Set up access controls (if needed)
- [ ] Document the setup for team

## Benefits Summary

**Tailscale Serve:**
- ✅ Private access (Tailscale network only)
- ✅ Automatic HTTPS
- ✅ Zero configuration
- ✅ Perfect for team/personal use

**Tailscale Funnel:**
- ✅ Public access (anyone can access)
- ✅ Automatic HTTPS
- ✅ No Tailscale required for visitors
- ✅ Perfect for sharing with clients

**With Custom Domain:**
- ✅ Professional appearance
- ✅ Easy to remember
- ✅ Brand consistency
- ✅ SSL included

## Alternative: Cloudflare Tunnel

If you prefer Cloudflare over Tailscale:

```bash
# Install cloudflared
# Windows: Download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create cinemax-storage

# Configure tunnel
cloudflared tunnel route dns cinemax-storage storage.yourdomain.com

# Run tunnel
cloudflared tunnel run cinemax-storage
```

## Comparison

| Feature | Tailscale | Cloudflare Tunnel | Traditional VPS |
|---------|-----------|-------------------|-----------------|
| Setup Time | 5 minutes | 10 minutes | 1-2 hours |
| Cost | Free tier | Free | $5-20/month |
| HTTPS | Automatic | Automatic | Manual (Let's Encrypt) |
| Access Control | Built-in | Via Cloudflare | Manual (firewall) |
| Performance | Peer-to-peer | Via Cloudflare edge | Direct |
| Best For | Private/team | Public apps | High traffic |

## Recommended Setup

**For Personal/Team Use:**
```bash
tailscale serve https / http://localhost:3000
tailscale serve https /api http://localhost:8787
```

**For Public Access:**
```bash
tailscale funnel 443 on
tailscale serve https / http://localhost:3000
tailscale serve https /api http://localhost:8787
```

**For Production with Custom Domain:**
1. Set up custom domain in Tailscale
2. Use Nginx reverse proxy
3. Configure proper CORS and security headers
4. Set up monitoring and backups

---

## Next Steps

1. Install Tailscale
2. Enable HTTPS in admin panel
3. Run `tailscale serve` commands
4. Update `.env` with your Tailscale URL
5. Test the application
6. (Optional) Set up custom domain
7. Share access with your team

Your application will be securely accessible from anywhere with automatic HTTPS! 🚀
