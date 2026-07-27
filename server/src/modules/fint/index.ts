import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'fint',
  version: '1.0.0',
  category: 'INT Disciplines',
  permissions: ['fint:read', 'fint:create', 'fint:update', 'fint:delete'],
  apiPrefix: '/api/fint',
  navItems: [
    { label: 'FININT', path: '/fint', icon: 'DollarSign', category: 'INT Disciplines', order: 23 },
  ],
  dashboardWidgets: [
    { id: 'fint-transactions', title: 'FININT Transactions', icon: 'DollarSign', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
