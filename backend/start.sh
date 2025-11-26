#!/bin/sh
set -e

echo "========================================="
echo "  Backend Startup with Tailscale Funnel"
echo "========================================="

# Create necessary directories
mkdir -p /var/run/tailscale
mkdir -p /var/lib/tailscale
mkdir -p /shared

echo "[1/5] Starting Tailscale daemon..."
tailscaled --state=/var/lib/tailscale/tailscaled.state --socket=/var/run/tailscale/tailscaled.sock &
TAILSCALED_PID=$!

echo "[2/5] Waiting for Tailscale daemon to initialize..."
sleep 5

# Check if TS_AUTHKEY is set
if [ -z "$TS_AUTHKEY" ]; then
    echo "ERROR: TS_AUTHKEY environment variable is not set!"
    echo "Please set it in your .env file"
    exit 1
fi

echo "[3/5] Authenticating with Tailscale..."
tailscale up --authkey="$TS_AUTHKEY" --hostname=v2capsule-backend --accept-routes --reset

echo "[4/5] Configuring Tailscale Funnel for public access..."
tailscale funnel --bg --https=443 http://127.0.0.1:8787

echo "[5/5] Extracting public URL..."
# Wait a moment for funnel to be fully configured
sleep 3

# Extract the public URL and save it
BACKEND_URL=$(tailscale funnel status 2>/dev/null | grep -oP 'https://[^[:space:]]+' | head -1)

if [ -n "$BACKEND_URL" ]; then
    echo "$BACKEND_URL" > /shared/backend-url.txt
    echo "✅ Backend URL: $BACKEND_URL"
    echo "   Saved to /shared/backend-url.txt"
else
    echo "⚠️  Warning: Could not extract Tailscale Funnel URL"
    echo "   Backend will still start, but public access may not be configured"
fi

echo ""
echo "========================================="
echo "  Starting Backend Application"
echo "========================================="

# Run database migrations
echo "Running database migrations..."
npm run db:migrate

# Start the backend server
echo "Starting server on port 8787..."
exec tsx src/index.ts
