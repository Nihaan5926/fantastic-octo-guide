import { db } from './knex';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

async function seed() {
  console.log('[Seed] Seeding database...');

  // Roles
  const adminRoleId = uuid();
  const analystRoleId = uuid();
  const viewerRoleId = uuid();

  const existing = await db('roles').first();
  if (!existing) {
    await db('roles').insert([
      { id: adminRoleId, name: 'ADMIN', description: 'Full system access', permissions: JSON.stringify(['*']) },
      { id: analystRoleId, name: 'ANALYST', description: 'Can create/edit reports, sources, cases', permissions: JSON.stringify([
        'reports:read', 'reports:create', 'reports:update',
        'sources:read', 'sources:create', 'sources:update',
        'cases:read', 'cases:create', 'cases:update',
        'evidence:read', 'evidence:create',
        'threats:read', 'threats:create',
        'osint:read', 'osint:create',
        'analysis:read', 'analysis:create',
      ]) },
      { id: viewerRoleId, name: 'VIEWER', description: 'Read-only access', permissions: JSON.stringify([
        'reports:read', 'sources:read', 'cases:read', 'evidence:read',
        'threats:read', 'osint:read', 'analysis:read',
      ]) },
    ]);
    console.log('[Seed] Roles created');
  }

  // Admin user
  const adminExists = await db('users').where({ email: 'admin@intel.local' }).first();
  if (!adminExists) {
    const hash = await bcrypt.hash('admin123!', 12);
    await db('users').insert({
      id: uuid(),
      email: 'admin@intel.local',
      password_hash: hash,
      first_name: 'System',
      last_name: 'Administrator',
      rank: 'ADMIN',
      clearance: 'TOP_SECRET',
      role_id: adminRoleId,
      is_active: true,
    });
    console.log('[Seed] Admin user created (admin@intel.local / admin123!)');
  }

  // Sample analyst
  const analystExists = await db('users').where({ email: 'analyst@intel.local' }).first();
  if (!analystExists) {
    const hash = await bcrypt.hash('analyst123!', 12);
    await db('users').insert({
      id: uuid(),
      email: 'analyst@intel.local',
      password_hash: hash,
      first_name: 'Jane',
      last_name: 'Analyst',
      clearance: 'SECRET',
      role_id: analystRoleId,
      is_active: true,
    });
    console.log('[Seed] Analyst user created (analyst@intel.local / analyst123!)');
  }

  console.log('[Seed] Done.');
  await db.destroy();
}

seed();
