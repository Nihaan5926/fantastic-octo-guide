#!/bin/sh
# ─── Intel Platform Startup Script ───

echo "[Startup] Waiting for PostgreSQL..."
RETRIES=30
until node -e "
  const { Pool } = require('pg');
  const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'intel_admin',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'intel_platform',
    connectionTimeoutMillis: 3000,
  });
  pool.query('SELECT 1').then(() => { console.log('DB ready'); process.exit(0); }).catch(() => { process.exit(1); });
" 2>/dev/null; do
  RETRIES=$((RETRIES-1))
  if [ $RETRIES -le 0 ]; then
    echo "[Startup] PostgreSQL not available after 30 attempts. Exiting."
    exit 1
  fi
  echo "[Startup] Waiting for PostgreSQL... ($RETRIES attempts left)"
  sleep 2
done

echo "[Startup] Running database migrations..."
node dist/db/migrate.js up || echo "[Startup] Migrations completed with some failures — continuing..."

# Run recovery bootstrap to ensure ALL tables exist (idempotent)
echo "[Startup] Running schema recovery..."
node dist/db/bootstrap.js || echo "[Startup] Schema recovery had issues — continuing anyway..."

echo "[Startup] Running first-run seed (admin user)..."
node dist/db/seed-minimal.js

echo "[Startup] Starting server in background..."
node dist/app.js &
SERVER_PID=$!

# Check if process crashed immediately
sleep 3
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "[Startup] SERVER CRASHED ON STARTUP! Check logs above for errors."
  exit 1
fi

echo "[Startup] Waiting for server to be ready..."
for i in $(seq 1 30); do
  # Check if process is still alive
  if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "[Startup] Server process died during startup!"
    exit 1
  fi
  if node -e "const http=require('http');http.get('http://localhost:${PORT:-4000}/api/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1));" 2>/dev/null; then
    echo "[Startup] Server is ready."
    break
  fi
  sleep 1
done

if [ "$RUN_SEEDS" = "true" ]; then
  echo "[Startup] Seeding demo data into all modules..."
  node scripts/seed-all.js
fi

echo "[Startup] Bringing server to foreground..."
wait $SERVER_PID
