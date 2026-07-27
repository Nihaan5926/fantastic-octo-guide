import React from 'react';

const WatchCenter = React.lazy(() => import('./pages/WatchCenter'));
const WatchDetail = React.lazy(() => import('./pages/WatchDetail'));

export default {
  name: 'watch-center',
  version: '1.0.0',
  category: 'Personnel',
  permissions: ['watch-center:read', 'watch-center:write'],
  apiPrefix: '/api/watch-center',
  globalSearchEnabled: true,
  routes: [
    { path: '/watch-center', element: <WatchCenter /> },
    { path: '/watch-center/:id', element: <WatchDetail /> },
  ],
  navItems: [
    { label: 'Watch Center', path: '/watch-center', icon: 'Eye', category: 'Personnel', order: 4 },
  ],
  dashboardWidgets: [],
};
