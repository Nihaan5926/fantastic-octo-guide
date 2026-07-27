import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Make all user FK columns nullable as a safety net
  // in case the server-side code fix hasn't been deployed yet.
  // Columns already handled in 002_fix_not_null are excluded
  // (shift_schedules.user_id, watch_logs.author_id, sitreps.author_id).

  // ── Evidence ──
  await knex.raw('ALTER TABLE evidence ALTER COLUMN uploaded_by DROP NOT NULL').catch(() => {});

  // ── GEOINT ──
  await knex.raw('ALTER TABLE geoint_features ALTER COLUMN analyst_id DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE geoint_annotations ALTER COLUMN author_id DROP NOT NULL').catch(() => {});

  // ── Collection Management ──
  await knex.raw('ALTER TABLE collection_requirements ALTER COLUMN requester_id DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE collection_pirs ALTER COLUMN created_by DROP NOT NULL').catch(() => {});

  // ── Tasking ──
  await knex.raw('ALTER TABLE tasking_assignments ALTER COLUMN assigned_to DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE tasking_assignments ALTER COLUMN assigned_by DROP NOT NULL').catch(() => {});

  // ── Biometrics ──
  await knex.raw('ALTER TABLE biometric_records ALTER COLUMN collector_id DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE biometric_watchlists ALTER COLUMN owner_id DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE biometric_encounters ALTER COLUMN encountered_by DROP NOT NULL').catch(() => {});

  // ── CI (Counter-Intelligence) ──
  await knex.raw('ALTER TABLE ci_investigations ALTER COLUMN lead_investigator_id DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE ci_insider_threats ALTER COLUMN reported_by DROP NOT NULL').catch(() => {});

  // ── Liaison ──
  await knex.raw('ALTER TABLE partner_contact_logs ALTER COLUMN contactor_id DROP NOT NULL').catch(() => {});

  // ── Announcements ──
  await knex.raw('ALTER TABLE announcements ALTER COLUMN created_by DROP NOT NULL').catch(() => {});

  // ── OSINT ──
  await knex.raw('ALTER TABLE osint_collection_tasks ALTER COLUMN created_by DROP NOT NULL').catch(() => {});

  // ── Messaging ──
  await knex.raw('ALTER TABLE message_channels ALTER COLUMN created_by DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE secure_messages ALTER COLUMN sender_id DROP NOT NULL').catch(() => {});

  // ── Core / Polymorphic ──
  await knex.raw('ALTER TABLE entity_comments ALTER COLUMN author_id DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE entity_attachments ALTER COLUMN uploaded_by DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE entity_relationships ALTER COLUMN created_by DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE activity_feed ALTER COLUMN user_id DROP NOT NULL').catch(() => {});

  // ── Missions ──
  await knex.raw('ALTER TABLE mission_plans ALTER COLUMN commander_id DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE mission_briefs ALTER COLUMN prepared_by DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE mission_debriefs ALTER COLUMN author_id DROP NOT NULL').catch(() => {});

  // ── Training ──
  await knex.raw('ALTER TABLE training_enrollments ALTER COLUMN user_id DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE after_action_reports ALTER COLUMN author_id DROP NOT NULL').catch(() => {});

  // ── Legal ──
  await knex.raw('ALTER TABLE legal_reviews ALTER COLUMN requested_by DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE compliance_checks ALTER COLUMN checked_by DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE legal_holds ALTER COLUMN created_by DROP NOT NULL').catch(() => {});

  // ── Reports ──
  await knex.raw('ALTER TABLE intelligence_reports ALTER COLUMN author_id DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE report_versions ALTER COLUMN edited_by DROP NOT NULL').catch(() => {});

  // ── Targeting ──
  await knex.raw('ALTER TABLE target_packages ALTER COLUMN author_id DROP NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE target_nominations ALTER COLUMN nominator_id DROP NOT NULL').catch(() => {});

  // ── Briefings ──
  await knex.raw('ALTER TABLE briefings ALTER COLUMN prepared_by DROP NOT NULL').catch(() => {});
}

export async function down(knex: Knex): Promise<void> {
  // Re-add NOT NULL constraints (reverse order)
  await knex.raw('ALTER TABLE briefings ALTER COLUMN prepared_by SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE target_nominations ALTER COLUMN nominator_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE target_packages ALTER COLUMN author_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE report_versions ALTER COLUMN edited_by SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE intelligence_reports ALTER COLUMN author_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE legal_holds ALTER COLUMN created_by SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE compliance_checks ALTER COLUMN checked_by SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE legal_reviews ALTER COLUMN requested_by SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE after_action_reports ALTER COLUMN author_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE training_enrollments ALTER COLUMN user_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE mission_debriefs ALTER COLUMN author_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE mission_briefs ALTER COLUMN prepared_by SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE mission_plans ALTER COLUMN commander_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE activity_feed ALTER COLUMN user_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE entity_relationships ALTER COLUMN created_by SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE entity_attachments ALTER COLUMN uploaded_by SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE entity_comments ALTER COLUMN author_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE secure_messages ALTER COLUMN sender_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE message_channels ALTER COLUMN created_by SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE osint_collection_tasks ALTER COLUMN created_by SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE announcements ALTER COLUMN created_by SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE partner_contact_logs ALTER COLUMN contactor_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE ci_insider_threats ALTER COLUMN reported_by SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE ci_investigations ALTER COLUMN lead_investigator_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE biometric_encounters ALTER COLUMN encountered_by SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE biometric_watchlists ALTER COLUMN owner_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE biometric_records ALTER COLUMN collector_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE tasking_assignments ALTER COLUMN assigned_by SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE tasking_assignments ALTER COLUMN assigned_to SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE collection_pirs ALTER COLUMN created_by SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE collection_requirements ALTER COLUMN requester_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE geoint_annotations ALTER COLUMN author_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE geoint_features ALTER COLUMN analyst_id SET NOT NULL').catch(() => {});
  await knex.raw('ALTER TABLE evidence ALTER COLUMN uploaded_by SET NOT NULL').catch(() => {});
}
