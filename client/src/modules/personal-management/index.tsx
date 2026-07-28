import React from 'react';

const PersonnelList = React.lazy(() => import('./pages/PersonnelList'));
const PersonnelDetail = React.lazy(() => import('./pages/PersonnelDetail'));

export default {
  name: 'personal-management',
  version: '1.0.0',
  category: 'Personnel',
  permissions: ['personnel:read', 'personnel:create', 'personnel:update', 'personnel:delete'],
  apiPrefix: '/api/personnel',
  globalSearchEnabled: true,
  routes: [
    { path: '/personnel', element: <PersonnelList /> },
    { path: '/personnel/:id', element: <PersonnelDetail /> },
  ],
  navItems: [
    { label: 'Personnel', path: '/personnel', icon: 'UserCheck', category: 'PERSONNEL', order: 20 },
  ],
  dashboardWidgets: [],
};
