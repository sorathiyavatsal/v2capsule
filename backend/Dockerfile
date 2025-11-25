# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Use faster Alpine mirror
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Use faster Alpine mirror and install wget in one command
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache wget

# Copy package files
COPY package*.json ./

# Install production dependencies with cache
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --prefer-offline --no-audit

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

# Create storage directory
RUN mkdir -p /app/storage_data

# Expose port
EXPOSE 8787

# Run migrations and start server
CMD ["sh", "-c", "npm run db:migrate && node dist/index.js"]
