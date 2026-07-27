import { Knex } from 'knex';
import { up as markUp, down as markDown } from '../../migration-utils';

const NAME = 'admin_001_announcements';

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('announcements')) return;
  await knex.schema.createTable('announcements', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('title', 255).notNullable();
    t.text('content').notNullable();
    t.string('severity', 50).notNullable().defaultTo('info');
    t.boolean('is_active').defaultTo(true);
    t.timestamp('starts_at').nullable();
    t.timestamp('expires_at').nullable();
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await markUp(knex, NAME);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('announcements');
  await markDown(knex, NAME);
}
