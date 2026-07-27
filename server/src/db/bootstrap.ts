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
      name: 'personnel_assignments',
      sql: `CREATE TABLE IF NOT EXISTS personnel_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL, org_unit_id uuid NOT NULL,
        position_title varchar(200), is_primary boolean DEFAULT false,
        start_date date, end_date date, created_at timestamptz DEFAULT now()
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
