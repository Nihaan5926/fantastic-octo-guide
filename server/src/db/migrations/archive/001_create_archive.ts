import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('archive_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('reference_number', 50).unique().notNullable();
    t.string('title', 500).notNullable();
    t.string('entity_type', 100).nullable();
    t.uuid('entity_id').nullable();
    t.string('classification', 50).defaultTo('UNCLASSIFIED');
    t.uuid('archived_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('archived_at').defaultTo(knex.fn.now());
    t.integer('retention_period_days').nullable();
    t.date('destruction_date').nullable();
    t.date('review_date').nullable();
    t.string('status', 50).defaultTo('ARCHIVED');
    t.string('location', 300).nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('declassification_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('record_id').notNullable().references('id').inTable('archive_records').onDelete('CASCADE');
    t.uuid('requested_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('reason').nullable();
    t.string('current_classification', 50).defaultTo('UNCLASSIFIED');
    t.string('requested_classification', 50).defaultTo('UNCLASSIFIED');
    t.string('status', 50).defaultTo('PENDING');
    t.uuid('reviewed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('reviewed_at').nullable();
    t.string('decision', 50).nullable();
    t.text('decision_notes').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('declassification_requests');
  await knex.schema.dropTableIfExists('archive_records');
}
