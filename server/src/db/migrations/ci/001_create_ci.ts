import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('ci_investigations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('reference_number', 100).unique().notNullable();
    t.string('title', 500).notNullable();
    t.string('subject', 500).nullable();
    t.string('investigation_type', 100).notNullable();
    t.string('status', 50).notNullable().defaultTo('OPEN');
    t.string('classification', 50).notNullable().defaultTo('UNCLASSIFIED');
    t.uuid('lead_investigator_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('opened_at').defaultTo(knex.fn.now());
    t.timestamp('closed_at').nullable();
    t.jsonb('findings').defaultTo('{}');
    t.string('disposition', 100).nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('ci_foreign_agents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 300).notNullable();
    t.jsonb('aliases').defaultTo('[]');
    t.string('nationality', 100).nullable();
    t.string('affiliation', 300).nullable();
    t.boolean('handler_suspected').defaultTo(false);
    t.string('status', 50).defaultTo('ACTIVE');
    t.string('threat_level', 50).defaultTo('MEDIUM');
    t.text('description').nullable();
    t.string('last_known_location', 500).nullable();
    t.jsonb('dossier').defaultTo('{}');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('ci_insider_threats', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('description').nullable();
    t.jsonb('indicators').defaultTo('[]');
    t.string('risk_level', 50).defaultTo('MEDIUM');
    t.string('status', 50).defaultTo('OPEN');
    t.uuid('reported_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('reported_at').defaultTo(knex.fn.now());
    t.uuid('investigation_id').nullable().references('id').inTable('ci_investigations').onDelete('SET NULL').index();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ci_insider_threats');
  await knex.schema.dropTableIfExists('ci_foreign_agents');
  await knex.schema.dropTableIfExists('ci_investigations');
}
