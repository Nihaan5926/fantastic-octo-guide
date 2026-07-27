import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('geoint_features', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('title', 500).notNullable();
    t.string('feature_type', 50).notNullable();
    t.jsonb('coordinates').defaultTo('{}');
    t.string('classification', 50).notNullable().defaultTo('UNCLASSIFIED');
    t.text('description').nullable();
    t.string('imagery_reference', 500).nullable();
    t.timestamp('collection_date').nullable();
    t.uuid('analyst_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.float('accuracy').defaultTo(0);
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('geoint_annotations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('feature_id').notNullable().references('id').inTable('geoint_features').onDelete('CASCADE').index();
    t.string('title', 500).notNullable();
    t.string('annotation_type', 50).defaultTo('NOTE');
    t.text('content').nullable();
    t.jsonb('geometry').defaultTo('{}');
    t.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('geoint_annotations');
  await knex.schema.dropTableIfExists('geoint_features');
}
