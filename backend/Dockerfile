# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install git
RUN apk add --no-cache git

# Clone the repository
RUN git clone https://gitlab.com/movieworld/v2capsule.git .

# Navigate to backend directory
WORKDIR /app/backend

# Install ALL dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm install --prefer-offline --no-audit

# Build TypeScript
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install git (needed for potential updates)
RUN apk add --no-cache git

# Clone the repository again for production
RUN git clone https://gitlab.com/movieworld/v2capsule.git .

WORKDIR /app/backend

# Install production dependencies with cache
RUN --mount=type=cache,target=/root/.npm \
    npm install --production --prefer-offline --no-audit

# Install Tailscale dependencies
RUN apk add --no-cache ca-certificates iptables

# Copy Tailscale binaries from official image
COPY --from=docker.io/tailscale/tailscale:latest /usr/local/bin/tailscaled /usr/sbin/tailscaled
COPY --from=docker.io/tailscale/tailscale:latest /usr/local/bin/tailscale /usr/bin/tailscale

# Install tsx globally for migration script
RUN npm install -g tsx

# Copy built files from builder
COPY --from=builder /app/backend/dist ./dist

# Create storage directory
RUN mkdir -p /app/storage_data

# Expose port
EXPOSE 8787

# Start script is already in the repo
RUN chmod +x start.sh

# Run migrations and start server with Tailscale
CMD ["./start.sh"]
