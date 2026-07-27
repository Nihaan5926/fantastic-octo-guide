# ─── Builder Stage: Build Client ───
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY client/ ./
RUN npx vite build

# ─── Builder Stage: Build Server ───
FROM node:22-alpine AS server-builder
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY server/ ./
RUN npx tsc

# ─── Production Stage ───
FROM node:22-alpine
WORKDIR /app

# Install only production deps (add axios for seed script)
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev
RUN npm install axios 2>/dev/null || true

# Copy built server (includes compiled migrations in dist/db/migrations/)
COPY --from=server-builder /app/server/dist ./dist

# Copy built client
COPY --from=client-builder /app/client/dist ./public

# Copy startup script and seed script
COPY scripts/startup.sh ./startup.sh
COPY scripts/seed-all.js ./scripts/seed-all.js
RUN chmod +x ./startup.sh

# Create uploads directory
RUN mkdir -p /app/uploads

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=4000
ENV CLIENT_DIST=/app/public
ENV UPLOAD_DIR=/app/uploads
ENV RUN_SEEDS=false

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "const http=require('http');const req=http.get('http://localhost:4000/api/health',r=>{process.exit(r.statusCode===200?0:1)});req.on('error',()=>process.exit(1));req.setTimeout(3000,()=>{req.destroy();process.exit(1)})"

# Start with migrations then server
CMD ["sh", "./startup.sh"]
