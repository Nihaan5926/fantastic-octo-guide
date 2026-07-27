import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'liaison',
  version: '1.0.0',
  category: 'Dissemination',
  permissions: ['liaison:read', 'liaison:create', 'liaison:update', 'liaison:delete'],
  apiPrefix: '/api/liaison',
  navItems: [
    { label: 'Liaison', path: '/liaison', icon: 'Building2', category: 'DISSEMINATION', order: 34 },
  ],
  dashboardWidgets: [
    { id: 'active-partners', title: 'Active Partners', icon: 'Building2', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
