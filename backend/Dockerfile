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
CMD ["sh", "-c", "npm run db:migrate && tsx src/index.ts"]
