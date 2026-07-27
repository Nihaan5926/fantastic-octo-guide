import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'ci',
  version: '1.0.0',
  category: 'INT Disciplines',
  permissions: ['ci:read', 'ci:create', 'ci:update', 'ci:delete'],
  apiPrefix: '/api/ci',
  navItems: [
    { label: 'CI', path: '/ci', icon: 'UserX', category: 'INT Disciplines', order: 22 },
  ],
  dashboardWidgets: [
    { id: 'ci-investigations', title: 'CI Investigations', icon: 'UserX', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
