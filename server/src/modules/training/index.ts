import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'training',
  version: '1.0.0',
  category: 'Personnel',
  permissions: ['training:read', 'training:create', 'training:update', 'training:delete'],
  apiPrefix: '/api/training',
  navItems: [
    { label: 'Training', path: '/training', icon: 'GraduationCap', category: 'PERSONNEL', order: 22 },
  ],
  dashboardWidgets: [
    { id: 'training-overview', title: 'Training Overview', icon: 'GraduationCap', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
