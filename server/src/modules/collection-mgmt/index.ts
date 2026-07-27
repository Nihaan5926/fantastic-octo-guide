import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'collection-mgmt',
  version: '1.0.0',
  category: 'Operations',
  permissions: ['collection:read', 'collection:create', 'collection:update', 'collection:delete'],
  apiPrefix: '/api/collection',
  navItems: [
    { label: 'Collection', path: '/collection', icon: 'ListChecks', category: 'Operations', order: 22 },
  ],
  dashboardWidgets: [
    { id: 'collection-requirements', title: 'Collection Requirements', icon: 'ListChecks', defaultWidth: 6, defaultHeight: 3 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
