# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install git
RUN apk add --no-cache git

# Clone the repository
RUN git clone https://github.com/sorathiyavatsal/v2capsule.git .

# Navigate to frontend directory
WORKDIR /app/frontend

# Accept build arguments
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm install --prefer-offline --no-audit

# Build Next.js app
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install git
RUN apk add --no-cache git

# Clone the repository again for production
RUN git clone https://github.com/sorathiyavatsal/v2capsule.git .

WORKDIR /app/frontend

# Install production dependencies with cache
RUN --mount=type=cache,target=/root/.npm \
    npm install --production --prefer-offline --no-audit

# Install Tailscale dependencies
RUN apk add --no-cache ca-certificates iptables

# Copy Tailscale binaries from official image
COPY --from=docker.io/tailscale/tailscale:latest /usr/local/bin/tailscaled /usr/sbin/tailscaled
COPY --from=docker.io/tailscale/tailscale:latest /usr/local/bin/tailscale /usr/bin/tailscale

# Copy built files from builder
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/next.config.ts ./

# Expose port
EXPOSE 3000

# Start script is already in the repo
RUN chmod +x start.sh

# Start application with Tailscale
CMD ["./start.sh"]
