import type { Module, ModuleContext } from '../../core/types';
import router from './router';
import * as m005 from '../../db/migrations/auth/005_two_factor';
import * as m006 from '../../db/migrations/auth/006_sessions';
import * as m007 from '../../db/migrations/auth/007_avatar';

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
  migrations: [
    { name: 'auth_005_two_factor', up: m005.up, down: m005.down },
    { name: 'auth_006_sessions', up: m006.up, down: m006.down },
    { name: 'auth_007_avatar', up: m007.up, down: m007.down },
  ],
};

export default authModule;
