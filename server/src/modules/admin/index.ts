import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'admin',
  version: '1.0.0',
  category: 'Foundation',
  permissions: ['admin:*'],
  apiPrefix: '/api/admin',
  navItems: [
    { label: 'Users', path: '/admin/users', icon: 'Users', category: 'ADMIN', order: 90, permissions: ['admin:*'] },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'ListChecks', category: 'ADMIN', order: 91, permissions: ['admin:*'] },
  ],
  dashboardWidgets: [],
  globalSearchEnabled: false,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
