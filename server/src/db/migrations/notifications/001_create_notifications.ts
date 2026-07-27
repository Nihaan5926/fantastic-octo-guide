import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('notifications')) return;
  await knex.schema.createTable('notifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').index();
    t.string('type', 100).notNullable();
    t.string('title', 500).notNullable();
    t.text('message').nullable();
    t.boolean('is_read').defaultTo(false).index();
    t.string('related_type', 100).nullable();
    t.uuid('related_id').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notifications');
}

