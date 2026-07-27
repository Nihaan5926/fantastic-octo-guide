import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'evidence',
  version: '1.0.0',
  category: 'Core Intel',
  permissions: ['evidence:read', 'evidence:create', 'evidence:delete'],
  apiPrefix: '/api/evidence',
  navItems: [
    { label: 'Evidence', path: '/evidence', icon: 'FolderOpen', category: 'CORE INTEL', order: 13 },
  ],
  dashboardWidgets: [],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
