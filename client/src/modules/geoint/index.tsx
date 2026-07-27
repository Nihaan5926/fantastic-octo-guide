import { lazy } from 'react';

const GeointList = lazy(() => import('./pages/GeointList'));
const GeointDetail = lazy(() => import('./pages/GeointDetail'));

export default {
  name: 'geoint',
  routes: [
    { path: '/geoint', element: <GeointList /> },
    { path: '/geoint/:id', element: <GeointDetail /> },
  ],
  navItems: [
    { label: 'GEOINT', path: '/geoint', icon: 'Map', category: 'INT DISCIPLINES', order: 40 },
  ],
  permissions: ['geoint:read', 'geoint:create'],
};
