import type { Module } from '../../core/types';
import router from './router';
import * as lineItemsMigration from '../../db/migrations/budget/002_line_items';

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

const mod: Module = {
  manifest,
  router,
  migrations: [
    { name: 'budget_002_line_items', up: lineItemsMigration.up, down: lineItemsMigration.down },
  ],
};
export default mod;
