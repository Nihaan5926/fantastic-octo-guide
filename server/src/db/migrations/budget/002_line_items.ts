import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('budget_line_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('budget_id').notNullable().references('id').inTable('program_budgets').onDelete('CASCADE');
    t.string('description', 500).notNullable();
    t.string('category', 100).nullable();
    t.decimal('amount', 15, 2).notNullable().defaultTo(0);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('budget_line_items');
}
