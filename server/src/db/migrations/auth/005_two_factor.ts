import { Knex } from 'knex';
import { up as markUp, down as markDown } from '../../migration-utils';

const NAME = 'auth_005_two_factor';
export { NAME as name };

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.text('totp_secret').nullable();
    t.boolean('totp_enabled').defaultTo(false);
    t.boolean('totp_verified').defaultTo(false);
  });

  await markUp(knex, NAME);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('totp_verified');
    t.dropColumn('totp_enabled');
    t.dropColumn('totp_secret');
  });

  await markDown(knex, NAME);
}
