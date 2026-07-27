import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
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

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('report_versions');
}
