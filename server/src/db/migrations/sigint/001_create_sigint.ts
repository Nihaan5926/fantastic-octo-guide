import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sigint_intercepts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('reference_number', 100).unique().notNullable();
    t.string('title', 500).notNullable();
    t.string('signal_type', 100).nullable();
    t.string('frequency', 100).nullable();
    t.string('modulation', 100).nullable();
    t.text('content').nullable();
    t.jsonb('location').defaultTo('{}');
    t.uuid('collection_site_id').nullable();
    t.timestamp('collection_date').nullable();
    t.uuid('analyst_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('classification', 50).notNullable().defaultTo('UNCLASSIFIED');
    t.string('status', 50).notNullable().defaultTo('DRAFT');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('sigint_emitters', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 300).notNullable();
    t.string('emitter_type', 100).nullable();
    t.jsonb('frequency_range').defaultTo('{}');
    t.jsonb('location').defaultTo('{}');
    t.timestamp('first_detected').nullable();
    t.timestamp('last_detected').nullable();
    t.float('confidence').defaultTo(0);
    t.string('status', 50).defaultTo('ACTIVE');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sigint_emitters');
  await knex.schema.dropTableIfExists('sigint_intercepts');
}
