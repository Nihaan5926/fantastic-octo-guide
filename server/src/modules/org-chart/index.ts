import type { Module, ModuleContext } from '../../core/types';
import router from './router';

const manifest = {
  name: 'org-chart',
  version: '1.0.0',
  category: 'Personnel',
  permissions: ['org-chart:read', 'org-chart:create', 'org-chart:update', 'org-chart:delete'],
  apiPrefix: '/api/org-chart',
  navItems: [
    { label: 'Org Chart', path: '/org-chart', icon: 'Building2', category: 'PERSONNEL', order: 21 },
  ],
  dashboardWidgets: [
    { id: 'org-overview', title: 'Organization Overview', icon: 'Building2', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

async function ensureTables(ctx: ModuleContext) {
  try {
    if (!await ctx.db.schema.hasTable('personnel_assignments')) {
      await ctx.db.schema.createTable('personnel_assignments', (t: any) => {
        t.uuid('id').primary().defaultTo(ctx.db.raw('gen_random_uuid()'));
        t.uuid('user_id').notNullable();
        t.uuid('org_unit_id').notNullable();
        t.string('position_title', 200).nullable();
        t.boolean('is_primary').defaultTo(false);
        t.date('start_date').nullable();
        t.date('end_date').nullable();
        t.timestamp('created_at').defaultTo(ctx.db.fn.now());
      });
      console.log('[OrgChart] Created personnel_assignments table');
    }
  } catch (e: any) {
    console.warn('[OrgChart] Table ensure failed:', e.message);
  }
}

const mod: Module = { manifest, router, migrations: [], register: ensureTables };
export default mod;
