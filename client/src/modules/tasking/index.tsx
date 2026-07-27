import React from 'react';
import { Activity } from 'lucide-react';

const TaskingList = React.lazy(() => import('./pages/TaskingList'));
const WorkflowList = React.lazy(() => import('./pages/WorkflowList'));

export default {
  name: 'tasking',
  routes: [
    { path: '/tasking', element: <TaskingList /> },
    { path: '/tasking/workflows', element: <WorkflowList /> },
  ],
  navItems: [
    {
      label: 'Tasking',
      path: '/tasking',
      icon: 'Activity',
      category: 'OPERATIONS',
      order: 33,
      children: [
        { label: 'Assignments', path: '/tasking', icon: 'Activity', category: 'OPERATIONS', order: 33 },
        { label: 'Workflows', path: '/tasking/workflows', icon: 'Activity', category: 'OPERATIONS', order: 34 },
      ],
    },
  ],
  permissions: ['tasking:read', 'tasking:write'],
};
