import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cases', (t) => {
    t.uuid('parent_case_id').nullable().references('id').inTable('cases').onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cases', (t) => {
    t.dropColumn('parent_case_id');
  });
}
