import React from 'react';

const TrainingPage = React.lazy(() => import('./pages/TrainingPage'));

export default {
  name: 'training',
  version: '1.0.0',
  category: 'Personnel',
  permissions: ['training:read', 'training:write'],
  apiPrefix: '/api/training',
  globalSearchEnabled: true,
  routes: [
    { path: '/training', element: <TrainingPage /> },
  ],
  navItems: [
    { label: 'Training', path: '/training', icon: 'GraduationCap', category: 'Personnel', order: 3 },
  ],
  dashboardWidgets: [],
};
