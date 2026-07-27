import { lazy } from 'react';

const BriefingsList = lazy(() => import('./pages/BriefingsList'));
const BriefingDetail = lazy(() => import('./pages/BriefingDetail'));

export default {
  name: 'briefings',
  routes: [
    { path: '/briefings', element: <BriefingsList /> },
    { path: '/briefings/:id', element: <BriefingDetail /> },
  ],
  navItems: [
    { label: 'Briefings', path: '/briefings', icon: 'Presentation', category: 'DISSEMINATION', order: 50 },
  ],
  permissions: ['briefings:read', 'briefings:create'],
};
