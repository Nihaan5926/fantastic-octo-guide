import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Fix NOT NULL constraints on tables that should allow standalone records
  
  // Personnel - user_id should be optional
  await knex.raw('ALTER TABLE personnel_records ALTER COLUMN user_id DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE personnel_records DROP CONSTRAINT IF EXISTS personnel_records_user_id_unique').catch(() => {});
  
  // Watch Center - these should be created without requiring user IDs
  await knex.raw('ALTER TABLE shift_schedules ALTER COLUMN user_id DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE watch_logs ALTER COLUMN author_id DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE sitreps ALTER COLUMN author_id DROP NOT NULL').catch(() => {});

  // Declassification - record_id can be null for general requests
  await knex.raw('ALTER TABLE declassification_requests ALTER COLUMN record_id DROP NOT NULL').catch(() => {});

  // Mission debriefs - add missing title column
  await knex.raw('ALTER TABLE mission_debriefs ADD COLUMN IF NOT EXISTS title varchar(500)').catch(() => {});
}

export async function down(knex: Knex): Promise<void> {
  // Re-add constraints (in reverse)
  await knex.raw('ALTER TABLE personnel_records ALTER COLUMN user_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE shift_schedules ALTER COLUMN user_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE watch_logs ALTER COLUMN author_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE sitreps ALTER COLUMN author_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE declassification_requests ALTER COLUMN record_id SET NOT NULL').catch(() => {});
}
