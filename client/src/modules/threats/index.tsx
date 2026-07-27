import { lazy } from 'react';

const ActorList = lazy(() => import('./pages/ActorList'));
const ActorDetail = lazy(() => import('./pages/ActorDetail'));

export default {
  name: 'threats',
  routes: [
    { path: '/threats/actors', element: <ActorList /> },
    { path: '/threats/actors/:id', element: <ActorDetail /> },
    { path: '/threats', element: <ActorList /> },
  ],
  navItems: [
    { label: 'Threats', path: '/threats/actors', icon: 'Shield', category: 'CORE INTEL', order: 16 },
  ],
  dashboardWidgets: [],
  permissions: ['threats:read', 'threats:create', 'threats:update', 'threats:delete'],
};
