FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Install dumb-init, build tools for bcrypt
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for reflect-metadata)
RUN npm install --legacy-peer-deps

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy Prisma schema and migrations
COPY --from=builder /app/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Create certs directory for SSL
RUN mkdir -p /app/certs

# Security: Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -u 1001 appuser

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
