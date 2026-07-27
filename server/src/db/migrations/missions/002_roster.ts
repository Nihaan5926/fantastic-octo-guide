import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('mission_roster', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('mission_id').notNullable().references('id').inTable('mission_plans').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('role', 100).notNullable().defaultTo('OPERATOR');
    t.timestamp('assigned_at').defaultTo(knex.fn.now());
    t.unique(['mission_id', 'user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('mission_roster');
}
