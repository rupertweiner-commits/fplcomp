# Multi-stage build for production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --only=production
RUN cd client && npm ci --only=production

# Copy source code
COPY . .

# Build frontend
RUN cd client && npm run build

# Production stage
FROM node:18-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/client/build ./client/build
COPY --from=builder --chown=nodejs:nodejs /app/services ./services
COPY --from=builder --chown=nodejs:nodejs /app/routes ./routes
COPY --from=builder --chown=nodejs:nodejs /app/config ./config
COPY --from=builder --chown=nodejs:nodejs /app/server.production.js ./server.js

# Create necessary directories
RUN mkdir -p data logs backups && chown -R nodejs:nodejs data logs backups

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "server.js"]
