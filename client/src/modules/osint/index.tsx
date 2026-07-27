import { lazy } from 'react';

const TaskList = lazy(() => import('./pages/TaskList'));
const TaskDetail = lazy(() => import('./pages/TaskDetail'));

export default {
  name: 'osint',
  routes: [
    { path: '/osint/tasks', element: <TaskList /> },
    { path: '/osint/tasks/:id', element: <TaskDetail /> },
    { path: '/osint', element: <TaskList /> },
  ],
  navItems: [
    { label: 'OSINT', path: '/osint/tasks', icon: 'Globe', category: 'CORE INTEL', order: 14 },
  ],
  dashboardWidgets: [],
  permissions: ['osint:read', 'osint:create', 'osint:update', 'osint:delete', 'osint:run'],
};
