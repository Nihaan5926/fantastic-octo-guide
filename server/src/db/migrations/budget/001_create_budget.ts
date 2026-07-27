import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('program_budgets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('reference_number', 50).unique().notNullable();
    t.string('program_name', 300).notNullable();
    t.string('fiscal_year', 10).nullable();
    t.decimal('total_amount', 15, 2).nullable();
    t.decimal('allocated_amount', 15, 2).nullable();
    t.decimal('spent_amount', 15, 2).nullable();
    t.string('status', 50).defaultTo('DRAFT');
    t.uuid('manager_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('category', 100).nullable();
    t.text('description').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('contracts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('reference_number', 50).unique().notNullable();
    t.string('vendor_name', 300).notNullable();
    t.text('description').nullable();
    t.string('contract_type', 100).nullable();
    t.decimal('value', 15, 2).nullable();
    t.date('start_date').nullable();
    t.date('end_date').nullable();
    t.string('status', 50).defaultTo('DRAFT');
    t.uuid('program_id').nullable().references('id').inTable('program_budgets').onDelete('SET NULL');
    t.uuid('contracting_officer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('contracts');
  await knex.schema.dropTableIfExists('program_budgets');
}
