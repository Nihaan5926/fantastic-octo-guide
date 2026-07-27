import { db } from './knex';
import path from 'path';
import fs from 'fs';

async function runMigrations(direction: 'up' | 'down' = 'up') {
  console.log(`[Migrate] Running migrations ${direction}...`);

  try {
    await db.raw('SELECT 1');
  } catch (err: any) {
    console.error('[Migrate] Cannot connect to database:', err.message);
    process.exit(1);
  }

  // Ensure migrations tracking table
  if (!await db.schema.hasTable('migrations')) {
    await db.schema.createTable('migrations', (t) => {
      t.string('name').primary();
      t.timestamp('run_at').defaultTo(db.fn.now());
    });
  }

  const migrationsDir = path.resolve(__dirname, 'migrations');

  // Walk all subdirectories under migrations/ for migration files
  function walkMigrations(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walkMigrations(full));
      } else if ((entry.name.endsWith('.ts') || entry.name.endsWith('.js')) && !entry.name.endsWith('.d.ts')) {
        files.push(full);
      }
    }
    return files;
  }

  const allFilesUnsorted = walkMigrations(migrationsDir);
  const allFiles = allFilesUnsorted.sort((a, b) => {
    const aCore = a.includes(path.sep + 'core' + path.sep);
    const bCore = b.includes(path.sep + 'core' + path.sep);
    if (aCore && !bCore) return -1;
    if (!aCore && bCore) return 1;
    return a.localeCompare(b);
  });

  if (direction === 'up') {
    for (const file of allFiles) {
      const mig = require(file);
      if (!mig.up) continue;
      const name = path.basename(path.dirname(file)) + '_' + path.basename(file, path.extname(file));
      const already = await db('migrations').where({ name }).first();
      if (already) {
        console.log(`  [skip] ${name}`);
        continue;
      }
      await mig.up(db);
      console.log(`  [ok]   ${name}`);
    }
  } else {
    // Rollback: reverse order, skip polymorphic migration tables if roles/users still exist
    for (const file of allFiles.reverse()) {
      const mig = require(file);
      if (!mig.down) continue;
      const name = path.basename(path.dirname(file)) + '_' + path.basename(file, path.extname(file));
      const already = await db('migrations').where({ name }).first();
      if (!already) {
        console.log(`  [skip] ${name} (not applied)`);
        continue;
      }
      await mig.down(db);
      console.log(`  [ok]   ${name} (rolled back)`);
    }
  }

  console.log('[Migrate] Done.');
  await db.destroy();
}

const direction = process.argv[2] === 'down' ? 'down' : 'up';
runMigrations(direction);
