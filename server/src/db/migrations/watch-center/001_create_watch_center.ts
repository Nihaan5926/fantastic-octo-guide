import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('shift_schedules', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('shift_name', 100).nullable();
    t.time('start_time').nullable();
    t.time('end_time').nullable();
    t.jsonb('days').defaultTo('[]');
    t.boolean('is_active').defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('watch_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shift_id').nullable().references('id').inTable('shift_schedules').onDelete('SET NULL');
    t.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('log_type', 50).defaultTo('GENERAL');
    t.string('title', 300).notNullable();
    t.text('content').nullable();
    t.string('severity', 20).defaultTo('INFO');
    t.string('status', 50).defaultTo('OPEN');
    t.uuid('acknowledged_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('acknowledged_at').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('sitreps', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('reference_number', 50).unique().notNullable();
    t.string('title', 500).notNullable();
    t.timestamp('period_start').nullable();
    t.timestamp('period_end').nullable();
    t.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('classification', 50).defaultTo('UNCLASSIFIED');
    t.jsonb('content').defaultTo('{}');
    t.string('status', 50).defaultTo('DRAFT');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sitreps');
  await knex.schema.dropTableIfExists('watch_logs');
  await knex.schema.dropTableIfExists('shift_schedules');
}
