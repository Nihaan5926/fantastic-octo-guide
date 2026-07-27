import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('org_units', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 200).notNullable();
    t.uuid('parent_id').nullable().references('id').inTable('org_units').onDelete('SET NULL');
    t.string('unit_type', 50).nullable();
    t.uuid('commander_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('description').nullable();
    t.string('location', 200).nullable();
    t.date('established_date').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('personnel_assignments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('org_unit_id').notNullable().references('id').inTable('org_units').onDelete('CASCADE');
    t.string('position_title', 200).notNullable();
    t.boolean('is_primary').defaultTo(false);
    t.date('start_date').nullable();
    t.date('end_date').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('personnel_assignments');
  await knex.schema.dropTableIfExists('org_units');
}
