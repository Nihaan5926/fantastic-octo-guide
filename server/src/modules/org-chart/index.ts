import type { Module } from '../../core/types';
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

const mod: Module = { manifest, router, migrations: [] };
export default mod;
