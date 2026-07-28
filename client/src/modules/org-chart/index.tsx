import React from 'react';

const OrgChartList = React.lazy(() => import('./pages/OrgChartList'));
const OrgUnitDetail = React.lazy(() => import('./pages/OrgUnitDetail'));

export default {
  name: 'org-chart',
  version: '1.0.0',
  category: 'Personnel',
  permissions: ['org-chart:read', 'org-chart:create', 'org-chart:update', 'org-chart:delete'],
  apiPrefix: '/api/org-chart',
  globalSearchEnabled: true,
  routes: [
    { path: '/org-chart', element: <OrgChartList /> },
    { path: '/org-chart/:id', element: <OrgUnitDetail /> },
  ],
  navItems: [
    { label: 'Org Chart', path: '/org-chart', icon: 'Building2', category: 'PERSONNEL', order: 21 },
  ],
  dashboardWidgets: [],
};
