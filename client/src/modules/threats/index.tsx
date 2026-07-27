import { lazy } from 'react';

const ActorList = lazy(() => import('./pages/ActorList'));
const ActorDetail = lazy(() => import('./pages/ActorDetail'));
const RiskMatrix = lazy(() => import('./pages/RiskMatrix'));
const WatchlistScreening = lazy(() => import('./pages/WatchlistScreening'));

export default {
  name: 'threats',
  routes: [
    { path: '/threats/actors', element: <ActorList /> },
    { path: '/threats/actors/:id', element: <ActorDetail /> },
    { path: '/threats/risk-matrix', element: <RiskMatrix /> },
    { path: '/threats/watchlist-screening', element: <WatchlistScreening /> },
    { path: '/threats', element: <ActorList /> },
  ],
  navItems: [
    { label: 'Threats', path: '/threats/actors', icon: 'Shield', category: 'CORE INTEL', order: 16 },
  ],
  dashboardWidgets: [],
  permissions: ['threats:read', 'threats:create', 'threats:update', 'threats:delete'],
};
