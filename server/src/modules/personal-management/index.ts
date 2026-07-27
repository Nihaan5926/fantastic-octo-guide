import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'personal-management',
  version: '1.0.0',
  category: 'Personnel',
  permissions: ['personnel:read', 'personnel:create', 'personnel:update', 'personnel:delete'],
  apiPrefix: '/api/personnel',
  navItems: [
    { label: 'Personnel', path: '/personnel', icon: 'UserCheck', category: 'PERSONNEL', order: 20 },
  ],
  dashboardWidgets: [
    { id: 'personnel-summary', title: 'Personnel Summary', icon: 'UserCheck', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
