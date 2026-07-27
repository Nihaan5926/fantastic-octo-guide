import { lazy } from 'react';

const SigintList = lazy(() => import('./pages/SigintList'));
const SigintDetail = lazy(() => import('./pages/SigintDetail'));

export default {
  name: 'sigint',
  routes: [
    { path: '/sigint', element: <SigintList /> },
    { path: '/sigint/:id', element: <SigintDetail /> },
  ],
  navItems: [
    { label: 'SIGINT', path: '/sigint', icon: 'Radio', category: 'INT DISCIPLINES', order: 41 },
  ],
  permissions: ['sigint:read', 'sigint:create'],
};
