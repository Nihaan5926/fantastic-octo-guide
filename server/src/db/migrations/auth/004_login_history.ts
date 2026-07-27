import { Knex } from 'knex';
import { up as markUp, down as markDown } from '../../migration-utils';

const NAME = 'auth_004_login_history';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('login_history', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('ip_address', 50).nullable();
    t.string('user_agent', 500).nullable();
    t.boolean('success').notNullable().defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await markUp(knex, NAME);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('login_history');
  await markDown(knex, NAME);
}
