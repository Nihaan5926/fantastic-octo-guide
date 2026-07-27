import { lazy } from 'react';

const ArchiveList = lazy(() => import('./pages/ArchiveList'));
const ArchiveDetail = lazy(() => import('./pages/ArchiveDetail'));

export default {
  name: 'archive',
  routes: [
    { path: '/archive', element: <ArchiveList /> },
    { path: '/archive/:id', element: <ArchiveDetail /> },
  ],
  navItems: [
    { label: 'Archive', path: '/archive', icon: 'Archive', category: 'OVERSIGHT', order: 61 },
  ],
  permissions: ['archive:read', 'archive:create'],
};
