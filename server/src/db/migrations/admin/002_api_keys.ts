import { Knex } from 'knex';
import { up as markUp, down as markDown } from '../../migration-utils';

const NAME = 'admin_002_api_keys';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('api_keys', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('name', 255).notNullable();
    t.string('key_hash', 255).unique().notNullable();
    t.specificType('scopes', 'TEXT[]').defaultTo('{}');
    t.timestamp('last_used_at').nullable();
    t.timestamp('expires_at').nullable();
    t.boolean('is_active').defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await markUp(knex, NAME);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('api_keys');
  await markDown(knex, NAME);
}
