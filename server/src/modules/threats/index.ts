import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'threats',
  version: '1.0.0',
  category: 'Core Intel',
  permissions: ['threats:read', 'threats:create', 'threats:update', 'threats:delete'],
  apiPrefix: '/api/threats',
  navItems: [
    { label: 'Threats', path: '/threats', icon: 'Shield', category: 'CORE INTEL', order: 16 },
  ],
  dashboardWidgets: [
    { id: 'threat-summary', title: 'Threat Summary', icon: 'Shield', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
