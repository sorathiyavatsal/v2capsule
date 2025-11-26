#!/bin/sh
mkdir -p /var/run/tailscale
mkdir -p /var/lib/tailscale

# Start tailscaled in the background
tailscaled --state=/var/lib/tailscale/tailscaled.state --socket=/var/run/tailscale/tailscaled.sock &

echo "Waiting for tailscaled to initialize..."
sleep 5

echo "Starting Backend..."
exec sh -c "npm run db:migrate && tsx src/index.ts"
