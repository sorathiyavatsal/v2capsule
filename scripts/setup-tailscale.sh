#!/bin/bash
# Tailscale deployment script

echo "🌐 CineMax S3 Storage - Tailscale Setup"
echo "========================================"
echo ""

# Check if Tailscale is installed
if ! command -v tailscale &> /dev/null; then
    echo "❌ Tailscale is not installed!"
    echo "📥 Installing Tailscale..."
    curl -fsSL https://tailscale.com/install.sh | sh
fi

# Check if Tailscale is running
if ! tailscale status &> /dev/null; then
    echo "🔐 Authenticating with Tailscale..."
    tailscale up --accept-dns
    echo "✅ Tailscale authenticated!"
fi

# Get machine name
MACHINE_NAME=$(tailscale status --json | grep -o '"HostName":"[^"]*"' | cut -d'"' -f4)
TAILNET=$(tailscale status --json | grep -o '"MagicDNSSuffix":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "📋 Your Tailscale Information:"
echo "   Machine: $MACHINE_NAME"
echo "   Tailnet: $TAILNET"
echo "   URL: https://$MACHINE_NAME.$TAILNET"
echo ""

# Ask user for deployment type
echo "Select deployment type:"
echo "1) Private (Tailscale network only)"
echo "2) Public (Funnel - accessible to anyone)"
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        echo "🔒 Setting up private access..."
        tailscale serve https / http://localhost:3000
        tailscale serve https /api http://localhost:8787
        echo "✅ Private access configured!"
        ;;
    2)
        echo "🌍 Setting up public access..."
        tailscale funnel 443 on
        tailscale serve https / http://localhost:3000
        tailscale serve https /api http://localhost:8787
        echo "✅ Public access configured!"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Tailscale setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update .env file:"
echo "   NEXT_PUBLIC_API_URL=https://$MACHINE_NAME.$TAILNET/api"
echo "   CORS_ORIGIN=https://$MACHINE_NAME.$TAILNET"
echo ""
echo "2. Restart services:"
echo "   docker-compose restart"
echo ""
echo "3. Access your application:"
echo "   https://$MACHINE_NAME.$TAILNET"
echo ""
