import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('personnel_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').unique();
    t.date('date_of_birth').nullable();
    t.string('nationality', 100).nullable();
    t.string('position_title', 200).nullable();
    t.string('clearance_level', 50).nullable();
    t.date('clearance_expiry').nullable();
    t.jsonb('special_accesses').defaultTo('[]');
    t.jsonb('languages').defaultTo('[]');
    t.jsonb('skills').defaultTo('[]');
    t.jsonb('certifications').defaultTo('[]');
    t.text('notes').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('personnel_records');
}
