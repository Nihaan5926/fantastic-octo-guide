import { lazy } from 'react';

const CIList = lazy(() => import('./pages/CIList'));

export default {
  name: 'ci',
  routes: [
    { path: '/ci', element: <CIList /> },
  ],
  navItems: [
    { label: 'CI', path: '/ci', icon: 'UserX', category: 'INT DISCIPLINES', order: 42 },
  ],
  permissions: ['ci:read', 'ci:create'],
};
