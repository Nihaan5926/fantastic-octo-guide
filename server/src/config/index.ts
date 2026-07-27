import dotenv from 'dotenv';
import path from 'path';

// Load .env only if it exists (skip in Docker where env vars are injected)
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: false });

const required = (key: string, fallback: string): string => {
  const val = process.env[key] || fallback;
  if (!val && process.env.NODE_ENV === 'production') {
    console.warn(`[Config] Missing required env var: ${key}, using fallback: "${fallback}"`);
  }
  return val;
};

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'intel_admin',
    password: process.env.DB_PASSWORD || 'intel_secret_dev',
    database: process.env.DB_NAME || 'intel_platform',
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', process.env.NODE_ENV === 'production' ? '' : 'dev-access-secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', process.env.NODE_ENV === 'production' ? '' : 'dev-refresh-secret'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  upload: {
    dir: path.resolve(__dirname, '..', process.env.UPLOAD_DIR || './uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
  },

  maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
};
