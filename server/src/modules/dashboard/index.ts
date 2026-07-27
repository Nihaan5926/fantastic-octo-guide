import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'dashboard',
  version: '1.0.0',
  category: 'Core',
  permissions: ['dashboard:read'],
  apiPrefix: '/api/dashboard',
  navItems: [],
  dashboardWidgets: [],
  globalSearchEnabled: false,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
