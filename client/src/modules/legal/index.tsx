import { lazy } from 'react';

const LegalList = lazy(() => import('./pages/LegalList'));

export default {
  name: 'legal',
  routes: [
    { path: '/legal', element: <LegalList /> },
  ],
  navItems: [
    { label: 'Legal', path: '/legal', icon: 'Scale', category: 'OVERSIGHT', order: 60 },
  ],
  permissions: ['legal:read', 'legal:create'],
};
