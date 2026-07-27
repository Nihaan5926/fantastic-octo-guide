import { lazy } from 'react';

const FintList = lazy(() => import('./pages/FintList'));

export default {
  name: 'fint',
  routes: [
    { path: '/fint', element: <FintList /> },
  ],
  navItems: [
    { label: 'FININT', path: '/fint', icon: 'DollarSign', category: 'INT DISCIPLINES', order: 43 },
  ],
  permissions: ['fint:read', 'fint:create'],
};
