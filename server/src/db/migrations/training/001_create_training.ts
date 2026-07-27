import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('training_courses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('title', 300).notNullable();
    t.text('description').nullable();
    t.string('course_type', 50).nullable();
    t.decimal('duration_hours', 6, 1).nullable();
    t.string('instructor', 200).nullable();
    t.boolean('is_required').defaultTo(false);
    t.string('certification_issued', 200).nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('training_enrollments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('course_id').notNullable().references('id').inTable('training_courses').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('status', 50).defaultTo('ENROLLED');
    t.timestamp('enrolled_at').defaultTo(knex.fn.now());
    t.timestamp('completed_at').nullable();
    t.decimal('score', 5, 1).nullable();
    t.text('notes').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.unique(['course_id', 'user_id']);
  });

  await knex.schema.createTable('after_action_reports', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('title', 500).notNullable();
    t.string('exercise_name', 300).nullable();
    t.date('date').nullable();
    t.text('summary').nullable();
    t.jsonb('findings').defaultTo('[]');
    t.jsonb('recommendations').defaultTo('[]');
    t.jsonb('participants').defaultTo('[]');
    t.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('after_action_reports');
  await knex.schema.dropTableIfExists('training_enrollments');
  await knex.schema.dropTableIfExists('training_courses');
}
