import { lazy } from 'react';

const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const SystemHealth = lazy(() => import('./pages/SystemHealth'));
const BulkImport = lazy(() => import('./pages/BulkImport'));
const SystemLogs = lazy(() => import('./pages/SystemLogs'));
const DataManager = lazy(() => import('./pages/DataManager'));

export default {
  name: 'admin',
  routes: [
    { path: '/admin/users', element: <AdminUsers /> },
    { path: '/admin/audit-logs', element: <AuditLogs /> },
    { path: '/admin/health', element: <SystemHealth /> },
    { path: '/admin/bulk-import', element: <BulkImport /> },
    { path: '/admin/logs', element: <SystemLogs /> },
    { path: '/admin/data', element: <DataManager /> },
  ],
  navItems: [
    { label: 'Users', path: '/admin/users', icon: 'Users', category: 'ADMIN', order: 90 },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'ListChecks', category: 'ADMIN', order: 91 },
    { label: 'System Health', path: '/admin/health', icon: 'Activity', category: 'ADMIN', order: 92 },
    { label: 'Bulk Import', path: '/admin/bulk-import', icon: 'Upload', category: 'ADMIN', order: 93 },
    { label: 'System Logs', path: '/admin/logs', icon: 'Terminal', category: 'ADMIN', order: 94 },
    { label: 'Data Manager', path: '/admin/data', icon: 'Database', category: 'ADMIN', order: 89 },
  ],
  permissions: ['admin:*'],
};
