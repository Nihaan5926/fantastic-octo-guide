import type { Module } from '../../core/types';
import router from './router';
import * as caseHierarchyMigration from '../../db/migrations/cases/002_case_hierarchy';

const manifest = {
  name: 'cases',
  version: '1.0.0',
  category: 'Core Intel',
  permissions: ['cases:read', 'cases:create', 'cases:update', 'cases:delete'],
  apiPrefix: '/api/cases',
  navItems: [
    { label: 'Cases', path: '/cases', icon: 'Briefcase', category: 'CORE INTEL', order: 12 },
  ],
  dashboardWidgets: [
    { id: 'active-cases', title: 'Active Cases', icon: 'Briefcase', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = {
  manifest,
  router,
  migrations: [
    { name: 'cases_002_case_hierarchy', up: caseHierarchyMigration.up, down: caseHierarchyMigration.down },
  ],
};
export default mod;
