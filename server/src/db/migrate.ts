import { db } from './knex';
import path from 'path';
import fs from 'fs';

export async function runMigrations(direction: 'up' | 'down' = 'up') {
  console.log(`[Migrate] Running migrations ${direction}...`);

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

  let count = 0;
  if (direction === 'up') {
    for (const file of allFiles) {
      const mig = require(file);
      if (!mig.up) continue;
      const name = path.basename(path.dirname(file)) + '_' + path.basename(file, path.extname(file));
      const already = await db('migrations').where({ name }).first();
      if (already) {
        continue;
      }
      try {
        await mig.up(db);
        await db('migrations').insert({ name });
        count++;
        console.log(`  [ok]   ${name}`);
      } catch (e: any) {
        console.log(`  [skip] ${name}: ${e.message}`);
      }
    }
  }

  console.log(`[Migrate] Applied ${count} new migrations.`);
}

// Standalone CLI
if (require.main === module) {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  import('./knex').then(({ db: knexDb }) => {
    runMigrations(direction).then(() => {
      knexDb.destroy();
      process.exit(0);
    });
  });
}
