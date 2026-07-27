import React from 'react';
import { Crosshair } from 'lucide-react';

const TargetingList = React.lazy(() => import('./pages/TargetingList'));
const TargetDetail = React.lazy(() => import('./pages/TargetDetail'));

export default {
  name: 'targeting',
  routes: [
    { path: '/targeting', element: <TargetingList /> },
    { path: '/targeting/:id', element: <TargetDetail /> },
  ],
  navItems: [
    {
      label: 'Targeting',
      path: '/targeting',
      icon: 'Crosshair',
      category: 'OPERATIONS',
      order: 31,
    },
  ],
  permissions: ['targeting:read', 'targeting:write'],
};
