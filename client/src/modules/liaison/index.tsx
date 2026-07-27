import { lazy } from 'react';

const LiaisonList = lazy(() => import('./pages/LiaisonList'));
const LiaisonDetail = lazy(() => import('./pages/LiaisonDetail'));

export default {
  name: 'liaison',
  routes: [
    { path: '/liaison', element: <LiaisonList /> },
    { path: '/liaison/:id', element: <LiaisonDetail /> },
  ],
  navItems: [
    { label: 'Liaison', path: '/liaison', icon: 'Building2', category: 'DISSEMINATION', order: 52 },
  ],
  permissions: ['liaison:read', 'liaison:create'],
};
