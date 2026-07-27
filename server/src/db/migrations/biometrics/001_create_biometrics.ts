import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('biometric_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('subject_name', 300).notNullable();
    t.string('biometric_type', 50).notNullable();
    t.text('record_data').notNullable();
    t.float('confidence_score').defaultTo(0);
    t.timestamp('collection_date').nullable();
    t.uuid('collector_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('classification', 50).notNullable().defaultTo('UNCLASSIFIED');
    t.text('notes').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('biometric_watchlists', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 300).notNullable();
    t.text('description').nullable();
    t.string('list_type', 100).defaultTo('STANDARD');
    t.uuid('owner_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.boolean('is_active').defaultTo(true);
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('biometric_encounters', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('record_id').nullable().references('id').inTable('biometric_records').onDelete('SET NULL').index();
    t.jsonb('location').defaultTo('{}');
    t.timestamp('encounter_date').nullable();
    t.uuid('encountered_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.boolean('match_found').defaultTo(false);
    t.uuid('matched_record_id').nullable().references('id').inTable('biometric_records').onDelete('SET NULL');
    t.float('match_score').nullable();
    t.text('notes').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('biometric_encounters');
  await knex.schema.dropTableIfExists('biometric_watchlists');
  await knex.schema.dropTableIfExists('biometric_records');
}
