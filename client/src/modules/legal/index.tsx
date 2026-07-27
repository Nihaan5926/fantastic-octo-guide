import { lazy } from 'react';

const LegalList = lazy(() => import('./pages/LegalList'));
const LegalDetail = lazy(() => import('./pages/LegalDetail'));

export default {
  name: 'legal',
  routes: [
    { path: '/legal', element: <LegalList /> },
    { path: '/legal/:id', element: <LegalDetail /> },
  ],
  navItems: [
    { label: 'Legal', path: '/legal', icon: 'Scale', category: 'OVERSIGHT', order: 60 },
  ],
  permissions: ['legal:read', 'legal:create'],
};
