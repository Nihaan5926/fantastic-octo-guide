import { lazy } from 'react';

const EvidenceList = lazy(() => import('./pages/EvidenceList'));
const EvidenceDetail = lazy(() => import('./pages/EvidenceDetail'));

export default {
  name: 'evidence',
  routes: [
    { path: '/evidence', element: <EvidenceList /> },
    { path: '/evidence/:id', element: <EvidenceDetail /> },
  ],
  navItems: [
    { label: 'Evidence', path: '/evidence', icon: 'FolderOpen', category: 'CORE INTEL', order: 13 },
  ],
  dashboardWidgets: [],
  permissions: ['evidence:read', 'evidence:create', 'evidence:update', 'evidence:delete'],
};
