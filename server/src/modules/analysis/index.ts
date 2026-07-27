import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'analysis',
  version: '1.0.0',
  category: 'Core Intel',
  permissions: ['analysis:read', 'analysis:create'],
  apiPrefix: '/api/analysis',
  navItems: [
    { label: 'Analysis', path: '/analysis', icon: 'BarChart3', category: 'CORE INTEL', order: 15 },
  ],
  dashboardWidgets: [],
  globalSearchEnabled: false,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
