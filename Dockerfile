# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# ============================================
# Stage 2: Build Application
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy package files (scripts 등 필요)
COPY --from=dependencies /app/package*.json ./

# Copy source code
COPY . .

# Build frontend (Vite) and backend (esbuild)
# This runs: vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
RUN npm run build

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM node:20-alpine AS production

# Set environment to production
ENV NODE_ENV=production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy only production dependencies
COPY --from=dependencies /app/package*.json ./
COPY --from=dependencies /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/dist-server ./dist-server

# Copy static frontend files built by Vite
COPY --from=builder --chown=nodejs:nodejs /app/dist/public ./dist/public

RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app
    # Copy any additional static assets if they exist (optional)
    # Note: This will fail if directory doesn't exist, but that's OK - we'll handle it in a shell command
RUN mkdir -p ./attached_assets || true

# Copy sample data generation scripts and SQL files
COPY --from=builder --chown=nodejs:nodejs /app/scripts/create-comprehensive-sample-data.js ./scripts/create-comprehensive-sample-data.js
COPY --from=builder --chown=nodejs:nodejs /app/scripts/deploy-init-sample-data.js ./scripts/deploy-init-sample-data.js
COPY --from=builder --chown=nodejs:nodejs /app/scripts/init-sample-data.js ./scripts/init-sample-data.js
COPY --from=builder --chown=nodejs:nodejs /app/database/init-sample-data.sql ./database/init-sample-data.sql

# Switch to non-root user
USER nodejs

# Expose port (configurable via PORT env var, default 5000)
EXPOSE 5000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/system/status', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "dist-server/index.js"]
