import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'watch-center',
  version: '1.0.0',
  category: 'Personnel',
  permissions: ['watch-center:read', 'watch-center:create', 'watch-center:update', 'watch-center:delete'],
  apiPrefix: '/api/watch-center',
  navItems: [
    { label: 'Watch Center', path: '/watch-center', icon: 'Clock', category: 'PERSONNEL', order: 23 },
  ],
  dashboardWidgets: [
    { id: 'watch-summary', title: 'Watch Center', icon: 'Clock', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
