import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'archive',
  version: '1.0.0',
  category: 'Oversight',
  permissions: ['archive:read', 'archive:create', 'archive:update', 'archive:delete'],
  apiPrefix: '/api/archive',
  navItems: [
    { label: 'Archive', path: '/archive', icon: 'Archive', category: 'OVERSIGHT', order: 42 },
  ],
  dashboardWidgets: [
    { id: 'archive-status', title: 'Archive Status', icon: 'Archive', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
