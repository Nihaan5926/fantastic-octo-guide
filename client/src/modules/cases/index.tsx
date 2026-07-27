import { lazy } from 'react';

const CasesList = lazy(() => import('./pages/CasesList'));
const CasesDetail = lazy(() => import('./pages/CasesDetail'));

export default {
  name: 'cases',
  routes: [
    { path: '/cases', element: <CasesList /> },
    { path: '/cases/:id', element: <CasesDetail /> },
  ],
  navItems: [
    { label: 'Cases', path: '/cases', icon: 'Briefcase', category: 'CORE INTEL', order: 12 },
  ],
  dashboardWidgets: [],
  permissions: ['cases:read', 'cases:create', 'cases:update', 'cases:delete'],
};
