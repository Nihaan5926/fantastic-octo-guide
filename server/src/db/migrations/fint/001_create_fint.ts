import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('fint_entities', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 500).notNullable();
    t.string('entity_type', 50).notNullable().defaultTo('PERSON');
    t.string('jurisdiction', 200).nullable();
    t.string('registration_number', 200).nullable();
    t.integer('risk_score').defaultTo(0);
    t.jsonb('sanctions_list').defaultTo('[]');
    t.text('description').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('fint_transactions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('transaction_ref', 200).notNullable();
    t.decimal('amount', 18, 4).notNullable();
    t.string('currency', 10).notNullable().defaultTo('USD');
    t.uuid('sender_entity_id').nullable().references('id').inTable('fint_entities').onDelete('SET NULL').index();
    t.uuid('receiver_entity_id').nullable().references('id').inTable('fint_entities').onDelete('SET NULL').index();
    t.timestamp('transaction_date').nullable();
    t.string('transaction_type', 100).nullable();
    t.text('description').nullable();
    t.boolean('flagged').defaultTo(false);
    t.text('flag_reason').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('fint_transactions');
  await knex.schema.dropTableIfExists('fint_entities');
}
