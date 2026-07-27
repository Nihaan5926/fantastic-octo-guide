import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('briefings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('reference_number', 50).unique().notNullable();
    t.string('title', 500).notNullable();
    t.string('classification', 50).notNullable().defaultTo('UNCLASSIFIED');
    t.string('status', 50).notNullable().defaultTo('DRAFT');
    t.uuid('prepared_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('prepared_at').nullable();
    t.uuid('briefed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('briefed_at').nullable();
    t.jsonb('audience').defaultTo('[]');
    t.jsonb('content').defaultTo('{}');
    t.integer('slides_count').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('briefing_distributions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('briefing_id').notNullable().references('id').inTable('briefings').onDelete('CASCADE');
    t.uuid('recipient_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('recipient_group', 200).nullable();
    t.timestamp('sent_at').defaultTo(knex.fn.now());
    t.timestamp('read_at').nullable();
    t.boolean('acknowledged').defaultTo(false);
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('briefing_distributions');
  await knex.schema.dropTableIfExists('briefings');
}
