import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('intelligence_reports', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('reference_number', 50).unique().notNullable();
    t.string('title', 500).notNullable();
    t.string('classification', 50).notNullable().defaultTo('UNCLASSIFIED');
    t.string('status', 50).notNullable().defaultTo('DRAFT');
    t.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('case_id').nullable();
    t.uuid('source_id').nullable();
    t.text('summary').nullable();
    t.jsonb('content').defaultTo('{}');
    t.string('priority', 20).defaultTo('MEDIUM');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('published_at').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('intelligence_reports');
}
