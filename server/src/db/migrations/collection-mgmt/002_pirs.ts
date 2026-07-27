import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('collection_pirs')) return;
  await knex.schema.createTable('collection_pirs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('reference_number', 50).unique().notNullable();
    t.string('title', 500).notNullable();
    t.text('description').nullable();
    t.string('priority', 20).defaultTo('MEDIUM');
    t.string('status', 50).defaultTo('ACTIVE');
    t.uuid('requirement_id').nullable().references('id').inTable('collection_requirements').onDelete('SET NULL');
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('collection_pirs');
}
