import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'messaging',
  version: '1.0.0',
  category: 'Dissemination',
  permissions: ['messaging:read', 'messaging:create', 'messaging:update', 'messaging:delete'],
  apiPrefix: '/api/messaging',
  navItems: [
    { label: 'Messages', path: '/messages', icon: 'MessageSquare', category: 'DISSEMINATION', order: 32 },
  ],
  dashboardWidgets: [
    { id: 'unread-messages', title: 'Unread Messages', icon: 'MessageSquare', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
