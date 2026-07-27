import type { Module, ModuleContext } from '../../core/types';
import router from './router';

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
  migrations: [],
};

export default authModule;
