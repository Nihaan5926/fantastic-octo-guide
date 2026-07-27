import { Knex } from 'knex';
import { up as markUp, down as markDown } from '../../migration-utils';

const NAME = 'auth_003_lockout';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.integer('failed_login_attempts').defaultTo(0);
    t.timestamp('locked_until').nullable();
  });

  await markUp(knex, NAME);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('locked_until');
    t.dropColumn('failed_login_attempts');
  });

  await markDown(knex, NAME);
}
