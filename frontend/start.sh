#!/bin/sh
mkdir -p /var/run/tailscale
mkdir -p /var/lib/tailscale

# Start tailscaled in the background
# We use --tun=userspace-networking if /dev/net/tun is missing, but we mapped it so it should be fine.
# However, to be safe and robust, userspace networking is often easier in containers.
# But for Funnel, we might need tun. Let's try default first.
tailscaled --state=/var/lib/tailscale/tailscaled.state --socket=/var/run/tailscale/tailscaled.sock &

echo "Waiting for tailscaled to initialize..."
sleep 5

echo "Starting Frontend..."
exec npm start
