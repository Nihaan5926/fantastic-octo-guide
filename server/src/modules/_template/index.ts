import { Router } from 'express';
import type { Module, ModuleContext } from '../../core/types';

const router = Router();

const manifest = {
  name: '__template__',
  version: '1.0.0',
  category: 'Uncategorized',
  permissions: ['module:read'],
  apiPrefix: '/api/module-name',
  navItems: [
    {
      label: 'Module Name',
      path: '/module-name',
      icon: 'Box',
      category: 'Uncategorized',
      order: 100,
    },
  ],
  dashboardWidgets: [],
  globalSearchEnabled: false,
} as const;

router.get('/', (_req, res) => {
  res.json({ message: 'Module template — replace with your implementation' });
});

const templateModule: Module = {
  manifest,
  router,
  migrations: [],
};

export default templateModule;
