import { lazy } from 'react';

const BudgetList = lazy(() => import('./pages/BudgetList'));

export default {
  name: 'budget',
  routes: [
    { path: '/budget', element: <BudgetList /> },
  ],
  navItems: [
    { label: 'Budget', path: '/budget', icon: 'Wallet', category: 'OVERSIGHT', order: 62 },
  ],
  permissions: ['budget:read', 'budget:create'],
};
