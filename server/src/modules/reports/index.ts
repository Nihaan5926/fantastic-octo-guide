import type { Module } from '../../core/types';
import router from './router';
import * as versionHistoryMigration from '../../db/migrations/reports/002_version_history';

const manifest = {
  name: 'reports',
  version: '1.0.0',
  category: 'Core Intel',
  permissions: ['reports:read', 'reports:create', 'reports:update', 'reports:delete'],
  apiPrefix: '/api/reports',
  navItems: [
    { label: 'Reports', path: '/reports', icon: 'FileText', category: 'CORE INTEL', order: 10 },
  ],
  dashboardWidgets: [
    { id: 'recent-reports', title: 'Recent Reports', icon: 'FileText', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = {
  manifest,
  router,
  migrations: [
    { name: 'reports_002_version_history', up: versionHistoryMigration.up, down: versionHistoryMigration.down },
  ],
};
export default mod;
