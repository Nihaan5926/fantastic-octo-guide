import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('osint_collection_tasks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('title', 500).notNullable();
    t.text('query').nullable();
    t.jsonb('source_types').defaultTo('[]');
    t.string('schedule', 100).nullable();
    t.string('status', 50).defaultTo('IDLE');
    t.timestamp('last_run_at').nullable();
    t.timestamp('next_run_at').nullable();
    t.integer('results_count').defaultTo(0);
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('osint_collected_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('task_id').notNullable().references('id').inTable('osint_collection_tasks').onDelete('CASCADE').index();
    t.string('url', 2000).nullable();
    t.string('title', 1000).nullable();
    t.text('content_snippet').nullable();
    t.string('source_type', 100).nullable();
    t.timestamp('captured_at').defaultTo(knex.fn.now());
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('osint_collected_items');
  await knex.schema.dropTableIfExists('osint_collection_tasks');
}
