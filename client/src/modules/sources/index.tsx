import { lazy } from 'react';

const SourcesList = lazy(() => import('./pages/SourcesList'));
const SourcesDetail = lazy(() => import('./pages/SourcesDetail'));

export default {
  name: 'sources',
  routes: [
    { path: '/sources', element: <SourcesList /> },
    { path: '/sources/:id', element: <SourcesDetail /> },
  ],
  navItems: [
    { label: 'Sources', path: '/sources', icon: 'Users', category: 'CORE INTEL', order: 11 },
  ],
  dashboardWidgets: [],
  permissions: ['sources:read', 'sources:create', 'sources:update', 'sources:delete'],
};
