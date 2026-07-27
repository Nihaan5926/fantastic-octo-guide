import { lazy } from 'react';

const SigintList = lazy(() => import('./pages/SigintList'));

export default {
  name: 'sigint',
  routes: [
    { path: '/sigint', element: <SigintList /> },
  ],
  navItems: [
    { label: 'SIGINT', path: '/sigint', icon: 'Radio', category: 'INT DISCIPLINES', order: 41 },
  ],
  permissions: ['sigint:read', 'sigint:create'],
};
