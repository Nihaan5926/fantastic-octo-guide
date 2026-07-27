import { Knex } from 'knex';
import { up as markUp, down as markDown } from '../../migration-utils';

const NAME = 'core_002_polymorphic';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('entity_tags', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('entity_type', 100).notNullable().index();
    t.uuid('entity_id').notNullable().index();
    t.string('tag', 200).notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.unique(['entity_type', 'entity_id', 'tag']);
  });

  await knex.schema.createTable('entity_comments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('entity_type', 100).notNullable().index();
    t.uuid('entity_id').notNullable().index();
    t.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('parent_id').nullable().references('id').inTable('entity_comments').onDelete('CASCADE');
    t.text('content').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('entity_attachments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('entity_type', 100).notNullable().index();
    t.uuid('entity_id').notNullable().index();
    t.string('filename', 500).notNullable();
    t.string('original_name', 500).notNullable();
    t.string('mime_type', 200).notNullable();
    t.bigInteger('size').notNullable();
    t.string('storage_path', 1000).notNullable();
    t.uuid('uploaded_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('entity_relationships', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('source_type', 100).notNullable().index();
    t.uuid('source_id').notNullable().index();
    t.string('target_type', 100).notNullable().index();
    t.uuid('target_id').notNullable().index();
    t.string('relationship_type', 200).notNullable();
    t.string('description', 1000).nullable();
    t.integer('confidence').defaultTo(100);
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('activity_feed', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('entity_type', 100).notNullable().index();
    t.uuid('entity_id').notNullable().index();
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('action', 200).notNullable();
    t.jsonb('changes').defaultTo('{}');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('custom_fields', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('entity_type', 100).notNullable().index();
    t.uuid('entity_id').notNullable().index();
    t.string('field_key', 200).notNullable();
    t.text('field_value').nullable();
    t.string('field_type', 50).defaultTo('text');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.unique(['entity_type', 'entity_id', 'field_key']);
  });

  await knex.schema.createTable('audit_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('action', 200).notNullable();
    t.string('entity_type', 100).nullable().index();
    t.uuid('entity_id').nullable();
    t.jsonb('changes').defaultTo('{}');
    t.string('ip_address', 50).nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await markUp(knex, NAME);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('custom_fields');
  await knex.schema.dropTableIfExists('activity_feed');
  await knex.schema.dropTableIfExists('entity_relationships');
  await knex.schema.dropTableIfExists('entity_attachments');
  await knex.schema.dropTableIfExists('entity_comments');
  await knex.schema.dropTableIfExists('entity_tags');
  await markDown(knex, NAME);
}
