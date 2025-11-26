#!/bin/sh
set -e

echo "========================================="
echo "  Frontend Startup with Tailscale Funnel"
echo "========================================="

# Create necessary directories
mkdir -p /var/run/tailscale
mkdir -p /var/lib/tailscale
mkdir -p /shared

echo "[1/6] Starting Tailscale daemon..."
tailscaled --state=/var/lib/tailscale/tailscaled.state --socket=/var/run/tailscale/tailscaled.sock &
TAILSCALED_PID=$!

echo "[2/6] Waiting for Tailscale daemon to initialize..."
sleep 5

# Check if TS_AUTHKEY is set
if [ -z "$TS_AUTHKEY" ]; then
    echo "ERROR: TS_AUTHKEY environment variable is not set!"
    echo "Please set it in your .env file"
    exit 1
fi

echo "[3/6] Waiting for backend URL..."
# Wait for backend to save its URL (max 60 seconds)
WAIT_COUNT=0
while [ ! -f /shared/backend-url.txt ] && [ $WAIT_COUNT -lt 60 ]; do
    echo "   Waiting for backend to configure Tailscale Funnel... ($WAIT_COUNT/60)"
    sleep 2
    WAIT_COUNT=$((WAIT_COUNT + 2))
done

if [ -f /shared/backend-url.txt ]; then
    BACKEND_URL=$(cat /shared/backend-url.txt)
    echo "✅ Backend URL found: $BACKEND_URL"
    export NEXT_PUBLIC_API_URL="$BACKEND_URL"
else
    echo "⚠️  Warning: Backend URL not found, using default"
    echo "   Frontend may not be able to communicate with backend"
fi

echo "[4/6] Authenticating with Tailscale..."
tailscale up --authkey="$TS_AUTHKEY" --hostname=v2capsule-frontend --accept-routes --reset

echo "[5/6] Configuring Tailscale Funnel for public access..."
tailscale funnel --bg --https=443 http://127.0.0.1:3000

echo "[6/6] Extracting public URL..."
# Wait a moment for funnel to be fully configured
sleep 3

# Extract the public URL and save it
FRONTEND_URL=$(tailscale funnel status 2>/dev/null | grep -oP 'https://[^[:space:]]+' | head -1)

if [ -n "$FRONTEND_URL" ]; then
    echo "$FRONTEND_URL" > /shared/frontend-url.txt
    echo "✅ Frontend URL: $FRONTEND_URL"
    echo "   Saved to /shared/frontend-url.txt"
    
    # Also save to a file that backend can read for CORS
    echo "$FRONTEND_URL" > /shared/cors-origin.txt
else
    echo "⚠️  Warning: Could not extract Tailscale Funnel URL"
    echo "   Frontend will still start, but public access may not be configured"
fi

echo ""
echo "========================================="
echo "  Starting Frontend Application"
echo "========================================="
echo "API URL: ${NEXT_PUBLIC_API_URL}"
echo ""

# Start Next.js
exec npm start
