#!/bin/sh
# ─── Intel Platform Startup Script ───
# Runs database migrations then starts the server

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
node dist/db/migrate.js up

echo "[Startup] Running first-run seed..."
node dist/db/seed-minimal.js

if [ "$RUN_SEEDS" = "true" ]; then
  echo "[Startup] Running full seed..."
  node dist/db/seed.js
fi

echo "[Startup] Starting server on port ${PORT:-4000}..."
exec node dist/app.js
