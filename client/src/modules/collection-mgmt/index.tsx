import React from 'react';
import { ListChecks } from 'lucide-react';

const CollectionList = React.lazy(() => import('./pages/CollectionList'));

export default {
  name: 'collection-mgmt',
  routes: [
    { path: '/collection', element: <CollectionList /> },
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
