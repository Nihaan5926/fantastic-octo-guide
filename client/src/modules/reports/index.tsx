import { lazy } from 'react';

const ReportsList = lazy(() => import('./pages/ReportsList'));
const ReportsDetail = lazy(() => import('./pages/ReportsDetail'));

export default {
  name: 'reports',
  routes: [
    { path: '/reports', element: <ReportsList /> },
    { path: '/reports/:id', element: <ReportsDetail /> },
  ],
  navItems: [
    { label: 'Reports', path: '/reports', icon: 'FileText', category: 'CORE INTEL', order: 10 },
  ],
  dashboardWidgets: [],
  permissions: ['reports:read', 'reports:create', 'reports:update', 'reports:delete'],
};
