import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('mission_plans', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('reference_number', 50).unique().notNullable();
    t.string('title', 500).notNullable();
    t.string('status', 50).notNullable().defaultTo('PLANNING');
    t.string('classification', 50).notNullable().defaultTo('UNCLASSIFIED');
    t.string('priority', 20).defaultTo('MEDIUM');
    t.text('objective').nullable();
    t.string('location', 500).nullable();
    t.timestamp('start_date').nullable();
    t.timestamp('end_date').nullable();
    t.uuid('commander_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('lead_analyst_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.jsonb('conops').defaultTo('{}');
    t.jsonb('rules_of_engagement').defaultTo('{}');
    t.jsonb('assets_required').defaultTo('{}');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('mission_briefs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('mission_id').notNullable().references('id').inTable('mission_plans').onDelete('CASCADE');
    t.string('title', 500).notNullable();
    t.jsonb('content').defaultTo('{}');
    t.integer('version').defaultTo(1);
    t.uuid('prepared_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('prepared_at').defaultTo(knex.fn.now());
    t.uuid('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('approved_at').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('mission_debriefs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('mission_id').notNullable().references('id').inTable('mission_plans').onDelete('CASCADE');
    t.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('summary').nullable();
    t.jsonb('findings').defaultTo('{}');
    t.jsonb('lessons_learned').defaultTo('{}');
    t.jsonb('recommendations').defaultTo('{}');
    t.string('status', 50).notNullable().defaultTo('DRAFT');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('mission_debriefs');
  await knex.schema.dropTableIfExists('mission_briefs');
  await knex.schema.dropTableIfExists('mission_plans');
}
