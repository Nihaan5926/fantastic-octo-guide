import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'geoint',
  version: '1.0.0',
  category: 'INT Disciplines',
  permissions: ['geoint:read', 'geoint:create', 'geoint:update', 'geoint:delete'],
  apiPrefix: '/api/geoint',
  navItems: [
    { label: 'GEOINT', path: '/geoint', icon: 'Map', category: 'INT Disciplines', order: 20 },
  ],
  dashboardWidgets: [
    { id: 'geoint-features', title: 'GEOINT Features', icon: 'Map', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
