import type { Module } from '../../core/types';
import router from './router';
import * as rosterMigration from '../../db/migrations/missions/002_roster';

const manifest = {
  name: 'missions',
  version: '1.0.0',
  category: 'Operations',
  permissions: ['missions:read', 'missions:create', 'missions:update', 'missions:delete'],
  apiPrefix: '/api/missions',
  navItems: [
    { label: 'Missions', path: '/missions', icon: 'Target', category: 'Operations', order: 20 },
  ],
  dashboardWidgets: [
    { id: 'mission-plans', title: 'Mission Plans', icon: 'Target', defaultWidth: 6, defaultHeight: 3 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = {
  manifest,
  router,
  migrations: [
    { name: 'missions_002_roster', up: rosterMigration.up, down: rosterMigration.down },
  ],
};
export default mod;
