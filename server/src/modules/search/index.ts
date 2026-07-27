import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'search',
  version: '1.0.0',
  category: 'Core',
  permissions: [],
  apiPrefix: '/api/search',
  navItems: [],
  dashboardWidgets: [],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
