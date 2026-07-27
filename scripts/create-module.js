const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const params = {};
for (const arg of args) {
  const [key, ...rest] = arg.split('=');
  const value = rest.join('=');
  if (key.startsWith('--')) {
    params[key.slice(2)] = value;
  }
}

const name = params.name || 'new-module';
const display = params.display || name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const category = params.category || 'Uncategorized';
const icon = params.icon || 'Box';

const root = path.resolve(__dirname, '..');

// Server module
const serverDir = path.join(root, 'server', 'src', 'modules', name);
fs.mkdirSync(serverDir, { recursive: true });

const serverIndex = `import { Router } from 'express';
import type { Module, ModuleContext } from '../../core/types';
import router from './router';

const manifest = {
  name: '${name}',
  version: '1.0.0',
  category: '${category}',
  permissions: ['${name}:read', '${name}:create', '${name}:update', '${name}:delete'],
  apiPrefix: '/api/${name}',
  navItems: [
    {
      label: '${display}',
      path: '/${name}',
      icon: '${icon}',
      category: '${category.toUpperCase()}',
      order: 100,
    },
  ],
  dashboardWidgets: [],
  globalSearchEnabled: false,
} as const;

const mod = {
  manifest,
  router,
  migrations: [],
};

export default mod;
`;

const serverRouter = `import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { db } from '../../db/knex';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await db('${name}').select('*').orderBy('created_at', 'desc');
    res.json({ data: items });
  } catch (e) { next(e); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('${name}').where({ id: req.params.id }).first();
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('${name}').insert(req.body).returning('*');
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('${name}').where({ id: req.params.id }).update(req.body).returning('*');
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('${name}').where({ id: req.params.id }).del();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
`;

// Migration
const migDir = path.join(root, 'server', 'src', 'db', 'migrations', name);
fs.mkdirSync(migDir, { recursive: true });

const migration = `import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('${name}', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('title', 500).notNullable();
    t.text('description').nullable();
    t.string('status', 50).defaultTo('active');
    t.jsonb('metadata').defaultTo('{}');
    t.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('${name}');
}
`;

// Client module
const clientDir = path.join(root, 'client', 'src', 'modules', name);
const clientPagesDir = path.join(clientDir, 'pages');
const clientComponentsDir = path.join(clientDir, 'components');
fs.mkdirSync(clientDir, { recursive: true });
fs.mkdirSync(clientPagesDir, { recursive: true });
fs.mkdirSync(clientComponentsDir, { recursive: true });

const clientIndex = `export default {
  name: '${name}',
  routes: [
    { path: '/${name}', element: null }, // Lazy-loaded component
    { path: '/${name}/:id', element: null },
  ],
  navItems: [
    {
      label: '${display}',
      path: '/${name}',
      icon: '${icon}',
      category: '${category.toUpperCase()}',
      order: 100,
    },
  ],
  dashboardWidgets: [],
  permissions: ['${name}:read', '${name}:create', '${name}:update', '${name}:delete'],
};
`;

const clientApi = `import api from '../../api/client';

export const moduleNameApi = {
  list: () => api.get('/${name}'),
  get: (id: string) => api.get(\`/${name}/\${id}\`),
  create: (data: any) => api.post('/${name}', data),
  update: (id: string, data: any) => api.put(\`/${name}/\${id}\`, data),
  delete: (id: string) => api.delete(\`/${name}/\${id}\`),
};
`;

const clientListPage = `import React from 'react';

export default function ${display.replace(/\s+/g, '')}List() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">${display}</h1>
      <div className="card text-center py-16">
        <p className="text-text-muted">Module scaffolded. Implement your list view here.</p>
      </div>
    </div>
  );
}
`;

// Write all files
fs.writeFileSync(path.join(serverDir, 'index.ts'), serverIndex);
fs.writeFileSync(path.join(serverDir, 'router.ts'), serverRouter);
fs.writeFileSync(path.join(migDir, `001_create_${name}.ts`), migration);
fs.writeFileSync(path.join(clientDir, 'index.ts'), clientIndex);
fs.writeFileSync(path.join(clientDir, 'api.ts'), clientApi);
fs.writeFileSync(path.join(clientPagesDir, `${name.replace(/-/g, '')}List.tsx`), clientListPage);

console.log(`[Scaffold] Module "${name}" created successfully!`);
console.log(`  Server: server/src/modules/${name}/`);
console.log(`  Client: client/src/modules/${name}/`);
console.log(`  Migration: server/src/db/migrations/${name}/`);
console.log('');
console.log('Next steps:');
console.log(`  1. Edit server/src/modules/${name}/router.ts — add your business logic`);
console.log(`  2. Edit client/src/modules/${name}/pages/ — build your UI`);
console.log(`  3. Run: npm run db:migrate`);
console.log(`  4. Import in client/src/App.tsx and register routes`);
