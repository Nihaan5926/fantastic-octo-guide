import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'targeting',
  version: '1.0.0',
  category: 'Operations',
  permissions: ['targeting:read', 'targeting:create', 'targeting:update', 'targeting:delete'],
  apiPrefix: '/api/targeting',
  navItems: [
    { label: 'Targeting', path: '/targeting', icon: 'Crosshair', category: 'Operations', order: 21 },
  ],
  dashboardWidgets: [
    { id: 'target-packages', title: 'Target Packages', icon: 'Crosshair', defaultWidth: 6, defaultHeight: 3 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
