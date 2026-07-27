import knex from 'knex';
import { config } from '../config';

export const db: knex.Knex = knex({
  client: 'pg',
  connection: {
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
  },
  pool: { min: 2, max: 10 },
  migrations: {
    directory: './src/db/migrations',
    extension: 'ts',
  },
});

export async function testConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    console.log('[DB] Connected to PostgreSQL');
    return true;
  } catch (err: any) {
    console.error('[DB] Connection failed:', err.message);
    return false;
  }
}
