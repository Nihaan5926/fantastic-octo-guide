import type { Module, ModuleContext } from '../../core/types';
import router from './router';
import * as m005 from '../../db/migrations/auth/005_two_factor';
import * as m006 from '../../db/migrations/auth/006_sessions';

const manifest = {
  name: 'auth',
  version: '1.0.0',
  category: 'Foundation',
  permissions: [],
  apiPrefix: '/api/auth',
  navItems: [],
  dashboardWidgets: [],
  globalSearchEnabled: false,
} as const;

const authModule: Module = {
  manifest,
  router,
  migrations: [m005, m006],
};

export default authModule;
