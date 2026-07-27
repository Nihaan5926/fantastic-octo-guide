import { Knex } from 'knex';
import { up as markUp, down as markDown } from '../../migration-utils';

const NAME = 'auth_006_sessions';
export { NAME as name };

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_sessions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('token_hash', 255).notNullable();
    t.string('ip_address', 50).nullable();
    t.text('user_agent').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('expires_at').notNullable();
    t.boolean('is_active').defaultTo(true);
  });

  await markUp(knex, NAME);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_sessions');
  await markDown(knex, NAME);
}
