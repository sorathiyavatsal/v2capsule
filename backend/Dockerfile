# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm install --prefer-offline --no-audit

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

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
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/src ./src

# Create storage directory
RUN mkdir -p /app/storage_data

# Expose port
EXPOSE 8787

# Run migrations and start server
# Copy start script
COPY start.sh .
RUN chmod +x start.sh

# Run migrations and start server with Tailscale
CMD ["./start.sh"]
