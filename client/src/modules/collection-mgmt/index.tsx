import React from 'react';
import { ListChecks } from 'lucide-react';

const CollectionList = React.lazy(() => import('./pages/CollectionList'));
const CollectionDetail = React.lazy(() => import('./pages/CollectionDetail'));

export default {
  name: 'collection-mgmt',
  routes: [
    { path: '/collection', element: <CollectionList /> },
    { path: '/collection/:id', element: <CollectionDetail /> },
  ],
  navItems: [
    {
      label: 'Collection',
      path: '/collection',
      icon: 'ListChecks',
      category: 'OPERATIONS',
      order: 32,
    },
  ],
  permissions: ['collection:read', 'collection:write'],
};
