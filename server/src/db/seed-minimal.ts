// Minimal seed — ensures essential data exists for first deploy
import { db } from './knex';

async function minimalSeed() {
  console.log('[Seed] Checking essential data...');

  // Ensure roles exist
  const roleCount = await db('roles').count('id').first().then((r: any) => parseInt(r.count, 10));
  if (roleCount === 0) {
    const { v4: uuid } = require('uuid');
    const bcrypt = require('bcryptjs');
    
    await db('roles').insert([
      { id: uuid(), name: 'ADMIN', description: 'Full system access', permissions: JSON.stringify(['*']) },
      { id: uuid(), name: 'ANALYST', description: 'Can create/edit reports, sources, cases', permissions: JSON.stringify(['reports:read','reports:create','reports:update','sources:read','sources:create','sources:update','cases:read','cases:create','cases:update','evidence:read','evidence:create','threats:read','threats:create','osint:read','osint:create','analysis:read','analysis:create']) },
      { id: uuid(), name: 'VIEWER', description: 'Read-only access', permissions: JSON.stringify(['reports:read','sources:read','cases:read','evidence:read','threats:read','osint:read','analysis:read']) },
    ]);
    console.log('[Seed] Default roles created');
  }

  // Ensure admin user exists
  const adminExists = await db('users').where({ email: 'admin@intel.local' }).first();
  if (!adminExists) {
    const { v4: uuid } = require('uuid');
    const bcrypt = require('bcryptjs');
    const adminRole = await db('roles').where({ name: 'ADMIN' }).first();
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123!', 12);
    await db('users').insert({
      id: uuid(),
      email: 'admin@intel.local',
      password_hash: hash,
      first_name: 'System',
      last_name: 'Administrator',
      clearance: 'TOP_SECRET',
      role_id: adminRole.id,
      is_active: true,
    });
    console.log('[Seed] Default admin user created');
  }

  console.log('[Seed] Complete.');
  await db.destroy();
}

minimalSeed().catch((err) => {
  console.error('[Seed] Failed:', err.message);
  process.exit(1);
});
