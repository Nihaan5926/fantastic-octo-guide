import { lazy } from 'react';

const BudgetList = lazy(() => import('./pages/BudgetList'));
const BudgetDetail = lazy(() => import('./pages/BudgetDetail'));

export default {
  name: 'budget',
  routes: [
    { path: '/budget', element: <BudgetList /> },
    { path: '/budget/:id', element: <BudgetDetail /> },
  ],
  navItems: [
    { label: 'Budget', path: '/budget', icon: 'Wallet', category: 'OVERSIGHT', order: 62 },
  ],
  permissions: ['budget:read', 'budget:create'],
};
