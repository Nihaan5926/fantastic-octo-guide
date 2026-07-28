import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'admin',
  version: '1.0.0',
  category: 'Foundation',
  permissions: ['admin:*'],
  apiPrefix: '/api/admin',
  navItems: [
    { label: 'Users', path: '/admin/users', icon: 'Users', category: 'ADMIN', order: 90, permissions: ['admin:*'] },
    { label: 'Data Manager', path: '/admin/data', icon: 'Database', category: 'ADMIN', order: 89, permissions: ['admin:*'] },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'ListChecks', category: 'ADMIN', order: 91, permissions: ['admin:*'] },
    { label: 'System Health', path: '/admin/health', icon: 'Activity', category: 'ADMIN', order: 92, permissions: ['admin:*'] },
    { label: 'Bulk Import', path: '/admin/bulk-import', icon: 'Upload', category: 'ADMIN', order: 93, permissions: ['admin:*'] },
    { label: 'System Logs', path: '/admin/logs', icon: 'Terminal', category: 'ADMIN', order: 94, permissions: ['admin:*'] },
  ],
  dashboardWidgets: [],
  globalSearchEnabled: false,
} as const;

const migrations: any[] = [];
try { migrations.push(require('../../db/migrations/admin/001_announcements')); } catch {}
try { migrations.push(require('../../db/migrations/admin/002_api_keys')); } catch {}

const mod: Module = { manifest, router, migrations };
export default mod;
