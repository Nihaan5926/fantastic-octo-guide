import { lazy } from 'react';

const LiaisonList = lazy(() => import('./pages/LiaisonList'));

export default {
  name: 'liaison',
  routes: [
    { path: '/liaison', element: <LiaisonList /> },
  ],
  navItems: [
    { label: 'Liaison', path: '/liaison', icon: 'Building2', category: 'DISSEMINATION', order: 52 },
  ],
  permissions: ['liaison:read', 'liaison:create'],
};
