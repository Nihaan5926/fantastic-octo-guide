import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'osint',
  version: '1.0.0',
  category: 'Core Intel',
  permissions: ['osint:read', 'osint:create', 'osint:update', 'osint:delete'],
  apiPrefix: '/api/osint',
  navItems: [
    { label: 'OSINT', path: '/osint', icon: 'Globe', category: 'CORE INTEL', order: 14 },
  ],
  dashboardWidgets: [
    { id: 'osint-status', title: 'OSINT Collection Status', icon: 'Globe', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
