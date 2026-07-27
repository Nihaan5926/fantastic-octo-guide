import type { Module, ModuleContext } from '../../core/types';
import router from './router';
import * as m005 from '../../db/migrations/auth/005_two_factor';
import * as m006 from '../../db/migrations/auth/006_sessions';
import * as m007 from '../../db/migrations/auth/007_avatar';

// Auto-create tables on module startup (before any requests)
let tablesEnsured = false;
async function ensureTablesOnStart() {
  if (tablesEnsured) return;
  tablesEnsured = true;
  try {
    const { db } = require('../../db/knex');
    if (!await db.schema.hasTable('user_sessions')) {
      await db.schema.createTable('user_sessions', (t: any) => {
        t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
        t.string('token_hash', 500);
        t.string('ip_address', 50);
        t.text('user_agent');
        t.timestamp('created_at').defaultTo(db.fn.now());
        t.timestamp('expires_at');
        t.boolean('is_active').defaultTo(true);
      });
      console.log('[Auth] Created user_sessions table');
    }
    if (!await db.schema.hasTable('password_reset_tokens')) {
      await db.schema.createTable('password_reset_tokens', (t: any) => {
        t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
        t.string('token', 500).unique();
        t.timestamp('expires_at').notNullable();
        t.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log('[Auth] Created password_reset_tokens table');
    }
    if (!await db.schema.hasTable('login_history')) {
      await db.schema.createTable('login_history', (t: any) => {
        t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
        t.string('ip_address', 50);
        t.text('user_agent');
        t.boolean('success').defaultTo(true);
        t.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log('[Auth] Created login_history table');
    }
    if (!await db.schema.hasColumn('users', 'failed_login_attempts')) {
      await db.schema.alterTable('users', (t: any) => {
        t.integer('failed_login_attempts').defaultTo(0);
        t.timestamp('locked_until').nullable();
        t.string('totp_secret').nullable();
        t.boolean('totp_enabled').defaultTo(false);
        t.boolean('totp_verified').defaultTo(false);
        t.string('avatar_url', 1000).nullable();
      });
      console.log('[Auth] Added missing columns to users table');
    }
  } catch(e: any) {
    console.warn('[Auth] Table auto-create failed (will retry on first request):', e.message);
    tablesEnsured = false;
  }
}

const manifest = {
  name: 'auth',
  version: '1.0.0',
  category: 'Foundation',
  permissions: [],
  apiPrefix: '/api/auth',
  navItems: [],
  dashboardWidgets: [],
  globalSearchEnabled: false,
} as const;

const authModule: Module = {
  manifest,
  router,
  register: async () => { await ensureTablesOnStart(); },
  migrations: [
    { name: 'auth_005_two_factor', up: m005.up, down: m005.down },
    { name: 'auth_006_sessions', up: m006.up, down: m006.down },
    { name: 'auth_007_avatar', up: m007.up, down: m007.down },
  ],
};

export default authModule;
