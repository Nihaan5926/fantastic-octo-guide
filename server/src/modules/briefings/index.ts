import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'briefings',
  version: '1.0.0',
  category: 'Dissemination',
  permissions: ['briefings:read', 'briefings:create', 'briefings:update', 'briefings:delete'],
  apiPrefix: '/api/briefings',
  navItems: [
    { label: 'Briefings', path: '/briefings', icon: 'Presentation', category: 'DISSEMINATION', order: 30 },
  ],
  dashboardWidgets: [
    { id: 'upcoming-briefings', title: 'Upcoming Briefings', icon: 'Presentation', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
