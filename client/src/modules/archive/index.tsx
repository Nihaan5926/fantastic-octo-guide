import { lazy } from 'react';

const ArchiveList = lazy(() => import('./pages/ArchiveList'));

export default {
  name: 'archive',
  routes: [
    { path: '/archive', element: <ArchiveList /> },
  ],
  navItems: [
    { label: 'Archive', path: '/archive', icon: 'Archive', category: 'OVERSIGHT', order: 61 },
  ],
  permissions: ['archive:read', 'archive:create'],
};
