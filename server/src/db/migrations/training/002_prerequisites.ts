import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('course_prerequisites', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('course_id').notNullable().references('id').inTable('training_courses').onDelete('CASCADE');
    t.uuid('prerequisite_course_id').notNullable().references('id').inTable('training_courses').onDelete('CASCADE');
    t.unique(['course_id', 'prerequisite_course_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('course_prerequisites');
}
