import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'sources',
  version: '1.0.0',
  category: 'Core Intel',
  permissions: ['sources:read', 'sources:create', 'sources:update', 'sources:delete'],
  apiPrefix: '/api/sources',
  navItems: [
    { label: 'Sources', path: '/sources', icon: 'Users', category: 'CORE INTEL', order: 11 },
  ],
  dashboardWidgets: [],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
