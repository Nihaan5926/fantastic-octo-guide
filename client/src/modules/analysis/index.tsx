import { lazy } from 'react';

const RelationshipList = lazy(() => import('./pages/RelationshipList'));

export default {
  name: 'analysis',
  routes: [
    { path: '/analysis', element: <RelationshipList /> },
  ],
  navItems: [
    { label: 'Analysis', path: '/analysis', icon: 'BarChart3', category: 'CORE INTEL', order: 15 },
  ],
  dashboardWidgets: [],
  permissions: ['analysis:read', 'analysis:create', 'analysis:update', 'analysis:delete'],
};
