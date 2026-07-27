import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('cases', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('reference_number', 50).unique().notNullable();
    t.string('title', 500).notNullable();
    t.text('description').nullable();
    t.string('status', 50).defaultTo('OPEN');
    t.string('priority', 20).defaultTo('MEDIUM');
    t.string('classification', 50).defaultTo('UNCLASSIFIED');
    t.uuid('lead_analyst_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.date('start_date').nullable();
    t.date('end_date').nullable();
    t.date('due_date').nullable();
    t.jsonb('tags').defaultTo('[]');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('case_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('case_id').notNullable().references('id').inTable('cases').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('role', 50).defaultTo('ANALYST');
    t.timestamp('assigned_at').defaultTo(knex.fn.now());
    t.unique(['case_id', 'user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('case_members');
  await knex.schema.dropTableIfExists('cases');
}
