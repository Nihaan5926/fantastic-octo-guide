import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tasking_assignments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('reference_number', 50).unique().notNullable();
    t.string('title', 500).notNullable();
    t.text('description').nullable();
    t.string('task_type', 100).nullable();
    t.string('priority', 20).defaultTo('MEDIUM');
    t.string('status', 50).notNullable().defaultTo('PENDING');
    t.uuid('assigned_to').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('assigned_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('due_date').nullable();
    t.timestamp('completed_at').nullable();
    t.string('related_entity_type', 100).nullable();
    t.uuid('related_entity_id').nullable();
    t.text('notes').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('tasking_workflows', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 300).notNullable();
    t.text('description').nullable();
    t.jsonb('steps').defaultTo('[]');
    t.boolean('is_active').defaultTo(true);
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tasking_workflows');
  await knex.schema.dropTableIfExists('tasking_assignments');
}
