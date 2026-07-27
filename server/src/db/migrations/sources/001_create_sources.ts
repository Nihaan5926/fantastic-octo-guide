import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sources', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('code_name', 200).unique().notNullable();
    t.string('type', 50).notNullable();
    t.string('subtype', 100).nullable();
    t.string('reliability_rating', 10).defaultTo('F-6');
    t.integer('credibility_score').defaultTo(50);
    t.string('status', 50).defaultTo('ACTIVE');
    t.uuid('handler_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('description').nullable();
    t.text('notes').nullable();
    t.jsonb('contact_info').defaultTo('{}');
    t.jsonb('access_procedures').defaultTo('{}');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('last_contact_at').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sources');
}
