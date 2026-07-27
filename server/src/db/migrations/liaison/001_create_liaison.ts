import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('external_partners', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 300).notNullable();
    t.string('organization', 300).nullable();
    t.string('partner_type', 100).nullable();
    t.jsonb('point_of_contact').defaultTo('{}');
    t.jsonb('contact_info').defaultTo('{}');
    t.string('status', 50).defaultTo('ACTIVE');
    t.integer('trust_level').nullable();
    t.timestamp('established_at').nullable();
    t.text('notes').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('mou_agreements', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('title', 500).notNullable();
    t.uuid('partner_id').notNullable().references('id').inTable('external_partners').onDelete('CASCADE');
    t.string('agreement_type', 100).nullable();
    t.date('effective_date').nullable();
    t.date('expiry_date').nullable();
    t.text('scope').nullable();
    t.string('classification', 50).defaultTo('UNCLASSIFIED');
    t.uuid('signed_by_us').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('signed_by_partner', 200).nullable();
    t.string('status', 50).defaultTo('DRAFT');
    t.string('document_path', 500).nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('partner_contact_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('partner_id').notNullable().references('id').inTable('external_partners').onDelete('CASCADE');
    t.uuid('contactor_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('contact_date').defaultTo(knex.fn.now());
    t.string('contact_method', 100).nullable();
    t.text('summary').nullable();
    t.string('disposition', 100).nullable();
    t.boolean('follow_up_required').defaultTo(false);
    t.date('follow_up_date').nullable();
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('partner_contact_logs');
  await knex.schema.dropTableIfExists('mou_agreements');
  await knex.schema.dropTableIfExists('external_partners');
}
