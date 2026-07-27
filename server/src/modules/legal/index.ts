import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'legal',
  version: '1.0.0',
  category: 'Oversight',
  permissions: ['legal:read', 'legal:create', 'legal:update', 'legal:delete'],
  apiPrefix: '/api/legal',
  navItems: [
    { label: 'Legal', path: '/legal', icon: 'Scale', category: 'OVERSIGHT', order: 40 },
  ],
  dashboardWidgets: [
    { id: 'pending-reviews', title: 'Pending Reviews', icon: 'Scale', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
