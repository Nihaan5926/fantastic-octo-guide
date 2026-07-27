import React from 'react';

const PersonnelList = React.lazy(() => import('./pages/PersonnelList'));
const PersonnelDetail = React.lazy(() => import('./pages/PersonnelDetail'));

export default {
  name: 'personal-management',
  version: '1.0.0',
  category: 'Personnel',
  permissions: ['personnel:read', 'personnel:write'],
  apiPrefix: '/api/personnel',
  globalSearchEnabled: true,
  routes: [
    { path: '/personnel', element: <PersonnelList /> },
    { path: '/personnel/:id', element: <PersonnelDetail /> },
  ],
  navItems: [
    { label: 'Personnel', path: '/personnel', icon: 'Users', category: 'Personnel', order: 1 },
  ],
  dashboardWidgets: [],
};
