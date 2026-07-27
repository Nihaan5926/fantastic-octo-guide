import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('threat_actors', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 300).notNullable();
    t.jsonb('aliases').defaultTo('[]');
    t.text('description').nullable();
    t.string('motivation', 200).nullable();
    t.string('sophistication', 50).defaultTo('LOW');
    t.string('status', 50).defaultTo('ACTIVE');
    t.date('first_seen').nullable();
    t.date('last_seen').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('indicators', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('threat_actor_id').notNullable().references('id').inTable('threat_actors').onDelete('CASCADE').index();
    t.string('type', 50).notNullable();
    t.string('value', 500).notNullable();
    t.integer('confidence').defaultTo(50);
    t.timestamp('first_seen').nullable();
    t.timestamp('last_seen').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('indicators');
  await knex.schema.dropTableIfExists('threat_actors');
}
