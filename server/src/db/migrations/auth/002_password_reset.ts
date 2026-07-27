import { Knex } from 'knex';
import { up as markUp, down as markDown } from '../../migration-utils';

const NAME = 'auth_002_password_reset';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('password_reset_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('token', 500).unique().notNullable();
    t.timestamp('expires_at').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await markUp(knex, NAME);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('password_reset_tokens');
  await markDown(knex, NAME);
}
