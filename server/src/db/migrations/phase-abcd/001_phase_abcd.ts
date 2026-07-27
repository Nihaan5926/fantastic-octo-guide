import { Knex } from 'knex';
import { up as markUp, down as markDown } from '../../migration-utils';

const NAME = 'phase_abcd_001';

export async function up(knex: Knex): Promise<void> {
  // ─────────────────────────────────────────────────────────────────────────
  // PHASE A ─ Account lockout & password reset
  // ─────────────────────────────────────────────────────────────────────────

  // users.failed_login_attempts & users.locked_until
  const hasFailedAttempts = await knex.schema.hasColumn('users', 'failed_login_attempts');
  if (!hasFailedAttempts) {
    await knex.schema.alterTable('users', (t) => {
      t.integer('failed_login_attempts').defaultTo(0);
    });
  }
  const hasLockedUntil = await knex.schema.hasColumn('users', 'locked_until');
  if (!hasLockedUntil) {
    await knex.schema.alterTable('users', (t) => {
      t.timestamp('locked_until').nullable();
    });
  }

  // password_reset_tokens table
  if (!(await knex.schema.hasTable('password_reset_tokens'))) {
    await knex.schema.createTable('password_reset_tokens', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.string('token', 500).unique().notNullable();
      t.timestamp('expires_at').notNullable();
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE B ─ TOTP / Two-Factor
  // ─────────────────────────────────────────────────────────────────────────

  const hasTotpSecret = await knex.schema.hasColumn('users', 'totp_secret');
  if (!hasTotpSecret) {
    await knex.schema.alterTable('users', (t) => {
      t.text('totp_secret').nullable();
    });
  }
  const hasTotpEnabled = await knex.schema.hasColumn('users', 'totp_enabled');
  if (!hasTotpEnabled) {
    await knex.schema.alterTable('users', (t) => {
      t.boolean('totp_enabled').defaultTo(false);
    });
  }
  const hasTotpVerified = await knex.schema.hasColumn('users', 'totp_verified');
  if (!hasTotpVerified) {
    await knex.schema.alterTable('users', (t) => {
      t.boolean('totp_verified').defaultTo(false);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE B ─ Sessions & Login History
  // ─────────────────────────────────────────────────────────────────────────

  if (!(await knex.schema.hasTable('user_sessions'))) {
    await knex.schema.createTable('user_sessions', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.string('token_hash', 255).notNullable();
      t.string('ip_address', 50).nullable();
      t.text('user_agent').nullable();
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.timestamp('expires_at').notNullable();
      t.boolean('is_active').defaultTo(true);
    });
  }

  if (!(await knex.schema.hasTable('login_history'))) {
    await knex.schema.createTable('login_history', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      t.string('ip_address', 50).nullable();
      t.string('user_agent', 500).nullable();
      t.boolean('success').notNullable().defaultTo(false);
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE C ─ Admin: Announcements & API Keys
  // ─────────────────────────────────────────────────────────────────────────

  if (!(await knex.schema.hasTable('announcements'))) {
    await knex.schema.createTable('announcements', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('title', 255).notNullable();
      t.text('content').notNullable();
      t.string('severity', 50).notNullable().defaultTo('info');
      t.boolean('is_active').defaultTo(true);
      t.timestamp('starts_at').nullable();
      t.timestamp('expires_at').nullable();
      t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('api_keys'))) {
    await knex.schema.createTable('api_keys', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.string('name', 255).notNullable();
      t.string('key_hash', 255).unique().notNullable();
      t.specificType('scopes', 'TEXT[]').defaultTo('{}');
      t.timestamp('last_used_at').nullable();
      t.timestamp('expires_at').nullable();
      t.boolean('is_active').defaultTo(true);
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE C ─ Report Versions
  // ─────────────────────────────────────────────────────────────────────────

  if (!(await knex.schema.hasTable('report_versions'))) {
    await knex.schema.createTable('report_versions', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('report_id').notNullable().references('id').inTable('intelligence_reports').onDelete('CASCADE');
      t.integer('version_num').notNullable();
      t.string('title', 500);
      t.jsonb('content').defaultTo('{}');
      t.text('summary');
      t.string('classification', 50);
      t.uuid('edited_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.timestamp('edited_at').defaultTo(knex.fn.now());
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE C ─ Case Hierarchy
  // ─────────────────────────────────────────────────────────────────────────

  const hasParentCaseId = await knex.schema.hasColumn('cases', 'parent_case_id');
  if (!hasParentCaseId) {
    await knex.schema.alterTable('cases', (t) => {
      t.uuid('parent_case_id').nullable().references('id').inTable('cases').onDelete('SET NULL');
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE D ─ Mission Roster
  // ─────────────────────────────────────────────────────────────────────────

  if (!(await knex.schema.hasTable('mission_roster'))) {
    await knex.schema.createTable('mission_roster', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('mission_id').notNullable().references('id').inTable('mission_plans').onDelete('CASCADE');
      t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.string('role', 100).notNullable().defaultTo('OPERATOR');
      t.timestamp('assigned_at').defaultTo(knex.fn.now());
      t.unique(['mission_id', 'user_id']);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE D ─ Training Prerequisites
  // ─────────────────────────────────────────────────────────────────────────

  if (!(await knex.schema.hasTable('course_prerequisites'))) {
    await knex.schema.createTable('course_prerequisites', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('course_id').notNullable().references('id').inTable('training_courses').onDelete('CASCADE');
      t.uuid('prerequisite_course_id').notNullable().references('id').inTable('training_courses').onDelete('CASCADE');
      t.unique(['course_id', 'prerequisite_course_id']);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE D ─ Budget Line Items
  // ─────────────────────────────────────────────────────────────────────────

  if (!(await knex.schema.hasTable('budget_line_items'))) {
    await knex.schema.createTable('budget_line_items', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('budget_id').notNullable().references('id').inTable('program_budgets').onDelete('CASCADE');
      t.string('description', 500).notNullable();
      t.string('category', 100).nullable();
      t.decimal('amount', 15, 2).notNullable().defaultTo(0);
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE D ─ Legal Holds
  // ─────────────────────────────────────────────────────────────────────────

  if (!(await knex.schema.hasTable('legal_holds'))) {
    await knex.schema.createTable('legal_holds', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('title', 500).notNullable();
      t.string('entity_type', 100).nullable();
      t.uuid('entity_id').nullable();
      t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.text('reason').nullable();
      t.timestamp('placed_at').defaultTo(knex.fn.now());
      t.timestamp('released_at').nullable();
      t.string('status', 50).defaultTo('ACTIVE');
      t.jsonb('metadata').defaultTo('{}');
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE D ─ Messaging Threading (parent_id)
  // ─────────────────────────────────────────────────────────────────────────

  const hasParentMsgId = await knex.schema.hasColumn('secure_messages', 'parent_id');
  if (!hasParentMsgId) {
    await knex.schema.alterTable('secure_messages', (t) => {
      t.uuid('parent_id').nullable().references('id').inTable('secure_messages').onDelete('SET NULL');
    });
  }

  await markUp(knex, NAME);
}

export async function down(knex: Knex): Promise<void> {
  // Rollback in reverse order — only if tables/columns exist

  if (await knex.schema.hasColumn('secure_messages', 'parent_id')) {
    await knex.schema.alterTable('secure_messages', (t) => {
      t.dropColumn('parent_id');
    });
  }

  await knex.schema.dropTableIfExists('legal_holds');
  await knex.schema.dropTableIfExists('budget_line_items');
  await knex.schema.dropTableIfExists('course_prerequisites');
  await knex.schema.dropTableIfExists('mission_roster');

  if (await knex.schema.hasColumn('cases', 'parent_case_id')) {
    await knex.schema.alterTable('cases', (t) => {
      t.dropColumn('parent_case_id');
    });
  }

  await knex.schema.dropTableIfExists('report_versions');
  await knex.schema.dropTableIfExists('api_keys');
  await knex.schema.dropTableIfExists('announcements');
  await knex.schema.dropTableIfExists('login_history');
  await knex.schema.dropTableIfExists('user_sessions');

  if (await knex.schema.hasColumn('users', 'totp_verified')) {
    await knex.schema.alterTable('users', (t) => { t.dropColumn('totp_verified'); });
  }
  if (await knex.schema.hasColumn('users', 'totp_enabled')) {
    await knex.schema.alterTable('users', (t) => { t.dropColumn('totp_enabled'); });
  }
  if (await knex.schema.hasColumn('users', 'totp_secret')) {
    await knex.schema.alterTable('users', (t) => { t.dropColumn('totp_secret'); });
  }

  await knex.schema.dropTableIfExists('password_reset_tokens');

  if (await knex.schema.hasColumn('users', 'locked_until')) {
    await knex.schema.alterTable('users', (t) => { t.dropColumn('locked_until'); });
  }
  if (await knex.schema.hasColumn('users', 'failed_login_attempts')) {
    await knex.schema.alterTable('users', (t) => { t.dropColumn('failed_login_attempts'); });
  }

  await markDown(knex, NAME);
}
