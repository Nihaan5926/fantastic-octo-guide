import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('evidence', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('case_id').nullable().index();
    t.uuid('report_id').nullable().index();
    t.string('type', 50).notNullable();
    t.string('title', 500).notNullable();
    t.text('description').nullable();
    t.string('file_path', 1000).nullable();
    t.bigInteger('file_size').nullable();
    t.string('mime_type', 200).nullable();
    t.string('classification', 50).defaultTo('UNCLASSIFIED');
    t.jsonb('chain_of_custody').defaultTo('[]');
    t.jsonb('metadata').defaultTo('{}');
    t.uuid('uploaded_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('evidence');
}
