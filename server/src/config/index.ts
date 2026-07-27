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

// Auto-generated deploy salt — only changes if DEPLOY_SALT env var changes, or if first run
const DEPLOY_SALT = process.env.DEPLOY_SALT || 'default-salt-change-in-production';
console.log(`[Config] Deploy salt: ${DEPLOY_SALT.substring(0, 8)}...`);

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
    accessSecret: required('JWT_ACCESS_SECRET', process.env.NODE_ENV === 'production' ? '' : 'dev-access-secret') + DEPLOY_SALT,
    refreshSecret: required('JWT_REFRESH_SECRET', process.env.NODE_ENV === 'production' ? '' : 'dev-refresh-secret') + DEPLOY_SALT,
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

  deploySalt: DEPLOY_SALT,
  buildTime: process.env.BUILD_TIME || new Date().toISOString(),

  maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
};
