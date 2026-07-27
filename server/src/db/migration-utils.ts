import { Knex } from 'knex';

export async function up(db: Knex, migrationName: string): Promise<void> {
  if (!await db.schema.hasTable('migrations')) {
    await db.schema.createTable('migrations', (t) => {
      t.string('name').primary();
      t.timestamp('run_at').defaultTo(db.fn.now());
    });
  }
  await db('migrations').insert({ name: migrationName });
}

export async function down(db: Knex, migrationName: string): Promise<void> {
  await db('migrations').where({ name: migrationName }).del();
}

export async function hasRun(db: Knex, migrationName: string): Promise<boolean> {
  return await db.schema.hasTable('migrations')
    ? !!(await db('migrations').where({ name: migrationName }).first())
    : false;
}
