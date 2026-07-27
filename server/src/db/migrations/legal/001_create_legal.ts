import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('legal_reviews', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('reference_number', 50).unique().notNullable();
    t.string('title', 500).notNullable();
    t.string('entity_type', 100).nullable();
    t.uuid('entity_id').nullable();
    t.uuid('requested_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('assigned_to').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('status', 50).defaultTo('PENDING');
    t.string('classification', 50).defaultTo('UNCLASSIFIED');
    t.string('priority', 20).defaultTo('MEDIUM');
    t.date('due_date').nullable();
    t.jsonb('findings').defaultTo('[]');
    t.text('legal_opinion').nullable();
    t.timestamp('completed_at').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('compliance_checks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('title', 500).notNullable();
    t.string('regulation', 300).nullable();
    t.string('check_type', 100).nullable();
    t.string('status', 50).defaultTo('IN_PROGRESS');
    t.uuid('checked_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('checked_at').defaultTo(knex.fn.now());
    t.jsonb('findings').defaultTo('[]');
    t.boolean('violations_found').defaultTo(false);
    t.boolean('remediation_required').defaultTo(false);
    t.date('remediation_deadline').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('compliance_checks');
  await knex.schema.dropTableIfExists('legal_reviews');
}
