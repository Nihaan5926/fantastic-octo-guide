import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('legal_holds', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('title', 500).notNullable();
    t.string('entity_type', 100).nullable();
    t.uuid('entity_id').nullable();
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('reason').nullable();
    t.timestamp('placed_at').defaultTo(knex.fn.now());
    t.timestamp('released_at').nullable();
    t.string('status', 50).defaultTo('ACTIVE');
    t.jsonb('metadata').defaultTo('{}');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('legal_holds');
}
