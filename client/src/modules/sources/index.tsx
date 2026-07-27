import { lazy } from 'react';

const SourcesList = lazy(() => import('./pages/SourcesList'));

export default {
  name: 'sources',
  routes: [
    { path: '/sources', element: <SourcesList /> },
  ],
  navItems: [
    { label: 'Sources', path: '/sources', icon: 'Users', category: 'CORE INTEL', order: 11 },
  ],
  dashboardWidgets: [],
  permissions: ['sources:read', 'sources:create', 'sources:update', 'sources:delete'],
};
