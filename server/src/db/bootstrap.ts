// Universal DB bootstrapper — ensures ALL required tables/columns exist at startup
import knex from 'knex';

export async function bootstrapDatabase(db: knex.Knex) {
  console.log('[Bootstrap] Checking database schema...');

  const tables = [
    // Auth tables
    {
      name: 'user_sessions',
      sql: `CREATE TABLE IF NOT EXISTS user_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        token_hash varchar(500), ip_address varchar(50), user_agent text,
        created_at timestamptz DEFAULT now(), expires_at timestamptz,
        is_active boolean DEFAULT true
      )`
    },
    {
      name: 'password_reset_tokens',
      sql: `CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        token varchar(500) UNIQUE, expires_at timestamptz NOT NULL,
        created_at timestamptz DEFAULT now()
      )`
    },
    {
      name: 'login_history',
      sql: `CREATE TABLE IF NOT EXISTS login_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        ip_address varchar(50), user_agent text,
        success boolean DEFAULT true, created_at timestamptz DEFAULT now()
      )`
    },
    // Admin tables
    {
      name: 'announcements',
      sql: `CREATE TABLE IF NOT EXISTS announcements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(500) NOT NULL, content text, severity varchar(20) DEFAULT 'info',
        is_active boolean DEFAULT true, starts_at timestamptz, expires_at timestamptz,
        created_by uuid REFERENCES users(id), created_at timestamptz DEFAULT now()
      )`
    },
    {
      name: 'api_keys',
      sql: `CREATE TABLE IF NOT EXISTS api_keys (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        name varchar(200), key_hash varchar(500), scopes TEXT[] DEFAULT '{}',
        last_used_at timestamptz, expires_at timestamptz,
        is_active boolean DEFAULT true, created_at timestamptz DEFAULT now()
      )`
    },
    // Collection Management
    {
      name: 'collection_pirs',
      sql: `CREATE TABLE IF NOT EXISTS collection_pirs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        reference_number varchar(50) UNIQUE NOT NULL,
        title varchar(500) NOT NULL,
        description text,
        priority varchar(20) DEFAULT 'MEDIUM',
        status varchar(50) DEFAULT 'ACTIVE',
        requirement_id uuid REFERENCES collection_requirements(id) ON DELETE SET NULL,
        created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        metadata jsonb DEFAULT '{}',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )`
    },
    // Reports
    {
      name: 'report_versions',
      sql: `CREATE TABLE IF NOT EXISTS report_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id uuid REFERENCES intelligence_reports(id) ON DELETE CASCADE,
        version_num INT NOT NULL, title varchar(500), content jsonb, summary text,
        classification varchar(50), edited_by uuid REFERENCES users(id),
        edited_at timestamptz DEFAULT now()
      )`
    },
    // Missions
    {
      name: 'mission_roster',
      sql: `CREATE TABLE IF NOT EXISTS mission_roster (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        mission_id uuid REFERENCES mission_plans(id) ON DELETE CASCADE,
        user_id uuid REFERENCES users(id), role varchar(50),
        assigned_at timestamptz DEFAULT now()
      )`
    },
    // Training
    {
      name: 'training_courses',
      sql: `CREATE TABLE IF NOT EXISTS training_courses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(300) NOT NULL, description text, course_type varchar(50),
        duration_hours numeric(6,1), instructor varchar(200),
        is_required boolean DEFAULT false, certification_issued varchar(200),
        metadata jsonb DEFAULT '{}',
        created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
      )`
    },
    {
      name: 'training_enrollments',
      sql: `CREATE TABLE IF NOT EXISTS training_enrollments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id uuid, user_id uuid,
        status varchar(50) DEFAULT 'ENROLLED', enrolled_at timestamptz DEFAULT now(),
        completed_at timestamptz, score numeric(5,1), notes text,
        metadata jsonb DEFAULT '{}',
        created_at timestamptz DEFAULT now(),
        UNIQUE(course_id, user_id)
      )`
    },
    {
      name: 'after_action_reports',
      sql: `CREATE TABLE IF NOT EXISTS after_action_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(500) NOT NULL, exercise_name varchar(300), date date,
        summary text, findings jsonb DEFAULT '[]', recommendations jsonb DEFAULT '[]',
        participants jsonb DEFAULT '[]', author_id uuid,
        metadata jsonb DEFAULT '{}',
        created_at timestamptz DEFAULT now()
      )`
    },
    {
      name: 'course_prerequisites',
      sql: `CREATE TABLE IF NOT EXISTS course_prerequisites (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id uuid REFERENCES training_courses(id) ON DELETE CASCADE,
        prerequisite_course_id uuid REFERENCES training_courses(id),
        created_at timestamptz DEFAULT now()
      )`
    },
    // Budget
    {
      name: 'budget_line_items',
      sql: `CREATE TABLE IF NOT EXISTS budget_line_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        budget_id uuid REFERENCES program_budgets(id) ON DELETE CASCADE,
        description varchar(500), category varchar(100), amount numeric(15,2),
        created_at timestamptz DEFAULT now()
      )`
    },
    // Legal
    {
      name: 'legal_holds',
      sql: `CREATE TABLE IF NOT EXISTS legal_holds (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(500), entity_type varchar(100), entity_id uuid,
        created_by uuid REFERENCES users(id), reason text,
        placed_at timestamptz DEFAULT now(), released_at timestamptz,
        status varchar(50) DEFAULT 'ACTIVE'
      )`
    },
    // Personnel
    {
      name: 'personnel_records',
      sql: `CREATE TABLE IF NOT EXISTS personnel_records (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid, date_of_birth date, nationality varchar(100),
        position_title varchar(200), clearance_level varchar(50), clearance_expiry date,
        special_accesses jsonb DEFAULT '[]', languages jsonb DEFAULT '[]',
        skills jsonb DEFAULT '[]', certifications jsonb DEFAULT '[]',
        notes text, metadata jsonb DEFAULT '{}',
        created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
      )`
    },
    {
      name: 'org_units',
      sql: `CREATE TABLE IF NOT EXISTS org_units (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(200) NOT NULL, parent_id uuid, unit_type varchar(50),
        commander_id uuid, description text, location varchar(200),
        established_date date, metadata jsonb DEFAULT '{}',
        created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
      )`
    },
    {
      name: 'personnel_assignments',
      sql: `CREATE TABLE IF NOT EXISTS personnel_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid, org_unit_id uuid,
        position_title varchar(200), is_primary boolean DEFAULT false,
        start_date date, end_date date, created_at timestamptz DEFAULT now()
      )`
    },
    // Watch Center
    {
      name: 'shift_schedules',
      sql: `CREATE TABLE IF NOT EXISTS shift_schedules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid, shift_name varchar(100), start_time time, end_time time,
        days jsonb DEFAULT '[]', is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
      )`
    },
    {
      name: 'watch_logs',
      sql: `CREATE TABLE IF NOT EXISTS watch_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        shift_id uuid, author_id uuid,
        log_type varchar(50) DEFAULT 'GENERAL', title varchar(300) NOT NULL,
        content text, severity varchar(20) DEFAULT 'INFO',
        status varchar(50) DEFAULT 'OPEN', acknowledged_by uuid,
        acknowledged_at timestamptz, metadata jsonb DEFAULT '{}',
        created_at timestamptz DEFAULT now()
      )`
    },
    {
      name: 'sitreps',
      sql: `CREATE TABLE IF NOT EXISTS sitreps (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        reference_number varchar(50) UNIQUE, title varchar(500),
        period_start timestamptz, period_end timestamptz,
        author_id uuid, classification varchar(50) DEFAULT 'UNCLASSIFIED',
        content jsonb DEFAULT '{}', status varchar(50) DEFAULT 'DRAFT',
        metadata jsonb DEFAULT '{}',
        created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
      )`
    },
  ];

  // Create each missing table
  for (const table of tables) {
    try {
      if (!await db.schema.hasTable(table.name)) {
        await db.raw(table.sql);
        console.log(`[Bootstrap] Created table: ${table.name}`);
      }
    } catch (e: any) {
      console.warn(`[Bootstrap] Failed to create ${table.name}:`, e.message);
    }
  }

  // Add missing columns to users table
  try {
    const columns = [
      { name: 'failed_login_attempts', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0' },
      { name: 'locked_until', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until timestamptz' },
      { name: 'totp_secret', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret text' },
      { name: 'totp_enabled', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled boolean DEFAULT false' },
      { name: 'totp_verified', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_verified boolean DEFAULT false' },
      { name: 'avatar_url', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url varchar(1000)' },
    ];
    for (const col of columns) {
      const exists = await db.schema.hasColumn('users', col.name);
      if (!exists) {
        await db.raw(col.sql);
        console.log(`[Bootstrap] Added column: users.${col.name}`);
      }
    }
  } catch (e: any) {
    console.warn('[Bootstrap] Column migration failed:', e.message);
  }

  // Add parent_case_id to cases
  try {
    if (!await db.schema.hasColumn('cases', 'parent_case_id')) {
      await db.raw('ALTER TABLE cases ADD COLUMN IF NOT EXISTS parent_case_id uuid REFERENCES cases(id)');
      console.log('[Bootstrap] Added column: cases.parent_case_id');
    }
  } catch (e: any) {
    console.warn('[Bootstrap] cases.parent_case_id failed:', e.message);
  }

  // Add parent_id to secure_messages
  try {
    if (!await db.schema.hasColumn('secure_messages', 'parent_id')) {
      await db.raw('ALTER TABLE secure_messages ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES secure_messages(id)');
      console.log('[Bootstrap] Added column: secure_messages.parent_id');
    }
  } catch (e: any) {
    console.warn('[Bootstrap] secure_messages.parent_id failed:', e.message);
  }

  // Add submitted_at, approved_by, approved_at, rejection_reason to intelligence_reports
  try {
    const reportCols = [
      { name: 'submitted_at', sql: 'ALTER TABLE intelligence_reports ADD COLUMN IF NOT EXISTS submitted_at timestamptz' },
      { name: 'approved_by', sql: 'ALTER TABLE intelligence_reports ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id)' },
      { name: 'approved_at', sql: 'ALTER TABLE intelligence_reports ADD COLUMN IF NOT EXISTS approved_at timestamptz' },
      { name: 'rejection_reason', sql: 'ALTER TABLE intelligence_reports ADD COLUMN IF NOT EXISTS rejection_reason text' },
    ];
    for (const col of reportCols) {
      if (!await db.schema.hasColumn('intelligence_reports', col.name)) {
        await db.raw(col.sql);
        console.log(`[Bootstrap] Added column: intelligence_reports.${col.name}`);
      }
    }
  } catch (e: any) {
    console.warn('[Bootstrap] Report columns failed:', e.message);
  }

  // Add targeting columns
  try {
    const targetCols = [
      { name: 'vetting_notes', sql: 'ALTER TABLE target_packages ADD COLUMN IF NOT EXISTS vetting_notes text' },
      { name: 'executed_at', sql: 'ALTER TABLE target_packages ADD COLUMN IF NOT EXISTS executed_at timestamptz' },
      { name: 'bda_results', sql: 'ALTER TABLE target_packages ADD COLUMN IF NOT EXISTS bda_results jsonb' },
    ];
    for (const col of targetCols) {
      if (!await db.schema.hasColumn('target_packages', col.name)) {
        await db.raw(col.sql);
        console.log(`[Bootstrap] Added column: target_packages.${col.name}`);
      }
    }
  } catch (e: any) {
    console.warn('[Bootstrap] Target columns failed:', e.message);
  }

  // Add course_date to training_courses
  try {
    if (!await db.schema.hasColumn('training_courses', 'course_date')) {
      await db.raw('ALTER TABLE training_courses ADD COLUMN IF NOT EXISTS course_date date');
      console.log('[Bootstrap] Added column: training_courses.course_date');
    }
  } catch (e: any) {
    console.warn('[Bootstrap] course_date failed:', e.message);
  }

  // Fix NOT NULL constraints that prevent standalone record creation
  try {
    await db.raw('ALTER TABLE personnel_records ALTER COLUMN user_id DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE shift_schedules ALTER COLUMN user_id DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE watch_logs ALTER COLUMN author_id DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE sitreps ALTER COLUMN author_id DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE declassification_requests ALTER COLUMN record_id DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE mission_debriefs ADD COLUMN IF NOT EXISTS title varchar(500)').catch(() => {});
    await db.raw('ALTER TABLE sources ALTER COLUMN code_name DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE sources ALTER COLUMN type DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE cases ALTER COLUMN title DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE evidence ALTER COLUMN type DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE evidence ALTER COLUMN title DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE evidence ALTER COLUMN uploaded_by DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE osint_collection_tasks ALTER COLUMN title DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE osint_collection_tasks ALTER COLUMN created_by DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE entity_relationships ALTER COLUMN source_type DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE entity_relationships ALTER COLUMN source_id DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE entity_relationships ALTER COLUMN target_type DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE entity_relationships ALTER COLUMN target_id DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE entity_relationships ALTER COLUMN relationship_type DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE entity_relationships ALTER COLUMN created_by DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE training_courses ALTER COLUMN title DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE after_action_reports ALTER COLUMN title DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE after_action_reports ALTER COLUMN author_id DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE watch_logs ALTER COLUMN title DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE sitreps ALTER COLUMN reference_number DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE sitreps ALTER COLUMN title DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE tasking_assignments ALTER COLUMN reference_number DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE tasking_assignments ALTER COLUMN title DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE tasking_assignments ALTER COLUMN status DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE tasking_assignments ALTER COLUMN assigned_to DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE tasking_assignments ALTER COLUMN assigned_by DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE sigint_intercepts ALTER COLUMN reference_number DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE sigint_intercepts ALTER COLUMN title DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE sigint_intercepts ALTER COLUMN analyst_id DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE sigint_intercepts ALTER COLUMN classification DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE sigint_intercepts ALTER COLUMN status DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE sigint_emitters ALTER COLUMN name DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE ci_investigations ALTER COLUMN reference_number DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE ci_investigations ALTER COLUMN title DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE ci_investigations ALTER COLUMN investigation_type DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE ci_investigations ALTER COLUMN status DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE ci_investigations ALTER COLUMN classification DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE ci_investigations ALTER COLUMN lead_investigator_id DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE ci_foreign_agents ALTER COLUMN name DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE ci_insider_threats ALTER COLUMN reported_by DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE fint_entities ALTER COLUMN name DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE fint_entities ALTER COLUMN entity_type DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE fint_transactions ALTER COLUMN transaction_ref DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE fint_transactions ALTER COLUMN amount DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE fint_transactions ALTER COLUMN currency DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE biometric_records ALTER COLUMN subject_name DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE biometric_records ALTER COLUMN biometric_type DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE biometric_records ALTER COLUMN record_data DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE biometric_records ALTER COLUMN collector_id DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE biometric_records ALTER COLUMN classification DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE biometric_watchlists ALTER COLUMN name DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE biometric_watchlists ALTER COLUMN owner_id DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE biometric_encounters ALTER COLUMN encountered_by DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE external_partners ALTER COLUMN name DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE mou_agreements ALTER COLUMN title DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE mou_agreements ALTER COLUMN partner_id DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE partner_contact_logs ALTER COLUMN partner_id DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE partner_contact_logs ALTER COLUMN contactor_id DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE archive_records ALTER COLUMN reference_number DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE archive_records ALTER COLUMN title DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE archive_records ALTER COLUMN archived_by DROP NOT NULL').catch(() => {});
    await db.raw('ALTER TABLE declassification_requests ALTER COLUMN requested_by DROP NOT NULL').catch(() => {});
  } catch(e: any) {}

  // Repair: if any uuid columns were accidentally converted to varchar, convert back
  console.log('[Bootstrap] Repairing uuid column types...');
  try {
    const cols = await db('information_schema.columns')
      .select('table_name', 'column_name')
      .where({ table_schema: 'public', data_type: 'character varying' });
    let repaired = 0;
    for (const c of cols) {
      if (c.column_name.endsWith('_id') || c.column_name === 'id') {
        try {
          await db.raw(`ALTER TABLE "${c.table_name}" ALTER COLUMN "${c.column_name}" TYPE uuid USING "${c.column_name}"::uuid`);
          repaired++;
        } catch { /* non-uuid data, leave as varchar */ }
      }
    }
    console.log(`[Bootstrap] Repaired ${repaired} varchar->_id columns back to uuid`);
  } catch(e: any) { console.warn('[Bootstrap] UUID repair failed:', e.message); }

  // Drop all foreign key constraints for fully independent data entry
  console.log('[Bootstrap] Dropping foreign key constraints...');
  try {
    const fks = await db('information_schema.table_constraints')
      .select('table_name', 'constraint_name')
      .where({ constraint_type: 'FOREIGN KEY', table_schema: 'public' });
    let dropped = 0;
    for (const fk of fks) {
      await db.raw(`ALTER TABLE "${fk.table_name}" DROP CONSTRAINT IF EXISTS "${fk.constraint_name}"`).catch(() => {});
      dropped++;
    }
    console.log(`[Bootstrap] Dropped ${dropped} foreign key constraints`);
  } catch(e: any) { console.warn('[Bootstrap] FK drop failed:', e.message); }

  console.log('[Bootstrap] Database schema check complete.');
}

// Allow running standalone: node dist/db/bootstrap.js
if (require.main === module) {
  const knex = require('knex');
  const db = knex({
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'intel_admin',
      password: process.env.DB_PASSWORD || 'intel_secret_dev',
      database: process.env.DB_NAME || 'intel_platform',
    },
  });
  bootstrapDatabase(db).then(() => {
    console.log('[Bootstrap] Done.');
    db.destroy();
    process.exit(0);
  }).catch((e: any) => {
    console.error('[Bootstrap] Fatal:', e.message);
    db.destroy();
    process.exit(1);
  });
}
