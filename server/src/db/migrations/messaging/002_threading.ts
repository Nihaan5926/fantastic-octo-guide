import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('secure_messages', 'parent_id');
  if (!hasColumn) {
    await knex.schema.alterTable('secure_messages', (t) => {
      t.uuid('parent_id').nullable().references('id').inTable('secure_messages').onDelete('SET NULL');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('secure_messages', 'parent_id');
  if (hasColumn) {
    await knex.schema.alterTable('secure_messages', (t) => {
      t.dropColumn('parent_id');
    });
  }
}
