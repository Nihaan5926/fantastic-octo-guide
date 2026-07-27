import React from 'react';

const OrgChartList = React.lazy(() => import('./pages/OrgChartList'));
const OrgUnitDetail = React.lazy(() => import('./pages/OrgUnitDetail'));

export default {
  name: 'org-chart',
  version: '1.0.0',
  category: 'Personnel',
  permissions: ['org-chart:read', 'org-chart:write'],
  apiPrefix: '/api/org-chart',
  globalSearchEnabled: true,
  routes: [
    { path: '/org-chart', element: <OrgChartList /> },
    { path: '/org-chart/:id', element: <OrgUnitDetail /> },
  ],
  navItems: [
    { label: 'Org Chart', path: '/org-chart', icon: 'GitBranch', category: 'Personnel', order: 2 },
  ],
  dashboardWidgets: [],
};
