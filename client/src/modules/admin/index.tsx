import { lazy } from 'react';

const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const SystemHealth = lazy(() => import('./pages/SystemHealth'));

export default {
  name: 'admin',
  routes: [
    { path: '/admin/users', element: <AdminUsers /> },
    { path: '/admin/audit-logs', element: <AuditLogs /> },
    { path: '/admin/health', element: <SystemHealth /> },
  ],
  navItems: [
    { label: 'Users', path: '/admin/users', icon: 'Users', category: 'ADMIN', order: 90 },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'ListChecks', category: 'ADMIN', order: 91 },
    { label: 'System Health', path: '/admin/health', icon: 'Activity', category: 'ADMIN', order: 92 },
  ],
  permissions: ['admin:*'],
};
