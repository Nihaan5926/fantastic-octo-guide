import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'budget',
  version: '1.0.0',
  category: 'Oversight',
  permissions: ['budget:read', 'budget:create', 'budget:update', 'budget:delete'],
  apiPrefix: '/api/budget',
  navItems: [
    { label: 'Budget', path: '/budget', icon: 'Wallet', category: 'OVERSIGHT', order: 44 },
  ],
  dashboardWidgets: [
    { id: 'budget-overview', title: 'Budget Overview', icon: 'Wallet', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
