import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('message_channels', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 200).notNullable();
    t.text('description').nullable();
    t.string('channel_type', 20).notNullable().defaultTo('TEAM');
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.boolean('is_active').defaultTo(true);
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('secure_messages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('recipient_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.uuid('channel_id').nullable().references('id').inTable('message_channels').onDelete('SET NULL');
    t.string('subject', 500).nullable();
    t.text('body').nullable();
    t.string('classification', 50).defaultTo('UNCLASSIFIED');
    t.boolean('is_read').defaultTo(false);
    t.timestamp('read_at').nullable();
    t.uuid('parent_id').nullable().references('id').inTable('secure_messages').onDelete('SET NULL');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('channel_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('channel_id').notNullable().references('id').inTable('message_channels').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('role', 20).defaultTo('MEMBER');
    t.timestamp('joined_at').defaultTo(knex.fn.now());
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.unique(['channel_id', 'user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('channel_members');
  await knex.schema.dropTableIfExists('secure_messages');
  await knex.schema.dropTableIfExists('message_channels');
}
