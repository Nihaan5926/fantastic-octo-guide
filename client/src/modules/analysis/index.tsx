import { lazy } from 'react';

const RelationshipList = lazy(() => import('./pages/RelationshipList'));
const LinkAnalysis = lazy(() => import('./pages/LinkAnalysis'));
const TimelineAnalysis = lazy(() => import('./pages/TimelineAnalysis'));

export default {
  name: 'analysis',
  routes: [
    { path: '/analysis', element: <RelationshipList /> },
    { path: '/analysis/link-analysis', element: <LinkAnalysis /> },
    { path: '/analysis/timeline', element: <TimelineAnalysis /> },
  ],
  navItems: [
    { label: 'Analysis', path: '/analysis', icon: 'BarChart3', category: 'CORE INTEL', order: 15 },
  ],
  dashboardWidgets: [],
  permissions: ['analysis:read', 'analysis:create', 'analysis:update', 'analysis:delete'],
};
