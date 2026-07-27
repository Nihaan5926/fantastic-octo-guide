import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'tasking',
  version: '1.0.0',
  category: 'Operations',
  permissions: ['tasking:read', 'tasking:create', 'tasking:update', 'tasking:delete'],
  apiPrefix: '/api/tasking',
  navItems: [
    { label: 'Tasking', path: '/tasking', icon: 'Activity', category: 'Operations', order: 23 },
  ],
  dashboardWidgets: [
    { id: 'tasking-assignments', title: 'Tasking Assignments', icon: 'Activity', defaultWidth: 6, defaultHeight: 3 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
