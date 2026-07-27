import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('target_packages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('reference_number', 50).unique().notNullable();
    t.string('title', 500).notNullable();
    t.text('objective').nullable();
    t.string('status', 50).notNullable().defaultTo('DRAFT');
    t.string('classification', 50).notNullable().defaultTo('UNCLASSIFIED');
    t.string('priority', 20).defaultTo('MEDIUM');
    t.string('target_name', 500).nullable();
    t.string('location', 500).nullable();
    t.jsonb('assessment').defaultTo('{}');
    t.string('cde_estimate', 50).nullable();
    t.string('authority', 200).nullable();
    t.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('approved_at').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('target_nominations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('package_id').nullable().references('id').inTable('target_packages').onDelete('SET NULL');
    t.string('title', 500).notNullable();
    t.text('justification').nullable();
    t.string('priority', 20).defaultTo('MEDIUM');
    t.uuid('nominator_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('status', 50).notNullable().defaultTo('PENDING');
    t.string('classification', 50).notNullable().defaultTo('UNCLASSIFIED');
    t.uuid('reviewed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('reviewed_at').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('target_nominations');
  await knex.schema.dropTableIfExists('target_packages');
}
