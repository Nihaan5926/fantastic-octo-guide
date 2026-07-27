import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'sigint',
  version: '1.0.0',
  category: 'INT Disciplines',
  permissions: ['sigint:read', 'sigint:create', 'sigint:update', 'sigint:delete'],
  apiPrefix: '/api/sigint',
  navItems: [
    { label: 'SIGINT', path: '/sigint', icon: 'Radio', category: 'INT Disciplines', order: 21 },
  ],
  dashboardWidgets: [
    { id: 'sigint-intercepts', title: 'SIGINT Intercepts', icon: 'Radio', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
