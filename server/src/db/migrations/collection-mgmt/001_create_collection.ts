import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('collection_requirements', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('reference_number', 50).unique().notNullable();
    t.string('title', 500).notNullable();
    t.text('description').nullable();
    t.string('priority', 20).defaultTo('MEDIUM');
    t.string('intelligence_discipline', 100).nullable();
    t.string('status', 50).notNullable().defaultTo('DRAFT');
    t.uuid('requester_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('assigned_asset_id').nullable();
    t.timestamp('coverage_start').nullable();
    t.timestamp('coverage_end').nullable();
    t.jsonb('gaps_identified').defaultTo('{}');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('collection_assets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 300).notNullable();
    t.string('asset_type', 100).notNullable();
    t.string('platform', 200).nullable();
    t.text('capability').nullable();
    t.string('status', 50).notNullable().defaultTo('ACTIVE');
    t.string('location', 500).nullable();
    t.jsonb('coverage_area').defaultTo('{}');
    t.uuid('handler_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('tasking_authority', 200).nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('collection_assets');
  await knex.schema.dropTableIfExists('collection_requirements');
}
