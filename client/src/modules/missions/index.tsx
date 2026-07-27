import React from 'react';
import { Target } from 'lucide-react';

const MissionsList = React.lazy(() => import('./pages/MissionsList'));
const MissionDetail = React.lazy(() => import('./pages/MissionDetail'));

export default {
  name: 'missions',
  routes: [
    { path: '/missions', element: <MissionsList /> },
    { path: '/missions/:id', element: <MissionDetail /> },
  ],
  navItems: [
    {
      label: 'Missions',
      path: '/missions',
      icon: 'Target',
      category: 'OPERATIONS',
      order: 30,
    },
  ],
  permissions: ['missions:read', 'missions:write'],
};
